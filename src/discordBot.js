import { Client, GatewayIntentBits } from "discord.js";
import dotenv from "dotenv";
import { kosFinderAgent } from "./agent.js";

dotenv.config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMessages]
});

client.once("ready", () => console.log(`🤖 Logged in as ${client.user.tag}`));

const userConversations = {}; // simpan riwayat percakapan per user

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith("!kos")) return;

  const userId = message.author.id;
  if (!userConversations[userId]) userConversations[userId] = [];

  const query = message.content.replace("!kos", "").trim();
  message.channel.sendTyping();

  const reply = await kosFinderAgent(query, userConversations[userId]);

  // Simpan percakapan terakhir biar bisa konteksual
  userConversations[userId].push({ role: "user", parts: [{ text: query }] });
  userConversations[userId].push({ role: "model", parts: [{ text: reply }] });

  await message.reply(reply);
});

client.login(process.env.DISCORD_TOKEN);
