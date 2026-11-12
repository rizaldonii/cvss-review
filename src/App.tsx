import { useState, useEffect, useRef, useCallback } from "react";
import type { ReviewerProfile } from "./types";
import { SANITIZED_TEST_CASES } from "./data/casesData";
import {
  getReviewerProfile,
  saveReviewerProfile,
  clearReviewerProfile,
  getLocalSubmissions,
  fetchAndSyncReviewerProgress
} from "./lib/storage";
import { Navbar } from "./components/Navbar";
import { LoginReviewer } from "./views/LoginReviewer";
import { ReviewWorkspace } from "./views/ReviewWorkspace";
import { ThankYouView } from "./views/ThankYouView";
import { AdminView } from "./views/AdminView";
import { AssessmentGuideModal } from "./components/AssessmentGuideModal";

export const App: React.FC = () => {
  const [currentPath, setCurrentPath] = useState<string>(() => window.location.pathname);
  const [reviewer, setReviewer] = useState<ReviewerProfile | null>(() => getReviewerProfile());
  const [currentCaseIndex, setCurrentCaseIndex] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const isFormDirtyRef = useRef(false);

  const setIsFormDirty = useCallback((dirty: boolean) => {
    isFormDirtyRef.current = dirty;
  }, []);

  // Peringatan jika tab ditutup / refresh saat ada perubahan form yang belum disimpan
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isFormDirtyRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);
  const [completedCaseIds, setCompletedCaseIds] = useState<string[]>(() => {
    const saved = getReviewerProfile();
    if (!saved) return [];
    const all = getLocalSubmissions();
    return all
      .filter(s => s.reviewerName.trim().toLowerCase() === saved.name.trim().toLowerCase())
      .map(s => s.caseId);
  });

  // Listen to browser navigation (back / forward buttons)
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigateTo = (path: string) => {
    if (window.location.pathname !== path) {
      window.history.pushState(null, "", path);
    }
    setCurrentPath(path);
  };

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

  const handleStartReview = async (profile: ReviewerProfile) => {
    saveReviewerProfile(profile);
    setReviewer(profile);

    // Sync cloud progress into local storage if any
    const syncRes = await fetchAndSyncReviewerProgress(profile.name);
    const completed = syncRes.caseIds;
    setCompletedCaseIds(completed);

    // Find the first unfinished case (e.g. index 0, 1, 2, or 3)
    const firstIncompleteIdx = SANITIZED_TEST_CASES.findIndex(
      c => !completed.includes(c.caseId)
    );

    if (firstIncompleteIdx >= 0) {
      // Go directly to the first case that has not been submitted yet
      setCurrentCaseIndex(firstIncompleteIdx);
      setIsFinished(false);
    } else if (completed.length >= SANITIZED_TEST_CASES.length) {
      // All cases already completed! Show the summary page with options to review/edit
      setCurrentCaseIndex(0);
      setIsFinished(true);
    } else {
      setCurrentCaseIndex(0);
      setIsFinished(false);
    }
  };

  const handleLogout = () => {
    if (isFormDirtyRef.current) {
      const confirmLeave = window.confirm(
        "Perubahan penilaian pada kasus ini belum disimpan. Apakah Anda yakin ingin keluar? Perubahan yang belum disimpan akan hilang."
      );
      if (!confirmLeave) return;
    } else if (!window.confirm("Apakah Anda yakin ingin keluar atau mengganti nama penilai?")) {
      return;
    }

    setIsFormDirty(false);
    clearReviewerProfile();
    setReviewer(null);
    setIsFinished(false);
    setCurrentCaseIndex(0);
  };

  // Navigasi manual yang dipicu pengguna (Navbar tab, tombol Kembali)
  const handleCaseChange = useCallback((index: number) => {
    if (index === currentCaseIndex) return;

    if (isFormDirtyRef.current) {
      const confirmLeave = window.confirm(
        "Perubahan penilaian pada kasus ini belum disimpan. Apakah Anda yakin ingin berpindah kasus? Perubahan yang belum disimpan akan hilang."
      );
      if (!confirmLeave) return;
    }

    setIsFormDirty(false);
    if (index >= 0 && index < SANITIZED_TEST_CASES.length) {
      setCurrentCaseIndex(index);
      setIsFinished(false);
    }
  }, [currentCaseIndex, setIsFormDirty]);

  // Navigasi eksplisit setelah penyimpanan berhasil atau lanjut lokal (tanpa konfirmasi form dirty)
  const handlePostSaveAdvance = useCallback(() => {
    setIsFormDirty(false);
    if (currentCaseIndex < SANITIZED_TEST_CASES.length - 1) {
      setCurrentCaseIndex(prev => prev + 1);
      setIsFinished(false);
    } else {
      setIsFinished(true);
    }
  }, [currentCaseIndex, setIsFormDirty]);

  const handleOpenAdmin = () => {
    if (isFormDirtyRef.current) {
      const confirmLeave = window.confirm(
        "Perubahan penilaian pada kasus ini belum disimpan. Apakah Anda yakin ingin membuka halaman rekap admin? Perubahan yang belum disimpan akan hilang."
      );
      if (!confirmLeave) return;
    }
    setIsFormDirty(false);
    navigateTo("/admin");
  };

  // If user visits /admin or /admin/
  if (currentPath === "/admin" || currentPath.startsWith("/admin/")) {
    return (
      <div className="app-root-layout">
        <AdminView
          cases={SANITIZED_TEST_CASES}
          onClose={() => navigateTo("/")}
        />
      </div>
    );
  }

  return (
    <div className="app-root-layout">
      {/* Top Application Navigation */}
      <Navbar
        reviewer={reviewer}
        onLogout={handleLogout}
        onOpenAdmin={handleOpenAdmin}
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
            onPostSaveAdvance={handlePostSaveAdvance}
            onRefreshCompleted={() => refreshCompletedCases()}
            onOpenGuide={() => setIsGuideOpen(true)}
            onDirtyChange={setIsFormDirty}
          />
        )}
      </main>

      {/* CVSS v3.1 Assessment Guide Modal */}
      <AssessmentGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />
    </div>
  );
};

export default App;
