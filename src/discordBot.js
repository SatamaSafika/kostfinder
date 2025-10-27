import { Client, GatewayIntentBits } from "discord.js";
import dotenv from "dotenv";
import { kosFinderAgent } from "./agent.js";
import { getUserHistory, saveUserHistory, getSession } from "./store.js";

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessages
  ]
});

client.once("ready", () => console.log(`🤖 Logged in as ${client.user.tag}`));

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  // Kalau belum ada perintah !kos, jangan respon dulu
  if (!message.content.startsWith("!kos") && !message.content.match(/selesai|stop|cukup|udah|terima kasih|thanks/i)) return;

  const userId = message.author.id;
  const userMessage = message.content.trim();

  // Ambil histori user
  const conversationHistory = getUserHistory(userId);

  // Cegah duplikasi pesan terakhir
  const lastUserMsg = conversationHistory.length
    ? conversationHistory[conversationHistory.length - 1].parts[0].text
    : null;

  if (userMessage === lastUserMsg) {
    return message.reply("Kamu sudah bilang itu sebelumnya 😅. Bisa kasih info tambahan biar aku lebih akurat?");
  }

  // Tampilkan indikator typing
  message.channel.sendTyping();

  console.log("📩 UserMessage:", userMessage);
  const session = getSession(userId);
  console.log("🧠 Session:", session);

  // 💡 Panggil agen utama
  const reply = await kosFinderAgent(userMessage, userId);

  // Simpan histori percakapan
  const newHistory = [
    ...conversationHistory,
    { role: "user", parts: [{ text: userMessage }] },
    { role: "model", parts: [{ text: reply }] }
  ];
  saveUserHistory(userId, newHistory);

  // Kirim balasan
  if (reply) await message.reply(reply);
});

client.login(process.env.DISCORD_TOKEN);
