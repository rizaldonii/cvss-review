import React, { useState } from "react";
import type { TestCaseDossier, EvidenceImage } from "../types";
import {
  ShieldAlert,
  FileCode,
  Terminal,
  Activity,
  Layers,
  ExternalLink,
  Copy,
  Check,
  Image as ImageIcon,
  ZoomIn,
  X
} from "lucide-react";

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
          <span className="method-badge">
            <Activity size={12} className="inline-icon" /> {testCase.testMethod}
          </span>
          <span className="masvs-badge">
            <Layers size={12} className="inline-icon" /> {testCase.masvsCategory}
          </span>
          {testCase.isOverlappingControl && (
            <span className="overlap-badge" title="Kontrol ini gagal pada kedua aplikasi (App-A dan App-B)">
              Overlapping Control
            </span>
          )}
        </div>

        <h2 className="finding-title">{testCase.findingTitle}</h2>
        <div className="control-reference">
          Ref: <strong>{testCase.controlId}</strong> (OWASP MASTG Mobile Security Testing Guide)
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

      {/* Root Cause Analysis */}
      <div className="section-card">
        <div className="section-title-row">
          <ShieldAlert size={16} className="text-warning" />
          <h3 className="section-heading">Deskripsi &amp; Akar Masalah (Root Cause)</h3>
        </div>
        <p className="root-cause-text">{testCase.rootCause}</p>
      </div>

      {/* Step-by-Step Reproduction (PoC) */}
      <div className="section-card">
        <div className="section-title-row">
          <Terminal size={16} className="text-accent" />
          <h3 className="section-heading">Langkah Pembuktian Nyata (Proof of Concept)</h3>
        </div>
        <div className="steps-list">
          {testCase.stepByStepReproduction.map(step => (
            <div key={step.stepNumber} className="step-item">
              <div className="step-num-bubble">{step.stepNumber}</div>
              <div className="step-content">
                <div className="step-desc">{step.description}</div>
                {step.commandOrAction && (
                  <div className="step-command-box">
                    <code>{step.commandOrAction}</code>
                  </div>
                )}
                <div className="step-evidence">
                  <span className="evidence-tag">Hasil Pengamatan:</span> {step.observedEvidence}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Screenshot / Visual Evidence Gallery */}
      {testCase.images && testCase.images.length > 0 && (
        <div className="section-card">
          <div className="section-title-row">
            <ImageIcon size={16} className="text-accent" />
            <h3 className="section-heading">Bukti Visual Screenshot Pengujian</h3>
          </div>
          <div className="evidence-images-grid">
            {testCase.images.map((img, iIdx) => (
              <div
                key={iIdx}
                className="evidence-image-card"
                onClick={() => setActiveImageZoom(img)}
                title="Klik untuk memperbesar gambar"
              >
                <div className="image-preview-wrapper">
                  <img src={img.url} alt={img.caption} className="evidence-img" />
                  <div className="image-zoom-overlay">
                    <ZoomIn size={20} />
                    <span>Perbesar Gambar</span>
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

      {/* Operational Impact Analysis */}
      <div className="section-card">
        <div className="section-title-row">
          <Activity size={16} className="text-danger" />
          <h3 className="section-heading">Dampak Operasional (Operational Impact)</h3>
        </div>
        <div className="impact-grid">
          <div className="impact-box">
            <span className="impact-box-label">Aktor Ancaman (Threat Actor):</span>
            <p className="impact-box-val">{testCase.operationalImpact.threatActor}</p>
          </div>
          <div className="impact-box">
            <span className="impact-box-label">Prasyarat Eksploitasi:</span>
            <p className="impact-box-val">{testCase.operationalImpact.prerequisites}</p>
          </div>
          <div className="impact-box full-width">
            <span className="impact-box-label">Konsekuensi Dampak terhadap Data &amp; Sistem:</span>
            <p className="impact-box-val danger-text">{testCase.operationalImpact.consequences}</p>
          </div>
        </div>
      </div>

      {/* Raw Evidence / Logcat / Decompiled Code Viewer */}
      {testCase.evidenceSnippets && testCase.evidenceSnippets.length > 0 && (
        <div className="section-card">
          <div className="section-title-row">
            <FileCode size={16} className="text-accent" />
            <h3 className="section-heading">Cuplikan Bukti Teks Teknis (Log / Kode)</h3>
          </div>
          {testCase.evidenceSnippets.map((snippet, sIdx) => (
            <div key={sIdx} className="evidence-block">
              <div className="evidence-header">
                <span className="evidence-filename">{snippet.title}</span>
                <button
                  type="button"
                  className="copy-evidence-btn"
                  onClick={() => copyCode(snippet.content, sIdx)}
                  title="Salin cuplikan teks"
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

      {/* Image Zoom Lightbox Modal */}
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
                <X size={20} />
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
