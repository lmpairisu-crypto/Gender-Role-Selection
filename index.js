const { Client, GatewayIntentBits } = require("discord.js");
const http = require("http");

const TOKEN = process.env.DISCORD_TOKEN;
const PORT = Number(process.env.PORT) || 10000;

console.log("🚀 TEST BOT STARTING");

if (!TOKEN) {
  console.error("❌ DISCORD_TOKEN IS MISSING");
  process.exit(1);
}

console.log("✅ DISCORD_TOKEN exists");
console.log("🔢 Token length:", TOKEN.trim().length);

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end("OK");
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`🌐 Server running on port ${PORT}`);
});

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.on("debug", (message) => {
  console.log("🔧 DEBUG:", message);
});

client.on("error", (error) => {
  console.error("❌ CLIENT ERROR:", error);
});

client.on("shardError", (error) => {
  console.error("❌ SHARD ERROR:", error);
});

client.on("shardReady", (id) => {
  console.log(`✅ SHARD ${id} READY`);
});

client.once("ready", () => {
  console.log("================================");
  console.log("🎉 BOT LOGGED INTO DISCORD!");
  console.log(`🤖 ${client.user.tag}`);
  console.log(`🆔 ${client.user.id}`);
  console.log(`🏠 Servers: ${client.guilds.cache.size}`);
  console.log("================================");
});

console.log("🔐 ATTEMPTING DISCORD LOGIN...");

client.login(TOKEN.trim())
  .then(() => {
    console.log("✅ LOGIN PROMISE COMPLETED");
  })
  .catch((error) => {
    console.error("❌ LOGIN FAILED");
    console.error(error);
  });

setTimeout(() => {
  if (!client.isReady()) {
    console.error("================================");
    console.error("❌ DISCORD CONNECTION FAILED");
    console.error("❌ Bot is NOT ready after 30 seconds");
    console.error("================================");
  }
}, 30000);
