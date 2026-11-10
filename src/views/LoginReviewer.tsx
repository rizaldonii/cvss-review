import React, { useState, useRef } from "react";
import type { ReviewerProfile } from "../types";
import {
  fetchAndSyncReviewerProgress,
  getLocalSubmissions
} from "../lib/storage";
import { AlertCircle, ArrowRight, BookOpen, CheckCircle2, RefreshCw } from "lucide-react";

interface LoginReviewerProps {
  onStart: (profile: ReviewerProfile) => void;
  onOpenGuide: () => void;
}

export const LoginReviewer: React.FC<LoginReviewerProps> = ({ onStart, onOpenGuide }) => {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [error, setError] = useState("");
  const [existingCaseIds, setExistingCaseIds] = useState<string[]>([]);
  const [isSearchingProgress, setIsSearchingProgress] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const timerRef = useRef<number | null>(null);

  const checkProgress = async (inputName: string) => {
    const trimmed = inputName.trim();
    if (trimmed.length < 2) {
      setExistingCaseIds([]);
      return;
    }

    // 1. Immediate local check
    const local = getLocalSubmissions().filter(
      s => s.reviewerName.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (local.length > 0) {
      const localIds = Array.from(new Set(local.map(s => s.caseId)));
      setExistingCaseIds(localIds);
      setRole(prev => (!prev && local[0]?.reviewerRole ? local[0].reviewerRole : prev));
    }

    // 2. Query cloud in background
    try {
      setIsSearchingProgress(true);
      const res = await fetchAndSyncReviewerProgress(trimmed);
      if (res.caseIds && res.caseIds.length > 0) {
        setExistingCaseIds(res.caseIds);
        setRole(prev => (!prev && res.reviewerRole ? res.reviewerRole : prev));
      }
    } catch {
      // offline or error
    } finally {
      setIsSearchingProgress(false);
    }
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (error) setError("");

    if (timerRef.current) clearTimeout(timerRef.current);
    if (val.trim().length < 2) {
      setExistingCaseIds([]);
      return;
    }

    // Debounce cloud check by 350ms
    timerRef.current = setTimeout(() => {
      checkProgress(val);
    }, 350);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      setError("Silakan masukkan nama lengkap Anda terlebih dahulu.");
      return;
    }

    setIsStarting(true);
    // Ensure final sync before proceeding
    try {
      await fetchAndSyncReviewerProgress(cleanName);
    } catch {
      // offline or continue
    }

    onStart({
      name: cleanName,
      roleOrAffiliation: role.trim() || "Penilai Independen",
      startedAt: new Date().toISOString()
    });
  };

  const hasHistory = existingCaseIds.length > 0;

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
              onChange={e => handleNameChange(e.target.value)}
              onBlur={() => checkProgress(name)}
              autoFocus
            />

            {/* Found Previous Progress Banner */}
            {hasHistory && (
              <div className="resume-progress-banner">
                <CheckCircle2 size={16} className="text-emerald shrink-0 mt-0.5" />
                <div className="resume-progress-text">
                  <strong>Riwayat penilaian ditemukan:</strong> {existingCaseIds.length} dari 4 kasus telah dinilai (
                  {existingCaseIds.map(id => (
                    <span key={id} className="resume-badge">{id}</span>
                  ))}
                  ). Progress Anda akan otomatis dimuat dan dilanjutkan.
                </div>
              </div>
            )}
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

          <button
            type="submit"
            className="login-submit-btn"
            disabled={isStarting}
          >
            {isStarting ? (
              <>
                <RefreshCw size={15} className="animate-spin" />
                <span>Memuat progress...</span>
              </>
            ) : hasHistory ? (
              <>
                <span>Lanjutkan penilaian ({existingCaseIds.length}/4 selesai)</span>
                <ArrowRight size={16} />
              </>
            ) : (
              <>
                <span>Mulai penilaian</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>

          {isSearchingProgress && !hasHistory && (
            <span className="text-xs text-muted text-center mt-1">
              Memeriksa riwayat penilaian...
            </span>
          )}
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
