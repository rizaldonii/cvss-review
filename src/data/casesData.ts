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
    findingTitle: "Penyimpanan Kredensial dan Data Sensitif Tanpa Enkripsi pada SharedPreferences",
    rootCause: "Aplikasi menyimpan token sesi aktif (JWT bearer token), identitas mahasiswa (NIM, nama, email, program studi), dan nilai hash kata sandi lokal ke dalam berkas XML SharedPreferences standar (FlutterSharedPreferences.xml) dalam format teks polos (plaintext), tanpa menggunakan Android KeyStore maupun pustaka EncryptedSharedPreferences.",
    stepByStepReproduction: [
      {
        stepNumber: 1,
        description: "Buka aplikasi App-A pada perangkat uji, lakukan proses masuk (login) menggunakan akun mahasiswa hingga sampai di beranda.",
        commandOrAction: "Aksi: Login akun mahasiswa",
        observedEvidence: "Sesi login aktif berhasil dibuat dan disimpan oleh aplikasi."
      },
      {
        stepNumber: 2,
        description: "Periksa direktori data internal aplikasi di sandboxing sistem Android menggunakan shell ADB dengan hak akses root.",
        commandOrAction: "adb shell su -c \"cat /data/data/org.target.appa/shared_prefs/FlutterSharedPreferences.xml\"",
        observedEvidence: "Ditemukan berkas FlutterSharedPreferences.xml yang memuat token otentikasi 'flutter.access_token', identitas pengguna, dan hash kata sandi lokal dalam format teks polos (plaintext)."
      }
    ],
    operationalImpact: {
      threatActor: "Pihak yang memegang fisik ponsel secara langsung saat tidak terkunci, penyerang yang mengekstrak berkas cadangan lokal (unencrypted backup), atau aplikasi lain pada perangkat Android yang telah di-root.",
      prerequisites: "Akses fisik ke perangkat atau akses terhadap direktori internal aplikasi / berkas cadangan lokal.",
      consequences: "Membuka potensi pengambilalihan sesi (session hijacking) apabila token aktif diekstraksi sebelum kedaluwarsa, serta potensi upaya pemecahan kata sandi secara luring (offline cracking) terhadap nilai hash lokal."
    },
    evidenceSnippets: [
      {
        title: "Cuplikan berkas FlutterSharedPreferences.xml",
        language: "xml",
        content: `<?xml version='1.0' encoding='utf-8' standalone='yes' ?>
<map>
    <string name="flutter.access_token">eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJbTklNX01BSEFTSVNXQV0iLCJuYW1lIjoiW1JFREFDVEVEXSIsImlhdCI6MTcwNDAxOTIwMCwiZXhwIjoxNzA0MTA1NjAwfQ.[SIGNATURE_TOKEN]</string>
    <string name="flutter.user_id">ID-88492019</string>
    <string name="flutter.tokenExpiry">2026-12-31T23:59:59Z</string>
    <string name="flutter.user_nim">[NIM_MAHASISWA]</string>
</map>`
      }
    ],
    images: [
      {
        caption: "Berkas FlutterSharedPreferences.xml pada App-A yang memuat token JWT dan identitas dalam format teks polos",
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
    findingTitle: "Kebocoran Informasi Sensitif Melalui Logging (Runtime Logcat dan Residu Biner Native)",
    rootCause: "Kelemahan tata kelola informasi pada fase rilis aplikasi yang terbukti melalui dua metode pengujian:\n\n1. Pengujian Dinamis (DAST - MASTG-TEST-0203): Instruksi cetak log konsol (print() atau debugPrint() pada Flutter) masih aktif pada versi rilis produksi. Ketika pengguna membuka modul Profil atau Kartu Tanda Mahasiswa Elektronik (e-KTM), aplikasi secara otomatis mencetak objek data respons JSON lengkap ke logcat sistem Android dengan tag 'flutter'. Log ini memaparkan data pribadi mahasiswa (nama, NIM, alamat, tempat/tanggal lahir, email pribadi, data orang tua/wali) serta nilai hash kata sandi lokal.\n\n2. Analisis Statis (SAST - MASTG-TEST-0231): Penelusuran terhadap biner native libapp.so menemukan residu string literal penanda variabel: 'ID_PENGGUNA', 'NIM_MHS', dan 'Hash Password Preference :'. Hal ini menunjukkan adanya residu konstruksi teks pencatatan internal pada biner rilis produksi yang berkorelasi dengan pemrosesan data sensitif di logcat saat runtime.",
    stepByStepReproduction: [
      {
        stepNumber: 1,
        testCaseRef: "MASTG-TEST-0203 (DAST)",
        description: "Hubungkan perangkat Android ke komputer pengujian via ADB dan jalankan pemantauan logcat.",
        commandOrAction: "adb logcat | grep -iE 'flutter'",
        observedEvidence: "Aliran log sistem Android siap memantau keluaran tag flutter."
      },
      {
        stepNumber: 2,
        testCaseRef: "MASTG-TEST-0203 (DAST)",
        description: "Masuk ke akun mahasiswa, navigasi ke menu Profil, lalu buka halaman Kartu Tanda Mahasiswa Elektronik (e-KTM).",
        commandOrAction: "Aksi: Menu Profil -> Buka e-KTM",
        observedEvidence: "Aplikasi mencetak objek JSON lengkap ke saluran logcat sistem Android, memuat data pribadi mahasiswa, data wali, serta nilai 'Hash Password Preference'."
      },
      {
        stepNumber: 3,
        testCaseRef: "MASTG-TEST-0231 (SAST)",
        description: "Ekstraksi berkas pustaka biner native arsitektur x86_64 dari paket APK rilis produksi App-A.",
        commandOrAction: "unzip -p App-A.apk lib/x86_64/libapp.so > libcore_engine.so",
        observedEvidence: "Biner native libapp.so berhasil diekstraksi sebagai libcore_engine.so."
      },
      {
        stepNumber: 4,
        testCaseRef: "MASTG-TEST-0231 (SAST)",
        description: "Ekstraksi string statis dari biner mesin untuk mendeteksi penanda parameter pencatatan internal.",
        commandOrAction: "strings libcore_engine.so | grep -iE 'NIM_MHS|ID_PENGGUNA|Hash Password'",
        observedEvidence: "Ditemukan string literal statis 'NIM_MHS', 'ID_PENGGUNA', dan 'Hash Password Preference :' di dalam biner mesin terkompilasi."
      }
    ],
    operationalImpact: {
      threatActor: "Penyerang lokal yang meminjam/mengakses fisik perangkat, aplikasi lain di perangkat dengan izin pembacaan log sistem, atau pihak yang melakukan rekayasa balik luring terhadap berkas APK.",
      prerequisites: "Akses ke logcat sistem Android saat sesi berjalan atau kepemilikan berkas biner APK produksi.",
      consequences: "Paparan data pribadi (PII) mahasiswa dan wali yang dapat dimanfaatkan untuk rekayasa sosial, serta terbukanya nilai hash kata sandi lokal untuk potensi offline cracking. Residu string biner native membuka petunjuk struktural penamaan variabel internal aplikasi."
    },
    evidenceSnippets: [
      {
        title: "Cuplikan logcat hasil pengamatan (ADB Terminal)",
        testCaseRef: "MASTG-TEST-0203 (DAST)",
        language: "json",
        content: `I/flutter ( 4210): {
  "status": 200,
  "message": "success",
  "data": {
    "nama": "[NAMA_LENGKAP_MAHASISWA]",
    "nim": "[NIM_MAHASISWA]",
    "fakultas": "[FAKULTAS]",
    "prodi": "[PROGRAM_STUDI]",
    "tempat_lahir": "[KOTA_LAHIR]",
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
        title: "Ekstraksi string pada biner mesin (libcore_engine.so)",
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
        caption: "Keluaran logcat pada App-A yang memaparkan data pribadi mahasiswa, data wali, serta nilai Hash Password Preference",
        url: "/evidence/case_img_18.png",
        testCaseRef: "MASTG-TEST-0203 (DAST)"
      },
      {
        caption: "Detail pemaparan nilai hash kata sandi lokal dan respons jadwal perkuliahan pada logcat",
        url: "/evidence/case_img_19.png",
        testCaseRef: "MASTG-TEST-0203 (DAST)"
      },
      {
        caption: "Ekstraksi string label penanda identitas dan kredensial pada biner native libapp.so App-A",
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
    rootCause: "Fakta Pengujian (SAST): Pada berkas AndroidManifest.xml, pengembang secara eksplisit mendeklarasikan atribut android:usesCleartextTraffic='true' pada elemen <application> dan tidak menyertakan konfigurasi pembatasan domain melalui Network Security Configuration. Fakta Pengujian (DAST): Pengujian dinamis lalu lintas jaringan (MASTG-TEST-0218 dan MASTG-TEST-0233) membuktikan bahwa seluruh komunikasi aplikasi yang teramati saat ini telah terenkripsi menggunakan HTTPS (TLS 1.3), dan tidak ditemukan adanya transmisi data melalui HTTP tanpa enkripsi. Prasyarat Eksploitasi: Diperlukan penyerang yang berada pada jalur jaringan bersama (serangan MitM) serta adanya pemanggilan URL HTTP tanpa enkripsi oleh fitur tambahan atau pustaka pihak ketiga di masa mendatang. Konsekuensi Potensial: Deklarasi permisif ini menonaktifkan proteksi baku platform Android (yang secara default memblokir lalu lintas HTTP sejak Android 9), sehingga apabila di kemudian hari terdapat lalu lintas HTTP, transmisi tersebut tidak akan diblokir oleh platform dan berpotensi disadap atau dimanipulasi.",
    stepByStepReproduction: [
      {
        stepNumber: 1,
        description: "Dekomplikasi berkas instalasi APK rilis produksi App-A menggunakan alat rekayasa balik Apktool.",
        commandOrAction: "apktool d App-A.apk -o hasil_dekompilasi",
        observedEvidence: "Seluruh berkas manifes dan aset aplikasi berhasil diekstrak."
      },
      {
        stepNumber: 2,
        description: "Periksa atribut elemen <application> pada berkas AndroidManifest.xml untuk memverifikasi kebijakan lalu lintas jaringan.",
        commandOrAction: "grep -n 'usesCleartextTraffic' hasil_dekompilasi/AndroidManifest.xml",
        observedEvidence: "Ditemukan deklarasi android:usesCleartextTraffic='true' aktif secara global tanpa pembatasan domain dari android:networkSecurityConfig."
      }
    ],
    operationalImpact: {
      threatActor: "Penyerang Man-in-the-Middle (MitM) yang berada pada jalur jaringan yang sama (misalnya jaringan nirkabel lokal tanpa proteksi).",
      prerequisites: "Pengguna terhubung ke jaringan bersama penyerang DAN aplikasi atau pustaka dependensi melakukan pemanggilan endpoint HTTP tanpa enkripsi (tidak teramati pada pengujian dinamis saat ini).",
      consequences: "Konsekuensi Potensial: Karena konfigurasi aplikasi mengizinkan lalu lintas teks biasa, setiap transmisi HTTP yang terjadi di masa mendatang tidak akan dicegah oleh platform Android dan rentan terhadap penyadapan atau manipulasi MitM. Temuan ini merupakan kelemahan konfigurasi permisif (risiko arsitektural), bukan temuan kebocoran lalu lintas aktif."
    },
    evidenceSnippets: [
      {
        title: "Potongan berkas AndroidManifest.xml",
        language: "xml",
        content: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="org.target.appa">
    <uses-permission android:name="android.permission.INTERNET"/>
    <application
        android:label="App-A"
        android:icon="@mipmap/ic_launcher"
        android:usesCleartextTraffic="true">
        <!-- Aktivitas aplikasi; tidak terdapat konfigurasi pembatasan domain -->
    </application>
</manifest>`
      }
    ],
    images: [
      {
        caption: "Deklarasi android:usesCleartextTraffic='true' pada berkas AndroidManifest.xml aplikasi App-A",
        url: "/evidence/case_img_26.png"
      },
      {
        caption: "Potongan berkas manifes yang menunjukkan ketiadaan pembatasan whitelist ketat untuk lalu lintas cleartext",
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
    findingTitle: "Kebocoran Informasi Sensitif Melalui Logging (Runtime Logcat dan Residu Biner Native)",
    rootCause: "Kelemahan tata kelola informasi pada fase rilis aplikasi yang terbukti melalui dua metode pengujian:\n\n1. Pengujian Dinamis (DAST - MASTG-TEST-0203): Aplikasi menerapkan pencatatan log otomatis berbasis event antarmuka. Setiap perpindahan menu (Beranda, Presensi Kuliah, Prestasi Mahasiswa), aplikasi mencetak URL permintaan API ke logcat sistem Android dengan tag 'flutter'. URL tersebut memuat parameter token akses aktif ('access-token=act_...'), NIM mahasiswa, kode mata kuliah, serta isi respons server secara teks biasa. Pengujian lanjutan via cURL membuktikan token akses aktif yang bocor tersebut dapat digunakan ulang (replay attack) dari luar perangkat tanpa kredensial login untuk mengakses data transkrip nilai mahasiswa.\n\n2. Analisis Statis (SAST - MASTG-TEST-0231): Penelusuran terhadap biner native libapp.so (libcore_parent.so) menemukan teks pesan galat ('Failed to get photo token:') dan nama parameter formulir login ('LoginForm[password]', 'LoginForm[username]', 'access_token', 'tokenExpiry', 'user_nim', 'user_name'). Hal ini mengonfirmasi adanya residu logika autentikasi pada biner rilis produksi yang berkorelasi dengan pemrosesan token autentikasi yang terpapar di logcat.",
    stepByStepReproduction: [
      {
        stepNumber: 1,
        testCaseRef: "MASTG-TEST-0203 (DAST)",
        description: "Hubungkan perangkat uji App-B ke komputer dan pantau keluaran logcat Android.",
        commandOrAction: "adb logcat | grep -iE 'flutter'",
        observedEvidence: "Pemantauan logcat aktif memfilter keluaran tag flutter."
      },
      {
        stepNumber: 2,
        testCaseRef: "MASTG-TEST-0203 (DAST)",
        description: "Buka dan navigasikan menu pada aplikasi App-B: Beranda -> Presensi Perkuliahan -> Prestasi Mahasiswa.",
        commandOrAction: "Aksi: Berpindah halaman antarmuka",
        observedEvidence: "Setiap perpindahan memunculkan URL API lengkap di logcat, memuat 'access-token=act_...', 'student_id=[NIM_MAHASISWA]', dan isi respons server secara teks biasa."
      },
      {
        stepNumber: 3,
        testCaseRef: "MASTG-TEST-0203 (DAST)",
        description: "Uji keabsahan token yang didapat dari logcat dengan mengirim permintaan mandiri menggunakan cURL.",
        commandOrAction: "curl \"https://api.target.internal/v2/academic/view-gpa?access-token=act_99c0182fa7e811b&student_id=[NIM_MAHASISWA]\"",
        observedEvidence: "Server menerima token tersebut dan mengembalikan data Indeks Prestasi Kumulatif (IPK) serta transkrip nilai mahasiswa secara lengkap tanpa meminta login ulang."
      },
      {
        stepNumber: 4,
        testCaseRef: "MASTG-TEST-0231 (SAST)",
        description: "Ekstraksi berkas pustaka biner native arsitektur x86_64 dari paket APK rilis produksi App-B.",
        commandOrAction: "unzip -p App-B.apk lib/x86_64/libapp.so > libcore_parent.so",
        observedEvidence: "Biner native libapp.so berhasil diekstraksi sebagai libcore_parent.so."
      },
      {
        stepNumber: 5,
        testCaseRef: "MASTG-TEST-0231 (SAST)",
        description: "Ekstraksi string statis dari biner mesin untuk memeriksa residu logika autentikasi dan penanganan kesalahan.",
        commandOrAction: "strings libcore_parent.so | grep -iE 'LoginForm|photo token|tokenExpiry'",
        observedEvidence: "Ditemukan string pesan galat 'Failed to get photo token:' serta nama parameter form login: 'LoginForm[password]', 'LoginForm[username]', 'access_token', 'tokenExpiry', 'user_nim', dan 'user_name'."
      }
    ],
    operationalImpact: {
      threatActor: "Aplikasi pihak ketiga dengan kemampuan membaca log sistem, pihak yang meminjam/mengakses perangkat secara fisik, atau penyerang yang mengekstrak logcat ponsel dan biner APK rilis.",
      prerequisites: "Akses ke log sistem Android saat atau sesudah sesi aplikasi berjalan, atau berkas biner APK produksi.",
      consequences: "Kebocoran token otorisasi aktif yang terbukti dapat digunakan untuk replay attack, memungkinkan akses ke nilai akademik, presensi kuliah, dan data prestasi mahasiswa. Residu string biner native membuka petunjuk struktural penamaan parameter formulir autentikasi."
    },
    evidenceSnippets: [
      {
        title: "Cuplikan logcat HTTP GET dengan parameter token",
        testCaseRef: "MASTG-TEST-0203 (DAST)",
        language: "plaintext",
        content: `I/flutter ( 5120): GET https://api.target.internal/v2/academic/view-gpa?access-token=act_99c0182fa7e811b&student_id=[NIM_MAHASISWA] HTTP/1.1
I/flutter ( 5120): GET https://api.target.internal/v2/attendance?access-token=act_99c0182fa7e811b&course_code=CS401&student_id=[NIM_MAHASISWA] HTTP/1.1
I/flutter ( 5120): GET https://api.target.internal/v2/achievements/list?access-token=act_99c0182fa7e811b HTTP/1.1`
      },
      {
        title: "Cuplikan string pada biner mesin App-B",
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
        caption: "Logcat pemaparan URL endpoint beranda yang memuat access-token dan NIM mahasiswa",
        url: "/evidence/image_15.png",
        testCaseRef: "MASTG-TEST-0203 (DAST)"
      },
      {
        caption: "Logcat pemaparan URL endpoint presensi kuliah yang memuat access-token, NIM, dan kode mata kuliah",
        url: "/evidence/case_img_21.png",
        testCaseRef: "MASTG-TEST-0203 (DAST)"
      },
      {
        caption: "Logcat App-B yang memaparkan token otorisasi dan respons data prestasi mahasiswa setiap perpindahan menu",
        url: "/evidence/case_img_22.png",
        testCaseRef: "MASTG-TEST-0203 (DAST)"
      },
      {
        caption: "Pembuktian eksploitasi replay attack menggunakan cURL berbekal token dari logcat",
        url: "/evidence/case_img_23.png",
        testCaseRef: "MASTG-TEST-0203 (DAST)"
      },
      {
        caption: "Ekstraksi pesan galat dan nama parameter form login pada biner native libapp.so aplikasi App-B",
        url: "/evidence/case_img_31.png",
        testCaseRef: "MASTG-TEST-0231 (SAST)"
      }
    ]
  }
];
