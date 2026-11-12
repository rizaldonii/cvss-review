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
      masweId: "MASWE-0001",
      masweTitle: "Sensitive Data Stored Unencrypted in Private Storage",
      masweUrl: "https://mas.owasp.org/MASWE/MASVS-STORAGE/MASWE-0001/"
    },
    findingTitle: "Penyimpanan Kredensial dan Data Sensitif Tanpa Enkripsi pada SharedPreferences",
    rootCause: "Aplikasi menyimpan token sesi aktif ('flutter.token'), identitas mahasiswa (NIM, nama, email, program studi), dan nilai hash kata sandi lokal ('flutter.validPassword') ke dalam berkas XML SharedPreferences standar (FlutterSharedPreferences.xml) dalam format teks polos (plaintext), tanpa menggunakan Android KeyStore maupun pustaka EncryptedSharedPreferences.",
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
        observedEvidence: "Ditemukan berkas FlutterSharedPreferences.xml yang memuat token autentikasi ('flutter.token'), nilai hash kata sandi lokal ('flutter.validPassword'), serta data pribadi mahasiswa (NIM, nama, email, program studi) dalam format teks polos (plaintext)."
      }
    ],
    operationalImpact: {
      threatActor: "Pihak yang memegang fisik ponsel secara langsung saat tidak terkunci, penyerang yang mengekstrak berkas cadangan lokal (unencrypted backup), atau aplikasi lain pada perangkat Android yang telah di-root.",
      prerequisites: "Akses fisik ke perangkat atau akses terhadap direktori internal aplikasi / berkas cadangan lokal.",
      consequences: "Membuka potensi pengambilalihan sesi (session hijacking) apabila token aktif diekstraksi sebelum kedaluwarsa, serta potensi upaya pemecahan kata sandi secara luring (offline cracking) terhadap nilai hash lokal."
    },
    evidenceSnippets: [
      {
        title: "Cuplikan Terminal ADB: Pembacaan Berkas FlutterSharedPreferences.xml",
        testCaseRef: "MASTG-TEST-0287 (DAST)",
        language: "xml",
        content: `emu64xa:/data/data/org.target.appa/shared_prefs # cat FlutterSharedPreferences.xml
<?xml version='1.0' encoding='utf-8' standalone='yes' ?>
<map>
    <string name="flutter.idFakultas">8</string>
    <string name="flutter.name">[NAMA_LENGKAP_MAHASISWA]</string>
    <string name="flutter.username">[NIM_MAHASISWA]</string>
    <string name="flutter.photoMhs"></string>
    <string name="flutter.nmProdiEng">Information System</string>
    <string name="flutter.idMhs">21081[REDACTED]</string>
    <string name="flutter.token">eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJbTklNX01BSEFTSVNXQV0iLCJuYW1lIjoiW1JFREFDVEVEXSIsImlhdCI6MTcwNDAxOTIwMCwiZXhwIjoxNzA0MTA1NjAwfQ.[SIGNATURE_TOKEN]</string>
    <string name="flutter.validPassword">46f0cb47b085aa[REDACTED_PASSWORD_HASH]</string>
    <string name="flutter.prodi">112</string>
    <string name="flutter.nim">[NIM_MAHASISWA]</string>
    <boolean name="flutter.remember_me" value="true" />
    <boolean name="flutter.status" value="true" />
    <string name="flutter.idPengguna">38291[REDACTED]</string>
    <string name="flutter.email">user_sample@example.ac.id</string>
    <string name="flutter.idJenjang">1</string>
</map>`
      }
    ],
    images: [
      {
        caption: "Tangkapan layar terminal ADB pada App-A yang menampilkan isi berkas FlutterSharedPreferences.xml berisi token JWT ('flutter.token'), hash kata sandi ('flutter.validPassword'), serta data pribadi mahasiswa dalam format teks polos",
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
      masweTitle: "Insertion of Sensitive Data into Logs",
      masweUrl: "https://mas.owasp.org/MASWE/MASVS-STORAGE/MASWE-0005/"
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
        commandOrAction: "strings libapp.so | grep -E 'NIM_MHS|ID_PENGGUNA|Hash Password'",
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
        title: "Cuplikan Logcat: Pemaparan Profil Mahasiswa dan Hash Password",
        testCaseRef: "MASTG-TEST-0203 (DAST)",
        language: "plaintext",
        content: `2026-05-11 18:53:31.735 30727-30727 flutter               org.target.appa   I  content : {data: {ID_PENGGUNA: 380084, NIM_MHS: [NIM_MAHASISWA], ID_FAKULTAS: 8, FAKULTAS: Sains dan Teknologi, ID_JENJANG: 1, NM_JENJANG: S1, PROGRAM_STUDI: Sistem Informasi, ALAMAT_MHS: JL. [ALAMAT_DISAMARKAN], ALAMAT_ASAL_MHS: JL. [ALAMAT_DISAMARKAN], NM_AYAH_MHS: [NAMA_AYAH_WALI], PENDIDIKAN_AYAH_MHS: 1, PEKERJAAN_AYAH_MHS: 62, ALAMAT_AYAH_MHS: JL. [ALAMAT_DISAMARKAN], AYAH_HP: -, NM_IBU_MHS: [NAMA_IBU_KANDUNG], PENDIDIKAN_IBU_MHS: 13, PEKERJAAN_IBU_MHS: 89, ALAMAT_IBU_MHS: JL. [ALAMAT_DISAMARKAN], IBU_HP: 08[REDACTED], MOBILE_MHS: 08[REDACTED], THN_ANGKATAN_MHS: 2022, ID_SEMESTER_MASUK: 263, pengguna: {ID_PENGGUNA: 380084, NM_PENGGUNA: [NAMA_LENGKAP_MAHASISWA], GELAR_DEPAN: , GELAR_BELAKANG: , AGAMA: Islam, TGL_LAHIR_PENGGUNA: 2003-07-25T00:00:00+07:00, TEMPAT_LAHIR: 214, EMAIL_PENGGUNA: student.user@example.ac.id, EMAIL_ALTERNATE: user_alt@example.com, JENIS_KELAMIN: L, ID_FB: https://www.facebook.com/[REDACTED], ID_WHATSAPP: 08[REDACTED]}
2026-05-11 19:00:12.842 30727-30727 flutter               org.target.appa   I  Hash Password Preference : 46f0cb47b085aa[REDACTED_PASSWORD_HASH]ceb5`
      },
      {
        title: "Cuplikan Terminal: Ekstraksi String pada Biner Native (libapp.so)",
        testCaseRef: "MASTG-TEST-0231 (SAST)",
        language: "bash",
        content: `$ strings libapp.so | grep -E "NIM_MHS|ID_PENGGUNA|Hash Password"
ID_PENGGUNA
NIM_MHS
Hash Password Preference :`
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
      masweId: "MASWE-0026",
      masweTitle: "Network Traffic Not Encrypted",
      masweUrl: "https://mas.owasp.org/MASWE/MASVS-NETWORK/MASWE-0026/"
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
        title: "Cuplikan Berkas AndroidManifest.xml (Elemen <application>)",
        testCaseRef: "MASTG-TEST-0235 (SAST)",
        language: "xml",
        content: `    <uses-permission android:name="android.permission.INTERNET"/>
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE"/>
    <application
        android:appComponentFactory="androidx.core.app.CoreComponentFactory"
        android:icon="@mipmap/ic_launcher"
        android:label="App-A"
        android:name="android.app.Application"
        android:usesCleartextTraffic="true">
        <activity
            android:name="org.target.appa.MainActivity"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN"/>
                <category android:name="android.intent.category.LAUNCHER"/>
            </intent-filter>
        </activity>
    </application>`
      },
      {
        title: "Cuplikan Terminal: Ekstraksi String Skema HTTP pada Biner Native (libapp.so)",
        testCaseRef: "MASTG-TEST-0235 (SAST)",
        language: "bash",
        content: `$ strings libapp.so | grep -i "http://"
http://203.0.113.15:9092`
      }
    ],
    images: [
      {
        caption: "Deklarasi android:usesCleartextTraffic='true' pada berkas AndroidManifest.xml aplikasi App-A",
        url: "/evidence/case_img_26.png"
      },
      {
        caption: "Pemeriksaan string pada biner native libapp.so yang memuat referensi skema 'http://' (SAST)",
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
      masweTitle: "Insertion of Sensitive Data into Logs",
      masweUrl: "https://mas.owasp.org/MASWE/MASVS-STORAGE/MASWE-0005/"
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
        commandOrAction: "curl -i \"https://apicyber.example.ac.id/api/view-ipk?access-token=EjUeTbJTBRi2HFAmJaPDcTKxJQBGIF_t&NIM_MHS=[NIM_MAHASISWA]\"",
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
        commandOrAction: "strings libapp.so | grep -E \"user_nim|user_name|user_username|access_token|password|token\" | head -n 30",
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
        title: "Cuplikan Logcat: Pemaparan URL Endpoint API Berisi Token dan Respons Data",
        testCaseRef: "MASTG-TEST-0203 (DAST)",
        language: "plaintext",
        content: `2026-09-24 03:15:54.346 19707-19707 flutter               org.target.appb   I  https://apicyber.example.ac.id/api/view-ipk?access-token=EjUeTbJTBRi2HFAmJaPDcTKxJQBGIF_t&NIM_MHS=[NIM_MAHASISWA]
2026-09-24 02:43:47.411 19707-19707 flutter               org.target.appb   I  https://apicyber.example.ac.id/api/mahasiswa/presensi-kuliah-det-mkmhs?access-token=EjUeTbJTBRi2HFAmJaPDcTKxJQBGIF_t&nim=[NIM_MAHASISWA]&kode_mk=PNT4991
2026-09-24 03:16:20.814 19707-19707 flutter               org.target.appb   I  Respon Data: {status: success, message: , data: [{NM_SEMESTER: Ganjil, THN_AKADEMIK_SEMESTER: 2022, NM_KRP_KHP: Keamanan Sistem Informasi, WAKTU_KRP_KHP: 2022-12-09, SKOR_KRP_KHP: 5}, {NM_SEMESTER: Ganjil, THN_AKADEMIK_SEMESTER: 2022, NM_KRP_KHP: Kuliah Tamu, WAKTU_KRP_KHP: 2022-11-23, SKOR_KRP_KHP: 5}, {NM_SEMESTER: Ganjil, THN_AKADEMIK_SEMESTER: 2022, NM_KRP_KHP: Analisis Data Mahasiswa, WAKTU_KRP_KHP: 2022-11-24, SKOR_KRP_KHP: 5}]}`
      },
      {
        title: "Cuplikan Terminal: Replay Attack Menggunakan cURL Berbekal Token Logcat",
        testCaseRef: "MASTG-TEST-0203 (DAST)",
        language: "bash",
        content: `$ curl -i "https://apicyber.example.ac.id/api/view-ipk?access-token=EjUeTbJTBRi2HFAmJaPDcTKxJQBGIF_t&NIM_MHS=[NIM_MAHASISWA]"
HTTP/2 200 
server: nginx
date: Wed, 23 Sep 2026 19:30:07 GMT
content-type: application/json; charset=UTF-8
content-length: 593
set-cookie: uacc-session=def5gva4s9urpnie5l6h787490; path=/; HttpOnly
expires: Thu, 19 Nov 1981 08:52:00 GMT
cache-control: no-store, no-cache, must-revalidate
pragma: no-cache
vary: Accept
x-pagination-total-count: 1
x-pagination-page-count: 1
x-pagination-current-page: 1
x-pagination-per-page: 20
link: <http://apicyber.example.ac.id/api/view-ipk/index?access-token=EjUeTbJTBRi2HFAmJaPDcTKxJQBGIF_t&NIM_MHS=[NIM_MAHASISWA]&page=1>; rel=self
set-cookie: _csrf=a386924333a4fc49d801849e187ca499480ad36cae9759c649d34f0350ef3174a; path=/; HttpOnly; SameSite=Lax
strict-transport-security: max-age=31536000;  includeSubDomains
x-frame-options: SAMEORIGIN
x-xss-protection: 1; mode=block
x-content-type-options: nosniff

{"items":[{"ID_MHS":"210919","NIM_MHS":"[NIM_MAHASISWA]","IPK_MHS":"3.61","ROWNUMID":"1"}],"_meta":{"totalCount":"1","pageCount":1,"currentPage":1,"perPage":20}}`
      },
      {
        title: "Cuplikan Terminal: Ekstraksi String pada Biner Native (libapp.so)",
        testCaseRef: "MASTG-TEST-0231 (SAST)",
        language: "bash",
        content: `$ strings libapp.so | grep -E "user_nim|user_name|user_username|access_token|password|token" | head -n 30
_token@689212526
Unknown value for token of type
init:_token@688332722
access_token
init:token
init:_token@1182110083
_tokenRE@632501537
_password@976093275
init:_token@685436587
init:_token@660149494
user_nim
LoginForm[password]
tokenUrl
Pastel tokens, low chroma palettes (32).
_token@664513057
tokenUrlV2
token
init:_token@662166800
tokenExpiry
init:_token@664513057
password
_token@1182110083
Failed to get photo token:
_token@688332722
user_username
show password
init:_token@689212526
user_name
&token=
Cannot convert json to point. Next token is`
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
