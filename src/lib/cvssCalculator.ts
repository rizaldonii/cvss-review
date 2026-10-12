import type {
  AttackVector,
  AttackComplexity,
  PrivilegesRequired,
  UserInteraction,
  Scope,
  ImpactMetric,
  CVSSv31Metrics,
  CVSSCalculationResult,
  SeverityRating
} from "../types";

/**
 * Official FIRST CVSS v3.1 RoundUp function
 * Reference: Section 7.4 of CVSS v3.1 Specification:
 * "The Round up function is defined as the smallest number,
 * specified to one decimal place, that is greater than or equal to the input."
 */
export function roundUp(input: number): number {
  const intInput = Math.round(input * 100000);
  if (intInput % 10000 === 0) {
    return intInput / 100000;
  }
  return (Math.floor(intInput / 10000) + 1) / 10;
}

export const WEIGHT_AV: Record<AttackVector, number> = {
  N: 0.85,
  A: 0.62,
  L: 0.55,
  P: 0.2
};

export const WEIGHT_AC: Record<AttackComplexity, number> = {
  L: 0.77,
  H: 0.44
};

export const WEIGHT_UI: Record<UserInteraction, number> = {
  N: 0.85,
  R: 0.62
};

export const WEIGHT_PR: Record<Scope, Record<PrivilegesRequired, number>> = {
  U: { N: 0.85, L: 0.62, H: 0.27 },
  C: { N: 0.85, L: 0.68, H: 0.50 }
};

export const WEIGHT_IMPACT: Record<ImpactMetric, number> = {
  N: 0.0,
  L: 0.22,
  H: 0.56
};

export function getSeverityRating(score: number): SeverityRating {
  if (score === 0.0) return "None";
  if (score <= 3.9) return "Low";
  if (score <= 6.9) return "Medium";
  if (score <= 8.9) return "High";
  return "Critical";
}

/**
 * Calculates CVSS v3.1 Base Score, Sub-Scores, and Vector String
 */
export function calculateCVSSv31(metrics: Partial<CVSSv31Metrics>): CVSSCalculationResult {
  const isComplete = Boolean(
    metrics.AV &&
    metrics.AC &&
    metrics.PR &&
    metrics.UI &&
    metrics.S &&
    metrics.C &&
    metrics.I &&
    metrics.A
  );

  if (!isComplete) {
    // Generate partial vector
    const vectorParts: string[] = ["CVSS:3.1"];
    if (metrics.AV) vectorParts.push(`AV:${metrics.AV}`);
    if (metrics.AC) vectorParts.push(`AC:${metrics.AC}`);
    if (metrics.PR) vectorParts.push(`PR:${metrics.PR}`);
    if (metrics.UI) vectorParts.push(`UI:${metrics.UI}`);
    if (metrics.S) vectorParts.push(`S:${metrics.S}`);
    if (metrics.C) vectorParts.push(`C:${metrics.C}`);
    if (metrics.I) vectorParts.push(`I:${metrics.I}`);
    if (metrics.A) vectorParts.push(`A:${metrics.A}`);

    return {
      baseScore: 0.0,
      severity: "None",
      vectorString: vectorParts.join("/"),
      impactSubScore: 0.0,
      exploitabilitySubScore: 0.0,
      isComplete: false
    };
  }

  const av = metrics.AV as AttackVector;
  const ac = metrics.AC as AttackComplexity;
  const pr = metrics.PR as PrivilegesRequired;
  const ui = metrics.UI as UserInteraction;
  const s = metrics.S as Scope;
  const c = metrics.C as ImpactMetric;
  const i = metrics.I as ImpactMetric;
  const a = metrics.A as ImpactMetric;

  // 1. Calculate ISS (Impact Sub-Score)
  const cWeight = WEIGHT_IMPACT[c];
  const iWeight = WEIGHT_IMPACT[i];
  const aWeight = WEIGHT_IMPACT[a];

  const iss = 1.0 - ((1.0 - cWeight) * (1.0 - iWeight) * (1.0 - aWeight));

  // 2. Calculate Impact
  let impact = 0.0;
  if (s === "U") {
    impact = 6.42 * iss;
  } else {
    impact = 7.52 * (iss - 0.029) - 3.25 * Math.pow(iss - 0.02, 15);
  }

  // 3. Calculate Exploitability
  const exploitability =
    8.22 *
    WEIGHT_AV[av] *
    WEIGHT_AC[ac] *
    WEIGHT_PR[s][pr] *
    WEIGHT_UI[ui];

  // 4. Calculate Base Score
  let baseScore = 0.0;
  if (impact <= 0) {
    baseScore = 0.0;
  } else if (s === "U") {
    baseScore = roundUp(Math.min(impact + exploitability, 10.0));
  } else {
    baseScore = roundUp(Math.min(1.08 * (impact + exploitability), 10.0));
  }

  // Limit to range 0.0 - 10.0 with 1 decimal
  baseScore = Math.max(0.0, Math.min(10.0, Math.round(baseScore * 10) / 10));

  const severity = getSeverityRating(baseScore);
  const vectorString = `CVSS:3.1/AV:${av}/AC:${ac}/PR:${pr}/UI:${ui}/S:${s}/C:${c}/I:${i}/A:${a}`;

  return {
    baseScore,
    severity,
    vectorString,
    impactSubScore: Math.round(impact * 10) / 10,
    exploitabilitySubScore: Math.round(exploitability * 10) / 10,
    isComplete: true
  };
}
