import { Client, GatewayIntentBits } from "discord.js";
import dotenv from "dotenv";
import { kosFinderAgent } from "./agent.js";
import 'dotenv/config'


dotenv.config();

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMessages] });

client.once("ready", () => console.log(`🤖 Logged in as ${client.user.tag}`));

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (message.content.startsWith("!kos")) {
    const query = message.content.replace("!kos", "").trim();
    message.channel.sendTyping();
    const reply = await kosFinderAgent(query);
    await message.reply(reply);
  }
});

client.login(process.env.DISCORD_TOKEN);
