const express = require("express");
const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  EmbedBuilder,
} = require("discord.js");

// ===============================
// RENDER WEB SERVER
// ===============================

const app = express();
const PORT = process.env.PORT || 10000;

app.get("/", (req, res) => {
  res.status(200).send("Gender Role Bot is online!");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🌐 Health server running on port ${PORT}`);
});

// ===============================
// DISCORD TOKEN
// ===============================

const TOKEN = process.env.DISCORD_TOKEN;

if (!TOKEN) {
  console.error("❌ DISCORD_TOKEN is missing!");
  process.exit(1);
}

console.log("🔑 DISCORD_TOKEN exists");
console.log(`🔐 Token length: ${TOKEN.length}`);

// ===============================
// DISCORD CLIENT
// ===============================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ],
});

// ===============================
// ROLE NAMES
// ===============================

const ROLE_NAMES = {
  male: "♂",
  female: "♀",
  lgbt: "🏳️‍🌈",
  other: "😶",
};

// Optional role IDs.
// You can leave these empty.
// If you know the IDs, put them in Render Environment Variables.

const ROLE_IDS = {
  male: process.env.MALE_ROLE_ID || null,
  female: process.env.FEMALE_ROLE_ID || null,
  lgbt: process.env.LGBT_ROLE_ID || null,
  other: process.env.OTHER_ROLE_ID || null,
};

// Optional channel ID.
// If you add CHANNEL_ID in Render, the panel will be sent there.

const CHANNEL_ID = process.env.CHANNEL_ID || null;

const SELECT_MENU_ID = "gender_select";

// ===============================
// GENDER MENU
// ===============================

const menu = new StringSelectMenuBuilder()
  .setCustomId(SELECT_MENU_ID)
  .setPlaceholder("Choose your gender role")
  .addOptions(
    new StringSelectMenuOptionBuilder()
      .setLabel("Male")
      .setValue("male")
      .setEmoji("♂")
      .setDescription("Get the male role"),

    new StringSelectMenuOptionBuilder()
      .setLabel("Female")
      .setValue("female")
      .setEmoji("♀")
      .setDescription("Get the female role"),

    new StringSelectMenuOptionBuilder()
      .setLabel("LGBT")
      .setValue("lgbt")
      .setEmoji("🏳️‍🌈")
      .setDescription("Get the LGBT role"),

    new StringSelectMenuOptionBuilder()
      .setLabel("Other")
      .setValue("other")
      .setEmoji("😶")
      .setDescription("Get the other role")
  );

const row = new ActionRowBuilder().addComponents(menu);

// ===============================
// EMBED
// ===============================

const embed = new EmbedBuilder()
  .setTitle("Gender Role Selection")
  .setDescription(
    "Select your gender below to receive your role.\n\n" +
    "You can change your role whenever you want."
  );

// ===============================
// FIND ROLE
// ===============================

async function findRole(guild, type) {
  const roleId = ROLE_IDS[type];

  // Try role ID first
  if (roleId) {
    const role = guild.roles.cache.get(roleId);

    if (role) {
      return role;
    }
  }

  // Otherwise search by name
  const roleName = ROLE_NAMES[type];

  return guild.roles.cache.find(
    (role) => role.name === roleName
  ) || null;
}

// ===============================
// FIND CHANNEL
// ===============================

async function findChannel() {

  // If CHANNEL_ID exists, use it
  if (CHANNEL_ID) {
    try {
      const channel = await client.channels.fetch(CHANNEL_ID);

      if (channel && channel.isTextBased()) {
        return channel;
      }
    } catch (error) {
      console.error("❌ Could not find CHANNEL_ID:", error);
    }
  }

  // Otherwise search every server
  for (const guild of client.guilds.cache.values()) {

    const channel = guild.channels.cache.find((ch) => {

      if (!ch.isTextBased()) {
        return false;
      }

      const name = (ch.name || "").toLowerCase();

      return (
        name.includes("role") ||
        name.includes("gender")
      );
    });

    if (channel) {
      return channel;
    }
  }

  return null;
}

// ===============================
// SEND PANEL
// ===============================

async function sendGenderPanel() {

  const channel = await findChannel();

  if (!channel) {
    console.log("❌ Gender role channel not found!");
    console.log("Set CHANNEL_ID in Render if necessary.");
    return;
  }

  try {

    // Check recent messages for an existing panel
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

    const message = await channel.send({
      embeds: [embed],
      components: [row],
    });

    console.log("📥 GENDER SELECTION PANEL POSTED!");
    console.log(`🆔 Message ID: ${message.id}`);
    console.log(`📌 Channel: ${channel.name}`);

  } catch (error) {

    console.error("❌ Failed to send gender panel:");
    console.error(error);

  }
}

// ===============================
// BOT READY
// ===============================

client.once("clientReady", async () => {

  console.log("======================================");
  console.log("🚀 GENDER ROLE BOT STARTING");
  console.log("======================================");

  console.log(`🤖 Logged in as: ${client.user.tag}`);
  console.log(`🆔 Bot ID: ${client.user.id}`);
  console.log(`🏠 Servers: ${client.guilds.cache.size}`);

  for (const guild of client.guilds.cache.values()) {

    console.log(
      `📌 Server: ${guild.name} (${guild.id})`
    );

  }

  await sendGenderPanel();

});

// ===============================
// INTERACTIONS
// ===============================

client.on("interactionCreate", async (interaction) => {

  if (!interaction.isStringSelectMenu()) {
    return;
  }

  if (interaction.customId !== SELECT_MENU_ID) {
    return;
  }

  // ==========================================
  // IMPORTANT:
  // ACKNOWLEDGE THE INTERACTION ONLY ONCE
  // ==========================================

  try {

    await interaction.deferUpdate();

  } catch (error) {

    console.error(
      "❌ Could not acknowledge interaction:",
      error
    );

    return;
  }

  // ==========================================
  // HANDLE ROLE
  // ==========================================

  try {

    const selected = interaction.values[0];

    if (!ROLE_NAMES[selected]) {

      await interaction.followUp({
        content: "❌ Invalid gender selection.",
        ephemeral: true,
      }).catch(() => {});

      return;
    }

    const guild = interaction.guild;
    const member = interaction.member;

    if (!guild || !member) {

      await interaction.followUp({
        content: "❌ This can only be used inside a server.",
        ephemeral: true,
      }).catch(() => {});

      return;
    }

    console.log(
      `👤 ${member.user.tag} selected: ${selected}`
    );

    // ==========================================
    // GET BOT MEMBER
    // ==========================================

    const botMember =
      guild.members.me ||
      await guild.members.fetchMe();

    // ==========================================
    // CHECK MANAGE ROLES
    // ==========================================

    if (!botMember.permissions.has("ManageRoles")) {

      console.error(
        "❌ Bot does not have Manage Roles permission!"
      );

      await interaction.followUp({
        content:
          "❌ I need the **Manage Roles** permission.",
        ephemeral: true,
      }).catch(() => {});

      return;
    }

    // ==========================================
    // GET SELECTED ROLE
    // ==========================================

    const selectedRole =
      await findRole(guild, selected);

    if (!selectedRole) {

      console.error(
        `❌ Role not found: ${ROLE_NAMES[selected]}`
      );

      await interaction.followUp({
        content:
          `❌ Role **${ROLE_NAMES[selected]}** was not found.`,
        ephemeral: true,
      }).catch(() => {});

      return;
    }

    // ==========================================
    // CHECK ROLE HIERARCHY
    // ==========================================

    if (
      selectedRole.position >=
      botMember.roles.highest.position
    ) {

      console.error(
        `❌ Cannot manage role: ${selectedRole.name}`
      );

      await interaction.followUp({
        content:
          `❌ I cannot manage **${selectedRole.name}**.\n\n` +
          `Move the bot's role **above** the gender roles in Server Settings → Roles.`,
        ephemeral: true,
      }).catch(() => {});

      return;
    }

    // ==========================================
    // REMOVE OLD GENDER ROLES
    // ==========================================

    for (const type of Object.keys(ROLE_NAMES)) {

      if (type === selected) {
        continue;
      }

      const oldRole =
        await findRole(guild, type);

      if (!oldRole) {
        continue;
      }

      if (
        member.roles.cache.has(oldRole.id) &&
        oldRole.position <
          botMember.roles.highest.position
      ) {

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
            `❌ Could not remove ${oldRole.name}:`,
            error
          );

        }
      }
    }

    // ==========================================
    // ADD NEW ROLE
    // ==========================================

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

    // ==========================================
    // CONFIRMATION
    // ==========================================

    await interaction.followUp({
      content:
        `✅ Your gender role is now **${selectedRole.name}**.`,
      ephemeral: true,
    }).catch(() => {});

    console.log(
      `✅ ${member.user.tag} successfully received ${selectedRole.name}`
    );

  } catch (error) {

    console.error(
      "❌ Gender selection error:"
    );

    console.error(error);

    await interaction.followUp({
      content:
        "❌ Something went wrong while changing your role.",
      ephemeral: true,
    }).catch(() => {});

  }

});

// ===============================
// DISCORD ERRORS
// ===============================

client.on("error", (error) => {

  console.error(
    "❌ Discord client error:",
    error
  );

});

process.on("unhandledRejection", (error) => {

  console.error(
    "❌ Unhandled promise rejection:",
    error
  );

});

process.on("uncaughtException", (error) => {

  console.error(
    "❌ Uncaught exception:",
    error
  );

});

// ===============================
// LOGIN
// ===============================

console.log("🔑 Attempting Discord login...");

client.login(TOKEN).catch((error) => {

  console.error("❌ Discord login failed!");
  console.error(error);

  process.exit(1);

});
