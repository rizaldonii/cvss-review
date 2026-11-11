import crypto from "crypto";

function isD1Configured(): boolean {
  return Boolean(
    process.env.CLOUDFLARE_ACCOUNT_ID &&
    process.env.CLOUDFLARE_D1_DATABASE_ID &&
    process.env.CLOUDFLARE_API_TOKEN
  );
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
  if (!firstResult || firstResult.success === false) {
    const innerErr =
      firstResult?.error ||
      firstResult?.messages?.[0]?.message ||
      firstResult?.messages?.[0] ||
      "Query D1 gagal dieksekusi oleh database Cloudflare D1.";
    throw new Error(`Cloudflare D1 Query Error: ${innerErr}`);
  }

  return firstResult.results || [];
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
  if (!isD1Configured()) {
    throw new Error("Kredensial Cloudflare D1 belum terkonfigurasi di server.");
  }

  await ensureD1Table();
  const sql = `
    SELECT * FROM cvss_reviews
    WHERE version = 'v2' OR id LIKE 'v2_%'
    ORDER BY submitted_at ASC;
  `;
  const rows = await queryD1(sql);
  return { data: rows || [], provider: "Cloudflare D1" };
}

async function deleteSubmissionsFromDb(filter: { id?: string; reviewerName?: string }): Promise<void> {
  if (!isD1Configured()) {
    throw new Error("Kredensial Cloudflare D1 belum terkonfigurasi di server.");
  }

  if (filter.id) {
    await queryD1("DELETE FROM cvss_reviews WHERE id = ?;", [filter.id]);
  } else if (filter.reviewerName) {
    await queryD1(
      "DELETE FROM cvss_reviews WHERE LOWER(reviewer_name) = LOWER(?) AND (version = 'v2' OR id LIKE 'v2_%');",
      [filter.reviewerName.trim()]
    );
  } else {
    throw new Error("Parameter id atau reviewerName diperlukan.");
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

function checkRateLimit(ip: string): { allowed: boolean; remainingLockoutSeconds?: number } {
  const now = Date.now();
  const record = failedAttempts.get(ip);
  if (!record) return { allowed: true };

  if (record.lockedUntil && record.lockedUntil > now) {
    const remainingSeconds = Math.ceil((record.lockedUntil - now) / 1000);
    return { allowed: false, remainingLockoutSeconds: remainingSeconds };
  }

  // Reset window if older than 15 minutes
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
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD;
  if (!secret) {
    throw new Error(
      "ADMIN_PASSWORD atau ADMIN_SESSION_SECRET belum disetel pada Environment Variables server."
    );
  }
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

function verifySessionToken(token: string): boolean {
  if (!token || typeof token !== "string") return false;
  const parts = token.split(":");
  if (parts.length !== 3) return false;

  const [issuedAtStr, expiresAtStr, signature] = parts;
  const expiresAt = Number(expiresAtStr);
  if (isNaN(expiresAt) || Date.now() > expiresAt) {
    return false;
  }

  try {
    const secretKey = getSecretKey();
    const payload = `${issuedAtStr}:${expiresAtStr}`;
    const expectedSig = crypto.createHmac("sha256", secretKey).update(payload).digest("hex");
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig));
  } catch {
    return false;
  }
}

function verifyPassword(inputPassword: string): boolean {
  const validPassword = process.env.ADMIN_PASSWORD;
  if (!validPassword) {
    return false;
  }
  const inputBuffer = Buffer.from(String(inputPassword).trim());
  const targetBuffer = Buffer.from(validPassword.trim());

  if (inputBuffer.length !== targetBuffer.length) {
    crypto.timingSafeEqual(inputBuffer, inputBuffer);
    return false;
  }

  return crypto.timingSafeEqual(inputBuffer, targetBuffer);
}

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,POST");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  const url = new URL(req.url, "http://localhost");
  const action = url.searchParams.get("action") || "";
  const ip = getClientIp(req);

  // 1. ACTION: LOGIN
  if (action === "login") {
    if (req.method !== "POST") {
      return res.status(405).json({ success: false, error: "Method Not Allowed" });
    }

    const rateCheck = checkRateLimit(ip);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        success: false,
        error: `Terlalu banyak percobaan gagal. Silakan coba lagi dalam ${rateCheck.remainingLockoutSeconds} detik.`
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

    const { password } = body;
    if (!password) {
      return res.status(400).json({ success: false, error: "Password wajib diisi." });
    }

    if (!process.env.ADMIN_PASSWORD) {
      return res.status(500).json({
        success: false,
        error: "ADMIN_PASSWORD belum disetel pada Environment Variables server."
      });
    }

    if (!verifyPassword(password)) {
      recordFailure(ip);
      return res.status(401).json({
        success: false,
        error: "Password admin salah. Akses ditolak."
      });
    }

    recordSuccess(ip);
    const { token, expiresAt } = generateSessionToken();

    return res.status(200).json({
      success: true,
      token,
      expiresAt,
      message: "Autentikasi admin berhasil."
    });
  }

  // Token verification for all other actions
  const authHeader = req.headers["authorization"] || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  const isAuthorized = verifySessionToken(token);

  // 2. ACTION: VERIFY-SESSION
  if (action === "verify-session" || action === "verify") {
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
    return res.status(200).json({
      success: true,
      d1Configured: d1Ok,
      activeProvider: d1Ok ? "Cloudflare D1" : "Belum Terhubung"
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
        error: e?.message || "Gagal mengambil data dari database Cloudflare D1."
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
      return res.status(200).json({ success: true, message: "Data berhasil dihapus dari Cloudflare D1." });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e?.message || "Gagal menghapus data dari Cloudflare D1." });
    }
  }

  return res.status(400).json({ success: false, error: "Aksi tidak dikenali." });
}
