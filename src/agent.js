import 'dotenv/config'
import { GoogleGenerativeAI } from "@google/generative-ai"
import { searchKos } from "./utils/searchKos.js"
import { formatResponse } from "./utils/formatResponse.js"
import kosData from "./data/kos_jogja.json" assert { type: "json" }

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

// Daftar model valid, coba satu per satu
const modelNames = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"]

let model
for (const name of modelNames) {
  try {
    model = genAI.getGenerativeModel({ model: name })
    console.log(`✅ Menggunakan model: ${name}`)
    break
  } catch (err) {
    console.warn(`⚠️ Model ${name} tidak tersedia, coba model berikutnya.`)
  }
}

if (!model) throw new Error("Tidak ada model Gemini valid tersedia.")

// Fungsi retry tetap sama
async function generateWithRetry(prompt, retries = 2) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await model.generateContent(prompt)
      const text = res?.response?.text()?.trim()
      if (text) return text
    } catch (err) {
      console.warn(`⚠️ Retry ${i+1} gagal:`, err.message)
      await new Promise(r => setTimeout(r, 500))
    }
  }
  throw new Error("Gagal menghubungi Gemini setelah beberapa percobaan.")
}

export async function kosFinderAgent(userMessage) {
  console.log("🟦 User:", userMessage)
  const prompt = `
  Extract intent in JSON: {lokasi, harga, tipe, fasilitas, preferensi, aturan}
  User: "${userMessage}"`

  let text = ""
  try {
    text = await generateWithRetry(prompt)
  } catch (err) {
    console.error("❌ Gemini Error:", err)
    return "Maaf, layanan sedang mengalami gangguan, coba lagi nanti 🙏."
  }

  let query = {}
  try {
    query = JSON.parse(text)
  } catch {
    console.warn("⚠️ Gagal parsing hasil Gemini, gunakan query kosong.")
  }

  const results = searchKos(kosData, query)
  console.log("🟩 Ditemukan:", results.length, "kos")
  return formatResponse(results, query)
}
