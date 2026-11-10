export type AttackVector = "N" | "A" | "L" | "P";
export type AttackComplexity = "L" | "H";
export type PrivilegesRequired = "N" | "L" | "H";
export type UserInteraction = "N" | "R";
export type Scope = "U" | "C";
export type ImpactMetric = "N" | "L" | "H";

export interface CVSSv31Metrics {
  AV: AttackVector | null;
  AC: AttackComplexity | null;
  PR: PrivilegesRequired | null;
  UI: UserInteraction | null;
  S: Scope | null;
  C: ImpactMetric | null;
  I: ImpactMetric | null;
  A: ImpactMetric | null;
}

export type SeverityRating = "None" | "Low" | "Medium" | "High" | "Critical";

export interface CVSSCalculationResult {
  baseScore: number;
  severity: SeverityRating;
  vectorString: string;
  impactSubScore: number;
  exploitabilitySubScore: number;
  isComplete: boolean;
}

export interface MetricOptionDefinition {
  code: string;
  label: string;
  badge: string;
  guidanceText: string;
  mobileEvaluationContext: string;
  firstOfficialText?: string;
}

export interface MetricDefinition {
  metricId: keyof CVSSv31Metrics;
  name: string;
  category: "Exploitability" | "Scope" | "Impact";
  description: string;
  options: MetricOptionDefinition[];
}

export interface StepReproduction {
  stepNumber: number;
  testCaseRef?: string; // e.g. "MASTG-TEST-0203 (DAST)" or "MASTG-TEST-0231 (SAST)"
  description: string;
  commandOrAction: string;
  observedEvidence: string;
}

export interface EvidenceSnippet {
  title: string;
  testCaseRef?: string;
  language: "bash" | "xml" | "json" | "plaintext";
  content: string;
}

export interface EvidenceImage {
  caption: string;
  url: string;
  testCaseRef?: string;
}

export interface TestCaseDossier {
  caseId: string; // "CASE-01" | "CASE-02" | "CASE-03" | "CASE-04"
  targetApp: "App-A" | "App-B";
  targetAppNameSanitized: string; // e.g. "App-A (Aplikasi Mahasiswa)"
  controlId: string; // e.g. "MASTG-TEST-0287" or "MASTG-TEST-0203 + MASTG-TEST-0231"
  masvsCategory: "MASVS-STORAGE" | "MASVS-NETWORK" | "MASVS-CODE";
  testMethod: "SAST" | "DAST" | "DAST & SAST" | "SAST & DAST";
  isOverlappingControl: boolean;
  weaknessTaxonomy: {
    cweId: string;
    cweTitle: string;
    masweId: string;
    masweTitle: string;
  };
  findingTitle: string;
  rootCause: string;
  stepByStepReproduction: StepReproduction[];
  operationalImpact: {
    threatActor: string;
    prerequisites: string;
    consequences: string;
  };
  evidenceSnippets: EvidenceSnippet[];
  images?: EvidenceImage[];
}

export interface ReviewerProfile {
  name: string;
  roleOrAffiliation: string;
  startedAt: string;
}

export interface CaseEvaluationSubmission {
  id: string;
  caseId: string;
  reviewerName: string;
  reviewerRole: string;
  reviewerSessionId?: string;
  version?: string; // "v2" for the 4-case dataset
  metrics: {
    AV: AttackVector;
    AC: AttackComplexity;
    PR: PrivilegesRequired;
    UI: UserInteraction;
    S: Scope;
    C: ImpactMetric;
    I: ImpactMetric;
    A: ImpactMetric;
  };
  baseScore: number;
  severity: SeverityRating;
  vectorString: string;
  justification: string;
  submittedAt: string;
}

export interface SupabaseConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
}
