// src/utils/formatResponse.js
export function formatResponse(results) {
  if (!results || results.length === 0) return "Tidak ditemukan kos sesuai kriteria.";

  return results
    .map((k, i) => {
      const nama = k.nama || "Kos tanpa nama";
      const lokasi = k.lokasi || "Lokasi tidak tersedia";
      const tipe = k.tipe || "Tidak disebutkan";
      const harga = k.harga ? `Rp${k.harga.toLocaleString("id-ID")}` : "Harga tidak tersedia";
      const fasilitas = Array.isArray(k.fasilitas) && k.fasilitas.length
        ? k.fasilitas.join(", ")
        : "Tidak disebutkan";
      const aturan = Array.isArray(k.aturan) && k.aturan.length
        ? k.aturan.join(", ")
        : "Tidak disebutkan";
      const verifiedLabel = k.verified ? "✅ Terverifikasi" : "⚪ Belum terverifikasi";
      const kontak = k.kontak || "-";
      const sumber = k.sumber || "Internal Data";

      return `${i + 1}. ${nama}\n` +
             `   📍 ${lokasi}\n` +
             `   💰 ${harga}\n` +
             `   🏠 ${tipe}\n` +
             `   🧩 Fasilitas: ${fasilitas}\n` +
             `   📜 Aturan: ${aturan}\n` +
             `   📞 Kontak: ${kontak}\n` +
             `   🔗 Sumber: ${sumber}\n` +
             `   ${verifiedLabel}`;
    })
    .join("\n\n");
}
