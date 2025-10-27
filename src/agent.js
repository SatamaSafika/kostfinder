
import "dotenv/config";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { searchKos } from "./utils/searchKos.js";
import { formatResponse } from "./utils/formatResponse.js";
import kosData from "./data/kos_jogja.json" assert { type: "json" };
import kosVerified from "./data/kos_verified.json" assert { type: "json" };
import { log, logError } from "./logger.js";
import { getUserHistory, saveUserHistory, getSession, updateSession, resetSession } from "./store.js";

// Gabungkan data lokal + verified
const allKosData = [
  ...kosData.map((k) => ({ ...k, verified: false })),
  ...kosVerified.map((k) => ({ ...k, verified: true })),
];

// Inisialisasi Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const modelNames = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"];
let model;
for (const name of modelNames) {
  try {
    model = genAI.getGenerativeModel({ model: name });
    log(`✅ Menggunakan model: ${name}`);
    break;
  } catch (err) {
    log(`⚠️ Model ${name} tidak tersedia, coba berikutnya.`, "WARN");
  }
}
if (!model) throw new Error("Tidak ada model Gemini valid tersedia.");

// --- Deteksi cepat intent user ---
function detectIntent(userInput) {
  const query = {};
  const hargaMatch = userInput.match(/(\d+(?:[.,]\d+)?)\s*(juta|jt|ribu|k)?/i);
  if (hargaMatch) {
    let harga = parseFloat(hargaMatch[1]);
    const unit = hargaMatch[2]?.toLowerCase() || "";
    if (unit.includes("juta") || unit.includes("jt")) harga *= 1_000_000;
    if (unit.includes("ribu") || unit.includes("k")) harga *= 1_000;
    query.harga_max = harga;
  }

  const lokasiMatch = userInput.match(/(ugm|uny|seturan|malioboro|kaliurang|condongcatur)/i);
  if (lokasiMatch) query.lokasi = lokasiMatch[1].toLowerCase();

  const tipeMatch = userInput.match(/putra|putri|campur/i);
  if (tipeMatch) query.tipe = tipeMatch[0].toLowerCase();

  const fasilitas = [];
  if (userInput.includes("ac")) fasilitas.push("AC");
  if (userInput.includes("wifi")) fasilitas.push("WiFi");
  if (userInput.includes("kamar mandi dalam")) fasilitas.push("Kamar mandi dalam");
  if (fasilitas.length) query.fasilitas = fasilitas;

  return query;
}

// --- Ekstrak JSON pakai Gemini untuk backup ---
async function extractQuery(userMessage, existingQuery = {}) {
  const prompt = `
Kamu adalah asisten pencari kos di Yogyakarta. Ekstrak maksud user menjadi JSON:
{
  "lokasi": "string atau null",
  "harga_min": number atau null,
  "harga_max": number atau null,
  "tipe": "Putri/Putra/Campur atau null",
  "fasilitas": ["wifi", "AC", ...]
}
User: "${userMessage}"
Gunakan data lama jika relevan: ${JSON.stringify(existingQuery)}
`;
  try {
    const res = await model.generateContent(prompt);
    const text = res?.response?.text()?.trim();
    return JSON.parse(text);
  } catch {
    log("⚠️ Fallback ke rule-based intent", "WARN");
    return { ...existingQuery, ...detectIntent(userMessage) };
  }
}

// --- Fungsi utama bot ---
export async function kosFinderAgent(userMessage, userId) {
  const session = getSession(userId);
  const text = userMessage.toLowerCase();

  // === 1️⃣ Jika user ingin mengakhiri sesi ===
  if (/selesai|stop|cukup|udah/i.test(text)) {
    resetSession(userId);
    return "Oke, sesi pencarian kos kamu aku tutup ya! 😊 Kapan-kapan kalau mau cari lagi tinggal ketik `!kos` aja.";
  }

  // === 2️⃣ Jika user belum memulai sesi ===
  if (session.mode === "idle" && !text.startsWith("!kos")) {
    return "Kamu belum mulai pencarian kos. Ketik `!kos` dulu ya untuk mulai. 😊";
  }

  // === 3️⃣ Jika user baru mengetik "!kos" ===
  if (text.startsWith("!kos")) {
    updateSession(userId, { mode: "searching", query: {} });
    return "Siap! Yuk cari kos bareng 😄. Kamu pengin mulai dari preferensi apa dulu nih? Lokasi, harga, atau tipe kos?";
  }

  // === 4️⃣ Update query dari pesan user ===
  const updatedQuery = await extractQuery(userMessage, session.query);
  updateSession(userId, { query: updatedQuery });

  // === 5️⃣ Cari hasil berdasarkan query ===
  const results = searchKos(allKosData, updatedQuery);
  log(`🟩 Ditemukan ${results.length} kos untuk ${userId}`);

  // === 6️⃣ Jika hasil kosong, bantu user refine ===
  if (results.length === 0) {
    return "Hmm... belum nemu yang cocok nih. Mau aku cariin di lokasi lain atau ubah kisaran harganya?";
  }

  // === 7️⃣ Jika hasil masih banyak, ajukan pertanyaan lanjutan ===
  if (results.length > 3) {
    return "Ada beberapa pilihan nih! Kamu mau aku filter lagi berdasarkan fasilitas tertentu? Misal kamar mandi dalam, AC, atau WiFi?";
  }

  // === 8️⃣ Jika hasil sudah spesifik, tampilkan dan akhiri sesi ===
  if (results.length <= 3) {
    resetSession(userId);
    const formattedResults = formatResponse(results);
    return `Aku nemu yang cocok banget buat kamu nih:\n\n${formattedResults}\n\nSemoga pas ya! 🏡✨`;
  }
}

