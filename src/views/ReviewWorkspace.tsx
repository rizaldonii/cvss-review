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
  CheckCircle2
} from "lucide-react";

interface ReviewWorkspaceProps {
  reviewer: ReviewerProfile;
  cases: TestCaseDossier[];
  currentCaseIndex: number;
  onCaseChange: (index: number) => void;
  onFinishAllCases: () => void;
  onRefreshCompleted: () => void;
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
  onRefreshCompleted
}) => {
  const currentCase = cases[currentCaseIndex];

  const [metrics, setMetrics] = useState<CVSSv31Metrics>(EMPTY_METRICS);
  const [justification, setJustification] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");

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
    setSaveSuccessMsg("");
  }, [currentCase.caseId, reviewer.name]);

  const calculationResult = calculateCVSSv31(metrics);

  const handleMetricChange = (metricKey: keyof CVSSv31Metrics, value: any) => {
    setMetrics(prev => ({
      ...prev,
      [metricKey]: value
    }));
  };

  const handleOpenConfirm = () => {
    if (!calculationResult.isComplete) return;
    setIsModalOpen(true);
  };

  const handleConfirmSave = async () => {
    if (!calculationResult.isComplete) return;

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

    await saveSubmission(submission);
    setIsSubmitting(false);
    setIsModalOpen(false);
    onRefreshCompleted();

    setSaveSuccessMsg("Penilaian kasus ini berhasil disimpan!");

    // Auto navigate to next case or finish view
    setTimeout(() => {
      if (currentCaseIndex < cases.length - 1) {
        onCaseChange(currentCaseIndex + 1);
      } else {
        onFinishAllCases();
      }
    }, 1200);
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
            {saveSuccessMsg && (
              <div className="success-toast-banner">
                <CheckCircle2 size={18} className="text-emerald" />
                <span>{saveSuccessMsg}</span>
              </div>
            )}

            {/* Score & Vector Display */}
            <ScoreGauge result={calculationResult} />

            {/* 8 Base Metrics Segmented Selectors with Hover Tooltips */}
            <CvssSelector metrics={metrics} onChange={handleMetricChange} />

            {/* Qualitative Justification Textarea */}
            <div className="justification-container">
              <label htmlFor="expert-justification" className="justification-label">
                Justifikasi Teknis &amp; Catatan Evaluasi (Rasionalisasi Skor)
              </label>
              <textarea
                id="expert-justification"
                className="justification-textarea"
                rows={3}
                placeholder="Berikan argumentasi teknis penentuan metrik di atas berdasarkan analisis bukti POC (misal: alasan pemilihan Attack Vector Local vs Network, atau tingkat keparahan dampak terhadap data pribadi)..."
                value={justification}
                onChange={e => setJustification(e.target.value)}
              />
            </div>

            {/* Incomplete Metrics Warning Banner */}
            {!calculationResult.isComplete && (
              <div className="incomplete-alert-banner">
                <AlertCircle size={16} />
                <span>
                  Wajib memilih seluruh <strong>8 parameter metrik dasar</strong> sebelum menyimpan
                  evaluasi.
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
                className={`btn-nav-submit ${calculationResult.isComplete ? "ready" : "disabled"}`}
                onClick={handleOpenConfirm}
                disabled={!calculationResult.isComplete}
              >
                {currentCaseIndex === cases.length - 1 ? (
                  <>
                    <Send size={16} />
                    <span>Simpan &amp; Selesaikan Evaluasi</span>
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
