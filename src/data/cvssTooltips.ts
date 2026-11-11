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
        guidanceText: "Komponen rentan terikat pada tumpukan jaringan dan dapat dieksploitasi melintasi batas perutean (layer 3 ke atas), termasuk internet publik, tanpa mensyaratkan akses fisik, kapabilitas eksekusi lokal pada sistem target, atau kedekatan topologi jaringan bersama.",
        mobileEvaluationContext: "Contoh ilustratif: kerentanan dapat dipicu dari jarak jauh melalui koneksi jaringan publik atau internet tanpa batasan kedekatan jaringan fisik maupun logis.",
        firstOfficialText: "Komponen rentan terikat pada tumpukan jaringan dan dapat dieksploitasi melintasi batas perutean (layer 3 ke atas), termasuk internet publik, tanpa mensyaratkan akses fisik, kapabilitas eksekusi lokal pada sistem target, atau kedekatan topologi jaringan bersama."
      },
      {
        code: "A",
        label: "Adjacent",
        badge: "A",
        guidanceText: "Eksploitasi dibatasi pada tingkat protokol ke domain jaringan yang berdekatan secara fisik atau logis dengan sistem target.",
        mobileEvaluationContext: "Contoh ilustratif: serangan Man-in-the-Middle (MitM) pada subnet Wi-Fi/LAN lokal bersama, atau eksploitasi berbasis protokol nirkabel jangkauan terbatas (Bluetooth, BLE, NFC).",
        firstOfficialText: "Eksploitasi dibatasi pada tingkat protokol ke domain jaringan yang berdekatan secara fisik atau logis dengan sistem target."
      },
      {
        code: "L",
        label: "Local",
        badge: "L",
        guidanceText: "Komponen rentan tidak terikat pada tumpukan jaringan terbuka. Penyerang memerlukan kapabilitas lokal (membaca, menulis, atau mengeksekusi) pada sistem target, baik melalui antarmuka konsol/shell lokal, proses atau aplikasi lain yang berjalan di perangkat target, maupun melalui interaksi pengguna lokal yang menjalankan berkas berbahaya.",
        mobileEvaluationContext: "Contoh ilustratif: eksploitasi melalui aplikasi lokal lain di perangkat yang sama (misal antarmuka IPC/Intent), pembacaan log lokal (logcat), berkas pada penyimpanan lokal, atau sesi shell (termasuk ADB). Local tidak mensyaratkan kontak fisik langsung ke perangkat apabila kapabilitas lokal dapat diperoleh melalui proses lokal lain.",
        firstOfficialText: "Komponen rentan tidak terikat pada tumpukan jaringan terbuka. Penyerang memerlukan kapabilitas lokal (membaca, menulis, atau mengeksekusi) pada sistem target, baik melalui antarmuka konsol/shell lokal, proses atau aplikasi lain yang berjalan di perangkat target, maupun melalui interaksi pengguna lokal yang menjalankan berkas berbahaya."
      },
      {
        code: "P",
        label: "Physical",
        badge: "P",
        guidanceText: "Eksploitasi mensyaratkan penyerang melakukan kontak fisik langsung secara manual pada perangkat keras target atau antarmuka fisik perangkat.",
        mobileEvaluationContext: "Contoh ilustratif: pembongkaran perangkat keras, manipulasi konektor/port fisik perangkat, atau manipulasi sensor secara langsung.",
        firstOfficialText: "Eksploitasi mensyaratkan penyerang melakukan kontak fisik langsung secara manual pada perangkat keras target atau antarmuka fisik perangkat."
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
        guidanceText: "Tidak terdapat kondisi akses khusus atau rintangan di luar kendali penyerang. Serangan dapat dipersiapkan dan diulang dengan tingkat keberhasilan yang konsisten dan deterministik.",
        mobileEvaluationContext: "Contoh ilustratif: serangan dapat dieksekusi secara terencana tanpa bergantung pada faktor lingkungan acak. Keberadaan konfigurasi rentan tertentu yang sudah aktif pada target tidak otomatis menjadikan AC bernilai High selama eksploitasi dapat diulang secara konsisten.",
        firstOfficialText: "Tidak terdapat kondisi akses khusus atau rintangan di luar kendali penyerang. Serangan dapat dipersiapkan dan diulang dengan tingkat keberhasilan yang konsisten dan deterministik."
      },
      {
        code: "H",
        label: "High",
        badge: "H",
        guidanceText: "Keberhasilan eksploitasi bergantung pada faktor atau kondisi di luar kendali penyerang (misalnya memenangkan kondisi balapan/race condition, mengumpulkan rahasia acak yang tidak dapat dipaksakan, atau bergantung pada anomali lingkungan sistem yang tidak menentu).",
        mobileEvaluationContext: "Contoh ilustratif: serangan tidak dapat diulang secara konsisten atas kehendak penyerang karena adanya faktor eksternal independen yang tidak dapat dipaksakan. Kebutuhan alat, keahlian khusus, atau konfigurasi permisif pada aplikasi tidak serta-merta menjadikan AC bernilai High jika faktor-faktor pendukung dapat dipenuhi secara deterministik.",
        firstOfficialText: "Keberhasilan eksploitasi bergantung pada faktor atau kondisi di luar kendali penyerang (misalnya memenangkan kondisi balapan/race condition, mengumpulkan rahasia acak yang tidak dapat dipaksakan, atau bergantung pada anomali lingkungan sistem yang tidak menentu)."
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
        mobileEvaluationContext: "Contoh ilustratif: kerentanan dapat dipicu tanpa mensyaratkan akun pengguna, otentikasi awal, atau hak istimewa pada komponen target.",
        firstOfficialText: "Penyerang tidak terotentikasi dan tidak memerlukan hak akses atau izin akun apa pun pada komponen rentan sebelum eksploitasi dimulai."
      },
      {
        code: "L",
        label: "Low",
        badge: "L",
        guidanceText: "Penyerang harus memiliki hak otentikasi atau izin dasar tingkat pengguna biasa pada komponen rentan sebelum serangan dapat dilancarkan.",
        mobileEvaluationContext: "Contoh ilustratif: penyerang harus login dengan akun pengguna biasa. Menginstal aplikasi biasa di perangkat Android tidak otomatis disamakan dengan hak akses Low pada komponen rentan jika komponen tersebut dapat diakses tanpa otentikasi.",
        firstOfficialText: "Penyerang harus memiliki hak otentikasi atau izin dasar tingkat pengguna biasa pada komponen rentan sebelum serangan dapat dilancarkan."
      },
      {
        code: "H",
        label: "High",
        badge: "H",
        guidanceText: "Penyerang memerlukan hak akses istimewa atau administratif signifikan (yang mengendalikan pengaturan tingkat sistem) sebelum serangan dapat dilancarkan.",
        mobileEvaluationContext: "Contoh ilustratif: penyerang harus memiliki hak administratif sistem (seperti hak akses root Android, device owner, atau administrator server).",
        firstOfficialText: "Penyerang memerlukan hak akses istimewa atau administratif signifikan (yang mengendalikan pengaturan tingkat sistem) sebelum serangan dapat dilancarkan."
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
        guidanceText: "Kerentanan dapat dieksploitasi tanpa memerlukan interaksi atau tindakan aktif apa pun dari pengguna sah target.",
        mobileEvaluationContext: "Contoh ilustratif: serangan dapat dipicu secara mandiri oleh penyerang tanpa keterlibatan pengguna sah.",
        firstOfficialText: "Kerentanan dapat dieksploitasi tanpa memerlukan interaksi atau tindakan aktif apa pun dari pengguna sah target."
      },
      {
        code: "R",
        label: "Required",
        badge: "R",
        guidanceText: "Keberhasilan eksploitasi mensyaratkan pengguna selain penyerang untuk melakukan tindakan aktif tertentu yang memicu atau memfasilitasi eksploitasi kerentanan (misalnya membuka berkas tertentu, mengunjungi tautan/URI, atau menyetujui dialog izin/tindakan). Tindakan ini tidak selalu berupa rekayasa sosial, melainkan tindakan pengguna apa pun yang menjadi prasyarat terpicunya kerentanan.",
        mobileEvaluationContext: "Contoh ilustratif: serangan membutuhkan tindakan aktif pengguna untuk memicu eksploitasi (misal mengimpor berkas konfigurasi, mengklik tautan intent, atau menyetujui dialog aksi). Penggunaan pasif aplikasi secara normal tidak otomatis berarti UI bernilai Required, kecuali tindakan spesifik tersebut memang menjadi prasyarat mutlak berjalannya eksploitasi.",
        firstOfficialText: "Keberhasilan eksploitasi mensyaratkan pengguna selain penyerang untuk melakukan tindakan aktif tertentu yang memicu atau memfasilitasi eksploitasi kerentanan."
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
        guidanceText: "Dampak eksploitasi terbatas pada sumber daya yang dikelola oleh otoritas keamanan yang sama dengan komponen rentan. Batas otorisasi keamanan tidak terlanggar.",
        mobileEvaluationContext: "Contoh ilustratif: dampak eksploitasi terbatas pada ruang lingkup aplikasi mobile itu sendiri (misalnya berkas dalam direktori sandbox aplikasi). Adanya server backend atau database tidak otomatis menjadikan Scope bernilai Changed jika komunikasi berlangsung dalam batas otorisasi normal.",
        firstOfficialText: "Dampak eksploitasi terbatas pada sumber daya yang dikelola oleh otoritas keamanan yang sama dengan komponen rentan. Batas otorisasi keamanan tidak terlanggar."
      },
      {
        code: "C",
        label: "Changed",
        badge: "C",
        guidanceText: "Eksploitasi memungkinkan penyerang memengaruhi sumber daya pada komponen lain yang dikelola oleh otoritas keamanan berbeda dari komponen rentan (terjadi pelanggaran batas otorisasi).",
        mobileEvaluationContext: "Contoh ilustratif: kerentanan pada aplikasi memungkinkan penyerang memperoleh hak akses atau mengeksekusi tindakan pada sistem operasi Android atau layanan backend di luar batas otorisasi aplikasi.",
        firstOfficialText: "Eksploitasi memungkinkan penyerang memengaruhi sumber daya pada komponen lain yang dikelola oleh otoritas keamanan berbeda dari komponen rentan (terjadi pelanggaran batas otorisasi)."
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
        mobileEvaluationContext: "Contoh ilustratif: tidak ada data rahasia atau data terbatas yang bocor kepada penyerang.",
        firstOfficialText: "Tidak ada pengungkapan informasi rahasia atau data sensitif pada komponen yang terdampak."
      },
      {
        code: "L",
        label: "Low",
        badge: "L",
        guidanceText: "Terjadi kehilangan kerahasiaan sebagian. Penyerang memperoleh akses ke sebagian data terbatas, namun pengungkapan tersebut tidak menimbulkan dampak langsung yang serius terhadap komponen terdampak.",
        mobileEvaluationContext: "Contoh ilustratif: pengungkapan informasi terbatas atau data yang konsekuensi langsungnya tidak kritis. Keberadaan data pribadi (PII), token, hash kata sandi, atau residu string biner tidak otomatis bernilai Low atau High, melainkan dinilai berdasarkan tingkat sensitivitas dan konsekuensinya.",
        firstOfficialText: "Terjadi kehilangan kerahasiaan sebagian. Penyerang memperoleh akses ke sebagian data terbatas, namun pengungkapan tersebut tidak menimbulkan dampak langsung yang serius terhadap komponen terdampak."
      },
      {
        code: "H",
        label: "High",
        badge: "H",
        guidanceText: "Terjadi kehilangan kerahasiaan total (seluruh data rahasia terungkap), ATAU terjadi pengungkapan sebagian informasi terbatas yang diketahui menimbulkan konsekuensi langsung dan serius terhadap komponen terdampak.",
        mobileEvaluationContext: "Contoh ilustratif: seluruh data rahasia terbongkar, atau sebagian data kunci terungkap yang secara langsung memungkinkan pengambilalihan akun atau kompromi serius. High tidak mensyaratkan kebocoran seluruh data jika informasi yang bocor memiliki konsekuensi kritis langsung.",
        firstOfficialText: "Terjadi kehilangan kerahasiaan total (seluruh data rahasia terungkap), ATAU terjadi pengungkapan sebagian informasi terbatas yang diketahui menimbulkan konsekuensi langsung dan serius terhadap komponen terdampak."
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
        mobileEvaluationContext: "Contoh ilustratif: data, alur eksekusi, dan konfigurasi sistem tidak dapat diubah oleh penyerang.",
        firstOfficialText: "Tidak ada modifikasi data atau konfigurasi yang tidak sah pada komponen yang terdampak."
      },
      {
        code: "L",
        label: "Low",
        badge: "L",
        guidanceText: "Modifikasi data dimungkinkan, namun penyerang tidak memiliki kendali penuh atas konsekuensinya, atau perubahan data tersebut tidak menimbulkan dampak langsung yang serius terhadap keandalan sistem.",
        mobileEvaluationContext: "Contoh ilustratif: penyerang dapat mengubah data non-kritis atau modifikasi parsial yang konsekuensi operasionalnya terbatas. Modifikasi sejumlah data tidak otomatis bernilai High jika tidak menimbulkan kompromi serius.",
        firstOfficialText: "Modifikasi data dimungkinkan, namun penyerang tidak memiliki kendali penuh atas konsekuensinya, atau perubahan data tersebut tidak menimbulkan dampak langsung yang serius terhadap keandalan sistem."
      },
      {
        code: "H",
        label: "High",
        badge: "H",
        guidanceText: "Terjadi kehilangan integritas total (semua data dapat dimodifikasi tanpa hak), ATAU modifikasi sebagian data/fungsi yang menimbulkan konsekuensi langsung dan serius terhadap komponen terdampak.",
        mobileEvaluationContext: "Contoh ilustratif: penyerang dapat mengubah data penting atau memanipulasi logika aplikasi yang berakibat langsung pada kompromi sistem yang luas. Penilaian High didasarkan pada keseriusan konsekuensi langsung, bukan semata-mata kuantitas data yang diubah.",
        firstOfficialText: "Terjadi kehilangan integritas total (semua data dapat dimodifikasi tanpa hak), ATAU modifikasi sebagian data/fungsi yang menimbulkan konsekuensi langsung dan serius terhadap komponen terdampak."
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
        guidanceText: "Tidak ada dampak terhadap ketersediaan layanan atau sumber daya pada komponen terdampak.",
        mobileEvaluationContext: "Contoh ilustratif: fungsi dan responsivitas aplikasi tetap beroperasi secara normal.",
        firstOfficialText: "Tidak ada dampak terhadap ketersediaan layanan atau sumber daya pada komponen terdampak."
      },
      {
        code: "L",
        label: "Low",
        badge: "L",
        guidanceText: "Terjadi penurunan performa atau gangguan akses berkala, namun sumber daya tetap dapat diakses sebagian dan tidak menimbulkan konsekuensi langsung yang serius.",
        mobileEvaluationContext: "Contoh ilustratif: perlambatan sementara atau gangguan parsial tanpa pemadaman layanan. Tidak mengakibatkan kegagalan operasional yang serius.",
        firstOfficialText: "Terjadi penurunan performa atau gangguan akses berkala, namun sumber daya tetap dapat diakses sebagian dan tidak menimbulkan konsekuensi langsung yang serius."
      },
      {
        code: "H",
        label: "High",
        badge: "H",
        guidanceText: "Terjadi penolakan akses total (Denial of Service) baik yang bersifat persisten maupun terus-menerus selama serangan berlangsung, ATAU gangguan ketersediaan parsial yang menimbulkan konsekuensi langsung dan serius terhadap komponen terdampak.",
        mobileEvaluationContext: "Contoh ilustratif: aplikasi crash sepenuhnya, layanan lumpuh total, atau gangguan serius yang membuat fungsi utama tidak dapat digunakan selama eksploitasi. High tidak harus berupa crash permanen; pemadaman serius selama serangan berjalan dapat dinilai High.",
        firstOfficialText: "Terjadi penolakan akses total (Denial of Service) baik yang bersifat persisten maupun terus-menerus selama serangan berlangsung, ATAU gangguan ketersediaan parsial yang menimbulkan konsekuensi langsung dan serius terhadap komponen terdampak."
      }
    ]
  }
};
