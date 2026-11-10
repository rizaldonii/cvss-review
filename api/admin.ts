import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

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

  // If locked, check if lock period (10 minutes) has passed
  if (record.lockedUntil) {
    if (now < record.lockedUntil) {
      const remainingMinutes = Math.ceil((record.lockedUntil - now) / 60000);
      return { allowed: false, remainingMinutes };
    }
    // Lock expired, reset
    failedAttempts.delete(ip);
    return { allowed: true };
  }

  // Reset after 15 minutes of inactivity
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

function getSupabaseServerClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !key) return null;
  return createClient(url, key);
}

export default async function handler(req: any, res: any) {
  // Enable CORS if accessed from preview/subdomains
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

  // 1. ACTION: LOGIN
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

  const supabase = getSupabaseServerClient();

  // 3. ACTION: SUBMISSIONS
  if (action === "submissions") {
    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: "Koneksi Supabase server belum disetel (SUPABASE_URL atau VITE_SUPABASE_URL tidak ditemukan)."
      });
    }

    try {
      const { data, error } = await supabase
        .from("cvss_reviews")
        .select("*")
        .in("case_id", ["CASE-01", "CASE-02", "CASE-03", "CASE-04"])
        .or("version.eq.v2,id.like.v2_%")
        .order("submitted_at", { ascending: true });

      if (error) {
        return res.status(500).json({ success: false, error: error.message });
      }

      return res.status(200).json({ success: true, data: data || [] });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e?.message || "Gagal mengambil data dari server." });
    }
  }

  // 4. ACTION: DELETE
  if (action === "delete") {
    if (req.method !== "POST") {
      return res.status(405).json({ success: false, error: "Method Not Allowed" });
    }

    if (!supabase) {
      return res.status(500).json({ success: false, error: "Koneksi Supabase server belum disetel." });
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
      if (id) {
        const { error } = await supabase.from("cvss_reviews").delete().eq("id", id);
        if (error) throw error;
      } else if (reviewerName) {
        const { error } = await supabase
          .from("cvss_reviews")
          .delete()
          .ilike("reviewer_name", reviewerName.trim())
          .or("version.eq.v2,id.like.v2_%");
        if (error) throw error;
      } else {
        return res.status(400).json({ success: false, error: "Parameter id atau reviewerName diperlukan." });
      }

      return res.status(200).json({ success: true, message: "Data berhasil dihapus dari server." });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e?.message || "Gagal menghapus data dari server." });
    }
  }

  return res.status(400).json({ success: false, error: "Aksi tidak dikenali." });
}

