import React from "react";
import type { CVSSCalculationResult, CVSSv31Metrics, TestCaseDossier } from "../types";
import { CheckCircle2, X } from "lucide-react";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  testCase: TestCaseDossier;
  metrics: CVSSv31Metrics;
  calculationResult: CVSSCalculationResult;
  justification: string;
  reviewerName: string;
  isSubmitting: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  testCase,
  metrics,
  calculationResult,
  justification,
  reviewerName,
  isSubmitting
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Konfirmasi penilaian</h3>
          <button type="button" className="modal-close-btn" onClick={onClose} title="Tutup">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <p className="modal-intro">
            Periksa kembali pilihan metrik dan alasan penilaian Anda sebelum disimpan.
          </p>

          <div className="modal-summary-card">
            <div className="summary-row">
              <span className="summary-label">Nama:</span>
              <strong className="summary-value">{reviewerName}</strong>
            </div>
            <div className="summary-row">
              <span className="summary-label">Kasus:</span>
              <span className="summary-value">
                {testCase.caseId} &bull; {testCase.findingTitle}
              </span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Aplikasi:</span>
              <span className="summary-value">{testCase.targetAppNameSanitized}</span>
            </div>
          </div>

          <div className="modal-score-banner">
            <div className="modal-score-badge">
              <span className="modal-score-num">{calculationResult.baseScore.toFixed(1)}</span>
              <span className="modal-score-sev">{calculationResult.severity.toUpperCase()}</span>
            </div>
            <div className="modal-vector-display">
              <span className="modal-vector-label">Vector string:</span>
              <code className="modal-vector-code">{calculationResult.vectorString}</code>
            </div>
          </div>

          <div className="modal-metric-chips-grid">
            <div className="metric-chip">
              <span className="chip-name">AV</span>
              <span className="chip-val">{metrics.AV}</span>
            </div>
            <div className="metric-chip">
              <span className="chip-name">AC</span>
              <span className="chip-val">{metrics.AC}</span>
            </div>
            <div className="metric-chip">
              <span className="chip-name">PR</span>
              <span className="chip-val">{metrics.PR}</span>
            </div>
            <div className="metric-chip">
              <span className="chip-name">UI</span>
              <span className="chip-val">{metrics.UI}</span>
            </div>
            <div className="metric-chip">
              <span className="chip-name">Scope</span>
              <span className="chip-val">{metrics.S}</span>
            </div>
            <div className="metric-chip">
              <span className="chip-name">C</span>
              <span className="chip-val">{metrics.C}</span>
            </div>
            <div className="metric-chip">
              <span className="chip-name">I</span>
              <span className="chip-val">{metrics.I}</span>
            </div>
            <div className="metric-chip">
              <span className="chip-name">A</span>
              <span className="chip-val">{metrics.A}</span>
            </div>
          </div>

          <div className="modal-justification-box">
            <span className="justification-heading">Alasan penilaian:</span>
            <p className="justification-text">{justification}</p>
          </div>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Periksa kembali
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={onConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span>Menyimpan...</span>
            ) : (
              <>
                <CheckCircle2 size={16} />
                <span>Konfirmasi dan simpan</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
