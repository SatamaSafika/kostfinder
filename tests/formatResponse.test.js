import { formatResponse } from "../src/utils/formatResponse.js";

describe("formatResponse()", () => {
  test("mengembalikan teks saat data ada", () => {
    const data = [{ nama: "Kos Putri UGM", lokasi: "Kaliurang", harga: 800000, verified: true }];
    const result = formatResponse(data);
    expect(typeof result).toBe("string");
    expect(result).toMatch(/Kos Putri UGM/);
  });

  test("menangani input kosong dengan pesan ramah", () => {
    const result = formatResponse([]);
    expect(result).toMatch(/tidak ditemukan/i);
  });
});
