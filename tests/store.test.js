import fs from "fs";
import { writeJSON, readJSON, getUserHistory, saveUserHistory } from "../src/store.js";

const TEST_FILE = "users_test.json";

describe("Store helpers", () => {
  afterAll(() => {
    if (fs.existsSync(`./data/${TEST_FILE}`)) fs.unlinkSync(`./data/${TEST_FILE}`);
  });

  test("writeJSON dan readJSON berfungsi", () => {
    writeJSON(TEST_FILE, { test: true });
    const data = readJSON(TEST_FILE);
    expect(data.test).toBe(true);
  });

  test("getUserHistory & saveUserHistory bekerja", () => {
    saveUserHistory("u1", [{ role: "user", text: "halo" }]);
    const history = getUserHistory("u1");
    expect(Array.isArray(history)).toBe(true);
  });
});
