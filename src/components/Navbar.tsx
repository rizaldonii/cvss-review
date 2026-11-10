import React from "react";
import type { ReviewerProfile } from "../types";
import { Shield, User, LogOut, TableProperties, CheckCircle, BookOpen } from "lucide-react";

interface NavbarProps {
  reviewer: ReviewerProfile | null;
  onLogout: () => void;
  onOpenAdmin: () => void;
  onOpenGuide: () => void;
  currentCaseIndex: number;
  totalCases: number;
  completedCaseIds: string[];
  onSelectCase: (index: number) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  reviewer,
  onLogout,
  onOpenAdmin,
  onOpenGuide,
  currentCaseIndex,
  totalCases,
  completedCaseIds,
  onSelectCase
}) => {
  return (
    <header className="navbar-container">
      <div className="navbar-brand-section">
        <div className="brand-logo">
          <Shield size={20} className="text-accent" />
        </div>
        <div className="brand-text">
          <h1 className="brand-title">Form Penilaian CVSS v3.1</h1>
          <span className="brand-subtitle">Evaluasi Kerentanan Aplikasi Mobile (OWASP MASVS)</span>
        </div>
      </div>

      {reviewer && (
        <div className="navbar-progress-section">
          <span className="progress-label">Kasus:</span>
          <div className="progress-stepper">
            {Array.from({ length: totalCases }).map((_, idx) => {
              const caseId = `CASE-0${idx + 1}`;
              const isCompleted = completedCaseIds.includes(caseId);
              const isActive = currentCaseIndex === idx;

              return (
                <button
                  key={idx}
                  type="button"
                  className={`stepper-pill ${isActive ? "active" : ""} ${isCompleted ? "completed" : ""}`}
                  onClick={() => onSelectCase(idx)}
                  title={`Kasus ${idx + 1}: ${caseId} ${isCompleted ? "(Selesai dinilai)" : ""}`}
                >
                  <span className="pill-num">{idx + 1}</span>
                  {isCompleted && <CheckCircle size={10} className="pill-check" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="navbar-actions-section">
        <button
          type="button"
          className="navbar-guide-btn"
          onClick={onOpenGuide}
          title="Buka Panduan Penilaian CVSS v3.1"
        >
          <BookOpen size={15} />
          <span>Panduan CVSS</span>
        </button>

        {reviewer ? (
          <div className="reviewer-tag-box">
            <div className="reviewer-avatar">
              <User size={14} />
            </div>
            <div className="reviewer-info">
              <span className="reviewer-name">{reviewer.name}</span>
              <span className="reviewer-role">{reviewer.roleOrAffiliation || "Evaluator"}</span>
            </div>
            <button
              type="button"
              className="navbar-icon-btn"
              onClick={onLogout}
              title="Keluar / Ganti Evaluator"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : null}

        <button
          type="button"
          className="admin-rekap-btn"
          onClick={onOpenAdmin}
          title="Rekapitulasi Data (Khusus Peneliti)"
        >
          <TableProperties size={15} />
          <span>Rekap Data</span>
        </button>
      </div>
    </header>
  );
};
