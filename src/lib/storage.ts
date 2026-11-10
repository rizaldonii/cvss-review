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

    const text = await res.text();
    let data: any = {};
    try {
      data = JSON.parse(text);
    } catch {
      data = { success: false, error: text || `HTTP ${res.status}` };
    }

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

export async function getAdminDatabaseStatus(): Promise<{
  d1Configured: boolean;
  supabaseConfigured: boolean;
  activeProvider: string;
}> {
  const token = sessionStorage.getItem(STORAGE_KEYS.ADMIN_TOKEN);
  if (!token) {
    return { d1Configured: false, supabaseConfigured: false, activeProvider: "Penyimpanan Lokal" };
  }

  try {
    const res = await fetch("/api/admin?action=status", {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      const text = await res.text();
      try {
        const data = JSON.parse(text);
        return {
          d1Configured: Boolean(data.d1Configured),
          supabaseConfigured: Boolean(data.supabaseConfigured),
          activeProvider: data.activeProvider || "Penyimpanan Lokal"
        };
      } catch {
        // fallback
      }
    }
  } catch {
    // fallback
  }

  return { d1Configured: false, supabaseConfigured: false, activeProvider: "Penyimpanan Lokal" };
}

export async function migrateSupabaseToD1(): Promise<{
  success: boolean;
  count?: number;
  message: string;
}> {
  const token = sessionStorage.getItem(STORAGE_KEYS.ADMIN_TOKEN);
  if (!token) {
    return { success: false, message: "Token admin tidak ditemukan. Silakan login kembali." };
  }

  try {
    const res = await fetch("/api/admin?action=migrate-from-supabase", {
      headers: { Authorization: `Bearer ${token}` }
    });
    const text = await res.text();
    let data: any = {};
    try {
      data = JSON.parse(text);
    } catch {
      data = { success: false, error: text || `HTTP ${res.status}` };
    }
    return {
      success: Boolean(data.success),
      count: data.count,
      message: data.message || data.error || "Proses migrasi selesai."
    };
  } catch (err: any) {
    return { success: false, message: err?.message || "Gagal menghubungi server migrasi." };
  }
}

export async function getAdminSubmissions(): Promise<{
  data: CaseEvaluationSubmission[];
  fromCloud: boolean;
  provider?: string;
  error?: string;
}> {
  const token = sessionStorage.getItem(STORAGE_KEYS.ADMIN_TOKEN);
  if (token) {
    try {
      const res = await fetch("/api/admin?action=submissions", {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const text = await res.text();
        let body: any = {};
        try {
          body = JSON.parse(text);
        } catch {
          body = {};
        }

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
          return { data: mapped, fromCloud: true, provider: body.provider };
        }
      }
    } catch (e: any) {
      console.warn("Could not fetch submissions from server admin API:", e);
    }
  }

  // Fallback to local submissions if API is unavailable or offline
  return { data: getLocalSubmissions(), fromCloud: false, provider: "Penyimpanan Lokal" };
}

export async function deleteAdminSubmission(id: string): Promise<boolean> {
  // Delete from local storage
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
  // Filter strictly for current v2 4-case format
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

  // 1. Simpan di perangkat lokal terlebih dahulu (jaminan data tidak hilang)
  saveLocalSubmission(enrichedSub);

  // 2. Kirim ke Server API (Cloudflare D1 atau Supabase)
  try {
    const res = await fetch("/api/submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sub: enrichedSub })
    });

    const text = await res.text();
    let data: any = {};
    try {
      data = JSON.parse(text);
    } catch {
      data = { success: false, error: text || `HTTP ${res.status}` };
    }

    if (res.ok && data.success) {
      return {
        success: true,
        cloudSynced: true,
        message: data.message || "Penilaian berhasil dikirim dan tersimpan di database server."
      };
    }

    return {
      success: false,
      cloudSynced: false,
      message:
        data.message ||
        data.error ||
        "Tersimpan di perangkat ini, namun belum terkirim ke server database."
    };
  } catch (err: any) {
    return {
      success: false,
      cloudSynced: false,
      message: `Tersimpan di perangkat ini, namun gagal terhubung ke server: ${err?.message || "Koneksi terputus"}`
    };
  }
}

export async function checkReviewerCloudStatus(reviewerName: string): Promise<string[]> {
  try {
    const res = await fetch(
      `/api/submissions?reviewerName=${encodeURIComponent(reviewerName.trim())}`
    );
    if (res.ok) {
      const text = await res.text();
      try {
        const data = JSON.parse(text);
        if (data.success && Array.isArray(data.caseIds)) {
          return data.caseIds;
        }
      } catch {
        // fallback
      }
    }
  } catch {
    // offline
  }
  return [];
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
