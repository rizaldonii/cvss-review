import React, { useState, useEffect } from "react";
import type { CaseEvaluationSubmission, TestCaseDossier, SupabaseConfig } from "../types";
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
  Trash2
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

  // Multi-reviewer comparison selection
  const [reviewerA, setReviewerA] = useState<string>("");
  const [reviewerB, setReviewB] = useState<string>("");

  // Supabase settings state
  const [cloudConfig, setCloudConfig] = useState<SupabaseConfig>({
    supabaseUrl: "",
    supabaseAnonKey: ""
  });
  const [cloudTestStatus, setCloudTestStatus] = useState<string>("");

  useEffect(() => {
    setCloudConfig(getSupabaseConfig());
  }, []);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    // Default PIN: skripsi2026 or 1234
    if (pin.trim() === "skripsi2026" || pin.trim() === "1234") {
      setIsUnlocked(true);
      setPinError("");
      loadData();
    } else {
      setPinError("PIN salah. Gunakan PIN default: skripsi2026");
    }
  };

  const loadData = async () => {
    setLoading(true);
    const res = await getAllSubmissions();
    setSubmissions(res.data);
    setIsCloud(res.fromCloud);

    // Set default reviewers if available
    const uniqueReviewers = Array.from(new Set(res.data.map(s => s.reviewerName)));
    if (uniqueReviewers.length >= 1 && !reviewerA) {
      setReviewerA(uniqueReviewers[0]);
    }
    if (uniqueReviewers.length >= 2 && !reviewerB) {
      setReviewB(uniqueReviewers[1]);
    }

    setLoading(false);
  };

  const handleDownloadCsv = () => {
    const csv = exportToCsv(submissions);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Rekap_CVSS_Skripsi_${new Date().toISOString().slice(0, 10)}.csv`);
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
    if (window.confirm(`Yakin ingin MENGHAPUS SELURUH evaluasi dari penilai "${reviewerName}"? Tindakan ini akan menghapus semua responnya dari sistem.`)) {
      await deleteReviewerAll(reviewerName);
      if (reviewerA === reviewerName) setReviewerA("");
      if (reviewerB === reviewerName) setReviewB("");
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
              Masukkan PIN untuk membuka dashboard rekapitulasi nilai, komparasi pakar, dan ekspor
              Bab 4 Skripsi.
            </p>
          </div>

          <form onSubmit={handleUnlock} className="auth-form">
            {pinError && <div className="error-alert">{pinError}</div>}
            <div className="form-group">
              <label className="form-label">PIN Administrator</label>
              <input
                type="password"
                className="form-input text-center font-mono tracking-widest text-lg"
                placeholder="Masukkan PIN (Default: skripsi2026)"
                value={pin}
                onChange={e => setPin(e.target.value)}
                autoFocus
              />
              <span className="text-xs text-muted mt-1 block">
                Petunjuk: Masukkan PIN <code>skripsi2026</code>
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

  return (
    <div className="admin-fullscreen-modal">
      <div className="admin-header-bar">
        <div className="admin-title-group">
          <ShieldCheck size={22} className="text-accent" />
          <div>
            <h2 className="admin-heading">Dashboard Rekapitulasi &amp; Konsensus CVSS v3.1</h2>
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
            <Users size={16} /> Komparasi Pakar (Bab 4)
          </button>
          <button
            type="button"
            className={`admin-tab-btn ${activeTab === "all" ? "active" : ""}`}
            onClick={() => setActiveTab("all")}
          >
            <FileText size={16} /> Semua Data Respon ({submissions.length})
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
            <span className="stat-label">Total Evaluasi Kasus Masuk</span>
            <span className="stat-value">{submissions.length} Respon</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Kasus Selesai Dinilai</span>
            <span className="stat-value">
              {cases.filter(c => submissions.some(s => s.caseId === c.caseId)).length} / 6 Kasus
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

        {/* TAB 1: PEER-EXPERT COMPARISON (BLIND CROSS-CHECK) */}
        {activeTab === "compare" && (
          <div className="comparison-tab-container">
            <div className="comparison-controls-card">
              <div className="evaluator-picker-group">
                <div className="picker-item">
                  <div className="picker-header-row">
                    <label className="picker-label">Evaluator 1 (Misal: Peneliti Mandiri):</label>
                    {reviewerA && (
                      <button
                        type="button"
                        className="btn-delete-reviewer-mini"
                        onClick={() => handleDeleteReviewer(reviewerA)}
                        title={`Hapus seluruh evaluasi dari ${reviewerA}`}
                      >
                        <Trash2 size={12} /> Hapus Data {reviewerA}
                      </button>
                    )}
                  </div>
                  <select
                    className="picker-select"
                    value={reviewerA}
                    onChange={e => setReviewerA(e.target.value)}
                  >
                    <option value="">-- Pilih Penilai 1 --</option>
                    {uniqueReviewers.map(r => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="vs-badge">VS</div>

                <div className="picker-item">
                  <div className="picker-header-row">
                    <label className="picker-label">Evaluator 2 (Misal: Pakar Eksternal):</label>
                    {reviewerB && (
                      <button
                        type="button"
                        className="btn-delete-reviewer-mini"
                        onClick={() => handleDeleteReviewer(reviewerB)}
                        title={`Hapus seluruh evaluasi dari ${reviewerB}`}
                      >
                        <Trash2 size={12} /> Hapus Data {reviewerB}
                      </button>
                    )}
                  </div>
                  <select
                    className="picker-select"
                    value={reviewerB}
                    onChange={e => setReviewB(e.target.value)}
                  >
                    <option value="">-- Pilih Penilai 2 --</option>
                    {uniqueReviewers.map(r => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="comparison-table-wrapper">
              <table className="comparison-table">
                <thead>
                  <tr>
                    <th>Case ID</th>
                    <th>Target &amp; Kontrol</th>
                    <th>Penilai 1: {reviewerA || "-"}</th>
                    <th>Penilai 2: {reviewerB || "-"}</th>
                    <th>Status Konsensus</th>
                    <th>Perbedaan Metrik</th>
                  </tr>
                </thead>
                <tbody>
                  {cases.map(c => {
                    const subA = submissions.find(
                      s => s.caseId === c.caseId && s.reviewerName === reviewerA
                    );
                    const subB = submissions.find(
                      s => s.caseId === c.caseId && s.reviewerName === reviewerB
                    );

                    let status = "PENDING";
                    let diffs: string[] = [];

                    if (subA && subB) {
                      if (subA.vectorString === subB.vectorString) {
                        status = "CONSENSUS";
                      } else {
                        status = "DISCREPANCY";
                        // Find which metric keys differ
                        const keys: (keyof typeof subA.metrics)[] = [
                          "AV",
                          "AC",
                          "PR",
                          "UI",
                          "S",
                          "C",
                          "I",
                          "A"
                        ];
                        keys.forEach(k => {
                          if (subA.metrics[k] !== subB.metrics[k]) {
                            diffs.push(`${k}: ${subA.metrics[k]} ≠ ${subB.metrics[k]}`);
                          }
                        });
                      }
                    }

                    return (
                      <tr key={c.caseId}>
                        <td>
                          <strong className="case-id-text">{c.caseId}</strong>
                        </td>
                        <td>
                          <div className="table-target-col">
                            <span className="app-name-sm">{c.targetAppNameSanitized}</span>
                            <span className="control-name-sm">{c.controlId}</span>
                          </div>
                        </td>
                        <td>
                          {subA ? (
                            <div className="reviewer-score-cell">
                              <span className="score-badge-sm">{subA.baseScore.toFixed(1)}</span>
                              <span className={`sev-tag-sm sev-${subA.severity.toLowerCase()}`}>
                                {subA.severity}
                              </span>
                              <code className="vector-snippet">{subA.vectorString}</code>
                            </div>
                          ) : (
                            <span className="text-muted italic">Belum mengisi</span>
                          )}
                        </td>
                        <td>
                          {subB ? (
                            <div className="reviewer-score-cell">
                              <span className="score-badge-sm">{subB.baseScore.toFixed(1)}</span>
                              <span className={`sev-tag-sm sev-${subB.severity.toLowerCase()}`}>
                                {subB.severity}
                              </span>
                              <code className="vector-snippet">{subB.vectorString}</code>
                            </div>
                          ) : (
                            <span className="text-muted italic">Belum mengisi</span>
                          )}
                        </td>
                        <td>
                          {status === "CONSENSUS" && (
                            <span className="status-badge consensus">
                              <CheckCircle2 size={12} /> Konsensus Cocok
                            </span>
                          )}
                          {status === "DISCREPANCY" && (
                            <span className="status-badge discrepancy">
                              <AlertTriangle size={12} /> Beda Pendapat
                            </span>
                          )}
                          {status === "PENDING" && (
                            <span className="status-badge pending">Menunggu Respon</span>
                          )}
                        </td>
                        <td>
                          {diffs.length > 0 ? (
                            <div className="diff-tags-container">
                              {diffs.map((d, i) => (
                                <span key={i} className="diff-tag">
                                  {d}
                                </span>
                              ))}
                            </div>
                          ) : status === "CONSENSUS" ? (
                            <span className="text-emerald text-xs">Vektor 100% Identik</span>
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
                    <th>Justifikasi Catatan Pakar</th>
                    <th className="text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-8 text-muted">
                        Belum ada respon yang dikirimkan.
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
                    Jika Anda ingin hasil penilaian langsung tersinkronisasi ke PostgreSQL cloud gratis,
                    masukkan URL dan Anon Key dari proyek Supabase Anda di bawah ini:
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
                  <h4 className="sql-guide-title">SQL Query untuk Membuat Tabel di Supabase:</h4>
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
  justification TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT unique_case_reviewer UNIQUE(case_id, reviewer_name)
);`}</code>
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
