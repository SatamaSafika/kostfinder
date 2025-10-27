import { GoogleGenerativeAI } from "@google/generative-ai";
import { searchKos } from "./utils/searchKos.js";
import { formatResponse } from "./utils/formatResponse.js";
import kosData from "./data/kos_jogja.json" assert { type: "json" };
import kosVerified from "./data/kos_verified.json" assert { type: "json" };

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

// Gabungkan data lokal + kredibel, beri label verified
const allKosData = [
  ...kosData.map(k => ({ ...k, verified: false })),
  ...kosVerified.map(k => ({ ...k, verified: true }))
];

export async function kosFinderAgent(userMessage, conversationHistory = []) {
  try {
    // 1️⃣ Kirim ke Gemini untuk mengekstrak niat (lokasi, harga, tipe)
    const extractPrompt = `
Kamu adalah asisten pencari kos di Yogyakarta. Ekstrak maksud user menjadi JSON.

Contoh output:
{"lokasi": "Kaliurang", "harga": 1000000, "tipe": "Putri"}

User: "${userMessage}"
    `;
    const extractRes = await model.generateContent(extractPrompt);
    const rawText = extractRes.response.text();
    let query = {};
    try {
      query = JSON.parse(rawText);
    } catch {
      query = {};
    }

    // 2️⃣ Cari kos dari data lokal
    const results = searchKos(allKosData, query);
    const formattedResults = formatResponse(results);

    // 3️⃣ Siapkan konteks percakapan sebelumnya + hasil pencarian
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

Gunakan informasi di atas untuk menjawab secara natural, ramah, dan ringan seperti "teman pencari kos" yang bantuin. 
Kalau info belum cukup (misal harga, tipe, kamar mandi, atau lokasi kurang jelas), ajukan pertanyaan lanjutan agar bisa bantu lebih akurat.
Jangan karang data baru di luar hasil di atas.
`
          }
        ]
      }
    ];

    // 4️⃣ Minta Gemini menyusun jawaban alami berbasis hasil pencarian
    const chat = model.startChat({ history: conversation });
    const reply = await chat.sendMessage(userMessage);
    return reply.response.text();

  } catch (err) {
    console.error(err);
    return "😔 Maaf, aku nggak bisa memproses permintaanmu sekarang.";
  }
}
