import React, { useState } from "react";
import type { ReviewerProfile } from "../types";
import { Shield, AlertCircle, ArrowRight, ShieldCheck, FileText } from "lucide-react";

interface LoginReviewerProps {
  onStart: (profile: ReviewerProfile) => void;
}

export const LoginReviewer: React.FC<LoginReviewerProps> = ({ onStart }) => {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Silakan masukkan Nama Lengkap Anda terlebih dahulu.");
      return;
    }

    onStart({
      name: name.trim(),
      roleOrAffiliation: role.trim() || "Penilai Ahli (Peer-Expert)",
      startedAt: new Date().toISOString()
    });
  };

  return (
    <div className="login-view-container">
      <div className="login-card">
        <div className="login-badge-header">
          <div className="icon-badge">
            <Shield size={32} className="text-accent" />
          </div>
          <h2 className="login-main-title">Peer-Expert Review CVSS v3.1</h2>
          <p className="login-desc">
            Portal Penilaian Tingkat Risiko Kerentanan Aplikasi Seluler Berdasarkan Standar OWASP
            MASVS &amp; FIRST CVSS v3.1
          </p>
        </div>

        <div className="info-banner-box">
          <div className="banner-title-row">
            <ShieldCheck size={18} className="text-emerald" />
            <span className="banner-title">Petunjuk Pengisian &amp; Ruang Lingkup Evaluasi</span>
          </div>
          <ul className="banner-list">
            <li>
              <strong>Ruang Lingkup Kasus:</strong> Terdapat <strong>6 kasus uji keamanan</strong> (4 kasus pada App-A dan 2 kasus pada App-B; dengan 2 kontrol keamanan yang beririsan).
            </li>
            <li>
              <strong>Kelengkapan Bukti:</strong> Setiap kasus dilengkapi deskripsi akar masalah, langkah reproduksi (PoC), cuplikan screenshot hasil pengujian, serta analisis dampak operasional.
            </li>
            <li>
              <strong>Panduan Teknis FIRST:</strong> Arahkan kursor (*hover*) pada setiap tombol metrik CVSS untuk membaca penjelasan resmi FIRST serta panduan kontekstual sistem operasi Android.
            </li>
          </ul>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="error-alert">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="reviewer-name" className="form-label">
              Nama Lengkap &amp; Gelar Penilai <span className="required-star">*</span>
            </label>
            <input
              id="reviewer-name"
              type="text"
              className="form-input"
              placeholder="Contoh: Budi Santoso, S.Kom., M.Cs."
              value={name}
              onChange={e => {
                setName(e.target.value);
                if (error) setError("");
              }}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="reviewer-role" className="form-label">
              Asal Instansi / Bidang Keahlian (Opsional)
            </label>
            <input
              id="reviewer-role"
              type="text"
              className="form-input"
              placeholder="Contoh: Praktisi Keamanan Siber / Dosen / Mahasiswa"
              value={role}
              onChange={e => setRole(e.target.value)}
            />
          </div>

          <button type="submit" className="login-submit-btn">
            <span>Mulai Evaluasi Kasus (1 dari 6)</span>
            <ArrowRight size={18} />
          </button>
        </form>

        <div className="login-footer-notes">
          <FileText size={14} className="inline-icon" />
          <span>
            Data penilaian ini direkam untuk keperluan analisis tingkat keparahan risiko dan perumusan
            rekomendasi mitigasi kerentanan perangkat lunak.
          </span>
        </div>
      </div>
    </div>
  );
};
