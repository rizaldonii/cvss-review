import type { TestCaseDossier } from "../types";

export const SANITIZED_TEST_CASES: TestCaseDossier[] = [
  {
    caseId: "CASE-01",
    targetApp: "App-A",
    targetAppNameSanitized: "App-A (Aplikasi Mahasiswa)",
    controlId: "MASTG-TEST-0203",
    masvsCategory: "MASVS-STORAGE",
    testMethod: "DAST",
    isOverlappingControl: true,
    weaknessTaxonomy: {
      cweId: "CWE-532",
      cweTitle: "Insertion of Sensitive Information into Log File",
      masweId: "MASWE-0005",
      masweTitle: "Insertion of Sensitive Data into Logs"
    },
    findingTitle: "Pencatatan Data Pribadi Mahasiswa dan Hash Password ke Dalam Logcat Android saat Runtime",
    rootCause: "Pengembang lupa mematikan perintah cetak log konsol (seperti print() atau debugPrint() pada Flutter/Dart) saat merilis aplikasi ke produksi. Ketika pengguna membuka halaman profil atau Kartu Tanda Mahasiswa Elektronik (e-KTM), aplikasi secara otomatis mencetak seluruh objek data respons JSON dari server ke jendela logcat sistem Android pada level Informational (I) dengan tag 'flutter'.",
    stepByStepReproduction: [
      {
        stepNumber: 1,
        description: "Buka aplikasi App-A pada perangkat uji/emulator yang terhubung dengan Android Debug Bridge (ADB), lalu jalankan pemantauan logcat secara real-time.",
        commandOrAction: "adb logcat | grep -iE 'flutter|target-institution'",
        observedEvidence: "Aliran log sistem Android siap memantau aktivitas aplikasi."
      },
      {
        stepNumber: 2,
        description: "Masuk ke akun mahasiswa, klik menu Profil pada bilah navigasi bawah, lalu buka halaman Kartu Tanda Mahasiswa Elektronik (e-KTM).",
        commandOrAction: "Aksi Pengguna: Navigasi -> Menu Profil -> Buka e-KTM",
        observedEvidence: "Aplikasi langsung memuntahkan objek JSON lengkap ke logcat, memuat Nama Lengkap, NIM, Tempat & Tanggal Lahir, Alamat Rumah, Surel Pribadi, Data Orang Tua/Wali (Nama Ayah, Nama Ibu, No. Telepon), serta nilai 'Hash Password Preference'."
      }
    ],
    operationalImpact: {
      threatActor: "Penyerang lokal yang meminjam/mengakses fisik perangkat, aplikasi jahat lain di perangkat (pada OS versi lawas atau yang memiliki izin baca log), maupun malware di komputer tempat ponsel ditancapkan saat USB debugging aktif.",
      prerequisites: "Akses ke logcat perangkat melalui port USB/ADB atau izin sistem.",
      consequences: "Kebocoran menyeluruh data privasi (PII) mahasiswa dan terungkapnya nilai hash verifikasi kata sandi lokal, yang memudahkan profiling korban dan upaya peretasan akun."
    },
    evidenceSnippets: [
      {
        title: "Cuplikan Logcat Hasil Ekstraksi (ADB Terminal)",
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
      }
    ],
    images: [
      {
        caption: "Gambar Bukti 1: Keluaran logcat pada App-A yang memaparkan data pribadi lengkap mahasiswa, data orang tua, serta nilai Hash Password Preference",
        url: "/evidence/case_img_18.png"
      },
      {
        caption: "Gambar Bukti 2: Detail pemaparan nilai hash kata sandi lokal dan respons jadwal perkuliahan pada logcat",
        url: "/evidence/case_img_19.png"
      }
    ]
  },
  {
    caseId: "CASE-02",
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
    findingTitle: "Penyimpanan Token Sesi Aktif dan Identitas Pengguna Tanpa Enkripsi pada SharedPreferences",
    rootCause: "Aplikasi menyimpan token autentikasi sesi aktif (JWT bearer token) dan data identitas pengguna ke dalam file XML SharedPreferences standar tanpa menggunakan pengamanan Android KeyStore maupun pustaka EncryptedSharedPreferences.",
    stepByStepReproduction: [
      {
        stepNumber: 1,
        description: "Buka aplikasi App-A, lakukan login menggunakan kredensial mahasiswa hingga berhasil masuk ke beranda.",
        commandOrAction: "Aksi Pengguna: Login akun mahasiswa",
        observedEvidence: "Sesi login aktif berhasil dibuat dan disimpan oleh aplikasi."
      },
      {
        stepNumber: 2,
        description: "Periksa direktori data internal aplikasi di sandboxing sistem Android menggunakan shell ADB.",
        commandOrAction: "adb shell su -c \"cat /data/data/org.target.appa/shared_prefs/FlutterSharedPreferences.xml\"",
        observedEvidence: "Ditemukan file FlutterSharedPreferences.xml yang memuat token otentikasi 'flutter.access_token', identitas 'flutter.user_id', dan tanggal kedaluwarsa token dalam bentuk teks polos (plaintext)."
      },
      {
        stepNumber: 3,
        description: "Salin nilai token tersebut dan kirimkan permintaan mandiri melalui cURL untuk mengakses data akademik mahasiswa dari server backend.",
        commandOrAction: "curl -H \"Authorization: Bearer eyJhbGci...\" https://api.target.internal/v1/student/profile",
        observedEvidence: "Server menerima token tersebut dan langsung mengembalikan seluruh riwayat data mahasiswa tanpa meminta kata sandi."
      }
    ],
    operationalImpact: {
      threatActor: "Pihak lain yang memegang fisik ponsel secara langsung, pembaca cadangan data lokal (unencrypted backup), atau aplikasi berbahaya yang berjalan pada perangkat yang telah di-root.",
      prerequisites: "Akses ke file penyimpanan internal atau cadangan data aplikasi.",
      consequences: "Pengambilalihan akun secara penuh (session hijacking); penyerang dapat bertindak atas nama mahasiswa di server akademik tanpa perlu mengetahui kata sandi korban."
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
    findingTitle: "Konfigurasi Manifes Membuka Izin Lalu Lintas Data HTTP Teks Biasa (usesCleartextTraffic='true')",
    rootCause: "Pada file AndroidManifest.xml, pengembang secara eksplisit mendeklarasikan atribut android:usesCleartextTraffic='true' tanpa membatasi domain dengan Network Security Config. Sebenarnya untuk saat ini seluruh komunikasi utama aplikasi sudah berjalan di atas protokol aman HTTPS (TLS 1.3), sehingga belum ada data yang bocor secara langsung saat pengujian. Namun, deklarasi ini menghilangkan proteksi bawaan Android (secure-by-default sejak Android 9) dan menjadi celah keamanan laten di masa mendatang apabila pengembang memperbarui koding, menambahkan fitur baru, atau mengintegrasikan pustaka pihak ketiga (third-party library) yang memanggil alamat HTTP biasa.",
    stepByStepReproduction: [
      {
        stepNumber: 1,
        description: "Dekomplikasi berkas instalasi APK rilis produksi App-A menggunakan alat rekayasa balik Apktool.",
        commandOrAction: "apktool d App-A.apk -o hasil_dekompilasi",
        observedEvidence: "Seluruh manifes dan aset aplikasi berhasil diekstrak."
      },
      {
        stepNumber: 2,
        description: "Periksa atribut elemen <application> pada file AndroidManifest.xml untuk melihat kebijakan keamanan jaringan.",
        commandOrAction: "grep -n 'usesCleartextTraffic' hasil_dekompilasi/AndroidManifest.xml",
        observedEvidence: "Terbukti ditemukan deklarasi android:usesCleartextTraffic='true' aktif secara global tanpa whitelist domain yang ketat."
      }
    ],
    operationalImpact: {
      threatActor: "Penyerang Man-in-the-Middle (MitM) yang berada di jaringan nirkabel yang sama (misalnya Wi-Fi publik kampus atau kafe tanpa proteksi).",
      prerequisites: "Pengguna terhubung ke Wi-Fi publik yang sama dengan penyerang, dan terdapat komponen/fitur aplikasi (saat ini atau pembaruan di masa depan) yang memanggil endpoint HTTP biasa.",
      consequences: "Karena Android tidak lagi memblokir koneksi teks biasa, sistem operasi akan meloloskan pengiriman paket data tanpa enkripsi. Akibatnya, transmisi data mahasiswa berisiko disadap, dibaca, atau dimanipulasi oleh penyerang melalui serangan Man-in-the-Middle (MitM)."
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
        android:usesCleartextTraffic="true"
        android:networkSecurityConfig="@xml/network_security_config">
        <!-- Aktivitas aplikasi -->
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
  {
    caseId: "CASE-04",
    targetApp: "App-A",
    targetAppNameSanitized: "App-A (Aplikasi Mahasiswa)",
    controlId: "MASTG-TEST-0231",
    masvsCategory: "MASVS-STORAGE",
    testMethod: "SAST",
    isOverlappingControl: true,
    weaknessTaxonomy: {
      cweId: "CWE-215",
      cweTitle: "Insertion of Sensitive Information Into Debugging Code",
      masweId: "MASWE-0005",
      masweTitle: "Insertion of Sensitive Data into Logs"
    },
    findingTitle: "Teks Penanda Variabel Sensitif dan Label Kredensial Tertinggal pada Biner Native (libcore_engine.so)",
    rootCause: "Proses pembangunan rilis akhir aplikasi belum menerapkan teknik penyusutan kode (code shrinking) dan pembersihan simbol (string stripping) secara tuntas pada biner mesin Flutter (libapp.so / libcore_engine.so). Akibatnya, teks penanda internal yang digunakan pengembang selama fase penulisan program tetap tertanam permanen di dalam segmen memori biner.",
    stepByStepReproduction: [
      {
        stepNumber: 1,
        description: "Ekstrak pustaka biner native arsitektur x86_64 dari paket APK rilis.",
        commandOrAction: "unzip -p App-A.apk lib/x86_64/libapp.so > libcore_engine.so",
        observedEvidence: "Biner native mesin berhasil diekstrak."
      },
      {
        stepNumber: 2,
        description: "Jalankan ekstraksi string teks statis untuk menyaring label data dan penanda kredensial internal.",
        commandOrAction: "strings libcore_engine.so | grep -iE 'NIM_MHS|ID_PENGGUNA|Hash Password'",
        observedEvidence: "Ditemukan string literal eksplisit seperti 'NIM_MHS', 'ID_PENGGUNA', dan 'Hash Password Preference :' yang tertanam langsung pada biner terkompilasi."
      }
    ],
    operationalImpact: {
      threatActor: "Peneliti keamanan atau pihak luar yang melakukan analisis rekayasa balik (reverse engineering) terhadap file APK yang diunduh dari publik.",
      prerequisites: "Memiliki file APK aplikasi produksi.",
      consequences: "Membocorkan peta struktur kode internal (architectural footprint). Penyerang dapat memakai string tersebut sebagai kata kunci penunjuk arah untuk mempercepat pencarian celah logika dan memahami alur kerja autentikasi aplikasi tanpa perlu membaca seluruh kode mesin yang rumit."
    },
    evidenceSnippets: [
      {
        title: "Keluaran Ekstraksi String pada Biner Mesin",
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
        caption: "Gambar Bukti: Ekstraksi teks string label penanda identitas dan kredensial pada biner native libapp.so App-A",
        url: "/evidence/case_img_30.png"
      }
    ]
  },
  {
    caseId: "CASE-05",
    targetApp: "App-B",
    targetAppNameSanitized: "App-B (Aplikasi Orang Tua)",
    controlId: "MASTG-TEST-0203",
    masvsCategory: "MASVS-STORAGE",
    testMethod: "DAST",
    isOverlappingControl: true,
    weaknessTaxonomy: {
      cweId: "CWE-532",
      cweTitle: "Insertion of Sensitive Information into Log File",
      masweId: "MASWE-0005",
      masweTitle: "Insertion of Sensitive Data into Logs"
    },
    findingTitle: "Pencatatan Otomatis URL Permintaan API Beserta Token Akses Aktif ke Logcat Setiap Perpindahan Menu",
    rootCause: "Aplikasi menerapkan pencatatan log otomatis berbasis event (event-driven logging) setiap kali pengguna berpindah halaman antarmuka. Setiap perpindahan menu mengirimkan URL pemanggilan API lengkap—yang menyertakan parameter access-token aktif, NIM mahasiswa, dan kode mata kuliah—ke jendela logcat sistem Android.",
    stepByStepReproduction: [
      {
        stepNumber: 1,
        description: "Hubungkan perangkat uji App-B ke komputer dan pantau keluaran logcat Android.",
        commandOrAction: "adb logcat | grep -iE 'flutter|target-institution'",
        observedEvidence: "Pemantauan logcat aktif."
      },
      {
        stepNumber: 2,
        description: "Buka menu-menu pada aplikasi App-B: Beranda -> Presensi Perkuliahan -> Prestasi Mahasiswa.",
        commandOrAction: "Aksi Pengguna: Berpindah halaman antarmuka",
        observedEvidence: "Setiap perpindahan memunculkan URL API lengkap di logcat, memuat 'access-token=act_773199...', 'student_id=187221096', dan isi respons server portofolio mahasiswa secara teks biasa."
      },
      {
        stepNumber: 3,
        description: "Uji keabsahan token yang didapat dari logcat dengan mengirim permintaan mandiri menggunakan cURL.",
        commandOrAction: "curl \"https://api.target.internal/v2/academic/view-gpa?access-token=act_99c0182...\"",
        observedEvidence: "Server menerima token tersebut dan langsung menampilkan data Indeks Prestasi Kumulatif (IPK) serta transkrip nilai mahasiswa secara lengkap."
      }
    ],
    operationalImpact: {
      threatActor: "Aplikasi pihak ketiga dengan kemampuan membaca log sistem, pihak yang meminjam perangkat, atau penyerang yang mengekstrak logcat ponsel.",
      prerequisites: "Akses ke log sistem Android saat atau sesudah sesi aplikasi berjalan.",
      consequences: "Kebocoran token otorisasi aktif yang dapat dipakai untuk serangan replay (replay attack), memungkinkan pihak luar mengakses nilai akademik, presensi kuliah, dan data prestasi mahasiswa tanpa hak."
    },
    evidenceSnippets: [
      {
        title: "Cuplikan Logcat HTTP GET dengan Parameter Token",
        language: "plaintext",
        content: `I/flutter ( 5120): GET https://api.target.internal/v2/academic/view-gpa?access-token=act_99c0182fa7e811b&student_id=187221096 HTTP/1.1
I/flutter ( 5120): GET https://api.target.internal/v2/attendance?access-token=act_99c0182fa7e811b&course_code=CS401&student_id=187221096 HTTP/1.1
I/flutter ( 5120): GET https://api.target.internal/v2/achievements/list?access-token=act_99c0182fa7e811b HTTP/1.1`
      }
    ],
    images: [
      {
        caption: "Gambar Bukti 1: Logcat App-B yang memaparkan token otorisasi dan respons data prestasi mahasiswa setiap perpindahan menu",
        url: "/evidence/case_img_22.png"
      },
      {
        caption: "Gambar Bukti 2: Pembuktian eksploitasi nyata (PoC replay attack) menggunakan cURL berbekal token dari logcat untuk menarik data akademik",
        url: "/evidence/case_img_23.png"
      }
    ]
  },
  {
    caseId: "CASE-06",
    targetApp: "App-B",
    targetAppNameSanitized: "App-B (Aplikasi Orang Tua)",
    controlId: "MASTG-TEST-0231",
    masvsCategory: "MASVS-STORAGE",
    testMethod: "SAST",
    isOverlappingControl: true,
    weaknessTaxonomy: {
      cweId: "CWE-215",
      cweTitle: "Insertion of Sensitive Information Into Debugging Code",
      masweId: "MASWE-0005",
      masweTitle: "Insertion of Sensitive Data into Logs"
    },
    findingTitle: "Pesan Galat Otentikasi Eksplisit dan Nama Parameter Form Login Tertinggal pada Biner Native",
    rootCause: "Belum diterapkannya obfuskasi kode dan pembersihan string secara optimal pada kompilasi biner rilis App-B. Pesan galat penarikan token autentikasi dan nama-nama parameter formulir login masih tertinggal dalam biner native libapp.so.",
    stepByStepReproduction: [
      {
        stepNumber: 1,
        description: "Ekstrak pustaka biner native dari paket APK rilis App-B.",
        commandOrAction: "unzip -p App-B.apk lib/x86_64/libapp.so > libcore_parent.so",
        observedEvidence: "Biner native App-B diekstrak."
      },
      {
        stepNumber: 2,
        description: "Lakukan pencarian teks statis untuk memeriksa residu logika autentikasi dan penanganan kesalahan.",
        commandOrAction: "strings libcore_parent.so | grep -iE 'LoginForm|photo token|tokenExpiry'",
        observedEvidence: "Ditemukan string pesan galat eksplisit 'Failed to get photo token:' serta nama parameter penting: 'LoginForm[password]', 'LoginForm[username]', 'access_token', dan 'tokenExpiry'."
      }
    ],
    operationalImpact: {
      threatActor: "Penyerang atau analis luar yang membongkar biner aplikasi secara statis.",
      prerequisites: "Memiliki file APK App-B publik.",
      consequences: "Memberikan petunjuk berharga mengenai struktur form login dan mekanisme pengelolaan token, mempermudah pembuatan skrip serangan brute-force atau percobaan manipulasi parameter terhadap API backend."
    },
    evidenceSnippets: [
      {
        title: "Cuplikan String pada Biner Mesin App-B",
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
        caption: "Gambar Bukti: Ekstraksi pesan galat dan nama parameter form login pada biner native libapp.so aplikasi App-B",
        url: "/evidence/case_img_31.png"
      }
    ]
  }
];
