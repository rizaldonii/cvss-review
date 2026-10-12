import { roundUp, calculateCVSSv31 } from "./cvssCalculator.ts";

console.log("=== Running CVSS v3.1 Verification Suite ===");

// Test 1: Official FIRST test vector (Unchanged Scope)
// AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N -> Base Score: 7.5 (High)
const test1 = calculateCVSSv31({
  AV: "N",
  AC: "L",
  PR: "N",
  UI: "N",
  S: "U",
  C: "H",
  I: "N",
  A: "N"
});
console.log(`Test 1 (Single High Impact, Unchanged Scope): Score=${test1.baseScore}, Sev=${test1.severity}`);
if (test1.baseScore === 7.5 && test1.severity === "High") {
  console.log("✓ Test 1 Passed!");
} else {
  console.error("✗ Test 1 Failed! Expected 7.5 High, got", test1);
  process.exit(1);
}

// Test 2: Local exploit with all high impact (Unchanged Scope)
// AV:L/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H -> Base Score: 8.4 (High)
const test2 = calculateCVSSv31({
  AV: "L",
  AC: "L",
  PR: "N",
  UI: "N",
  S: "U",
  C: "H",
  I: "H",
  A: "H"
});
console.log(`Test 2 (Local Exploit, Full Impact): Score=${test2.baseScore}, Sev=${test2.severity}`);
if (test2.baseScore === 8.4 && test2.severity === "High") {
  console.log("✓ Test 2 Passed!");
} else {
  console.error("✗ Test 2 Failed! Expected 8.4 High, got", test2);
  process.exit(1);
}

// Test 3: Changed Scope Critical Vector
// AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H -> Base Score: 10.0 (Critical)
const test3 = calculateCVSSv31({
  AV: "N",
  AC: "L",
  PR: "N",
  UI: "N",
  S: "C",
  C: "H",
  I: "H",
  A: "H"
});
console.log(`Test 3 (Changed Scope Maximum): Score=${test3.baseScore}, Sev=${test3.severity}`);
if (test3.baseScore === 10.0 && test3.severity === "Critical") {
  console.log("✓ Test 3 Passed!");
} else {
  console.error("✗ Test 3 Failed! Expected 10.0 Critical, got", test3);
  process.exit(1);
}

// Test 4: Low severity vector
// AV:P/AC:H/PR:H/UI:R/S:U/C:L/I:N/A:N -> Base Score: 1.6 (Low)
const test4 = calculateCVSSv31({
  AV: "P",
  AC: "H",
  PR: "H",
  UI: "R",
  S: "U",
  C: "L",
  I: "N",
  A: "N"
});
console.log(`Test 4 (Physical High Complexity): Score=${test4.baseScore}, Sev=${test4.severity}`);
if (test4.baseScore === 1.6 && test4.severity === "Low") {
  console.log("✓ Test 4 Passed!");
} else {
  console.error("✗ Test 4 Failed! Expected 1.6 Low, got", test4);
  process.exit(1);
}

// Test 5: Zero Impact vector -> Score: 0.0 (None)
const test5 = calculateCVSSv31({
  AV: "N",
  AC: "L",
  PR: "N",
  UI: "N",
  S: "U",
  C: "N",
  I: "N",
  A: "N"
});
console.log(`Test 5 (Zero Impact): Score=${test5.baseScore}, Sev=${test5.severity}`);
if (test5.baseScore === 0.0 && test5.severity === "None") {
  console.log("✓ Test 5 Passed!");
} else {
  console.error("✗ Test 5 Failed! Expected 0.0 None, got", test5);
  process.exit(1);
}

console.log("\nAll 5 CVSS v3.1 test vectors PASSED with 100% precision!");
