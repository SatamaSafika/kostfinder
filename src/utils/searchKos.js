export function searchKos(kosList, query) {
  return kosList.filter(k => {
    if (query.lokasi && !k.lokasi.toLowerCase().includes(query.lokasi.toLowerCase())) return false;
    if (query.tipe && k.tipe.toLowerCase() !== query.tipe.toLowerCase()) return false;
    if (query.harga_min && k.harga < query.harga_min) return false;
    if (query.harga_max && k.harga > query.harga_max) return false;
    if (query.fasilitas) {
      if (!query.fasilitas.every(f => k.fasilitas.includes(f))) return false;
    }
    if (query.aturan) {
      if (!query.aturan.every(a => k.aturan.includes(a))) return false;
    }
    if (query.preferensi) {
      if (!query.preferensi.every(p => k.preferensi.includes(p))) return false;
    }
    return true;
  });
}
