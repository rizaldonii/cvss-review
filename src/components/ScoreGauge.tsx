import React, { useState } from "react";
import type { CVSSCalculationResult } from "../types";
import { Copy, Check, Info } from "lucide-react";

interface ScoreGaugeProps {
  result: CVSSCalculationResult;
  hasJustification?: boolean;
}

export const ScoreGauge: React.FC<ScoreGaugeProps> = ({
  result,
  hasJustification = true
}) => {
  const [copied, setCopied] = useState(false);

  const isReady = result.isComplete && hasJustification;

  const handleCopy = () => {
    if (!isReady) return;
    navigator.clipboard.writeText(result.vectorString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getSeverityBadgeClass = (severity: string) => {
    if (!isReady) return "badge-severity-none";
    switch (severity.toLowerCase()) {
      case "critical":
        return "badge-severity-critical";
      case "high":
        return "badge-severity-high";
      case "medium":
        return "badge-severity-medium";
      case "low":
        return "badge-severity-low";
      default:
        return "badge-severity-none";
    }
  };

  return (
    <div className="score-gauge-card">
      <div className="score-gauge-header">
        <div className="score-main-display">
          <div className="score-value-box">
            <span className="score-number">{isReady ? result.baseScore.toFixed(1) : "--"}</span>
            <span className="score-max">/ 10.0</span>
          </div>
          <div className="score-info-box">
            <span className="score-title">Tingkat Keparahan CVSS v3.1</span>
            <div className={`severity-badge ${getSeverityBadgeClass(result.severity)}`}>
              <span>
                {isReady
                  ? result.severity.toUpperCase()
                  : result.isComplete
                  ? "LENGKAPI ALASAN PENILAIAN"
                  : "LENGKAPI 8 METRIK & ALASAN"}
              </span>
            </div>
          </div>
        </div>

        <div className="subscores-box">
          <div className="subscore-item">
            <span className="subscore-label">Impact:</span>
            <span className="subscore-value">{isReady ? result.impactSubScore.toFixed(1) : "-"}</span>
          </div>
          <div className="subscore-item">
            <span className="subscore-label">Exploitability:</span>
            <span className="subscore-value">{isReady ? result.exploitabilitySubScore.toFixed(1) : "-"}</span>
          </div>
        </div>
      </div>

      <div className="vector-string-container">
        <span className="vector-label">Vector String:</span>
        <code className="vector-code">{isReady ? result.vectorString : "CVSS:3.1/..."}</code>
        <button
          type="button"
          onClick={handleCopy}
          className="copy-btn"
          title="Salin Vector String"
          disabled={!isReady}
        >
          {copied ? <Check size={14} className="text-teal" /> : <Copy size={14} />}
          <span>{copied ? "Tersalin" : "Salin"}</span>
        </button>
      </div>

      {!isReady && (
        <div className="score-gauge-hint-row">
          <Info size={13} className="text-muted shrink-0" />
          <span className="score-gauge-hint-text">
            {!result.isComplete
              ? "Pilih seluruh 8 metrik CVSS dan isi alasan penilaian untuk menghitung skor dasar secara independen."
              : "Tuliskan alasan penilaian Anda di bawah untuk mengaktifkan perhitungan skor dan vektor CVSS."}
          </span>
        </div>
      )}
    </div>
  );
};
