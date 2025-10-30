// src/utils/intentPatterns.js
export const intentPatterns = {
  greetings: /(halo|hai|hei|hello|assalamualaikum|permisi)/i,
  cariKos: /(cari|nyari|ada kos|kosan|kost|penginapan)/i,
  tanyaHarga: /(harga|biaya|budget|murah|mahal|under|dibawah)/i,
  tanyaFasilitas: /(wifi|ac|kipas|km dalam|kamar mandi|dapur|parkir|listrik)/i,
  tanyaLokasi: /(dekat|sekitar|dekat kampus|kaliurang|ugm|condongcatur|depok|sleman|gejayan|seturan)/i,
  preferensi: /(putra|putri|campur|bersih|tenang|ramai|aman|strategis)/i,
  followUp: /(yang itu|sebelumnya|lanjutan|tadi|lanjut)/i,
  reset: /(ulang|hapus|reset)/i,
};
