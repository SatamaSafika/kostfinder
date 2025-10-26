import { GoogleGenerativeAI } from "@google/generative-ai";
import { searchKos } from "./utils/searchKos.js";
import { formatResponse } from "./utils/formatResponse.js";
import kosData from "./data/kos_jogja.json" assert { type: "json" };

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

export async function kosFinderAgent(userMessage) {
  // 1. Kirim pesan user ke Gemini untuk ekstraksi intent
  const prompt = `
  Extract intent in JSON: {lokasi, harga, tipe, fasilitas, preferensi, aturan}
  User: "${userMessage}"`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  let query = {};
  try { query = JSON.parse(text); } catch { query = {}; }

  // 2. Cari kos relevan
  const results = searchKos(kosData, query);

  // 3. Format balasan
  return formatResponse(results, query);
}
