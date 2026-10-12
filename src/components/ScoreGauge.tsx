import React, { useState } from "react";
import type { CVSSCalculationResult } from "../types";
import { Copy, Check, ShieldAlert, ShieldCheck } from "lucide-react";

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

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case "Critical":
        return {
          bg: "var(--sev-critical-bg)",
          text: "var(--sev-critical-text)",
          border: "var(--sev-critical-border)",
          glow: "0 0 15px rgba(239, 68, 68, 0.4)"
        };
      case "High":
        return {
          bg: "var(--sev-high-bg)",
          text: "var(--sev-high-text)",
          border: "var(--sev-high-border)",
          glow: "0 0 15px rgba(249, 115, 22, 0.4)"
        };
      case "Medium":
        return {
          bg: "var(--sev-medium-bg)",
          text: "var(--sev-medium-text)",
          border: "var(--sev-medium-border)",
          glow: "0 0 15px rgba(245, 158, 11, 0.3)"
        };
      case "Low":
        return {
          bg: "var(--sev-low-bg)",
          text: "var(--sev-low-text)",
          border: "var(--sev-low-border)",
          glow: "0 0 15px rgba(16, 185, 129, 0.3)"
        };
      default:
        return {
          bg: "var(--sev-none-bg)",
          text: "var(--sev-none-text)",
          border: "var(--sev-none-border)",
          glow: "none"
        };
    }
  };

  const style = getSeverityStyle(result.severity);

  return (
    <div className="score-gauge-card">
      <div className="score-gauge-header">
        <div className="score-main-display">
          <div className="score-value-box" style={{ borderColor: style.border, boxShadow: style.glow }}>
            <span className="score-number">{result.isComplete ? result.baseScore.toFixed(1) : "--"}</span>
            <span className="score-max">/ 10.0</span>
          </div>
          <div className="score-info-box">
            <span className="score-title">CVSS v3.1 Base Score</span>
            <div className="severity-badge" style={{ backgroundColor: style.bg, color: style.text, borderColor: style.border }}>
              {result.severity === "Critical" || result.severity === "High" ? (
                <ShieldAlert size={14} className="badge-icon" />
              ) : (
                <ShieldCheck size={14} className="badge-icon" />
              )}
              <span>{result.isComplete ? result.severity.toUpperCase() : "PILIH SEMUA METRIK"}</span>
            </div>
          </div>
        </div>

        <div className="subscores-box">
          <div className="subscore-item">
            <span className="subscore-label">Impact Sub-score:</span>
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
