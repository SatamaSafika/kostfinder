# 🏠 KostFinder Bot
_Discord Chatbot untuk Pencarian Kost Mahasiswa yang Cerdas & Terpercaya_

---

## 💡 Latar Belakang

Mahasiswa baru atau perantau sering mengalami kesulitan saat mencari tempat kost — informasi tersebar, tidak lengkap, dan sering tidak sesuai realita.  
**KostFinder** hadir sebagai solusi dengan menghadirkan **chatbot berbasis Discord** yang bisa membantu mahasiswa mencari kost secara cepat, akurat, dan menyenangkan.

Bot ini mengubah cara mencari kost menjadi percakapan interaktif, di mana pengguna cukup mengetikkan permintaan seperti:
> `!kos daerah Kaliurang dengan AC di bawah 1 juta`

KostFinder akan mencari data yang relevan, menyaring sesuai kebutuhan pengguna, dan menampilkan hasil secara informatif di Discord.

---

## ✨ Fitur Utama

| Fitur | Deskripsi |
|-------|------------|
| 🔍 **Pencarian Kost Otomatis** | Cari kost berdasarkan lokasi, harga, atau fasilitas dengan satu perintah. |
| 💬 **Chat Natural & Kontekstual** | Bot mampu memahami bahasa alami seperti “kost murah tapi bersih dan ada WiFi”. |
| 🧭 **Filtering & Ranking** | Hasil disusun berdasarkan relevansi dan preferensi pengguna. |
| 🧠 **Data Pengguna (Memory)** | Bot menyimpan data pencarian pengguna di `data/users.json` untuk rekomendasi selanjutnya. |
| 🗂️ **Sistem Logging** | Semua aktivitas bot tercatat di `logs/app.log` untuk debugging dan analisis. |
| ⚙️ **Modular Architecture** | Setiap fungsi (agent, store, logger, dsb) dibuat modular untuk memudahkan pengembangan. |

---

## 🧩 Struktur Proyek

```
KOSTFINDER/
├─ data/
│  └─ users.json           # Penyimpanan preferensi dan riwayat pengguna
├─ logs/
│  └─ app.log              # Log aktivitas bot
├─ src/
│  ├─ data/                # (Opsional) Dataset tambahan atau cache
│  ├─ utils/               # Fungsi pendukung (parser, text cleaner, dsb)
│  ├─ agent.js             # Logika utama interaksi bot (intelligence layer)
│  ├─ discordBot.js        # Entry point untuk integrasi ke Discord
│  ├─ logger.js            # Sistem logging
│  └─ store.js             # Modul CRUD untuk membaca & menyimpan data JSON
├─ .env                    # Token Discord dan konfigurasi environment
├─ .gitignore
├─ package.json
├─ package-lock.json
└─ README.md
```

---

## ⚙️ Teknologi yang Digunakan

- **Node.js 20+**
- **Discord.js v14**
- **dotenv** – manajemen environment variables
- **fs (File System)** – penyimpanan data JSON
- **Custom Logger Utility** – pencatatan semua aktivitas bot
- **Gemini/OpenAI API (opsional)** – untuk analisis teks & pencarian natural language

---

## 🚀 Cara Menjalankan Proyek

### 1️⃣ Clone Repositori
```bash
git clone https://github.com/[username]/kostfinder.git
cd kostfinder
npm install
```

### 2️⃣ Konfigurasi `.env`
Buat file `.env` berdasarkan contoh berikut:
```
DISCORD_BOT_TOKEN=your-discord-bot-token
BOT_NAME=KostFinder
```

### 3️⃣ Jalankan Bot
```bash
node src/discordBot.js
```

Bot akan aktif di server Discord dan siap merespons perintah seperti:
```
!kos di daerah Karang Wuni
```

---

## 🧠 Cara Kerja Bot

1. **User Input**  
   Pengguna mengetikkan perintah di Discord (misal: `!kos dekat UGM harga 1 jutaan`).
2. **Agent Processing (`agent.js`)**  
   Bot memproses teks, mengekstraksi kata kunci (lokasi, harga, fasilitas), dan mencocokkannya.
3. **Data Query (`store.js`)**  
   Sistem membaca dan menyeleksi data pengguna atau kost yang relevan.
4. **Response Generation**  
   Bot menyusun respons dengan format yang informatif dan ramah pengguna.
5. **Logging (`logger.js`)**  
   Setiap aktivitas disimpan ke `logs/app.log` untuk analisis performa dan error tracking.

---

## 🗃️ Logging

Contoh isi file `logs/app.log`:
```
[2025-10-30T13:42:11Z] [DISCORD] @danella: !kos daerah Kaliurang
[2025-10-30T13:42:13Z] [BOT] Menemukan 3 kost sesuai kriteria pengguna.
```

---

## 💬 Contoh Interaksi

**Input user:**
```
!kos cari kos paling murah
```

**Output:**
```
Oke, lagi cari kos yang paling murah ya? Berdasarkan info yang aku dapat, ini ada 2 pilihan:

-   Kos Pria Sembodo: Ini yang paling murah, harganya Rp950,000 per bulan. Lokasinya di Jl. Gejayan No. 12, khusus untuk cowok. Ukuran kamarnya lumayan lah, 3x3.5 meter. Listrik sudah termasuk, dan ada kasur sama meja belajar. Cocok buat yang lagi cari kos simpel dan hemat.

-   Kos Putri Mawar Indah: Kalau kamu cewek, ini juga bisa jadi pilihan. Harganya Rp1,000,000 per bulan, jadi sedikit lebih mahal dari yang tadi. Lokasinya di Jl. Kaliurang KM 7. Fasilitasnya lumayan lengkap, ada kasur, lemari, dan meja belajar. Lokasinya juga strategis, dekat kampus UGM dan halte Trans Jogja.

Gimana? Dari kedua pilihan itu, ada yang menarik perhatianmu? Atau mungkin kamu punya preferensi lain, misalnya lokasi atau fasilitas yang lebih spesifik? Kasih tahu aja, biar aku bisa bantu cariin lagi! 😉
```

**Input user:**
```
!kos tapi aku cewe
```

**Output:**
```
Oh iya, maaf! Aku salah fokus. Tadi aku lihat ada kos pria juga. 😅

Karena kamu cewek, ini daftar kos yang khusus putri yang mungkin cocok:

-   Kost Putri Eksklusif Triple A De Ariesta: Ini lumayan oke, harganya Rp1,3 juta. Sudah termasuk listrik, ada kasur dan meja belajar. Lokasinya juga strategis dekat minimarket dan warung makan.

-   Kos Putri Pandega Sakti 2: Agak mahal sedikit, Rp1,5 juta. Tapi ini bangunan baru, kamarnya lebih luas (3.5x4 m) dan ada fasilitas tambahan seperti lemari. Listriknya token ya.

-   Kos Putri Agestya Living: Ini yang paling mahal, Rp1,7 juta. Tapi lokasinya strategis banget dekat UGM dan halte Trans Jogja. Fasilitasnya standar, kasur, lemari, meja belajar.

-   Kos Putri Mawar Indah: Ini juga pilihan bagus, harganya Rp1 juta. Lokasinya juga dekat UGM.

Gimana, ada yang menarik perhatianmu? Atau ada kriteria lain yang kamu cari? Misalnya, butuh kamar mandi dalam atau fasilitas parkir yang luas? Kasih tau aja, biar aku bantu cari yang paling pas! 😊
```

---

## 🧪 Pengujian

Proyek ini diuji menggunakan **Node Test Runner** untuk memastikan setiap modul berjalan dengan benar.  
Test mencakup:
- Validasi struktur data JSON
- Respons bot terhadap query umum
- Logging & penyimpanan data pengguna

Menjalankan test:
```bash
npm test
```

---

## 🌱 Rencana Pengembangan

- Integrasi API real-time (Google Maps / data kost publik)
- Sistem rating & ulasan pengguna
- Pemetaan visual kost (peta interaktif)
- Pencarian berbasis AI (keyword semantic search)

---

## 🤝 Anggota Kelompok

Anggota kelompok yang terlibat dalam pembuatan bot ini:
1. Satama Satama (22/492880/TK/53955)
2. Danella Zefanya Siahaan (22/492877/TK/53953)
