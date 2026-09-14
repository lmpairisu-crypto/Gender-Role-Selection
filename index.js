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
  "lgbt+": "1514569385841528833",
  prefer_not: "1548936806794526741"
};

const ALL_GENDER_ROLE_IDS = Object.values(GENDER_ROLES);
// ==========================================
// GENDER SELECTION MENU
// ==========================================

function createGenderMenu() {

  const menu = new StringSelectMenuBuilder()
    .setCustomId("gender_select")
    .setPlaceholder("Select your gender")
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(
      {
        label: "♂️Male",
        description: "Select the Male role",
        value: "♂️masculine"
      },
      {
        label: "♀️Female",
        description: "Select the Female role",
        value: "♀️feminine"
      },
      {
        label: "🏳‍🌈lgbt+",
        description: "Select the Non-binary role",
        value: "🏳‍🌈nonbinary"
      },
      {
        label: "🙊Prefer not to say",
        description: "Don't disclose your gender",
        value: "🙊prefer_not"
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
      "<a:Avisala:1542448826265243660> Please select your gender from the menu below.\n\n" +
      "**Your selection is private.**\n" +
      "Only you will see the confirmation from the bot <:AI:1549055579362828309>.\n\n" +
      "You can change your selection at any time.\n\n"
      "🏠 **Gender-Based Access:**\n"
      "Selecting the role that matches your gender will give you access to an extra private channel or a dorm shared with members of the same gender."
    )
    .setFooter({
      text: "Your selected role will be updated automatically."
    });
}
// ==========================================
// BOT READY
// ==========================================

client.once("ready", async () => {

  console.log("==========================================");
  console.log(`🤖 Logged in as ${client.user.tag}`);
  console.log(`🆔 Bot ID: ${client.user.id}`);
  console.log("==========================================");

  // ========================================
  // GENDER CHANNEL
  // ========================================

  const channelId = "1539643480714903602";

  const channel = await client.channels.fetch(channelId);

  if (!channel) {
    console.error("❌ Gender channel not found.");
    return;
  }

  // ========================================
  // SEND GENDER PANEL
  // ========================================

  await channel.send({
    embeds: [
      createGenderEmbed()
    ],
    components: [
      createGenderMenu()
    ]
  });

  console.log("✅ Gender selection panel posted.");
});
// ==========================================
// GENDER SELECTION INTERACTION
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
    const member = interaction.member;

    const selectedRoleId = GENDER_ROLES[selectedGender];

    if (!selectedRoleId) {
      return interaction.reply({
        content: "❌ This gender option is not configured.",
        ephemeral: true
      });
    }

    const selectedRole =
      interaction.guild.roles.cache.get(selectedRoleId);

    if (!selectedRole) {
      return interaction.reply({
        content: "❌ I couldn't find that gender role.",
        ephemeral: true
      });
    }

    // Remove any previous gender roles
    for (const roleId of ALL_GENDER_ROLE_IDS) {

      if (
        roleId !== selectedRoleId &&
        member.roles.cache.has(roleId)
      ) {

        await member.roles.remove(
          roleId,
          "Gender role changed"
        );
      }
    }

    // Give the selected gender role
    if (!member.roles.cache.has(selectedRoleId)) {

      await member.roles.add(
        selectedRoleId,
        "Gender role selected"
      );
    }

    // Private confirmation
    await interaction.reply({
      content:
        `✅ Your gender role is now **${selectedRole.name}**.\n\n` +
        `🔒 This confirmation is private and only visible to you.`,
      ephemeral: true
    });

  } catch (error) {

    console.error("❌ Gender selection error:", error);

    if (!interaction.replied) {
      await interaction.reply({
        content:
          "❌ I couldn't update your gender role. Please contact staff.",
        ephemeral: true
      });
    }
  }
});
// ==========================================
// DISCORD LOGIN
// ==========================================

const TOKEN = process.env.DISCORD_TOKEN;

if (!TOKEN) {
  console.error("❌ DISCORD_TOKEN is missing from Render.");
  process.exit(1);
}

client.login(TOKEN).catch(error => {
  console.error("❌ Discord login failed:", error);
  process.exit(1);
});
