import type { CaseEvaluationSubmission, ReviewerProfile } from "../types";

export const CURRENT_CASE_VERSION = "v2";
export const VALID_CASE_IDS = ["CASE-01", "CASE-02", "CASE-03", "CASE-04"];

const STORAGE_KEYS = {
  REVIEWER: "cvss_review_active_reviewer",
  SESSION_ID: "cvss_review_browser_session_id",
  SUBMISSIONS: "cvss_review_submissions",
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
    const res = await fetch("/api/admin?action=verify-session", {
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

export interface DatabaseStatus {
  d1Configured: boolean;
  activeProvider: string;
}

export async function getAdminDatabaseStatus(): Promise<DatabaseStatus> {
  const token = sessionStorage.getItem(STORAGE_KEYS.ADMIN_TOKEN);
  if (!token) {
    return { d1Configured: false, activeProvider: "Penyimpanan Lokal" };
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
          activeProvider: data.activeProvider || "Penyimpanan Lokal"
        };
      } catch {
        // fallback
      }
    }
  } catch {
    // fallback
  }

  return { d1Configured: false, activeProvider: "Penyimpanan Lokal" };
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

      const text = await res.text();
      let body: any = {};
      try {
        body = JSON.parse(text);
      } catch {
        body = {};
      }

      if (res.ok && body.success && Array.isArray(body.data)) {
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

      // Explicit error handling: do NOT mask D1 failures as empty data!
      return {
        data: [],
        fromCloud: false,
        error:
          body.error ||
          body.message ||
          `Gagal membaca database Cloudflare D1 (HTTP ${res.status}).`
      };
    } catch (e: any) {
      console.warn("Could not fetch submissions from server admin API:", e);
      return {
        data: [],
        fromCloud: false,
        error: `Gagal terhubung ke database Cloudflare D1: ${e?.message || "Koneksi terputus"}`
      };
    }
  }

  // Fallback to local submissions if unauthenticated or offline
  return { data: getLocalSubmissions(), fromCloud: false, provider: "Penyimpanan Lokal" };
}

export async function deleteAdminSubmission(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const token = sessionStorage.getItem(STORAGE_KEYS.ADMIN_TOKEN);
  if (!token) {
    return { success: false, error: "Sesi admin tidak ditemukan. Silakan login kembali." };
  }

  try {
    const res = await fetch("/api/admin?action=delete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ id })
    });

    const text = await res.text();
    let data: any = {};
    try {
      data = JSON.parse(text);
    } catch {
      data = { success: false, error: text || `HTTP ${res.status}` };
    }

    if (!res.ok || !data.success) {
      return {
        success: false,
        error: data.error || data.message || `Gagal menghapus data di database server (HTTP ${res.status}).`
      };
    }

    // Hanya hapus dari localStorage jika server mengonfirmasi sukses
    const local = getRawStoredSubmissions();
    const filtered = local.filter(s => s.id !== id);
    localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(filtered));

    return { success: true };
  } catch (e: any) {
    return {
      success: false,
      error: e?.message || "Gagal menghubungi server untuk menghapus data."
    };
  }
}

export async function deleteAdminReviewerAll(
  reviewerName: string
): Promise<{ success: boolean; error?: string }> {
  const token = sessionStorage.getItem(STORAGE_KEYS.ADMIN_TOKEN);
  if (!token) {
    return { success: false, error: "Sesi admin tidak ditemukan. Silakan login kembali." };
  }

  try {
    const res = await fetch("/api/admin?action=delete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ reviewerName })
    });

    const text = await res.text();
    let data: any = {};
    try {
      data = JSON.parse(text);
    } catch {
      data = { success: false, error: text || `HTTP ${res.status}` };
    }

    if (!res.ok || !data.success) {
      return {
        success: false,
        error: data.error || data.message || `Gagal menghapus evaluator di database server (HTTP ${res.status}).`
      };
    }

    // Hanya hapus dari localStorage jika server mengonfirmasi sukses
    const local = getRawStoredSubmissions();
    const filtered = local.filter(
      s => s.reviewerName.trim().toLowerCase() !== reviewerName.trim().toLowerCase()
    );
    localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(filtered));

    return { success: true };
  } catch (e: any) {
    return {
      success: false,
      error: e?.message || "Gagal menghubungi server untuk menghapus data evaluator."
    };
  }
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

  // 2. Kirim ke Server API (Cloudflare D1)
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

    const serverErr = data.error || data.message;
    return {
      success: false,
      cloudSynced: false,
      message: serverErr
        ? `Tersimpan di perangkat ini, namun server melaporkan galat: ${serverErr}`
        : "Tersimpan di perangkat ini, namun belum terkirim ke server database."
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
  const cleanName = reviewerName.trim();
  if (!cleanName) return [];

  const localSubs = getLocalSubmissions().filter(
    s => s.reviewerName.trim().toLowerCase() === cleanName.toLowerCase()
  );

  try {
    const res = await fetch(
      `/api/submissions?reviewerName=${encodeURIComponent(cleanName)}`
    );
    if (res.ok) {
      const text = await res.text();
      try {
        const data = JSON.parse(text);
        if (data.success && Array.isArray(data.submissions)) {
          const cloudSubs: CaseEvaluationSubmission[] = data.submissions;
          const syncedCaseIds: string[] = [];

          for (const localSub of localSubs) {
            const matchingCloud = cloudSubs.find(cs => cs.caseId === localSub.caseId);
            if (!matchingCloud) continue;

            // Pastikan data di cloud benar-benar mencerminkan versi penilaian terakhir
            const isVectorMatch = matchingCloud.vectorString === localSub.vectorString;
            const isScoreMatch =
              Math.abs(Number(matchingCloud.baseScore) - Number(localSub.baseScore)) < 0.05;
            const isJustificationMatch =
              (matchingCloud.justification || "").trim() === (localSub.justification || "").trim();

            const localTime = Date.parse(localSub.submittedAt || "");
            const cloudTime = Date.parse(matchingCloud.submittedAt || "");
            const localIsNewer =
              !isNaN(localTime) && !isNaN(cloudTime) && localTime > cloudTime;

            if (isVectorMatch && isScoreMatch && isJustificationMatch && !localIsNewer) {
              syncedCaseIds.push(localSub.caseId);
            }
          }

          return syncedCaseIds;
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

/**
 * Mengambil seluruh progress evaluasi yang tersimpan di cloud untuk nama penilai tertentu,
 * dan menyelaraskannya ke penyimpanan lokal tanpa menimpa perubahan lokal yang lebih baru.
 */
export async function fetchAndSyncReviewerProgress(reviewerName: string): Promise<{
  submissions: CaseEvaluationSubmission[];
  caseIds: string[];
  reviewerRole?: string;
}> {
  const cleanName = reviewerName.trim();
  if (!cleanName) {
    return { submissions: [], caseIds: [] };
  }

  // 1. Ambil data lokal terlebih dahulu
  const localSubs = getLocalSubmissions().filter(
    s => s.reviewerName.trim().toLowerCase() === cleanName.toLowerCase()
  );

  let cloudSubs: CaseEvaluationSubmission[] = [];
  let cloudRole: string | undefined;

  // 2. Query ke Server API (Cloudflare D1)
  try {
    const res = await fetch(
      `/api/submissions?reviewerName=${encodeURIComponent(cleanName)}`
    );
    if (res.ok) {
      const text = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch {
        data = {};
      }

      if (data.success && Array.isArray(data.submissions)) {
        cloudSubs = data.submissions;
        cloudRole = data.reviewerRole;

        // Sinkronisasikan setiap cloud submission ke localStorage tanpa menimpa perubahan lokal yang lebih baru
        for (const cloudSub of cloudSubs) {
          const existingLocal = localSubs.find(s => s.caseId === cloudSub.caseId);
          if (!existingLocal) {
            // Jika belum ada di lokal, simpan data dari cloud
            saveLocalSubmission(cloudSub);
          } else {
            const localTime = Date.parse(existingLocal.submittedAt || "");
            const cloudTime = Date.parse(cloudSub.submittedAt || "");

            // Jangan menimpa jika revisi lokal lebih baru dari cloud
            const localIsNewer = !isNaN(localTime) && !isNaN(cloudTime) && localTime > cloudTime;
            if (!localIsNewer) {
              saveLocalSubmission(cloudSub);
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn("Gagal mengambil progress dari server:", err);
  }

  // 3. Ambil data gabungan terbaru
  const allMerged = getLocalSubmissions().filter(
    s => s.reviewerName.trim().toLowerCase() === cleanName.toLowerCase()
  );

  const caseIds = Array.from(new Set(allMerged.map(s => s.caseId)));

  return {
    submissions: allMerged,
    caseIds,
    reviewerRole: cloudRole || localSubs[0]?.reviewerRole
  };
}

// ==================== Export Helpers ====================

export function escapeLatex(text: string): string {
  if (!text) return "";
  return text.replace(/[\\&%$#_{}~^]/g, char => {
    switch (char) {
      case "\\":
        return "\\textbackslash{}";
      case "~":
        return "\\textasciitilde{}";
      case "^":
        return "\\textasciicircum{}";
      default:
        return `\\${char}`;
    }
  });
}

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
\\begin{tabular}{|c|l|l|c|c|}
\\hline
\\textbf{Case ID} & \\textbf{Penilai} & \\textbf{Vector String CVSS v3.1} & \\textbf{Skor} & \\textbf{Keparahan} \\\\ \\hline
`;

  VALID_CASE_IDS.forEach(cId => {
    const caseSubs = submissions.filter(s => s.caseId === cId);
    if (caseSubs.length === 0) {
      latex += `${escapeLatex(cId)} & - & Belum dinilai & - & - \\\\ \\hline\n`;
    } else {
      caseSubs.forEach(s => {
        latex += `${escapeLatex(cId)} & ${escapeLatex(s.reviewerName)} & \\texttt{${escapeLatex(s.vectorString)}} & ${s.baseScore.toFixed(1)} & ${escapeLatex(s.severity)} \\\\ \n`;
      });
      latex += `\\hline\n`;
    }
  });

  latex += `\\end{tabular}%
}
\\end{table}`;

  return latex;
}
