import React, { useState, useEffect, useCallback } from "react";
import type { ReviewerProfile, TestCaseDossier } from "../types";
import { getLocalSubmissions, exportToCsv, getSupabaseClient, saveSubmission } from "../lib/storage";
import {
  RotateCcw,
  FileSpreadsheet,
  RefreshCw,
  AlertTriangle,
  CheckCircle2
} from "lucide-react";

interface ThankYouViewProps {
  reviewer: ReviewerProfile;
  cases: TestCaseDossier[];
  onReviewAgain: () => void;
}

export const ThankYouView: React.FC<ThankYouViewProps> = ({
  reviewer,
  cases,
  onReviewAgain
}) => {
  const allSubmissions = getLocalSubmissions();
  const mySubmissions = allSubmissions.filter(
    s => s.reviewerName.trim().toLowerCase() === reviewer.name.trim().toLowerCase()
  );

  const [cloudSyncedCaseIds, setCloudSyncedCaseIds] = useState<string[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string>("");

  const refreshCloudStatus = useCallback(async () => {
    const client = getSupabaseClient();
    if (!client) return;

    try {
      const { data } = await client
        .from("cvss_reviews")
        .select("case_id")
        .ilike("reviewer_name", reviewer.name.trim());

      if (data) {
        setCloudSyncedCaseIds(data.map(d => d.case_id));
      }
    } catch {
      // offline or not reachable
    }
  }, [reviewer.name]);

  useEffect(() => {
    let mounted = true;
    const client = getSupabaseClient();
    if (!client) return;

    client
      .from("cvss_reviews")
      .select("case_id")
      .ilike("reviewer_name", reviewer.name.trim())
      .then(
        ({ data }) => {
          if (mounted && data) {
            setCloudSyncedCaseIds(data.map(d => d.case_id));
          }
        },
        () => {
          // ignore offline / network error
        }
      );

    return () => {
      mounted = false;
    };
  }, [reviewer.name]);

  const handleRetryAllSync = async () => {
    setIsSyncing(true);
    setSyncFeedback("");
    let synced = 0;

    for (const sub of mySubmissions) {
      const res = await saveSubmission(sub);
      if (res.cloudSynced) synced++;
    }

    await refreshCloudStatus();
    setIsSyncing(false);

    if (synced === mySubmissions.length) {
      setSyncFeedback("Seluruh penilaian berhasil dikirim ke server.");
    } else {
      setSyncFeedback(`Berhasil mengirim ${synced} dari ${mySubmissions.length} kasus ke server.`);
    }
  };

  const handleDownloadCsv = () => {
    const csv = exportToCsv(mySubmissions);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `CVSS_Penilaian_${reviewer.name.replace(/\s+/g, "_")}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const hasUnsynced = mySubmissions.some(s => !cloudSyncedCaseIds.includes(s.caseId));

  return (
    <div className="thankyou-view-container">
      <div className="thankyou-card">
        <div className="thankyou-header">
          <h2 className="thankyou-title">Penilaian selesai</h2>
          <p className="thankyou-subtitle">
            Terima kasih atas penilaian Anda, <strong>{reviewer.name}</strong>
            {reviewer.roleOrAffiliation ? ` (${reviewer.roleOrAffiliation})` : ""}.
          </p>
        </div>

        {/* Sync Status Notice if needed */}
        {hasUnsynced && (
          <div className="unsynced-notice-banner">
            <div className="unsynced-notice-content">
              <AlertTriangle size={16} className="text-amber shrink-0" />
              <span>
                Sebagian penilaian Anda saat ini tersimpan di browser perangkat ini dan belum masuk ke server database peneliti.
              </span>
            </div>
            <button
              type="button"
              className="btn-retry-cloud"
              onClick={handleRetryAllSync}
              disabled={isSyncing}
            >
              <RefreshCw size={13} className={isSyncing ? "animate-spin" : ""} />
              <span>Kirim ulang ke server</span>
            </button>
          </div>
        )}

        {syncFeedback && (
          <div className="status-toast-banner status-success mt-2">
            <div className="status-toast-content">
              <CheckCircle2 size={16} className="text-emerald shrink-0" />
              <span className="status-toast-text">{syncFeedback}</span>
            </div>
          </div>
        )}

        <div className="submissions-summary-table-box">
          <div className="table-header-title">
            <span>Ringkasan penilaian</span>
          </div>

          <div className="table-responsive">
            <table className="summary-table">
              <thead>
                <tr>
                  <th>Kasus</th>
                  <th>Aplikasi</th>
                  <th>Kontrol</th>
                  <th>Skor</th>
                  <th>Keparahan</th>
                  <th>Vector string</th>
                  <th>Status pengiriman</th>
                </tr>
              </thead>
              <tbody>
                {cases.map(c => {
                  const sub = mySubmissions.find(s => s.caseId === c.caseId);
                  const isSynced = cloudSyncedCaseIds.includes(c.caseId);

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
                          {sub ? sub.severity.toUpperCase() : "Belum diisi"}
                        </span>
                      </td>
                      <td>
                        <code className="vector-mini">{sub ? sub.vectorString : "-"}</code>
                      </td>
                      <td>
                        {sub ? (
                          isSynced ? (
                            <span className="sync-status-badge synced">Terkirim ke server</span>
                          ) : (
                            <span className="sync-status-badge local">Tersimpan di perangkat</span>
                          )
                        ) : (
                          <span className="text-muted text-xs">-</span>
                        )}
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
            <RotateCcw size={15} />
            <span>Tinjau kembali kasus 1</span>
          </button>

          <button type="button" className="btn-primary" onClick={handleDownloadCsv}>
            <FileSpreadsheet size={15} />
            <span>Unduh CSV</span>
          </button>
        </div>
      </div>
    </div>
  );
};
