import 'dotenv/config';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { searchKos } from "./utils/searchKos.js";
import { formatResponse } from "./utils/formatResponse.js";
import kosData from "./data/kos_jogja.json" assert { type: "json" };
import kosVerified from "./data/kos_verified.json" assert { type: "json" };
import { log, logError } from "./logger.js";

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
    console.log(`✅ Menggunakan model: ${name}`);
    break;
  } catch (err) {
    console.warn(`⚠️ Model ${name} tidak tersedia, coba model berikutnya.`);
  }
}
if (!model) throw new Error("Tidak ada model Gemini valid tersedia.");

// Retry helper
async function generateWithRetry(prompt, retries = 2) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await model.generateContent(prompt);
      const text = res?.response?.text()?.trim();
      if (text) return text;
    } catch (err) {
      log(`Retry ${i+1} gagal: ${err.message}`, "WARN");
      await new Promise(r => setTimeout(r, 500));
    }
  }
  throw new Error("Gagal menghubungi Gemini setelah beberapa percobaan.");
}

// Fungsi utama bot
export async function kosFinderAgent(userMessage, conversationHistory = []) {
  log(`User: ${userMessage}`);
  try {
    // 1️⃣ Ekstrak intent user
    const extractPrompt = `
Kamu adalah asisten pencari kos di Yogyakarta. Ekstrak maksud user menjadi JSON.
Contoh output:
{"lokasi": "Kaliurang", "harga": 1000000, "tipe": "Putri"}

User: "${userMessage}"
    `;
    const rawText = await generateWithRetry(extractPrompt);
    let query = {};
    try {
      query = JSON.parse(rawText);
    } catch {
      log("⚠️ Gagal parsing hasil Gemini, gunakan query kosong.", "WARN");
    }

    // 2️⃣ Cari kos dari data lokal
    const results = searchKos(allKosData, query);
    log(`Ditemukan: ${results.length} kos`);
    const formattedResults = formatResponse(results);

    // 3️⃣ Susun konteks percakapan
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

    // 4️⃣ Minta Gemini menyusun jawaban alami
    const chat = model.startChat({ history: conversation });
    const reply = await chat.sendMessage(userMessage);
    log(`Bot reply: ${reply.response.text()}`);
    return reply.response.text();

  } catch (err) {
    logError(err, "Bot Error:");
    return "😔 Maaf, aku nggak bisa memproses permintaanmu sekarang.";
  }
}
