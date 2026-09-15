const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  EmbedBuilder,
  ChannelType
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

// ==========================================
// CHECK TOKEN
// ==========================================

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
  console.log(`🌐 Port: ${PORT}`);
});

// ==========================================
// DISCORD CLIENT
// ==========================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

// ==========================================
// CREATE GENDER MENU
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
// CREATE GENDER EMBED
// ==========================================

function createGenderEmbed() {
  return new EmbedBuilder()
    .setColor("#5865F2")
    .setTitle("🔒 Gender Selection")
    .setDescription(
      "<a:Avisala:1542448826265243660> " +
      "Please select your gender from the menu below.\n\n" +

      "**Your selection is private.**\n" +

      "Only you will see the confirmation " +
      "from the bot. <:AI:1549055579362828309>\n\n" +

      "You can change your selection at any time.\n\n" +

      "🏠 **Gender-Based Access:**\n" +

      "Selecting the role that matches your gender " +
      "will give you access to an extra private " +
      "channel or a dorm shared with members of " +
      "the same gender."
    )
    .setFooter({
      text: "Your selected role will be updated automatically."
    });
}

// ==========================================
// CLIENT ERROR
// ==========================================

client.on("error", error => {
  console.error("❌ Discord Client Error:");
  console.error(error);
});

// ==========================================
// WARNINGS
// ==========================================

client.on("warn", warning => {
  console.warn("⚠️ Discord Warning:");
  console.warn(warning);
});

// ==========================================
// BOT READY
// ==========================================

client.once("ready", async () => {

  console.log("==========================================");
  console.log(`🤖 Logged in as ${client.user.tag}`);
  console.log(`🆔 Bot ID: ${client.user.id}`);
  console.log(`🏠 Servers: ${client.guilds.cache.size}`);
  console.log("==========================================");

  try {

    // ========================================
    // FIND CHANNEL
    // ========================================

    console.log(
      `🔎 Looking for gender channel: ${GENDER_CHANNEL_ID}`
    );

    const channel = await client.channels.fetch(
      GENDER_CHANNEL_ID
    );

    if (!channel) {
      console.error("❌ Gender channel was not found.");
      return;
    }

    console.log(`✅ Channel found: ${channel.name}`);

    // ========================================
    // CHECK TEXT CHANNEL
    // ========================================

    if (
      channel.type !== ChannelType.GuildText &&
      channel.type !== ChannelType.GuildAnnouncement
    ) {
      console.error(
        `❌ Selected channel is not a text channel. Type: ${channel.type}`
      );

      return;
    }

    // ========================================
    // CHECK BOT PERMISSIONS
    // ========================================

    const guild = channel.guild;

    const botMember = await guild.members.fetch(
      client.user.id
    );

    const permissions = channel.permissionsFor(
      botMember
    );

    if (!permissions) {
      console.error(
        "❌ Could not check bot permissions."
      );

      return;
    }

    if (!permissions.has("ViewChannel")) {
      console.error(
        "❌ Bot does not have View Channel permission."
      );

      return;
    }

    if (!permissions.has("SendMessages")) {
      console.error(
        "❌ Bot does not have Send Messages permission."
      );

      return;
    }

    if (!permissions.has("EmbedLinks")) {
      console.error(
        "❌ Bot does not have Embed Links permission."
      );

      return;
    }

    console.log("✅ Bot has required channel permissions.");

    // ========================================
    // CHECK ROLE PERMISSION
    // ========================================

    if (!botMember.permissions.has("ManageRoles")) {
      console.warn(
        "⚠️ WARNING: Bot does not have Manage Roles permission."
      );

      console.warn(
        "⚠️ Users will NOT be able to receive gender roles."
      );
    } else {
      console.log("✅ Bot has Manage Roles permission.");
    }

    // ========================================
    // CHECK GENDER ROLES
    // ========================================

    console.log("🔎 Checking gender roles...");

    for (const [name, roleId] of Object.entries(GENDER_ROLES)) {

      const role = guild.roles.cache.get(roleId);

      if (!role) {

        console.error(
          `❌ Role not found: ${name} (${roleId})`
        );

        continue;
      }

      console.log(
        `✅ Role found: ${role.name} (${role.id})`
      );

      // Check hierarchy
      if (role.position >= botMember.roles.highest.position) {

        console.error(
          `❌ Bot role is NOT above "${role.name}".`
        );

      } else {

        console.log(
          `✅ Bot can manage "${role.name}".`
        );

      }
    }

    // ========================================
    // SEND GENDER PANEL
    // ========================================

    console.log("📨 Sending gender selection panel...");

    const message = await channel.send({
      embeds: [
        createGenderEmbed()
      ],
      components: [
        createGenderMenu()
      ]
    });

    console.log(
      `✅ Gender selection panel posted!`
    );

    console.log(
      `🆔 Message ID: ${message.id}`
    );

    console.log(
      `📍 Channel: #${channel.name}`
    );

    console.log("==========================================");

  } catch (error) {

    console.error(
      "❌ Failed during bot startup:"
    );

    console.error(error);

  }

});

// ==========================================
// GENDER SELECTION
// ==========================================

client.on(
  "interactionCreate",
  async interaction => {

    if (!interaction.isStringSelectMenu()) {
      return;
    }

    if (interaction.customId !== "gender_select") {
      return;
    }

    try {

      // ======================================
      // GET SELECTED GENDER
      // ======================================

      const selectedGender =
        interaction.values[0];

      console.log(
        `📥 ${interaction.user.tag} selected: ${selectedGender}`
      );

      // ======================================
      // GET MEMBER
      // ======================================

      const member = interaction.member;

      if (!member) {

        return interaction.reply({
          content: "❌ Could not find your server member information.",
          ephemeral: true
        });

      }

      // ======================================
      // GET ROLE ID
      // ======================================

      const selectedRoleId =
        GENDER_ROLES[selectedGender];

      if (!selectedRoleId) {

        console.error(
          `❌ No role configured for: ${selectedGender}`
        );

        return interaction.reply({
          content:
            "❌ This gender option is not configured.",
          ephemeral: true
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

        return interaction.reply({
          content:
            "❌ I couldn't find that gender role.",
          ephemeral: true
        });

      }

      // ======================================
      // CHECK BOT ROLE HIERARCHY
      // ======================================

      const botMember =
        await interaction.guild.members.fetch(
          client.user.id
        );

      if (
        selectedRole.position >=
        botMember.roles.highest.position
      ) {

        console.error(
          `❌ Cannot manage role: ${selectedRole.name}`
        );

        return interaction.reply({
          content:
            "❌ I cannot assign this role because my bot role is below it. Please contact staff.",
          ephemeral: true
        });

      }

      // ======================================
      // REMOVE OLD GENDER ROLES
      // ======================================

      for (
        const roleId of ALL_GENDER_ROLE_IDS
      ) {

        if (roleId === selectedRoleId) {
          continue;
        }

        if (
          member.roles.cache.has(roleId)
        ) {

          const oldRole =
            interaction.guild.roles.cache.get(
              roleId
            );

          try {

            await member.roles.remove(
              roleId,
              "Gender role changed"
            );

            console.log(
              `🗑️ Removed role: ${
                oldRole ? oldRole.name : roleId
              }`
            );

          } catch (error) {

            console.error(
              `❌ Failed to remove role ${roleId}:`
            );

            console.error(error);

          }

        }

      }

      // ======================================
      // ADD NEW ROLE
      // ======================================

      if (
        !member.roles.cache.has(
          selectedRoleId
        )
      ) {

        await member.roles.add(
          selectedRoleId,
          "Gender role selected"
        );

        console.log(
          `✅ Added role: ${selectedRole.name}`
        );

      }

      // ======================================
      // PRIVATE CONFIRMATION
      // ======================================

      await interaction.reply({

        content:
          `✅ Your gender role is now **${selectedRole.name}**.\n\n` +
          `🔒 This confirmation is private and only visible to you.`,

        ephemeral: true

      });

      console.log(
        `🎉 Gender role successfully updated for ${interaction.user.tag}`
      );

    } catch (error) {

      console.error(
        "❌ Gender selection error:"
      );

      console.error(error);

      try {

        if (interaction.replied) {
          return;
        }

        if (interaction.deferred) {
          return interaction.editReply({
            content:
              "❌ I couldn't update your gender role. Please contact staff."
          });
        }

        await interaction.reply({
          content:
            "❌ I couldn't update your gender role. Please contact staff.",
          ephemeral: true
        });

      } catch (replyError) {

        console.error(
          "❌ Could not send error response:"
        );

        console.error(replyError);

      }

    }

  }
);

// ==========================================
// DISCORD LOGIN
// ==========================================

console.log("🔐 Attempting Discord login...");

client.login(TOKEN)

  .then(() => {

    console.log(
      "🔐 Discord login successful."
    );

  })

  .catch(error => {

    console.error(
      "❌ Discord login failed:"
    );

    console.error(error);

    process.exit(1);

  });
