import type { CVSSv31Metrics, MetricDefinition } from "../types";

export const CVSS_METRIC_DEFINITIONS: Record<keyof CVSSv31Metrics, MetricDefinition> = {
  AV: {
    metricId: "AV",
    name: "Attack Vector (AV)",
    category: "Exploitability",
    description: "Reflects the context and logical proximity by which vulnerability exploitation is possible.",
    options: [
      {
        code: "N",
        label: "Network",
        badge: "N",
        firstOfficialText: "The vulnerable component is bound to the network stack and the set of possible attackers extends beyond the other options up to and including the entire Internet.",
        mobileEvaluationContext: "Exploitable remotely over public cellular or Internet without requiring proximity or shared Wi-Fi."
      },
      {
        code: "A",
        label: "Adjacent",
        badge: "A",
        firstOfficialText: "The vulnerable component is bound to the network stack, but the attack is limited at the protocol level to a logically adjacent topology (e.g. local subnet, Bluetooth, IEEE 802.11).",
        mobileEvaluationContext: "Requires attacker on the same Wi-Fi hotspot / LAN (e.g. MitM cleartext eavesdropping), BLE range, or NFC radius."
      },
      {
        code: "L",
        label: "Local",
        badge: "L",
        firstOfficialText: "The vulnerable component is not bound to the network stack and the attacker's path is via read/write/execute capabilities locally (keyboard, console, local interactive shell, or local apps).",
        mobileEvaluationContext: "Exploitable via ADB shell, another malicious app on the same Android device, or local system log reading."
      },
      {
        code: "P",
        label: "Physical",
        badge: "P",
        firstOfficialText: "The attack requires the attacker to physically touch or manipulate the vulnerable component.",
        mobileEvaluationContext: "Requires physical possession of an unlocked mobile hardware unit."
      }
    ]
  },
  AC: {
    metricId: "AC",
    name: "Attack Complexity (AC)",
    category: "Exploitability",
    description: "Describes the conditions beyond the attacker's control that must exist to exploit the vulnerability.",
    options: [
      {
        code: "L",
        label: "Low",
        badge: "L",
        firstOfficialText: "Specialized access conditions or extenuating circumstances do not exist. An attacker can expect repeatable success against the vulnerable component.",
        mobileEvaluationContext: "Deterministic and easily repeatable; no race condition, custom cryptographic bypass, or unpredictable timing needed."
      },
      {
        code: "H",
        label: "High",
        badge: "H",
        firstOfficialText: "A successful attack depends on conditions outside the attacker's control (e.g. winning a race condition, overcoming advanced ASLR/DEP, or obtaining target-specific secrets).",
        mobileEvaluationContext: "Requires winning race conditions, guessing high-entropy keys, or overcoming non-standard system barriers."
      }
    ]
  },
  PR: {
    metricId: "PR",
    name: "Privileges Required (PR)",
    category: "Exploitability",
    description: "Describes the level of privileges an attacker must possess before successfully exploiting the vulnerability.",
    options: [
      {
        code: "N",
        label: "None",
        badge: "N",
        firstOfficialText: "The attacker is unauthorized prior to attack, and therefore does not require any access to the vulnerable system.",
        mobileEvaluationContext: "No app account, login credentials, or special Android OS permissions needed."
      },
      {
        code: "L",
        label: "Low",
        badge: "L",
        firstOfficialText: "The attacker requires privileges that provide basic user capabilities that could normally affect only settings and files owned by a user.",
        mobileEvaluationContext: "Requires a standard logged-in user account or normal third-party Android application installation."
      },
      {
        code: "H",
        label: "High",
        badge: "H",
        firstOfficialText: "The attacker requires privileges that provide significant control over the vulnerable component (e.g. administrative, root, or device owner).",
        mobileEvaluationContext: "Requires rooted Android device or system-level administrative signatures."
      }
    ]
  },
  UI: {
    metricId: "UI",
    name: "User Interaction (UI)",
    category: "Exploitability",
    description: "Captures the requirement for a legitimate user, other than the attacker, to participate in the compromise.",
    options: [
      {
        code: "N",
        label: "None",
        badge: "N",
        firstOfficialText: "The vulnerable system can be exploited without interaction from any user.",
        mobileEvaluationContext: "Vulnerability triggers passively or can be harvested without user action."
      },
      {
        code: "R",
        label: "Required",
        badge: "R",
        firstOfficialText: "Successful exploitation requires a user to take some action before the vulnerability can be exploited (e.g. tapping a link, navigating to a view).",
        mobileEvaluationContext: "Requires the legitimate victim to open the app, tap a specific menu (e.g. e-KTM page), or click a payload."
      }
    ]
  },
  S: {
    metricId: "S",
    name: "Scope (S)",
    category: "Scope",
    description: "Captures whether a vulnerability in one component impacts resources beyond its security authority.",
    options: [
      {
        code: "U",
        label: "Unchanged",
        badge: "U",
        firstOfficialText: "An exploited vulnerability can only affect resources managed by the same security authority.",
        mobileEvaluationContext: "Impact is strictly confined within the mobile application sandbox and its local data directory."
      },
      {
        code: "C",
        label: "Changed",
        badge: "C",
        firstOfficialText: "An exploited vulnerability can affect resources beyond the security scope managed by the security authority of the vulnerable component.",
        mobileEvaluationContext: "Impact breaches the sandbox to compromise other apps, the underlying Android OS, or remote academic backend databases."
      }
    ]
  },
  C: {
    metricId: "C",
    name: "Confidentiality (C)",
    category: "Impact",
    description: "Measures the impact to the confidentiality of information resources.",
    options: [
      {
        code: "N",
        label: "None",
        badge: "N",
        firstOfficialText: "There is no loss of confidentiality within the impacted component.",
        mobileEvaluationContext: "No sensitive or private data disclosed."
      },
      {
        code: "L",
        label: "Low",
        badge: "L",
        firstOfficialText: "There is some loss of confidentiality. Access to some restricted information is obtained, but the attacker does not have control over what is obtained.",
        mobileEvaluationContext: "Partial disclosure of non-critical metadata, debug strings, or architectural identifiers."
      },
      {
        code: "H",
        label: "High",
        badge: "H",
        firstOfficialText: "There is a total loss of confidentiality, resulting in all resources being divulged, or direct disclosure of critical confidential information.",
        mobileEvaluationContext: "Direct exposure of Personally Identifiable Information (PII), password hashes, or active session authorization tokens."
      }
    ]
  },
  I: {
    metricId: "I",
    name: "Integrity (I)",
    category: "Impact",
    description: "Measures the impact to the trustworthiness and veracity of information.",
    options: [
      {
        code: "N",
        label: "None",
        badge: "N",
        firstOfficialText: "There is no loss of integrity within the impacted component.",
        mobileEvaluationContext: "No data or execution flow can be modified."
      },
      {
        code: "L",
        label: "Low",
        badge: "L",
        firstOfficialText: "Modification of data is possible, but the attacker does not have control over the consequence, or the scope of modification is limited.",
        mobileEvaluationContext: "Attacker can modify non-critical local settings, cache values, or UI flags."
      },
      {
        code: "H",
        label: "High",
        badge: "H",
        firstOfficialText: "There is a total compromise of system integrity. The attacker can modify any/all files, data, or critical system behavior.",
        mobileEvaluationContext: "Attacker can forge academic records, alter attendance, or tamper with core server data using stolen tokens."
      }
    ]
  },
  A: {
    metricId: "A",
    name: "Availability (A)",
    category: "Impact",
    description: "Measures the impact to the availability and uptime of the impacted component.",
    options: [
      {
        code: "N",
        label: "None",
        badge: "N",
        firstOfficialText: "There is no impact to availability within the impacted component.",
        mobileEvaluationContext: "Application uptime and accessibility remain completely unaffected."
      },
      {
        code: "L",
        label: "Low",
        badge: "L",
        firstOfficialText: "Performance is reduced or there are interruptions in resource availability, but no complete outage occurs.",
        mobileEvaluationContext: "Temporary sluggishness, non-fatal exceptions, or minor transient delays."
      },
      {
        code: "H",
        label: "High",
        badge: "H",
        firstOfficialText: "There is a total loss of availability, resulting in the attacker being able to deny all access to resources.",
        mobileEvaluationContext: "Persistent app crash on launch (Denial of Service), corrupted storage causing app bricking, or backend service shutdown."
      }
    ]
  }
};
