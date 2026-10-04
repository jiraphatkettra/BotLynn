import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
  type TextChannel,
  ChannelType,
  EmbedBuilder,
} from "discord.js";
import { prisma } from "@lynnbot/database";
import type { BotCommand } from "../index.js";
import {
  buildWelcomeEmbed,
  buildWelcomeButtons,
  handleWelcomeMember,
  findWelcomeChannel,
} from "../services/welcomeService.js";
import { THEME_COLORS } from "../utils/theme.js";

export const welcomeCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("welcome")
    .setDescription("จัดการและตั้งค่าระบบการต้อนรับสมาชิกใหม่เข้าเซิร์ฟเวอร์")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName("test")
        .setDescription("ทดสอบส่งข้อความต้อนรับ (แบบ Embed)")
        .addUserOption((opt) =>
          opt
            .setName("user")
            .setDescription("เลือกสมาชิกที่ต้องการจำลอง (ค่าเริ่มต้นคือตัวคุณเอง)")
            .setRequired(false)
        )
        .addChannelOption((opt) =>
          opt
            .setName("channel")
            .setDescription("เลือกห้องที่ต้องการให้ส่งข้อความทดสอบ (ถ้าไม่เลือกจะส่งเข้าห้องต้อนรับ)")
            .setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("setup")
        .setDescription("ตั้งค่าห้องต้อนรับและข้อความต้อนรับ")
        .addChannelOption((opt) =>
          opt
            .setName("channel")
            .setDescription("ห้องสำหรับส่งข้อความต้อนรับ")
            .setRequired(true)
        )
        .addStringOption((opt) =>
          opt
            .setName("message")
            .setDescription("ข้อความต้อนรับ (ใช้ {user}, {username}, {server}, {count} ได้)")
            .setRequired(false)
        )
        .addChannelOption((opt) =>
          opt
            .setName("rules_channel")
            .setDescription("ห้องกฎระเบียบเซิร์ฟเวอร์ (สำหรับทำปุ่มลิงก์และแท็กใน Embed)")
            .setRequired(false)
        )
        .addStringOption((opt) =>
          opt
            .setName("banner")
            .setDescription("URL รูปภาพแบนเนอร์ด้านล่าง Embed (ต้องเป็นลิงก์รูปภาพ เช่น https://...)")
            .setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("preview")
        .setDescription("ดูตัวอย่าง Embed ต้อนรับตามการตั้งค่าปัจจุบัน (เห็นเฉพาะคุณ)")
    )
    .addSubcommand((sub) =>
      sub
        .setName("toggle")
        .setDescription("เปิดหรือปิดระบบต้อนรับ")
        .addBooleanOption((opt) =>
          opt
            .setName("enabled")
            .setDescription("เปิดใช้งาน (True) หรือ ปิดใช้งาน (False)")
            .setRequired(true)
        )
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
      await interaction.reply({
        content: "❌ คำสั่งนี้ใช้งานได้เฉพาะในเซิร์ฟเวอร์เท่านั้น",
        ephemeral: true,
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    // ──────────────────────────────────────────────
    // 1. SUBCOMMAND: TEST
    // ──────────────────────────────────────────────
    if (subcommand === "test") {
      await interaction.deferReply({ ephemeral: true });

      const targetUser = interaction.options.getUser("user") || interaction.user;
      const targetChannelOpt = interaction.options.getChannel("channel");

      let member = interaction.guild.members.cache.get(targetUser.id);
      if (!member) {
        member = await interaction.guild.members.fetch(targetUser.id).catch(() => null) as any;
      }

      if (!member) {
        await interaction.editReply({ content: "❌ ไม่พบข้อมูลสมาชิกดังกล่าวในเซิร์ฟเวอร์" });
        return;
      }

      const targetChannelId = targetChannelOpt?.id;
      const result = await handleWelcomeMember(member, {
        isTest: true,
        targetChannelId,
      });

      if (result.success) {
        await interaction.editReply({
          content: `✅ ส่งข้อความต้อนรับทดสอบสำเร็จแล้ว! ส่งไปยังห้อง <#${result.channelId}> เรียบร้อยครับ ✨`,
        });
      } else {
        await interaction.editReply({
          content: `❌ ไม่สามารถส่งข้อความต้อนรับได้: ${result.error || "เกิดข้อผิดพลาด"}`,
        });
      }
      return;
    }

    // ──────────────────────────────────────────────
    // 2. SUBCOMMAND: SETUP
    // ──────────────────────────────────────────────
    if (subcommand === "setup") {
      await interaction.deferReply({ ephemeral: true });

      const channel = interaction.options.getChannel("channel", true);
      const customMessage = interaction.options.getString("message");
      const bannerUrl = interaction.options.getString("banner");

      if (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildAnnouncement) {
        await interaction.editReply({
          content: "❌ ห้องสำหรับส่งข้อความต้อนรับต้องเป็นห้องข้อความ (Text Channel) เท่านั้น",
        });
        return;
      }

      // Save to database settings
      await prisma.setting.upsert({
        where: { key: "welcome_enabled" },
        update: { value: "true" },
        create: { key: "welcome_enabled", value: "true", category: "general" },
      });

      await prisma.setting.upsert({
        where: { key: "welcome_channel_id" },
        update: { value: channel.id },
        create: { key: "welcome_channel_id", value: channel.id, category: "general" },
      });

      if (customMessage) {
        await prisma.setting.upsert({
          where: { key: "welcome_message" },
          update: { value: customMessage },
          create: { key: "welcome_message", value: customMessage, category: "general" },
        });
      }

      const rulesChannel = interaction.options.getChannel("rules_channel");
      if (rulesChannel) {
        await prisma.setting.upsert({
          where: { key: "rules_channel_id" },
          update: { value: rulesChannel.id },
          create: { key: "rules_channel_id", value: rulesChannel.id, category: "general" },
        });
      }

      if (bannerUrl) {
        await prisma.setting.upsert({
          where: { key: "welcome_banner_url" },
          update: { value: bannerUrl },
          create: { key: "welcome_banner_url", value: bannerUrl, category: "general" },
        });
      }

      const successEmbed = new EmbedBuilder()
        .setColor(THEME_COLORS.success)
        .setTitle("✅  WELCOME SYSTEM CONFIGURED • ตั้งค่าระบบต้อนรับสำเร็จ")
        .setDescription(
          `บันทึกการตั้งค่าระบบต้อนรับสมาชิกใหม่เรียบร้อยแล้ว\n\n` +
          `• **ห้องต้อนรับ:** <#${channel.id}>\n` +
          `• **สถานะ:** 🟢 เปิดใช้งาน (Active)\n` +
          (customMessage ? `• **ข้อความต้อนรับ:**\n> ${customMessage}\n\n` : `• **ข้อความต้อนรับ:** ค่าเริ่มต้นสวยงาม\n\n`) +
          (bannerUrl ? `• **แบนเนอร์:** [ลิงก์รูปภาพ](${bannerUrl})\n\n` : "") +
          `> สามารถพิมพ์ \`/welcome test\` เพื่อทดสอบการทำงานได้ทันที!`
        )
        .setFooter({ text: "LynnBot Operations System • Welcome Manager" })
        .setTimestamp();

      await interaction.editReply({ embeds: [successEmbed] });
      return;
    }

    // ──────────────────────────────────────────────
    // 3. SUBCOMMAND: PREVIEW
    // ──────────────────────────────────────────────
    if (subcommand === "preview") {
      await interaction.deferReply({ ephemeral: true });

      const member = interaction.member as any;
      if (!member) {
        await interaction.editReply({ content: "❌ ไม่สามารถสร้างตัวอย่างได้" });
        return;
      }

      const settings = await prisma.setting.findMany({
        where: {
          key: {
            in: [
              "welcome_enabled",
              "welcome_channel_id",
              "welcome_title",
              "welcome_message",
              "welcome_embed_color",
              "welcome_banner_url",
              "welcome_show_fields",
              "rules_channel_id",
            ],
          },
        },
      });

      const settingsMap: Record<string, string> = {};
      for (const s of settings) {
        settingsMap[s.key] = s.value;
      }

      const embed = buildWelcomeEmbed(member, {
        customTitle: settingsMap.welcome_title,
        customMessage: settingsMap.welcome_message,
        bannerUrl: settingsMap.welcome_banner_url,
        rulesChannelId: settingsMap.rules_channel_id,
        embedColor: settingsMap.welcome_embed_color,
        showFields: settingsMap.welcome_show_fields === "true",
        isTest: true,
      });

      const buttonRow = buildWelcomeButtons(interaction.guild, settingsMap.rules_channel_id);
      const components = buttonRow ? [buttonRow] : [];

      await interaction.editReply({
        content: "👀 **ตัวอย่างข้อความต้อนรับตามการตั้งค่าปัจจุบัน (เห็นเฉพาะคุณ):**",
        embeds: [embed],
        components,
      });
      return;
    }

    // ──────────────────────────────────────────────
    // 4. SUBCOMMAND: TOGGLE
    // ──────────────────────────────────────────────
    if (subcommand === "toggle") {
      await interaction.deferReply({ ephemeral: true });

      const isEnabled = interaction.options.getBoolean("enabled", true);

      await prisma.setting.upsert({
        where: { key: "welcome_enabled" },
        update: { value: isEnabled ? "true" : "false" },
        create: {
          key: "welcome_enabled",
          value: isEnabled ? "true" : "false",
          category: "general",
        },
      });

      await interaction.editReply({
        content: isEnabled
          ? "🟢 **เปิดการใช้งานระบบต้อนรับสมาชิกใหม่เรียบร้อยแล้ว**"
          : "🔴 **ปิดการใช้งานระบบต้อนรับสมาชิกใหม่เรียบร้อยแล้ว**",
      });
      return;
    }
  },
};
