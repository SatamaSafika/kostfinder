// src/utils/searchKos.js
export function searchKos(kosList, query) {
  return kosList.filter(k => {
    const lokasiLower = k.lokasi?.toLowerCase() || "";
    const queryLokasi = query.lokasi?.toLowerCase() || "";
    const tipe = k.tipe ? k.tipe.toLowerCase() : "";
    const harga = typeof k.harga === "number" ? k.harga : Number(k.harga) || 0;
    const fasilitas = Array.isArray(k.fasilitas) ? k.fasilitas : [];
    const aturan = Array.isArray(k.aturan) ? k.aturan : [];
    const preferensi = Array.isArray(k.preferensi) ? k.preferensi : [];

    const cocokLokasi =
      !query.lokasi ||
      lokasiLower.includes(queryLokasi) || // cocok langsung
      lokasiLower.includes(`kec. ${queryLokasi}`) || // cocok dengan "kec."
      lokasiLower.includes(`kabupaten ${queryLokasi}`) ||
      lokasiLower.includes(`kota ${queryLokasi}`) ||
      lokasiLower.includes(`daerah istimewa ${queryLokasi}`);
    const cocokTipe =
      !query.tipe || tipe === query.tipe.toLowerCase();
    const cocokHargaMin =
      !query.harga_min || harga >= query.harga_min;
    const cocokHargaMax =
      !query.harga_max || harga <= query.harga_max;
    const cocokFasilitas =
      !query.fasilitas || query.fasilitas.every(f =>
        fasilitas.some(kf =>
          kf.toLowerCase().includes(f.toLowerCase())
        )
      );
    const cocokAturan =
      !query.aturan || query.aturan.every(a =>
        aturan.some(ka =>
          ka.toLowerCase().includes(a.toLowerCase())
        )
      );
    const cocokPreferensi =
      !query.preferensi || query.preferensi.every(p =>
        preferensi.some(kp =>
          kp.toLowerCase().includes(p.toLowerCase())
        )
      );

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
