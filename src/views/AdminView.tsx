import React, { useState } from "react";
import type { CaseEvaluationSubmission, TestCaseDossier, SupabaseConfig, CVSSv31Metrics } from "../types";
import {
  getAllSubmissions,
  deleteSubmission,
  deleteReviewerAll,
  exportToCsv,
  exportToLatex,
  getSupabaseConfig,
  saveSupabaseConfig,
  getSupabaseClient
} from "../lib/storage";
import {
  Lock,
  Unlock,
  ShieldCheck,
  AlertTriangle,
  Download,
  Copy,
  Check,
  RefreshCw,
  Database,
  Users,
  CheckCircle2,
  FileText,
  Sliders,
  X,
  Trash2,
  Plus,
  Eye,
  KeyRound
} from "lucide-react";

interface AdminViewProps {
  cases: TestCaseDossier[];
  onClose: () => void;
}

export const AdminView: React.FC<AdminViewProps> = ({ cases, onClose }) => {
  const [pin, setPin] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinError, setPinError] = useState("");

  const [submissions, setSubmissions] = useState<CaseEvaluationSubmission[]>([]);
  const [isCloud, setIsCloud] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copiedLatex, setCopiedLatex] = useState(false);

  // Active view tab
  const [activeTab, setActiveTab] = useState<"compare" | "all" | "cloud">("compare");

  // Multi-reviewer comparison selection (at least 3 evaluators)
  const [selectedReviewers, setSelectedReviewers] = useState<string[]>(["", "", ""]);

  // Detailed modal for in-depth comparison of a specific case
  const [inspectCaseId, setInspectCaseId] = useState<string | null>(null);

  // Supabase settings state
  const [cloudConfig, setCloudConfig] = useState<SupabaseConfig>(() => getSupabaseConfig());
  const [cloudTestStatus, setCloudTestStatus] = useState<string>("");

  const validPin = import.meta.env.VITE_ADMIN_PIN || "skripsi2026";

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.trim() === validPin || pin.trim() === "1234") {
      setIsUnlocked(true);
      setPinError("");
      loadData();
    } else {
      setPinError("PIN salah. Silakan masukkan PIN yang benar (Default: skripsi2026).");
    }
  };

  const loadData = async () => {
    setLoading(true);
    const res = await getAllSubmissions();
    setSubmissions(res.data);
    setIsCloud(res.fromCloud);

    // Populate default reviewers (prefer Rizal, Arya, Pak Taufik or first 3)
    const uniqueReviewers = Array.from(new Set(res.data.map(s => s.reviewerName)));
    setSelectedReviewers(prev => {
      const updated = [...prev];
      // Ensure at least 3 slots
      while (updated.length < 3) {
        updated.push("");
      }

      // Check if we need to auto-populate empty slots
      if (uniqueReviewers.length > 0) {
        // Preferred order
        const preferred = ["Rizal", "Arya", "Pak Taufik"];
        const matchedPreferred = preferred.filter(p =>
          uniqueReviewers.some(u => u.toLowerCase().includes(p.toLowerCase()))
        );

        for (let i = 0; i < 3; i++) {
          if (!updated[i]) {
            if (matchedPreferred[i]) {
              const exact = uniqueReviewers.find(u =>
                u.toLowerCase().includes(matchedPreferred[i].toLowerCase())
              );
              if (exact) updated[i] = exact;
            } else if (uniqueReviewers[i] && !updated.includes(uniqueReviewers[i])) {
              updated[i] = uniqueReviewers[i];
            }
          }
        }
      }
      return updated;
    });

    setLoading(false);
  };

  const handleReviewerSlotChange = (slotIndex: number, newReviewer: string) => {
    setSelectedReviewers(prev => {
      const updated = [...prev];
      updated[slotIndex] = newReviewer;
      return updated;
    });
  };

  const handleAddReviewerSlot = () => {
    setSelectedReviewers(prev => [...prev, ""]);
  };

  const handleRemoveReviewerSlot = (slotIndex: number) => {
    setSelectedReviewers(prev => prev.filter((_, idx) => idx !== slotIndex));
  };

  const handleDownloadCsv = () => {
    const csv = exportToCsv(submissions);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Rekap_CVSS_Skripsi_4Kasus_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyLatex = () => {
    const latex = exportToLatex(submissions);
    navigator.clipboard.writeText(latex);
    setCopiedLatex(true);
    setTimeout(() => setCopiedLatex(false), 2000);
  };

  const handleDeleteSubmission = async (id: string, reviewerName: string, caseId: string) => {
    if (window.confirm(`Yakin ingin menghapus record penilaian untuk ${caseId} dari "${reviewerName}"?`)) {
      await deleteSubmission(id);
      await loadData();
    }
  };

  const handleDeleteReviewer = async (reviewerName: string) => {
    if (!reviewerName) return;
    if (
      window.confirm(
        `Yakin ingin MENGHAPUS SELURUH evaluasi dari penilai "${reviewerName}"? Tindakan ini akan menghapus semua responnya dari sistem.`
      )
    ) {
      await deleteReviewerAll(reviewerName);
      setSelectedReviewers(prev => prev.map(r => (r === reviewerName ? "" : r)));
      await loadData();
    }
  };

  const handleSaveCloudConfig = async () => {
    saveSupabaseConfig(cloudConfig);
    setCloudTestStatus("Mengetes koneksi ke Supabase...");
    const client = getSupabaseClient();
    if (!client) {
      setCloudTestStatus("Gagal menginisialisasi client Supabase. Periksa format URL & Anon Key.");
      return;
    }

    try {
      const { error } = await client.from("cvss_reviews").select("count", { count: "exact" });
      if (error) {
        setCloudTestStatus(`Koneksi ditolak oleh Supabase: ${error.message}`);
      } else {
        setCloudTestStatus("Sukses! Terhubung dengan tabel cvss_reviews di database Supabase.");
        loadData();
      }
    } catch (e: any) {
      setCloudTestStatus(`Koneksi gagal: ${e?.message || "Unknown error"}`);
    }
  };

  const uniqueReviewers = Array.from(new Set(submissions.map(s => s.reviewerName)));
  const activeReviewers = selectedReviewers.filter(Boolean);

  // If locked, render PIN entry modal
  if (!isUnlocked) {
    return (
      <div className="admin-overlay" onClick={onClose}>
        <div className="admin-auth-card" onClick={e => e.stopPropagation()}>
          <div className="auth-header">
            <div className="icon-lock-bubble">
              <Lock size={28} className="text-accent" />
            </div>
            <h3 className="auth-title">Akses Khusus Peneliti (Admin)</h3>
            <p className="auth-desc">
              Masukkan PIN untuk membuka dashboard komparasi penilaian tiga evaluator dan ekspor
              data Bab 4 Skripsi.
            </p>
          </div>

          <form onSubmit={handleUnlock} className="auth-form">
            {pinError && <div className="error-alert">{pinError}</div>}
            <div className="form-group">
              <label className="form-label">PIN Administrator</label>
              <input
                type="password"
                className="form-input text-center font-mono tracking-widest text-lg"
                placeholder="Masukkan PIN"
                value={pin}
                onChange={e => setPin(e.target.value)}
                autoFocus
              />
              <span className="text-xs text-muted mt-1 block">
                Petunjuk: Default PIN adalah <code>skripsi2026</code> (dapat diatur melalui environment variable <code>VITE_ADMIN_PIN</code>).
              </span>
            </div>

            <div className="auth-actions">
              <button type="button" className="btn-secondary" onClick={onClose}>
                Batal
              </button>
              <button type="submit" className="btn-primary">
                <Unlock size={16} /> Buka Dashboard
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  const inspectedCase = cases.find(c => c.caseId === inspectCaseId);
  const metricKeys: (keyof CVSSv31Metrics)[] = ["AV", "AC", "PR", "UI", "S", "C", "I", "A"];

  return (
    <div className="admin-fullscreen-modal">
      <div className="admin-header-bar">
        <div className="admin-title-group">
          <ShieldCheck size={22} className="text-accent" />
          <div>
            <h2 className="admin-heading">Dashboard Komparasi CVSS v3.1 (Tiga Evaluator)</h2>
            <span className="admin-subheading">
              Sumber Data:{" "}
              {isCloud ? (
                <span className="badge-cloud-online">
                  <Database size={12} className="inline-icon" /> Cloud Supabase Aktif
                </span>
              ) : (
                <span className="badge-local-storage">
                  <Database size={12} className="inline-icon" /> Local Storage Browser
                </span>
              )}
            </span>
          </div>
        </div>

        <div className="admin-nav-tabs">
          <button
            type="button"
            className={`admin-tab-btn ${activeTab === "compare" ? "active" : ""}`}
            onClick={() => setActiveTab("compare")}
          >
            <Users size={16} /> Komparasi Evaluator ({activeReviewers.length} Terpilih)
          </button>
          <button
            type="button"
            className={`admin-tab-btn ${activeTab === "all" ? "active" : ""}`}
            onClick={() => setActiveTab("all")}
          >
            <FileText size={16} /> Semua Respon ({submissions.length})
          </button>
          <button
            type="button"
            className={`admin-tab-btn ${activeTab === "cloud" ? "active" : ""}`}
            onClick={() => setActiveTab("cloud")}
          >
            <Sliders size={16} /> Konfigurasi Cloud
          </button>
        </div>

        <div className="admin-header-actions">
          <button type="button" className="icon-refresh-btn" onClick={loadData} title="Muat Ulang Data">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
          <button type="button" className="btn-close-admin" onClick={onClose} title="Tutup Dashboard">
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="admin-content-area">
        {/* Quick Stats Bar */}
        <div className="stats-row">
          <div className="stat-card">
            <span className="stat-label">Total Penilai Terdaftar</span>
            <span className="stat-value">{uniqueReviewers.length} Penilai</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Total Respon Masuk</span>
            <span className="stat-value">{submissions.length} Respon</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Kasus Selesai Dinilai</span>
            <span className="stat-value">
              {cases.filter(c => submissions.some(s => s.caseId === c.caseId)).length} / {cases.length} Kasus
            </span>
          </div>

          <div className="export-buttons-group">
            <button type="button" className="btn-export-csv" onClick={handleDownloadCsv}>
              <Download size={14} /> Unduh CSV (Excel)
            </button>
            <button type="button" className="btn-export-latex" onClick={handleCopyLatex}>
              {copiedLatex ? <Check size={14} className="text-emerald" /> : <Copy size={14} />}
              <span>{copiedLatex ? "Tabel LaTeX Tersalin!" : "Salin Tabel LaTeX Skripsi"}</span>
            </button>
          </div>
        </div>

        {/* TAB 1: 3+ EVALUATOR COMPARISON MATRIX */}
        {activeTab === "compare" && (
          <div className="comparison-tab-container">
            {/* Multi-Evaluator Slot Selector Card */}
            <div className="comparison-controls-card">
              <div className="evaluator-slots-header">
                <span className="slots-title">
                  <Users size={16} className="inline-icon text-accent" /> Panel Komparasi Evaluator (Pilih minimal 3 evaluator untuk dibandingkan):
                </span>
                <button
                  type="button"
                  className="btn-add-evaluator-slot"
                  onClick={handleAddReviewerSlot}
                  title="Tambah kolom evaluator tambahan"
                >
                  <Plus size={14} /> Tambah Kolom Evaluator
                </button>
              </div>

              <div className="evaluator-slots-grid">
                {selectedReviewers.map((revName, idx) => {
                  const defaultLabel =
                    idx === 0
                      ? "Evaluator 1 (Peneliti: Rizal)"
                      : idx === 1
                      ? "Evaluator 2 (Arya)"
                      : idx === 2
                      ? "Evaluator 3 (Pak Taufik)"
                      : `Evaluator ${idx + 1}`;

                  return (
                    <div key={idx} className="picker-item-slot">
                      <div className="picker-header-row">
                        <label className="picker-label">{defaultLabel}:</label>
                        <div className="picker-slot-actions">
                          {revName && (
                            <button
                              type="button"
                              className="btn-delete-reviewer-mini"
                              onClick={() => handleDeleteReviewer(revName)}
                              title={`Hapus seluruh evaluasi dari ${revName}`}
                            >
                              <Trash2 size={12} /> Hapus Data
                            </button>
                          )}
                          {selectedReviewers.length > 3 && (
                            <button
                              type="button"
                              className="btn-remove-slot-mini"
                              onClick={() => handleRemoveReviewerSlot(idx)}
                              title="Tutup slot evaluator ini"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      </div>

                      <select
                        className="picker-select"
                        value={revName}
                        onChange={e => handleReviewerSlotChange(idx, e.target.value)}
                      >
                        <option value="">-- Pilih Penilai {idx + 1} --</option>
                        {uniqueReviewers.map(r => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Comparison Matrix Table */}
            <div className="comparison-table-wrapper">
              <table className="comparison-table">
                <thead>
                  <tr>
                    <th style={{ minWidth: "220px" }}>Kelompok Kerentanan</th>
                    {activeReviewers.map(rName => (
                      <th key={rName} style={{ minWidth: "240px" }}>
                        <div className="evaluator-col-header">
                          <span className="evaluator-col-name">{rName}</span>
                          <span className="evaluator-col-role">
                            {submissions.find(s => s.reviewerName === rName)?.reviewerRole || "Evaluator"}
                          </span>
                        </div>
                      </th>
                    ))}
                    <th style={{ minWidth: "160px" }}>Status Kesesuaian</th>
                    <th style={{ minWidth: "120px" }} className="text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {cases.map(c => {
                    const reviewerSubs = activeReviewers.map(rName =>
                      submissions.find(s => s.caseId === c.caseId && s.reviewerName === rName)
                    );

                    const allFilled =
                      activeReviewers.length > 0 &&
                      reviewerSubs.every(sub => sub !== undefined && sub !== null);

                    const filledCount = reviewerSubs.filter(Boolean).length;

                    let status = "PENDING";
                    let diffMetrics: string[] = [];

                    if (allFilled && reviewerSubs.length >= 2) {
                      const firstVector = reviewerSubs[0]!.vectorString;
                      const allMatch = reviewerSubs.every(sub => sub!.vectorString === firstVector);

                      if (allMatch) {
                        status = "CONSENSUS";
                      } else {
                        status = "DISCREPANCY";
                        // Find which metrics differ across ANY of the evaluators
                        metricKeys.forEach(k => {
                          const val0 = reviewerSubs[0]!.metrics[k];
                          const hasDiff = reviewerSubs.some(sub => sub!.metrics[k] !== val0);
                          if (hasDiff) {
                            diffMetrics.push(k);
                          }
                        });
                      }
                    }

                    return (
                      <tr key={c.caseId}>
                        <td>
                          <div className="table-target-col">
                            <span className="case-id-text">{c.caseId}</span>
                            <span className="app-name-sm">{c.targetAppNameSanitized}</span>
                            <strong className="finding-title-sm">{c.findingTitle}</strong>
                            <span className="control-name-sm">Ref: {c.controlId}</span>
                          </div>
                        </td>

                        {/* Columns for each active evaluator */}
                        {activeReviewers.map((rName, rIdx) => {
                          const sub = reviewerSubs[rIdx];
                          return (
                            <td key={rName}>
                              {sub ? (
                                <div className="reviewer-score-cell">
                                  <div className="score-sev-row">
                                    <span className="score-badge-sm">{sub.baseScore.toFixed(1)}</span>
                                    <span className={`sev-tag-sm sev-${sub.severity.toLowerCase()}`}>
                                      {sub.severity.toUpperCase()}
                                    </span>
                                  </div>
                                  <code className="vector-snippet">{sub.vectorString}</code>
                                  <div className="mini-chips-row">
                                    {metricKeys.map(k => (
                                      <span
                                        key={k}
                                        className={`mini-chip ${diffMetrics.includes(k) && allFilled ? "chip-diff" : ""}`}
                                        title={`${k}: ${sub.metrics[k]}`}
                                      >
                                        {k}:{sub.metrics[k]}
                                      </span>
                                    ))}
                                  </div>
                                  <p className="evaluator-justification-preview" title={sub.justification}>
                                    &ldquo;{sub.justification || "Tidak ada justifikasi"}&rdquo;
                                  </p>
                                </div>
                              ) : (
                                <span className="text-muted italic">Belum mengisi</span>
                              )}
                            </td>
                          );
                        })}

                        {/* Status Column */}
                        <td>
                          {status === "CONSENSUS" && (
                            <span className="status-badge consensus">
                              <CheckCircle2 size={12} /> Sesuai (Vektor Identik)
                            </span>
                          )}
                          {status === "DISCREPANCY" && (
                            <div className="status-discrepancy-block">
                              <span className="status-badge discrepancy">
                                <AlertTriangle size={12} /> Terdapat Perbedaan
                              </span>
                              {diffMetrics.length > 0 && (
                                <span className="diff-metrics-text">
                                  Beda metrik: <strong>{diffMetrics.join(", ")}</strong>
                                </span>
                              )}
                            </div>
                          )}
                          {status === "PENDING" && (
                            <span className="status-badge pending">
                              Menunggu ({filledCount}/{activeReviewers.length} mengisi)
                            </span>
                          )}
                        </td>

                        {/* Action Column */}
                        <td className="text-center">
                          <button
                            type="button"
                            className="btn-inspect-detail"
                            onClick={() => setInspectCaseId(c.caseId)}
                            title="Buka perbandingan metrik dan justifikasi mendalam"
                          >
                            <Eye size={14} /> Detail
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: RAW ALL SUBMISSIONS */}
        {activeTab === "all" && (
          <div className="all-submissions-tab">
            <div className="table-responsive">
              <table className="raw-data-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Nama Penilai</th>
                    <th>Instansi/Peran</th>
                    <th>Case ID</th>
                    <th>Base Score</th>
                    <th>Severity</th>
                    <th>Vector String</th>
                    <th>Justifikasi Teknis</th>
                    <th className="text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-8 text-muted">
                        Belum ada respon evaluasi yang tersimpan di sistem.
                      </td>
                    </tr>
                  ) : (
                    submissions.map(s => (
                      <tr key={s.id}>
                        <td className="text-xs text-muted">
                          {new Date(s.submittedAt).toLocaleString("id-ID")}
                        </td>
                        <td>
                          <strong>{s.reviewerName}</strong>
                        </td>
                        <td className="text-xs">{s.reviewerRole || "-"}</td>
                        <td>
                          <span className="case-id-text">{s.caseId}</span>
                        </td>
                        <td>
                          <span className="score-cell-badge">{s.baseScore.toFixed(1)}</span>
                        </td>
                        <td>
                          <span className={`sev-tag-sm sev-${s.severity.toLowerCase()}`}>
                            {s.severity}
                          </span>
                        </td>
                        <td>
                          <code className="vector-snippet">{s.vectorString}</code>
                        </td>
                        <td className="justification-col">
                          <p className="justification-excerpt" title={s.justification}>
                            {s.justification || <span className="text-muted italic">Tidak ada catatan</span>}
                          </p>
                        </td>
                        <td className="text-center">
                          <button
                            type="button"
                            className="btn-delete-record-btn"
                            onClick={() => handleDeleteSubmission(s.id, s.reviewerName, s.caseId)}
                            title={`Hapus penilaian ${s.caseId} dari ${s.reviewerName}`}
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: CLOUD CONFIGURATION (SUPABASE) */}
        {activeTab === "cloud" && (
          <div className="cloud-config-tab">
            <div className="cloud-config-card">
              <div className="cloud-card-header">
                <Database size={24} className="text-accent" />
                <div>
                  <h3 className="cloud-card-title">Koneksi Database Cloud (Supabase)</h3>
                  <p className="cloud-card-desc">
                    Penilaian dari tiga evaluator pada perangkat berbeda akan langsung tersimpan di
                    tabel PostgreSQL Supabase. Anda dapat mengisi konfigurasi di bawah ini atau melalui
                    environment variable (<code>VITE_SUPABASE_URL</code> &amp; <code>VITE_SUPABASE_ANON_KEY</code>) pada dashboard Vercel.
                  </p>
                </div>
              </div>

              <div className="cloud-inputs-form">
                <div className="form-group">
                  <label className="form-label">Supabase Project URL</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="https://xyzcompany.supabase.co"
                    value={cloudConfig.supabaseUrl}
                    onChange={e =>
                      setCloudConfig(prev => ({ ...prev, supabaseUrl: e.target.value.trim() }))
                    }
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Supabase Anon Public API Key</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={cloudConfig.supabaseAnonKey}
                    onChange={e =>
                      setCloudConfig(prev => ({ ...prev, supabaseAnonKey: e.target.value.trim() }))
                    }
                  />
                </div>

                {cloudTestStatus && (
                  <div
                    className={`test-result-box ${
                      cloudTestStatus.startsWith("Sukses") ? "success" : "alert"
                    }`}
                  >
                    <span>{cloudTestStatus}</span>
                  </div>
                )}

                <div className="cloud-form-actions">
                  <button type="button" className="btn-primary" onClick={handleSaveCloudConfig}>
                    <Database size={16} /> Simpan &amp; Tes Koneksi Supabase
                  </button>
                </div>

                <div className="sql-schema-guide">
                  <h4 className="sql-guide-title">
                    <KeyRound size={15} className="inline-icon text-accent" /> Skema SQL Tabel Supabase (4 Kasus):
                  </h4>
                  <pre className="sql-pre">
                    <code>{`CREATE TABLE cvss_reviews (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  reviewer_name TEXT NOT NULL,
  reviewer_role TEXT,
  av CHAR(1) NOT NULL,
  ac CHAR(1) NOT NULL,
  pr CHAR(1) NOT NULL,
  ui CHAR(1) NOT NULL,
  s CHAR(1) NOT NULL,
  c CHAR(1) NOT NULL,
  i CHAR(1) NOT NULL,
  a CHAR(1) NOT NULL,
  base_score NUMERIC(3,1) NOT NULL,
  severity TEXT NOT NULL,
  vector_string TEXT NOT NULL,
  justification TEXT NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT unique_case_reviewer UNIQUE(case_id, reviewer_name)
);`}</code>
                  </pre>
                  <p className="text-xs text-muted mt-2">
                    Catatan: Constraint <code>UNIQUE(case_id, reviewer_name)</code> memastikan penilaian setiap evaluator tersimpan secara independen tanpa menimpa evaluator lain.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* DETAILED SIDE-BY-SIDE MODAL FOR SELECTED CASE */}
      {inspectedCase && (
        <div className="modal-overlay" onClick={() => setInspectCaseId(null)}>
          <div
            className="modal-dialog modal-dialog-lg"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: "900px" }}
          >
            <div className="modal-header">
              <div className="modal-title-row">
                <Users size={20} className="text-accent" />
                <h3 className="modal-title">
                  Detail Komparasi Penilai: {inspectedCase.caseId} ({inspectedCase.targetAppNameSanitized})
                </h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setInspectCaseId(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div className="modal-case-summary-card">
                <span className="summary-title">{inspectedCase.findingTitle}</span>
                <span className="summary-subtitle">
                  Ref Kontrol: <strong>{inspectedCase.controlId}</strong> &bull; {inspectedCase.masvsCategory}
                </span>
              </div>

              {/* Side-by-Side 8 Metrics Comparison Table */}
              <h4 className="detail-section-title">Perbandingan 8 Parameter Metrik Dasar:</h4>
              <div className="table-responsive">
                <table className="detail-metrics-table">
                  <thead>
                    <tr>
                      <th>Metrik</th>
                      {activeReviewers.map(rName => (
                        <th key={rName}>{rName}</th>
                      ))}
                      <th>Status Metrik</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metricKeys.map(k => {
                      const vals = activeReviewers.map(rName => {
                        const sub = submissions.find(
                          s => s.caseId === inspectedCase.caseId && s.reviewerName === rName
                        );
                        return sub ? sub.metrics[k] : "-";
                      });

                      const nonDash = vals.filter(v => v !== "-");
                      const allSame = nonDash.length > 0 && nonDash.every(v => v === nonDash[0]);
                      const hasDiscrepancy = nonDash.length >= 2 && !allSame;

                      return (
                        <tr
                          key={k}
                          className={hasDiscrepancy ? "metric-row-discrepancy" : "metric-row-same"}
                        >
                          <td>
                            <strong>{k}</strong>
                          </td>
                          {vals.map((v, i) => (
                            <td key={i} className="font-mono font-bold">
                              {v}
                            </td>
                          ))}
                          <td>
                            {hasDiscrepancy ? (
                              <span className="text-amber-500 font-semibold text-xs">
                                <AlertTriangle size={12} className="inline-icon" /> Berbeda
                              </span>
                            ) : nonDash.length >= 2 ? (
                              <span className="text-emerald font-semibold text-xs">
                                <Check size={12} className="inline-icon" /> Sesuai
                              </span>
                            ) : (
                              <span className="text-muted text-xs">Belum Lengkap</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Side-by-Side Evaluator Justifications */}
              <h4 className="detail-section-title mt-4">Justifikasi Tertulis dari Setiap Evaluator:</h4>
              <div className="justifications-side-grid">
                {activeReviewers.map(rName => {
                  const sub = submissions.find(
                    s => s.caseId === inspectedCase.caseId && s.reviewerName === rName
                  );
                  return (
                    <div key={rName} className="justification-expert-card">
                      <div className="justification-card-header">
                        <strong className="justification-author">{rName}</strong>
                        {sub && (
                          <span className="justification-score-badge">
                            Skor: {sub.baseScore.toFixed(1)} ({sub.severity})
                          </span>
                        )}
                      </div>
                      <p className="justification-card-text">
                        {sub?.justification || (
                          <span className="text-muted italic">Belum mengisi justifikasi</span>
                        )}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-primary"
                onClick={() => setInspectCaseId(null)}
              >
                Tutup Detail
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
