import React, { useState } from "react";
import type { CVSSv31Metrics } from "../types";
import { CVSS_METRIC_DEFINITIONS } from "../data/cvssTooltips";
import { HelpCircle, X } from "lucide-react";

interface CvssSelectorProps {
  metrics: CVSSv31Metrics;
  onChange: (metricKey: keyof CVSSv31Metrics, value: any) => void;
}

export const CvssSelector: React.FC<CvssSelectorProps> = ({ metrics, onChange }) => {
  const [expandedMetric, setExpandedMetric] = useState<keyof CVSSv31Metrics | null>(null);

  const groups: {
    title: string;
    description: string;
    metrics: (keyof CVSSv31Metrics)[];
  }[] = [
    {
      title: "1. Metrik Eksploitabilitas (Exploitability)",
      description: "Karakteristik teknis dan kemudahan eksploitasi kerentanan",
      metrics: ["AV", "AC", "PR", "UI"]
    },
    {
      title: "2. Metrik Cakupan (Scope)",
      description: "Dampak terhadap otoritas keamanan di luar aplikasi mobile",
      metrics: ["S"]
    },
    {
      title: "3. Metrik Dampak (Impact)",
      description: "Konsekuensi terhadap kerahasiaan, integritas, dan ketersediaan",
      metrics: ["C", "I", "A"]
    }
  ];

  const toggleExplanation = (metricKey: keyof CVSSv31Metrics) => {
    setExpandedMetric(prev => (prev === metricKey ? null : metricKey));
  };

  return (
    <div className="cvss-selector-wrapper">
      {groups.map((group, gIdx) => (
        <div key={gIdx} className="metric-group-card">
          <div className="metric-group-header">
            <h4 className="metric-group-title">{group.title}</h4>
            <span className="metric-group-desc">{group.description}</span>
          </div>

          <div className="metrics-list">
            {group.metrics.map(metricKey => {
              const def = CVSS_METRIC_DEFINITIONS[metricKey];
              const currentValue = metrics[metricKey];
              const isExpanded = expandedMetric === metricKey;

              return (
                <div key={metricKey} className="metric-row-container">
                  <div className="metric-row">
                    <div className="metric-label-area">
                      <div className="metric-name-group">
                        <span className="metric-name">{def.name}</span>
                        <button
                          type="button"
                          className={`btn-metric-toggle-help ${isExpanded ? "active" : ""}`}
                          onClick={() => toggleExplanation(metricKey)}
                          title={isExpanded ? "Tutup penjelasan" : "Buka penjelasan metrik"}
                          aria-expanded={isExpanded}
                        >
                          <HelpCircle size={13} />
                          <span>{isExpanded ? "Tutup" : "Penjelasan"}</span>
                        </button>
                      </div>
                    </div>

                    <div className="metric-buttons-grid">
                      {def.options.map(opt => {
                        const isSelected = currentValue === opt.code;

                        return (
                          <button
                            key={opt.code}
                            type="button"
                            className={`metric-option-btn ${isSelected ? "selected" : ""}`}
                            onClick={() => onChange(metricKey, opt.code)}
                          >
                            <span className="opt-badge">{opt.badge}</span>
                            <span className="opt-label">{opt.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Inline Explanation Panel - Follows normal document layout flow */}
                  {isExpanded && (
                    <div className="metric-inline-explanation" role="region" aria-label={`Penjelasan ${def.name}`}>
                      <div className="explanation-header">
                        <span className="explanation-title">{def.description}</span>
                        <button
                          type="button"
                          className="explanation-close-btn"
                          onClick={() => setExpandedMetric(null)}
                        >
                          <X size={14} />
                          <span>Tutup</span>
                        </button>
                      </div>

                      <div className="explanation-options-list">
                        {def.options.map(opt => {
                          const isCurrent = currentValue === opt.code;
                          return (
                            <div
                              key={opt.code}
                              className={`explanation-opt-item ${isCurrent ? "is-selected-opt" : ""}`}
                            >
                              <div className="opt-title-line">
                                <span className="opt-tag">{opt.badge}</span>
                                <strong className="opt-name">{opt.label}</strong>
                                {isCurrent && (
                                  <span className="opt-selected-marker">Pilihan saat ini</span>
                                )}
                              </div>
                              <p className="opt-def-text">{opt.firstOfficialText}</p>
                              <p className="opt-ctx-text">
                                <span className="ctx-label">Konteks:</span> {opt.mobileEvaluationContext}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
