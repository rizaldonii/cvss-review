import { useState } from "react";
import type { ReviewerProfile } from "./types";
import { SANITIZED_TEST_CASES } from "./data/casesData";
import {
  getReviewerProfile,
  saveReviewerProfile,
  clearReviewerProfile,
  getLocalSubmissions
} from "./lib/storage";
import { Navbar } from "./components/Navbar";
import { LoginReviewer } from "./views/LoginReviewer";
import { ReviewWorkspace } from "./views/ReviewWorkspace";
import { ThankYouView } from "./views/ThankYouView";
import { AdminView } from "./views/AdminView";
import { AssessmentGuideModal } from "./components/AssessmentGuideModal";

export const App: React.FC = () => {
  const [reviewer, setReviewer] = useState<ReviewerProfile | null>(() => getReviewerProfile());
  const [currentCaseIndex, setCurrentCaseIndex] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [completedCaseIds, setCompletedCaseIds] = useState<string[]>(() => {
    const saved = getReviewerProfile();
    if (!saved) return [];
    const all = getLocalSubmissions();
    return all
      .filter(s => s.reviewerName.trim().toLowerCase() === saved.name.trim().toLowerCase())
      .map(s => s.caseId);
  });

  const refreshCompletedCases = (name?: string) => {
    const targetName = name || reviewer?.name;
    if (!targetName) {
      setCompletedCaseIds([]);
      return;
    }

    const all = getLocalSubmissions();
    const matching = all
      .filter(s => s.reviewerName.trim().toLowerCase() === targetName.trim().toLowerCase())
      .map(s => s.caseId);

    setCompletedCaseIds(matching);
  };

  const handleStartReview = (profile: ReviewerProfile) => {
    saveReviewerProfile(profile);
    setReviewer(profile);
    setCurrentCaseIndex(0);
    setIsFinished(false);
    refreshCompletedCases(profile.name);
  };

  const handleLogout = () => {
    if (window.confirm("Apakah Anda yakin ingin keluar atau mengganti nama penilai?")) {
      clearReviewerProfile();
      setReviewer(null);
      setIsFinished(false);
      setCurrentCaseIndex(0);
    }
  };

  const handleCaseChange = (index: number) => {
    if (index >= 0 && index < SANITIZED_TEST_CASES.length) {
      setCurrentCaseIndex(index);
      setIsFinished(false);
    }
  };

  const handleFinishAllCases = () => {
    setIsFinished(true);
  };

  return (
    <div className="app-root-layout">
      {/* Top Application Navigation */}
      <Navbar
        reviewer={reviewer}
        onLogout={handleLogout}
        onOpenAdmin={() => setIsAdminOpen(true)}
        onOpenGuide={() => setIsGuideOpen(true)}
        currentCaseIndex={currentCaseIndex}
        totalCases={SANITIZED_TEST_CASES.length}
        completedCaseIds={completedCaseIds}
        onSelectCase={handleCaseChange}
      />

      {/* Main View Router */}
      <main className="app-main-content">
        {!reviewer ? (
          <LoginReviewer
            onStart={handleStartReview}
            onOpenGuide={() => setIsGuideOpen(true)}
          />
        ) : isFinished ? (
          <ThankYouView
            reviewer={reviewer}
            cases={SANITIZED_TEST_CASES}
            onReviewAgain={() => {
              setIsFinished(false);
              setCurrentCaseIndex(0);
            }}
          />
        ) : (
          <ReviewWorkspace
            key={`${currentCaseIndex}_${reviewer.name}`}
            reviewer={reviewer}
            cases={SANITIZED_TEST_CASES}
            currentCaseIndex={currentCaseIndex}
            onCaseChange={handleCaseChange}
            onFinishAllCases={handleFinishAllCases}
            onRefreshCompleted={() => refreshCompletedCases()}
            onOpenGuide={() => setIsGuideOpen(true)}
          />
        )}
      </main>

      {/* Admin / Bab 4 Rekapitulasi Overlay */}
      {isAdminOpen && (
        <AdminView
          cases={SANITIZED_TEST_CASES}
          onClose={() => setIsAdminOpen(false)}
        />
      )}

      {/* CVSS v3.1 Assessment Guide Modal */}
      <AssessmentGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />
    </div>
  );
};

export default App;
