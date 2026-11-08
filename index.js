
const {
  Client,
  GatewayIntentBits,
  ChannelType,
  PermissionsBitField,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  SlashCommandBuilder,
  REST,
  Routes
} = require("discord.js");

const fs = require("fs");
const path = require("path");

// =====================================
// MAIN APPLICATIONS
// =====================================

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const PANEL_CHANNEL_ID = process.env.PANEL_CHANNEL_ID;
const APPLICATIONS_CHANNEL_ID = process.env.APPLICATIONS_CHANNEL_ID;
const STAFF_ROLE_ID = process.env.STAFF_ROLE_ID || "";

const COLOR = 0xFFFFFF;
const DATA_FILE = path.join(__dirname, "applications.json");

if (!TOKEN || !CLIENT_ID) {
  console.error("❌ TOKEN أو CLIENT_ID غير موجود!");
  process.exit(1);
}

if (!PANEL_CHANNEL_ID || !APPLICATIONS_CHANNEL_ID) {
  console.error("❌ ضع PANEL_CHANNEL_ID و APPLICATIONS_CHANNEL_ID");
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// =====================================
// DATABASE
// =====================================

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    }
  } catch (error) {
    console.error("Database error:", error);
  }

  return {
    enabled: true,
    users: {},
    applications: {}
  };
}

let db = loadData();

function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}

// =====================================
// PERMISSIONS
// =====================================

function isStaff(interaction) {
  if (interaction.memberPermissions?.has(
    PermissionsBitField.Flags.Administrator
  )) {
    return true;
  }

  if (STAFF_ROLE_ID && interaction.member?.roles?.cache?.has(STAFF_ROLE_ID)) {
    return true;
  }

  return false;
}

// =====================================
// APPLICATION PANEL
// =====================================

function panelEmbed() {
  return new EmbedBuilder()
    .setColor(COLOR)
    .setAuthor({
      name: "MAIN APPLICATIONS"
    })
    .setTitle("إدارة التقديمات")
    .setDescription(
      [
        "أهلاً بك في نظام التقديمات الخاص بسيرفر **MAIN**.",
        "",
        "اختر نوع التقديم المناسب لك من الأزرار بالأسفل:",
        "",
        "**1 - التقديم الإداري**",
        "للانضمام إلى طاقم الإدارة والمساعدة في تنظيم السيرفر.",
        "",
        "**2 - صانع محتوى TikTok**",
        "لصناع المحتوى الراغبين في التعاون مع سيرفر MAIN.",
        "",
        "يرجى التأكد من كتابة جميع المعلومات بشكل صحيح.",
        "أي معلومات غير صحيحة قد تؤدي إلى رفض طلبك.",
        "",
        `**حالة التقديم:** ${db.enabled ? "🟢 مفتوح" : "🔴 مغلق"}`
      ].join("\n")
    )
    .setFooter({
      text: "MAIN • APPLICATION SYSTEM"
    })
    .setTimestamp();
}

function panelButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("main_admin_apply")
      .setLabel("تقديم الإدارة")
      .setEmoji("👨‍💼")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(!db.enabled),

    new ButtonBuilder()
      .setCustomId("main_creator_apply")
      .setLabel("تقديم صانع محتوى")
      .setEmoji("🎵")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(!db.enabled)
  );
}

// =====================================
// MODALS
// =====================================

function createModal(type) {
  const modal = new ModalBuilder();

  const admin = type === "admin";

  modal
    .setCustomId(admin ? "main_modal_admin" : "main_modal_creator")
    .setTitle(admin ? "التقديم الإداري - MAIN" : "تقديم صانع محتوى");

  const questions = admin
    ? [
        ["age", "كم عمرك؟", "short"],
        ["experience", "هل لديك خبرة إدارية سابقة؟", "paragraph"],
        ["availability", "كم ساعة تستطيع التواجد يومياً؟", "short"],
        ["reason", "لماذا تريد الانضمام للإدارة؟", "paragraph"],
        ["skills", "ما هي المهارات التي تمتلكها؟", "paragraph"]
      ]
    : [
        ["account", "ما اسم حسابك في TikTok؟", "short"],
        ["followers", "كم عدد متابعينك؟", "short"],
        ["link", "أرسل رابط حسابك", "short"],
        ["experience", "هل لديك خبرة في صناعة المحتوى؟", "paragraph"],
        ["reason", "لماذا تريد التعاون مع MAIN؟", "paragraph"]
      ];

  for (const [id, label, style] of questions) {
    const input = new TextInputBuilder()
      .setCustomId(id)
      .setLabel(label)
      .setStyle(
        style === "paragraph"
          ? TextInputStyle.Paragraph
          : TextInputStyle.Short
      )
      .setRequired(true)
      .setMaxLength(style === "paragraph" ? 1000 : 200);

    modal.addComponents(
      new ActionRowBuilder().addComponents(input)
    );
  }

  return modal;
}

// =====================================
// APPLICATION EMBED
// =====================================

function applicationEmbed(user, type, answers) {
  const isAdmin = type === "admin";

  const names = isAdmin
    ? [
        ["العمر", "age"],
        ["الخبرة الإدارية", "experience"],
        ["التواجد اليومي", "availability"],
        ["سبب التقديم", "reason"],
        ["المهارات", "skills"]
      ]
    : [
        ["حساب TikTok", "account"],
        ["عدد المتابعين", "followers"],
        ["رابط الحساب", "link"],
        ["خبرة صناعة المحتوى", "experience"],
        ["سبب التعاون", "reason"]
      ];

  const embed = new EmbedBuilder()
    .setColor(COLOR)
    .setAuthor({
      name: "MAIN APPLICATIONS"
    })
    .setTitle(
      isAdmin ? "📋 طلب تقديم إداري" : "🎵 طلب صانع محتوى"
    )
    .setDescription(
      `**المتقدم:** ${user}\n**نوع الطلب:** ${isAdmin ? "إداري" : "صانع محتوى"}\n**الحالة:** ⏳ قيد المراجعة`
    )
    .setThumbnail(user.displayAvatarURL({ size: 256 }))
    .setFooter({
      text: "MAIN • APPLICATION SYSTEM"
    })
    .setTimestamp();

  for (const [label, id] of names) {
    embed.addFields({
      name: label,
      value: answers[id] || "غير محدد",
      inline: false
    });
  }

  return embed;
}

// =====================================
// REVIEW BUTTONS
// =====================================

function reviewButtons(threadId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`main_accept_${threadId}`)
      .setLabel("قبول")
      .setEmoji("✅")
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId(`main_reject_${threadId}`)
      .setLabel("رفض")
      .setEmoji("❌")
      .setStyle(ButtonStyle.Danger)
  );
}

// =====================================
// CREATE THREAD
// =====================================

async function createApplication(interaction, type, answers) {
  if (!db.enabled) {
    return interaction.reply({
      content: "🔴 التقديمات مغلقة حالياً.",
      ephemeral: true
    });
  }

  const userId = interaction.user.id;

  if (db.users[userId]) {
    const old = db.applications[db.users[userId]];

    if (old && old.status === "pending") {
      return interaction.reply({
        content: `❌ لديك طلب قيد المراجعة بالفعل: <#${old.threadId}>`,
        ephemeral: true
      });
    }

    delete db.users[userId];
    saveData();
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    const channel = await client.channels.fetch(
      APPLICATIONS_CHANNEL_ID
    );

    if (
      !channel ||
      ![
        ChannelType.GuildForum,
        ChannelType.GuildText
      ].includes(channel.type)
    ) {
      throw new Error("قناة التقديمات يجب أن تكون Forum أو Text Channel");
    }

    const embed = applicationEmbed(
      interaction.user,
      type,
      answers
    );

    const components = [
      reviewButtons("TEMP")
    ];

    let thread;

    const threadName = (
      `${type === "admin" ? "إداري" : "صانع محتوى"}-${interaction.user.username}`
    ).slice(0, 100);

    if (channel.type === ChannelType.GuildForum) {
      thread = await channel.threads.create({
        name: threadName,
        message: {
          content: STAFF_ROLE_ID
            ? `<@&${STAFF_ROLE_ID}> طلب تقديم جديد`
            : "طلب تقديم جديد للإدارة",
          embeds: [embed]
        },
        reason: `MAIN application by ${interaction.user.tag}`
      });

      const starter = await thread.fetchStarterMessage();

      await starter.edit({
        components: [reviewButtons(thread.id)]
      });

    } else {
      const starter = await channel.send({
        content: STAFF_ROLE_ID
          ? `<@&${STAFF_ROLE_ID}> طلب تقديم جديد`
          : "طلب تقديم جديد للإدارة",
        embeds: [embed]
      });

      thread = await starter.startThread({
        name: threadName,
        autoArchiveDuration: 1440,
        reason: `MAIN application by ${interaction.user.tag}`
      });

      await starter.edit({
        components: [reviewButtons(thread.id)]
      });
    }

    db.users[userId] = thread.id;

    db.applications[thread.id] = {
      userId,
      type,
      status: "pending",
      threadId: thread.id,
      createdAt: Date.now()
    };

    saveData();

    await interaction.editReply({
      content: `✅ تم إرسال طلبك بنجاح!\n📌 موضوع تقديمك: <#${thread.id}>\n\nانتظر مراجعة الإدارة.`
    });

  } catch (error) {
    console.error("Application error:", error);

    await interaction.editReply({
      content: "❌ حدث خطأ أثناء إنشاء التقديم. تأكد من صلاحيات البوت وإعداد القنوات."
    });
  }
}

// =====================================
// SLASH COMMANDS
// =====================================

const commands = [
  new SlashCommandBuilder()
    .setName("setup")
    .setDescription("إنشاء لوحة تقديمات MAIN"),

  new SlashCommandBuilder()
    .setName("open")
    .setDescription("فتح التقديمات"),

  new SlashCommandBuilder()
    .setName("close")
    .setDescription("إغلاق التقديمات"),

  new SlashCommandBuilder()
    .setName("status")
    .setDescription("معرفة حالة التقديمات")
].map(command =>
  command
    .setDefaultMemberPermissions(
      PermissionsBitField.Flags.ManageGuild
    )
    .toJSON()
);

// =====================================
// REGISTER COMMANDS
// =====================================

async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(TOKEN);

  const route = GUILD_ID
    ? Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID)
    : Routes.applicationCommands(CLIENT_ID);

  await rest.put(route, { body: commands });

  console.log("✅ MAIN commands registered");
}

// =====================================
// READY
// =====================================

client.once("ready", async () => {
  console.log(`✅ ${client.user.tag} is online`);

  try {
    await registerCommands();
  } catch (error) {
    console.error("Command registration error:", error);
  }
});

// =====================================
// INTERACTIONS
// =====================================

client.on("interactionCreate", async interaction => {
  try {

    // ---------------------------------
    // SLASH COMMANDS
    // ---------------------------------

    if (interaction.isChatInputCommand()) {

      if (!isStaff(interaction)) {
        return interaction.reply({
          content: "❌ ليس لديك صلاحية استخدام هذا الأمر.",
          ephemeral: true
        });
      }

      if (interaction.commandName === "setup") {
        const channel = await client.channels.fetch(
          PANEL_CHANNEL_ID
        );

        if (!channel || channel.type !== ChannelType.GuildText) {
          return interaction.reply({
            content: "❌ روم اللوحة يجب أن يكون Text Channel.",
            ephemeral: true
          });
        }

        await channel.send({
          embeds: [panelEmbed()],
          components: [panelButtons()]
        });

        return interaction.reply({
          content: "✅ تم إنشاء لوحة تقديمات MAIN.",
          ephemeral: true
        });
      }

      if (interaction.commandName === "open") {
        db.enabled = true;
        saveData();

        return interaction.reply({
          content: "🟢 تم فتح التقديمات بنجاح.",
          ephemeral: true
        });
      }

      if (interaction.commandName === "close") {
        db.enabled = false;
        saveData();

        return interaction.reply({
          content: "🔴 تم إغلاق التقديمات بنجاح.",
          ephemeral: true
        });
      }

      if (interaction.commandName === "status") {
        return interaction.reply({
          content: `حالة التقديمات: ${db.enabled ? "🟢 مفتوحة" : "🔴 مغلقة"}`,
          ephemeral: true
        });
      }
    }

    // ---------------------------------
    // APPLICATION BUTTONS
    // ---------------------------------

    if (interaction.isButton()) {

      if (
        interaction.customId === "main_admin_apply" ||
        interaction.customId === "main_creator_apply"
      ) {
        if (!db.enabled) {
          return interaction.reply({
            content: "🔴 التقديمات مغلقة حالياً.",
            ephemeral: true
          });
        }

        const type = interaction.customId === "main_admin_apply"
          ? "admin"
          : "creator";

        return interaction.showModal(createModal(type));
      }

      // ---------------------------------
      // ACCEPT / REJECT
      // ---------------------------------

      if (
        interaction.customId.startsWith("main_accept_") ||
        interaction.customId.startsWith("main_reject_")
      ) {
        if (!isStaff(interaction)) {
          return interaction.reply({
            content: "❌ هذا الزر مخصص للإدارة فقط.",
            ephemeral: true
          });
        }

        const accepted = interaction.customId.startsWith("main_accept_");

        const threadId = interaction.customId.replace(
          accepted ? "main_accept_" : "main_reject_",
          ""
        );

        const application = db.applications[threadId];

        if (!application || application.status !== "pending") {
          return interaction.reply({
            content: "❌ هذا الطلب تمت مراجعته مسبقاً أو غير موجود.",
            ephemeral: true
          });
        }

        application.status = accepted ? "accepted" : "rejected";
        application.reviewedBy = interaction.user.id;
        application.reviewedAt = Date.now();

        saveData();

        const updatedEmbed = EmbedBuilder.from(
          interaction.message.embeds[0]
        );

        updatedEmbed.setDescription(
          updatedEmbed.data.description.replace(
            "⏳ قيد المراجعة",
            accepted ? "✅ مقبول" : "❌ مرفوض"
          )
        );

        updatedEmbed.addFields({
          name: "تمت المراجعة بواسطة",
          value: `${interaction.user}`,
          inline: false
        });

        const disabledButtons = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("main_reviewed")
            .setLabel(accepted ? "تم القبول" : "تم الرفض")
            .setStyle(accepted ? ButtonStyle.Success : ButtonStyle.Danger)
            .setDisabled(true)
        );

        await interaction.update({
          embeds: [updatedEmbed],
          components: [disabledButtons]
        });

        const thread = await client.channels.fetch(threadId).catch(() => null);

        if (thread) {
          await thread.send(
            accepted
              ? `✅ تم قبول طلبك بواسطة ${interaction.user}.`
              : `❌ نعتذر، تم رفض طلبك بواسطة ${interaction.user}.`
          ).catch(() => {});
        }

        return;
      }
    }

    // ---------------------------------
    // MODAL SUBMISSIONS
    // ---------------------------------

    if (interaction.isModalSubmit()) {

      if (
        interaction.customId === "main_modal_admin" ||
        interaction.customId === "main_modal_creator"
      ) {
        const type = interaction.customId === "main_modal_admin"
          ? "admin"
          : "creator";

        const ids = type === "admin"
          ? ["age", "experience", "availability", "reason", "skills"]
          : ["account", "followers", "link", "experience", "reason"];

        const answers = {};

        for (const id of ids) {
          answers[id] = interaction.fields.getTextInputValue(id);
        }

        return createApplication(interaction, type, answers);
      }
    }

  } catch (error) {
    console.error("Interaction error:", error);

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "❌ حدث خطأ غير متوقع.",
        ephemeral: true
      }).catch(() => {});
    }
  }
});

// =====================================
// LOGIN
// =====================================

client.login(TOKEN);
