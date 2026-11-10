import { createClient } from "@supabase/supabase-js";

function isD1Configured(): boolean {
  return Boolean(
    process.env.CLOUDFLARE_ACCOUNT_ID &&
    process.env.CLOUDFLARE_D1_DATABASE_ID &&
    process.env.CLOUDFLARE_API_TOKEN
  );
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
    throw new Error("Kredensial Cloudflare D1 belum lengkap di environment variables.");
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

async function upsertSubmission(sub: any): Promise<{ provider: string }> {
  // 1. Try Cloudflare D1
  if (isD1Configured()) {
    await ensureD1Table();
    const sql = `
      INSERT OR REPLACE INTO cvss_reviews (
        id, case_id, reviewer_name, reviewer_role, version,
        av, ac, pr, ui, s, c, i, a,
        base_score, severity, vector_string, justification, submitted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `;
    const params = [
      sub.id || `v2_${sub.caseId}_${encodeURIComponent(sub.reviewerName.trim().toLowerCase())}`,
      sub.caseId,
      sub.reviewerName.trim(),
      sub.reviewerRole?.trim() || "",
      sub.version || "v2",
      sub.metrics.AV,
      sub.metrics.AC,
      sub.metrics.PR,
      sub.metrics.UI,
      sub.metrics.S,
      sub.metrics.C,
      sub.metrics.I,
      sub.metrics.A,
      Number(sub.baseScore),
      sub.severity,
      sub.vectorString,
      sub.justification?.trim() || "",
      sub.submittedAt || new Date().toISOString()
    ];

    await queryD1(sql, params);
    return { provider: "Cloudflare D1" };
  }

  // 2. Fallback to Supabase if configured
  const supabase = getSupabaseClient();
  if (supabase) {
    const { error } = await supabase.from("cvss_reviews").upsert(
      {
        id: sub.id || `v2_${sub.caseId}_${encodeURIComponent(sub.reviewerName.trim().toLowerCase())}`,
        case_id: sub.caseId,
        reviewer_name: sub.reviewerName.trim(),
        reviewer_role: sub.reviewerRole?.trim() || "",
        version: sub.version || "v2",
        av: sub.metrics.AV,
        ac: sub.metrics.AC,
        pr: sub.metrics.PR,
        ui: sub.metrics.UI,
        s: sub.metrics.S,
        c: sub.metrics.C,
        i: sub.metrics.I,
        a: sub.metrics.A,
        base_score: Number(sub.baseScore),
        severity: sub.severity,
        vector_string: sub.vectorString,
        justification: sub.justification?.trim() || "",
        submitted_at: sub.submittedAt || new Date().toISOString()
      },
      { onConflict: "case_id,reviewer_name" }
    );
    if (error) throw error;
    return { provider: "Supabase" };
  }

  throw new Error(
    "Tidak ada database cloud yang terkonfigurasi. Setel kredensial Cloudflare D1 di Environment Variables Vercel."
  );
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

  // 1. GET: Check submitted cases & load reviewer progress
  if (req.method === "GET") {
    const url = new URL(req.url, "http://localhost");
    const reviewerName = url.searchParams.get("reviewerName");

    if (!reviewerName) {
      return res.status(400).json({ success: false, error: "Parameter reviewerName diperlukan." });
    }

    try {
      if (isD1Configured()) {
        const rows = await queryD1(
          "SELECT * FROM cvss_reviews WHERE LOWER(reviewer_name) = LOWER(?) AND (version = 'v2' OR id LIKE 'v2_%') ORDER BY submitted_at ASC;",
          [reviewerName.trim()]
        );
        const caseIds = rows.map((r: any) => r.case_id);
        const submissions = rows.map((r: any) => ({
          id: r.id,
          caseId: r.case_id,
          reviewerName: r.reviewer_name,
          reviewerRole: r.reviewer_role,
          version: r.version || "v2",
          metrics: {
            AV: r.av,
            AC: r.ac,
            PR: r.pr,
            UI: r.ui,
            S: r.s,
            C: r.c,
            I: r.i,
            A: r.a
          },
          baseScore: Number(r.base_score),
          severity: r.severity,
          vectorString: r.vector_string,
          justification: r.justification || "",
          submittedAt: r.submitted_at
        }));
        const reviewerRole = rows[rows.length - 1]?.reviewer_role || "";
        return res.status(200).json({
          success: true,
          caseIds,
          submissions,
          reviewerRole,
          provider: "Cloudflare D1"
        });
      }

      const supabase = getSupabaseClient();
      if (supabase) {
        const { data, error } = await supabase
          .from("cvss_reviews")
          .select("*")
          .ilike("reviewer_name", reviewerName.trim())
          .or("version.eq.v2,id.like.v2_%")
          .order("submitted_at", { ascending: true });

        if (error) throw error;
        const rows = data || [];
        const caseIds = rows.map((r: any) => r.case_id);
        const submissions = rows.map((r: any) => ({
          id: r.id,
          caseId: r.case_id,
          reviewerName: r.reviewer_name,
          reviewerRole: r.reviewer_role,
          version: r.version || "v2",
          metrics: {
            AV: r.av,
            AC: r.ac,
            PR: r.pr,
            UI: r.ui,
            S: r.s,
            C: r.c,
            I: r.i,
            A: r.a
          },
          baseScore: Number(r.base_score),
          severity: r.severity,
          vectorString: r.vector_string,
          justification: r.justification || "",
          submittedAt: r.submitted_at
        }));
        const reviewerRole = rows[rows.length - 1]?.reviewer_role || "";
        return res.status(200).json({
          success: true,
          caseIds,
          submissions,
          reviewerRole,
          provider: "Supabase"
        });
      }

      return res.status(200).json({ success: true, caseIds: [], submissions: [], provider: "None" });
    } catch (e: any) {
      return res.status(200).json({ success: false, caseIds: [], submissions: [], error: e?.message });
    }
  }

  // 2. POST: Submit a case evaluation
  if (req.method === "POST") {
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }

    const sub = body?.sub || body;
    if (!sub || !sub.caseId || !sub.reviewerName || !sub.metrics) {
      return res.status(400).json({
        success: false,
        cloudSynced: false,
        error: "Data penilaian tidak lengkap (caseId, reviewerName, metrics wajib ada)."
      });
    }

    try {
      const result = await upsertSubmission(sub);
      return res.status(200).json({
        success: true,
        cloudSynced: true,
        provider: result.provider,
        message: `Penilaian berhasil dikirim dan tersimpan di database ${result.provider}.`
      });
    } catch (e: any) {
      return res.status(500).json({
        success: false,
        cloudSynced: false,
        error: e?.message || "Gagal menyimpan ke database server.",
        message: `Tersimpan di perangkat lokal, namun gagal terkirim ke database server: ${e?.message || "Kesalahan jaringan"}`
      });
    }
  }

  return res.status(405).json({ success: false, error: "Method Not Allowed" });
}
