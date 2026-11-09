import type { CVSSv31Metrics, MetricDefinition } from "../types";

export const CVSS_METRIC_DEFINITIONS: Record<keyof CVSSv31Metrics, MetricDefinition> = {
  AV: {
    metricId: "AV",
    name: "Attack Vector (AV)",
    category: "Exploitability",
    description: "Merefleksikan konteks dan kedekatan logis di mana eksploitasi kerentanan dapat dilakukan.",
    options: [
      {
        code: "N",
        label: "Network",
        badge: "N",
        firstOfficialText: "The vulnerable component is bound to the network stack and the set of possible attackers extends beyond the other options up to and including the entire Internet.",
        mobileEvaluationContext: "Dapat dieksploitasi dari jarak jauh melalui jaringan internet/seluler tanpa mensyaratkan penyerang berada di subnet atau jangkauan radio nirkabel yang sama."
      },
      {
        code: "A",
        label: "Adjacent",
        badge: "A",
        firstOfficialText: "The vulnerable component is bound to the network stack, but the attack is limited at the protocol level to a logically adjacent topology.",
        mobileEvaluationContext: "Memerlukan penyerang berada pada domain jaringan bersama (misal: Wi-Fi/LAN lokal yang sama) atau dalam jangkauan fisik nirkabel terbatas (Bluetooth, BLE, NFC)."
      },
      {
        code: "L",
        label: "Local",
        badge: "L",
        firstOfficialText: "The vulnerable component is not bound to the network stack and the attacker's path is via read/write/execute capabilities locally.",
        mobileEvaluationContext: "Eksploitasi memerlukan akses lokal pada perangkat (misalnya melalui antarmuka ADB shell, aplikasi lokal lain pada perangkat yang sama, atau pembacaan berkas log/penyimpanan lokal)."
      },
      {
        code: "P",
        label: "Physical",
        badge: "P",
        firstOfficialText: "The attack requires the attacker to physically touch or manipulate the vulnerable component.",
        mobileEvaluationContext: "Memerlukan penyerang memegang atau memanipulasi perangkat keras fisik ponsel secara langsung."
      }
    ]
  },
  AC: {
    metricId: "AC",
    name: "Attack Complexity (AC)",
    category: "Exploitability",
    description: "Menggambarkan kondisi di luar kendali penyerang yang harus dipenuhi agar eksploitasi dapat berhasil.",
    options: [
      {
        code: "L",
        label: "Low",
        badge: "L",
        firstOfficialText: "Specialized access conditions or extenuating circumstances do not exist. An attacker can expect repeatable success against the vulnerable component.",
        mobileEvaluationContext: "Eksploitasi bersifat deterministik dan dapat diulang dengan andal tanpa memerlukan kondisi balapan (race condition) atau rekayasa kriptografi khusus."
      },
      {
        code: "H",
        label: "High",
        badge: "H",
        firstOfficialText: "A successful attack depends on conditions outside the attacker's control (e.g. winning a race condition, overcoming advanced ASLR/DEP, or obtaining target-specific secrets).",
        mobileEvaluationContext: "Eksploitasi bergantung pada faktor eksternal di luar kendali langsung penyerang (misal: kondisi waktu/race conditions khusus, perlindungan sistem non-standar, atau pengumpulan rahasia acak)."
      }
    ]
  },
  PR: {
    metricId: "PR",
    name: "Privileges Required (PR)",
    category: "Exploitability",
    description: "Menggambarkan tingkat hak akses yang harus dimiliki penyerang sebelum melakukan eksploitasi.",
    options: [
      {
        code: "N",
        label: "None",
        badge: "N",
        firstOfficialText: "The attacker is unauthorized prior to attack, and therefore does not require any access to the vulnerable system.",
        mobileEvaluationContext: "Penyerang tidak memerlukan otentikasi awal, akun pengguna, atau hak akses khusus apa pun pada aplikasi."
      },
      {
        code: "L",
        label: "Low",
        badge: "L",
        firstOfficialText: "The attacker requires privileges that provide basic user capabilities that could normally affect only settings and files owned by a user.",
        mobileEvaluationContext: "Penyerang memerlukan hak akses dasar pengguna biasa (misalnya memiliki akun pengguna terdaftar pada aplikasi atau instalasi aplikasi biasa)."
      },
      {
        code: "H",
        label: "High",
        badge: "H",
        firstOfficialText: "The attacker requires privileges that provide significant control over the vulnerable component (e.g. administrative, root, or device owner).",
        mobileEvaluationContext: "Penyerang memerlukan hak akses istimewa/administratif (seperti akses root sistem Android, device owner, atau administrator server)."
      }
    ]
  },
  UI: {
    metricId: "UI",
    name: "User Interaction (UI)",
    category: "Exploitability",
    description: "Menilai apakah keberhasilan eksploitasi membutuhkan partisipasi dari pengguna sah selain penyerang.",
    options: [
      {
        code: "N",
        label: "None",
        badge: "N",
        firstOfficialText: "The vulnerable system can be exploited without interaction from any user.",
        mobileEvaluationContext: "Kerentanan dapat dieksploitasi secara pasif tanpa memerlukan tindakan apa pun dari pengguna sah aplikasi."
      },
      {
        code: "R",
        label: "Required",
        badge: "R",
        firstOfficialText: "Successful exploitation requires a user to take some action before the vulnerability can be exploited.",
        mobileEvaluationContext: "Eksploitasi membutuhkan tindakan dari pengguna target (misalnya membuka aplikasi, mengakses menu/fitur tertentu, atau melakukan tindakan interaktif)."
      }
    ]
  },
  S: {
    metricId: "S",
    name: "Scope (S)",
    category: "Scope",
    description: "Menilai apakah dampak eksploitasi meluas ke komponen di luar otoritas keamanan komponen yang rentan.",
    options: [
      {
        code: "U",
        label: "Unchanged",
        badge: "U",
        firstOfficialText: "An exploited vulnerability can only affect resources managed by the same security authority.",
        mobileEvaluationContext: "Dampak eksploitasi terbatas pada ruang lingkup aplikasi mobile itu sendiri (misalnya direktori penyimpanan lokal sandbox aplikasi)."
      },
      {
        code: "C",
        label: "Changed",
        badge: "C",
        firstOfficialText: "An exploited vulnerability can affect resources beyond the security scope managed by the security authority of the vulnerable component.",
        mobileEvaluationContext: "Dampak eksploitasi melampaui otoritas keamanan aplikasi mobile, memengaruhi komponen lain seperti sistem operasi Android, aplikasi lain, atau layanan backend eksternal."
      }
    ]
  },
  C: {
    metricId: "C",
    name: "Confidentiality (C)",
    category: "Impact",
    description: "Mengukur tingkat dampak terhadap kerahasiaan data atau sumber daya informasi.",
    options: [
      {
        code: "N",
        label: "None",
        badge: "N",
        firstOfficialText: "There is no loss of confidentiality within the impacted component.",
        mobileEvaluationContext: "Tidak ada informasi rahasia atau data sensitif yang bocor atau dapat diakses oleh pihak tidak berhak."
      },
      {
        code: "L",
        label: "Low",
        badge: "L",
        firstOfficialText: "There is some loss of confidentiality. Access to some restricted information is obtained, but the attacker does not have control over what is obtained.",
        mobileEvaluationContext: "Terjadi kebocoran sebagian informasi atau data non-kritis (misal: metadata sistem, string referensi, atau informasi terbatas)."
      },
      {
        code: "H",
        label: "High",
        badge: "H",
        firstOfficialText: "There is a total loss of confidentiality, resulting in all resources being divulged, or direct disclosure of critical confidential information.",
        mobileEvaluationContext: "Terjadi kebocoran menyeluruh atau terungkapnya informasi sensitif/kritis (misal: data pribadi lengkap/PII, token autentikasi sesi aktif, atau hash kredensial)."
      }
    ]
  },
  I: {
    metricId: "I",
    name: "Integrity (I)",
    category: "Impact",
    description: "Mengukur tingkat dampak terhadap keutuhan, keaslian, dan keterpercayaan informasi.",
    options: [
      {
        code: "N",
        label: "None",
        badge: "N",
        firstOfficialText: "There is no loss of integrity within the impacted component.",
        mobileEvaluationContext: "Tidak ada data, konfigurasi, atau alur eksekusi aplikasi yang dapat dimodifikasi oleh penyerang."
      },
      {
        code: "L",
        label: "Low",
        badge: "L",
        firstOfficialText: "Modification of data is possible, but the attacker does not have control over the consequence, or the scope of modification is limited.",
        mobileEvaluationContext: "Penyerang dapat mengubah sebagian data atau pengaturan non-kritis, tetapi tidak dapat mengendalikan sistem secara menyeluruh."
      },
      {
        code: "H",
        label: "High",
        badge: "H",
        firstOfficialText: "There is a total compromise of system integrity. The attacker can modify any/all files, data, or critical system behavior.",
        mobileEvaluationContext: "Terjadi kompromi integritas total; penyerang dapat memodifikasi data penting, memanipulasi rekaman data, atau mengubah perilaku inti sistem."
      }
    ]
  },
  A: {
    metricId: "A",
    name: "Availability (A)",
    category: "Impact",
    description: "Mengukur tingkat dampak terhadap ketersediaan dan aksesibilitas layanan.",
    options: [
      {
        code: "N",
        label: "None",
        badge: "N",
        firstOfficialText: "There is no impact to availability within the impacted component.",
        mobileEvaluationContext: "Ketersediaan dan responsivitas aplikasi/layanan tetap berjalan normal tanpa gangguan."
      },
      {
        code: "L",
        label: "Low",
        badge: "L",
        firstOfficialText: "Performance is reduced or there are interruptions in resource availability, but no complete outage occurs.",
        mobileEvaluationContext: "Terjadi penurunan performa sementara, kelambatan respons, atau gangguan parsial tanpa penghentian total layanan."
      },
      {
        code: "H",
        label: "High",
        badge: "H",
        firstOfficialText: "There is a total loss of availability, resulting in the attacker being able to deny all access to resources.",
        mobileEvaluationContext: "Terjadi penghentian layanan secara total (Denial of Service), aplikasi crash permanen, atau sumber daya utama menjadi tidak dapat diakses."
      }
    ]
  }
};
