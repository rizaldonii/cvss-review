import React, { useState } from "react";
import type { CVSSCalculationResult } from "../types";
import { Copy, Check } from "lucide-react";

interface ScoreGaugeProps {
  result: CVSSCalculationResult;
}

export const ScoreGauge: React.FC<ScoreGaugeProps> = ({ result }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(result.vectorString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getSeverityBadgeClass = (severity: string) => {
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
            <span className="score-number">{result.isComplete ? result.baseScore.toFixed(1) : "--"}</span>
            <span className="score-max">/ 10.0</span>
          </div>
          <div className="score-info-box">
            <span className="score-title">Skor Dasar CVSS v3.1</span>
            <div className={`severity-badge ${getSeverityBadgeClass(result.severity)}`}>
              <span>{result.isComplete ? result.severity.toUpperCase() : "PILIH SEMUA METRIK"}</span>
            </div>
          </div>
        </div>

        <div className="subscores-box">
          <div className="subscore-item">
            <span className="subscore-label">Impact:</span>
            <span className="subscore-value">{result.isComplete ? result.impactSubScore.toFixed(1) : "-"}</span>
          </div>
          <div className="subscore-item">
            <span className="subscore-label">Exploitability:</span>
            <span className="subscore-value">{result.isComplete ? result.exploitabilitySubScore.toFixed(1) : "-"}</span>
          </div>
        </div>
      </div>

      <div className="vector-string-container">
        <span className="vector-label">Vector String:</span>
        <code className="vector-code">{result.vectorString}</code>
        <button
          type="button"
          onClick={handleCopy}
          className="copy-btn"
          title="Salin Vector String"
          disabled={!result.isComplete}
        >
          {copied ? <Check size={14} className="text-emerald" /> : <Copy size={14} />}
          <span>{copied ? "Tersalin" : "Salin"}</span>
        </button>
      </div>
    </div>
  );
};
