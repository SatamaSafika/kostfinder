import fs from "fs";
import path from "path";

const logFile = path.resolve("./logs/app.log");

// Fungsi log biasa
export function log(message, level = "INFO") {
  const timestamp = new Date().toISOString();
  const line = `[${level}] ${timestamp} - ${message}`;
  console.log(line);
  try {
    fs.appendFileSync(logFile, line + "\n");
  } catch (err) {
    console.warn("⚠️ Gagal menulis log:", err.message);
  }
}

// Fungsi log error
export function logError(error, label = "ERROR") {
  const timestamp = new Date().toISOString();
  const line = `[${label}] ${timestamp} - ${error.stack || error}`;
  console.error(line);
  try {
    fs.appendFileSync(logFile, line + "\n");
  } catch (err) {
    console.warn("⚠️ Gagal menulis log:", err.message);
  }
}
