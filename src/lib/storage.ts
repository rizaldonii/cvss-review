import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CaseEvaluationSubmission, ReviewerProfile, SupabaseConfig } from "../types";

export const CURRENT_CASE_VERSION = "v2";
export const VALID_CASE_IDS = ["CASE-01", "CASE-02", "CASE-03", "CASE-04"];

const STORAGE_KEYS = {
  REVIEWER: "cvss_review_active_reviewer",
  SESSION_ID: "cvss_review_browser_session_id",
  SUBMISSIONS: "cvss_review_submissions",
  SUPABASE_CONFIG: "cvss_review_supabase_config",
  ADMIN_TOKEN: "cvss_admin_token"
};

let supabaseInstance: SupabaseClient | null = null;

export function getReviewerSessionId(): string {
  let sid = localStorage.getItem(STORAGE_KEYS.SESSION_ID);
  if (!sid) {
    sid = "sess_" + Math.random().toString(36).substring(2, 10) + "_" + Date.now();
    localStorage.setItem(STORAGE_KEYS.SESSION_ID, sid);
  }
  return sid;
}

export function getSupabaseConfig(): SupabaseConfig {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || "";
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

  if (envUrl && envKey) {
    return { supabaseUrl: envUrl, supabaseAnonKey: envKey };
  }

  const stored = localStorage.getItem(STORAGE_KEYS.SUPABASE_CONFIG);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      // ignore
    }
  }

  return { supabaseUrl: "", supabaseAnonKey: "" };
}

export function saveSupabaseConfig(config: SupabaseConfig): void {
  localStorage.setItem(STORAGE_KEYS.SUPABASE_CONFIG, JSON.stringify(config));
  supabaseInstance = null; // reset client
}

export function getSupabaseClient(): SupabaseClient | null {
  if (supabaseInstance) return supabaseInstance;

  const config = getSupabaseConfig();
  if (config.supabaseUrl && config.supabaseAnonKey) {
    try {
      supabaseInstance = createClient(config.supabaseUrl, config.supabaseAnonKey);
      return supabaseInstance;
    } catch (e) {
      console.error("Failed to initialize Supabase client:", e);
      return null;
    }
  }

  return null;
}

// ==================== Serverless Admin Auth & Operations ====================

export async function loginAdminWithPassword(
  password: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch("/api/admin?action=login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || "Password admin tidak sesuai." };
    }

    if (data.token) {
      sessionStorage.setItem(STORAGE_KEYS.ADMIN_TOKEN, data.token);
    }

    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Gagal menghubungi server verifikasi admin. Periksa koneksi internet."
    };
  }
}

export async function checkAdminToken(): Promise<boolean> {
  const token = sessionStorage.getItem(STORAGE_KEYS.ADMIN_TOKEN);
  if (!token) return false;

  try {
    const res = await fetch("/api/admin?action=verify", {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      sessionStorage.removeItem(STORAGE_KEYS.ADMIN_TOKEN);
      return false;
    }

    const data = await res.json();
    if (!data.valid) {
      sessionStorage.removeItem(STORAGE_KEYS.ADMIN_TOKEN);
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export async function logoutAdmin(): Promise<void> {
  sessionStorage.removeItem(STORAGE_KEYS.ADMIN_TOKEN);
}

export async function getAdminSubmissions(): Promise<{
  data: CaseEvaluationSubmission[];
  fromCloud: boolean;
  error?: string;
}> {
  const token = sessionStorage.getItem(STORAGE_KEYS.ADMIN_TOKEN);
  if (token) {
    try {
      const res = await fetch("/api/admin?action=submissions", {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const body = await res.json();
        if (body.success && Array.isArray(body.data)) {
          const mapped: CaseEvaluationSubmission[] = body.data.map((row: any) => ({
            id: row.id,
            caseId: row.case_id,
            reviewerName: row.reviewer_name,
            reviewerRole: row.reviewer_role,
            version: CURRENT_CASE_VERSION,
            metrics: {
              AV: row.av,
              AC: row.ac,
              PR: row.pr,
              UI: row.ui,
              S: row.s,
              C: row.c,
              I: row.i,
              A: row.a
            },
            baseScore: Number(row.base_score),
            severity: row.severity,
            vectorString: row.vector_string,
            justification: row.justification || "",
            submittedAt: row.submitted_at
          }));
          return { data: mapped, fromCloud: true };
        }
      }
    } catch (e: any) {
      console.warn("Could not fetch submissions from server admin API:", e);
    }
  }

  // Fallback to local submissions if API is unavailable or offline
  return { data: getLocalSubmissions(), fromCloud: false };
}

export async function deleteAdminSubmission(id: string): Promise<boolean> {
  // Delete from local
  const local = getRawStoredSubmissions();
  const filtered = local.filter(s => s.id !== id);
  localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(filtered));

  const token = sessionStorage.getItem(STORAGE_KEYS.ADMIN_TOKEN);
  if (token) {
    try {
      await fetch("/api/admin?action=delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ id })
      });
    } catch (e) {
      console.warn("Error calling delete on server admin API:", e);
    }
  }

  return true;
}

export async function deleteAdminReviewerAll(reviewerName: string): Promise<boolean> {
  const local = getRawStoredSubmissions();
  const filtered = local.filter(
    s => s.reviewerName.trim().toLowerCase() !== reviewerName.trim().toLowerCase()
  );
  localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(filtered));

  const token = sessionStorage.getItem(STORAGE_KEYS.ADMIN_TOKEN);
  if (token) {
    try {
      await fetch("/api/admin?action=delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ reviewerName })
      });
    } catch (e) {
      console.warn("Error calling delete reviewer on server admin API:", e);
    }
  }

  return true;
}

// ==================== Reviewer Profile ====================

export function saveReviewerProfile(profile: ReviewerProfile): void {
  localStorage.setItem(STORAGE_KEYS.REVIEWER, JSON.stringify(profile));
}

export function getReviewerProfile(): ReviewerProfile | null {
  const raw = localStorage.getItem(STORAGE_KEYS.REVIEWER);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearReviewerProfile(): void {
  localStorage.removeItem(STORAGE_KEYS.REVIEWER);
}

// ==================== Submissions Management ====================

export function getRawStoredSubmissions(): CaseEvaluationSubmission[] {
  const raw = localStorage.getItem(STORAGE_KEYS.SUBMISSIONS);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function getLocalSubmissions(): CaseEvaluationSubmission[] {
  const all = getRawStoredSubmissions();
  // Filter strictly for current v2 4-case format (no accepting unversioned v1 submissions)
  return all.filter(
    s => VALID_CASE_IDS.includes(s.caseId) && s.version === CURRENT_CASE_VERSION
  );
}

export function saveLocalSubmission(sub: CaseEvaluationSubmission): void {
  const all = getRawStoredSubmissions();
  const index = all.findIndex(
    item =>
      item.caseId === sub.caseId &&
      item.reviewerName.trim().toLowerCase() === sub.reviewerName.trim().toLowerCase() &&
      item.version === CURRENT_CASE_VERSION
  );

  const enrichedSub: CaseEvaluationSubmission = {
    ...sub,
    version: CURRENT_CASE_VERSION,
    reviewerSessionId: sub.reviewerSessionId || getReviewerSessionId()
  };

  if (index >= 0) {
    all[index] = enrichedSub;
  } else {
    all.push(enrichedSub);
  }

  localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(all));
}

export async function saveSubmission(
  sub: CaseEvaluationSubmission
): Promise<{ success: boolean; cloudSynced: boolean; message: string }> {
  const sessionId = getReviewerSessionId();
  const enrichedSub: CaseEvaluationSubmission = {
    ...sub,
    version: CURRENT_CASE_VERSION,
    reviewerSessionId: sessionId
  };

  // 1. Simpan di perangkat lokal terlebih dahulu
  saveLocalSubmission(enrichedSub);

  const client = getSupabaseClient();
  if (!client) {
    return {
      success: true,
      cloudSynced: false,
      message: "Tersimpan di perangkat ini. Belum terkirim ke server (koneksi database belum disetel)."
    };
  }

  try {
    // 2. Cegah penimpaan data antar-pengguna dengan nama yang sama dari perangkat berbeda
    const localMatches = getLocalSubmissions().filter(
      s => s.reviewerName.trim().toLowerCase() === sub.reviewerName.trim().toLowerCase()
    );

    // Jika ini pengisian pertama dari browser ini untuk nama tersebut, pastikan nama belum dipakai orang lain di server
    if (localMatches.length <= 1) {
      const { data: existingRecords, error: checkError } = await client
        .from("cvss_reviews")
        .select("reviewer_name, case_id")
        .ilike("reviewer_name", sub.reviewerName.trim())
        .or("version.eq.v2,id.like.v2_%")
        .limit(1);

      if (!checkError && existingRecords && existingRecords.length > 0) {
        // Jika nama sudah ada di cloud tapi tidak ada riwayat lokal di browser ini
        const isKnownLocal = localStorage.getItem("cvss_known_reviewer_" + sub.reviewerName.trim().toLowerCase());
        if (!isKnownLocal) {
          return {
            success: false,
            cloudSynced: false,
            message: `Nama "${sub.reviewerName}" telah digunakan dari perangkat lain. Tambahkan inisial atau instansi pembeda untuk menghindari tumpang tindih data.`
          };
        }
      }
    }

    // Tandai nama reviewer ini sah untuk browser ini
    localStorage.setItem("cvss_known_reviewer_" + sub.reviewerName.trim().toLowerCase(), "true");

    const { error } = await client.from("cvss_reviews").upsert(
      {
        id: `v2_${sub.caseId}_${encodeURIComponent(sub.reviewerName.trim().toLowerCase())}`,
        case_id: sub.caseId,
        reviewer_name: sub.reviewerName.trim(),
        reviewer_role: sub.reviewerRole.trim(),
        version: CURRENT_CASE_VERSION,
        av: sub.metrics.AV,
        ac: sub.metrics.AC,
        pr: sub.metrics.PR,
        ui: sub.metrics.UI,
        s: sub.metrics.S,
        c: sub.metrics.C,
        i: sub.metrics.I,
        a: sub.metrics.A,
        base_score: sub.baseScore,
        severity: sub.severity,
        vector_string: sub.vectorString,
        justification: sub.justification.trim(),
        submitted_at: sub.submittedAt
      },
      { onConflict: "case_id,reviewer_name" }
    );

    if (error) {
      console.warn("Supabase upsert error:", error);
      return {
        success: false,
        cloudSynced: false,
        message: `Tersimpan di perangkat ini, namun gagal terkirim ke server: ${error.message}`
      };
    }

    return {
      success: true,
      cloudSynced: true,
      message: "Penilaian berhasil dikirim dan tersimpan di server."
    };
  } catch (err: any) {
    return {
      success: false,
      cloudSynced: false,
      message: `Tersimpan di perangkat ini, gagal terhubung ke server: ${err?.message || "Koneksi terputus"}`
    };
  }
}

// ==================== Export Helpers ====================

export function exportToCsv(submissions: CaseEvaluationSubmission[]): string {
  const headers = [
    "Timestamp",
    "Nama Evaluator",
    "Instansi / Keahlian",
    "Case ID",
    "AV",
    "AC",
    "PR",
    "UI",
    "Scope",
    "C",
    "I",
    "A",
    "Base Score",
    "Severity",
    "Vector String",
    "Alasan Penilaian"
  ];

  const rows = submissions.map(s => [
    `"${s.submittedAt}"`,
    `"${s.reviewerName.replace(/"/g, '""')}"`,
    `"${(s.reviewerRole || "").replace(/"/g, '""')}"`,
    `"${s.caseId}"`,
    `"${s.metrics.AV}"`,
    `"${s.metrics.AC}"`,
    `"${s.metrics.PR}"`,
    `"${s.metrics.UI}"`,
    `"${s.metrics.S}"`,
    `"${s.metrics.C}"`,
    `"${s.metrics.I}"`,
    `"${s.metrics.A}"`,
    `"${s.baseScore}"`,
    `"${s.severity}"`,
    `"${s.vectorString}"`,
    `"${(s.justification || "").replace(/"/g, '""')}"`
  ]);

  return [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
}

export function exportToLatex(submissions: CaseEvaluationSubmission[]): string {
  let latex = `\\begin{table}[htbp]
\\centering
\\caption{Rekapitulasi Penilaian CVSS v3.1 oleh Evaluator (Empat Kelompok Kerentanan)}
\\label{tab:rekap-cvss-evaluator}
\\resizebox{\\textwidth}{!}{%
\\begin{tabular}{|c|l|l|c|c|l|}
\\hline
\\textbf{Case ID} & \\textbf{Penilai} & \\textbf{Vector String CVSS v3.1} & \\textbf{Skor} & \\textbf{Keparahan} \\\\ \\hline
`;

  VALID_CASE_IDS.forEach(cId => {
    const caseSubs = submissions.filter(s => s.caseId === cId);
    if (caseSubs.length === 0) {
      latex += `${cId} & - & Belum dinilai & - & - \\\\ \\hline\n`;
    } else {
      caseSubs.forEach(s => {
        latex += `${cId} & ${s.reviewerName} & \\texttt{${s.vectorString}} & ${s.baseScore.toFixed(1)} & ${s.severity} \\\\ \n`;
      });
      latex += `\\hline\n`;
    }
  });

  latex += `\\end{tabular}%
}
\\end{table}`;

  return latex;
}
