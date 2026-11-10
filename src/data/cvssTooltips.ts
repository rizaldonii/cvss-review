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
        guidanceText: "Kerentanan terikat pada tumpukan jaringan (layer 3 ke atas) dan dapat dieksploitasi dari jarak jauh tanpa mensyaratkan penyerang berada pada subnet atau jangkauan radio nirkabel lokal yang sama.",
        mobileEvaluationContext: "Dapat dieksploitasi melalui jaringan publik atau internet tanpa memerlukan kedekatan fisik atau koneksi pada subnet lokal yang sama.",
        firstOfficialText: "Kerentanan terikat pada tumpukan jaringan (layer 3 ke atas) dan dapat dieksploitasi dari jarak jauh tanpa mensyaratkan penyerang berada pada subnet atau jangkauan radio nirkabel lokal yang sama."
      },
      {
        code: "A",
        label: "Adjacent",
        badge: "A",
        guidanceText: "Eksploitasi dibatasi pada tingkat protokol ke topologi jaringan yang berdekatan secara logis atau fisik.",
        mobileEvaluationContext: "Memerlukan penyerang berada pada domain jaringan bersama (misal: subnet Wi-Fi/LAN lokal yang sama) atau dalam jangkauan protokol nirkabel terbatas (Bluetooth, BLE, NFC).",
        firstOfficialText: "Eksploitasi dibatasi pada tingkat protokol ke topologi jaringan yang berdekatan secara logis atau fisik."
      },
      {
        code: "L",
        label: "Local",
        badge: "L",
        guidanceText: "Komponen rentan tidak terikat pada tumpukan jaringan terbuka. Penyerang memerlukan kapabilitas eksekusi atau pembacaan secara lokal pada perangkat target.",
        mobileEvaluationContext: "Eksploitasi memerlukan akses lokal pada perangkat (misal: aplikasi lokal lain di perangkat yang sama, interaksi IPC/Intent, konsol shell termasuk ADB, atau pembacaan berkas penyimpanan lokal). Catatan: Local tidak selalu berarti penyerang harus memegang perangkat fisik jika akses lokal dapat dicapai melalui proses lokal lain.",
        firstOfficialText: "Komponen rentan tidak terikat pada tumpukan jaringan terbuka. Penyerang memerlukan kapabilitas eksekusi atau pembacaan secara lokal pada perangkat target."
      },
      {
        code: "P",
        label: "Physical",
        badge: "P",
        guidanceText: "Penyerang memerlukan kontak fisik langsung secara manual pada perangkat keras atau antarmuka fisik perangkat.",
        mobileEvaluationContext: "Memerlukan penyerang memegang atau memanipulasi perangkat keras fisik ponsel secara langsung.",
        firstOfficialText: "Penyerang memerlukan kontak fisik langsung secara manual pada perangkat keras atau antarmuka fisik perangkat."
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
        guidanceText: "Tidak terdapat kondisi akses khusus atau faktor lingkungan di luar kendali penyerang. Eksploitasi dapat diulang dengan keberhasilan yang konsisten dan deterministik.",
        mobileEvaluationContext: "Eksploitasi bersifat konsisten dan deterministik. Penyerang memegang kendali penuh atas faktor-faktor yang diperlukan untuk keberhasilan eksploitasi.",
        firstOfficialText: "Tidak terdapat kondisi akses khusus atau faktor lingkungan di luar kendali penyerang. Eksploitasi dapat diulang dengan keberhasilan yang konsisten dan deterministik."
      },
      {
        code: "H",
        label: "High",
        badge: "H",
        guidanceText: "Keberhasilan eksploitasi bergantung pada kondisi di luar kendali penyerang (misal: harus memenangkan kondisi balapan/race condition, mengumpulkan rahasia acak target, atau bergantung pada konfigurasi sistem target tertentu).",
        mobileEvaluationContext: "Keberhasilan serangan bergantung pada faktor eksternal di luar kendali penyerang. Catatan: Kebutuhan teknik eksploitasi tertentu tidak serta-merta menjadikan AC bernilai High apabila kondisi lingkungan sepenuhnya dapat dipersiapkan atau dikendalikan penyerang.",
        firstOfficialText: "Keberhasilan eksploitasi bergantung pada kondisi di luar kendali penyerang (misal: harus memenangkan kondisi balapan/race condition, mengumpulkan rahasia acak target, atau bergantung pada konfigurasi sistem target tertentu)."
      }
    ]
  },
  PR: {
    metricId: "PR",
    name: "Privileges Required (PR)",
    category: "Exploitability",
    description: "Menggambarkan tingkat hak akses yang harus dimiliki penyerang sebelum melakukan eksploitasi pada komponen rentan.",
    options: [
      {
        code: "N",
        label: "None",
        badge: "N",
        guidanceText: "Penyerang tidak terotentikasi dan tidak memerlukan hak akses atau izin akun apa pun pada komponen rentan sebelum eksploitasi dimulai.",
        mobileEvaluationContext: "Penyerang tidak memerlukan akun, otentikasi awal, atau hak akses istimewa apa pun pada komponen rentan.",
        firstOfficialText: "Penyerang tidak terotentikasi dan tidak memerlukan hak akses atau izin akun apa pun pada komponen rentan sebelum eksploitasi dimulai."
      },
      {
        code: "L",
        label: "Low",
        badge: "L",
        guidanceText: "Penyerang harus memiliki hak akses tingkat pengguna biasa (misalnya memiliki akun terdaftar atau hak otentikasi terbatas) pada komponen atau sistem yang rentan sebelum serangan dapat dipicu.",
        mobileEvaluationContext: "Penyerang memerlukan otentikasi atau hak akses tingkat pengguna biasa pada aplikasi/komponen target. Catatan: Menginstal aplikasi biasa di perangkat tidak otomatis disamakan dengan hak akses Low pada komponen rentan jika komponen tersebut dapat diakses tanpa mensyaratkan otentikasi.",
        firstOfficialText: "Penyerang harus memiliki hak akses tingkat pengguna biasa (misalnya memiliki akun terdaftar atau hak otentikasi terbatas) pada komponen atau sistem yang rentan sebelum serangan dapat dipicu."
      },
      {
        code: "H",
        label: "High",
        badge: "H",
        guidanceText: "Penyerang memerlukan hak akses istimewa/administratif yang signifikan (seperti root sistem Android, device owner, atau administrator) sebelum melancarkan serangan.",
        mobileEvaluationContext: "Penyerang harus memiliki hak istimewa tingkat tinggi (misal: hak root Android atau administrator backend) sebelum serangan dapat dilancarkan.",
        firstOfficialText: "Penyerang memerlukan hak akses istimewa/administratif yang signifikan (seperti root sistem Android, device owner, atau administrator) sebelum melancarkan serangan."
      }
    ]
  },
  UI: {
    metricId: "UI",
    name: "User Interaction (UI)",
    category: "Exploitability",
    description: "Menilai apakah keberhasilan eksploitasi membutuhkan tindakan aktif dari pengguna sah selain penyerang.",
    options: [
      {
        code: "N",
        label: "None",
        badge: "N",
        guidanceText: "Kerentanan dapat dieksploitasi tanpa memerlukan interaksi atau tindakan apa pun dari pengguna sah target.",
        mobileEvaluationContext: "Eksploitasi dapat berlangsung tanpa memerlukan tindakan apa pun dari pengguna sah selain penyerang.",
        firstOfficialText: "Kerentanan dapat dieksploitasi tanpa memerlukan interaksi atau tindakan apa pun dari pengguna sah target."
      },
      {
        code: "R",
        label: "Required",
        badge: "R",
        guidanceText: "Keberhasilan eksploitasi mensyaratkan pengguna selain penyerang untuk melakukan tindakan aktif tertentu yang memicu kerentanan (misalnya mengklik tautan khusus atau membuka berkas berbahaya yang dikirimkan).",
        mobileEvaluationContext: "Eksploitasi mensyaratkan pengguna target melakukan tindakan tertentu untuk memfasilitasi serangan. Catatan: Penggunaan rutin aplikasi secara normal oleh korban tidak otomatis berarti UI bernilai Required, kecuali serangan secara spesifik membutuhkan tindakan aktif dari korban untuk memicu payload.",
        firstOfficialText: "Keberhasilan eksploitasi mensyaratkan pengguna selain penyerang untuk melakukan tindakan aktif tertentu yang memicu kerentanan."
      }
    ]
  },
  S: {
    metricId: "S",
    name: "Scope (S)",
    category: "Scope",
    description: "Menilai apakah dampak eksploitasi meluas ke komponen yang dikelola oleh otoritas keamanan yang berbeda dari komponen rentan.",
    options: [
      {
        code: "U",
        label: "Unchanged",
        badge: "U",
        guidanceText: "Sumber daya yang terdampak dikelola oleh otoritas keamanan yang sama dengan komponen yang rentan.",
        mobileEvaluationContext: "Dampak eksploitasi terbatas pada ruang lingkup aplikasi mobile itu sendiri (misalnya direktori penyimpanan sandbox aplikasi). Batas otoritas otorisasi keamanan tidak terlanggar.",
        firstOfficialText: "Sumber daya yang terdampak dikelola oleh otoritas keamanan yang sama dengan komponen yang rentan."
      },
      {
        code: "C",
        label: "Changed",
        badge: "C",
        guidanceText: "Eksploitasi memungkinkan penyerang memengaruhi sumber daya yang berada di luar batas otoritas keamanan komponen rentan.",
        mobileEvaluationContext: "Dampak eksploitasi melampaui otoritas keamanan aplikasi mobile, memengaruhi komponen lain seperti sistem operasi, aplikasi terpisah lain, atau layanan backend jika batas otorisasi keamanannya dilanggar secara langsung. Catatan: Keberadaan backend tidak otomatis menjadikan Scope bernilai Changed jika komunikasi berlangsung dalam batas otorisasi normal.",
        firstOfficialText: "Eksploitasi memungkinkan penyerang memengaruhi sumber daya yang berada di luar batas otoritas keamanan komponen rentan."
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
        guidanceText: "Tidak ada pengungkapan informasi rahasia atau data sensitif pada komponen yang terdampak.",
        mobileEvaluationContext: "Tidak ada data sensitif yang terungkap kepada pihak tidak berhak.",
        firstOfficialText: "Tidak ada pengungkapan informasi rahasia atau data sensitif pada komponen yang terdampak."
      },
      {
        code: "L",
        label: "Low",
        badge: "L",
        guidanceText: "Terjadi pengungkapan sebagian informasi rahasia, atau informasi yang bocor memiliki dampak terbatas dan penyerang tidak memiliki kendali penuh atas seluruh data yang diungkapkan.",
        mobileEvaluationContext: "Terjadi pengungkapan sebagian informasi atau data dengan dampak terbatas (misal: metadata sistem, residu string biner, atau informasi terbatas).",
        firstOfficialText: "Terjadi pengungkapan sebagian informasi rahasia, atau informasi yang bocor memiliki dampak terbatas."
      },
      {
        code: "H",
        label: "High",
        badge: "H",
        guidanceText: "Terjadi pengungkapan menyeluruh terhadap seluruh data rahasia, atau pengungkapan langsung terhadap informasi sangat kritis yang berdampak pada kompromi menyeluruh.",
        mobileEvaluationContext: "Terjadi pengungkapan menyeluruh atau terungkapnya informasi sangat kritis yang berdampak langsung pada kompromi luas. Catatan: Keberadaan data pribadi (PII), hash, atau token tidak otomatis bernilai High; evaluator perlu menilai tingkat keluasan dan konsekuensi nyata dari pengungkapan tersebut.",
        firstOfficialText: "Terjadi pengungkapan menyeluruh terhadap seluruh data rahasia, atau pengungkapan langsung terhadap informasi sangat kritis."
      }
    ]
  },
  I: {
    metricId: "I",
    name: "Integrity (I)",
    category: "Impact",
    description: "Mengukur tingkat dampak terhadap keutuhan, keaslian, dan modifikasi data tanpa hak.",
    options: [
      {
        code: "N",
        label: "None",
        badge: "N",
        guidanceText: "Tidak ada modifikasi data atau konfigurasi yang tidak sah pada komponen yang terdampak.",
        mobileEvaluationContext: "Data, berkas, konfigurasi, dan alur eksekusi aplikasi tidak dapat dimodifikasi oleh penyerang.",
        firstOfficialText: "Tidak ada modifikasi data atau konfigurasi yang tidak sah pada komponen yang terdampak."
      },
      {
        code: "L",
        label: "Low",
        badge: "L",
        guidanceText: "Modifikasi data dimungkinkan, namun cakupan modifikasi terbatas dan tidak berakibat langsung pada kompromi integritas sistem secara luas.",
        mobileEvaluationContext: "Penyerang dapat mengubah sebagian data atau pengaturan non-kritis, namun tidak memiliki kendali penuh atas konsekuensi modifikasi tersebut.",
        firstOfficialText: "Modifikasi data dimungkinkan, namun cakupan modifikasi terbatas."
      },
      {
        code: "H",
        label: "High",
        badge: "H",
        guidanceText: "Terjadi kompromi integritas total atau modifikasi langsung pada data/fungsi kritis yang berdampak serius pada keandalan operasional sistem.",
        mobileEvaluationContext: "Terjadi kompromi integritas menyeluruh atau modifikasi data penting yang menimbulkan dampak serius langsung. Catatan: High membutuhkan konsekuensi langsung yang serius atau kompromi integritas luas, bukan sekadar perubahan data apa pun.",
        firstOfficialText: "Terjadi kompromi integritas total atau modifikasi langsung pada data/fungsi kritis."
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
        guidanceText: "Tidak ada dampak terhadap ketersediaan layanan atau sumber daya.",
        mobileEvaluationContext: "Ketersediaan dan responsivitas aplikasi/layanan tetap berjalan normal tanpa gangguan.",
        firstOfficialText: "Tidak ada dampak terhadap ketersediaan layanan atau sumber daya."
      },
      {
        code: "L",
        label: "Low",
        badge: "L",
        guidanceText: "Terjadi penurunan kinerja sementara atau gangguan akses parsial tanpa penghentian layanan secara menyeluruh.",
        mobileEvaluationContext: "Terjadi kelambatan respons, degradasi performa, atau gangguan parsial tanpa pemadaman total.",
        firstOfficialText: "Terjadi penurunan kinerja sementara atau gangguan akses parsial tanpa penghentian layanan secara menyeluruh."
      },
      {
        code: "H",
        label: "High",
        badge: "H",
        guidanceText: "Terjadi penghentian layanan secara total (Denial of Service) atau gangguan serius yang berlangsung terus-menerus selama serangan berjalan sehingga sumber daya tidak dapat diakses pengguna sah.",
        mobileEvaluationContext: "Terjadi penghentian layanan total atau penolakan akses berkelanjutan terhadap sumber daya utama. Catatan: High tidak harus berupa crash permanen; gangguan serius yang berlangsung selama eksploitasi juga dipertimbangkan sebagai High.",
        firstOfficialText: "Terjadi penghentian layanan secara total (Denial of Service) atau gangguan serius yang berlangsung terus-menerus."
      }
    ]
  }
};
