import {
  ButtonInteraction,
  ModalSubmitInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionFlagsBits,
  type GuildMember,
  type TextChannel,
} from "discord.js";
import { prisma } from "@lynnbot/database";
import { THEME_COLORS } from "../../utils/theme.js";

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

/**
 * Check if the member has staff/moderation authority
 */
function isModerator(interaction: ButtonInteraction | ModalSubmitInteraction): boolean {
  if (!interaction.memberPermissions) return false;
  return (
    interaction.memberPermissions.has(PermissionFlagsBits.ModerateMembers) ||
    interaction.memberPermissions.has(PermissionFlagsBits.ManageMessages) ||
    interaction.memberPermissions.has(PermissionFlagsBits.Administrator)
  );
}

/**
 * 1. Show Modal for Creating Warning / Penalty
 */
export async function showWarnCreateModal(interaction: ButtonInteraction) {
  if (!isModerator(interaction)) {
    await interaction.reply({
      content: "❌ คุณไม่มีสิทธิ์ในการออกใบเตือนหรือลงโทษสมาชิก (ต้องการสิทธิ์ Moderate Members)",
      ephemeral: true,
    });
    return;
  }

  const modal = new ModalBuilder()
    .setCustomId("modal_warn_create")
    .setTitle("⚖️ บันทึกการตักเตือน & ลงโทษสมาชิก");

  const userInput = new TextInputBuilder()
    .setCustomId("warn_user_id")
    .setLabel("ไอดีหรือแท็กสมาชิก (Discord ID หรือ @ชื่อ)")
    .setPlaceholder("เช่น 1078869442609561691 หรือ @สมาชิก")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const reasonInput = new TextInputBuilder()
    .setCustomId("warn_reason")
    .setLabel("สาเหตุและพฤติกรรมความผิด (Reason)")
    .setPlaceholder("ระบุเหตุผลการลงโทษ เช่น ใช้คำหยาบ, สแปมข้อความ, แปะลิงก์โปรโมท")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true);

  const severityInput = new TextInputBuilder()
    .setCustomId("warn_severity")
    .setLabel("ระดับความรุนแรง (LOW, MEDIUM, HIGH, CRITICAL)")
    .setPlaceholder("LOW (เบา), MEDIUM (ปานกลาง), HIGH (ร้ายแรง), CRITICAL (วิกฤต)")
    .setValue("LOW")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const actionInput = new TextInputBuilder()
    .setCustomId("warn_action")
    .setLabel("มาตรการลงโทษเพิ่มเติม (Action)")
    .setPlaceholder("WARN (เตือน), TIMEOUT_10M, TIMEOUT_1H, TIMEOUT_1D, KICK")
    .setValue("WARN")
    .setStyle(TextInputStyle.Short)
    .setRequired(false);

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(userInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(severityInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(actionInput)
  );

  await interaction.showModal(modal);
}

/**
 * 2. Show Modal for Checking Member Warnings History
 */
export async function showWarnCheckModal(interaction: ButtonInteraction) {
  const modal = new ModalBuilder()
    .setCustomId("modal_warn_check")
    .setTitle("🔍 ตรวจสอบประวัติการเตือนสมาชิก");

  const userInput = new TextInputBuilder()
    .setCustomId("check_user_id")
    .setLabel("ไอดีสมาชิก หรือ แท็ก (@ชื่อ หรือ Discord ID)")
    .setPlaceholder("เช่น 1078869442609561691")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(userInput));
  await interaction.showModal(modal);
}

/**
 * 3. Handle Submit: Create Warning & Execute Punishment
 */
export async function handleWarnModalSubmit(interaction: ModalSubmitInteraction) {
  await interaction.deferReply({ ephemeral: false });

  const rawUser = interaction.fields.getTextInputValue("warn_user_id").trim();
  const reason = interaction.fields.getTextInputValue("warn_reason").trim();
  let severity = interaction.fields.getTextInputValue("warn_severity").trim().toUpperCase();
  const rawAction = (interaction.fields.getTextInputValue("warn_action") || "WARN").trim().toUpperCase();

  // Validate severity
  if (!["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(severity)) {
    severity = "LOW";
  }

  // Extract clean Discord ID
  const idMatch = rawUser.match(/\d{17,20}/);
  if (!idMatch) {
    await interaction.editReply({
      content: "❌ ไม่พบรูปแบบ Discord ID ที่ถูกต้อง (กรุณาระบุเลขไอดี 17-20 หลัก หรือแท็กสมาชิก)",
    });
    return;
  }
  const targetId = idMatch[0];

  // Try to find the member in guild
  let targetMember: GuildMember | null = null;
  let targetUsername = `User-${targetId}`;

  try {
    targetMember = await interaction.guild?.members.fetch(targetId) || null;
    if (targetMember) {
      targetUsername = targetMember.displayName || targetMember.user.username;
    } else {
      const fetchedUser = await interaction.client.users.fetch(targetId).catch(() => null);
      if (fetchedUser) targetUsername = fetchedUser.displayName || fetchedUser.username;
    }
  } catch {
    const fetchedUser = await interaction.client.users.fetch(targetId).catch(() => null);
    if (fetchedUser) targetUsername = fetchedUser.displayName || fetchedUser.username;
  }

  // Check protection: cannot warn bots or administrators
  if (targetMember) {
    if (targetMember.user.bot) {
      await interaction.editReply({ content: "❌ ไม่สามารถบันทึกการลงโทษบอทได้" });
      return;
    }
    if (targetMember.permissions.has(PermissionFlagsBits.Administrator)) {
      await interaction.editReply({ content: "❌ ไม่สามารถออกใบเตือนผู้ดูแลระบบ (Administrator) ได้" });
      return;
    }
  }

  // 1. Save Warning to Database
  const adminName = interaction.user.displayName || interaction.user.username;
  const warning = await prisma.warning.create({
    data: {
      discordId: targetId,
      discordName: targetUsername,
      issuedById: interaction.user.id,
      issuedBy: adminName,
      reason,
      severity,
      isActive: true,
    },
  });

  // 2. Count Active Warnings for target
  const activeWarnsCount = await prisma.warning.count({
    where: { discordId: targetId, isActive: true },
  });

  // 3. Action Execution (Manual choice or Auto-Escalation)
  let actionTaken = "ตักเตือนและบันทึกประวัติ (Warning Record)";
  if (targetMember && targetMember.moderatable) {
    try {
      if (rawAction.includes("TIMEOUT_1D")) {
        await targetMember.timeout(24 * 60 * 60 * 1000, `มาตรการลงโทษ: ${reason}`);
        actionTaken = "จำกัดการส่งข้อความ 1 วัน (Timeout 24h)";
      } else if (rawAction.includes("TIMEOUT_1H") || (!rawAction.includes("TIMEOUT") && activeWarnsCount >= 3 && activeWarnsCount < 5)) {
        await targetMember.timeout(60 * 60 * 1000, `เตือนสะสมครบ ${activeWarnsCount} ครั้ง: ${reason}`);
        actionTaken = "จำกัดการส่งข้อความ 1 ชั่วโมง (Timeout 1h)";
      } else if (rawAction.includes("TIMEOUT_10M")) {
        await targetMember.timeout(10 * 60 * 1000, `มาตรการลงโทษ: ${reason}`);
        actionTaken = "จำกัดการส่งข้อความ 10 นาที (Timeout 10m)";
      } else if (rawAction.includes("KICK") || activeWarnsCount >= 5) {
        if (targetMember.kickable) {
          await targetMember.kick(`เตือนสะสมครบ ${activeWarnsCount} ครั้ง: ${reason}`);
          actionTaken = "เตะออกจากเซิร์ฟเวอร์ทันที (Kicked)";
        }
      }
    } catch (actErr: any) {
      console.warn("Could not execute action on member:", actErr.message);
    }
  }

  // 4. Send DM to Target User
  try {
    const targetUserObj = targetMember?.user || (await interaction.client.users.fetch(targetId).catch(() => null));
    if (targetUserObj) {
      const dmEmbed = new EmbedBuilder()
        .setColor(SEVERITY_COLORS[severity] || THEME_COLORS.danger)
        .setTitle("⚠️  DISCIPLINARY NOTICE • แจ้งเตือนการกระทำผิด")
        .setDescription(
          `คุณได้รับการตักเตือนในเซิร์ฟเวอร์ **${interaction.guild?.name || "Discord"}**\n\n` +
          `• **ความผิด:** ${reason}\n` +
          `• **ระดับความรุนแรง:** \`${severity}\`\n` +
          `• **เตือนโดย:** <@${interaction.user.id}>\n` +
          `• **มาตรการที่ดำเนินการ:** **${actionTaken}**\n` +
          `• **การเตือนสะสมที่ยังมีผล:** **${activeWarnsCount} ครั้ง**\n\n` +
          `> *โปรดศึกษากฎระเบียบและแนวทางปฏิบัติของเซิร์ฟเวอร์เพื่อหลีกเลี่ยงการถูกระงับสิทธิ์ถาวร*`
        )
        .setFooter({ text: `Warning ID: ${warning.id} • LynnBot Security` })
        .setTimestamp();

      await targetUserObj.send({ embeds: [dmEmbed] }).catch(() => {});
    }
  } catch {}

  // 5. Reply in Channel with Public Embed Log
  const embed = new EmbedBuilder()
    .setColor(SEVERITY_COLORS[severity] || THEME_COLORS.danger)
    .setTitle("⚖️  PUNISHMENT LOGGED • บันทึกการลงโทษสมาชิก")
    .setDescription(
      `ดำเนินการบันทึกการกระทำผิดและบทลงโทษเรียบร้อยแล้ว\n\n` +
      `👤 **สมาชิกที่ถูกลงโทษ:** <@${targetId}> (\`${targetUsername}\`)\n` +
      `📝 **สาเหตุ / ความผิด:** ${reason}\n` +
      `⚡ **ระดับความรุนแรง:** \`${severity}\`\n` +
      `🛡️ **ผู้ลงโทษ (Moderator):** <@${interaction.user.id}>\n` +
      `🔨 **มาตรการที่ใช้:** **${actionTaken}**\n` +
      `📊 **การเตือนสะสม:** **${activeWarnsCount} ครั้ง**\n\n` +
      `-# ข้อมูลถูกซิงค์เข้าสู่ระบบ Dashboard เรียบร้อยแล้ว`
    )
    .setFooter({ text: `Warning ID: ${warning.id}` })
    .setTimestamp();

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
      content: `✅ บันทึกการลงโทษ <@${targetId}> เรียบร้อยแล้ว (ประกาศลงห้อง <#${notifyChannel.id}>)`,
      embeds: [embed],
      components: [linkRow],
    });
  } else {
    await interaction.editReply({ embeds: [embed], components: [linkRow] });
  }
}

/**
 * 4. Handle Submit: Check Warning History
 */
export async function handleWarnCheckModalSubmit(interaction: ModalSubmitInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const rawUser = interaction.fields.getTextInputValue("check_user_id").trim();
  const idMatch = rawUser.match(/\d{17,20}/);
  if (!idMatch) {
    await interaction.editReply({
      content: "❌ รูปแบบ Discord ID ไม่ถูกต้อง กรุณาระบุเลขไอดี 17-20 หลัก",
    });
    return;
  }
  const targetId = idMatch[0];

  const warnings = await prisma.warning.findMany({
    where: { discordId: targetId },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const activeCount = warnings.filter((w) => w.isActive).length;

  const embed = new EmbedBuilder()
    .setColor(activeCount > 0 ? THEME_COLORS.warning : THEME_COLORS.accent)
    .setTitle(`📋 ประวัติการตักเตือนของ <@${targetId}>`)
    .setDescription(
      `ประวัติการเตือนทั้งหมด: **${warnings.length} ครั้ง** | กำลังมีผล: **${activeCount} ครั้ง**\n\n` +
      (warnings.length === 0
        ? "✅ สมาชิกคนนี้ประวัติดีเยี่ยม ไม่เคยได้รับการตักเตือนใดๆ"
        : warnings
            .map(
              (w, i) =>
                `**${i + 1}.** [${w.severity}] ${w.reason}\n` +
                `└ ผู้เตือน: **${w.issuedBy}** • สถานะ: ${w.isActive ? "🔴 กำลังมีผล" : "⚪ ยกเลิกแล้ว"} • <t:${Math.floor(new Date(w.createdAt).getTime() / 1000)}:R>`
            )
            .join("\n\n"))
    )
    .setFooter({ text: "LynnBot Security & Discipline" })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}
