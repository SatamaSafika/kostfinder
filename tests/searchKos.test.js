import { searchKos } from "../src/utils/searchKos.js";

const dummyKos = [
  { nama: "Kos A", lokasi: "UGM", harga: 800000, spesifikasi: { tipe: "Putri" }, verified: false },
  { nama: "Kos B", lokasi: "Babarsari", harga: 1200000, spesifikasi: { tipe: "Campur" }, verified: true }
];

describe("searchKos()", () => {
  test("filter harga maksimal berfungsi", () => {
    const results = searchKos(dummyKos, { harga_max: 1000000 });
    expect(results.length).toBe(1);
    expect(results[0].nama).toBe("Kos A");
  });

  test("filter tipe putri berfungsi", () => {
    const results = searchKos(dummyKos, { tipe: "Putri" });
    expect(results.length).toBe(1);
    expect(results[0].nama).toBe("Kos A");
  });

  test("filter lokasi UGM berfungsi", () => {
    const results = searchKos(dummyKos, { lokasi: "UGM" });
    expect(results[0].lokasi).toBe("UGM");
  });
});
