import 'dotenv/config';
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { searchKos } from "./utils/searchKos.js";
import { formatResponse } from "./utils/formatResponse.js";
import { getSession, updateSession, resetSession, getUserHistory, saveUserHistory } from "./store.js";
import { log, logError } from "./logger.js";

// === Setup path ===
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "data");

// === Fungsi aman untuk baca JSON ===
function safeReadJSON(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      log(`⚠️ File tidak ditemukan: ${filePath}`);
      return [];
    }
    const content = fs.readFileSync(filePath, "utf8");
    if (!content.trim()) {
      log(`⚠️ File kosong: ${filePath}`);
      return [];
    }
    return JSON.parse(content);
  } catch (err) {
    logError(err, `Gagal baca file JSON: ${filePath}`);
    return [];
  }
}

// === Load data JSON ===
const kosData = safeReadJSON(path.join(dataDir, "kos_jogja.json"));
const kosVerified = safeReadJSON(path.join(dataDir, "kos_verified.json"));

// === Normalisasi data kos ===
function normalizeKosData(data) {
  if (!Array.isArray(data)) return [];
  return data.map(k => {
    const semuaFasilitas = [
      ...(k.fasilitas?.kamar || []),
      ...(k.fasilitas?.kamar_mandi || []),
      ...(k.fasilitas?.umum || []),
      ...(k.fasilitas?.parkir || [])
    ];

    return {
      nama: k.nama || "",
      lokasi: k.lokasi || "",
      tipe: k.spesifikasi?.tipe?.toLowerCase() || "",
      harga: Number(k.harga) || 0,
      fasilitas: semuaFasilitas.map(f => f.toLowerCase()),
      aturan: k.peraturan || [],
      preferensi: [],
      verified: k.verified || false,
      kontak: k.kontak || "",
      sumber: k.sumber || "",
    };
  });
}

// === Gabungkan & normalisasi data ===
const allKosData = [
  ...normalizeKosData(kosData).map(k => ({ ...k, verified: false })),
  ...normalizeKosData(kosVerified).map(k => ({ ...k, verified: true })),
];

log(`✅ Data kos berhasil dimuat: ${allKosData.length} entri`);

// === Inisialisasi Gemini ===
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
let model;
const modelNames = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"];
for (const name of modelNames) {
  try {
    model = genAI.getGenerativeModel({ model: name });
    log(`✅ Menggunakan model: ${name}`);
    break;
  } catch (err) {
    log(`⚠️ Model ${name} gagal dipakai: ${err.message}`);
  }
}
if (!model) throw new Error("Tidak ada model Gemini yang tersedia.");

// === Ekstraksi query ===
async function extractQuery(userMessage, existingQuery = {}) {
  const prompt = `
Kamu adalah asisten pencari kos di Yogyakarta. Ekstrak maksud user menjadi JSON dengan format:
{
  "lokasi": string atau null,
  "harga_min": number atau null,
  "harga_max": number atau null,
  "tipe": "putra" | "putri" | "campur" | null,
  "fasilitas": string[] atau []
}
User: "${userMessage}"
Gunakan data lama jika relevan: ${JSON.stringify(existingQuery)}
`;

  try {
    const res = await model.generateContent(prompt);
    const text = res?.response?.text()?.trim();

    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    if (jsonStart !== -1 && jsonEnd !== -1) {
      const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
      return { ...existingQuery, ...parsed };
    } else {
      throw new Error("Invalid JSON dari model");
    }
  } catch (err) {
    log("⚠️ Fallback ke rule-based intent", "WARN");

    const query = { ...existingQuery };
    const text = userMessage.toLowerCase();

    // Harga
    const hargaMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(juta|jt|ribu|k)?/i);
    if (hargaMatch) {
      let harga = parseFloat(hargaMatch[1]);
      const unit = hargaMatch[2]?.toLowerCase() || "";
      if (unit.includes("juta") || unit.includes("jt")) harga *= 1_000_000;
      if (unit.includes("ribu") || unit.includes("k")) harga *= 1_000;
      query.harga_max = harga;
    }

    // Lokasi
    const lokasiMatch = text.match(/(ugm|uny|seturan|malioboro|kaliurang|condongcatur|sagan|gejayan)/i);
    if (lokasiMatch) query.lokasi = lokasiMatch[1].toLowerCase();

    // Tipe
    const tipeMatch = text.match(/putra|putri|campur/i);
    if (tipeMatch) query.tipe = tipeMatch[0].toLowerCase();

    // Fasilitas
    const fasilitas = [];
    if (text.includes("ac")) fasilitas.push("AC");
    if (text.includes("wifi")) fasilitas.push("WiFi");
    if (text.includes("kamar mandi dalam")) fasilitas.push("Kamar mandi dalam");
    if (fasilitas.length) query.fasilitas = fasilitas;

    return query;
  }
}

// === Fungsi utama agent ===
export async function kosFinderAgent(userMessage, userId) {
  try {
    console.log(`🟦 [KOSFINDER] User(${userId}): ${userMessage}`);

    const session = getSession(userId);
    let text = userMessage.toLowerCase();

    // --- Cek trigger keluar ---
    if (/selesai|stop|cukup|udah|terima kasih|thanks/i.test(text)) {
      resetSession(userId);
      return "Oke, sesi pencarian kos kamu aku tutup ya! 😊 Kapan-kapan kalau mau cari lagi tinggal ketik `!kos` aja.";
    }

    // === User baru memulai ===
    if (text.startsWith("!kos") && session.mode === "idle") {
      updateSession(userId, { mode: "searching", query: {}, lastResults: [] });
      return "Oke! Kamu lagi cari kos nih 😄. Coba ceritain dulu deh, kamu pengennya di daerah mana atau kisaran harga berapa?";
    }

    // === Dalam mode pencarian ===
    if (session.mode === "searching") {
      if (text.startsWith("!kos")) {
        text = text.replace("!kos", "").trim();
        userMessage = userMessage.replace("!kos", "").trim();
      }

      const updatedQuery = await extractQuery(userMessage, session.query || {});
      updateSession(userId, { query: updatedQuery });

      // === Cari hasil hanya dari allKosData ===
      const results = searchKos(allKosData, updatedQuery);

      // Simpan history percakapan
      const history = getUserHistory(userId);
      history.push({ role: "user", parts: [{ text: userMessage }] });
      saveUserHistory(userId, history);

      // === Tampilkan hasil ===
      if (!results || results.length === 0) {
        log("🔎 Tidak ditemukan hasil di kedua dataset");
        return "Hmm, belum ketemu yang cocok nih 😕. Di daerah Depok memang agak terbatas. Mau aku bantu cariin di sekitar Kaliurang atau Condongcatur juga?";
      }

      // Kalau hasil banyak banget, tawarkan filter tambahan
      if (results.length > 3) {
        updateSession(userId, { lastResults: results });
        return "Aku udah nemu beberapa pilihan nih! Mau aku bantu filter lagi berdasarkan fasilitas tertentu? Misal kamar mandi dalam, WiFi, atau AC?";
      }

      // === Kalau hasil ≤ 3, tampilkan langsung ===
      const formattedResults = formatResponse(results);

      // --- ✨ Bagian tambahan: refinePrompt biar bahasanya natural ---
      const refinePrompt = `
      Kamu adalah asisten virtual bernama "KosFinder" yang sedang ngobrol dengan ${username}.
      Gunakan bahasa ringan, kadang pakai emoji, dan jangan terlalu formal.
      Responmu harus menyesuaikan nada pengguna — kalau dia nanya santai, balas santai juga.
      Berikan sapa kecil di awal (misal "Hai!" atau "Oke!") dan akhiri dengan kalimat ramah.

      Berikut hasil pencarian kos yang perlu kamu jelaskan dengan gaya manusia:

      ${formattedResults}

      Buatlah balasan yang terdengar natural dan ramah, seolah kamu benar-benar bantu dia cari kos.
      `;


      const refined = await model.generateContent(refinePrompt);
      const finalText = refined?.response?.text()?.trim() || formattedResults;
      // --- ✨ End refinement ---

      resetSession(userId);

      // return hasil akhir yang sudah diperhalus
      return finalText;
    }

    // === Kalau user belum mulai sama sekali ===
    return "Kamu belum mulai pencarian kos. Ketik `!kos` dulu ya untuk mulai. 😊";

  } catch (err) {
    logError(err, "kosFinderAgent Error:");
    return "😔 Maaf, aku lagi error nih. Coba lagi nanti ya.";
  }
}