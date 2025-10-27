import 'dotenv/config';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { searchKos } from "./utils/searchKos.js";
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

// Retry helper
async function generateWithRetry(prompt, retries = 2) {
  for (let i = 0; i < retries; i++) {
    try {
      log(`📨 Mengirim prompt ke Gemini (attempt ${i + 1})`);
      const res = await model.generateContent(prompt);
      const text = res?.response?.text()?.trim();
      if (text) {
        log(`📩 Gemini response diterima (attempt ${i + 1})`);
        return text;
      }
    } catch (err) {
      log(`⚠️ Retry ${i + 1} gagal: ${err.message}`, "WARN");
      await new Promise(r => setTimeout(r, 500));
    }
  }
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
Kamu adalah asisten pencari kos di Yogyakarta. Ekstrak maksud user menjadi JSON.
Gunakan format ini:
{
  "lokasi": "string atau null",
  "harga_min": number atau null,
  "harga_max": number atau null,
  "tipe": "Putri/Putra/Campur atau null",
  "fasilitas": ["wifi", "AC", ...],
  "preferensi": ["dekat kampus", "ramai", "tenang", ...],
  "aturan": ["bawa hewan", "24 jam akses", ...]
}

Jika user tidak menyebutkan, gunakan data memory lama:
lokasi = ${memory.lokasi || "null"}, tipe = ${memory.tipe || "null"}, harga_max = ${memory.harga_max || "null"}

User: "${userMessage}"
    `;
    const rawText = await generateWithRetry(extractPrompt);

    let query = {};
    try {
      query = JSON.parse(rawText);
    } catch {
      log("⚠️ Gagal parsing hasil Gemini, gunakan memory slot jika ada.", "WARN");
      query = { ...memory };
    }

    // 2️⃣ Isi dengan memory slot jika user tidak menyebut
    query.lokasi = query.lokasi || memory.lokasi;
    query.tipe = query.tipe || memory.tipe;
    query.harga_max = query.harga_max || memory.harga_max;

    // 3️⃣ Cari kos dari data lokal
    const results = searchKos(allKosData, query);
    log(`🟩 Ditemukan: ${results.length} kos`);
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


