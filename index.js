const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  EmbedBuilder
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds
  ]
});

console.log("Starting Gender Role Bot...");

// ==========================================
// RENDER HEALTH CHECK
// ==========================================

const http = require("http");

const PORT = Number(process.env.PORT) || 10000;

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
// GENDER ROLE IDs
// ==========================================

const GENDER_ROLES = {
  male: "1514568565016232158",
  female: "1514569124305571840",
  nonbinary: "1514569385841528833",
  prefer_not: "1548936806794526741"
};

const ALL_GENDER_ROLE_IDS = Object.values(GENDER_ROLES);
