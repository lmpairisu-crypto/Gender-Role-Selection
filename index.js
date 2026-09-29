require("dotenv").config();

const express = require("express");

const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
  SlashCommandBuilder,
  PermissionsBitField,
} = require("discord.js");

// ======================================================
// CONFIG
// ======================================================

const PORT = Number(process.env.PORT) || 10000;

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

const CHANNEL_ID = process.env.CHANNEL_ID;
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID;
const STAFF_ROLE_ID = process.env.STAFF_ROLE_ID;

// Gender roles
const MALE_ROLE_ID = process.env.MALE_ROLE_ID;
const FEMALE_ROLE_ID = process.env.FEMALE_ROLE_ID;
const LGBT_ROLE_ID = process.env.LGBT_ROLE_ID;
const PREFER_NOT_TO_SAY_ROLE_ID =
  process.env.PREFER_NOT_TO_SAY_ROLE_ID;

// Nickname manager roles
const LAMPOON_ROLE_ID = process.env.LAMPOON_ROLE_ID;
const CONTENT_CREATOR_ROLE_ID = process.env.CONTENT_CREATOR_ROLE_ID;
const LMP_SUPPORTER_ROLE_ID = process.env.LMP_SUPPORTER_ROLE_ID;

// Additional role IDs
const PARTNERSHIP_ROLE_ID = process.env.PARTNERSHIP_ROLE_ID;
const COLLABORATOR_ROLE_ID = process.env.COLLABORATOR_ROLE_ID;
const SPONSOR_ROLE_ID = process.env.SPONSOR_ROLE_ID;
const SATIRICAL_CC_ROLE_ID = process.env.SATIRICAL_CC_ROLE_ID;

// Images
const PICTURE_URL = process.env.PICTURE_URL;
const DOG_GIF_URL = process.env.DOG_GIF_URL;
const HOUSE_IMAGE_URL = process.env.HOUSE_IMAGE_URL;

// ======================================================
// VALIDATION
// ======================================================

if (!DISCORD_TOKEN) {
  console.error("❌ DISCORD_TOKEN is missing.");
  process.exit(1);
}

if (!CHANNEL_ID) {
  console.error("❌ CHANNEL_ID is missing.");
  process.exit(1);
}

if (!LOG_CHANNEL_ID) {
  console.error("❌ LOG_CHANNEL_ID is missing.");
  process.exit(1);
}

if (!STAFF_ROLE_ID) {
  console.error("❌ STAFF_ROLE_ID is missing.");
  process.exit(1);
}

// ======================================================
// EXPRESS / RENDER HEALTH SERVER
// ======================================================

const app = express();

app.get("/", (req, res) => {
  res.send("Pinoy Big Sister Bot is online!");
});

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🌐 Web server running on port ${PORT}`);
});

// ======================================================
// DISCORD CLIENT
// ======================================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ],
});

// ======================================================
// COMPONENT IDs
// ======================================================

const NICKNAME_BUTTON_ID = "request_nickname";
const NICKNAME_MODAL_ID = "nickname_request_modal";
const NICKNAME_INPUT_ID = "requested_nickname";

const GENDER_BUTTON_ID = "request_gender_access";
const GENDER_MENU_ID = "gender_access_selection";

const APPROVE_PREFIX = "house_registration_approve";
const REJECT_PREFIX = "house_registration_reject";

// ======================================================
// TEMPORARY REGISTRATION STORAGE
// ======================================================
//
// Stores the two parts of a registration request until
// both Nickname + Gender have been submitted.
//
// Example:
// {
//   requestedNickname: "Mikasa",
//   genderKey: "female",
//   logMessageId: "...",
//   guildId: "..."
// }
//
// ======================================================

const pendingRegistrations = new Map();

// Stores nicknames that were changed by the bot.
// This prevents guildMemberUpdate from treating the bot's
// own nickname update as a manual nickname change.

const botNicknameChanges = new Map();

// Stores the user's original Discord username in memory.
// The original username is also available from member.user.username.
const originalNames = new Map();

// ======================================================
// GENDER CONFIG
// ======================================================

const GENDER_DATA = {
  male: {
    label: "Male",
    emoji: "♂️",
    roleId: MALE_ROLE_ID,
  },

  female: {
    label: "Female",
    emoji: "♀️",
    roleId: FEMALE_ROLE_ID,
  },

  lgbt: {
    label: "LGBT+",
    emoji: "🏳️‍🌈",
    roleId: LGBT_ROLE_ID,
  },

  prefer_not_to_say: {
    label: "Prefer not to say",
    emoji: "🔒",
    roleId: PREFER_NOT_TO_SAY_ROLE_ID,
  },
};

// ======================================================
// HELPERS
// ======================================================

function cleanText(value) {
  if (!value) return "";

  return String(value)
    .replace(/\r/g, "")
    .replace(/\n/g, " ")
    .trim();
}

function truncateNickname(value, maxLength = 32) {
  value = cleanText(value);

  if (value.length <= maxLength) {
    return value;
  }

  return value.substring(0, maxLength).trim();
}

function hasRole(member, roleId) {
  if (!roleId) return false;

  return member.roles.cache.has(roleId);
}

function getGenderRoleId(genderKey) {
  return GENDER_DATA[genderKey]?.roleId || null;
}

function getGenderLabel(genderKey) {
  const data = GENDER_DATA[genderKey];

  if (!data) {
    return "Unknown";
  }

  return `${data.emoji} ${data.label}`;
}

// ======================================================
// NICKNAME TAG DETECTION
// ======================================================
//
// Managed formats:
//
// Lampoon:
// LMP.Akira
//
// Content Creator:
// Akira cc
//
// Lampoon + CC:
// LMP.Akira cc
//
// LMP Supporter:
// Akira LMP
//
// Lampoon + Supporter:
// LMP.Akira LMP
//
// Lampoon + CC + Supporter:
// LMP.Akira cc LMP
//
// The bot removes only tags at the expected beginning/end.
// It does NOT remove ordinary "LMP" text in the middle
// of someone's name.
//

function stripManagedNicknameTags(nickname) {
  let base = cleanText(nickname);

  if (!base) {
    return "";
  }

  // Remove Lampoon prefix variants
  base = base.replace(
    /^(?:LMP\.|lmp\.|ʟᴍᴘ\.|Lᴍᴘ\.|ʟmp\.)\s*/iu,
    ""
  );

  // Remove Content Creator suffix
  base = base.replace(
    /\s+(?:cc|CC|Cc|cC|ᴄᴄ)$/u,
    ""
  );

  // Remove LMP Supporter suffix
  base = base.replace(
    /\s+(?:LMP|lmp|ʟᴍᴘ)$/u,
    ""
  );

  return cleanText(base);
}

// ======================================================
// GET BASE NICKNAME
// ======================================================

function getBaseNickname(member) {
  // If the member currently has no guild nickname,
  // their original Discord username is the base.

  if (!member.nickname) {
    return cleanText(member.user.username);
  }

  const stripped = stripManagedNicknameTags(member.nickname);

  if (stripped) {
    return stripped;
  }

  return cleanText(member.user.username);
}

// ======================================================
// BUILD MANAGED NICKNAME
// ======================================================

function buildManagedNickname(member, baseNickname) {
  let base = cleanText(baseNickname);

  if (!base) {
    base = cleanText(member.user.username);
  }

  // Remove any old managed tags first.
  base = stripManagedNicknameTags(base);

  if (!base) {
    base = cleanText(member.user.username);
  }

  const isLampoon = hasRole(member, LAMPOON_ROLE_ID);
  const isContentCreator = hasRole(member, CONTENT_CREATOR_ROLE_ID);
  const isSupporter = hasRole(member, LMP_SUPPORTER_ROLE_ID);

  let prefix = "";
  let suffixes = [];

  // Lampoon
  if (isLampoon) {
    prefix = "LMP.";
  }

  // Content Creator
  if (isContentCreator) {
    suffixes.push("cc");
  }

  // LMP Supporter
  if (isSupporter) {
    suffixes.push("LMP");
  }

  const suffix = suffixes.length
    ? ` ${suffixes.join(" ")}`
    : "";

  let result = `${prefix}${base}${suffix}`;

  // Discord nickname maximum is 32 characters.
  if (result.length > 32) {
    const reservedLength = prefix.length + suffix.length;

    const availableBaseLength = Math.max(
      1,
      32 - reservedLength
    );

    base = base.substring(0, availableBaseLength).trim();

    result = `${prefix}${base}${suffix}`;
  }

  return truncateNickname(result, 32);
}

// ======================================================
// BOT NICKNAME UPDATE
// ======================================================

async function setManagedNickname(member, baseNickname) {
  if (!member || !member.guild) {
    return false;
  }

  const me = member.guild.members.me;

  if (!me) {
    console.log(
      `⚠️ Cannot find bot member in guild ${member.guild.name}`
    );
    return false;
  }

  if (!me.permissions.has(PermissionsBitField.Flags.ManageNicknames)) {
    console.log(
      `❌ Bot does not have Manage Nicknames in ${member.guild.name}`
    );
    return false;
  }

  if (member.id === me.id) {
    return false;
  }

  if (!member.manageable) {
    console.log(
      `⚠️ Cannot manage nickname of ${member.user.tag}. ` +
      `Check bot role hierarchy.`
    );
    return false;
  }

  const desiredNickname = buildManagedNickname(
    member,
    baseNickname
  );

  const currentNickname = member.nickname || "";

  if (currentNickname === desiredNickname) {
    return false;
  }

  try {
    botNicknameChanges.set(member.id, desiredNickname);

    await member.setNickname(
      desiredNickname,
      "Big Sister House nickname manager"
    );

    console.log(
      `🏷️ Nickname updated: ${member.user.tag} → ${desiredNickname}`
    );

    // Give Discord a little time before deleting the marker.
    setTimeout(() => {
      botNicknameChanges.delete(member.id);
    }, 5000);

    return true;
  } catch (error) {
    botNicknameChanges.delete(member.id);

    console.error(
      `❌ Failed to update nickname for ${member.user.tag}:`,
      error
    );

    return false;
  }
}

// ======================================================
// SYNCHRONIZE MEMBER NICKNAME
// ======================================================

async function syncMemberNickname(member, baseNickname = null) {
  if (!member || member.user.bot) {
    return;
  }

  if (!baseNickname) {
    baseNickname = getBaseNickname(member);
  }

  originalNames.set(
    member.id,
    member.user.username
  );

  await setManagedNickname(
    member,
    baseNickname
  );
}

// ======================================================
// MAIN NICKNAME EMBED
// ======================================================

function createNicknameEmbed() {
  const embed = new EmbedBuilder()
    .setColor("#5865F2")
    .setTitle("🏷️ REQUEST NICKNAME")
    .setDescription(
      [
        "**For Official Lampoon Members & Creators**",
        "Use your **TikTok username or IGN** for easy identification.",
        "",
        "**For Community Members**",
        "Use your **In-Game Name (IGN)**.",
        "If your current server nickname already matches your IGN, **no request is needed**.",
        "",
        "### 📌 Nickname Format",
        "🎭 **Lampoon** → `LMP.Akira`",
        "🎮 **Content Creator** → `Akira cc`",
        "🎭 + 🎮 **Lampoon + Content Creator** → `LMP.Akira cc`",
        "",
        "**Click below to request or update your server nickname.**",
      ].join("\n")
    );

  if (PICTURE_URL) {
    embed.setThumbnail(PICTURE_URL);
  }

  return embed;
}

// ======================================================
// HOUSE GUARD EMBED
// ======================================================

function createHouseGuardEmbed() {
  const embed = new EmbedBuilder()
    .setColor("#5865F2")
    .setTitle("🐕 BIG SISTER HOUSE • HOUSE GUARD")
    .setDescription(
      [
        "🚨 **Beware of the Barking Dogs!**",
        "",
        "🐕 The House Guards protect the Big Sister House and watch the outside of the house.",
        "",
        "🔊 Unauthorized attempts to enter restricted areas may attract their attention.",
        "",
        "🚪 Please respect the **House boundaries**.",
        "",
        "> ||🐕 **The House Guards are watching...**||",
      ].join("\n")
    );

  if (DOG_GIF_URL) {
    embed.setThumbnail(DOG_GIF_URL);
  }

  return embed;
}

// ======================================================
// GENDER ACCESS EMBED
// ======================================================

function createGenderAccessEmbed() {
  const embed = new EmbedBuilder()
    .setColor("#5865F2")
    .setTitle("🏠 BIG SISTER HOUSE • GENDER ACCESS")
    .setDescription(
      [
        "Your approved **gender role** determines which private **Room/House** you can access.",
        "",
        "### 🔐 ACCESS",
        "Choose the gender category that applies to you.",
        "Your request will be reviewed by **Registration Staff** before access is granted.",
        "",
        "♂️ **Male**",
        "♀️ **Female**",
        "🏳️‍🌈 **LGBT+**",
        "🔒 **Prefer not to say**",
        "",
        "> ||🔐 **Access is granted only after staff approval.**||",
        "",
        "### 🏠 HOUSE RULES",
        "Please remain in your assigned **Room/House** and respect the access boundaries.",
      ].join("\n")
    )
    .setFooter({
      text: "Pinoy Big Sister • Private House Access",
    });

  if (HOUSE_IMAGE_URL) {
    embed.setImage(HOUSE_IMAGE_URL);
  }

  return embed;
}

// ======================================================
// PANEL BUTTONS
// ======================================================

function createNicknameButtonRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(NICKNAME_BUTTON_ID)
      .setLabel("Request Nickname")
      .setEmoji("🏷️")
      .setStyle(ButtonStyle.Primary)
  );
}

function createGenderButtonRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(GENDER_BUTTON_ID)
      .setLabel("Request Gender Access")
      .setEmoji("🔐")
      .setStyle(ButtonStyle.Primary)
  );
}

// ======================================================
// GENDER SELECT MENU
// ======================================================

function createGenderSelectRow() {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(GENDER_MENU_ID)
    .setPlaceholder("Select your gender category")
    .addOptions(
      {
        label: "Male",
        value: "male",
        emoji: "♂️",
      },
      {
        label: "Female",
        value: "female",
        emoji: "♀️",
      },
      {
        label: "LGBT+",
        value: "lgbt",
        emoji: "🏳️‍🌈",
      },
      {
        label: "Prefer not to say",
        value: "prefer_not_to_say",
        emoji: "🔒",
      }
    );

  return new ActionRowBuilder().addComponents(menu);
}

// ======================================================
// STAFF LOG EMBED
// ======================================================

function createRegistrationLogEmbed(
  member,
  registration
) {
  const nickname =
    registration.requestedNickname || "⏳ Not submitted";

  const gender =
    registration.genderKey
      ? getGenderLabel(registration.genderKey)
      : "⏳ Not submitted";

  const complete =
    Boolean(
      registration.requestedNickname &&
      registration.genderKey
    );

  const embed = new EmbedBuilder()
    .setColor(complete ? "#5865F2" : "#FEE75C")
    .setTitle("📋 BIG SISTER HOUSE • REGISTRATION")
    .addFields(
      {
        name: "👤 Applicant",
        value: `<@${member.id}>`,
        inline: false,
      },
      {
        name: "🏷️ Requested Nickname",
        value: `\`${nickname}\``,
        inline: true,
      },
      {
        name: "🎭 Gender",
        value: gender,
        inline: true,
      },
      {
        name: "📌 Status",
        value: complete
          ? "⏳ **PENDING STAFF REVIEW**"
          : "⏳ **WAITING FOR OTHER REQUEST**",
        inline: false,
      }
    )
    .setTimestamp();

  return embed;
}

// ======================================================
// STAFF BUTTONS
// ======================================================

function createStaffDecisionRow(userId, enabled = true) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`${APPROVE_PREFIX}:${userId}`)
      .setLabel("Accept")
      .setEmoji("✅")
      .setStyle(ButtonStyle.Success)
      .setDisabled(!enabled),

    new ButtonBuilder()
      .setCustomId(`${REJECT_PREFIX}:${userId}`)
      .setLabel("Reject")
      .setEmoji("❌")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(!enabled)
  );
}

// ======================================================
// FIND OR CREATE REGISTRATION LOG
// ======================================================

async function saveRegistrationLog(
  member,
  registration
) {
  const logChannel = member.guild.channels.cache.get(
    LOG_CHANNEL_ID
  );

  if (!logChannel) {
    throw new Error(
      "LOG_CHANNEL_ID channel was not found."
    );
  }

  const embed = createRegistrationLogEmbed(
    member,
    registration
  );

  const complete =
    Boolean(
      registration.requestedNickname &&
      registration.genderKey
    );

  const existingMessageId =
    registration.logMessageId;

  // Try updating the existing log.
  if (existingMessageId) {
    try {
      const existingMessage =
        await logChannel.messages.fetch(
          existingMessageId
        );

      await existingMessage.edit({
        content: `<@&${STAFF_ROLE_ID}>`,
        embeds: [embed],
        components: [
          createStaffDecisionRow(
            member.id,
            complete
          ),
        ],
      });

      return existingMessage;
    } catch (error) {
      console.log(
        "ℹ️ Existing registration log could not be updated. Creating a new one."
      );
    }
  }

  // Create a new combined log.
  const message = await logChannel.send({
    content: `<@&${STAFF_ROLE_ID}>`,
    embeds: [embed],
    components: [
      createStaffDecisionRow(
        member.id,
        complete
      ),
  });

  registration.logMessageId = message.id;

  return message;
}

// ======================================================
// UPDATE REGISTRATION DATA
// ======================================================

async function updateRegistration(
  member,
  changes
) {
  let registration =
    pendingRegistrations.get(member.id);

  if (!registration) {
    registration = {
      requestedNickname: null,
      genderKey: null,
      logMessageId: null,
      guildId: member.guild.id,
      createdAt: Date.now(),
    };
  }

  if (
    Object.prototype.hasOwnProperty.call(
      changes,
      "requestedNickname"
    )
  ) {
    registration.requestedNickname =
      changes.requestedNickname;
  }

  if (
    Object.prototype.hasOwnProperty.call(
      changes,
      "genderKey"
    )
  ) {
    registration.genderKey =
      changes.genderKey;
  }

  pendingRegistrations.set(
    member.id,
    registration
  );

  await saveRegistrationLog(
    member,
    registration
  );

  return registration;
}

// ======================================================
// SLASH COMMAND DEFINITIONS
// ======================================================

const slashCommands = [
  new SlashCommandBuilder()
    .setName("nickname")
    .setDescription("Manage Big Sister House nicknames")

    .addSubcommand((subcommand) =>
      subcommand
        .setName("setup")
        .setDescription(
          "Create or update the three Big Sister House panels"
        )
    )

    .addSubcommand((subcommand) =>
      subcommand
        .setName("sync")
        .setDescription(
          "Synchronize a member's nickname with their roles"
        )
        .addUserOption((option) =>
          option
            .setName("member")
            .setDescription("Member to synchronize")
            .setRequired(true)
        )
    )

    .addSubcommand((subcommand) =>
      subcommand
        .setName("cleanup")
        .setDescription(
          "Remove managed nickname tags from a member"
        )
        .addUserOption((option) =>
          option
            .setName("member")
            .setDescription("Member to clean")
            .setRequired(true)
        )
    )

    .addSubcommand((subcommand) =>
      subcommand
        .setName("reset")
        .setDescription(
          "Reset a member's nickname to their Discord username"
        )
        .addUserOption((option) =>
          option
            .setName("member")
            .setDescription("Member to reset")
            .setRequired(true)
        )
    ),

  new SlashCommandBuilder()
    .setName("role")
    .setDescription("Manage member roles")

    .addSubcommand((subcommand) =>
      subcommand
        .setName("add")
        .setDescription("Add a role to a member")
        .addUserOption((option) =>
          option
            .setName("member")
            .setDescription("Member")
            .setRequired(true)
        )
        .addRoleOption((option) =>
          option
            .setName("role")
            .setDescription("Role to add")
            .setRequired(true)
        )
    )

    .addSubcommand((subcommand) =>
      subcommand
        .setName("remove")
        .setDescription("Remove a role from a member")
        .addUserOption((option) =>
          option
            .setName("member")
            .setDescription("Member")
            .setRequired(true)
        )
        .addRoleOption((option) =>
          option
            .setName("role")
            .setDescription("Role to remove")
            .setRequired(true)
        )
    )

    .addSubcommand((subcommand) =>
      subcommand
        .setName("info")
        .setDescription(
          "Show configured roles on a member"
        )
        .addUserOption((option) =>
          option
            .setName("member")
            .setDescription("Member")
            .setRequired(true)
        )
    ),
].map((command) => command.toJSON());

// ======================================================
// DISCORD READY
// ======================================================

client.once("clientReady", async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

    // ====================================================
  // REGISTER SLASH COMMANDS
  // ====================================================

  try {
    const guild = client.guilds.cache.first();

    if (guild) {
      await guild.commands.set(slashCommands);

      console.log(
        `✅ Slash commands registered in: ${guild.name}`
      );
    } else {
      console.log(
        "⚠️ No Discord server found for slash commands."
      );
    }
  } catch (error) {
    console.error(
      "❌ Failed to register slash commands:",
      error
    );
  }
  
  try {
    const channel =
      await client.channels.fetch(CHANNEL_ID);

    if (!channel || !channel.isTextBased()) {
      console.error(
        "❌ CHANNEL_ID is not a valid text channel."
      );
      return;
    }

    console.log(
      `📌 Preparing Big Sister House panel in #${channel.name}`
    );

    // Fetch recent messages so we can avoid creating
    // duplicate panels every time Render restarts.
    const messages =
      await channel.messages.fetch({
        limit: 100,
      });

    // --------------------------------------------------
    // NICKNAME PANEL
    // --------------------------------------------------

    let nicknameMessage =
      messages.find((message) =>
        message.author.id === client.user.id &&
        message.embeds.some(
          (embed) =>
            embed.title === "🏷️ REQUEST NICKNAME"
        )
      );

    if (nicknameMessage) {
      await nicknameMessage.edit({
        embeds: [createNicknameEmbed()],
        components: [createNicknameButtonRow()],
      });

      console.log("♻️ Updated existing Nickname panel.");
    } else {
      nicknameMessage = await channel.send({
        embeds: [createNicknameEmbed()],
        components: [createNicknameButtonRow()],
      });

      console.log("✅ Created Nickname panel.");
    }

    // --------------------------------------------------
    // HOUSE GUARD PANEL
    // --------------------------------------------------

    let guardMessage =
      messages.find((message) =>
        message.author.id === client.user.id &&
        message.embeds.some(
          (embed) =>
            embed.title ===
            "🐕 BIG SISTER HOUSE • HOUSE GUARD"
        )
      );

    if (guardMessage) {
      await guardMessage.edit({
        embeds: [createHouseGuardEmbed()],
        components: [],
      });

      console.log("♻️ Updated existing House Guard panel.");
    } else {
      guardMessage = await channel.send({
        embeds: [createHouseGuardEmbed()],
      });

      console.log("✅ Created House Guard panel.");
    }

    // --------------------------------------------------
    // GENDER ACCESS PANEL
    // --------------------------------------------------

    let genderMessage =
      messages.find((message) =>
        message.author.id === client.user.id &&
        message.embeds.some(
          (embed) =>
            embed.title ===
            "🏠 BIG SISTER HOUSE • GENDER ACCESS"
        )
      );

    if (genderMessage) {
      await genderMessage.edit({
        embeds: [createGenderAccessEmbed()],
        components: [createGenderButtonRow()],
      });

      console.log("♻️ Updated existing Gender Access panel.");
    } else {
      genderMessage = await channel.send({
        embeds: [createGenderAccessEmbed()],
        components: [createGenderButtonRow()],
      });

      console.log("✅ Created Gender Access panel.");
    }

    console.log("🏠 Big Sister House panels are ready.");
  } catch (error) {
    console.error(
      "❌ Failed to create/update Big Sister House panels:",
      error
    );
  }
});

// ======================================================
// SLASH COMMAND HANDLER
// ======================================================

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) {
    return;
  }

  if (!interaction.guild) {
    await interaction.reply({
      content:
        "❌ This command can only be used inside the server.",
      ephemeral: true,
    });

    return;
  }

  try {
    // ==================================================
    // STAFF CHECK
    // ==================================================

    const staffMember =
      await interaction.guild.members.fetch(
        interaction.user.id
      );

    if (
      !staffMember.roles.cache.has(
        STAFF_ROLE_ID
      )
    ) {
      await interaction.reply({
        content:
          "❌ You do not have permission to use this command.",
        ephemeral: true,
      });

      return;
    }

    // ==================================================
    // NICKNAME COMMAND
    // ==================================================

    if (interaction.commandName === "nickname") {
      const subcommand =
        interaction.options.getSubcommand();

      // ------------------------------------------------
      // /nickname setup
      // ------------------------------------------------

      if (subcommand === "setup") {
        await interaction.deferReply({
          ephemeral: true,
        });

        const channel =
          await interaction.guild.channels.fetch(
            CHANNEL_ID
          );

        if (
          !channel ||
          !channel.isTextBased()
        ) {
          await interaction.editReply(
            "❌ CHANNEL_ID is not a valid text channel."
          );

          return;
        }

        const messages =
          await channel.messages.fetch({
            limit: 100,
          });

        // ==============================================
        // NICKNAME PANEL
        // ==============================================

        let nicknameMessage =
          messages.find((message) =>
            message.author.id === client.user.id &&
            message.embeds.some(
              (embed) =>
                embed.title ===
                "🏷️ REQUEST NICKNAME"
            )
          );

        if (nicknameMessage) {
          await nicknameMessage.edit({
            embeds: [
              createNicknameEmbed(),
            ],
            components: [
              createNicknameButtonRow(),
            ],
          });
        } else {
          nicknameMessage =
            await channel.send({
              embeds: [
                createNicknameEmbed(),
              ],
              components: [
                createNicknameButtonRow(),
              ],
            });
        }

        // ==============================================
        // HOUSE GUARD PANEL
        // ==============================================

        let guardMessage =
          messages.find((message) =>
            message.author.id === client.user.id &&
            message.embeds.some(
              (embed) =>
                embed.title ===
                "🐕 BIG SISTER HOUSE • HOUSE GUARD"
            )
          );

        if (guardMessage) {
          await guardMessage.edit({
            embeds: [
              createHouseGuardEmbed(),
            ],
            components: [],
          });
        } else {
          guardMessage =
            await channel.send({
              embeds: [
                createHouseGuardEmbed(),
              ],
            });
        }

        // ==============================================
        // GENDER ACCESS PANEL
        // ==============================================

        let genderMessage =
          messages.find((message) =>
            message.author.id === client.user.id &&
            message.embeds.some(
              (embed) =>
                embed.title ===
                "🏠 BIG SISTER HOUSE • GENDER ACCESS"
            )
          );

        if (genderMessage) {
          await genderMessage.edit({
            embeds: [
              createGenderAccessEmbed(),
            ],
            components: [
              createGenderButtonRow(),
            ],
          });
        } else {
          genderMessage =
            await channel.send({
              embeds: [
                createGenderAccessEmbed(),
              ],
              components: [
                createGenderButtonRow(),
              ],
            });
        }

        await interaction.editReply(
          [
            "✅ **Big Sister House panels are ready.**",
            "",
            "🏷️ Request Nickname",
            "🐕 House Guard",
            "🏠 Gender Access",
          ].join("\n")
        );

        return;
      }

      // ------------------------------------------------
      // GET TARGET MEMBER
      // ------------------------------------------------

      const targetUser =
        interaction.options.getUser(
          "member"
        );

      if (!targetUser) {
        await interaction.reply({
          content:
            "❌ Please select a member.",
          ephemeral: true,
        });

        return;
      }

      const targetMember =
        await interaction.guild.members.fetch(
          targetUser.id
        );

      // ------------------------------------------------
      // /nickname sync
      // ------------------------------------------------

      if (subcommand === "sync") {
        if (!targetMember.manageable) {
          await interaction.reply({
            content:
              "❌ I cannot manage this member's nickname. Check the bot role hierarchy.",
            ephemeral: true,
          });

          return;
        }

        const baseNickname =
          getBaseNickname(targetMember);

        await syncMemberNickname(
          targetMember,
          baseNickname
        );

        const updated =
          await interaction.guild.members.fetch(
            targetMember.id
          );

        await interaction.reply({
          content:
            `✅ Nickname synchronized for ${updated}.\n` +
            `🏷️ Current nickname: \`${updated.nickname || updated.user.username}\``,
          ephemeral: true,
        });

        return;
      }

      // ------------------------------------------------
      // /nickname cleanup
      // ------------------------------------------------

      if (subcommand === "cleanup") {
        if (!targetMember.manageable) {
          await interaction.reply({
            content:
              "❌ I cannot manage this member's nickname. Check the bot role hierarchy.",
            ephemeral: true,
          });

          return;
        }

        const me =
          interaction.guild.members.me;

        if (
          !me ||
          !me.permissions.has(
            PermissionsBitField.Flags.ManageNicknames
          )
        ) {
          await interaction.reply({
            content:
              "❌ I need Manage Nicknames permission.",
            ephemeral: true,
          });

          return;
        }

        const baseNickname =
          getBaseNickname(targetMember);

        botNicknameChanges.set(
          targetMember.id,
          baseNickname
        );

        await targetMember.setNickname(
          truncateNickname(baseNickname),
          "Staff nickname cleanup"
        );

        setTimeout(() => {
          botNicknameChanges.delete(
            targetMember.id
          );
        }, 5000);

        await interaction.reply({
          content:
            `✅ Managed nickname tags removed from ${targetMember}.\n` +
            `🏷️ Nickname: \`${truncateNickname(baseNickname)}\``,
          ephemeral: true,
        });

        return;
      }

      // ------------------------------------------------
      // /nickname reset
      // ------------------------------------------------

      if (subcommand === "reset") {
        if (!targetMember.manageable) {
          await interaction.reply({
            content:
              "❌ I cannot manage this member's nickname. Check the bot role hierarchy.",
            ephemeral: true,
          });

          return;
        }

        const me =
          interaction.guild.members.me;

        if (
          !me ||
          !me.permissions.has(
            PermissionsBitField.Flags.ManageNicknames
          )
        ) {
          await interaction.reply({
            content:
              "❌ I need Manage Nicknames permission.",
            ephemeral: true,
          });

          return;
        }

        botNicknameChanges.set(
          targetMember.id,
          targetMember.user.username
        );

        await targetMember.setNickname(null, "Staff nickname reset");
        
        setTimeout(() => {
          botNicknameChanges.delete(
            targetMember.id
          );
        }, 5000);

        await interaction.reply({
          content:
            `✅ Nickname reset for ${targetMember}.\n` +
            `🏷️ Discord username: \`${targetMember.user.username}\``,
          ephemeral: true,
        });

        return;
      }
    }

    // ==================================================
    // ROLE COMMAND
    // ==================================================

    if (interaction.commandName === "role") {
      const subcommand =
        interaction.options.getSubcommand();

      const targetUser =
        interaction.options.getUser(
          "member"
        );

      const role =
        interaction.options.getRole(
          "role"
        );

      // ------------------------------------------------
      // /role info
      // ------------------------------------------------

      if (subcommand === "info") {
        const targetMember =
          await interaction.guild.members.fetch(
            targetUser.id
          );

        const managedRoles = [
          {
            name: "🎭 Lampoon",
            id: LAMPOON_ROLE_ID,
          },
          {
            name: "🎮 Content Creator",
            id: CONTENT_CREATOR_ROLE_ID,
          },
          {
            name: "🏷️ LMP Supporter",
            id: LMP_SUPPORTER_ROLE_ID,
          },
          {
            name: "🤝 Partnership",
            id: PARTNERSHIP_ROLE_ID,
          },
          {
            name: "🤝 Collaborator",
            id: COLLABORATOR_ROLE_ID,
          },
          {
            name: "💰 Sponsor",
            id: SPONSOR_ROLE_ID,
          },
          {
            name: "🎭 Satirical CC",
            id: SATIRICAL_CC_ROLE_ID,
          },
          {
            name: "♂️ Male",
            id: MALE_ROLE_ID,
          },
          {
            name: "♀️ Female",
            id: FEMALE_ROLE_ID,
          },
          {
            name: "🏳️‍🌈 LGBT+",
            id: LGBT_ROLE_ID,
          },
          {
            name: "🔒 Prefer not to say",
            id: PREFER_NOT_TO_SAY_ROLE_ID,
          },
        ].filter((item) => item.id);

        const lines =
          managedRoles.map((item) => {
            const has =
              targetMember.roles.cache.has(
                item.id
              );

            return `${has ? "✅" : "❌"} ${item.name}`;
          });

        await interaction.reply({
          content:
            `### 🎭 Roles for ${targetMember}\n\n` +
            lines.join("\n"),
          ephemeral: true,
        });

        return;
      }

      // ------------------------------------------------
      // Validate role
      // ------------------------------------------------

      if (!role) {
        await interaction.reply({
          content:
            "❌ Please select a role.",
          ephemeral: true,
        });

        return;
      }

      const targetMember =
        await interaction.guild.members.fetch(
          targetUser.id
        );

      const botMember =
        interaction.guild.members.me;

      if (!botMember) {
        await interaction.reply({
          content:
            "❌ I could not find my bot member.",
          ephemeral: true,
        });

        return;
      }

      if (
        !botMember.permissions.has(
          PermissionsBitField.Flags.ManageRoles
        )
      ) {
        await interaction.reply({
          content:
            "❌ I need Manage Roles permission.",
          ephemeral: true,
        });

        return;
      }

      if (
        role.managed
      ) {
        await interaction.reply({
          content:
            "❌ Discord-managed roles cannot be manually managed by the bot.",
          ephemeral: true,
        });

        return;
      }

      if (
        role.position >=
        botMember.roles.highest.position
      ) {
        await interaction.reply({
          content:
            "❌ My highest role must be above the role I am trying to manage.",
          ephemeral: true,
        });

        return;
      }

      // ------------------------------------------------
      // /role add
      // ------------------------------------------------

      if (subcommand === "add") {
        if (
          targetMember.roles.cache.has(
            role.id
          )
        ) {
          await interaction.reply({
            content:
              `ℹ️ ${targetMember} already has ${role}.`,
            ephemeral: true,
          });

          return;
        }

        await targetMember.roles.add(
          role,
          `Staff /role add by ${interaction.user.tag}`
        );

        await syncMemberNickname(
          targetMember
        );

        await interaction.reply({
          content:
            `✅ Added ${role} to ${targetMember}.\n` +
            "🏷️ Nickname synchronized.",
          ephemeral: true,
        });

        return;
      }

      // ------------------------------------------------
      // /role remove
      // ------------------------------------------------

      if (subcommand === "remove") {
        if (
          !targetMember.roles.cache.has(
            role.id
          )
        ) {
          await interaction.reply({
            content:
              `ℹ️ ${targetMember} does not have ${role}.`,
            ephemeral: true,
          });

          return;
        }

        await targetMember.roles.remove(
          role,
          `Staff /role remove by ${interaction.user.tag}`
        );

        const refreshedMember =
          await interaction.guild.members.fetch(
            targetMember.id
          );

        await syncMemberNickname(
          refreshedMember
        );

        await interaction.reply({
          content:
            `✅ Removed ${role} from ${refreshedMember}.\n` +
            "🏷️ Nickname synchronized.",
          ephemeral: true,
        });

        return;
      }
    }
  } catch (error) {
    console.error(
      "❌ Slash command error:",
      error
    );

    if (
      !interaction.replied &&
      !interaction.deferred
    ) {
      await interaction.reply({
        content:
          "❌ Something went wrong while executing the command.",
        ephemeral: true,
      }).catch(() => {});
    }
  }
});

// ======================================================
// BUTTON INTERACTIONS
// ======================================================

client.on("interactionCreate", async (interaction) => {
  try {
    
    // ==================================================
    // REQUEST NICKNAME BUTTON
    // ==================================================

    if (
      interaction.isButton() &&
      interaction.customId === NICKNAME_BUTTON_ID
    ) {
      const modal = new ModalBuilder()
        .setCustomId(NICKNAME_MODAL_ID)
        .setTitle("🏷️ Request Nickname");

      const nicknameInput =
        new TextInputBuilder()
          .setCustomId(NICKNAME_INPUT_ID)
          .setLabel("Server Nickname")
          .setPlaceholder("Example: Mikasa")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(32);

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          nicknameInput
        )
      );

      await interaction.showModal(modal);

      return;
    }

    // ==================================================
    // REQUEST GENDER BUTTON
    // ==================================================

    if (
      interaction.isButton() &&
      interaction.customId === GENDER_BUTTON_ID
    ) {
      await interaction.reply({
        content:
          "🔐 **Big Sister House — Gender Access**\n\n" +
          "Please choose the gender category that applies to you.\n" +
          "Your request will be reviewed by Registration Staff.",
        components: [createGenderSelectRow()],
        ephemeral: true,
      });

      return;
    }

    // ==================================================
    // STAFF ACCEPT
    // ==================================================

    if (
      interaction.isButton() &&
      interaction.customId.startsWith(
        `${APPROVE_PREFIX}:`
      )
    ) {
      await handleStaffDecision(
        interaction,
        true
      );

      return;
    }

    // ==================================================
    // STAFF REJECT
    // ==================================================

    if (
      interaction.isButton() &&
      interaction.customId.startsWith(
        `${REJECT_PREFIX}:`
      )
    ) {
      await handleStaffDecision(
        interaction,
        false
      );

      return;
    }
  } catch (error) {
    console.error(
      "❌ Button interaction error:",
      error
    );

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content:
          "❌ Something went wrong while processing this request.",
        ephemeral: true,
      });
    }
  }
});

// ======================================================
// NICKNAME MODAL SUBMISSION
// ======================================================

client.on("interactionCreate", async (interaction) => {
  if (
    !interaction.isModalSubmit() ||
    interaction.customId !== NICKNAME_MODAL_ID
  ) {
    return;
  }

  try {
    const requestedNickname =
      cleanText(
        interaction.fields.getTextInputValue(
          NICKNAME_INPUT_ID
        )
      );

    if (!requestedNickname) {
      await interaction.reply({
        content:
          "❌ Please enter a nickname.",
        ephemeral: true,
      });

      return;
    }

    const member =
      await interaction.guild.members.fetch(
        interaction.user.id
      );

    originalNames.set(
      member.id,
      member.user.username
    );

    await updateRegistration(
      member,
      {
        requestedNickname:
          requestedNickname,
      }
    );

    const registration =
      pendingRegistrations.get(member.id);

    if (
      registration &&
      registration.genderKey
    ) {
      await interaction.reply({
        content:
          "✅ **Nickname request submitted.**\n\n" +
          `🏷️ Requested nickname: \`${requestedNickname}\`\n\n` +
          "Your nickname and gender request have been combined into one staff registration log.",
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content:
          "✅ **Nickname request saved.**\n\n" +
          `🏷️ Requested nickname: \`${requestedNickname}\`\n\n` +
          "Please also submit your **Gender Access** request so Registration Staff can review the complete registration.",
        ephemeral: true,
      });
    }
  } catch (error) {
    console.error(
      "❌ Nickname modal error:",
      error
    );

    if (!interaction.replied) {
      await interaction.reply({
        content:
          "❌ Unable to submit your nickname request.",
        ephemeral: true,
      });
    }
  }
});

// ======================================================
// GENDER SELECT SUBMISSION
// ======================================================

client.on("interactionCreate", async (interaction) => {
  if (
    !interaction.isStringSelectMenu() ||
    interaction.customId !== GENDER_MENU_ID
  ) {
    return;
  }

  try {
    const genderKey =
      interaction.values[0];

    const genderData =
      GENDER_DATA[genderKey];

    if (!genderData) {
      await interaction.update({
        content:
          "❌ Invalid gender selection.",
        components: [],
      });

      return;
    }

    const member =
      await interaction.guild.members.fetch(
        interaction.user.id
      );

    originalNames.set(
      member.id,
      member.user.username
    );

    await updateRegistration(
      member,
      {
        genderKey: genderKey,
      }
    );

    const registration =
      pendingRegistrations.get(member.id);

    if (
      registration &&
      registration.requestedNickname
    ) {
      await interaction.update({
        content:
          "✅ **Gender Access request submitted.**\n\n" +
          `🎭 Selected: **${genderData.emoji} ${genderData.label}**\n\n` +
          "Your nickname and gender request have been combined into one staff registration log for review.",
        components: [],
      });
    } else {
      await interaction.update({
        content:
          "✅ **Gender Access request saved.**\n\n" +
          `🎭 Selected: **${genderData.emoji} ${genderData.label}**\n\n` +
          "Please also submit your **Nickname** request so Registration Staff can review the complete registration.",
        components: [],
      });
    }
  } catch (error) {
    console.error(
      "❌ Gender selection error:",
      error
    );

    if (!interaction.replied) {
      await interaction.update({
        content:
          "❌ Unable to submit your gender access request.",
        components: [],
      });
    }
  }
});

// ======================================================
// STAFF DECISION HANDLER
// ======================================================

async function handleStaffDecision(
  interaction,
  approved
) {
  const parts =
    interaction.customId.split(":");

  const userId = parts[1];

  if (!userId) {
    await interaction.reply({
      content:
        "❌ Invalid registration request.",
      ephemeral: true,
    });

    return;
  }

  // ----------------------------------------------------
  // Check staff role
  // ----------------------------------------------------

  const staffMember =
    await interaction.guild.members.fetch(
      interaction.user.id
    );

  if (
    !staffMember.roles.cache.has(
      STAFF_ROLE_ID
    )
  ) {
    await interaction.reply({
      content:
        "❌ You do not have permission to review Big Sister House registrations.",
      ephemeral: true,
    });

    return;
  }

  // ----------------------------------------------------
  // Retrieve applicant
  // ----------------------------------------------------

  let applicant;

  try {
    applicant =
      await interaction.guild.members.fetch(
        userId
      );
  } catch (error) {
    await interaction.reply({
      content:
        "❌ The applicant could not be found in this server.",
      ephemeral: true,
    });

    return;
  }

  const registration =
    pendingRegistrations.get(userId);

  if (!registration) {
    await interaction.reply({
      content:
        "❌ This registration is no longer available in the bot's active registration storage.",
      ephemeral: true,
    });

    return;
  }

  if (
    !registration.requestedNickname ||
    !registration.genderKey
  ) {
    await interaction.reply({
      content:
        "❌ This registration is incomplete. Both nickname and gender access must be submitted before approval.",
      ephemeral: true,
    });

    return;
  }

  // ----------------------------------------------------
  // REJECT
  // ----------------------------------------------------

  if (!approved) {
    const rejectedEmbed =
      new EmbedBuilder()
        .setColor("#ED4245")
        .setTitle(
          "📋 BIG SISTER HOUSE • REGISTRATION"
        )
        .addFields(
          {
            name: "👤 Applicant",
            value: `<@${applicant.id}>`,
            inline: false,
          },
          {
            name: "🏷️ Requested Nickname",
            value: `\`${registration.requestedNickname}\``,
            inline: true,
          },
          {
            name: "🎭 Gender",
            value: getGenderLabel(
              registration.genderKey
            ),
            inline: true,
          },
          {
            name: "📌 Status",
            value: "❌ **REJECTED**",
            inline: false,
          },
          {
            name: "👮 Reviewed By",
            value: `<@${interaction.user.id}>`,
            inline: true,
          },
          {
            name: "🎁 Role Granted",
            value: "None",
            inline: true,
          }
        )
        .setTimestamp();

    await interaction.update({
      content: `<@&${STAFF_ROLE_ID}>`,
      embeds: [rejectedEmbed],
      components: [
        createStaffDecisionRow(
          applicant.id,
          false
        ),
      ],
    });

    pendingRegistrations.delete(userId);

    return;
  }

  // ----------------------------------------------------
  // APPROVE
  // ----------------------------------------------------

  const genderRoleId =
    getGenderRoleId(
      registration.genderKey
    );

  if (!genderRoleId) {
    await interaction.reply({
      content:
        "❌ The selected gender role is not configured in Render environment variables.",
      ephemeral: true,
    });

    return;
  }

  const botMember =
    interaction.guild.members.me;

  if (!botMember) {
    await interaction.reply({
      content:
        "❌ I could not find my own bot member in the server.",
      ephemeral: true,
    });

    return;
  }

  // ----------------------------------------------------
  // Permission check
  // ----------------------------------------------------

  if (
    !botMember.permissions.has(
      PermissionsBitField.Flags.ManageRoles
    )
  ) {
    await interaction.reply({
      content:
        "❌ I need **Manage Roles** permission to approve this registration.",
      ephemeral: true,
    });

    return;
  }

  if (
    !botMember.permissions.has(
      PermissionsBitField.Flags.ManageNicknames
    )
  ) {
    await interaction.reply({
      content:
        "❌ I need **Manage Nicknames** permission to approve this registration.",
      ephemeral: true,
    });

    return;
  }

  const genderRole =
    interaction.guild.roles.cache.get(
      genderRoleId
    );

  if (!genderRole) {
    await interaction.reply({
      content:
        "❌ The configured gender role could not be found.",
      ephemeral: true,
    });

    return;
  }

  if (
    botMember.roles.highest.comparePositionTo(
      genderRole
    ) <= 0
  ) {
    await interaction.reply({
      content:
        "❌ My highest role must be above the gender role I need to assign.",
      ephemeral: true,
    });

    return;
  }

  if (!applicant.manageable) {
    await interaction.reply({
      content:
        "❌ I cannot manage this member's nickname. Move my bot role above the member's highest role.",
      ephemeral: true,
    });

    return;
  }

  try {
    // --------------------------------------------------
    // Remove old gender roles
    // --------------------------------------------------

    const genderRoleIds = [
      MALE_ROLE_ID,
      FEMALE_ROLE_ID,
      LGBT_ROLE_ID,
      PREFER_NOT_TO_SAY_ROLE_ID,
    ].filter(Boolean);

    for (const oldRoleId of genderRoleIds) {
      if (
        oldRoleId !== genderRoleId &&
        applicant.roles.cache.has(oldRoleId)
      ) {
        try {
          await applicant.roles.remove(
            oldRoleId,
            "Big Sister House registration approval"
          );
        } catch (error) {
          console.error(
            `⚠️ Could not remove old gender role ${oldRoleId}:`,
            error
          );
        }
      }
    }

    // --------------------------------------------------
    // Add selected gender role
    // --------------------------------------------------

    await applicant.roles.add(
      genderRoleId,
      "Big Sister House registration approval"
    );

    // --------------------------------------------------
    // Save original identity
    // --------------------------------------------------

    originalNames.set(
      applicant.id,
      applicant.user.username
    );

    // --------------------------------------------------
    // Apply requested nickname
    // --------------------------------------------------

    await setManagedNickname(
      applicant,
      registration.requestedNickname
    );

    const updatedApplicant =
      await interaction.guild.members.fetch(
        applicant.id
      );

    const approvedNickname =
      updatedApplicant.nickname ||
      registration.requestedNickname;

    // --------------------------------------------------
    // Update staff log
    // --------------------------------------------------

    const approvedEmbed =
      new EmbedBuilder()
        .setColor("#57F287")
        .setTitle(
          "📋 BIG SISTER HOUSE • REGISTRATION"
        )
        .addFields(
          {
            name: "👤 Applicant",
            value: `<@${applicant.id}>`,
            inline: false,
          },
          {
            name: "🏷️ Requested Nickname",
            value: `\`${registration.requestedNickname}\``,
            inline: true,
          },
          {
            name: "🎭 Gender",
            value: getGenderLabel(
              registration.genderKey
            ),
            inline: true,
          },
          {
            name: "📌 Status",
            value: "✅ **APPROVED**",
            inline: false,
          },
          {
            name: "👮 Reviewed By",
            value: `<@${interaction.user.id}>`,
            inline: true,
          },
          {
            name: "🎁 Role Granted",
            value: `<@&${genderRoleId}>`,
            inline: true,
          },
          {
            name: "🏷️ Nickname Updated",
            value: `\`${approvedNickname}\``,
            inline: false,
          }
        )
        .setTimestamp();

    await interaction.update({
      content: `<@&${STAFF_ROLE_ID}>`,
      embeds: [approvedEmbed],
      components: [
        createStaffDecisionRow(
          applicant.id,
          false
        ),
      ],
    });

    pendingRegistrations.delete(userId);

    // --------------------------------------------------
    // DM applicant if possible
    // --------------------------------------------------

    try {
      await applicant.send(
        [
          "🏠 **Big Sister House Registration**",
          "",
          "✅ Your registration has been **approved**.",
          "",
          `🎭 Gender Role: **${getGenderLabel(
            registration.genderKey
          )}**`,
          `🏷️ Server Nickname: \`${approvedNickname}\``,
          "",
          "Welcome to the Big Sister House.",
        ].join("\n")
      );
    } catch (error) {
      console.log(
        `ℹ️ Could not DM ${applicant.user.tag}.`
      );
    }
  } catch (error) {
    console.error(
      "❌ Registration approval failed:",
      error
    );

    if (!interaction.replied) {
      await interaction.reply({
        content:
          "❌ Registration approval failed. Check the bot's role hierarchy and permissions.",
        ephemeral: true,
      });
    }
  }
}

// ======================================================
// MEMBER ROLE / NICKNAME CHANGES
// ======================================================

client.on(
  "guildMemberUpdate",
  async (oldMember, newMember) => {
    try {
      if (newMember.user.bot) {
        return;
      }

      // ------------------------------------------------
      // Detect bot's own nickname change
      // ------------------------------------------------

      const expectedBotNickname =
        botNicknameChanges.get(
          newMember.id
        );

      if (
        expectedBotNickname &&
        newMember.nickname === expectedBotNickname
      ) {
        botNicknameChanges.delete(
          newMember.id
        );

        return;
      }

      // ------------------------------------------------
      // Detect manual nickname change
      // ------------------------------------------------

      const nicknameChanged =
        oldMember.nickname !==
        newMember.nickname;

      // ------------------------------------------------
      // Detect role change
      // ------------------------------------------------

      const rolesChanged =
        oldMember.roles.cache.size !==
          newMember.roles.cache.size ||
        oldMember.roles.cache.some(
          (role) =>
            !newMember.roles.cache.has(
              role.id
            )
        ) ||
        newMember.roles.cache.some(
          (role) =>
            !oldMember.roles.cache.has(
              role.id
            )
        );

      if (!nicknameChanged && !rolesChanged) {
        return;
      }

      let baseNickname;

      if (nicknameChanged) {
        // If someone manually removes the guild nickname,
        // restore the original Discord username as base.
        if (!newMember.nickname) {
          baseNickname =
            newMember.user.username;
        } else {
          // Otherwise, preserve the manually selected
          // nickname as the new base and only manage tags.
          baseNickname =
            stripManagedNicknameTags(
              newMember.nickname
            );

          if (!baseNickname) {
            baseNickname =
              newMember.user.username;
          }
        }
      } else {
        // Role changed but nickname did not.
        // Recover the existing base from the current nickname.
        baseNickname =
          getBaseNickname(newMember);
      }

      originalNames.set(
        newMember.id,
        newMember.user.username
      );

      await syncMemberNickname(
        newMember,
        baseNickname
      );
    } catch (error) {
      console.error(
        "❌ guildMemberUpdate error:",
        error
      );
    }
  }
);

// ======================================================
// MEMBER JOIN
// ======================================================

client.on(
  "guildMemberAdd",
  async (member) => {
    try {
      if (member.user.bot) {
        return;
      }

      originalNames.set(
        member.id,
        member.user.username
      );

      // On rejoin, original Discord username is the base.
      // Existing roles, if present, are reflected in tags.
      await syncMemberNickname(
        member,
        member.user.username
      );

      console.log(
        `👋 Member joined: ${member.user.tag}`
      );
    } catch (error) {
      console.error(
        "❌ guildMemberAdd error:",
        error
      );
    }
  }
);

// ======================================================
// LOGIN
// ======================================================

client
  .login(DISCORD_TOKEN)
  .catch((error) => {
    console.error(
      "❌ Discord login failed:",
      error
    );
    process.exit(1);
  });
