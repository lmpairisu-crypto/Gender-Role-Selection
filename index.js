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

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🌐 Health server running on port ${PORT}`);
});

// ==================================================
// ENVIRONMENT VARIABLES
// ==================================================

const TOKEN = process.env.DISCORD_TOKEN;

const CHANNEL_ID = process.env.CHANNEL_ID;

const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID;

const ROLE_IDS = {
  male: process.env.MALE_ROLE_ID,
  female: process.env.FEMALE_ROLE_ID,
  lgbt: process.env.LGBT_ROLE_ID,
  prefer_not_to_say: process.env.OTHER_ROLE_ID,
};

// ==================================================
// CHECK ENVIRONMENT VARIABLES
// ==================================================

console.log("======================================");
console.log("🔧 ENVIRONMENT VARIABLES");
console.log("======================================");

console.log(
  `DISCORD_TOKEN: ${TOKEN ? "✅ SET" : "❌ MISSING"}`
);

console.log(
  `CHANNEL_ID: ${CHANNEL_ID ? "✅ SET" : "❌ MISSING"}`
);

console.log(
  `LOG_CHANNEL_ID: ${
    LOG_CHANNEL_ID ? "✅ SET" : "⚠️ NOT SET"
  }`
);

console.log(
  `MALE_ROLE_ID: ${
    ROLE_IDS.male ? "✅ SET" : "❌ MISSING"
  }`
);

console.log(
  `FEMALE_ROLE_ID: ${
    ROLE_IDS.female ? "✅ SET" : "❌ MISSING"
  }`
);

console.log(
  `LGBT_ROLE_ID: ${
    ROLE_IDS.lgbt ? "✅ SET" : "❌ MISSING"
  }`
);

console.log(
  `OTHER_ROLE_ID: ${
    ROLE_IDS.prefer_not_to_say
      ? "✅ SET"
      : "❌ MISSING"
  }`
);

console.log("======================================");

if (!TOKEN) {
  console.error("❌ DISCORD_TOKEN is missing!");
  process.exit(1);
}

// ==================================================
// DISCORD CLIENT
// ==================================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
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
// OLD VALUE ALIASES
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
// CREATE GENDER MENU
// ==================================================

function createGenderMenu() {
  return new StringSelectMenuBuilder()
    .setCustomId(SELECT_MENU_ID)
    .setPlaceholder("Choose your gender role")
    .addOptions(
      Object.entries(GENDER_OPTIONS).map(
        ([value, option]) => ({
          label: option.label,
          value: value,
          emoji: option.emoji,
          description: option.description,
        })
      )
    );
}

// ==================================================
// MAIN EMBED
// ==================================================

function createMainEmbed() {
  return new EmbedBuilder()
    .setColor("#5865F2")

    .setAuthor({
      name: "Pinoy Big Sister",

      // Render Environment Variable
      url: process.env.PICTURE_URL || undefined,

      // Optional author icon
      iconURL: process.env.PICTURE_URL || undefined,
    })

    .setTitle("🎎 Gender Role Selection")

    .setDescription(
      "Select your gender below to receive your role.\n\n" +

      "Your selection is private 🔒.\n\n" +

      "You can change your selection whenever you want."
    );
}

// ==================================================
// ACCESS EMBED
// ==================================================

function createAccessEmbed() {
  const embed = new EmbedBuilder()
    .setColor("#5865F2")

    .setDescription(
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +

      "🏠 **Gender-Based Access**\n\n" +

      "Selecting a role will give you access to the appropriate private channel or dorm."
    );

  // GIF thumbnail
  if (process.env.GIF_URL) {
    embed.setThumbnail(process.env.GIF_URL);
  }

  // Large dorm image
  if (process.env.DORM_IMAGE_URL) {
    embed.setImage(process.env.DORM_IMAGE_URL);
  }

  return embed;
}

// ==================================================
// FIND ROLE
// ==================================================

function findRole(guild, type) {
  const roleId = ROLE_IDS[type];

  if (!roleId) {
    console.error(
      `❌ No role ID configured for: ${type}`
    );

    return null;
  }

  const role = guild.roles.cache.get(roleId);

  if (!role) {
    console.error(
      `❌ Role ${roleId} was not found in ${guild.name}`
    );

    return null;
  }

  return role;
}

// ==================================================
// SEND GENDER PANEL
// ==================================================

async function sendGenderPanel() {
  console.log("======================================");
  console.log("📨 SENDING GENDER PANEL");
  console.log("======================================");

  if (!CHANNEL_ID) {
    console.error("❌ CHANNEL_ID is missing!");
    return;
  }

  try {
    console.log(
      `🔎 Fetching channel: ${CHANNEL_ID}`
    );

    const channel =
      await client.channels.fetch(CHANNEL_ID);

    if (!channel) {
      console.error(
        "❌ Channel could not be found!"
      );

      return;
    }

    console.log(
      `✅ Channel found: ${channel.name}`
    );

    console.log(
      `🆔 Channel ID: ${channel.id}`
    );

    if (!channel.isTextBased()) {
      console.error(
        "❌ CHANNEL_ID is not a text-based channel!"
      );

      return;
    }

    const row =
      new ActionRowBuilder().addComponents(
        createGenderMenu()
      );

    const message = await channel.send({
      embeds: [
        createMainEmbed(),
        createAccessEmbed(),
      ],

      components: [
        row,
      ],
    });

    console.log("======================================");
    console.log("✅ GENDER PANEL SENT SUCCESSFULLY!");
    console.log(
      `🆔 Message ID: ${message.id}`
    );
    console.log(
      `📌 Channel: ${channel.name}`
    );
    console.log("======================================");

  } catch (error) {
    console.error("======================================");
    console.error("❌ FAILED TO SEND GENDER PANEL");
    console.error("======================================");

    console.error(error);
  }
}

// ==================================================
// SEND DISCORD LOG
// ==================================================

async function sendLog({
  member,
  selectedRole,
  removedRoles = [],
}) {
  if (!LOG_CHANNEL_ID) {
    console.log(
      "⚠️ LOG_CHANNEL_ID is not configured."
    );

    return;
  }

  try {
    const logChannel =
      await client.channels.fetch(
        LOG_CHANNEL_ID
      );

    if (!logChannel) {
      console.error(
        "❌ Log channel not found!"
      );

      return;
    }

    if (!logChannel.isTextBased()) {
      console.error(
        "❌ LOG_CHANNEL_ID is not a text channel!"
      );

      return;
    }

    const removedText =
      removedRoles.length > 0
        ? removedRoles
            .map(
              (role) =>
                `<@&${role.id}>`
            )
            .join(", ")
        : "None";

    const logEmbed =
      new EmbedBuilder()
        .setColor("#5865F2")

        .setTitle("📋 Gender Role Log")

        .addFields(
          {
            name: "👤 Member",
            value:
              `${member.user.tag}\n` +
              `\`${member.id}\``,
            inline: false,
          },

          {
            name: "🎯 New Role",
            value:
              `${selectedRole}`,
            inline: true,
          },

          {
            name: "🗑️ Removed",
            value:
              removedText,
            inline: true,
          }
        )

        .setTimestamp()

        .setFooter({
          text: "Gender Role System",
        });

    await logChannel.send({
      embeds: [
        logEmbed,
      ],
    });

    console.log(
      "📋 Discord log sent successfully!"
    );

  } catch (error) {
    console.error(
      "❌ Failed to send Discord log:"
    );

    console.error(error);
  }
}

// ==================================================
// BOT READY
// ==================================================

client.once("ready", async () => {
  console.log("======================================");
  console.log("🚀 GENDER ROLE BOT STARTED");
  console.log("======================================");

  console.log(
    `🤖 Logged in as: ${client.user.tag}`
  );

  console.log(
    `🆔 Bot ID: ${client.user.id}`
  );

  console.log(
    `🏠 Servers: ${client.guilds.cache.size}`
  );

  for (
    const guild of client.guilds.cache.values()
  ) {
    console.log(
      `📌 Server: ${guild.name} (${guild.id})`
    );
  }

  // Send panel
  await sendGenderPanel();
});

// ==================================================
// INTERACTIONS
// ==================================================

client.on("interactionCreate", async (interaction) => {

  if (!interaction.isStringSelectMenu()) return;

  if (interaction.customId !== SELECT_MENU_ID) return;

  // ==================================================
  // ACKNOWLEDGE IMMEDIATELY
  // ==================================================

  try {
    await interaction.deferReply({
      ephemeral: true,
    });
  } catch (error) {
    console.error("❌ Could not acknowledge interaction:");
    console.error(error);
    return;
  }

  // ==================================================
  // GET SELECTION
  // ==================================================

  const rawValue = interaction.values?.[0];

  console.log("======================================");
  console.log("📥 GENDER SELECTION");
  console.log(`👤 User: ${interaction.user.tag}`);
  console.log(`🔎 Raw value: ${rawValue}`);
  console.log("======================================");

  const selected = VALUE_ALIASES[rawValue];

  if (!selected) {
    await interaction.editReply({
      content: "❌ Invalid gender selection. Please use the newest menu.",
    }).catch(() => {});

    return;
  }

  console.log(`✅ Converted selection: ${selected}`);

  // ==================================================
  // SERVER
  // ==================================================

  const guild = interaction.guild;

  if (!guild) {
    await interaction.editReply({
      content: "❌ This can only be used inside a server.",
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

    await interaction.editReply({
      content: "❌ Could not find your server member information.",
    }).catch(() => {});

    return;
  }

  // ==================================================
  // BOT MEMBER
  // ==================================================

  let botMember;

  try {
    botMember =
      guild.members.me ||
      await guild.members.fetchMe();
  } catch (error) {
    console.error("❌ Could not fetch bot member:");
    console.error(error);

    await interaction.editReply({
      content: "❌ I could not check my server permissions.",
    }).catch(() => {});

    return;
  }

  // ==================================================
  // MANAGE ROLES
  // ==================================================

  if (!botMember.permissions.has("ManageRoles")) {
    await interaction.editReply({
      content: "❌ I need the **Manage Roles** permission.",
    }).catch(() => {});

    return;
  }

  // ==================================================
  // SELECTED ROLE
  // ==================================================

  const selectedRole = findRole(guild, selected);

  if (!selectedRole) {
    await interaction.editReply({
      content:
        "❌ The selected role was not found. Check your Render role IDs.",
    }).catch(() => {});

    return;
  }

  console.log(
    `🎯 Selected role: ${selectedRole.name} (${selectedRole.id})`
  );

  // ==================================================
  // ROLE HIERARCHY
  // ==================================================

  if (
    selectedRole.position >=
    botMember.roles.highest.position
  ) {
    await interaction.editReply({
      content:
        `❌ I cannot manage **${selectedRole.name}**.\n\n` +
        `Move my bot role **above the gender roles** in Server Settings → Roles.`,
    }).catch(() => {});

    return;
  }

  // ==================================================
  // REMOVE OLD GENDER ROLES
  // ==================================================

  const removedRoles = [];

  for (const type of Object.keys(ROLE_IDS)) {

    if (type === selected) continue;

    const oldRole = findRole(guild, type);

    if (!oldRole) continue;

    if (!member.roles.cache.has(oldRole.id)) continue;

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

      removedRoles.push(oldRole);

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
  // ADD SELECTED ROLE
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

    console.error("❌ Could not add selected role:");
    console.error(error);

    await interaction.editReply({
      content:
        "❌ I couldn't give you the role. Check **Manage Roles** and make sure the bot role is above the gender roles.",
    }).catch(() => {});

    return;
  }

  // ==================================================
  // SEND DISCORD LOG
  // ==================================================

  await sendLog({
    member,
    selectedRole,
    removedRoles,
  });

  // ==================================================
  // CONFIRMATION
  // ==================================================

  await interaction.editReply({
    content:
      `✅ Your gender role is now **${selectedRole.name}**.`,
  }).catch(() => {});

  console.log("======================================");
  console.log(
    `✅ ${member.user.tag} received ${selectedRole.name}`
  );
  console.log("======================================");
});
