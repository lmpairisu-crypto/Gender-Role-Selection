const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  EmbedBuilder,
  ChannelType,
  MessageFlags
} = require("discord.js");

const http = require("http");

// ==========================================
// ENVIRONMENT VARIABLES
// ==========================================

const TOKEN = process.env.DISCORD_TOKEN;
const PORT = Number(process.env.PORT) || 10000;

// ==========================================
// CONFIGURATION
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
// STARTUP
// ==========================================

console.log("==========================================");
console.log("🚀 Starting Gender Role Bot...");
console.log("==========================================");

if (!TOKEN) {
  console.error("❌ DISCORD_TOKEN is missing from Render.");
  process.exit(1);
}

console.log("🔑 Discord token detected.");

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
// GENDER MENU
// ==========================================

function createGenderMenu() {
  const menu = new StringSelectMenuBuilder()
    .setCustomId("gender_select")
    .setPlaceholder("Select your gender")
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(
      {
        label: "♂️ Male",
        description: "Select the Male role",
        value: "male"
      },
      {
        label: "♀️ Female",
        description: "Select the Female role",
        value: "female"
      },
      {
        label: "🏳️‍🌈 LGBT",
        description: "Select the LGBT+ role",
        value: "lgbt+"
      },
      {
        label: "🙊 Prefer not to say",
        description: "Don't disclose your gender",
        value: "prefer_not"
      }
    );

  return new ActionRowBuilder()
    .addComponents(menu);
}

// ==========================================
// GENDER EMBED
// ==========================================

function createGenderEmbed() {
  return new EmbedBuilder()
    .setColor("#5865F2")
    .setTitle("🔒 Gender Selection")
    .setDescription(
      "<a:Avisala:1542448826265243660> " +
      "Please select your gender from the menu below.\n\n" +

      "**Your selection is private.**\n" +

      "Only you will see the confirmation from the bot. " +
      "<:AI:1549055579362828309>\n\n" +

      "You can change your selection at any time.\n\n" +

      "🏠 **Gender-Based Access:**\n" +

      "Selecting the role that matches your gender will give you access " +
      "to an extra private channel or a dorm shared with members of " +
      "the same gender."
    )
    .setFooter({
      text: "Your selected role will be updated automatically."
    });
}

// ==========================================
// DISCORD ERRORS
// ==========================================

client.on("error", (error) => {
  console.error("❌ Discord Client Error:");
  console.error(error);
});

client.on("warn", (warning) => {
  console.warn("⚠️ Discord Warning:", warning);
});

client.on("shardError", (error) => {
  console.error("❌ Discord Gateway Error:");
  console.error(error);
});

client.on("shardDisconnect", (event, shardId) => {
  console.error(
    `❌ Discord shard ${shardId} disconnected.`
  );

  console.error(event);
});

client.on("shardReconnecting", (shardId) => {
  console.log(
    `🔄 Discord shard ${shardId} reconnecting...`
  );
});

// ==========================================
// BOT READY
// ==========================================

client.once("ready", async () => {
  console.log("==========================================");
  console.log(`🤖 Logged in as ${client.user.tag}`);
  console.log(`🆔 Bot ID: ${client.user.id}`);
  console.log("==========================================");

  try {
    console.log(`🔎 Looking for gender channel: ${GENDER_CHANNEL_ID}`);

    const channel = await client.channels.fetch(GENDER_CHANNEL_ID);

    if (!channel) {
      console.error("❌ Gender channel not found.");
      return;
    }

    console.log(`✅ Channel found: ${channel.name}`);

    await channel.send({
      embeds: [createGenderEmbed()],
      components: [createGenderMenu()]
    });

    console.log("✅ Gender selection panel posted!");
    console.log(`🆔 Message ID: ${channel.lastMessageId || "unknown"}`);
    console.log(`📍 Channel: #${channel.name}`);

  } catch (error) {
    console.error("❌ Failed to post gender panel:");
    console.error(error);
  }
});
