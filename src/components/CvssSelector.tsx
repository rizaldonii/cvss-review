import React, { useState, useRef } from "react";
import type { CVSSv31Metrics, MetricOptionDefinition } from "../types";
import { CVSS_METRIC_DEFINITIONS } from "../data/cvssTooltips";
import { MetricTooltip } from "./MetricTooltip";
import { HelpCircle } from "lucide-react";

interface CvssSelectorProps {
  metrics: CVSSv31Metrics;
  onChange: (metricKey: keyof CVSSv31Metrics, value: any) => void;
}

export const CvssSelector: React.FC<CvssSelectorProps> = ({ metrics, onChange }) => {
  const [activeTooltip, setActiveTooltip] = useState<{
    metricKey: keyof CVSSv31Metrics;
    metricName: string;
    option: MetricOptionDefinition;
    targetRect: DOMRect;
  } | null>(null);

  const hoverTimeoutRef = useRef<number | null>(null);

  const groups: {
    categoryKey: "exploitability" | "scope" | "impact";
    badgeText: string;
    title: string;
    description: string;
    metrics: (keyof CVSSv31Metrics)[];
  }[] = [
    {
      categoryKey: "exploitability",
      badgeText: "Eksploitabilitas",
      title: "1. Metrik Eksploitabilitas (Exploitability)",
      description: "Karakteristik teknis dan kemudahan eksploitasi kerentanan",
      metrics: ["AV", "AC", "PR", "UI"]
    },
    {
      categoryKey: "scope",
      badgeText: "Cakupan",
      title: "2. Metrik Cakupan (Scope)",
      description: "Dampak terhadap otoritas keamanan di luar aplikasi mobile",
      metrics: ["S"]
    },
    {
      categoryKey: "impact",
      badgeText: "Dampak",
      title: "3. Metrik Dampak (Impact)",
      description: "Konsekuensi terhadap kerahasiaan, integritas, dan ketersediaan",
      metrics: ["C", "I", "A"]
    }
  ];

  const handleOpenTooltip = (
    metricKey: keyof CVSSv31Metrics,
    metricName: string,
    option: MetricOptionDefinition,
    el: HTMLElement,
    immediate = false
  ) => {
    if (hoverTimeoutRef.current) {
      window.clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }

    const openFn = () => {
      setActiveTooltip({
        metricKey,
        metricName,
        option,
        targetRect: el.getBoundingClientRect()
      });
    };

    if (immediate) {
      openFn();
    } else {
      hoverTimeoutRef.current = window.setTimeout(openFn, 180);
    }
  };

  const handleCloseTooltip = () => {
    if (hoverTimeoutRef.current) {
      window.clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setActiveTooltip(null);
  };

  const handleToggleTooltip = (
    metricKey: keyof CVSSv31Metrics,
    metricName: string,
    option: MetricOptionDefinition,
    el: HTMLElement
  ) => {
    if (
      activeTooltip &&
      activeTooltip.metricKey === metricKey &&
      activeTooltip.option.code === option.code
    ) {
      handleCloseTooltip();
    } else {
      handleOpenTooltip(metricKey, metricName, option, el, true);
    }
  };

  return (
    <div className="cvss-selector-wrapper">
      {groups.map((group, gIdx) => (
        <div key={gIdx} className={`metric-group-card group-${group.categoryKey}`}>
          <div className="metric-group-header">
            <div className="metric-group-title-row">
              <span className={`category-tag-badge tag-${group.categoryKey}`}>
                {group.badgeText}
              </span>
              <h4 className="metric-group-title">{group.title}</h4>
            </div>
            <span className="metric-group-desc">{group.description}</span>
          </div>

          <div className="metrics-list">
            {group.metrics.map(metricKey => {
              const def = CVSS_METRIC_DEFINITIONS[metricKey];
              const currentValue = metrics[metricKey];

              return (
                <div key={metricKey} className="metric-row-container">
                  <div className="metric-row">
                    <div className="metric-label-area">
                      <div className="metric-name-group">
                        <span className="metric-chip">{metricKey}</span>
                        <span className="metric-name">{def.name}</span>
                      </div>
                    </div>

                    <div className="metric-buttons-grid">
                      {def.options.map(opt => {
                        const isSelected = currentValue === opt.code;
                        const isTooltipOpen =
                          activeTooltip?.metricKey === metricKey &&
                          activeTooltip?.option.code === opt.code;

                        return (
                          <div
                            key={opt.code}
                            className={`metric-option-cell ${isSelected ? "selected" : ""}`}
                          >
                            <button
                              type="button"
                              className={`metric-option-btn ${isSelected ? "selected" : ""}`}
                              onClick={() => onChange(metricKey, opt.code)}
                              onMouseEnter={e =>
                                handleOpenTooltip(metricKey, def.name, opt, e.currentTarget)
                              }
                              onMouseLeave={handleCloseTooltip}
                              onFocus={e =>
                                handleOpenTooltip(metricKey, def.name, opt, e.currentTarget, true)
                              }
                              onBlur={handleCloseTooltip}
                              title={`${opt.badge}: ${opt.label}`}
                            >
                              <span className="opt-badge">{opt.badge}</span>
                              <span className="opt-label">{opt.label}</span>
                            </button>

                            <button
                              type="button"
                              className={`opt-info-icon-btn ${isTooltipOpen ? "active" : ""}`}
                              onClick={e => {
                                e.stopPropagation();
                                handleToggleTooltip(metricKey, def.name, opt, e.currentTarget);
                              }}
                              title={`Lihat penjelasan metrik ${opt.badge} (${opt.label})`}
                              aria-label={`Penjelasan ${opt.label}`}
                            >
                              <HelpCircle size={13} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Floating Viewport-Aware Tooltip Portal */}
      <MetricTooltip
        isOpen={Boolean(activeTooltip)}
        onClose={handleCloseTooltip}
        targetRect={activeTooltip?.targetRect || null}
        metricName={activeTooltip?.metricName || ""}
        metricKey={activeTooltip?.metricKey || ""}
        option={activeTooltip?.option || null}
      />
    </div>
  );
};
