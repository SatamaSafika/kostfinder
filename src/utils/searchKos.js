export function searchKos(kosList, query) {
  return kosList.filter(k => {
    const cocokLokasi = !query.lokasi || k.lokasi.toLowerCase().includes(query.lokasi.toLowerCase());
    const cocokTipe = !query.tipe || k.tipe.toLowerCase() === query.tipe.toLowerCase();
    const cocokHargaMin = !query.harga_min || k.harga >= query.harga_min;
    const cocokHargaMax = !query.harga_max || k.harga <= query.harga_max;
    const cocokFasilitas = !query.fasilitas || query.fasilitas.every(f => k.fasilitas.includes(f));
    const cocokAturan = !query.aturan || query.aturan.every(a => k.aturan.includes(a));
    const cocokPreferensi = !query.preferensi || query.preferensi.every(p => k.preferensi.includes(p));

    return (
      cocokLokasi &&
      cocokTipe &&
      cocokHargaMin &&
      cocokHargaMax &&
      cocokFasilitas &&
      cocokAturan &&
      cocokPreferensi
    );
  });
}
