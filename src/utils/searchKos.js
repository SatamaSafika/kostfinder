export function searchKos(data, query) {
  const filtered = data.filter(k => {
    let cocok = true;

    if (query.lokasi && !k.lokasi.toLowerCase().includes(query.lokasi.toLowerCase())) cocok = false;
    if (query.harga && k.harga > query.harga) cocok = false;
    if (query.tipe && !k.spesifikasi.tipe.toLowerCase().includes(query.tipe.toLowerCase())) cocok = false;

    return cocok;
  });

  // Prioritaskan kos verified di urutan atas
  return filtered.sort((a, b) => Number(b.verified) - Number(a.verified)).slice(0, 5);
}
