import React, { useState, useMemo, useEffect, useRef } from "react";
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
  onPostSaveAdvance: () => void;
  onRefreshCompleted: () => void;
  onOpenGuide: () => void;
  onDirtyChange?: (isDirty: boolean) => void;
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
  onPostSaveAdvance,
  onRefreshCompleted,
  onOpenGuide,
  onDirtyChange
}) => {
  const currentCase = cases[currentCaseIndex];

  const existingSubmission = getLocalSubmissions().find(
    s =>
      s.caseId === currentCase.caseId &&
      s.reviewerName.trim().toLowerCase() === reviewer.name.trim().toLowerCase()
  );

  const [metrics, setMetrics] = useState<CVSSv31Metrics>(
    existingSubmission ? existingSubmission.metrics : EMPTY_METRICS
  );
  const [justification, setJustification] = useState(
    existingSubmission?.justification || ""
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAutoAdvancing, setIsAutoAdvancing] = useState(false);
  const [isSavedSuccessfully, setIsSavedSuccessfully] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{
    type: "success" | "warning";
    message: string;
    canProceedAnyway?: boolean;
  } | null>(null);

  const isSubmittingRef = useRef(false);
  const hasNavigatedRef = useRef(false);
  const autoAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
      }
    };
  }, []);

  // Deteksi perubahan yang belum disimpan (form dirty state)
  const isFormDirty = useMemo(() => {
    if (isSavedSuccessfully) return false;
    const metricKeys: (keyof CVSSv31Metrics)[] = ["AV", "AC", "PR", "UI", "S", "C", "I", "A"];
    const hasMetricChanged = metricKeys.some(
      k => metrics[k] !== (existingSubmission ? existingSubmission.metrics[k] : null)
    );
    const hasJustificationChanged =
      justification.trim() !== (existingSubmission?.justification || "").trim();
    return hasMetricChanged || hasJustificationChanged;
  }, [metrics, justification, existingSubmission, isSavedSuccessfully]);

  useEffect(() => {
    onDirtyChange?.(isFormDirty);
  }, [isFormDirty, onDirtyChange]);

  const calculationResult = calculateCVSSv31(metrics);
  const isJustificationFilled = justification.trim().length > 0;
  const isReadyToSubmit = calculationResult.isComplete && isJustificationFilled;

  const handleMetricChange = (metricKey: keyof CVSSv31Metrics, value: any) => {
    if (isSavedSuccessfully) setIsSavedSuccessfully(false);
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
    if (!isReadyToSubmit || isSubmittingRef.current || hasNavigatedRef.current) return;

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    const submission: CaseEvaluationSubmission = {
      id: `v2_${currentCase.caseId}_${encodeURIComponent(reviewer.name.trim().toLowerCase())}`,
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

    try {
      const res = await saveSubmission(submission);
      setIsSubmitting(false);
      isSubmittingRef.current = false;
      setIsModalOpen(false);
      onRefreshCompleted();

      if (res.cloudSynced) {
        setIsSavedSuccessfully(true);
        setIsAutoAdvancing(true);
        onDirtyChange?.(false);
        setSaveStatus({
          type: "success",
          message: "Penilaian berhasil dikirim dan tersimpan di server."
        });

        if (autoAdvanceTimerRef.current) {
          clearTimeout(autoAdvanceTimerRef.current);
        }
        autoAdvanceTimerRef.current = setTimeout(() => {
          if (!hasNavigatedRef.current) {
            hasNavigatedRef.current = true;
            onPostSaveAdvance();
          }
        }, 1000);
      } else {
        // D1 gagal atau belum sinkron: data telah aman di localStorage, tampilkan opsi lanjut atau retry
        setSaveStatus({
          type: "warning",
          message: res.message,
          canProceedAnyway: true
        });
      }
    } catch (err: any) {
      setIsSubmitting(false);
      isSubmittingRef.current = false;
      setIsModalOpen(false);
      setSaveStatus({
        type: "warning",
        message: `Gagal menyimpan: ${err?.message || "Terjadi gangguan koneksi"}`,
        canProceedAnyway: true
      });
    }
  };

  const handleProceedManually = () => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    setIsSavedSuccessfully(true);
    setIsAutoAdvancing(true);
    onDirtyChange?.(false);
    if (!hasNavigatedRef.current) {
      hasNavigatedRef.current = true;
      onPostSaveAdvance();
    }
  };

  return (
    <div className="workspace-container">
      <div className="workspace-split-layout">
        {/* Left Pane: Technical Dossier and Evidence */}
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
            {/* Guide Shortcut */}
            <div className="guide-shortcut-bar">
              <button
                type="button"
                className="btn-open-guide-inline"
                onClick={onOpenGuide}
                title="Buka panduan standar penilaian CVSS v3.1"
              >
                <BookOpen size={14} />
                <span>Panduan CVSS v3.1</span>
              </button>
            </div>

            {/* Storage Status Notification */}
            {saveStatus && (
              <div className={`status-toast-banner status-${saveStatus.type}`}>
                <div className="status-toast-content">
                  {saveStatus.type === "success" ? (
                    <CheckCircle2 size={16} className="text-emerald shrink-0" />
                  ) : (
                    <AlertTriangle size={16} className="text-amber shrink-0" />
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
                      <span>Kirim ulang ke server</span>
                    </button>
                    <button
                      type="button"
                      className="btn-proceed-anyway"
                      onClick={handleProceedManually}
                    >
                      <span>Tetap lanjut (simpan lokal)</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Score & Vector Display (Automatically calculates score when 8 metrics are complete) */}
            <ScoreGauge result={calculationResult} />

            {/* 8 Base Metrics Segmented Selectors with Inline Explanation */}
            <CvssSelector metrics={metrics} onChange={handleMetricChange} />

            {/* Justification Textarea (Mandatory) */}
            <div className="justification-container">
              <div className="justification-label-row">
                <label htmlFor="expert-justification" className="justification-label">
                  Alasan penilaian <span className="required-star">*</span>
                </label>
                <span className="justification-badge-required">Wajib diisi</span>
              </div>
              <textarea
                id="expert-justification"
                className={`justification-textarea ${!isJustificationFilled && calculationResult.isComplete ? "required-highlight" : ""}`}
                rows={4}
                placeholder="Jelaskan alasan penentuan nilai metrik di atas berdasarkan bukti pengujian (misal pertimbangan vektor serangan, prasyarat akses, atau cakupan dampak terhadap data)..."
                value={justification}
                onChange={e => {
                  if (isSavedSuccessfully) setIsSavedSuccessfully(false);
                  setJustification(e.target.value);
                }}
              />
            </div>

            {/* Incomplete Warning Banner */}
            {!isReadyToSubmit && (
              <div className="incomplete-alert-banner">
                <AlertCircle size={15} />
                <span>
                  {!calculationResult.isComplete
                    ? "Pilih seluruh 8 parameter metrik sebelum menyimpan."
                    : "Kolom alasan penilaian wajib diisi sebelum menyimpan."}
                </span>
              </div>
            )}

            {/* Bottom Navigation */}
            <div className="workspace-bottom-actions">
              <button
                type="button"
                className="btn-nav-prev"
                onClick={() => onCaseChange(currentCaseIndex - 1)}
                disabled={currentCaseIndex === 0 || isSubmitting || isAutoAdvancing}
              >
                <ChevronLeft size={16} />
                <span>Kembali</span>
              </button>

              <button
                type="button"
                className={`btn-nav-submit ${isReadyToSubmit ? "ready" : "disabled"}`}
                onClick={handleOpenConfirm}
                disabled={!isReadyToSubmit || isSubmitting || isAutoAdvancing}
              >
                {currentCaseIndex === cases.length - 1 ? (
                  <>
                    <Send size={15} />
                    <span>Simpan dan selesai</span>
                  </>
                ) : (
                  <>
                    <span>Simpan dan lanjut</span>
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
