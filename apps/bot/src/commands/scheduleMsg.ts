import {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  type TextChannel,
} from "discord.js";
import { prisma } from "@lynnbot/database";
import { THEME_COLORS } from "../utils/theme.js";
import type { BotCommand } from "../index.js";

export const scheduleMsgCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("schedule-msg")
    .setDescription("ตั้งเวลาส่งข้อความหรือประกาศเข้าห้องดิสคอร์ดล่วงหน้า")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName("create")
        .setDescription("ตั้งเวลาส่งประกาศล่วงหน้า")
        .addChannelOption((opt) =>
          opt.setName("channel").setDescription("ห้องที่จะส่งข้อความ").setRequired(true)
        )
        .addStringOption((opt) =>
          opt.setName("content").setDescription("เนื้อหาข้อความหรือประกาศ").setRequired(true)
        )
        .addIntegerOption((opt) =>
          opt.setName("in_minutes").setDescription("อีกกี่นาทีให้ส่งข้อความ").setRequired(true).setMinValue(1)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("list")
        .setDescription("ดูรายการข้อความที่ตั้งเวลาไว้")
    )
    .addSubcommand((sub) =>
      sub
        .setName("cancel")
        .setDescription("ยกเลิกข้อความที่ตั้งเวลาไว้")
        .addStringOption((opt) =>
          opt.setName("id").setDescription("Message ID").setRequired(true)
        )
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "create") {
      await interaction.deferReply({ ephemeral: true });

      const channel = interaction.options.getChannel("channel", true) as TextChannel;
      const content = interaction.options.getString("content", true);
      const inMinutes = interaction.options.getInteger("in_minutes", true);

      if (!interaction.guild) {
        await interaction.editReply({ content: "❌ ใช้คำสั่งนี้ได้ในเซิร์ฟเวอร์เท่านั้น" });
        return;
      }

      const scheduledAt = new Date(Date.now() + inMinutes * 60 * 1000);

      const msg = await prisma.scheduledMessage.create({
        data: {
          guildId: interaction.guild.id,
          channelId: channel.id,
          content,
          scheduledAt,
          isActive: true,
          createdBy: interaction.user.displayName || interaction.user.username,
        },
      });

      const embed = new EmbedBuilder()
        .setColor(THEME_COLORS.accent)
        .setTitle("📢  SCHEDULED MESSAGE CREATED • ตั้งเวลาส่งข้อความสำเร็จ")
        .setDescription(
          `ระบบจะทำการส่งข้อความนี้เข้าสู่ห้อง <#${channel.id}>\n\n` +
          `• **กำหนดการส่ง:** <t:${Math.floor(scheduledAt.getTime() / 1000)}:R> (<t:${Math.floor(scheduledAt.getTime() / 1000)}:f>)\n` +
          `• **เนื้อหา:** ${content.slice(0, 100)}${content.length > 100 ? "..." : ""}\n\n` +
          `> ID สำหรับยกเลิก: \`${msg.id}\``
        )
        .setFooter({ text: "LynnBot Operations System" })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (subcommand === "list") {
      await interaction.deferReply({ ephemeral: true });

      const list = await prisma.scheduledMessage.findMany({
        where: {
          guildId: interaction.guild?.id || "",
          isActive: true,
        },
        orderBy: { scheduledAt: "asc" },
      });

      const embed = new EmbedBuilder()
        .setColor(THEME_COLORS.surface)
        .setTitle("📋  SCHEDULED MESSAGES • ข้อความที่ตั้งเวลาไว้")
        .setDescription(
          list.length === 0
            ? "⚪ ไม่มีข้อความที่รอการส่งตามกำหนดการ"
            : list
                .map(
                  (m) =>
                    `• **ห้อง:** <#${m.channelId}>\n` +
                    `  กำหนดส่ง: <t:${Math.floor((m.scheduledAt?.getTime() || 0) / 1000)}:R>\n` +
                    `  เนื้อหา: ${m.content?.slice(0, 60)}...\n` +
                    `  ID: \`${m.id}\``
                )
                .join("\n\n")
        )
        .setFooter({ text: "LynnBot Operations System" })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (subcommand === "cancel") {
      await interaction.deferReply({ ephemeral: true });
      const id = interaction.options.getString("id", true);

      try {
        await prisma.scheduledMessage.update({
          where: { id },
          data: { isActive: false },
        });
        await interaction.editReply({ content: `✅ ยกเลิกข้อความตั้งเวลา ID \`${id}\` เรียบร้อยแล้ว` });
      } catch {
        await interaction.editReply({ content: "❌ ไม่พบข้อความตาม ID ที่ระบุ" });
      }
      return;
    }
  },
};
