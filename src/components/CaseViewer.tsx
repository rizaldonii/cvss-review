import React, { useState } from "react";
import type { TestCaseDossier, EvidenceImage } from "../types";
import { ExternalLink, Copy, Check, ZoomIn, X } from "lucide-react";

interface CaseViewerProps {
  testCase: TestCaseDossier;
  currentIndex: number;
  totalCases: number;
}

export const CaseViewer: React.FC<CaseViewerProps> = ({
  testCase,
  currentIndex,
  totalCases
}) => {
  const [copiedSnippet, setCopiedSnippet] = useState<number | null>(null);
  const [activeImageZoom, setActiveImageZoom] = useState<EvidenceImage | null>(null);

  const copyCode = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(idx);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  return (
    <div className="case-viewer-container">
      {/* Top Header Card */}
      <div className="case-header-card">
        <div className="case-badge-row">
          <span className="case-id-badge">
            {testCase.caseId} ({currentIndex + 1} dari {totalCases})
          </span>
          <span className={`target-app-badge ${testCase.targetApp === "App-A" ? "app-a" : "app-b"}`}>
            {testCase.targetAppNameSanitized}
          </span>
          <span className="method-badge">{testCase.testMethod}</span>
          <span className="masvs-badge">{testCase.masvsCategory}</span>
        </div>

        <h2 className="finding-title">{testCase.findingTitle}</h2>
        <div className="control-reference">
          Referensi: <strong>{testCase.controlId}</strong> (OWASP MASTG)
        </div>
      </div>

      {/* Weakness Taxonomy Card */}
      <div className="taxonomy-card">
        <div className="taxonomy-item">
          <span className="taxonomy-label">Taksonomi MITRE CWE:</span>
          <a
            href={`https://cwe.mitre.org/data/definitions/${testCase.weaknessTaxonomy.cweId.replace("CWE-", "")}.html`}
            target="_blank"
            rel="noopener noreferrer"
            className="taxonomy-link"
          >
            <strong>{testCase.weaknessTaxonomy.cweId}</strong>: {testCase.weaknessTaxonomy.cweTitle}
            <ExternalLink size={12} className="link-icon" />
          </a>
        </div>
        <div className="taxonomy-item">
          <span className="taxonomy-label">Taksonomi OWASP MASWE:</span>
          <span className="taxonomy-val">
            <strong>{testCase.weaknessTaxonomy.masweId}</strong>: {testCase.weaknessTaxonomy.masweTitle}
          </span>
        </div>
      </div>

      {/* Root Cause / Problem Description */}
      <div className="section-card">
        <h3 className="section-heading">Deskripsi masalah</h3>
        <p className="root-cause-text">{testCase.rootCause}</p>
      </div>

      {/* Step-by-Step Reproduction */}
      <div className="section-card">
        <h3 className="section-heading">Langkah pengujian</h3>
        <div className="steps-list">
          {testCase.stepByStepReproduction.map(step => (
            <div key={step.stepNumber} className="step-item">
              <div className="step-num-bubble">{step.stepNumber}</div>
              <div className="step-content">
                {step.testCaseRef && (
                  <div className="step-ref-row">
                    <span className="step-testcase-badge">{step.testCaseRef}</span>
                  </div>
                )}
                <div className="step-desc">{step.description}</div>
                {step.commandOrAction && (
                  <div className="step-command-box">
                    <code>{step.commandOrAction}</code>
                  </div>
                )}
                <div className="step-evidence">
                  <span className="evidence-tag">Hasil pengamatan:</span> {step.observedEvidence}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Visual Screenshot Gallery */}
      {testCase.images && testCase.images.length > 0 && (
        <div className="section-card">
          <h3 className="section-heading">Tangkapan layar pengujian</h3>
          <div className="evidence-images-grid">
            {testCase.images.map((img, iIdx) => (
              <div
                key={iIdx}
                className="evidence-image-card"
                onClick={() => setActiveImageZoom(img)}
                title="Klik untuk memperbesar gambar"
              >
                {img.testCaseRef && (
                  <div className="image-card-ref-badge">{img.testCaseRef}</div>
                )}
                <div className="image-preview-wrapper">
                  <img src={img.url} alt={img.caption} className="evidence-img" />
                  <div className="image-zoom-overlay">
                    <ZoomIn size={16} />
                    <span>Perbesar</span>
                  </div>
                </div>
                <div className="image-caption-box">
                  <span className="image-caption-text">{img.caption}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Potential Impact Analysis */}
      <div className="section-card">
        <h3 className="section-heading">Dampak potensial</h3>
        <div className="impact-grid">
          <div className="impact-box">
            <span className="impact-box-label">Aktor ancaman</span>
            <p className="impact-box-val">{testCase.operationalImpact.threatActor}</p>
          </div>
          <div className="impact-box">
            <span className="impact-box-label">Prasyarat</span>
            <p className="impact-box-val">{testCase.operationalImpact.prerequisites}</p>
          </div>
          <div className="impact-box full-width">
            <span className="impact-box-label">Konsekuensi dampak</span>
            <p className="impact-box-val">{testCase.operationalImpact.consequences}</p>
          </div>
        </div>
      </div>

      {/* Raw Evidence Snippets */}
      {testCase.evidenceSnippets && testCase.evidenceSnippets.length > 0 && (
        <div className="section-card">
          <h3 className="section-heading">Cuplikan log dan kode</h3>
          {testCase.evidenceSnippets.map((snippet, sIdx) => (
            <div key={sIdx} className="evidence-block">
              <div className="evidence-header">
                <div className="snippet-title-group">
                  <span className="evidence-filename">{snippet.title}</span>
                  {snippet.testCaseRef && (
                    <span className="snippet-testcase-badge">{snippet.testCaseRef}</span>
                  )}
                </div>
                <button
                  type="button"
                  className="copy-evidence-btn"
                  onClick={() => copyCode(snippet.content, sIdx)}
                  title="Salin teks"
                >
                  {copiedSnippet === sIdx ? (
                    <>
                      <Check size={12} className="text-emerald" /> Tersalin
                    </>
                  ) : (
                    <>
                      <Copy size={12} /> Salin
                    </>
                  )}
                </button>
              </div>
              <pre className="evidence-pre">
                <code>{snippet.content}</code>
              </pre>
            </div>
          ))}
        </div>
      )}

      {/* Image Zoom Modal */}
      {activeImageZoom && (
        <div className="image-lightbox-overlay" onClick={() => setActiveImageZoom(null)}>
          <div className="image-lightbox-content" onClick={e => e.stopPropagation()}>
            <div className="lightbox-header">
              <span className="lightbox-caption">{activeImageZoom.caption}</span>
              <button
                type="button"
                className="lightbox-close-btn"
                onClick={() => setActiveImageZoom(null)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="lightbox-image-container">
              <img
                src={activeImageZoom.url}
                alt={activeImageZoom.caption}
                className="lightbox-image-full"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
