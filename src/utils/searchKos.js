// src/utils/searchKos.js
// Robust search + simple scoring for kos entries
export function normalizeText(s = "") {
  return String(s || "").toLowerCase().normalize("NFKD");
}

/**
 * kosList: array of kos objects
 * query: { lokasi, harga_min, harga_max, tipe, fasilitas:[], aturan:[], preferensi:[] }
 */
export function searchKos(kosList = [], query = {}) {
  // ensure query arrays exist
  const q = {
    lokasi: query.lokasi ? String(query.lokasi).toLowerCase() : null,
    harga_min: query.harga_min ?? null,
    harga_max: query.harga_max ?? null,
    tipe: query.tipe ?? null,
    fasilitas: Array.isArray(query.fasilitas) ? query.fasilitas.map(f => f.toLowerCase()) : [],
    aturan: Array.isArray(query.aturan) ? query.aturan.map(a => a.toLowerCase()) : [],
    preferensi: Array.isArray(query.preferensi) ? query.preferensi.map(p => p.toLowerCase()) : []
  };

  // compute a simple score for ranking
  const scored = kosList.map(k => {
    // safe access and normalize arrays
    const lokasi = normalizeText(k.lokasi);
    const tipe = normalizeText(k.spesifikasi?.tipe ?? k.tipe ?? "");
    const harga = typeof k.harga === "number" ? k.harga : Number(k.harga) || Infinity;
    const fasilitasArr = Array.isArray(k.fasilitas) ? k.fasilitas.map(x => normalizeText(x)) :
                         Array.isArray(k.spesifikasi?.fasilitas) ? k.spesifikasi.fasilitas.map(x => normalizeText(x)) : [];
    const aturanArr = Array.isArray(k.peraturan) ? k.peraturan.map(x => normalizeText(x)) : [];
    const preferensiArr = Array.isArray(k.info_preferensi) ? k.info_preferensi.map(x => normalizeText(x)) :
                          Array.isArray(k.preferensi) ? k.preferensi.map(x => normalizeText(x)) : [];

    // quick rejects
    if (q.lokasi && !lokasi.includes(q.lokasi)) return null;
    if (q.tipe && tipe !== q.tipe.toLowerCase()) return null;
    if (q.harga_min && harga < q.harga_min) return null;
    if (q.harga_max && harga > q.harga_max) return null;

    // scoring
    let score = 0;
    // better score if verified
    if (k.verified) score += 20;

    // harga preference: lower price gets better score (normalized)
    if (typeof q.harga_max === "number") {
      // prefer closer to budget max but <= budget
      const diff = Math.max(0, q.harga_max - harga);
      score += Math.min(20, Math.round(diff / Math.max(1, q.harga_max) * 20));
    } else {
      // small preference for lower price
      score += Math.max(0, Math.round((1000000 - Math.min(harga, 1000000)) / 1000000 * 5));
    }

    // fasilitas matching: +10 per match
    for (const f of q.fasilitas) {
      if (f && fasilitasArr.some(ff => ff.includes(f))) score += 10;
    }
    // aturan match: +8 per match
    for (const a of q.aturan) {
      if (a && aturanArr.some(aa => aa.includes(a))) score += 8;
    }
    // preferensi match: +6 per match
    for (const p of q.preferensi) {
      if (p && preferensiArr.some(pp => pp.includes(p))) score += 6;
    }

    // small proximity/keyword boost (if location exact)
    if (q.lokasi && lokasi === q.lokasi) score += 10;

    return { kos: k, score };
  });

  // filter out null rejects and sort by score desc, then price asc
  const filtered = scored
    .filter(x => x !== null)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      // same score -> cheaper first
      const pa = typeof a.kos.harga === "number" ? a.kos.harga : Number(a.kos.harga) || Infinity;
      const pb = typeof b.kos.harga === "number" ? b.kos.harga : Number(b.kos.harga) || Infinity;
      return pa - pb;
    })
    .map(x => x.kos);

  return filtered;
}
