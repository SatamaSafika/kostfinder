import { kosFinderAgent } from "../src/agent.js";
import { jest } from "@jest/globals"; // ✅ fix ReferenceError di ESM

describe("kosFinderAgent Integration", () => {
  test(
    "mengembalikan teks hasil yang berisi informasi kos",
    async () => {
      const reply = await kosFinderAgent("cari kos murah", "testUser1");
      expect(typeof reply).toBe("string");

      // Respons kamu sekarang lebih natural, bukan nama kos statis
      expect(reply).toMatch(/kos/i);
      expect(reply).toMatch(/Rp/i);
      expect(reply).toMatch(/UGM|murah|terjangkau/i);
    },
    15000 // ✅ tambahkan timeout 15 detik untuk menghindari error
  );

  test(
    "fallback berfungsi jika LLM gagal",
    async () => {
      jest.spyOn(global, "fetch").mockRejectedValueOnce(new Error("Gemini down"));

      const reply = await kosFinderAgent("kos di UGM", "testUser2");

      expect(typeof reply).toBe("string");
      expect(reply).toMatch(/kos/i);
      expect(reply.length).toBeGreaterThan(50);

      global.fetch.mockRestore?.();
    },
    10000 // ✅ beri timeout juga di test kedua
  );
});
