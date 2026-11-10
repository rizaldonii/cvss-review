import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

function isD1Configured(): boolean {
  return Boolean(
    process.env.CLOUDFLARE_ACCOUNT_ID &&
    process.env.CLOUDFLARE_D1_DATABASE_ID &&
    process.env.CLOUDFLARE_API_TOKEN
  );
}

function isSupabaseConfigured(): boolean {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY;
  return Boolean(url && key);
}

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !key) return null;
  return createClient(url, key);
}

async function queryD1(sql: string, params: any[] = []): Promise<any[]> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (!accountId || !databaseId || !apiToken) {
    throw new Error(
      "Konfigurasi Cloudflare D1 belum lengkap (CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_DATABASE_ID, atau CLOUDFLARE_API_TOKEN belum disetel)."
    );
  }

  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ sql, params })
  });

  const data = (await res.json()) as any;
  if (!res.ok || !data.success) {
    const errMsg =
      data.errors?.[0]?.message || data.messages?.[0]?.message || `HTTP ${res.status}`;
    throw new Error(`Cloudflare D1 Error: ${errMsg}`);
  }

  const firstResult = data.result?.[0];
  return firstResult?.results || [];
}

async function ensureD1Table(): Promise<void> {
  const createTableSql = `
    CREATE TABLE IF NOT EXISTS cvss_reviews (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL,
      reviewer_name TEXT NOT NULL,
      reviewer_role TEXT,
      version TEXT NOT NULL DEFAULT 'v2',
      av TEXT NOT NULL,
      ac TEXT NOT NULL,
      pr TEXT NOT NULL,
      ui TEXT NOT NULL,
      s TEXT NOT NULL,
      c TEXT NOT NULL,
      i TEXT NOT NULL,
      a TEXT NOT NULL,
      base_score REAL NOT NULL,
      severity TEXT NOT NULL,
      vector_string TEXT NOT NULL,
      justification TEXT,
      submitted_at TEXT NOT NULL
    );
  `;
  await queryD1(createTableSql);

  try {
    await queryD1("CREATE INDEX IF NOT EXISTS idx_cvss_reviews_case ON cvss_reviews(case_id);");
    await queryD1("CREATE INDEX IF NOT EXISTS idx_cvss_reviews_reviewer ON cvss_reviews(reviewer_name);");
    await queryD1("CREATE INDEX IF NOT EXISTS idx_cvss_reviews_version ON cvss_reviews(version);");
  } catch {
    // Indexes might already exist
  }
}

async function fetchAllV2Submissions(): Promise<{ data: any[]; provider: string }> {
  // 1. Try Cloudflare D1
  if (isD1Configured()) {
    try {
      await ensureD1Table();
      const sql = `
        SELECT * FROM cvss_reviews
        WHERE version = 'v2' OR id LIKE 'v2_%'
        ORDER BY submitted_at ASC;
      `;
      const rows = await queryD1(sql);
      return { data: rows, provider: "Cloudflare D1" };
    } catch (e: any) {
      console.warn("Failed to fetch from D1, attempting fallback:", e);
    }
  }

  // 2. Fallback to Supabase
  const supabase = getSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("cvss_reviews")
      .select("*")
      .in("case_id", ["CASE-01", "CASE-02", "CASE-03", "CASE-04"])
      .or("version.eq.v2,id.like.v2_%")
      .order("submitted_at", { ascending: true });

    if (error) throw error;
    return { data: data || [], provider: "Supabase" };
  }

  return { data: [], provider: "None" };
}

async function deleteSubmissionsFromDb(filter: { id?: string; reviewerName?: string }): Promise<void> {
  if (isD1Configured()) {
    try {
      if (filter.id) {
        await queryD1("DELETE FROM cvss_reviews WHERE id = ?;", [filter.id]);
      } else if (filter.reviewerName) {
        await queryD1(
          "DELETE FROM cvss_reviews WHERE LOWER(reviewer_name) = LOWER(?) AND (version = 'v2' OR id LIKE 'v2_%');",
          [filter.reviewerName.trim()]
        );
      }
    } catch (e) {
      console.warn("Failed delete from D1:", e);
    }
  }

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      if (filter.id) {
        await supabase.from("cvss_reviews").delete().eq("id", filter.id);
      } else if (filter.reviewerName) {
        await supabase
          .from("cvss_reviews")
          .delete()
          .ilike("reviewer_name", filter.reviewerName.trim())
          .or("version.eq.v2,id.like.v2_%");
      }
    } catch (e) {
      console.warn("Failed delete from Supabase:", e);
    }
  }
}

// In-memory brute-force protection
const failedAttempts = new Map<string, { count: number; firstAttempt: number; lockedUntil?: number }>();

function getClientIp(req: any): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded[0]) {
    return forwarded[0].trim();
  }
  return req.socket?.remoteAddress || "127.0.0.1";
}

function checkRateLimit(ip: string): { allowed: boolean; remainingMinutes?: number } {
  const now = Date.now();
  const record = failedAttempts.get(ip);
  if (!record) return { allowed: true };

  if (record.lockedUntil) {
    if (now < record.lockedUntil) {
      const remainingMinutes = Math.ceil((record.lockedUntil - now) / 60000);
      return { allowed: false, remainingMinutes };
    }
    failedAttempts.delete(ip);
    return { allowed: true };
  }

  if (now - record.firstAttempt > 15 * 60 * 1000) {
    failedAttempts.delete(ip);
    return { allowed: true };
  }

  return { allowed: true };
}

function recordFailure(ip: string) {
  const now = Date.now();
  const record = failedAttempts.get(ip) || { count: 0, firstAttempt: now };
  record.count += 1;

  if (record.count >= 5) {
    record.lockedUntil = now + 10 * 60 * 1000; // 10 minutes lockout
  }

  failedAttempts.set(ip, record);
}

function recordSuccess(ip: string) {
  failedAttempts.delete(ip);
}

function getSecretKey(): string {
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || "cvss_default_secret_key_2026";
  return crypto.createHash("sha256").update(secret).digest("hex");
}

function generateSessionToken(): { token: string; expiresAt: number } {
  const secretKey = getSecretKey();
  const issuedAt = Date.now();
  const expiresAt = issuedAt + 12 * 60 * 60 * 1000; // 12 hours
  const payload = `${issuedAt}:${expiresAt}`;
  const signature = crypto.createHmac("sha256", secretKey).update(payload).digest("hex");
  const token = `${payload}:${signature}`;
  return { token, expiresAt };
}

function verifySessionToken(token: string | undefined): boolean {
  if (!token) return false;
  const parts = token.split(":");
  if (parts.length !== 3) return false;

  const [issuedAtStr, expiresAtStr, signature] = parts;
  const expiresAt = Number(expiresAtStr);
  if (isNaN(expiresAt) || Date.now() > expiresAt) {
    return false;
  }

  const secretKey = getSecretKey();
  const payload = `${issuedAtStr}:${expiresAtStr}`;
  const expectedSig = crypto.createHmac("sha256", secretKey).update(payload).digest("hex");

  try {
    return crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expectedSig, "hex"));
  } catch {
    return false;
  }
}

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  const clientIp = getClientIp(req);
  const action = req.query?.action || (new URL(req.url, "http://localhost").searchParams.get("action"));

  // 1. ACTION: LOGIN (Public route protected by password)
  if (action === "login") {
    if (req.method !== "POST") {
      return res.status(405).json({ success: false, error: "Method Not Allowed" });
    }

    const rateCheck = checkRateLimit(clientIp);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        success: false,
        error: `Terlalu banyak percobaan gagal. Akses dibatasi sementara selama ${rateCheck.remainingMinutes} menit.`
      });
    }

    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }

    const inputPassword = body?.password;
    const configuredPassword = process.env.ADMIN_PASSWORD;

    if (!configuredPassword) {
      return res.status(500).json({
        success: false,
        error: "ADMIN_PASSWORD belum disetel pada Environment Variables server Vercel."
      });
    }

    if (!inputPassword || typeof inputPassword !== "string") {
      return res.status(400).json({ success: false, error: "Password wajib diisi." });
    }

    if (inputPassword !== configuredPassword) {
      recordFailure(clientIp);
      return res.status(401).json({ success: false, error: "Password admin salah." });
    }

    recordSuccess(clientIp);
    const { token, expiresAt } = generateSessionToken();
    return res.status(200).json({
      success: true,
      token,
      expiresAt,
      message: "Autentikasi admin berhasil."
    });
  }

  // Extract Bearer Token for protected routes
  const authHeader = req.headers["authorization"] || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  const isAuthorized = verifySessionToken(token);

  // 2. ACTION: VERIFY
  if (action === "verify") {
    return res.status(200).json({
      success: true,
      valid: isAuthorized
    });
  }

  // Guard for remaining actions
  if (!isAuthorized) {
    return res.status(401).json({
      success: false,
      error: "Sesi admin tidak sah atau telah berakhir. Silakan masukkan password kembali."
    });
  }

  // 3. ACTION: STATUS
  if (action === "status") {
    const d1Ok = isD1Configured();
    const supaOk = isSupabaseConfigured();
    return res.status(200).json({
      success: true,
      d1Configured: d1Ok,
      supabaseConfigured: supaOk,
      activeProvider: d1Ok ? "Cloudflare D1" : supaOk ? "Supabase" : "Penyimpanan Lokal"
    });
  }

  // 4. ACTION: SUBMISSIONS
  if (action === "submissions") {
    try {
      const { data, provider } = await fetchAllV2Submissions();
      return res.status(200).json({ success: true, data, provider });
    } catch (e: any) {
      return res.status(500).json({
        success: false,
        error: e?.message || "Gagal mengambil data dari database server."
      });
    }
  }

  // 5. ACTION: DELETE
  if (action === "delete") {
    if (req.method !== "POST") {
      return res.status(405).json({ success: false, error: "Method Not Allowed" });
    }

    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }

    const { id, reviewerName } = body;
    try {
      if (!id && !reviewerName) {
        return res.status(400).json({ success: false, error: "Parameter id atau reviewerName diperlukan." });
      }

      await deleteSubmissionsFromDb({ id, reviewerName });
      return res.status(200).json({ success: true, message: "Data berhasil dihapus dari server." });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e?.message || "Gagal menghapus data dari server." });
    }
  }

  // 6. ACTION: MIGRATE FROM SUPABASE TO CLOUDFLARE D1
  if (action === "migrate-from-supabase") {
    if (!isD1Configured()) {
      return res.status(400).json({
        success: false,
        error: "Cloudflare D1 belum terkonfigurasi. Tidak dapat melakukan migrasi."
      });
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return res.status(400).json({
        success: false,
        error: "Supabase belum terkonfigurasi atau kredensial Supabase tidak ditemukan."
      });
    }

    try {
      await ensureD1Table();

      const { data: supaRows, error: supaErr } = await supabase
        .from("cvss_reviews")
        .select("*");

      if (supaErr) {
        return res.status(500).json({
          success: false,
          error: `Gagal membaca dari Supabase: ${supaErr.message}`
        });
      }

      if (!supaRows || supaRows.length === 0) {
        return res.status(200).json({
          success: true,
          count: 0,
          message: "Tidak ada data di Supabase untuk dimigrasikan."
        });
      }

      let count = 0;
      for (const row of supaRows) {
        const sql = `
          INSERT OR REPLACE INTO cvss_reviews (
            id, case_id, reviewer_name, reviewer_role, version,
            av, ac, pr, ui, s, c, i, a,
            base_score, severity, vector_string, justification, submitted_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        `;
        const params = [
          row.id || `v2_${row.case_id}_${encodeURIComponent((row.reviewer_name || "").trim().toLowerCase())}`,
          row.case_id,
          (row.reviewer_name || "").trim(),
          (row.reviewer_role || "").trim(),
          row.version || "v2",
          row.av || "N",
          row.ac || "L",
          row.pr || "N",
          row.ui || "N",
          row.s || "U",
          row.c || "N",
          row.i || "N",
          row.a || "N",
          Number(row.base_score || 0),
          row.severity || "NONE",
          row.vector_string || "",
          row.justification || "",
          row.submitted_at || new Date().toISOString()
        ];
        await queryD1(sql, params);
        count++;
      }

      return res.status(200).json({
        success: true,
        count,
        message: `Berhasil menyalin ${count} data evaluasi dari Supabase ke Cloudflare D1.`
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: err?.message || "Gagal melakukan migrasi data."
      });
    }
  }

  return res.status(400).json({ success: false, error: "Aksi tidak dikenali." });
}
