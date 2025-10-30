export function formatResponse(results = []) {
  if (!results.length) return "😔 Maaf, tidak ditemukan kos yang cocok dengan kriteria kamu.";

  return results
    .map((k) => {
      const spesifikasi = k.spesifikasi || {};
      const fasilitas = k.fasilitas || {};
      const peraturan = k.peraturan || [];

      return `🏠 **${k.nama || "Kos tanpa nama"}**
📍 Lokasi: ${k.lokasi || "Tidak diketahui"}
💰 Harga: Rp${(k.harga || 0).toLocaleString()}
🛏️ Tipe: ${spesifikasi.tipe || "-"} (${spesifikasi.ukuran || "ukuran tidak diketahui"})
⚡ Listrik: ${spesifikasi.listrik || "-"}
🚿 Fasilitas: ${(fasilitas.kamar || []).join(", ") || "-"}
📜 Aturan: ${peraturan.join(", ") || "-"}
${k.verified ? "✅ *Terverifikasi*" : "❌ Belum verifikasi"}\n`;
    })
    .join("\n");
}
