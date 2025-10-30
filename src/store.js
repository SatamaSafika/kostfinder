import fs from "fs";
import path from "path";
import { logError } from "./logger.js";

// === Bagian 1: File storage untuk user history ===
const dataDir = path.resolve("./data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

const usersFile = path.join(dataDir, "users.json");
if (!fs.existsSync(usersFile)) fs.writeFileSync(usersFile, "{}", "utf8");

// Helper baca file JSON
export function readJSON(fileName) {
  try {
    const filePath = path.join(dataDir, fileName);
    if (!fs.existsSync(filePath)) return {};
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    logError(err, `Store readJSON error (${fileName})`);
    return {};
  }
}

// Helper tulis file JSON
export function writeJSON(fileName, data) {
  try {
    const filePath = path.join(dataDir, fileName);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    logError(err, `Store writeJSON error (${fileName})`);
  }
}

// Ambil history user
export function getUserHistory(userId) {
  const users = readJSON("users.json");
  return users[userId]?.history || [];
}

// Simpan history user
export function saveUserHistory(userId, history) {
  const users = readJSON("users.json");
  if (!users[userId]) users[userId] = {};
  users[userId].history = history;
  writeJSON("users.json", users);
}

// === Bagian 2: Session state (in-memory) ===
// Menyimpan status pencarian kos, query aktif, dsb.
const sessions = {};

export function getSession(userId) {
  if (!sessions[userId]) {
    sessions[userId] = { mode: "idle", query: {}, lastResults: [] };
  }
  return sessions[userId];
}

export function updateSession(userId, updates) {
  sessions[userId] = { ...getSession(userId), ...updates };
}

export function resetSession(userId) {
  sessions[userId] = { mode: "idle", query: {}, lastResults: [] };
}
