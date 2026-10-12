import { useState, useEffect } from "react";
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

export const App: React.FC = () => {
  const [reviewer, setReviewer] = useState<ReviewerProfile | null>(null);
  const [currentCaseIndex, setCurrentCaseIndex] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [completedCaseIds, setCompletedCaseIds] = useState<string[]>([]);

  // Load existing session on initial mount
  useEffect(() => {
    const saved = getReviewerProfile();
    if (saved) {
      setReviewer(saved);
      refreshCompletedCases(saved.name);
    }
  }, []);

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

    // If all 6 cases already completed, offer option to view thank you screen
    if (matching.length >= SANITIZED_TEST_CASES.length) {
      // Keep user in workspace or allow thank you
    }
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
        currentCaseIndex={currentCaseIndex}
        totalCases={SANITIZED_TEST_CASES.length}
        completedCaseIds={completedCaseIds}
        onSelectCase={handleCaseChange}
      />

      {/* Main View Router */}
      <main className="app-main-content">
        {!reviewer ? (
          <LoginReviewer onStart={handleStartReview} />
        ) : isFinished ? (
          <ThankYouView
            reviewer={reviewer}
            cases={SANITIZED_TEST_CASES}
            onReviewAgain={() => {
              setIsFinished(false);
              setCurrentCaseIndex(0);
            }}
            onOpenAdmin={() => setIsAdminOpen(true)}
          />
        ) : (
          <ReviewWorkspace
            reviewer={reviewer}
            cases={SANITIZED_TEST_CASES}
            currentCaseIndex={currentCaseIndex}
            onCaseChange={handleCaseChange}
            onFinishAllCases={handleFinishAllCases}
            onRefreshCompleted={() => refreshCompletedCases()}
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
    </div>
  );
};

export default App;
