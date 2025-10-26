export function formatResponse(results, query) {
  if (!results.length) return "😔 Tidak ditemukan kos sesuai kriteria.";

  return results.map(k =>
    `🏠 **${k.nama}**
📍 Lokasi: ${k.lokasi}
💰 Harga: Rp${k.harga.toLocaleString()}
🛏️ Tipe: ${k.spesifikasi.tipe} (${k.spesifikasi.ukuran})
⚡ Listrik: ${k.spesifikasi.listrik}
🚿 Fasilitas: ${k.fasilitas.kamar.join(", ")}
📜 Aturan: ${k.peraturan.join(", ")}
📌 Info Tambahan: ${k.info_tambahan}`
  ).join("\n\n");
}
