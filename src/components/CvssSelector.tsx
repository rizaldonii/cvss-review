import React, { useState } from "react";
import type { CVSSv31Metrics } from "../types";
import { CVSS_METRIC_DEFINITIONS } from "../data/cvssTooltips";
import { Info, HelpCircle } from "lucide-react";

interface CvssSelectorProps {
  metrics: CVSSv31Metrics;
  onChange: (metricKey: keyof CVSSv31Metrics, value: any) => void;
}

interface ActiveTooltip {
  metricId: keyof CVSSv31Metrics;
  code: string;
}

export const CvssSelector: React.FC<CvssSelectorProps> = ({ metrics, onChange }) => {
  const [activeTooltip, setActiveTooltip] = useState<ActiveTooltip | null>(null);

  const groups: {
    title: string;
    description: string;
    metrics: (keyof CVSSv31Metrics)[];
  }[] = [
    {
      title: "1. Exploitability Metrics",
      description: "Tingkat kemudahan dan karakteristik teknis eksploitasi kerentanan",
      metrics: ["AV", "AC", "PR", "UI"]
    },
    {
      title: "2. Scope Metric",
      description: "Dampak terhadap otoritas keamanan sistem di luar komponen mobile",
      metrics: ["S"]
    },
    {
      title: "3. Impact Metrics",
      description: "Tingkat konsekuensi langsung terhadap kerahasiaan, integritas, dan ketersediaan",
      metrics: ["C", "I", "A"]
    }
  ];

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

              return (
                <div key={metricKey} className="metric-row">
                  <div className="metric-label-area">
                    <span className="metric-name">{def.name}</span>
                    <span className="metric-help-trigger" title={def.description}>
                      <HelpCircle size={14} />
                    </span>
                  </div>

                  <div className="metric-buttons-grid">
                    {def.options.map(opt => {
                      const isSelected = currentValue === opt.code;
                      const isTooltipOpen =
                        activeTooltip?.metricId === metricKey && activeTooltip?.code === opt.code;

                      return (
                        <div
                          key={opt.code}
                          className="metric-button-container"
                          onMouseEnter={() => setActiveTooltip({ metricId: metricKey, code: opt.code })}
                          onMouseLeave={() => setActiveTooltip(null)}
                        >
                          <button
                            type="button"
                            className={`metric-option-btn ${isSelected ? "selected" : ""}`}
                            onClick={() => onChange(metricKey, opt.code)}
                          >
                            <span className="opt-badge">{opt.badge}</span>
                            <span className="opt-label">{opt.label}</span>
                          </button>

                          {/* Hover Tooltip displaying official FIRST + Mobile context */}
                          {isTooltipOpen && (
                            <div className="tooltip-portal" role="tooltip">
                              <div className="tooltip-header">
                                <Info size={14} className="text-accent" />
                                <span className="tooltip-title">
                                  {def.name}: <strong>{opt.label} ({opt.badge})</strong>
                                </span>
                              </div>
                              <div className="tooltip-body">
                                <div className="tooltip-section">
                                  <span className="section-tag">Definisi Resmi FIRST v3.1:</span>
                                  <p className="first-text">{opt.firstOfficialText}</p>
                                </div>
                                <div className="tooltip-section mobile-ctx">
                                  <span className="section-tag">Konteks Pengujian Mobile (OWASP MASVS):</span>
                                  <p className="mobile-text">{opt.mobileEvaluationContext}</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
