import { upsertSubmission, queryD1, isD1Configured, getSupabaseClient } from "./_db.ts";

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

  // 1. GET: Check submitted cases for a reviewer
  if (req.method === "GET") {
    const url = new URL(req.url, "http://localhost");
    const reviewerName = url.searchParams.get("reviewerName");

    if (!reviewerName) {
      return res.status(400).json({ success: false, error: "Parameter reviewerName diperlukan." });
    }

    try {
      if (isD1Configured()) {
        const rows = await queryD1(
          "SELECT case_id FROM cvss_reviews WHERE LOWER(reviewer_name) = LOWER(?) AND (version = 'v2' OR id LIKE 'v2_%');",
          [reviewerName.trim()]
        );
        const caseIds = rows.map((r: any) => r.case_id);
        return res.status(200).json({ success: true, caseIds, provider: "Cloudflare D1" });
      }

      const supabase = getSupabaseClient();
      if (supabase) {
        const { data, error } = await supabase
          .from("cvss_reviews")
          .select("case_id")
          .ilike("reviewer_name", reviewerName.trim())
          .or("version.eq.v2,id.like.v2_%");

        if (error) throw error;
        const caseIds = data ? data.map((r: any) => r.case_id) : [];
        return res.status(200).json({ success: true, caseIds, provider: "Supabase" });
      }

      return res.status(200).json({ success: true, caseIds: [], provider: "None" });
    } catch (e: any) {
      return res.status(200).json({ success: false, caseIds: [], error: e?.message });
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

