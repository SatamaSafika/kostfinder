// src/utils/fallbackExtractor.js
import { intentPatterns } from "./intentPatterns.js";

export function fallbackExtractor(userMessage) {
  const msg = userMessage.toLowerCase();
  const query = {
    lokasi: null,
    harga_min: null,
    harga_max: null,
    tipe: null,
    fasilitas: [],
    preferensi: [],
    aturan: [],
  };

  // Lokasi
  const lokasiMatch = msg.match(/(kaliurang|ugm|condongcatur|seturan|gejayan|depok|sleman)/i);
  if (lokasiMatch) query.lokasi = lokasiMatch[0];

  // Harga
  const hargaMatch = msg.match(/(\d+[.,]?\d*)/g);
  if (hargaMatch) {
    const nums = hargaMatch.map(h => Number(h.replace(/[.,]/g, "")));
    query.harga_max = Math.max(...nums);
    query.harga_min = Math.min(...nums);
  } else if (msg.includes("murah") || msg.includes("under")) {
    query.harga_max = 1000000; // default jika user bilang “murah” tanpa angka
  }

  // Tipe kos
  if (msg.includes("putri")) query.tipe = "Putri";
  else if (msg.includes("putra")) query.tipe = "Putra";
  else if (msg.includes("campur")) query.tipe = "Campur";

  // Fasilitas umum
  const fasilitasList = ["wifi", "ac", "kipas", "dapur", "km dalam", "kamar mandi dalam", "parkir", "listrik"];
  query.fasilitas = fasilitasList.filter(f => msg.includes(f));

  // Preferensi
  const preferensiList = ["ramai", "tenang", "aman", "strategis", "dekat kampus"];
  query.preferensi = preferensiList.filter(p => msg.includes(p));

  // Aturan
  const aturanList = ["bawa hewan", "24 jam", "tidak boleh merokok"];
  query.aturan = aturanList.filter(a => msg.includes(a));

  return query;
}
