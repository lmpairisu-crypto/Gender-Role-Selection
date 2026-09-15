const express = require("express");
const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  EmbedBuilder,
} = require("discord.js");

// ==================================================
// RENDER WEB SERVER
// ==================================================

const app = express();
const PORT = process.env.PORT || 10000;

app.get("/", (req, res) => {
  res.status(200).send("Gender Role Bot is online!");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🌐 Health server running on port ${PORT}`);
});

// ==================================================
// RENDER ENVIRONMENT VARIABLES
// ==================================================

const TOKEN = process.env.DISCORD_TOKEN;

const ROLE_IDS = {
  male: process.env.MALE_ROLE_ID,
  female: process.env.FEMALE_ROLE_ID,
  lgbt: process.env.LGBT_ROLE_ID,
  prefer_not_to_say: process.env.OTHER_ROLE_ID,
};

const CHANNEL_ID = process.env.CHANNEL_ID;

if (!TOKEN) {
  console.error("❌ DISCORD_TOKEN is missing!");
  process.exit(1);
}

console.log("🔑 DISCORD_TOKEN exists");
console.log(`🔐 Token length: ${TOKEN.length}`);

console.log("========== ENVIRONMENT VARIABLES ==========");
console.log(`MALE_ROLE_ID: ${ROLE_IDS.male ? "✅ SET" : "❌ MISSING"}`);
console.log(`FEMALE_ROLE_ID: ${ROLE_IDS.female ? "✅ SET" : "❌ MISSING"}`);
console.log(`LGBT_ROLE_ID: ${ROLE_IDS.lgbt ? "✅ SET" : "❌ MISSING"}`);
console.log(
  `OTHER_ROLE_ID: ${
    ROLE_IDS.prefer_not_to_say ? "✅ SET" : "❌ MISSING"
  }`
);
console.log(`CHANNEL_ID: ${CHANNEL_ID ? "✅ SET" : "❌ MISSING"}`);
console.log("==========================================");

// ==================================================
// DISCORD CLIENT
// ==================================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ],
});

// ==================================================
// MENU ID
// ==================================================

const SELECT_MENU_ID = "gender_select";

// ==================================================
// GENDER OPTIONS
// ==================================================

const GENDER_OPTIONS = {
  male: {
    label: "Male",
    emoji: "♂️",
    description: "Select the Male role",
  },

  female: {
    label: "Female",
    emoji: "♀️",
    description: "Select the Female role",
  },

  lgbt: {
    label: "LGBT",
    emoji: "🏳️‍🌈",
    description: "Select the LGBT+ role",
  },

  prefer_not_to_say: {
    label: "Prefer not to say",
    emoji: "🤐",
    description: "Don't disclose your gender",
  },
};

// ==================================================
// ACCEPT OLD VALUES TOO
// ==================================================

const VALUE_ALIASES = {
  male: "male",
  female: "female",
  lgbt: "lgbt",

  other: "prefer_not_to_say",
  prefer_not_to_say: "prefer_not_to_say",
  "prefer-not-to-say": "prefer_not_to_say",
  prefernotosay: "prefer_not_to_say",
};

// ==================================================
// CREATE MENU
// ==================================================

function createGenderMenu() {
  return new StringSelectMenuBuilder()
    .setCustomId(SELECT_MENU_ID)
    .setPlaceholder("Choose your gender role")
    .addOptions(
      Object.entries(GENDER_OPTIONS).map(([value, option]) => ({
        label: option.label,
        value: value,
        emoji: option.emoji,
        description: option.description,
      }))
    );
}

// ==================================================
// EMBED
// ==================================================

 function createEmbed() {
  return new EmbedBuilder()
    .setColor("#5865F2")
    .setTitle("🎎 Gender Role Selection")
    .setDescription(
      "<a:Avisala:1542448826265243660> Select your gender below to receive your role.\n\n" +
      "Your selection is private 🔒.\n" +
      "You can change your selection whenever you want.\n\n" +
      "🏠 **Gender-Based Access:**\n" +
      "Selecting a role will give you access to the appropriate private channel or dorm."
    )
    .setImage(process.env.GIF_URL);
 }
// ==================================================
// FIND ROLE USING RENDER VARIABLE
// ==================================================

function findRole(guild, type) {
  const roleId = ROLE_IDS[type];

  if (!roleId) {
    console.error(`❌ No Render role ID configured for: ${type}`);
    return null;
  }

  const role = guild.roles.cache.get(roleId);

  if (!role) {
    console.error(
      `❌ Role ID ${roleId} was not found in ${guild.name}`
    );
    return null;
  }

  return role;
}

// ==================================================
// FIND CHANNEL USING RENDER VARIABLE
// ==================================================

async function findChannel() {
  if (!CHANNEL_ID) {
    console.error("❌ CHANNEL_ID is missing in Render.");
    return null;
  }

  try {
    const channel = await client.channels.fetch(CHANNEL_ID);

    if (!channel) {
      console.error("❌ Channel was not found.");
      return null;
    }

    if (!channel.isTextBased()) {
      console.error("❌ CHANNEL_ID is not a text channel.");
      return null;
    }

    return channel;
  } catch (error) {
    console.error("❌ Failed to fetch channel:");
    console.error(error);
    return null;
  }
}

// ==================================================
// SEND PANEL
// ==================================================

async function sendGenderPanel() {
  const channel = await findChannel();

  if (!channel) {
    return;
  }

  try {
    const messages = await channel.messages.fetch({
      limit: 50,
    });

    const existingPanel = messages.find((message) => {
      if (message.author.id !== client.user.id) {
        return false;
      }

      return message.components.some((component) =>
        component.components?.some(
          (item) => item.customId === SELECT_MENU_ID
        )
      );
    });

    if (existingPanel) {
      console.log("✅ Gender selection panel already exists.");
      console.log(`🆔 Message ID: ${existingPanel.id}`);
      return;
    }

    const row = new ActionRowBuilder().addComponents(
      createGenderMenu()
    );

    const message = await channel.send({
      embeds: [createEmbed()],
      components: [row],
    });

    console.log("📥 NEW GENDER PANEL POSTED!");
    console.log(`🆔 Message ID: ${message.id}`);
    console.log(`📌 Channel: ${channel.name}`);
  } catch (error) {
    console.error("❌ Failed to send gender panel:");
    console.error(error);
  }
}

// ==================================================
// BOT READY
// ==================================================

client.once("clientReady", async () => {
  console.log("======================================");
  console.log("🚀 GENDER ROLE BOT STARTED");
  console.log("======================================");

  console.log(`🤖 Logged in as: ${client.user.tag}`);
  console.log(`🆔 Bot ID: ${client.user.id}`);
  console.log(`🏠 Servers: ${client.guilds.cache.size}`);

  for (const guild of client.guilds.cache.values()) {
    console.log(`📌 Server: ${guild.name} (${guild.id})`);
  }

  await sendGenderPanel();
});

// ==================================================
// INTERACTIONS
// ==================================================

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isStringSelectMenu()) {
    return;
  }

  if (interaction.customId !== SELECT_MENU_ID) {
    return;
  }

  // ==================================================
  // GET VALUE
  // ==================================================

  const rawValue = interaction.values?.[0];

  console.log("======================================");
  console.log("📥 GENDER SELECTION");
  console.log(`👤 User: ${interaction.user.tag}`);
  console.log(`🔎 Raw value: ${rawValue}`);
  console.log("======================================");

  // ==================================================
  // CONVERT VALUE
  // ==================================================

  const selected = VALUE_ALIASES[rawValue];

  if (!selected) {
    console.error(`❌ Unknown selection value: ${rawValue}`);

    await interaction.reply({
      content:
        "❌ Invalid gender selection. Please use the newest gender menu.",
      ephemeral: true,
    }).catch(() => {});

    return;
  }

  console.log(`✅ Converted selection: ${selected}`);

  // ==================================================
  // ACKNOWLEDGE
  // ==================================================

  try {
    await interaction.deferUpdate();
  } catch (error) {
    console.error("❌ Could not acknowledge interaction:");
    console.error(error);
    return;
  }

  // ==================================================
  // SERVER
  // ==================================================

  const guild = interaction.guild;

  if (!guild) {
    await interaction.followUp({
      content: "❌ This can only be used inside a server.",
      ephemeral: true,
    }).catch(() => {});

    return;
  }

  // ==================================================
  // MEMBER
  // ==================================================

  let member;

  try {
    member = await guild.members.fetch(interaction.user.id);
  } catch (error) {
    console.error("❌ Could not fetch member:");
    console.error(error);

    await interaction.followUp({
      content: "❌ Could not find your server member information.",
      ephemeral: true,
    }).catch(() => {});

    return;
  }

  // ==================================================
  // BOT MEMBER
  // ==================================================

  const botMember =
    guild.members.me ||
    await guild.members.fetchMe();

  // ==================================================
  // MANAGE ROLES
  // ==================================================

  if (!botMember.permissions.has("ManageRoles")) {
    console.error("❌ Bot does not have Manage Roles.");

    await interaction.followUp({
      content:
        "❌ I need the **Manage Roles** permission.",
      ephemeral: true,
    }).catch(() => {});

    return;
  }

  // ==================================================
  // SELECTED ROLE
  // ==================================================

  const selectedRole = findRole(guild, selected);

  if (!selectedRole) {
    await interaction.followUp({
      content:
        "❌ The role was not found. Please check the Render Environment Variables.",
      ephemeral: true,
    }).catch(() => {});

    return;
  }

  console.log(
    `🎯 Role: ${selectedRole.name} (${selectedRole.id})`
  );

  // ==================================================
  // ROLE HIERARCHY
  // ==================================================

  if (
    selectedRole.position >=
    botMember.roles.highest.position
  ) {
    console.error(
      `❌ Bot cannot manage role: ${selectedRole.name}`
    );

    await interaction.followUp({
      content:
        `❌ I cannot manage **${selectedRole.name}**.\n\n` +
        `Move the bot's role **above the gender roles** in Server Settings → Roles.`,
      ephemeral: true,
    }).catch(() => {});

    return;
  }

  // ==================================================
  // REMOVE OTHER GENDER ROLES
  // ==================================================

  for (const type of Object.keys(ROLE_IDS)) {
    if (type === selected) {
      continue;
    }

    const oldRole = findRole(guild, type);

    if (!oldRole) {
      continue;
    }

    if (!member.roles.cache.has(oldRole.id)) {
      continue;
    }

    if (
      oldRole.position >=
      botMember.roles.highest.position
    ) {
      console.log(
        `⚠️ Cannot remove role above bot: ${oldRole.name}`
      );
      continue;
    }

    try {
      await member.roles.remove(
        oldRole,
        "Gender role changed"
      );

      console.log(
        `🗑️ Removed old role: ${oldRole.name}`
      );
    } catch (error) {
      console.error(
        `❌ Could not remove ${oldRole.name}:`
      );
      console.error(error);
    }
  }

  // ==================================================
  // ADD NEW ROLE
  // ==================================================

  try {
    if (!member.roles.cache.has(selectedRole.id)) {
      await member.roles.add(
        selectedRole,
        "Gender role selected"
      );

      console.log(
        `➕ Added role: ${selectedRole.name}`
      );
    } else {
      console.log(
        `ℹ️ User already has: ${selectedRole.name}`
      );
    }
  } catch (error) {
    console.error("❌ Could not add role:");
    console.error(error);

    await interaction.followUp({
      content:
        "❌ I couldn't give you the role. Check **Manage Roles** and the bot's role position.",
      ephemeral: true,
    }).catch(() => {});

    return;
  }

  // ==================================================
  // CONFIRMATION
  // ==================================================

  await interaction.followUp({
    content:
      `✅ Your gender role is now **${selectedRole.name}**.`,
    ephemeral: true,
  }).catch(() => {});

  console.log(
    `✅ ${member.user.tag} received ${selectedRole.name}`
  );
});

// ==================================================
// ERRORS
// ==================================================

client.on("error", (error) => {
  console.error("❌ Discord client error:");
  console.error(error);
});

process.on("unhandledRejection", (error) => {
  console.error("❌ Unhandled promise rejection:");
  console.error(error);
});

process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught exception:");
  console.error(error);
});

// ==================================================
// LOGIN
// ==================================================

console.log("🔑 Attempting Discord login...");

client.login(TOKEN).catch((error) => {
  console.error("❌ Discord login failed!");
  console.error(error);
  process.exit(1);
});
