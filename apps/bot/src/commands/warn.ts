import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  ChannelType,
  type TextChannel,
  type GuildMember,
} from "discord.js";
import { prisma } from "@lynnbot/database";
import { THEME_COLORS } from "../utils/theme.js";
import type { BotCommand } from "../index.js";
import { renderCustomEmbed } from "../services/embedService.js";

function getModerationWebUrl(): string {
  const envUrl = process.env.DASHBOARD_URL || process.env.NEXTAUTH_URL;
  if (envUrl && !envUrl.includes("localhost")) {
    return `${envUrl.replace(/\/$/, "")}/moderation`;
  }
  return "https://bot-lynn-web-g3sg.vercel.app/moderation";
}

const SEVERITY_COLORS: Record<string, number> = {
  LOW: THEME_COLORS.accent,
  MEDIUM: THEME_COLORS.warning,
  HIGH: 0xff6b00,
  CRITICAL: THEME_COLORS.danger,
};

export const warnCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("warn")
    .setDescription("เตือนสมาชิกและบันทึกลงระบบลงโทษ")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((opt) =>
      opt.setName("user").setDescription("สมาชิกที่ต้องการเตือน").setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("reason").setDescription("เหตุผลในการเตือน").setRequired(true)
    )
    .addStringOption((opt) =>
      opt
        .setName("severity")
        .setDescription("ระดับความรุนแรง")
        .setRequired(false)
        .addChoices(
          { name: "🟢 เบา (LOW)", value: "LOW" },
          { name: "🟡 ปานกลาง (MEDIUM)", value: "MEDIUM" },
          { name: "🟠 ร้ายแรง (HIGH)", value: "HIGH" },
          { name: "🔴 วิกฤต (CRITICAL)", value: "CRITICAL" }
        )
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: false });

    const targetUser = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("reason", true);
    const severity = interaction.options.getString("severity") || "LOW";

    // 1. Save Warning to Database
    const warning = await prisma.warning.create({
      data: {
        discordId: targetUser.id,
        discordName: targetUser.displayName || targetUser.username,
        issuedById: interaction.user.id,
        issuedBy: interaction.user.displayName || interaction.user.username,
        reason,
        severity,
        isActive: true,
      },
    });

    // 2. Count active warnings for target
    const activeWarnsCount = await prisma.warning.count({
      where: { discordId: targetUser.id, isActive: true },
    });

    // 3. Auto-action logic (3 warnings = timeout, 5 warnings = kick)
    let autoActionTaken = "ไม่มี";
    const member = interaction.guild?.members.cache.get(targetUser.id);
    if (member) {
      if (activeWarnsCount >= 5 && member.kickable) {
        try {
          await member.kick(`เตือนครบ 5 ครั้ง: ${reason}`);
          autoActionTaken = "เตะออกจากเซิร์ฟเวอร์ (Kicked)";
        } catch (kickErr) {}
      } else if (activeWarnsCount >= 3 && member.moderatable) {
        try {
          // Timeout for 1 hour (3600000 ms)
          await member.timeout(60 * 60 * 1000, `เตือนครบ 3 ครั้ง: ${reason}`);
          autoActionTaken = "จำกัดการส่งข้อความ 1 ชั่วโมง (Timeout 1h)";
        } catch (timeoutErr) {}
      }
    }

    // 4. Send DM to Target User
    try {
      const defaultDmEmbed = new EmbedBuilder()
        .setColor(SEVERITY_COLORS[severity] || THEME_COLORS.danger)
        .setTitle("⚠️  WARNING NOTICE • หนังสือเตือนพฤติกรรม")
        .setDescription(
          `คุณได้รับการตักเตือนในเซิร์ฟเวอร์ **${interaction.guild?.name || "Discord"}**\n\n` +
          `• **เหตุผล:** ${reason}\n` +
          `• **ระดับ:** \`${severity}\`\n` +
          `• **เตือนโดย:** <@${interaction.user.id}>\n` +
          `• **จำนวนการเตือนสะสม:** **${activeWarnsCount} ครั้ง**\n` +
          (autoActionTaken !== "ไม่มี" ? `• **มาตรการอัตโนมัติ:** **${autoActionTaken}**\n\n` : "\n") +
          `> กรุณาศึกษากฎระเบียบของเซิร์ฟเวอร์และปฏิบัติตามอย่างเคร่งครัด`
        )
        .setFooter({ text: `Warning ID: ${warning.id}` })
        .setTimestamp();

      const dmEmbed = await renderCustomEmbed("moderation_warn_member", defaultDmEmbed, {
        target_user: `<@${targetUser.id}>`,
        target_name: targetUser.username,
        moderator: `<@${interaction.user.id}>`,
        reason,
        severity,
        action: autoActionTaken,
        warn_count: activeWarnsCount,
        warn_id: `WARN-${warning.id.slice(-4).toUpperCase()}`,
      });

      await targetUser.send({ embeds: [dmEmbed] });
    } catch (dmErr) {
      // Ignore if user has DMs closed
    }

    // 5. Send Channel Embed / Announce to Configured Channel
    const defaultEmbed = new EmbedBuilder()
      .setColor(SEVERITY_COLORS[severity] || THEME_COLORS.danger)
      .setTitle("⚠️  MEMBER WARNED • บันทึกการเตือนสมาชิก")
      .setDescription(
        `บันทึกการตักเตือนลงสู่ระบบเรียบร้อยแล้ว\n\n` +
        `• **สมาชิก:** <@${targetUser.id}> (${targetUser.username})\n` +
        `• **เหตุผล:** ${reason}\n` +
        `• **ระดับความรุนแรง:** \`${severity}\`\n` +
        `• **เตือนโดย:** <@${interaction.user.id}>\n` +
        `• **ประวัติการเตือนสะสม:** **${activeWarnsCount} ครั้ง**\n` +
        (autoActionTaken !== "ไม่มี" ? `• **การดำเนินการอัตโนมัติ:** **${autoActionTaken}**\n` : "")
      )
      .setFooter({ text: `Warning ID: ${warning.id}` })
      .setTimestamp();

    const embed = await renderCustomEmbed("moderation_warn_log", defaultEmbed, {
      target_user: `<@${targetUser.id}>`,
      target_name: targetUser.username,
      target_id: targetUser.id,
      moderator: `<@${interaction.user.id}>`,
      reason,
      severity,
      action: autoActionTaken,
      warn_count: activeWarnsCount,
    });

    // Check configured announcement channel
    const notifySetting = await prisma.setting.findUnique({
      where: { key: "moderation_notify_channel" },
    });
    const notifyChannelId = notifySetting?.value;
    const notifyChannel = notifyChannelId
      ? (interaction.guild?.channels.cache.get(notifyChannelId) as TextChannel | undefined)
      : undefined;

    const linkRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel("เปิดหน้ารายงานบนเว็บ • Web Dashboard")
        .setEmoji("🌐")
        .setStyle(ButtonStyle.Link)
        .setURL(getModerationWebUrl())
    );

    if (notifyChannel && notifyChannel.id !== interaction.channelId) {
      await notifyChannel.send({ embeds: [embed], components: [linkRow] }).catch(() => {});
      await interaction.editReply({
        content: `✅ บันทึกการตักเตือน <@${targetUser.id}> เรียบร้อยแล้ว (ประกาศลงห้อง <#${notifyChannel.id}>)`,
        embeds: [embed],
        components: [linkRow],
      });
    } else {
      await interaction.editReply({ embeds: [embed], components: [linkRow] });
    }
  },
};

export const warningsCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("warnings")
    .setDescription("ดูประวัติการเตือนของสมาชิก")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((opt) =>
      opt.setName("user").setDescription("สมาชิกที่ต้องการตรวจสอบ").setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const targetUser = interaction.options.getUser("user", true);

    const warnings = await prisma.warning.findMany({
      where: { discordId: targetUser.id },
      orderBy: { createdAt: "desc" },
    });

    const activeCount = warnings.filter((w) => w.isActive).length;

    const embed = new EmbedBuilder()
      .setColor(THEME_COLORS.surface)
      .setTitle(`📋  WARNING HISTORY • ประวัติการเตือนของ ${targetUser.username}`)
      .setDescription(
        `ประวัติการตักเตือนทั้งหมด (${warnings.length} ครั้ง, กำลังมีผล ${activeCount} ครั้ง)\n\n` +
        (warnings.length === 0
          ? "✅ สมาชิกท่านนี้ไม่มีประวัติการตักเตือน"
          : warnings
              .map(
                (w, i) =>
                  `**#${i + 1}** [${w.severity}] ${w.isActive ? "🔴 มีผล" : "⚪ ยกเลิกแล้ว"}\n` +
                  `• เหตุผล: ${w.reason}\n` +
                  `• เตือนโดย: ${w.issuedBy} เมื่อ <t:${Math.floor(w.createdAt.getTime() / 1000)}:R>\n` +
                  `• ID: \`${w.id}\``
              )
              .join("\n\n"))
      )
      .setFooter({ text: "LynnBot Operations System • Moderation Logs" })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};

export const unwarnCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("unwarn")
    .setDescription("ยกเลิกการเตือนสมาชิกตาม ID")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addStringOption((opt) =>
      opt.setName("id").setDescription("Warning ID ที่ต้องการยกเลิก").setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const warnId = interaction.options.getString("id", true);

    const warning = await prisma.warning.findUnique({
      where: { id: warnId },
    });

    if (!warning) {
      await interaction.editReply({ content: "❌ ไม่พบบันทึกการเตือนตาม ID ที่ระบุ" });
      return;
    }

    await prisma.warning.update({
      where: { id: warnId },
      data: { isActive: false },
    });

    await interaction.editReply({
      content: `✅ ยกเลิกการเตือนของ <@${warning.discordId}> (ID: \`${warning.id}\`) เรียบร้อยแล้ว`,
    });
  },
};

export const warnchannelCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("warnchannel")
    .setDescription("กำหนดหรือตรวจสอบห้องสำหรับบอทประกาศเตือนสมาชิกในเซิร์ฟเวอร์")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption((opt) =>
      opt
        .setName("channel")
        .setDescription("เลือกห้องที่ต้องการให้บอทประกาศเตือนสมาชิก (เว้นว่างไว้เพื่อดูห้องปัจจุบัน)")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const channel = interaction.options.getChannel("channel") as TextChannel | null;

    if (channel) {
      await prisma.setting.upsert({
        where: { key: "moderation_notify_channel" },
        update: { value: channel.id },
        create: {
          key: "moderation_notify_channel",
          value: channel.id,
          category: "channels",
          description: "ห้องประกาศการตักเตือนและลงโทษสมาชิก",
        },
      });

      await interaction.editReply({
        content: `✅ บันทึกห้องประกาศเตือนสมาชิกไปยัง <#${channel.id}> เรียบร้อยแล้ว!\nเมื่อมีการเตือนสมาชิกผ่านคำสั่ง \`/warn\`, แผงควบคุม \`/panel\` หรือผ่าน Dashboard ระบบจะส่งข้อความประกาศลงห้องนี้โดยอัตโนมัติ`,
      });
    } else {
      const currentSetting = await prisma.setting.findUnique({
        where: { key: "moderation_notify_channel" },
      });

      if (currentSetting?.value) {
        await interaction.editReply({
          content: `📢 ห้องประกาศเตือนสมาชิกปัจจุบันคือ: <#${currentSetting.value}> (ID: \`${currentSetting.value}\`)\n-# หากต้องการเปลี่ยน ให้ระบุตัวเลือก \`channel\` ในคำสั่งนี้`,
        });
      } else {
        await interaction.editReply({
          content: `⚠️ ยังไม่ได้กำหนดห้องประกาศเตือนสมาชิก (บอทจะส่งในห้องที่กดใช้คำสั่ง)\n-# หากต้องการกำหนดห้อง ให้พิมพ์ \`/warnchannel channel:#ห้องที่ต้องการ\``,
        });
      }
    }
  },
};
