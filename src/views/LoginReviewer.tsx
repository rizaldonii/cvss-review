import React, { useState } from "react";
import type { ReviewerProfile } from "../types";
import { Shield, AlertCircle, ArrowRight, ShieldCheck, FileText, BookOpen, UserCheck } from "lucide-react";

interface LoginReviewerProps {
  onStart: (profile: ReviewerProfile) => void;
  onOpenGuide: () => void;
}

export const LoginReviewer: React.FC<LoginReviewerProps> = ({ onStart, onOpenGuide }) => {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [error, setError] = useState("");

  const evaluatorPresets = [
    { name: "Rizal", role: "Peneliti Skripsi" },
    { name: "Arya", role: "Evaluator Cybersecurity" },
    { name: "Pak Taufik", role: "Dosen Pembimbing" }
  ];

  const handleSelectPreset = (preset: { name: string; role: string }) => {
    setName(preset.name);
    setRole(preset.role);
    if (error) setError("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Silakan masukkan Nama Lengkap atau pilih evaluator terlebih dahulu.");
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
              <strong>Ruang Lingkup Kasus:</strong> Terdapat <strong>4 kelompok kerentanan</strong> (3 kelompok pada App-A dan 1 kelompok pada App-B; dengan kontrol logging beririsan).
            </li>
            <li>
              <strong>Kelengkapan Bukti:</strong> Setiap kasus dilengkapi deskripsi akar masalah, langkah reproduksi (PoC), cuplikan screenshot hasil pengujian, serta analisis dampak operasional.
            </li>
            <li>
              <strong>Panduan Teknis FIRST:</strong> Arahkan kursor (*hover*) pada setiap tombol metrik CVSS untuk membaca definisi resmi FIRST serta panduan kontekstual sistem operasi Android.
            </li>
          </ul>

          <div className="banner-action-row">
            <button
              type="button"
              className="btn-read-guide"
              onClick={onOpenGuide}
            >
              <BookOpen size={15} />
              <span>Buka Panduan Penilaian CVSS v3.1</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="error-alert">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Preset Selector for 3 Evaluators */}
          <div className="preset-selector-container">
            <span className="preset-label">
              <UserCheck size={14} className="inline-icon" /> Pilih Cepat Evaluator:
            </span>
            <div className="preset-buttons-row">
              {evaluatorPresets.map(preset => (
                <button
                  key={preset.name}
                  type="button"
                  className={`preset-btn ${name === preset.name ? "active" : ""}`}
                  onClick={() => handleSelectPreset(preset)}
                >
                  <span className="preset-name">{preset.name}</span>
                  <span className="preset-role">({preset.role})</span>
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="reviewer-name" className="form-label">
              Nama Lengkap &amp; Gelar Penilai <span className="required-star">*</span>
            </label>
            <input
              id="reviewer-name"
              type="text"
              className="form-input"
              placeholder="Contoh: Arya / Rizal / Pak Taufik"
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
            <span>Mulai Evaluasi Kasus (1 dari 4)</span>
            <ArrowRight size={18} />
          </button>
        </form>

        <div className="login-footer-notes">
          <FileText size={14} className="inline-icon" />
          <span>
            Data penilaian ini direkam untuk keperluan analisis tingkat keparahan risiko dan perumusan
            rekomendasi mitigasi kerentanan perangkat lunak pada penelitian skripsi.
          </span>
        </div>
      </div>
    </div>
  );
};
