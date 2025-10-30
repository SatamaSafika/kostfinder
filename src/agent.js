import 'dotenv/config';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { searchKos } from "./utils/searchKos.js";
import { fallbackExtractor } from "./utils/fallbackExtractor.js";
import { formatResponse } from "./utils/formatResponse.js";
import kosData from "./data/kos_jogja.json" assert { type: "json" };
import kosVerified from "./data/kos_verified.json" assert { type: "json" };
import { log, logError } from "./logger.js";
import { getUserHistory, saveUserHistory } from "./store.js";


// Gabungkan data lokal + verified
const allKosData = [
  ...kosData.map(k => ({ ...k, verified: false })),
  ...kosVerified.map(k => ({ ...k, verified: true }))
];

// Inisialisasi Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Daftar model valid (coba satu per satu)
const modelNames = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"];
let model;
for (const name of modelNames) {
  try {
    model = genAI.getGenerativeModel({ model: name });
    log(`✅ Menggunakan model: ${name}`);
    break;
  } catch (err) {
    log(`⚠️ Model ${name} tidak tersedia, coba model berikutnya.`, "WARN");
  }
}
if (!model) throw new Error("Tidak ada model Gemini valid tersedia.");

// =========================
// 3️⃣ GEMINI REQUEST HANDLER + RETRY & BACKOFF
// =========================

async function generateWithRetry(prompt, retries = 3, baseDelay = 500) {
  for (let i = 0; i < retries; i++) {
    try {
      log(`📨 [Gemini] Attempt ${i + 1}/${retries}`);
      const response = await model.generateContent(prompt);
      const text = response?.response?.text()?.trim();

      if (text) {
        log(`📩 [Gemini] Response OK on attempt ${i + 1}`);
        return text;
      }
      log(`⚠️ [Gemini] Empty response on attempt ${i + 1}`, "WARN");

    } catch (err) {
      const code = err.status || err.code || err.message;
      log(`⚠️ [Gemini] Error: ${code} (attempt ${i + 1})`, "WARN");

      // Tangani error umum & rate limit
      if ([401, 403].includes(err.status)) {
        throw new Error("🔒 API Key tidak valid atau diblokir.");
      }
      if ([429, 500, 502, 503].includes(err.status)) {
        const delay = baseDelay * Math.pow(2, i); // exponential backoff
        log(`⏳ Tunggu ${delay}ms sebelum retry berikutnya...`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
    }
  }

  // Jika semua retry gagal
  throw new Error("Gagal menghubungi Gemini setelah beberapa percobaan.");
}



// Fungsi utama bot
export async function kosFinderAgent(userMessage, userId) {
  // Ambil history user
  const conversationHistory = getUserHistory(userId);

  log(`🟦 User: ${userMessage}`);

  // Ambil memory slot: harga, tipe, lokasi
  let memory = { lokasi: null, harga_max: null, tipe: null };
  conversationHistory.forEach(entry => {
    if (entry.role === "user") {
      const msg = entry.parts[0].text.toLowerCase();
      if (/putri/i.test(msg)) memory.tipe = "Putri";
      else if (/putra/i.test(msg)) memory.tipe = "Putra";
      else if (/campur/i.test(msg)) memory.tipe = "Campur";

      const hargaMatch = msg.match(/(\d+\.?\d*)/g);
      if (hargaMatch) memory.harga_max = Math.max(...hargaMatch.map(Number));

      const lokasiMatch = msg.match(/(ugm|kaliurang|sana)/i); // contoh lokasi, bisa diperluas
      if (lokasiMatch) memory.lokasi = lokasiMatch[0];
    }
  });

  try {
    // 1️⃣ Ekstrak intent user + gabungkan memory lama
    const extractPrompt = `
    Kamu adalah agen pencari kos bernama **KosFinder**. 
    Tugasmu hanya mengekstrak informasi dari teks user menjadi JSON dengan struktur ketat berikut:

    {
      "lokasi": "string | null",
      "harga_min": "number | null",
      "harga_max": "number | null",
      "tipe": "Putri" | "Putra" | "Campur" | null,
      "fasilitas": ["wifi", "ac", "parkir", ...],
      "preferensi": ["dekat kampus", "ramai", "tenang", ...],
      "aturan": ["bawa hewan", "24 jam akses", ...]
    }

    📘 Aturan penting:
    - Jawab **hanya JSON valid**, tanpa teks lain.
    - Nilai null bila tidak disebut.
    - Gunakan lowercase untuk array string.
    - Jangan tambahkan komentar atau deskripsi.

    🧩 Contoh:
    User: "Cari kos putri murah dekat UGM dengan wifi dan AC"
    Output:
    {
      "lokasi": "UGM",
      "harga_min": null,
      "harga_max": 1000000,
      "tipe": "Putri",
      "fasilitas": ["wifi", "ac"],
      "preferensi": ["dekat kampus"],
      "aturan": []
    }

    User: "Kos campur boleh bawa hewan, ada parkir motor, budget 700 ribu"
    Output:
    {
      "lokasi": null,
      "harga_min": null,
      "harga_max": 700000,
      "tipe": "Campur",
      "fasilitas": ["parkir"],
      "preferensi": [],
      "aturan": ["bawa hewan"]
    }

    Sekarang, proses input berikut:

    User: "${userMessage}"
    `;

    const rawText = await generateWithRetry(extractPrompt);

    let query = {};
    try {
      query = JSON.parse(rawText);
        } catch (e) {
        log("⚠️ Gagal parsing hasil Gemini, gunakan fallback extractor.", "WARN");
        // log rawText kalau ada untuk debugging
        log(`DEBUG rawText: ${rawText ? rawText.slice(0, 500) : "<empty>"}`, "DEBUG");
        query = fallbackExtractor(userMessage);
        // tambahkan memory jika ada yang kosong
        query.lokasi = query.lokasi || memory.lokasi;
        query.tipe = query.tipe || memory.tipe;
        query.harga_max = query.harga_max || memory.harga_max;
      }


    // 2️⃣ Isi dengan memory slot jika user tidak menyebut
    query.lokasi = query.lokasi || memory.lokasi;
    query.tipe = query.tipe || memory.tipe;
    query.harga_max = query.harga_max || memory.harga_max;

    // 3️⃣ Cari kos dari data lokal
        // 2️⃣ Cari kos dari data lokal (dengan proteksi error)
    let results = [];
      try {
        results = searchKos(allKosData, query);
        log(`🟩 Ditemukan: ${results.length} kos`);
      } catch (err) {
        // jika searchKos crash, log dan beri pesan follow-up ke user
        logError(err, "Search Error:");
        // minta klarifikasi daripada mengembalikan error generik
        const clarify = [];
        if (!query.lokasi) clarify.push("lokasi (mis. UGM, Condongcatur)");
        if (!query.harga_max && !query.harga_min) clarify.push("kisaran harga (mis. di bawah 1 juta)");
        if (!query.tipe) clarify.push("tipe (Putri/Putra/Campur)");
        const follow = clarify.length
          ? `Biar aku bantu lebih tepat — bisa sebutkan ${clarify.join(", ")}?`
          : "Bisa sebutkan sedikit detail (lokasi / kisaran harga / tipe) supaya aku bisa cari dengan lebih tepat?";
        return follow;
      }

    const formattedResults = formatResponse(results);


    // 4️⃣ Susun konteks percakapan
    const conversation = [
      ...conversationHistory,
      { role: "user", parts: [{ text: userMessage }] },
      {
        role: "model",
        parts: [
          {
            text: `
Berikut hasil pencarian kos yang relevan (berdasarkan data nyata):

${formattedResults}

Gunakan informasi di atas untuk menjawab secara natural, ramah, dan ringan seperti "teman pencari kos". 
Jika info kurang jelas, ajukan pertanyaan lanjutan. Jangan buat data baru di luar hasil di atas.
`
          }
        ]
      }
    ];

    // 5️⃣ Minta Gemini menyusun jawaban alami
    const chat = model.startChat({ history: conversation });
    const reply = await chat.sendMessage(userMessage);
    const replyText = reply.response.text()?.trim() || "";
    log(`🤖 Bot reply: ${replyText}`);

    // 6️⃣ Simpan history user terbaru
    saveUserHistory(userId, conversation);

    return replyText;

  } catch (err) {
    logError(err, "Bot Error:");
    return "😔 Maaf, aku nggak bisa memproses permintaanmu sekarang.";
  }
}