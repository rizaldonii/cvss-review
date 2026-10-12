import React from "react";
import type { ReviewerProfile, TestCaseDossier } from "../types";
import { getLocalSubmissions, exportToCsv } from "../lib/storage";
import {
  CheckCircle2,
  RotateCcw,
  TableProperties,
  ShieldCheck,
  FileSpreadsheet
} from "lucide-react";

interface ThankYouViewProps {
  reviewer: ReviewerProfile;
  cases: TestCaseDossier[];
  onReviewAgain: () => void;
  onOpenAdmin: () => void;
}

export const ThankYouView: React.FC<ThankYouViewProps> = ({
  reviewer,
  cases,
  onReviewAgain,
  onOpenAdmin
}) => {
  const allSubmissions = getLocalSubmissions();
  const mySubmissions = allSubmissions.filter(
    s => s.reviewerName.trim().toLowerCase() === reviewer.name.trim().toLowerCase()
  );

  const handleDownloadCsv = () => {
    const csv = exportToCsv(mySubmissions);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `CVSS_Evaluation_${reviewer.name.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="thankyou-view-container">
      <div className="thankyou-card">
        <div className="thankyou-header">
          <div className="icon-success-bubble">
            <CheckCircle2 size={44} className="text-emerald" />
          </div>
          <h2 className="thankyou-title">Seluruh Kasus Berhasil Dievaluasi!</h2>
          <p className="thankyou-subtitle">
            Terima kasih atas kontribusi dan penilaian objektif Anda,{" "}
            <strong>{reviewer.name}</strong> ({reviewer.roleOrAffiliation}).
          </p>
        </div>

        <div className="submissions-summary-table-box">
          <div className="table-header-title">
            <ShieldCheck size={18} className="text-accent" />
            <span>Ringkasan Skor CVSS v3.1 yang Telah Anda Kirimkan</span>
          </div>

          <div className="table-responsive">
            <table className="summary-table">
              <thead>
                <tr>
                  <th>Case ID</th>
                  <th>Aplikasi Target</th>
                  <th>Kontrol OWASP</th>
                  <th>CVSS Base Score</th>
                  <th>Tingkat Keparahan</th>
                  <th>Vector String</th>
                </tr>
              </thead>
              <tbody>
                {cases.map(c => {
                  const sub = mySubmissions.find(s => s.caseId === c.caseId);
                  return (
                    <tr key={c.caseId}>
                      <td>
                        <strong className="case-id-text">{c.caseId}</strong>
                      </td>
                      <td>{c.targetAppNameSanitized}</td>
                      <td>
                        <code>{c.controlId}</code>
                      </td>
                      <td>
                        <span className="score-cell-badge">
                          {sub ? sub.baseScore.toFixed(1) : "-"}
                        </span>
                      </td>
                      <td>
                        <span className={`severity-cell-badge sev-${sub?.severity?.toLowerCase() || "none"}`}>
                          {sub ? sub.severity.toUpperCase() : "BELUM DIISI"}
                        </span>
                      </td>
                      <td>
                        <code className="vector-mini">{sub ? sub.vectorString : "-"}</code>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="thankyou-actions">
          <button type="button" className="btn-secondary" onClick={onReviewAgain}>
            <RotateCcw size={16} />
            <span>Tinjau Kembali Kasus 1</span>
          </button>

          <button type="button" className="btn-primary" onClick={handleDownloadCsv}>
            <FileSpreadsheet size={16} />
            <span>Unduh Bukti Rekapitulasi (CSV)</span>
          </button>

          <button type="button" className="btn-admin-access" onClick={onOpenAdmin}>
            <TableProperties size={16} />
            <span>Buka Matriks Rekapitulasi (Admin)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
