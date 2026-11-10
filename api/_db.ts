import { createClient } from "@supabase/supabase-js";

export function isD1Configured(): boolean {
  return Boolean(
    process.env.CLOUDFLARE_ACCOUNT_ID &&
    process.env.CLOUDFLARE_D1_DATABASE_ID &&
    process.env.CLOUDFLARE_API_TOKEN
  );
}

export function isSupabaseConfigured(): boolean {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY;
  return Boolean(url && key);
}

export function getSupabaseClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !key) return null;
  return createClient(url, key);
}

/**
 * Executes a SQL query against Cloudflare D1 using its official REST API.
 */
export async function queryD1(sql: string, params: any[] = []): Promise<any[]> {
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

/**
 * Ensures the cvss_reviews table exists in Cloudflare D1.
 */
export async function ensureD1Table(): Promise<void> {
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

  // Create indexes safely
  try {
    await queryD1("CREATE INDEX IF NOT EXISTS idx_cvss_reviews_case ON cvss_reviews(case_id);");
    await queryD1("CREATE INDEX IF NOT EXISTS idx_cvss_reviews_reviewer ON cvss_reviews(reviewer_name);");
    await queryD1("CREATE INDEX IF NOT EXISTS idx_cvss_reviews_version ON cvss_reviews(version);");
  } catch {
    // Indexes might already exist
  }
}

/**
 * Inserts or updates a submission in the active database (Cloudflare D1 preferred, Supabase fallback).
 */
export async function upsertSubmission(sub: any): Promise<{ provider: string }> {
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
    "Tidak ada database cloud yang terkonfigurasi. Setel kredensial Cloudflare D1 (CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_DATABASE_ID, CLOUDFLARE_API_TOKEN) di Environment Variables Vercel."
  );
}

/**
 * Fetches all v2 submissions from active database.
 */
export async function fetchAllV2Submissions(): Promise<{ data: any[]; provider: string }> {
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

/**
 * Deletes submissions by ID or reviewerName from active database.
 */
export async function deleteSubmissionsFromDb(filter: { id?: string; reviewerName?: string }): Promise<void> {
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
