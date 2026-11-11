import React, { useState, useEffect } from "react";
import type { CaseEvaluationSubmission, CVSSv31Metrics, TestCaseDossier } from "../types";
import {
  loginAdminWithPassword,
  checkAdminToken,
  logoutAdmin,
  getAdminSubmissions,
  getAdminDatabaseStatus,
  deleteAdminSubmission,
  deleteAdminReviewerAll,
  exportToCsv,
  exportToLatex
} from "../lib/storage";
import {
  Shield,
  Download,
  Copy,
  Check,
  CheckCircle2,
  FileText,
  X,
  Trash2,
  Plus,
  Eye,
  LogOut,
  AlertTriangle,
  ArrowLeft,
  RefreshCw
} from "lucide-react";

interface AdminViewProps {
  cases: TestCaseDossier[];
  onClose: () => void;
}

export const AdminView: React.FC<AdminViewProps> = ({ cases, onClose }) => {
  const [password, setPassword] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [authError, setAuthError] = useState("");
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);

  const [submissions, setSubmissions] = useState<CaseEvaluationSubmission[]>([]);
  const [isCloud, setIsCloud] = useState(false);
  const [dbProvider, setDbProvider] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string>("");
  const [copiedLatex, setCopiedLatex] = useState(false);

  // Active view tab
  const [activeTab, setActiveTab] = useState<"compare" | "all">("compare");

  // Multi-reviewer comparison selection (at least 3 evaluators)
  const [selectedReviewers, setSelectedReviewers] = useState<string[]>(["", "", ""]);

  // Detailed modal for in-depth comparison of a specific case
  const [inspectCaseId, setInspectCaseId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [subRes, statRes] = await Promise.all([
        getAdminSubmissions(),
        getAdminDatabaseStatus()
      ]);

      if (subRes.error) {
        setLoadError(subRes.error);
        // Pertahankan data yang sebelumnya berhasil dimuat, jangan hapus state
      } else {
        setSubmissions(subRes.data);
        setIsCloud(subRes.fromCloud);
        if (subRes.provider) {
          setDbProvider(subRes.provider);
        }
      }

      if (statRes?.activeProvider) {
        setDbProvider(prev => subRes.provider || statRes.activeProvider || prev || "Cloudflare D1");
      }

      // Populate comparison slots strictly from actual submissions (pertahankan jika ada error)
      setSubmissions(currentSubmissions => {
        const activeData = subRes.error ? currentSubmissions : subRes.data;
        const unique = Array.from(new Set(activeData.map(s => s.reviewerName)));
        setSelectedReviewers(prev => {
          const updated = [...prev];
          while (updated.length < 3) {
            updated.push("");
          }
          for (let i = 0; i < 3; i++) {
            if (!updated[i] && unique[i] && !updated.includes(unique[i])) {
              updated[i] = unique[i];
            }
          }
          return updated;
        });
        return subRes.error ? currentSubmissions : subRes.data;
      });
    } catch (e: any) {
      console.warn("Error loading admin data:", e);
      setLoadError(e?.message || "Gagal memuat data dari database Cloudflare D1.");
    } finally {
      setLoading(false);
    }
  };

  // Check existing admin session on mount
  useEffect(() => {
    let mounted = true;
    checkAdminToken().then(hasSession => {
      if (mounted && hasSession) {
        setIsUnlocked(true);
        loadData();
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setAuthError("Masukkan password admin.");
      return;
    }

    setIsSubmittingAuth(true);
    setAuthError("");

    const res = await loginAdminWithPassword(password);
    setIsSubmittingAuth(false);

    if (res.success) {
      setIsUnlocked(true);
      loadData();
    } else {
      setAuthError(res.error || "Gagal masuk ke dashboard admin.");
    }
  };

  const handleLogout = async () => {
    await logoutAdmin();
    setIsUnlocked(false);
    setPassword("");
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
    link.setAttribute("download", "Rekap_CVSS_Skripsi_4Kasus.csv");
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
    if (window.confirm(`Hapus penilaian kasus ${caseId} dari "${reviewerName}"?`)) {
      const res = await deleteAdminSubmission(id);
      if (res.success) {
        await loadData();
      } else {
        alert(res.error || "Gagal menghapus penilaian dari server database.");
      }
    }
  };

  const handleDeleteReviewer = async (reviewerName: string) => {
    if (!reviewerName) return;
    if (
      window.confirm(
        `Hapus seluruh evaluasi dari evaluator "${reviewerName}"? Tindakan ini tidak dapat dibatalkan.`
      )
    ) {
      const res = await deleteAdminReviewerAll(reviewerName);
      if (res.success) {
        setSelectedReviewers(prev => prev.map(r => (r === reviewerName ? "" : r)));
        await loadData();
      } else {
        alert(res.error || "Gagal menghapus data evaluator dari server database.");
      }
    }
  };

  const uniqueReviewers = Array.from(new Set(submissions.map(s => s.reviewerName)));
  const activeReviewers = selectedReviewers.filter(Boolean);
  const inspectedCase = cases.find(c => c.caseId === inspectCaseId);
  const metricKeys: (keyof CVSSv31Metrics)[] = ["AV", "AC", "PR", "UI", "S", "C", "I", "A"];

  // Helper comparison calculations
  const calculateCaseComparison = (caseId: string) => {
    const caseSubs = submissions.filter(
      s => s.caseId === caseId && activeReviewers.includes(s.reviewerName)
    );

    const scores = caseSubs.map(s => s.baseScore);
    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;

    const minScore = scores.length > 0 ? Math.min(...scores) : null;
    const maxScore = scores.length > 0 ? Math.max(...scores) : null;
    const delta = minScore !== null && maxScore !== null ? maxScore - minScore : 0;

    const vectorStrings = caseSubs.map(s => s.vectorString);
    const isIdenticalVector =
      vectorStrings.length >= 2 && vectorStrings.every(v => v === vectorStrings[0]);

    return {
      submissions: caseSubs,
      avgScore,
      delta,
      isIdenticalVector,
      isComplete: caseSubs.length === activeReviewers.length && activeReviewers.length >= 2
    };
  };

  // Locked View: Dedicated Login Page
  if (!isUnlocked) {
    return (
      <div className="admin-page-container">
        <header className="admin-page-navbar">
          <div className="admin-nav-left">
            <button
              type="button"
              className="btn-back-to-form"
              onClick={onClose}
              title="Kembali ke Form Evaluasi"
            >
              <ArrowLeft size={16} />
              <span>Kembali ke Form Evaluasi</span>
            </button>
            <div className="admin-header-title-box">
              <h1 className="admin-page-title">Rekapitulasi Penilaian CVSS v3.1</h1>
              <span className="admin-page-subtitle">Akses Khusus Peneliti</span>
            </div>
          </div>
        </header>

        <div className="admin-auth-wrapper">
          <div className="admin-auth-card">
            <div className="auth-icon-badge">
              <Shield size={28} className="text-accent" />
            </div>
            <div className="auth-header">
              <h2 className="auth-title">Akses Peneliti</h2>
              <p className="auth-desc">
                Masukkan password admin untuk membuka rekapitulasi penilaian, perbandingan evaluator, dan ekspor data skripsi.
              </p>
            </div>

            <form onSubmit={handleLogin} className="auth-form">
              {authError && <div className="error-alert">{authError}</div>}

              <div className="form-group">
                <label className="form-label">Password Admin</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Masukkan password admin"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="auth-actions">
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isSubmittingAuth || !password.trim()}
                >
                  {isSubmittingAuth ? "Memverifikasi..." : "Masuk Dashboard"}
                </button>
                <button type="button" className="btn-secondary" onClick={onClose}>
                  Kembali
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Unlocked View: Standalone Page
  return (
    <div className="admin-page-container">
      {/* Admin Top Header Navigation */}
      <header className="admin-page-navbar">
        <div className="admin-nav-left">
          <button
            type="button"
            className="btn-back-to-form"
            onClick={onClose}
            title="Kembali ke Form Evaluasi"
          >
            <ArrowLeft size={16} />
            <span>Kembali ke Form Evaluasi</span>
          </button>

          <div className="admin-header-title-box">
            <h1 className="admin-page-title">Rekapitulasi Penilaian CVSS v3.1</h1>
            <span className="admin-page-subtitle">
              Instrumen Evaluasi Evaluator untuk Pembahasan Bab 4 Skripsi (4 Kelompok Kerentanan)
            </span>
          </div>
        </div>

        <div className="admin-header-actions">
          {/* Database provider badge */}
          {dbProvider ? (
            <span
              className={isCloud ? "badge-cloud-online" : "badge-local-storage"}
              title={`Sumber data aktif: ${dbProvider}`}
            >
              {dbProvider}
            </span>
          ) : isCloud ? (
            <span className="badge-cloud-online">Cloudflare D1</span>
          ) : (
            <span className="badge-local-storage">Penyimpanan Lokal</span>
          )}

          <button
            type="button"
            className="btn-admin-refresh"
            onClick={loadData}
            disabled={loading}
            title="Muat ulang data dari database server"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            <span>Muat Ulang</span>
          </button>

          <button
            type="button"
            className="btn-admin-logout"
            onClick={handleLogout}
            title="Kunci Dashboard Admin"
          >
            <LogOut size={14} />
            <span>Kunci Sesi</span>
          </button>
        </div>
      </header>

      {/* Error notification banner if any */}
      {loadError && (
        <div className="admin-error-banner">
          <AlertTriangle size={18} className="text-red shrink-0" />
          <div className="flex-1 text-sm font-medium">
            <strong>Gagal Membaca Cloudflare D1:</strong> {loadError}
          </div>
          <button type="button" onClick={loadData} className="btn-retry-admin" disabled={loading}>
            Coba Lagi
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="admin-nav-tabs">
        <button
          type="button"
          className={activeTab === "compare" ? "active" : ""}
          onClick={() => setActiveTab("compare")}
        >
          <CheckCircle2 size={15} />
          <span>Perbandingan Evaluator</span>
        </button>
        <button
          type="button"
          className={activeTab === "all" ? "active" : ""}
          onClick={() => setActiveTab("all")}
        >
          <FileText size={15} />
          <span>Semua Data ({submissions.length})</span>
        </button>
      </div>

      {/* Tab 1: Comparison View */}
      {activeTab === "compare" && (
        <div className="admin-content-area">
          <div className="comparison-tab-container">
            {/* Evaluator Selector Panel */}
            <div className="comparison-controls-card">
              <div className="evaluator-slots-header">
                <span className="slots-title">Pilih Evaluator yang Dikomparasikan:</span>
                <div className="export-buttons-group">
                  <button type="button" className="btn-export-csv" onClick={handleDownloadCsv}>
                    <Download size={14} />
                    <span>Ekspor CSV</span>
                  </button>
                  <button type="button" className="btn-export-latex" onClick={handleCopyLatex}>
                    {copiedLatex ? <Check size={14} className="text-teal" /> : <Copy size={14} />}
                    <span>{copiedLatex ? "LaTeX Tersalin!" : "Salin Tabel LaTeX"}</span>
                  </button>
                </div>
              </div>

              <div className="evaluator-slots-grid">
                {selectedReviewers.map((revName, slotIdx) => (
                  <div key={slotIdx} className="picker-item-slot">
                    <div className="picker-header-row">
                      <span className="picker-label">Evaluator {slotIdx + 1}</span>
                      {slotIdx >= 3 && (
                        <button
                          type="button"
                          className="btn-remove-slot-mini"
                          onClick={() => handleRemoveReviewerSlot(slotIdx)}
                          title="Hapus slot penilai"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                    <select
                      className="picker-select"
                      value={revName}
                      onChange={e => handleReviewerSlotChange(slotIdx, e.target.value)}
                    >
                      <option value="">-- Pilih Evaluator --</option>
                      {uniqueReviewers.map(name => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                    {revName && (
                      <div className="picker-slot-actions">
                        <button
                          type="button"
                          className="btn-delete-reviewer-mini"
                          onClick={() => handleDeleteReviewer(revName)}
                          title={`Hapus seluruh submission dari ${revName}`}
                        >
                          <Trash2 size={11} />
                          <span>Hapus Data</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  className="btn-add-evaluator-slot"
                  onClick={handleAddReviewerSlot}
                  title="Tambah slot penilai lain jika diperlukan"
                >
                  <Plus size={14} />
                  <span>Tambah Evaluator</span>
                </button>
              </div>
            </div>

            {/* Comparison Table */}
            {loading && submissions.length === 0 ? (
              <div className="admin-loading-state">
                <RefreshCw size={24} className="animate-spin text-accent" />
                <span className="admin-loading-text">Memuat perbandingan evaluator dari Cloudflare D1...</span>
              </div>
            ) : (
              <div className="comparison-table-wrapper">
                <table className="comparison-table">
                <thead>
                  <tr>
                    <th style={{ width: "16%" }}>Kasus &amp; Aplikasi</th>
                    <th style={{ width: "24%" }}>Kerentanan</th>
                    {activeReviewers.map((name, i) => (
                      <th key={name} style={{ width: `${40 / Math.max(1, activeReviewers.length)}%` }}>
                        <div className="evaluator-col-header">
                          <span className="evaluator-col-name">{name}</span>
                          <span className="evaluator-col-role">
                            {submissions.find(s => s.reviewerName === name)?.reviewerRole ||
                              `Evaluator ${i + 1}`}
                          </span>
                        </div>
                      </th>
                    ))}
                    <th style={{ width: "10%" }}>Rata-rata</th>
                    <th style={{ width: "10%" }}>Status Vektor</th>
                  </tr>
                </thead>
                <tbody>
                  {cases.map(tc => {
                    const comp = calculateCaseComparison(tc.caseId);

                    return (
                      <tr key={tc.caseId}>
                        <td>
                          <div className="case-id-text">{tc.caseId}</div>
                          <div className="app-name-sm">{tc.targetAppNameSanitized}</div>
                        </td>
                        <td>
                          <div className="finding-title-sm">{tc.findingTitle}</div>
                          <div className="control-reference">{tc.controlId}</div>
                        </td>

                        {activeReviewers.map(name => {
                          const sub = comp.submissions.find(s => s.reviewerName === name);
                          if (!sub) {
                            return (
                              <td key={name} className="reviewer-score-cell">
                                <span className="text-muted italic text-xs">Belum dinilai</span>
                              </td>
                            );
                          }

                          return (
                            <td key={name} className="reviewer-score-cell">
                              <div className="score-sev-row">
                                <span className="score-cell-badge">{sub.baseScore.toFixed(1)}</span>
                                <span className={`badge-severity-${sub.severity.toLowerCase()} text-xs font-semibold`}>
                                  {sub.severity}
                                </span>
                              </div>
                              <div className="vector-mini">{sub.vectorString}</div>
                              {sub.justification && (
                                <div className="justification-excerpt" title={sub.justification}>
                                  &ldquo;{sub.justification.slice(0, 75)}
                                  {sub.justification.length > 75 ? "..." : ""}&rdquo;
                                </div>
                              )}
                            </td>
                          );
                        })}

                        <td>
                          {comp.avgScore !== null ? (
                            <div>
                              <span className="font-mono font-bold">{comp.avgScore.toFixed(1)}</span>
                              {comp.delta > 0 && (
                                <div className="diff-metrics-text">&plusmn;{comp.delta.toFixed(1)} pts</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted text-xs">-</span>
                          )}
                        </td>

                        <td>
                          {comp.isComplete ? (
                            comp.isIdenticalVector ? (
                              <span
                                className="status-badge consensus"
                                title="Seluruh evaluator memilih 8 metrik yang sama persis"
                              >
                                Vektor identik
                              </span>
                            ) : (
                              <div className="status-discrepancy-block">
                                <span
                                  className="status-badge discrepancy"
                                  title="Terdapat perbedaan pilihan metrik antar-evaluator"
                                >
                                  Vektor berbeda
                                </span>
                                <button
                                  type="button"
                                  className="btn-inspect-detail mt-2"
                                  onClick={() => setInspectCaseId(tc.caseId)}
                                  title="Lihat detail perbedaan metrik dan alasan evaluator"
                                >
                                  <Eye size={12} />
                                  <span>Bandingkan</span>
                                </button>
                              </div>
                            )
                          ) : (
                            <span className="status-badge pending">Menunggu</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          </div>
        </div>
      )}

      {/* Tab 2: Raw All Submissions Table */}
      {activeTab === "all" && (
        <div className="admin-content-area all-submissions-tab">
          <div className="submissions-summary-table-box">
            <div className="table-header-title">
              <h3>Daftar Seluruh Penilaian Masuk ({submissions.length} Record)</h3>
              <button type="button" className="btn-export-csv" onClick={handleDownloadCsv}>
                <Download size={14} />
                <span>Unduh CSV</span>
              </button>
            </div>

            <div className="table-responsive">
              <table className="raw-data-table">
                <thead>
                  <tr>
                    <th>Kasus</th>
                    <th>Evaluator</th>
                    <th>Instansi</th>
                    <th>Skor</th>
                    <th>Keparahan</th>
                    <th>Vector String</th>
                    <th>Alasan Penilaian</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-muted">
                        {loading ? (
                          <div className="admin-loading-state">
                            <RefreshCw size={24} className="animate-spin text-accent" />
                            <span className="admin-loading-text">Memuat seluruh data penilaian dari Cloudflare D1...</span>
                          </div>
                        ) : loadError ? (
                          <div className="text-red font-medium py-4">
                            Gagal membaca database: {loadError}
                          </div>
                        ) : (
                          "Belum ada penilaian yang tersimpan di Cloudflare D1."
                        )}
                      </td>
                    </tr>
                  ) : (
                    submissions.map(sub => (
                      <tr key={sub.id}>
                        <td>
                          <strong>{sub.caseId}</strong>
                        </td>
                        <td>{sub.reviewerName}</td>
                        <td className="text-xs text-muted">{sub.reviewerRole || "-"}</td>
                        <td>
                          <span className="score-badge-sm">{sub.baseScore.toFixed(1)}</span>
                        </td>
                        <td>
                          <span className={`badge-severity-${sub.severity.toLowerCase()} text-xs font-semibold`}>
                            {sub.severity}
                          </span>
                        </td>
                        <td>
                          <code className="vector-snippet">{sub.vectorString}</code>
                        </td>
                        <td className="justification-col">
                          <span className="justification-text">{sub.justification}</span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn-delete-record-btn"
                            onClick={() =>
                              handleDeleteSubmission(sub.id, sub.reviewerName, sub.caseId)
                            }
                            title="Hapus penilaian ini"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* In-Depth Case Discrepancy Inspection Modal */}
      {inspectCaseId && inspectedCase && (
        <div className="modal-overlay" onClick={() => setInspectCaseId(null)}>
          <div
            className="modal-dialog modal-dialog-lg"
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="modal-title-row">
                <AlertTriangle size={18} className="text-amber" />
                <h3 className="modal-title">
                  Detail Komparasi Metrik: {inspectCaseId} - {inspectedCase.findingTitle}
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
                <div>
                  <strong>Aplikasi:</strong> {inspectedCase.targetAppNameSanitized}
                </div>
                <div>
                  <strong>Kontrol OWASP MASVS:</strong> {inspectedCase.controlId} (
                  {inspectedCase.masvsCategory})
                </div>
              </div>

              <h4 className="detail-section-title">Perbandingan Pilihan 8 Metrik CVSS v3.1:</h4>
              <table className="detail-metrics-table">
                <thead>
                  <tr>
                    <th>Metrik</th>
                    {activeReviewers.map(rName => (
                      <th key={rName}>{rName}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {metricKeys.map(k => {
                    const values = activeReviewers.map(
                      rName =>
                        submissions.find(s => s.caseId === inspectCaseId && s.reviewerName === rName)
                          ?.metrics[k] || "-"
                    );
                    const isDiscrepant =
                      values.filter(v => v !== "-").length > 1 &&
                      !values.every(v => v === values[0]);

                    return (
                      <tr
                        key={k}
                        className={isDiscrepant ? "metric-row-discrepancy" : "metric-row-same"}
                      >
                        <td>
                          <strong>{k}</strong>
                        </td>
                        {values.map((v, idx) => (
                          <td key={idx}>
                            <span className="font-mono font-bold">{v}</span>
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <h4 className="detail-section-title mt-4">Alasan Penilaian Evaluator:</h4>
              <div className="justifications-side-grid">
                {activeReviewers.map(rName => {
                  const sub = submissions.find(
                    s => s.caseId === inspectCaseId && s.reviewerName === rName
                  );
                  return (
                    <div key={rName} className="justification-expert-card">
                      <div className="justification-card-header">
                        <span className="justification-author">{rName}</span>
                        <span className="justification-score-badge">
                          {sub ? `${sub.baseScore.toFixed(1)} (${sub.severity})` : "Belum dinilai"}
                        </span>
                      </div>
                      <p className="justification-card-text">
                        {sub?.justification || "(Tidak ada justifikasi)"}
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
                Tutup Komparasi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
