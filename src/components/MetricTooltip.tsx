import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { MetricOptionDefinition } from "../types";

interface MetricTooltipProps {
  isOpen: boolean;
  onClose: () => void;
  targetRect: DOMRect | null;
  metricName: string;
  metricKey: string;
  option: MetricOptionDefinition | null;
}

export const MetricTooltip: React.FC<MetricTooltipProps> = ({
  isOpen,
  onClose,
  targetRect,
  metricName,
  metricKey,
  option
}) => {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number; placement: "top" | "bottom" }>({
    top: 0,
    left: 0,
    placement: "top"
  });

  useEffect(() => {
    if (!isOpen || !targetRect || !option) return;

    const updatePosition = () => {
      const tooltipEl = tooltipRef.current;
      const tooltipWidth = tooltipEl ? tooltipEl.offsetWidth : 320;
      const tooltipHeight = tooltipEl ? tooltipEl.offsetHeight : 160;

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Vertical placement calculation: prefer top, flip to bottom if insufficient space above
      let placement: "top" | "bottom" = "top";
      let top = targetRect.top - tooltipHeight - 10;

      if (top < 12) {
        placement = "bottom";
        top = targetRect.bottom + 10;
        // If bottom also overflows viewport, clamp inside
        if (top + tooltipHeight > viewportHeight - 12) {
          top = Math.max(12, viewportHeight - tooltipHeight - 12);
        }
      }

      // Horizontal placement calculation: center horizontally relative to target button
      const targetCenter = targetRect.left + targetRect.width / 2;
      let left = targetCenter - tooltipWidth / 2;

      // Clamp horizontally within viewport margins (12px padding)
      const minLeft = 12;
      const maxLeft = viewportWidth - tooltipWidth - 12;
      left = Math.max(minLeft, Math.min(left, maxLeft));

      setCoords({ top, left, placement });
    };

    updatePosition();

    // Recompute on window resize or scroll
    const handleScrollOrResize = () => {
      onClose(); // Cleanly close on scroll to avoid detached tooltips
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    window.addEventListener("keydown", handleKeyDown);
    // Delay adding click listener to avoid immediately triggering from the click that opened it
    const timer = setTimeout(() => {
      window.addEventListener("mousedown", handleClickOutside);
    }, 50);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, targetRect, option, onClose]);

  if (!isOpen || !targetRect || !option) return null;

  return createPortal(
    <div
      ref={tooltipRef}
      className={`metric-tooltip-portal placement-${coords.placement}`}
      style={{
        position: "fixed",
        top: `${coords.top}px`,
        left: `${coords.left}px`,
        zIndex: 9999
      }}
      role="tooltip"
      aria-live="polite"
    >
      <div className="tooltip-inner-card">
        <div className="tooltip-header-row">
          <span className="tooltip-metric-label">
            {metricName} ({metricKey})
          </span>
          <span className="tooltip-option-badge">
            {option.badge}: {option.label}
          </span>
        </div>

        <div className="tooltip-body-content">
          <p className="tooltip-guidance-text">{option.guidanceText}</p>
          <div className="tooltip-context-box">
            <span className="tooltip-context-label">Konteks Evaluasi:</span>
            <p className="tooltip-context-text">{option.mobileEvaluationContext}</p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

