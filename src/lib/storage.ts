import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CaseEvaluationSubmission, ReviewerProfile, SupabaseConfig } from "../types";

const STORAGE_KEYS = {
  REVIEWER: "cvss_review_active_reviewer",
  SUBMISSIONS: "cvss_review_submissions",
  SUPABASE_CONFIG: "cvss_review_supabase_config"
};

let supabaseInstance: SupabaseClient | null = null;

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
  supabaseInstance = null; // reset client to reinitialize
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

export function getLocalSubmissions(): CaseEvaluationSubmission[] {
  const raw = localStorage.getItem(STORAGE_KEYS.SUBMISSIONS);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveLocalSubmission(sub: CaseEvaluationSubmission): void {
  const all = getLocalSubmissions();
  // Upsert by caseId + reviewerName
  const index = all.findIndex(
    item => item.caseId === sub.caseId && item.reviewerName.trim().toLowerCase() === sub.reviewerName.trim().toLowerCase()
  );

  if (index >= 0) {
    all[index] = sub;
  } else {
    all.push(sub);
  }

  localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(all));
}

export async function saveSubmission(
  sub: CaseEvaluationSubmission
): Promise<{ success: boolean; cloudSynced: boolean; message: string }> {
  // Always persist locally first to guarantee zero data loss
  saveLocalSubmission(sub);

  const client = getSupabaseClient();
  if (!client) {
    return {
      success: true,
      cloudSynced: false,
      message: "Data tersimpan lokal di browser (Supabase belum dihubungkan)."
    };
  }

  try {
    const { error } = await client.from("cvss_reviews").upsert(
      {
        id: sub.id,
        case_id: sub.caseId,
        reviewer_name: sub.reviewerName,
        reviewer_role: sub.reviewerRole,
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
        justification: sub.justification,
        submitted_at: sub.submittedAt
      },
      { onConflict: "case_id,reviewer_name" }
    );

    if (error) {
      console.warn("Supabase upsert warning:", error);
      return {
        success: true,
        cloudSynced: false,
        message: `Tersimpan di browser, gagal sinkronisasi cloud: ${error.message}`
      };
    }

    return {
      success: true,
      cloudSynced: true,
      message: "Berhasil disimpan dan disinkronkan ke database Supabase!"
    };
  } catch (err: any) {
    return {
      success: true,
      cloudSynced: false,
      message: `Tersimpan di browser, koneksi cloud gagal: ${err?.message || "Unknown error"}`
    };
  }
}

export async function deleteSubmission(id: string): Promise<boolean> {
  // 1. Delete from LocalStorage
  const local = getLocalSubmissions();
  const filtered = local.filter(s => s.id !== id);
  localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(filtered));

  // 2. Delete from Supabase if connected
  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from("cvss_reviews").delete().eq("id", id);
    } catch (e) {
      console.warn("Error deleting from Supabase:", e);
    }
  }

  return true;
}

export async function deleteReviewerAll(reviewerName: string): Promise<boolean> {
  // 1. Delete from LocalStorage
  const local = getLocalSubmissions();
  const filtered = local.filter(
    s => s.reviewerName.trim().toLowerCase() !== reviewerName.trim().toLowerCase()
  );
  localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(filtered));

  // 2. Delete from Supabase if connected
  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from("cvss_reviews").delete().eq("reviewer_name", reviewerName);
    } catch (e) {
      console.warn("Error deleting reviewer from Supabase:", e);
    }
  }

  return true;
}

export async function getAllSubmissions(): Promise<{
  data: CaseEvaluationSubmission[];
  fromCloud: boolean;
}> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from("cvss_reviews")
        .select("*")
        .order("submitted_at", { ascending: true });

      if (!error && data && data.length > 0) {
        // Map database columns to CaseEvaluationSubmission model
        const mapped: CaseEvaluationSubmission[] = data.map((row: any) => ({
          id: row.id,
          caseId: row.case_id,
          reviewerName: row.reviewer_name,
          reviewerRole: row.reviewer_role,
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
          justification: row.justification,
          submittedAt: row.submitted_at
        }));
        return { data: mapped, fromCloud: true };
      }
    } catch (e) {
      console.warn("Could not fetch from Supabase, falling back to local:", e);
    }
  }

  return { data: getLocalSubmissions(), fromCloud: false };
}

// ==================== Export Helpers for Skripsi ====================

export function exportToCsv(submissions: CaseEvaluationSubmission[]): string {
  const headers = [
    "Timestamp",
    "Reviewer Name",
    "Role/Institution",
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
    "Justification"
  ];

  const rows = submissions.map(s => [
    `"${s.submittedAt}"`,
    `"${s.reviewerName.replace(/"/g, '""')}"`,
    `"${s.reviewerRole.replace(/"/g, '""')}"`,
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
  // Group by Case ID for a neat academic thesis table
  const caseIds = ["CASE-01", "CASE-02", "CASE-03", "CASE-04", "CASE-05", "CASE-06"];
  
  let latex = `\\begin{table}[htbp]
\\centering
\\caption{Rekapitulasi Penilaian CVSS v3.1 oleh Panel Pakar}
\\label{tab:rekap-cvss-expert}
\\resizebox{\\textwidth}{!}{%
\\begin{tabular}{|c|l|l|c|c|l|}
\\hline
\\textbf{Case ID} & \\textbf{Penilai} & \\textbf{Vector String CVSS v3.1} & \\textbf{Skor} & \\textbf{Tingkat Keparahan} \\\\ \\hline
`;

  caseIds.forEach(cId => {
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
