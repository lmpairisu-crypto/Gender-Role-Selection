
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

  return new ActionRowBuilder().addComponents(menu);
}

// ==========================================
// GENDER EMBED
// ==========================================

function createGenderEmbed() {
  return new EmbedBuilder()
    .setColor("#5865F2")
    .setTitle("🔒 Gender Selection")
    .setDescription(
      "Please select your gender from the menu below.\n\n" +

      "**Your selection is private.**\n" +
      "Only you will see the confirmation from the bot.\n\n" +

      "You can change your selection at any time.\n\n" +

      "🏠 **Gender-Based Access:**\n" +
      "Selecting the role that matches your gender " +
      "will give you access to the appropriate private " +
      "channel or dorm."
    )
    .setFooter({
      text: "Your selected role will be updated automatically."
    });
}

// ==========================================
// BOT READY
// ==========================================

client.once("clientReady", async readyClient => {

  console.log("==========================================");
  console.log("🎉 DISCORD LOGIN SUCCESSFUL!");
  console.log(`🤖 Logged in as: ${readyClient.user.tag}`);
  console.log(`🆔 Bot ID: ${readyClient.user.id}`);
  console.log(`🏠 Servers: ${readyClient.guilds.cache.size}`);
  console.log("==========================================");

  try {

    // ======================================
    // FIND CHANNEL
    // ======================================

    console.log(
      `🔎 Looking for gender channel: ${GENDER_CHANNEL_ID}`
    );

    const channel = await client.channels.fetch(
      GENDER_CHANNEL_ID
    );

    if (!channel) {
      console.error("❌ Gender channel was not found!");
      return;
    }

    console.log(`✅ Channel found: ${channel.name}`);

    // ======================================
    // CHECK SEND PERMISSION
    // ======================================

    if (!channel.isTextBased()) {
      console.error("❌ Gender channel is not a text channel!");
      return;
    }

    console.log("📤 Sending gender selection panel...");

    // ======================================
    // SEND PANEL
    // ======================================

    const message = await channel.send({
      embeds: [
        createGenderEmbed()
      ],
      components: [
        createGenderMenu()
      ]
    });

    console.log("==========================================");
    console.log("✅ GENDER SELECTION PANEL POSTED!");
    console.log(`🆔 Message ID: ${message.id}`);
    console.log(`📍 Channel: ${channel.name}`);
    console.log("==========================================");

  } catch (error) {

    console.error("==========================================");
    console.error("❌ FAILED TO POST GENDER PANEL");
    console.error("==========================================");

    console.error(error);
  }
});

// ==========================================
// GENDER SELECTION
// ==========================================

client.on("interactionCreate", async interaction => {

  if (!interaction.isStringSelectMenu()) {
    return;
  }

  if (interaction.customId !== "gender_select") {
    return;
  }

  try {

    const selectedGender = interaction.values[0];

    console.log(
      `👤 ${interaction.user.tag} selected: ${selectedGender}`
    );

    const member = interaction.member;

    const selectedRoleId =
      GENDER_ROLES[selectedGender];

    // ======================================
    // CHECK CONFIGURATION
    // ======================================

    if (!selectedRoleId) {

      return interaction.reply({
        content:
          "❌ This gender option is not configured.",
        flags: MessageFlags.Ephemeral
      });

    }

    // ======================================
    // FIND ROLE
    // ======================================

    const selectedRole =
      interaction.guild.roles.cache.get(
        selectedRoleId
      );

    if (!selectedRole) {

      console.error(
        `❌ Role not found: ${selectedRoleId}`
      );

      return interaction.reply({
        content:
          "❌ I couldn't find that gender role.",
        flags: MessageFlags.Ephemeral
      });

    }

    console.log(
      `🔎 Selected role: ${selectedRole.name}`
    );

    // ======================================
    // REMOVE OLD GENDER ROLES
    // ======================================

    for (const roleId of ALL_GENDER_ROLE_IDS) {

      if (
        roleId !== selectedRoleId &&
        member.roles.cache.has(roleId)
      ) {

        console.log(
          `🗑️ Removing old role: ${roleId}`
        );

        await member.roles.remove(
          roleId,
          "Gender role changed"
        );
      }
    }

    // ======================================
    // ADD NEW ROLE
    // ======================================

    if (!member.roles.cache.has(selectedRoleId)) {

      console.log(
        `➕ Adding role: ${selectedRole.name}`
      );

      await member.roles.add(
        selectedRole,
        "Gender role selected"
      );
    }

    // ======================================
    // PRIVATE CONFIRMATION
    // ======================================

    await interaction.reply({
      content:
        `✅ Your gender role is now **${selectedRole.name}**.\n\n` +
        `🔒 This confirmation is private and only visible to you.`,
      flags: MessageFlags.Ephemeral
    });

    console.log(
      `✅ Role assigned successfully to ${interaction.user.tag}`
    );

  } catch (error) {

    console.error("❌ Gender selection error:");
    console.error(error);

    if (!interaction.replied && !interaction.deferred) {

      await interaction.reply({
        content:
          "❌ I couldn't update your gender role. Please contact staff.",
        flags: MessageFlags.Ephemeral
      });

    }
  }
});

// ==========================================
// LOGIN
// ==========================================

console.log("🔐 Attempting Discord login...");
console.log("🌐 Connecting to Discord Gateway...");

client.login(TOKEN)
  .then(() => {
    console.log("✅ Discord login request accepted.");
  })
  .catch(error => {

    console.error("==========================================");
    console.error("❌ DISCORD LOGIN FAILED");
    console.error("==========================================");

    console.error(error);

    process.exit(1);
  });

// ==========================================
// LOGIN TIMEOUT
// ==========================================

setTimeout(() => {

  if (!client.isReady()) {

    console.error("==========================================");
    console.error("❌ DISCORD LOGIN TIMEOUT");
    console.error("==========================================");

    console.error(
      "The bot did not receive the Discord READY event."
    );

    console.error(
      "Check your DISCORD_TOKEN and Discord Developer Portal."
    );

    process.exit(1);
  }

}, 60000);
