import React from "react";
import { BookOpen, X, Shield, ExternalLink, CheckCircle, Info, AlertTriangle } from "lucide-react";
import { CVSS_METRIC_DEFINITIONS } from "../data/cvssTooltips";

interface AssessmentGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AssessmentGuideModal: React.FC<AssessmentGuideModalProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  const metricKeys = ["AV", "AC", "PR", "UI", "S", "C", "I", "A"] as const;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog assessment-guide-dialog" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-row">
            <BookOpen size={20} className="text-accent" />
            <h3 className="modal-title">Panduan Standar Penilaian CVSS v3.1</h3>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} title="Tutup Panduan">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body assessment-guide-body">
          {/* Section 1: Tujuan Penilaian */}
          <section className="guide-section">
            <h4 className="guide-section-heading">
              <Shield size={16} className="text-accent inline-icon" /> 1. Tujuan Penilaian
            </h4>
            <p className="guide-text">
              Penilaian ini bertujuan untuk mengukur <strong>tingkat keparahan kerentanan (vulnerability severity)</strong> dari{" "}
              <strong>4 kelompok kerentanan</strong> yang ditemukan pada aplikasi seluler akademik{" "}
              (App-A Aplikasi Mahasiswa dan App-B Aplikasi Orang Tua) secara objektif, konsisten,
              dan terstandarisasi menggunakan kerangka kerja{" "}
              <strong>FIRST Common Vulnerability Scoring System (CVSS) v3.1 Base Metrics</strong>.
            </p>
          </section>

          {/* Section 2: Prinsip Berpijak pada Bukti & Konsekuensi Wajar */}
          <section className="guide-section">
            <h4 className="guide-section-heading">
              <CheckCircle size={16} className="text-emerald inline-icon" /> 2. Prinsip Penilaian Berdasarkan Bukti (Evidence-Based)
            </h4>
            <ul className="guide-bullet-list">
              <li>
                <strong>Pahami Fakta Teknis di Panel Kiri:</strong> Evaluasi langkah reproduksi (PoC), cuplikan keluaran teks/log, serta screenshot pengujian sebelum menentukan nilai metrik.
              </li>
              <li>
                <strong>Konsekuensi Wajar Sesuai FIRST:</strong> Penilaian tidak boleh mengarang dampak yang tidak berdasar, tetapi dapat mempertimbangkan konsekuensi eksploitasi yang wajar, didukung bukti teknis, dan sesuai dengan panduan resmi FIRST CVSS v3.1. Sesuai prinsip FIRST, tidak semua konsekuensi harus dibuktikan melalui eksploitasi aktual yang destruktif, asalkan konsekuensi tersebut merupakan dampak logis yang terbukti potensial.
              </li>
              <li>
                <strong>Penanganan Bukti Gabungan (CASE-02 &amp; CASE-04):</strong> Pada kasus kebocoran informasi melalui logging, bukti DAST (runtime logcat) dan SAST (residu string biner) disajikan bersama sebagai bukti pendukung untuk <strong>satu penilaian CVSS terintegrasi</strong>.
              </li>
            </ul>
          </section>

          {/* Section 3: 8 Metrik Dasar CVSS v3.1 */}
          <section className="guide-section">
            <h4 className="guide-section-heading">
              <Info size={16} className="text-accent inline-icon" /> 3. Delapan Metrik Dasar CVSS v3.1 (Spesifikasi FIRST)
            </h4>
            <div className="guide-metrics-grid">
              {metricKeys.map(key => {
                const def = CVSS_METRIC_DEFINITIONS[key];
                return (
                  <div key={key} className="guide-metric-card">
                    <div className="guide-metric-header">
                      <span className="guide-metric-badge">{key}</span>
                      <strong className="guide-metric-name">{def.name}</strong>
                    </div>
                    <p className="guide-metric-desc">{def.description}</p>
                    <div className="guide-metric-options">
                      {def.options.map(opt => (
                        <div key={opt.code} className="guide-opt-row">
                          <span className="guide-opt-code">{opt.badge}: {opt.label}</span>
                          <span className="guide-opt-ctx">{opt.guidanceText}</span>
                          <span className="guide-opt-mobile-note"><em>Konteks Mobile:</em> {opt.mobileEvaluationContext}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Section 4: Cara Memberikan Justifikasi */}
          <section className="guide-section">
            <h4 className="guide-section-heading">
              <AlertTriangle size={16} className="text-amber inline-icon" /> 4. Petunjuk Pengisian Alasan Penilaian (Wajib Diisi)
            </h4>
            <p className="guide-text">
              Setiap penilaian <strong>wajib menyertakan alasan teknis (justifikasi)</strong>. Jelaskan pertimbangan rasional di balik penentuan nilai metrik Anda secara objektif:
            </p>
            <ul className="guide-bullet-list">
              <li>
                <strong>Vektor &amp; Kompleksitas Serangan (AV &amp; AC):</strong> Apakah serangan dapat dipicu dari jarak jauh (Network) atau mensyaratkan akses lokal perangkat (Local), serta ada tidaknya kondisi di luar kendali penyerang.
              </li>
              <li>
                <strong>Hak Akses &amp; Interaksi Pengguna (PR &amp; UI):</strong> Apakah penyerang harus terotentikasi sebelum melancarkan serangan, dan apakah dibutuhkan tindakan aktif dari korban selain penyerang.
              </li>
              <li>
                <strong>Ruang Lingkup (Scope):</strong> Apakah dampak eksploitasi melanggar batas otoritas keamanan yang berbeda (Changed) atau tetap berada dalam otoritas komponen rentan (Unchanged).
              </li>
              <li>
                <strong>Tingkat Dampak (C, I, A):</strong> Tingkat keparahan pengungkapan data rahasia, potensi modifikasi data tanpa hak, serta gangguan ketersediaan layanan selama atau setelah eksploitasi.
              </li>
            </ul>
          </section>

          {/* Section 5: Referensi Resmi FIRST */}
          <section className="guide-section">
            <h4 className="guide-section-heading">
              <ExternalLink size={16} className="text-accent inline-icon" /> 5. Referensi Resmi FIRST CVSS v3.1
            </h4>
            <div className="guide-links-row">
              <a
                href="https://www.first.org/cvss/v3.1/specification-document"
                target="_blank"
                rel="noopener noreferrer"
                className="guide-ref-link"
              >
                <span>CVSS v3.1 Specification Document (FIRST.org)</span>
                <ExternalLink size={14} />
              </a>
              <a
                href="https://www.first.org/cvss/v3.1/user-guide"
                target="_blank"
                rel="noopener noreferrer"
                className="guide-ref-link"
              >
                <span>CVSS v3.1 User Guide (FIRST.org)</span>
                <ExternalLink size={14} />
              </a>
            </div>
          </section>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-primary" onClick={onClose}>
            <span>Saya Memahami Panduan</span>
          </button>
        </div>
      </div>
    </div>
  );
};
