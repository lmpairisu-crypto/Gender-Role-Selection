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
} = require("discord.js");

// ============================================================
// RENDER HEALTH SERVER
// ============================================================

const app = express();

const PORT = process.env.PORT || 10000;

app.get("/", (req, res) => {
  res.status(200).send("Gender Registration Bot is online!");
});

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🌐 Health server running on port ${PORT}`);
});

// ============================================================
// ENVIRONMENT VARIABLES
// ============================================================

const TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID;
const STAFF_ROLE_ID = process.env.STAFF_ROLE_ID;

const ROLE_IDS = {
  male: process.env.MALE_ROLE_ID,
  female: process.env.FEMALE_ROLE_ID,
  lgbt: process.env.LGBT_ROLE_ID,
  prefer_not_to_say: process.env.PREFER_NOT_TO_SAY_ROLE_ID,
};

// ============================================================
// IMAGES
// ============================================================

const PICTURE_URL = process.env.PICTURE_URL || "";
const DOG_GIF_URL = process.env.DOG_GIF_URL || "";
const HOUSE_IMAGE_URL = process.env.HOUSE_IMAGE_URL || "";

// ============================================================
// CONFIG CHECK
// ============================================================

console.log("======================================");
console.log("🔧 GENDER REGISTRATION BOT");
console.log("======================================");

console.log(
  `DISCORD_TOKEN: ${TOKEN ? "✅ SET" : "❌ MISSING"}`
);

console.log(
  `CHANNEL_ID: ${CHANNEL_ID ? "✅ SET" : "❌ MISSING"}`
);

console.log(
  `LOG_CHANNEL_ID: ${LOG_CHANNEL_ID ? "✅ SET" : "❌ MISSING"}`
);

console.log(
  `STAFF_ROLE_ID: ${STAFF_ROLE_ID ? "✅ SET" : "❌ MISSING"}`
);

console.log(
  `MALE_ROLE_ID: ${ROLE_IDS.male ? "✅ SET" : "❌ MISSING"}`
);

console.log(
  `FEMALE_ROLE_ID: ${ROLE_IDS.female ? "✅ SET" : "❌ MISSING"}`
);

console.log(
  `LGBT_ROLE_ID: ${ROLE_IDS.lgbt ? "✅ SET" : "❌ MISSING"}`
);

console.log(
  `PREFER_NOT_TO_SAY_ROLE_ID: ${
    ROLE_IDS.prefer_not_to_say
      ? "✅ SET"
      : "❌ MISSING"
  }`
);

console.log(
  `PICTURE_URL: ${PICTURE_URL ? "✅ SET" : "⚠️ NOT SET"}`
);

console.log(
  `DOG_GIF_URL: ${DOG_GIF_URL ? "✅ SET" : "⚠️ NOT SET"}`
);

console.log(
  `HOUSE_IMAGE_URL: ${
    HOUSE_IMAGE_URL ? "✅ SET" : "⚠️ NOT SET"
  }`
);

console.log("======================================");

if (!TOKEN) {
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

// ============================================================
// DISCORD CLIENT
// ============================================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ],
});

// ============================================================
// CUSTOM IDS
// ============================================================

const START_BUTTON_ID =
  "start_gender_registration";

const MODAL_ID =
  "gender_registration_modal";

const GENDER_MENU_ID =
  "gender_registration_selection";

const APPROVE_PREFIX =
  "registration_approve";

const REJECT_PREFIX =
  "registration_reject";

// ============================================================
// TEMPORARY REGISTRATION STORAGE
// ============================================================

const registrationNames = new Map();

// ============================================================
// ESCAPE MARKDOWN
// ============================================================

function escapeMarkdown(text) {
  return String(text || "")
    .replace(/\\/g, "\\\\")
    .replace(/\*/g, "\\*")
    .replace(/_/g, "\\_")
    .replace(/~/g, "\\~")
    .replace(/`/g, "\\`");
}

// ============================================================
// GENDER LABELS
// ============================================================

const genderLabels = {
  male: "♂️ Male",
  female: "♀️ Female",
  lgbt: "🏳️‍🌈 LGBT+",
  prefer_not_to_say: "🔒 Prefer not to say",
};

// ============================================================
// MAIN EMBED
// ============================================================

function createMainEmbed() {
  return new EmbedBuilder()
    .setColor("#5865F2")
    .setAuthor({
      name: "Pinoy Big Sister",
      iconURL: PICTURE_URL || undefined,
    })
    .setTitle("🏠 Private House Access")
    .setDescription(
      [
        "Welcome to the **Private House Access Registration**.",
        "",
        "Complete the short registration form to request access to your appropriate **Room/House**.",
        "",
        "🔐 **PRIVATE REGISTRATION**",
        "Your submitted information will be sent directly to the registration staff for review.",
        "",
        "📋 **QUESTIONS**",
        "• Your true / preferred name",
        "• Select your gender",
        "",
        "🎭 **GENDER OPTIONS**",
        "♂️ Male",
        "♀️ Female",
        "🏳️‍🌈 LGBT+",
        "🔒 Prefer not to say",
        "",
        "👮 **STAFF REVIEW**",
        "Your selected gender determines which role will be given **if your registration is approved by staff**.",
}

// ============================================================
// HOUSE GUARD EMBED
// ============================================================

function createHouseGuardEmbed() {
  return new EmbedBuilder()
    .setColor("#5865F2")
    .setTitle("🐕 HOUSE GUARD")
    .setDescription(
      [
        "🚨 **Beware of the Barking Dogs!**",
        "",
        "🐕 The House Guards are watching the outside of the house.",
        "",
        "🔊 Unauthorized attempts to enter restricted areas may attract the attention of the House Guards.",
        "",
        "🚪 Please respect the house boundaries.", 
}

// ============================================================
// HOUSE IMAGE EMBED
// ============================================================

function createGenderAccessEmbed() {
  const embed = new EmbedBuilder()
    .setColor("#5865F2")
    .setTitle("🏠 GENDER-BASED ACCESS")
    .setDescription(
      [
        "Your approved gender role determines which private **Room/House** you can access.",
        "",
        "🔐 The appropriate role will only be granted after a staff member reviews and approves your registration.",
        "",
        "🏠 Please remain in your assigned **Room/House** and respect the access boundaries.",
      ].join("\n")
    )
    .setFooter({
      text: "Pinoy Big Sister • Private House Access",
    })
    .setTimestamp();

  if (HOUSE_IMAGE_URL) {
    embed.setImage(HOUSE_IMAGE_URL);
  }

  return embed;
}

// ============================================================
// START BUTTON
// ============================================================

function createStartButton() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(START_BUTTON_ID)
      .setLabel("Start Registration")
      .setEmoji("🔐")
      .setStyle(ButtonStyle.Primary)
  );
}

// ============================================================
// REGISTRATION MODAL
// ============================================================

function createRegistrationModal() {
  const nameInput = new TextInputBuilder()
    .setCustomId("true_name")
    .setLabel("True / Preferred Name")
    .setPlaceholder("Enter your name")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMinLength(1)
    .setMaxLength(100);

  return new ModalBuilder()
    .setCustomId(MODAL_ID)
    .setTitle("Private House Registration")
    .addComponents(
      new ActionRowBuilder().addComponents(
        nameInput
      )
    );
}

// ============================================================
// GENDER SELECT MENU
// ============================================================

function createGenderSelectMenu() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(GENDER_MENU_ID)
      .setPlaceholder("Select your gender")
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions(
        {
          label: "Male",
          description: "Select Male",
          value: "male",
          emoji: "♂️",
        },
        {
          label: "Female",
          description: "Select Female",
          value: "female",
          emoji: "♀️",
        },
        {
          label: "LGBT+",
          description: "Select LGBT+",
          value: "lgbt",
          emoji: "🏳️‍🌈",
        },
        {
          label: "Prefer not to say",
          description: "Choose not to disclose your gender",
          value: "prefer_not_to_say",
          emoji: "🔒",
        }
      )
  );
}

// ============================================================
// STAFF BUTTONS
// ============================================================

function createStaffButtons(userId, gender) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(
        `${APPROVE_PREFIX}:${userId}:${gender}`
      )
      .setLabel("Accept")
      .setEmoji("✅")
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId(
        `${REJECT_PREFIX}:${userId}:${gender}`
      )
      .setLabel("Reject")
      .setEmoji("❌")
      .setStyle(ButtonStyle.Danger)
  );
}

// ============================================================
// DISABLED DECISION BUTTON
// ============================================================

function createDecisionButtons(decision) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("registration_decision")
      .setLabel(
        decision === "APPROVED"
          ? "Accepted"
          : "Rejected"
      )
      .setEmoji(
        decision === "APPROVED"
          ? "✅"
          : "❌"
      )
      .setStyle(
        decision === "APPROVED"
          ? ButtonStyle.Success
          : ButtonStyle.Danger
      )
      .setDisabled(true)
  );
}

// ============================================================
// GET ROLE
// ============================================================

function getGenderRole(guild, gender) {
  const roleId = ROLE_IDS[gender];

  if (!roleId) {
    return null;
  }

  return guild.roles.cache.get(roleId) || null;
}

// ============================================================
// SEND REGISTRATION TO LOG
// ============================================================

async function sendRegistrationToLog({
  interaction,
  trueName,
  gender,
}) {
  const logChannel =
    await client.channels.fetch(
      LOG_CHANNEL_ID
    );

  if (
    !logChannel ||
    !logChannel.isTextBased()
  ) {
    throw new Error(
      "LOG_CHANNEL_ID is not a text channel."
    );
  }

  const embed = new EmbedBuilder()
    .setColor("#FEE75C")
    .setAuthor({
      name: "Pinoy Big Sister",
      iconURL: PICTURE_URL || undefined,
    })
    .setTitle(
      "📋 New Gender Registration"
    )
    .setDescription(
      [
        "A member has submitted a new registration.",
        "",
        "👮 **Staff Review Required**",
        "Please review the information below and choose **Accept** or **Reject**.",
      ].join("\n")
    )
    .addFields(
      {
        name: "👤 Applicant",
        value:
          `${interaction.user}\n\`${interaction.user.tag}\`\n\`${interaction.user.id}\``,
        inline: false,
      },
      {
        name: "📝 True / Preferred Name",
        value:
          escapeMarkdown(trueName).slice(
            0,
            1024
          ),
        inline: false,
      },
      {
        name: "🎭 Selected Gender",
        value:
          genderLabels[gender] ||
          "Unknown",
        inline: true,
      },
      {
        name: "📝 Status",
        value: "⏳ **PENDING**",
        inline: true,
      }
    )
    .setFooter({
      text:
        "Gender Registration • Staff Review",
    })
    .setTimestamp();

  return await logChannel.send({
    content:
      `<@&${STAFF_ROLE_ID}>`,
    embeds: [embed],
    components: [
      createStaffButtons(
        interaction.user.id,
        gender
      ),
    ],
  });
}

// ============================================================
// READY
// ============================================================

client.once("ready", async () => {
  console.log(
    "======================================"
  );

  console.log(
    "🚀 GENDER REGISTRATION BOT STARTED"
  );

  console.log(
    "======================================"
  );

  console.log(
    `🤖 Logged in as: ${client.user.tag}`
  );

  console.log(
    `🆔 Bot ID: ${client.user.id}`
  );

  console.log(
    `🏠 Servers: ${client.guilds.cache.size}`
  );

  await sendRegistrationPanel();
});

// ============================================================
// SEND MAIN PANEL
// ============================================================

async function sendRegistrationPanel() {
  try {
    const channel =
      await client.channels.fetch(
        CHANNEL_ID
      );

    if (
      !channel ||
      !channel.isTextBased()
    ) {
      console.error(
        "❌ CHANNEL_ID is not a text channel."
      );

      return;
    }

    await channel.send({
      embeds: [
        createMainEmbed(),
        createHouseGuardEmbed(),
        createHouseImageEmbed(),
      ],
      components: [
        createStartButton(),
      ],
    });

    console.log(
      "✅ Registration panel sent."
    );

  } catch (error) {
    console.error(
      "❌ Failed to send registration panel:"
    );

    console.error(error);
  }
}

// ============================================================
// INTERACTIONS
// ============================================================

client.on(
  "interactionCreate",
  async (interaction) => {

    // ========================================================
    // START REGISTRATION
    // ========================================================

    if (
      interaction.isButton() &&
      interaction.customId ===
        START_BUTTON_ID
    ) {
      try {
        await interaction.showModal(
          createRegistrationModal()
        );
      } catch (error) {
        console.error(
          "❌ Could not open registration modal:",
          error
        );
      }

      return;
    }

    // ========================================================
    // MODAL SUBMISSION
    // ========================================================

    if (
      interaction.isModalSubmit() &&
      interaction.customId ===
        MODAL_ID
    ) {
      try {
        const trueName =
          interaction.fields
            .getTextInputValue(
              "true_name"
            )
            .trim();

        if (!trueName) {
          await interaction.reply({
            content:
              "❌ Please enter your name.",
            ephemeral: true,
          });

          return;
        }

        registrationNames.set(
          interaction.user.id,
          {
            trueName,
            createdAt: Date.now(),
          }
        );

        await interaction.reply({
          content:
            "### 🎭 Select Your Gender\n\nChoose the gender you are registering under:",
          components: [
            createGenderSelectMenu(),
          ],
          ephemeral: true,
        });

      } catch (error) {
        console.error(
          "❌ Modal submission failed:",
          error
        );

        if (
          !interaction.replied &&
          !interaction.deferred
        ) {
          await interaction.reply({
            content:
              "❌ Something went wrong.",
            ephemeral: true,
          }).catch(() => {});
        }
      }

      return;
    }

    // ========================================================
    // GENDER SELECTION
    // ========================================================

    if (
      interaction.isStringSelectMenu() &&
      interaction.customId ===
        GENDER_MENU_ID
    ) {
      try {
        const gender =
          interaction.values[0];

        const stored =
          registrationNames.get(
            interaction.user.id
          );

        if (!stored) {
          await interaction.update({
            content:
              "❌ Your registration session expired. Please start again.",
            components: [],
          });

          return;
        }

        const trueName =
          stored.trueName;

        await sendRegistrationToLog({
          interaction,
          trueName,
          gender,
        });

        registrationNames.delete(
          interaction.user.id
        );

        await interaction.update({
          content:
            [
              "✅ **Registration Submitted!**",
              "",
              `📝 Name: **${trueName}**`,
              `🎭 Gender: **${genderLabels[gender]}**`,
              "",
              "Your registration has been sent to the registration staff.",
              "",
              "⏳ Please wait for staff to accept or reject your registration.",
            ].join("\n"),
          components: [],
        });

        console.log(
          `📥 ${interaction.user.tag} submitted ${gender} registration.`
        );

      } catch (error) {
        console.error(
          "❌ Gender selection failed:",
          error
        );

        await interaction.update({
          content:
            "❌ Something went wrong while submitting your registration.",
          components: [],
        }).catch(() => {});
      }

      return;
    }

    // ========================================================
    // STAFF ACCEPT / REJECT
    // ========================================================

    if (
      interaction.isButton() &&
      (
        interaction.customId.startsWith(
          `${APPROVE_PREFIX}:`
        ) ||
        interaction.customId.startsWith(
          `${REJECT_PREFIX}:`
        )
      )
    ) {
      try {
        if (!interaction.guild) {
          return;
        }

        // ----------------------------------------------------
        // STAFF PERMISSION
        // ----------------------------------------------------

        if (
          !interaction.member.roles.cache.has(
            STAFF_ROLE_ID
          )
        ) {
          await interaction.reply({
            content:
              "❌ You do not have permission to review registration requests.",
            ephemeral: true,
          });

          return;
        }

        // ----------------------------------------------------
        // PARSE BUTTON
        // ----------------------------------------------------

        const parts =
          interaction.customId.split(":");

        const applicantId = parts[1];
        const gender = parts[2];

        if (!applicantId || !gender) {
          await interaction.reply({
            content:
              "❌ Registration information is missing.",
            ephemeral: true,
          });

          return;
        }

        // ----------------------------------------------------
        // FETCH MEMBER
        // ----------------------------------------------------

        let applicant;

        try {
          applicant =
            await interaction.guild.members.fetch(
              applicantId
            );
        } catch {
          await interaction.reply({
            content:
              "❌ This member is no longer in the server.",
            ephemeral: true,
          });

          return;
        }

        // ----------------------------------------------------
        // READ EMBED
        // ----------------------------------------------------

        const oldEmbed =
          interaction.message.embeds[0];

        if (!oldEmbed) {
          await interaction.reply({
            content:
              "❌ Registration information could not be found.",
            ephemeral: true,
          });

          return;
        }

        // ====================================================
        // ACCEPT
        // ====================================================

        if (
          interaction.customId.startsWith(
            `${APPROVE_PREFIX}:`
          )
        ) {

          const role =
            getGenderRole(
              interaction.guild,
              gender
            );

          if (!role) {
            await interaction.reply({
              content:
                `❌ The role for ${genderLabels[gender] || gender} is not configured. Add the correct role ID in Render.`,
              ephemeral: true,
            });

            return;
          }

          // --------------------------------------------------
          // BOT ROLE HIERARCHY
          // --------------------------------------------------

          const botMember =
            interaction.guild.members.me ||
            await interaction.guild.members.fetchMe();

          if (
            role.position >=
            botMember.roles.highest.position
          ) {
            await interaction.reply({
              content:
                `❌ I cannot give ${role}. Move the role below the bot's highest role.`,
              ephemeral: true,
            });

            return;
          }

          // --------------------------------------------------
          // ADD ROLE
          // --------------------------------------------------

          try {
            await applicant.roles.add(
              role,
              `Gender registration accepted by ${interaction.user.tag}`
            );
          } catch (error) {
            console.error(
              "❌ Failed to give role:",
              error
            );

            await interaction.reply({
              content:
                "❌ I could not give the role. Check Manage Roles and role hierarchy.",
              ephemeral: true,
            });

            return;
          }

          // --------------------------------------------------
          // UPDATE LOG
          // --------------------------------------------------

          const approvedEmbed =
            EmbedBuilder.from(
              oldEmbed
            )
              .setColor("#57F287")
              .setTitle(
                "📋 Gender Registration — ACCEPTED"
              );

          const statusIndex =
            approvedEmbed.data.fields.findIndex(
              (field) =>
                field.name ===
                "📝 Status"
            );

          if (
            statusIndex !== -1
          ) {
            approvedEmbed.spliceFields(
              statusIndex,
              1,
              {
                name:
                  "📝 Status",
                value:
                  "✅ **ACCEPTED**",
                inline: true,
              }
            );
          }

          approvedEmbed
            .addFields(
              {
                name:
                  "👮 Reviewed By",
                value:
                  `${interaction.user}\n\`${interaction.user.id}\``,
                inline: true,
              },
              {
                name:
                  "🎭 Role Granted",
                value:
                  `${role}`,
                inline: true,
              }
            )
            .setTimestamp();

          await interaction.update({
            content:
              `<@&${STAFF_ROLE_ID}>`,
            embeds: [
              approvedEmbed,
            ],
            components: [
              createDecisionButtons(
                "APPROVED"
              ),
            ],
          });

          console.log(
            `✅ ACCEPTED: ${applicant.user.tag} → ${role.name}`
          );

          return;
        }

        // ====================================================
        // REJECT
        // ====================================================

        if (
          interaction.customId.startsWith(
            `${REJECT_PREFIX}:`
          )
        ) {

          const rejectedEmbed =
            EmbedBuilder.from(
              oldEmbed
            )
              .setColor("#ED4245")
              .setTitle(
                "📋 Gender Registration — REJECTED"
              );

          const statusIndex =
            rejectedEmbed.data.fields.findIndex(
              (field) =>
                field.name ===
                "📝 Status"
            );

          if (
            statusIndex !== -1
          ) {
            rejectedEmbed.spliceFields(
              statusIndex,
              1,
              {
                name:
                  "📝 Status",
                value:
                  "❌ **REJECTED**",
                inline: true,
              }
            );
          }

          rejectedEmbed
            .addFields(
              {
                name:
                  "👮 Reviewed By",
                value:
                  `${interaction.user}\n\`${interaction.user.id}\``,
                inline: true,
              },
              {
                name:
                  "🎭 Role Granted",
                value:
                  "None",
                inline: true,
              }
            )
            .setTimestamp();

          await interaction.update({
            content:
              `<@&${STAFF_ROLE_ID}>`,
            embeds: [
              rejectedEmbed,
            ],
            components: [
              createDecisionButtons(
                "REJECTED"
              ),
            ],
          });

          console.log(
            `❌ REJECTED: ${applicant.user.tag}`
          );

          return;
        }

      } catch (error) {

        console.error(
          "❌ Staff action failed:"
        );

        console.error(error);

        if (
          !interaction.replied &&
          !interaction.deferred
        ) {
          await interaction.reply({
            content:
              "❌ An error occurred while processing this registration.",
            ephemeral: true,
          }).catch(() => {});
        }
      }

      return;
    }
  }
);

// ============================================================
// LOGIN
// ============================================================

client
  .login(TOKEN)
  .catch((error) => {
    console.error(
      "❌ Discord login failed:"
    );

    console.error(error);
  });
