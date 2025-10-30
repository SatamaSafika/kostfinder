import fs from "fs";
import path from "path";

const logDir = path.resolve("./logs");
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
const logFile = path.join(logDir, "app.log");

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

// appendPrompt(fn)
export function appendPrompt(name, promptText) {
  try {
    const pathPrompts = path.resolve("./logs/prompts.log");
    const timestamp = new Date().toISOString();
    fs.appendFileSync(pathPrompts, `[${timestamp}] [${name}] ${promptText.slice(0,1000)}\n\n`);
  } catch (err) {
    console.warn("Failed to write prompts log:", err.message);
  }
}

