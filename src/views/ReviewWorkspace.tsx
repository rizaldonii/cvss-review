import React, { useState, useEffect } from "react";
import type {
  TestCaseDossier,
  ReviewerProfile,
  CVSSv31Metrics,
  CaseEvaluationSubmission
} from "../types";
import { calculateCVSSv31 } from "../lib/cvssCalculator";
import { saveSubmission, getLocalSubmissions } from "../lib/storage";
import { CaseViewer } from "../components/CaseViewer";
import { CvssSelector } from "../components/CvssSelector";
import { ScoreGauge } from "../components/ScoreGauge";
import { ConfirmationModal } from "../components/ConfirmationModal";
import {
  ChevronLeft,
  ChevronRight,
  Send,
  AlertCircle,
  CheckCircle2,
  BookOpen,
  RefreshCw,
  AlertTriangle
} from "lucide-react";

interface ReviewWorkspaceProps {
  reviewer: ReviewerProfile;
  cases: TestCaseDossier[];
  currentCaseIndex: number;
  onCaseChange: (index: number) => void;
  onFinishAllCases: () => void;
  onRefreshCompleted: () => void;
  onOpenGuide: () => void;
}

const EMPTY_METRICS: CVSSv31Metrics = {
  AV: null,
  AC: null,
  PR: null,
  UI: null,
  S: null,
  C: null,
  I: null,
  A: null
};

export const ReviewWorkspace: React.FC<ReviewWorkspaceProps> = ({
  reviewer,
  cases,
  currentCaseIndex,
  onCaseChange,
  onFinishAllCases,
  onRefreshCompleted,
  onOpenGuide
}) => {
  const currentCase = cases[currentCaseIndex];

  const [metrics, setMetrics] = useState<CVSSv31Metrics>(EMPTY_METRICS);
  const [justification, setJustification] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{
    type: "success" | "warning" | "error";
    message: string;
    canProceedAnyway?: boolean;
  } | null>(null);

  // Load existing submission if reviewer already rated this case
  useEffect(() => {
    const existing = getLocalSubmissions().find(
      s =>
        s.caseId === currentCase.caseId &&
        s.reviewerName.trim().toLowerCase() === reviewer.name.trim().toLowerCase()
    );

    if (existing) {
      setMetrics(existing.metrics);
      setJustification(existing.justification || "");
    } else {
      setMetrics(EMPTY_METRICS);
      setJustification("");
    }
    setSaveStatus(null);
  }, [currentCase.caseId, reviewer.name]);

  const calculationResult = calculateCVSSv31(metrics);
  const isJustificationFilled = justification.trim().length > 0;
  const isReadyToSubmit = calculationResult.isComplete && isJustificationFilled;

  const handleMetricChange = (metricKey: keyof CVSSv31Metrics, value: any) => {
    setMetrics(prev => ({
      ...prev,
      [metricKey]: value
    }));
  };

  const handleOpenConfirm = () => {
    if (!isReadyToSubmit) return;
    setIsModalOpen(true);
  };

  const handleConfirmSave = async () => {
    if (!isReadyToSubmit) return;

    setIsSubmitting(true);
    const submission: CaseEvaluationSubmission = {
      id: `${currentCase.caseId}_${reviewer.name.replace(/\s+/g, "_")}_${Date.now()}`,
      caseId: currentCase.caseId,
      reviewerName: reviewer.name,
      reviewerRole: reviewer.roleOrAffiliation,
      metrics: {
        AV: metrics.AV!,
        AC: metrics.AC!,
        PR: metrics.PR!,
        UI: metrics.UI!,
        S: metrics.S!,
        C: metrics.C!,
        I: metrics.I!,
        A: metrics.A!
      },
      baseScore: calculationResult.baseScore,
      severity: calculationResult.severity,
      vectorString: calculationResult.vectorString,
      justification: justification.trim(),
      submittedAt: new Date().toISOString()
    };

    const res = await saveSubmission(submission);
    setIsSubmitting(false);
    setIsModalOpen(false);
    onRefreshCompleted();

    if (res.cloudSynced) {
      setSaveStatus({
        type: "success",
        message: "Penilaian berhasil disimpan dan terkirim ke database cloud peneliti!"
      });

      // Auto advance to next case or finish view
      setTimeout(() => {
        if (currentCaseIndex < cases.length - 1) {
          onCaseChange(currentCaseIndex + 1);
        } else {
          onFinishAllCases();
        }
      }, 1200);
    } else {
      // Failed cloud sync: alert user explicitly
      setSaveStatus({
        type: "warning",
        message: res.message,
        canProceedAnyway: true
      });
    }
  };

  const handleProceedManually = () => {
    if (currentCaseIndex < cases.length - 1) {
      onCaseChange(currentCaseIndex + 1);
    } else {
      onFinishAllCases();
    }
  };

  return (
    <div className="workspace-container">
      <div className="workspace-split-layout">
        {/* Left Pane: Technical Dossier and Sanitized Evidence */}
        <section className="workspace-left-pane">
          <CaseViewer
            testCase={currentCase}
            currentIndex={currentCaseIndex}
            totalCases={cases.length}
          />
        </section>

        {/* Right Pane: Interactive CVSS Calculator and Justification */}
        <section className="workspace-right-pane">
          <div className="sticky-scoring-column">
            {/* Guide Trigger Button */}
            <div className="guide-shortcut-bar">
              <button
                type="button"
                className="btn-open-guide-inline"
                onClick={onOpenGuide}
                title="Buka panduan standar penilaian CVSS v3.1"
              >
                <BookOpen size={15} />
                <span>Buka Panduan Penilaian CVSS v3.1</span>
              </button>
            </div>

            {/* Cloud Sync Status Banner */}
            {saveStatus && (
              <div className={`status-toast-banner status-${saveStatus.type}`}>
                <div className="status-toast-content">
                  {saveStatus.type === "success" ? (
                    <CheckCircle2 size={18} className="text-emerald shrink-0" />
                  ) : (
                    <AlertTriangle size={18} className="text-warning shrink-0" />
                  )}
                  <span className="status-toast-text">{saveStatus.message}</span>
                </div>
                {saveStatus.canProceedAnyway && (
                  <div className="status-toast-actions">
                    <button
                      type="button"
                      className="btn-retry-cloud"
                      onClick={handleConfirmSave}
                      disabled={isSubmitting}
                    >
                      <RefreshCw size={13} className={isSubmitting ? "animate-spin" : ""} />
                      <span>Coba Kirim Ulang ke Cloud</span>
                    </button>
                    <button
                      type="button"
                      className="btn-proceed-anyway"
                      onClick={handleProceedManually}
                    >
                      <span>Tetap Lanjut (Hanya Lokal)</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Score & Vector Display */}
            <ScoreGauge result={calculationResult} />

            {/* 8 Base Metrics Segmented Selectors with Hover Tooltips */}
            <CvssSelector metrics={metrics} onChange={handleMetricChange} />

            {/* Qualitative Justification Textarea (Mandatory) */}
            <div className="justification-container">
              <div className="justification-label-row">
                <label htmlFor="expert-justification" className="justification-label">
                  Justifikasi Teknis &amp; Catatan Evaluasi <span className="required-star">*</span>
                </label>
                <span className="justification-badge-required">Wajib Diisi</span>
              </div>
              <textarea
                id="expert-justification"
                className={`justification-textarea ${!isJustificationFilled && calculationResult.isComplete ? "required-highlight" : ""}`}
                rows={4}
                placeholder="Wajib diisi: Berikan argumentasi teknis penentuan metrik di atas berdasarkan analisis bukti POC (misal: pertimbangan vektor serangan, prasyarat akses, Scope Unchanged vs Changed, serta estimasi dampak kerahasiaan/integritas)..."
                value={justification}
                onChange={e => setJustification(e.target.value)}
              />
              <span className="justification-hint">
                Jelaskan dasar rasionalisasi pemilihan nilai metrik di atas untuk mempermudah perbandingan antar-evaluator.
              </span>
            </div>

            {/* Incomplete Warning Banner */}
            {!isReadyToSubmit && (
              <div className="incomplete-alert-banner">
                <AlertCircle size={16} />
                <span>
                  {!calculationResult.isComplete
                    ? "Wajib memilih seluruh 8 parameter metrik dasar sebelum menyimpan evaluasi."
                    : "Wajib mengisi kolom Justifikasi Teknis sebelum menyimpan evaluasi."}
                </span>
              </div>
            )}

            {/* Bottom Navigation and Submission Buttons */}
            <div className="workspace-bottom-actions">
              <button
                type="button"
                className="btn-nav-prev"
                onClick={() => onCaseChange(currentCaseIndex - 1)}
                disabled={currentCaseIndex === 0}
              >
                <ChevronLeft size={16} />
                <span>Kasus Sebelumnya</span>
              </button>

              <button
                type="button"
                className={`btn-nav-submit ${isReadyToSubmit ? "ready" : "disabled"}`}
                onClick={handleOpenConfirm}
                disabled={!isReadyToSubmit}
              >
                {currentCaseIndex === cases.length - 1 ? (
                  <>
                    <Send size={16} />
                    <span>Simpan &amp; Selesaikan Evaluasi (4/4)</span>
                  </>
                ) : (
                  <>
                    <span>Simpan &amp; Lanjut ke Kasus {currentCaseIndex + 2}</span>
                    <ChevronRight size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirmSave}
        testCase={currentCase}
        metrics={metrics}
        calculationResult={calculationResult}
        justification={justification}
        reviewerName={reviewer.name}
        isSubmitting={isSubmitting}
      />
    </div>
  );
};
