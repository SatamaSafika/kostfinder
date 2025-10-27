import { Client, GatewayIntentBits } from "discord.js";
import dotenv from "dotenv";
import { kosFinderAgent } from "./agent.js";
import { getUserHistory, saveUserHistory } from "./store.js";

dotenv.config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMessages]
});

client.once("ready", () => console.log(`🤖 Logged in as ${client.user.tag}`));

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith("!kos")) return;

  const userId = message.author.id;
  const userMessage = message.content.replace("!kos", "").trim();

  // Ambil histori user dari store.json
  const conversationHistory = getUserHistory(userId);

  // Cek duplikasi pesan terakhir
  const lastUserMsg = conversationHistory.length
    ? conversationHistory[conversationHistory.length - 1].parts[0].text
    : null;

  if (userMessage === lastUserMsg) {
    return message.reply("Kamu sudah bilang itu sebelumnya 😅. Bisa kasih info tambahan biar aku lebih akurat?");
  }

  message.channel.sendTyping();

  const reply = await kosFinderAgent(userMessage, conversationHistory);

  // Simpan histori baru
  const newHistory = [
    ...conversationHistory,
    { role: "user", parts: [{ text: userMessage }] },
    { role: "model", parts: [{ text: reply }] }
  ];
  saveUserHistory(userId, newHistory);

  await message.reply(reply);
});

client.login(process.env.DISCORD_TOKEN);
