import React, { useState } from "react";
import type { ReviewerProfile } from "../types";
import { AlertCircle, ArrowRight, BookOpen } from "lucide-react";

interface LoginReviewerProps {
  onStart: (profile: ReviewerProfile) => void;
  onOpenGuide: () => void;
}

export const LoginReviewer: React.FC<LoginReviewerProps> = ({ onStart, onOpenGuide }) => {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Silakan masukkan nama lengkap Anda terlebih dahulu.");
      return;
    }

    onStart({
      name: name.trim(),
      roleOrAffiliation: role.trim() || "Penilai Independen",
      startedAt: new Date().toISOString()
    });
  };

  return (
    <div className="login-view-container">
      <div className="login-card">
        <div className="login-header">
          <h2 className="login-title">Form Penilaian CVSS v3.1</h2>
          <p className="login-desc">
            Penilaian tingkat keparahan empat temuan keamanan aplikasi menggunakan CVSS v3.1.
          </p>
        </div>

        <div className="info-banner-box">
          <div className="banner-title-row">
            <span className="banner-title">Sebelum mulai</span>
          </div>
          <ul className="banner-list">
            <li>
              Terdapat <strong>empat kelompok kerentanan</strong> (tiga pada Aplikasi Mahasiswa dan satu pada Aplikasi Orang Tua).
            </li>
            <li>
              Setiap kasus dilengkapi deskripsi temuan, langkah pengujian, hasil pengamatan, serta tangkapan layar pendukung.
            </li>
            <li>
              Klik tombol <strong>Penjelasan</strong> pada setiap baris metrik untuk membaca definisi resmi FIRST dan konteks pengujian mobile.
            </li>
          </ul>

          <div className="banner-action-row">
            <button
              type="button"
              className="btn-read-guide"
              onClick={onOpenGuide}
            >
              <BookOpen size={14} />
              <span>Panduan CVSS v3.1</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="error-alert">
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="reviewer-name" className="form-label">
              Nama lengkap <span className="required-star">*</span>
            </label>
            <input
              id="reviewer-name"
              type="text"
              className="form-input"
              placeholder="Contoh: Budi Santoso"
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
              Instansi atau bidang keahlian
            </label>
            <input
              id="reviewer-role"
              type="text"
              className="form-input"
              placeholder="Contoh: Praktisi Keamanan Siber / Mahasiswa"
              value={role}
              onChange={e => setRole(e.target.value)}
            />
          </div>

          <button type="submit" className="login-submit-btn">
            <span>Mulai penilaian</span>
            <ArrowRight size={16} />
          </button>
        </form>

        <div className="login-footer-notes">
          <span>
            Data penilaian ini digunakan semata-mata untuk analisis penelitian skripsi.
          </span>
        </div>
      </div>
    </div>
  );
};
