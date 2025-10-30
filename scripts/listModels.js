// scripts/listModels.js
import 'dotenv/config';
import { GoogleGenerativeAI } from "@google/generative-ai";

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY missing in env");
    process.exit(1);
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  try {
    const models = await genAI.listModels();
    console.log("Available models:");
    models.forEach(m => {
      console.log(`- ${m.name} (capabilities: ${m.supportedMethods || "unknown"})`);
    });
  } catch (err) {
    console.error("Error listing models:", err);
  }
}

main();
