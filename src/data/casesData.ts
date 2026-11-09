import type { TestCaseDossier } from "../types";

export const SANITIZED_TEST_CASES: TestCaseDossier[] = [
  // ==========================================
  // CASE-01: App-A (Mahasiswa) - Penyimpanan Data Sensitif Tanpa Enkripsi
  // Kontrol: MASTG-TEST-0287
  // ==========================================
  {
    caseId: "CASE-01",
    targetApp: "App-A",
    targetAppNameSanitized: "App-A (Aplikasi Mahasiswa)",
    controlId: "MASTG-TEST-0287",
    masvsCategory: "MASVS-STORAGE",
    testMethod: "DAST",
    isOverlappingControl: false,
    weaknessTaxonomy: {
      cweId: "CWE-312",
      cweTitle: "Cleartext Storage of Sensitive Information",
      masweId: "MASWE-0006",
      masweTitle: "Storing Sensitive Data in Cleartext"
    },
    findingTitle: "Penyimpanan Data Sensitif dan Kredensial Tanpa Enkripsi pada SharedPreferences",
    rootCause: "Aplikasi menyimpan token sesi aktif (JWT bearer token) dan data identitas pribadi mahasiswa (NIM, Nama Lengkap, Surel, Program Studi) serta nilai hash kata sandi lokal ke dalam file XML SharedPreferences standar (FlutterSharedPreferences.xml) dalam format teks polos (plaintext) tanpa proteksi kriptografis (seperti Hardware-backed Android KeyStore maupun pustaka EncryptedSharedPreferences).",
    stepByStepReproduction: [
      {
        stepNumber: 1,
        description: "Buka aplikasi App-A pada perangkat uji, lakukan proses autentikasi (login) menggunakan kredensial mahasiswa hingga berhasil masuk ke beranda aplikasi.",
        commandOrAction: "Aksi Pengguna: Login akun mahasiswa",
        observedEvidence: "Sesi autentikasi aktif berhasil terbentuk dan disimpan oleh sistem aplikasi."
      },
      {
        stepNumber: 2,
        description: "Periksa direktori data internal aplikasi di sandboxing sistem operasi Android menggunakan Android Debug Bridge (ADB) dengan hak akses root.",
        commandOrAction: "adb shell su -c \"cat /data/data/id.ac.unair.kampuskitamahasiswa/shared_prefs/FlutterSharedPreferences.xml\"",
        observedEvidence: "Ditemukan file FlutterSharedPreferences.xml yang memuat token otentikasi JWT ('flutter.access_token'), data identitas mahasiswa (NIM, Nama, Surel, Program Studi), serta 'flutter.validPassword' (hash kata sandi lokal) dalam bentuk teks biasa (plaintext)."
      }
    ],
    operationalImpact: {
      threatActor: "Pihak lain yang memegang fisik ponsel secara langsung saat tidak terkunci, penyerang yang mengekstrak berkas cadangan data lokal (unencrypted backup), atau aplikasi berbahaya yang berjalan pada perangkat Android yang telah di-root.",
      prerequisites: "Akses fisik ke perangkat ponsel atau akses terhadap direktori penyimpanan data internal aplikasi / cadangan lokal.",
      consequences: "Kerentanan ini membuka potensi risiko pengambilalihan akun (account takeover / session hijacking) apabila token sesi aktif yang belum kedaluwarsa diekstraksi oleh penyerang, serta potensi upaya pemecahan kata sandi secara luring (offline cracking) terhadap nilai hash kata sandi lokal yang tersimpan di dalam sandbox data aplikasi."
    },
    evidenceSnippets: [
      {
        title: "Cuplikan File FlutterSharedPreferences.xml",
        language: "xml",
        content: `<?xml version='1.0' encoding='utf-8' standalone='yes' ?>
<map>
    <string name="flutter.access_token">eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxODcyMjEwOTYiLCJuYW1lIjoiW1JFREFDVEVEXSIsImlhdCI6MTcwNDAxOTIwMCwiZXhwIjoxNzA0MTA1NjAwfQ.[SIGNATURE_TOKEN]</string>
    <string name="flutter.user_id">ID-88492019</string>
    <string name="flutter.tokenExpiry">2026-12-31T23:59:59Z</string>
    <string name="flutter.user_nim">187221096</string>
</map>`
      }
    ],
    images: [
      {
        caption: "Gambar Bukti: File FlutterSharedPreferences.xml pada App-A yang menyimpan token JWT dan kredensial pengguna secara teks biasa (plaintext)",
        url: "/evidence/case_img_24.png"
      }
    ]
  },

  // ==========================================
  // CASE-02: App-A (Mahasiswa) - Kebocoran Informasi Sensitif Melalui Logging
  // Kontrol: MASTG-TEST-0203 (DAST) + MASTG-TEST-0231 (SAST)
  // ==========================================
  {
    caseId: "CASE-02",
    targetApp: "App-A",
    targetAppNameSanitized: "App-A (Aplikasi Mahasiswa)",
    controlId: "MASTG-TEST-0203 + MASTG-TEST-0231",
    masvsCategory: "MASVS-STORAGE",
    testMethod: "DAST & SAST",
    isOverlappingControl: true,
    weaknessTaxonomy: {
      cweId: "CWE-532",
      cweTitle: "Insertion of Sensitive Information into Log File",
      masweId: "MASWE-0005",
      masweTitle: "Insertion of Sensitive Data into Logs"
    },
    findingTitle: "Kebocoran Informasi Sensitif Melalui Logging (Runtime Logcat & Residu Biner Native)",
    rootCause: "Terjadi kelemahan tata kelola informasi pada fase rilis produksi aplikasi yang terbukti melalui dua metode evaluasi:\n\n1. Pengujian Dinamis (DAST - MASTG-TEST-0203): Pengembang belum menonaktifkan instruksi cetak log konsol (print() atau debugPrint() pada Flutter) saat merilis aplikasi ke produksi. Ketika pengguna membuka modul Profil atau Kartu Tanda Mahasiswa Elektronik (e-KTM), aplikasi secara otomatis mencetak seluruh objek data respons JSON dari server ke saluran logcat sistem Android pada level Informational (I) dengan tag 'flutter'. Objek log ini memaparkan data pribadi (PII) mahasiswa secara menyeluruh (Nama Lengkap, NIM, Alamat Rumah detail, Tempat & Tanggal Lahir, Email Pribadi, Data Orang Tua/Wali termasuk Nama Ayah, Nama Ibu Kandung, dan Nomor HP), serta nilai 'Hash Password Preference'.\n\n2. Analisis Statis (SAST - MASTG-TEST-0231): Penelusuran statis terhadap biner native libapp.so (arsitektur x86_64) menemukan adanya string literal berupa label penanda data sensitif: 'ID_PENGGUNA', 'NIM_MHS', dan 'Hash Password Preference :'. Keberadaan string ini membuktikan bahwa biner rilis masih menyimpan residu konstruksi teks dari fungsi pencatatan internal, yang berkorelasi langsung dengan variabel data sensitif yang tercetak pada saluran logcat saat runtime.",
    stepByStepReproduction: [
      {
        stepNumber: 1,
        testCaseRef: "MASTG-TEST-0203 (DAST)",
        description: "Hubungkan perangkat Android ke stasiun kerja uji menggunakan Android Debug Bridge (ADB), lalu jalankan pemantauan saluran logcat secara real-time.",
        commandOrAction: "adb logcat | grep -iE 'flutter'",
        observedEvidence: "Saluran log sistem Android siap memantau keluaran tag flutter."
      },
      {
        stepNumber: 2,
        testCaseRef: "MASTG-TEST-0203 (DAST)",
        description: "Masuk ke akun mahasiswa, klik menu Profil pada bilah navigasi bawah, lalu buka halaman Kartu Tanda Mahasiswa Elektronik (e-KTM).",
        commandOrAction: "Aksi Pengguna: Navigasi -> Menu Profil -> Buka e-KTM",
        observedEvidence: "Aplikasi langsung memuntahkan objek JSON lengkap ke saluran logcat sistem Android, memuat Nama Lengkap, NIM, Tempat & Tanggal Lahir, Alamat Rumah, Surel Pribadi, Data Orang Tua/Wali (Nama Ayah, Nama Ibu Kandung, No. Telepon), serta nilai 'Hash Password Preference'."
      },
      {
        stepNumber: 3,
        testCaseRef: "MASTG-TEST-0231 (SAST)",
        description: "Ekstraksi berkas pustaka biner native arsitektur x86_64 dari paket APK rilis produksi App-A:",
        commandOrAction: "unzip -p App-A.apk lib/x86_64/libapp.so > libcore_engine.so",
        observedEvidence: "Biner native libapp.so (disimpan sebagai libcore_engine.so) berhasil diekstraksi."
      },
      {
        stepNumber: 4,
        testCaseRef: "MASTG-TEST-0231 (SAST)",
        description: "Ekstraksi teks statis (string literal) dari biner mesin untuk mendeteksi residu penanda parameter pencatatan internal:",
        commandOrAction: "strings libcore_engine.so | grep -iE 'NIM_MHS|ID_PENGGUNA|Hash Password'",
        observedEvidence: "Ditemukan string literal statis 'NIM_MHS', 'ID_PENGGUNA', dan 'Hash Password Preference :' di dalam biner terkompilasi, mengonfirmasi keberadaan residu label pencatatan internal pada biner rilis."
      }
    ],
    operationalImpact: {
      threatActor: "Penyerang lokal yang meminjam/mengakses fisik perangkat, aplikasi pihak ketiga berbahaya di perangkat (pada versi OS atau konfigurasi yang memiliki izin baca log sistem), atau pihak yang merekayasa balik berkas APK rilis produksi.",
      prerequisites: "Akses ke antarmuka ADB/logcat perangkat saat atau sesudah sesi aplikasi berjalan, atau kepemilikan berkas biner APK produksi.",
      consequences: "Kebocoran menyeluruh data privasi (PII) mahasiswa dan keluarga yang berpotensi dimanfaatkan untuk rekayasa sosial (social engineering) atau profiling korban, serta terungkapnya nilai hash kata sandi lokal yang membuka risiko peretasan akun via offline cracking. Residu string pada biner native membuka petunjuk struktural (architectural footprint) penamaan variabel internal yang memperkuat kemudahan analisis alur data sensitif."
    },
    evidenceSnippets: [
      {
        title: "Cuplikan Logcat Hasil Ekstraksi Runtime (ADB Terminal)",
        testCaseRef: "MASTG-TEST-0203 (DAST)",
        language: "json",
        content: `I/flutter ( 4210): {
  "status": 200,
  "message": "success",
  "data": {
    "nama": "[NAMA_LENGKAP_MAHASISWA]",
    "nim": "187221096",
    "fakultas": "FAKULTAS_SAINS_DAN_TEKNOLOGI",
    "prodi": "S1_TEKNOLOGI_INFORMASI",
    "tempat_lahir": "SURABAYA",
    "tanggal_lahir": "2003-05-14",
    "alamat": "JL. TEKNOLOGI NO. 12 [DISAMARKAN]",
    "email": "student.user@mail.target.internal",
    "hash_password_preference": "8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92",
    "wali": {
      "nama_ayah": "[NAMA_AYAH_WALI]",
      "nama_ibu": "[NAMA_IBU_KANDUNG]",
      "telepon": "0812XXXXXXXX"
    }
  }
}`
      },
      {
        title: "Keluaran Ekstraksi String pada Biner Mesin (libcore_engine.so)",
        testCaseRef: "MASTG-TEST-0231 (SAST)",
        language: "plaintext",
        content: `$ strings libcore_engine.so | grep -iE 'nim_mhs|id_pengguna|hash password'
NIM_MHS
ID_PENGGUNA
Hash Password Preference :
user_auth_vault_token`
      }
    ],
    images: [
      {
        caption: "Gambar Bukti DAST 1: Keluaran logcat pada App-A yang memaparkan data pribadi lengkap mahasiswa, data orang tua, serta nilai Hash Password Preference",
        url: "/evidence/case_img_18.png",
        testCaseRef: "MASTG-TEST-0203 (DAST)"
      },
      {
        caption: "Gambar Bukti DAST 2: Detail pemaparan nilai hash kata sandi lokal dan respons jadwal perkuliahan pada logcat",
        url: "/evidence/case_img_19.png",
        testCaseRef: "MASTG-TEST-0203 (DAST)"
      },
      {
        caption: "Gambar Bukti SAST: Ekstraksi teks string label penanda identitas dan kredensial pada biner native libapp.so App-A",
        url: "/evidence/case_img_30.png",
        testCaseRef: "MASTG-TEST-0231 (SAST)"
      }
    ]
  },

  // ==========================================
  // CASE-03: App-A (Mahasiswa) - Konfigurasi Cleartext Traffic Permisif
  // Kontrol: MASTG-TEST-0235
  // ==========================================
  {
    caseId: "CASE-03",
    targetApp: "App-A",
    targetAppNameSanitized: "App-A (Aplikasi Mahasiswa)",
    controlId: "MASTG-TEST-0235",
    masvsCategory: "MASVS-NETWORK",
    testMethod: "SAST",
    isOverlappingControl: false,
    weaknessTaxonomy: {
      cweId: "CWE-319",
      cweTitle: "Cleartext Transmission of Sensitive Information",
      masweId: "MASWE-0010",
      masweTitle: "Cleartext Communication Allowed"
    },
    findingTitle: "Konfigurasi Manifes Mengizinkan Lalu Lintas Cleartext (android:usesCleartextTraffic='true')",
    rootCause: "Pada file AndroidManifest.xml, pengembang secara eksplisit mendeklarasikan atribut android:usesCleartextTraffic='true' pada elemen <application> dan tidak menyertakan deklarasi pembatasan domain melalui Network Security Configuration (android:networkSecurityConfig). Berdasarkan hasil pengujian dinamis lalu lintas jaringan (MASTG-TEST-0218 dan MASTG-TEST-0233), saat ini seluruh komunikasi utama aplikasi telah berjalan di atas protokol aman HTTPS (TLS 1.3) dan tidak teramati adanya transmisi HTTP port 80 aktif. Namun, deklarasi usesCleartextTraffic='true' ini secara arsitektural menonaktifkan proteksi default sistem Android (yang sejak Android 9 Pie secara baku memblokir lalu lintas HTTP teks polos). Hal ini merupakan celah keamanan laten yang secara legal mengizinkan sistem operasi meloloskan komunikasi teks polos tanpa enkripsi apabila di kemudian hari terdapat penambahan fitur, integrasi pustaka pihak ketiga (third-party library), atau pemanggilan URL HTTP biasa.",
    stepByStepReproduction: [
      {
        stepNumber: 1,
        description: "Dekompilasi berkas instalasi APK rilis produksi App-A menggunakan alat rekayasa balik Apktool.",
        commandOrAction: "apktool d App-A.apk -o hasil_dekompilasi",
        observedEvidence: "Seluruh manifes dan aset aplikasi berhasil diekstrak."
      },
      {
        stepNumber: 2,
        description: "Periksa atribut elemen <application> pada file AndroidManifest.xml untuk melihat kebijakan keamanan lalu lintas jaringan.",
        commandOrAction: "grep -n 'usesCleartextTraffic' hasil_dekompilasi/AndroidManifest.xml",
        observedEvidence: "Terbukti ditemukan deklarasi android:usesCleartextTraffic='true' aktif secara global pada tag application dan tidak ditemukan konfigurasi pembatasan android:networkSecurityConfig."
      }
    ],
    operationalImpact: {
      threatActor: "Penyerang Man-in-the-Middle (MitM) yang berada di jaringan nirkabel yang sama (misalnya Wi-Fi publik kampus atau kafe tanpa proteksi).",
      prerequisites: "Pengguna terhubung ke Wi-Fi publik yang sama dengan penyerang, dan terdapat komponen atau fitur aplikasi (saat ini maupun pembaruan masa depan) yang mengeksekusi komunikasi HTTP biasa.",
      consequences: "Karena sistem operasi Android diizinkan melewatkan lalu lintas teks biasa oleh konfigurasi aplikasi, paket data pada transmisi HTTP yang tidak terenkripsi rentan disadap, dibaca, atau dimanipulasi oleh penyerang melalui serangan Man-in-the-Middle (MitM). (Catatan: Pengujian lalu lintas dinamis saat ini membuktikan komunikasi utama terenkripsi TLS 1.3, sehingga status temuan ini merefleksikan kelemahan konfigurasi permisif / risiko arsitektural potensial)."
    },
    evidenceSnippets: [
      {
        title: "Potongan File AndroidManifest.xml",
        language: "xml",
        content: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="org.target.appa">
    <uses-permission android:name="android.permission.INTERNET"/>
    <application
        android:label="App-A"
        android:icon="@mipmap/ic_launcher"
        android:usesCleartextTraffic="true">
        <!-- Aktivitas aplikasi; tidak ada atribut android:networkSecurityConfig -->
    </application>
</manifest>`
      }
    ],
    images: [
      {
        caption: "Gambar Bukti 1: Deklarasi android:usesCleartextTraffic='true' pada file AndroidManifest.xml aplikasi App-A",
        url: "/evidence/case_img_26.png"
      },
      {
        caption: "Gambar Bukti 2: Potongan file manifes yang menunjukkan tidak adanya batasan whitelist ketat untuk lalu lintas cleartext",
        url: "/evidence/case_img_27.png"
      }
    ]
  },

  // ==========================================
  // CASE-04: App-B (Orang Tua) - Kebocoran Informasi Sensitif Melalui Logging
  // Kontrol: MASTG-TEST-0203 (DAST) + MASTG-TEST-0231 (SAST)
  // ==========================================
  {
    caseId: "CASE-04",
    targetApp: "App-B",
    targetAppNameSanitized: "App-B (Aplikasi Orang Tua)",
    controlId: "MASTG-TEST-0203 + MASTG-TEST-0231",
    masvsCategory: "MASVS-STORAGE",
    testMethod: "DAST & SAST",
    isOverlappingControl: true,
    weaknessTaxonomy: {
      cweId: "CWE-532",
      cweTitle: "Insertion of Sensitive Information into Log File",
      masweId: "MASWE-0005",
      masweTitle: "Insertion of Sensitive Data into Logs"
    },
    findingTitle: "Kebocoran Informasi Sensitif Melalui Logging (Runtime Logcat & Residu Biner Native)",
    rootCause: "Terjadi kelemahan tata kelola informasi pada fase rilis aplikasi yang terbukti melalui dua metode evaluasi:\n\n1. Pengujian Dinamis (DAST - MASTG-TEST-0203): Aplikasi menerapkan mekanisme pencatatan log otomatis berbasis event antarmuka (event-driven logging). Setiap perpindahan menu pengguna (misal: Beranda, Presensi Kuliah, Prestasi Mahasiswa), aplikasi mencetak URL permintaan API lengkap ke logcat Android dengan tag 'flutter' pada level Informational. URL tersebut secara gamblang memuat parameter token akses aktif ('access-token=act_...'), NIM mahasiswa, kode mata kuliah, serta isi respons server portofolio prestasi mahasiswa. Pengujian empiris lanjutan via cURL membuktikan bahwa token akses aktif yang bocor tersebut dapat digunakan ulang (replay attack) dari stasiun kerja luar tanpa kredensial login untuk menarik data IPK dan transkrip nilai mahasiswa.\n\n2. Analisis Statis (SAST - MASTG-TEST-0231): Penelusuran statis terhadap biner native libapp.so (libcore_parent.so) menemukan teks pesan galat eksplisit ('Failed to get photo token:') dan nama-nama parameter formulir autentikasi ('LoginForm[password]', 'LoginForm[username]', 'access_token', 'tokenExpiry', 'user_nim', 'user_name'). Temuan ini mengonfirmasi adanya residu logika autentikasi dan penanganan token pada biner rilis produksi yang berkorelasi dengan pemrosesan token autentikasi yang terpapar di saluran logcat.",
    stepByStepReproduction: [
      {
        stepNumber: 1,
        testCaseRef: "MASTG-TEST-0203 (DAST)",
        description: "Hubungkan perangkat uji App-B ke komputer dan pantau keluaran logcat Android secara real-time.",
        commandOrAction: "adb logcat | grep -iE 'flutter'",
        observedEvidence: "Pemantauan logcat aktif memfilter keluaran tag flutter."
      },
      {
        stepNumber: 2,
        testCaseRef: "MASTG-TEST-0203 (DAST)",
        description: "Buka dan navigasikan menu-menu pada aplikasi App-B: Beranda -> Presensi Perkuliahan -> Prestasi Mahasiswa.",
        commandOrAction: "Aksi Pengguna: Berpindah halaman antarmuka",
        observedEvidence: "Setiap perpindahan memunculkan URL API lengkap di saluran logcat, memuat 'access-token=act_...', 'student_id=187221096', dan isi respons server portofolio mahasiswa secara teks biasa."
      },
      {
        stepNumber: 3,
        testCaseRef: "MASTG-TEST-0203 (DAST)",
        description: "Uji keabsahan token yang didapat dari logcat dengan mengirim permintaan mandiri menggunakan cURL (Proof of Concept Replay Attack).",
        commandOrAction: "curl \"https://api.target.internal/v2/academic/view-gpa?access-token=act_99c0182fa7e811b&student_id=187221096\"",
        observedEvidence: "Server menerima token tersebut dan langsung menampilkan data Indeks Prestasi Kumulatif (IPK) serta transkrip nilai mahasiswa secara lengkap tanpa meminta otentikasi ulang."
      },
      {
        stepNumber: 4,
        testCaseRef: "MASTG-TEST-0231 (SAST)",
        description: "Ekstraksi berkas pustaka biner native arsitektur x86_64 dari paket APK rilis produksi App-B:",
        commandOrAction: "unzip -p App-B.apk lib/x86_64/libapp.so > libcore_parent.so",
        observedEvidence: "Biner native libapp.so (disimpan sebagai libcore_parent.so) berhasil diekstraksi."
      },
      {
        stepNumber: 5,
        testCaseRef: "MASTG-TEST-0231 (SAST)",
        description: "Ekstraksi teks statis (string literal) dari biner mesin untuk memeriksa residu logika autentikasi dan penanganan kesalahan:",
        commandOrAction: "strings libcore_parent.so | grep -iE 'LoginForm|photo token|tokenExpiry'",
        observedEvidence: "Ditemukan string pesan galat eksplisit 'Failed to get photo token:' serta nama parameter formulir login: 'LoginForm[password]', 'LoginForm[username]', 'access_token', 'tokenExpiry', 'user_nim', dan 'user_name'."
      }
    ],
    operationalImpact: {
      threatActor: "Aplikasi pihak ketiga dengan kemampuan membaca log sistem, pihak yang meminjam/mengakses perangkat secara fisik, atau penyerang yang mengekstrak logcat ponsel dan biner APK rilis.",
      prerequisites: "Akses ke log sistem Android saat atau sesudah sesi aplikasi berjalan, atau berkas biner APK produksi.",
      consequences: "Kebocoran token otorisasi aktif yang terbukti secara empiris dapat dipakai untuk serangan replay (replay attack), memungkinkan pihak luar mengakses nilai akademik, presensi kuliah, dan data prestasi mahasiswa tanpa hak akses yang sah. Residu string pada biner native membuka petunjuk struktural (architectural footprint) parameter autentikasi yang mempermudah analisis alur otorisasi."
    },
    evidenceSnippets: [
      {
        title: "Cuplikan Logcat HTTP GET dengan Parameter Token",
        testCaseRef: "MASTG-TEST-0203 (DAST)",
        language: "plaintext",
        content: `I/flutter ( 5120): GET https://api.target.internal/v2/academic/view-gpa?access-token=act_99c0182fa7e811b&student_id=187221096 HTTP/1.1
I/flutter ( 5120): GET https://api.target.internal/v2/attendance?access-token=act_99c0182fa7e811b&course_code=CS401&student_id=187221096 HTTP/1.1
I/flutter ( 5120): GET https://api.target.internal/v2/achievements/list?access-token=act_99c0182fa7e811b HTTP/1.1`
      },
      {
        title: "Cuplikan String pada Biner Mesin App-B",
        testCaseRef: "MASTG-TEST-0231 (SAST)",
        language: "plaintext",
        content: `$ strings libcore_parent.so | grep -iE 'loginform|tokenexpiry|photo token'
Failed to get photo token:
LoginForm[password]
LoginForm[username]
access_token
tokenExpiry
user_nim
user_name`
      }
    ],
    images: [
      {
        caption: "Gambar Bukti DAST 1: Logcat pemaparan URL endpoint beranda (view-ipk) yang memuat parameter access-token aktif dan NIM mahasiswa",
        url: "/evidence/image_15.png",
        testCaseRef: "MASTG-TEST-0203 (DAST)"
      },
      {
        caption: "Gambar Bukti DAST 2: Logcat pemaparan URL endpoint presensi kuliah yang memuat parameter access-token, NIM, dan kode mata kuliah",
        url: "/evidence/case_img_21.png",
        testCaseRef: "MASTG-TEST-0203 (DAST)"
      },
      {
        caption: "Gambar Bukti DAST 3: Logcat App-B yang memaparkan token otorisasi dan respons data prestasi mahasiswa setiap perpindahan menu",
        url: "/evidence/case_img_22.png",
        testCaseRef: "MASTG-TEST-0203 (DAST)"
      },
      {
        caption: "Gambar Bukti DAST 4: Pembuktian eksploitasi nyata (PoC replay attack) menggunakan cURL berbekal token dari logcat untuk menarik data akademik",
        url: "/evidence/case_img_23.png",
        testCaseRef: "MASTG-TEST-0203 (DAST)"
      },
      {
        caption: "Gambar Bukti SAST: Ekstraksi pesan galat dan nama parameter form login pada biner native libapp.so aplikasi App-B",
        url: "/evidence/case_img_31.png",
        testCaseRef: "MASTG-TEST-0231 (SAST)"
      }
    ]
  }
];
