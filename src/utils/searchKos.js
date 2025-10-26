export function searchKos(data, query) {
  return data.filter(k => {
    let cocok = true;
    if (query.lokasi && !k.lokasi.toLowerCase().includes(query.lokasi.toLowerCase())) cocok = false;
    if (query.harga && k.harga > query.harga) cocok = false;
    if (query.tipe && !k.spesifikasi.tipe.toLowerCase().includes(query.tipe.toLowerCase())) cocok = false;
    return cocok;
  }).slice(0, 3); // ambil 3 hasil teratas
}
