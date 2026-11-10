import React, { useState, useEffect } from "react";
import type { CaseEvaluationSubmission, TestCaseDossier, CVSSv31Metrics } from "../types";
import {
  getAllSubmissions,
  deleteSubmission,
  deleteReviewerAll,
  exportToCsv,
  exportToLatex,
  loginAdmin,
  checkAdminSession,
  logoutAdmin
} from "../lib/storage";
import {
  Lock,
  Download,
  Copy,
  Check,
  RefreshCw,
  Users,
  CheckCircle2,
  FileText,
  X,
  Trash2,
  Plus,
  Eye,
  LogOut,
  AlertTriangle
} from "lucide-react";

interface AdminViewProps {
  cases: TestCaseDossier[];
  onClose: () => void;
}

export const AdminView: React.FC<AdminViewProps> = ({ cases, onClose }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [authError, setAuthError] = useState("");
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);

  const [submissions, setSubmissions] = useState<CaseEvaluationSubmission[]>([]);
  const [isCloud, setIsCloud] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copiedLatex, setCopiedLatex] = useState(false);

  // Active view tab
  const [activeTab, setActiveTab] = useState<"compare" | "all">("compare");

  // Multi-reviewer comparison selection (at least 3 evaluators)
  const [selectedReviewers, setSelectedReviewers] = useState<string[]>(["", "", ""]);

  // Detailed modal for in-depth comparison of a specific case
  const [inspectCaseId, setInspectCaseId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    const res = await getAllSubmissions();
    setSubmissions(res.data);
    setIsCloud(res.fromCloud);

    // Populate comparison slots strictly from actual submissions
    const unique = Array.from(new Set(res.data.map(s => s.reviewerName)));
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

    setLoading(false);
  };

  // Check existing admin session on mount
  useEffect(() => {
    let mounted = true;
    checkAdminSession().then(hasSession => {
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
    if (!email.trim() || !password) {
      setAuthError("Masukkan email dan kata sandi admin.");
      return;
    }

    setIsSubmittingAuth(true);
    setAuthError("");

    const res = await loginAdmin(email, password);
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
    setEmail("");
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
    link.setAttribute("download", `Rekap_CVSS_Skripsi_4Kasus.csv`);
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
      await deleteSubmission(id);
      await loadData();
    }
  };

  const handleDeleteReviewer = async (reviewerName: string) => {
    if (!reviewerName) return;
    if (
      window.confirm(
        `Hapus seluruh evaluasi dari evaluator "${reviewerName}"? Tindakan ini tidak dapat dibatalkan.`
      )
    ) {
      await deleteReviewerAll(reviewerName);
      setSelectedReviewers(prev => prev.map(r => (r === reviewerName ? "" : r)));
      await loadData();
    }
  };

  const uniqueReviewers = Array.from(new Set(submissions.map(s => s.reviewerName)));
  const activeReviewers = selectedReviewers.filter(Boolean);
  const inspectedCase = cases.find(c => c.caseId === inspectCaseId);
  const metricKeys: (keyof CVSSv31Metrics)[] = ["AV", "AC", "PR", "UI", "S", "C", "I", "A"];

  // Locked: Render Admin Login Modal
  if (!isUnlocked) {
    return (
      <div className="admin-overlay" onClick={onClose}>
        <div className="admin-auth-card" onClick={e => e.stopPropagation()}>
          <div className="auth-header">
            <h3 className="auth-title">Akses Peneliti</h3>
            <p className="auth-desc">
              Masukkan kredensial akun peneliti untuk membuka rekapitulasi penilaian dan ekspor data skripsi.
            </p>
          </div>

          <form onSubmit={handleLogin} className="auth-form">
            {authError && <div className="error-alert">{authError}</div>}

            <div className="form-group">
              <label className="form-label">Email Peneliti</label>
              <input
                type="email"
                className="form-input"
                placeholder="nama@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label">Kata Sandi</label>
              <input
                type="password"
                className="form-input"
                placeholder="Masukkan kata sandi"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            <div className="auth-actions">
              <button type="button" className="btn-secondary" onClick={onClose}>
                Batal
              </button>
              <button type="submit" className="btn-primary" disabled={isSubmittingAuth}>
                <Lock size={15} />
                <span>{isSubmittingAuth ? "Memeriksa..." : "Masuk"}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-fullscreen-modal">
      <div className="admin-header-bar">
        <div className="admin-title-group">
          <div>
            <h2 className="admin-heading">Rekapitulasi Penilaian CVSS v3.1</h2>
            <span className="admin-subheading">
              Sumber data:{" "}
              {isCloud ? (
                <span className="badge-cloud-online">Server Supabase aktif</span>
              ) : (
                <span className="badge-local-storage">Penyimpanan perangkat</span>
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
            <Users size={15} />
            <span>Komparasi Evaluator</span>
          </button>
          <button
            type="button"
            className={`admin-tab-btn ${activeTab === "all" ? "active" : ""}`}
            onClick={() => setActiveTab("all")}
          >
            <FileText size={15} />
            <span>Semua Data ({submissions.length})</span>
          </button>
        </div>

        <div className="admin-header-actions">
          <button
            type="button"
            className="icon-refresh-btn"
            onClick={loadData}
            title="Muat ulang data"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            type="button"
            className="btn-admin-logout"
            onClick={handleLogout}
            title="Keluar dari akun admin"
          >
            <LogOut size={15} />
            <span>Keluar</span>
          </button>
          <button
            type="button"
            className="btn-close-admin"
            onClick={onClose}
            title="Tutup dashboard"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="admin-content-area">
        {/* Quick Stats Bar */}
        <div className="stats-row">
          <div className="stat-card">
            <span className="stat-label">Total evaluator</span>
            <span className="stat-value">{uniqueReviewers.length}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Total penilaian masuk</span>
            <span className="stat-value">{submissions.length}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Kasus dinilai</span>
            <span className="stat-value">
              {cases.filter(c => submissions.some(s => s.caseId === c.caseId)).length} dari {cases.length}
            </span>
          </div>

          <div className="export-buttons-group">
            <button type="button" className="btn-export-csv" onClick={handleDownloadCsv}>
              <Download size={14} /> Unduh CSV
            </button>
            <button type="button" className="btn-export-latex" onClick={handleCopyLatex}>
              {copiedLatex ? <Check size={14} className="text-emerald" /> : <Copy size={14} />}
              <span>{copiedLatex ? "LaTeX tersalin" : "Salin tabel LaTeX"}</span>
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
                  Pilih evaluator untuk dibandingkan:
                </span>
                <button
                  type="button"
                  className="btn-add-evaluator-slot"
                  onClick={handleAddReviewerSlot}
                  title="Tambah kolom evaluator"
                >
                  <Plus size={14} /> Tambah kolom
                </button>
              </div>

              <div className="evaluator-slots-grid">
                {selectedReviewers.map((revName, idx) => (
                  <div key={idx} className="picker-item-slot">
                    <div className="picker-header-row">
                      <label className="picker-label">Evaluator {idx + 1}:</label>
                      <div className="picker-slot-actions">
                        {revName && (
                          <button
                            type="button"
                            className="btn-delete-reviewer-mini"
                            onClick={() => handleDeleteReviewer(revName)}
                            title={`Hapus seluruh evaluasi dari ${revName}`}
                          >
                            <Trash2 size={12} /> Hapus
                          </button>
                        )}
                        {selectedReviewers.length > 3 && (
                          <button
                            type="button"
                            className="btn-remove-slot-mini"
                            onClick={() => handleRemoveReviewerSlot(idx)}
                            title="Tutup slot ini"
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
                      <option value="">-- Pilih evaluator --</option>
                      {uniqueReviewers.map(r => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* Comparison Matrix Table */}
            <div className="comparison-table-wrapper">
              <table className="comparison-table">
                <thead>
                  <tr>
                    <th style={{ minWidth: "220px" }}>Kasus</th>
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
                    <th style={{ minWidth: "150px" }}>Kesesuaian vektor</th>
                    <th style={{ minWidth: "100px" }} className="text-center">Aksi</th>
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
                                    &ldquo;{sub.justification || "Tidak ada alasan"}&rdquo;
                                  </p>
                                </div>
                              ) : (
                                <span className="text-muted italic text-xs">Belum mengisi</span>
                              )}
                            </td>
                          );
                        })}

                        <td>
                          {status === "CONSENSUS" && (
                            <span className="status-badge consensus">
                              <CheckCircle2 size={12} /> Vektor identik
                            </span>
                          )}
                          {status === "DISCREPANCY" && (
                            <div className="status-discrepancy-block">
                              <span className="status-badge discrepancy">
                                <AlertTriangle size={12} /> Vektor berbeda
                              </span>
                              {diffMetrics.length > 0 && (
                                <span className="diff-metrics-text">
                                  Beda: {diffMetrics.join(", ")}
                                </span>
                              )}
                            </div>
                          )}
                          {status === "PENDING" && (
                            <span className="status-badge pending">
                              Menunggu ({filledCount}/{activeReviewers.length})
                            </span>
                          )}
                        </td>

                        <td className="text-center">
                          <button
                            type="button"
                            className="btn-inspect-detail"
                            onClick={() => setInspectCaseId(c.caseId)}
                            title="Buka detail komparasi metrik dan alasan"
                          >
                            <Eye size={13} /> Detail
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
                    <th>Waktu</th>
                    <th>Nama</th>
                    <th>Instansi / Keahlian</th>
                    <th>Kasus</th>
                    <th>Skor</th>
                    <th>Keparahan</th>
                    <th>Vector string</th>
                    <th>Alasan penilaian</th>
                    <th className="text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-8 text-muted">
                        Belum ada data penilaian yang masuk.
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
                            title={`Hapus penilaian ${s.caseId}`}
                          >
                            <Trash2 size={14} />
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
      </div>

      {/* DETAILED SIDE-BY-SIDE MODAL FOR SELECTED CASE */}
      {inspectedCase && (
        <div className="modal-overlay" onClick={() => setInspectCaseId(null)}>
          <div
            className="modal-dialog modal-dialog-lg"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: "850px" }}
          >
            <div className="modal-header">
              <h3 className="modal-title">
                Perbandingan {inspectedCase.caseId} &bull; {inspectedCase.targetAppNameSanitized}
              </h3>
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
                  Ref: {inspectedCase.controlId} &bull; {inspectedCase.masvsCategory}
                </span>
              </div>

              {/* Side-by-Side 8 Metrics Comparison Table */}
              <h4 className="detail-section-title">Perbandingan nilai 8 metrik CVSS:</h4>
              <div className="table-responsive">
                <table className="detail-metrics-table">
                  <thead>
                    <tr>
                      <th>Metrik</th>
                      {activeReviewers.map(rName => (
                        <th key={rName}>{rName}</th>
                      ))}
                      <th>Status</th>
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
                              <span className="text-amber font-semibold text-xs">
                                Berbeda
                              </span>
                            ) : nonDash.length >= 2 ? (
                              <span className="text-emerald font-semibold text-xs">
                                Sesuai
                              </span>
                            ) : (
                              <span className="text-muted text-xs">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Side-by-Side Evaluator Justifications */}
              <h4 className="detail-section-title mt-4">Alasan penilaian tertulis:</h4>
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
                            {sub.baseScore.toFixed(1)} ({sub.severity})
                          </span>
                        )}
                      </div>
                      <p className="justification-card-text">
                        {sub?.justification || (
                          <span className="text-muted italic">Tidak ada alasan yang dicatat</span>
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
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
