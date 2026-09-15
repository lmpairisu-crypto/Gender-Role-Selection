const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  EmbedBuilder,
  MessageFlags
} = require("discord.js");

const http = require("http");

// ==========================================
// ENVIRONMENT
// ==========================================

const TOKEN = process.env.DISCORD_TOKEN?.trim();
const PORT = Number(process.env.PORT) || 10000;

// ==========================================
// IDs
// ==========================================

const GENDER_CHANNEL_ID = "1539643480714903602";

const GENDER_ROLES = {
  male: "1514568565016232158",
  female: "1514569124305571840",
  "lgbt+": "1514569385841528833",
  prefer_not: "1548936806794526741"
};

const ALL_GENDER_ROLE_IDS = Object.values(GENDER_ROLES);

// ==========================================
// START
// ==========================================

console.log("==========================================");
console.log("🚀 Starting Gender Role Bot...");
console.log("==========================================");

if (!TOKEN) {
  console.error("❌ DISCORD_TOKEN is missing!");
  process.exit(1);
}

console.log("🔑 DISCORD_TOKEN exists");
console.log(`🔢 Token length: ${TOKEN.length}`);

// ==========================================
// RENDER HEALTH SERVER
// ==========================================

const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, {
      "Content-Type": "text/plain"
    });

    return res.end("OK");
  }

  res.writeHead(200, {
    "Content-Type": "text/plain"
  });

  res.end("Gender Role Bot is online.");
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`🌐 Health server running on port ${PORT}`);
});

// ==========================================
// DISCORD CLIENT
// ==========================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds
  ]
});

// ==========================================
// DISCORD DEBUG
// ==========================================

client.on("debug", message => {
  console.log(`🔧 DISCORD DEBUG: ${message}`);
});

client.on("warn", message => {
  console.warn(`⚠️ DISCORD WARNING: ${message}`);
});

client.on("error", error => {
  console.error("❌ DISCORD CLIENT ERROR:");
  console.error(error);
});

client.on("shardError", error => {
  console.error("❌ DISCORD SHARD ERROR:");
  console.error(error);
});

client.on("shardDisconnect", (event, shardId) => {
  console.error(`🔴 DISCORD DISCONNECTED - Shard ${shardId}`);
  console.error(event);
});

client.on("shardReconnecting", shardId => {
  console.log(`🔄 DISCORD RECONNECTING - Shard ${shardId}`);
});

// ==========================================
// GENDER MENU
// ==========================================

function createGenderMenu() {
  const menu = new StringSelectMenuBuilder()
    .setCustomId("gender_select")
    .setPlaceholder("Select your gender")
    .
