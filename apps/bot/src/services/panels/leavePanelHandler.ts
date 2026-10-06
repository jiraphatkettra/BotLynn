import {
  type ButtonInteraction,
  type ModalSubmitInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  type TextChannel,
} from "discord.js";
import { prisma } from "@lynnbot/database";
import { THEME_COLORS } from "../../utils/theme.js";
import { ensureUser } from "./common.js";
import { renderCustomEmbed } from "../embedService.js";

/**
 * ============================================================================
 * LEAVE REQUEST MODAL & BUTTON HANDLERS
 * ============================================================================
 */
export async function showLeaveRequestModal(interaction: ButtonInteraction) {
  const modal = new ModalBuilder()
    .setCustomId("modal_leave_request")
    .setTitle("ยื่นคำขอลางาน • Leave Request");

  const typeInput = new TextInputBuilder()
    .setCustomId("leave_type")
    .setLabel("ประเภทการลา (Type)")
    .setPlaceholder("ป่วย / กิจ / พักร้อน / อื่นๆ")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const startDateInput = new TextInputBuilder()
    .setCustomId("leave_start")
    .setLabel("วันที่เริ่มลา (Start Date)")
    .setPlaceholder("เช่น วันนี้ หรือ 29/09/2026")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const daysInput = new TextInputBuilder()
    .setCustomId("leave_days")
    .setLabel("จำนวนวันที่ขอลา (Days)")
    .setPlaceholder("เช่น 1, 2, 3 (ค่าเริ่มต้น 1 วัน)")
    .setStyle(TextInputStyle.Short)
    .setRequired(false);

  const reasonInput = new TextInputBuilder()
    .setCustomId("leave_reason")
    .setLabel("เหตุผลความจำเป็นในการลา (Reason)")
    .setPlaceholder("ระบุรายละเอียดหรือเหตุผลความจำเป็น...")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(typeInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(startDateInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(daysInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput)
  );

  await interaction.showModal(modal);
}

function parseLeaveDate(input: string): Date | null {
  const trimmed = input.trim();
  const now = new Date();
  if (trimmed.includes("วันนี้") || trimmed.toLowerCase() === "today") {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  if (trimmed.includes("พรุ่งนี้") || trimmed.toLowerCase() === "tomorrow") {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    d.setDate(d.getDate() + 1);
    return d;
  }
  const parts = trimmed.split(/[\/\-\.]/);
  if (parts.length === 3) {
    const d = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    let y = parseInt(parts[2], 10);
    if (y > 2500) y -= 543;
    else if (y < 100) y += 2000;
    const parsed = new Date(y, m, d);
    if (!isNaN(parsed.getTime()) && parsed.getDate() === d && parsed.getMonth() === m) {
      return parsed;
    }
  }
  return null;
}

export async function handleLeaveModalSubmit(interaction: ModalSubmitInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const rawType = interaction.fields.getTextInputValue("leave_type").trim().toLowerCase();
  const rawStartDate = interaction.fields.getTextInputValue("leave_start").trim();
  const rawDays = interaction.fields.getTextInputValue("leave_days").trim();
  const reason = interaction.fields.getTextInputValue("leave_reason").trim();

  // Validate start date
  const startDate = parseLeaveDate(rawStartDate);
  if (!startDate) {
    await interaction.editReply({
      content: "❌ รูปแบบวันที่ไม่ถูกต้อง\nตัวอย่างที่ใช้ได้: \"วันนี้\", \"พรุ่งนี้\", หรือ \"29/09/2026\" (วัน/เดือน/ปี)",
    });
    return;
  }

  let leaveType: "SICK" | "PERSONAL" | "VACATION" | "OTHER" = "OTHER";
  let leaveTypeTh = "📝 อื่นๆ (Other)";

  if (rawType.includes("ป่วย") || rawType.includes("sick")) {
    leaveType = "SICK";
    leaveTypeTh = "🤒 ลาป่วย (Sick Leave)";
  } else if (rawType.includes("กิจ") || rawType.includes("personal")) {
    leaveType = "PERSONAL";
    leaveTypeTh = "💼 ลากิจ (Personal Leave)";
  } else if (rawType.includes("พักร้อน") || rawType.includes("vacation")) {
    leaveType = "VACATION";
    leaveTypeTh = "🏖️ ลาพักร้อน (Vacation)";
  }

  const days = Math.max(1, Math.min(30, parseInt(rawDays, 10) || 1));

  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + (days - 1));

  const user = await ensureUser(interaction.user);

  const leaveRequest = await prisma.leaveRequest.create({
    data: {
      userId: user.id,
      leaveType,
      reason,
      startDate,
      endDate,
      days,
      status: "PENDING",
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "ยื่นคำขอลางาน (Modal)",
      category: "LEAVE",
      details: `${user.displayName || user.username} ยื่นขอลางาน ${days} วัน (${leaveType})`,
    },
  });

  // Post notification to review channel if configured or in staff channel
  try {
    const setting = await prisma.setting.findUnique({ where: { key: "attendance_notify_channel" } });
    const targetChannelId = setting?.value || interaction.channelId;
    if (targetChannelId && interaction.guild) {
      const channel = interaction.guild.channels.cache.get(targetChannelId) as TextChannel | undefined;
      if (channel) {
        const defaultReviewEmbed = new EmbedBuilder()
          .setColor(THEME_COLORS.warning)
          .setTitle("📋  NEW LEAVE REQUEST • มีคำขอลางานใหม่")
          .setDescription(
            `ทีมงานได้ทำการยื่นคำขอลางานเข้าสู่ระบบ\n\n` +
            `• **ผู้ยื่นคำขอ:** <@${interaction.user.id}> (${interaction.user.username})\n` +
            `• **ประเภท:** ${leaveTypeTh}\n` +
            `• **วันที่ขอลา:** ${startDate.toLocaleDateString("th-TH")} ถึง ${endDate.toLocaleDateString("th-TH")} (**${days} วัน**)\n` +
            `• **เหตุผล:** ${reason}\n\n` +
            `> สิทธิ์การพิจารณา: หัวหน้างานและผู้ดูแลเซิร์ฟเวอร์\n\n` +
            `-# กรุณากดปุ่มด้านล่างเพื่อดำเนินการพิจารณาคำขอนี้`
          )
          .setFooter({ text: `Leave ID: ${leaveRequest.id}` })
          .setTimestamp();

        const reviewEmbed = await renderCustomEmbed("leave_requested", defaultReviewEmbed, {
          user: `<@${interaction.user.id}>`,
          leave_type: leaveTypeTh,
          start_date: startDate.toLocaleDateString("th-TH"),
          days: `${days} วัน`,
          reason,
        });

        const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`leave_approve:${leaveRequest.id}`)
            .setLabel("อนุมัติ • Approve")
            .setEmoji("✅")
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`leave_reject:${leaveRequest.id}`)
            .setLabel("ปฏิเสธ • Reject")
            .setEmoji("❌")
            .setStyle(ButtonStyle.Danger)
        );

        await channel.send({ embeds: [reviewEmbed], components: [actionRow] });
      }
    }
  } catch (err) {
    console.error("Error posting leave request to review channel:", err);
  }

  const successEmbed = new EmbedBuilder()
    .setColor(THEME_COLORS.success)
    .setTitle("📨  LEAVE REQUEST SUBMITTED • ส่งคำขอลางานเรียบร้อยแล้ว")
    .setDescription(
      `ระบบได้รับคำขอลางานของคุณเรียบร้อยแล้ว\n\n` +
      `• **ประเภทการลา:** ${leaveTypeTh}\n` +
      `• **ช่วงเวลา:** ${startDate.toLocaleDateString("th-TH")} (${days} วัน)\n` +
      `• **เหตุผล:** ${reason}\n` +
      `• **สถานะ:** ⏳ รอการพิจารณา (Pending Review)\n\n` +
      `> ระบบจะส่งการแจ้งเตือนทาง Direct Message (DM) เมื่อหัวหน้างานพิจารณาเสร็จสิ้น`
    )
    .setFooter({ text: "LynnBot Operations System • Staff Leave Service" })
    .setTimestamp();

  await interaction.editReply({ embeds: [successEmbed] });
}

export async function handleMyLeavesStatus(interaction: ButtonInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const user = await ensureUser(interaction.user);

  const leaves = await prisma.leaveRequest.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  if (leaves.length === 0) {
    const embed = new EmbedBuilder()
      .setColor(THEME_COLORS.surface)
      .setTitle("📋  MY LEAVE REQUESTS • ประวัติการลางานของฉัน")
      .setDescription("คุณยังไม่มีประวัติการยื่นคำขอลางานในระบบ")
      .setFooter({ text: "LynnBot Operations System • Leave Service" });

    await interaction.editReply({ embeds: [embed] });
    return;
  }

  const statusIcons: Record<string, string> = {
    PENDING: "⏳ รอพิจารณา (Pending)",
    APPROVED: "✅ อนุมัติแล้ว (Approved)",
    REJECTED: "❌ ไม่อนุมัติ (Rejected)",
    CANCELLED: "⚪ ยกเลิกแล้ว (Cancelled)",
  };

  const typeLabels: Record<string, string> = {
    SICK: "ลาป่วย",
    PERSONAL: "ลากิจ",
    VACATION: "ลาพักร้อน",
    OTHER: "อื่นๆ",
  };

  const lines = leaves.map((l) => {
    const dateStr = l.startDate.toLocaleDateString("th-TH");
    return `• **${typeLabels[l.leaveType] || l.leaveType}** (${dateStr}, ${l.days} วัน) — ${statusIcons[l.status] || l.status}\n  เหตุผล: ${l.reason}`;
  });

  const embed = new EmbedBuilder()
    .setColor(THEME_COLORS.surface)
    .setTitle("📋  MY LEAVE REQUESTS • ประวัติการลางานล่าสุด 5 รายการ")
    .setDescription(
      lines.join("\n\n") +
      `\n\n> หากต้องการยื่นคำขอใหม่ สามารถกดปุ่ม **ยื่นคำขอลางาน** ได้ตลอดเวลา`
    )
    .setFooter({ text: "LynnBot Operations System • Leave Service" })
    .setTimestamp();

  // If there's an active pending leave, offer a cancel button
  const pendingLeave = leaves.find((l) => l.status === "PENDING");
  if (pendingLeave) {
    const cancelRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`leave_cancel:${pendingLeave.id}`)
        .setLabel("ยกเลิกคำขอล่าสุดที่รอดำเนินการ • Cancel Request")
        .setEmoji("❌")
        .setStyle(ButtonStyle.Secondary)
    );
    await interaction.editReply({ embeds: [embed], components: [cancelRow] });
    return;
  }

  await interaction.editReply({ embeds: [embed] });
}

export async function handleLeaveCancel(interaction: ButtonInteraction, leaveId: string) {
  await interaction.deferReply({ ephemeral: true });

  const user = await ensureUser(interaction.user);

  const leave = await prisma.leaveRequest.findUnique({
    where: { id: leaveId },
  });

  if (!leave || leave.userId !== user.id) {
    await interaction.editReply({ content: "❌ ไม่พบคำขอลางาน หรือคุณไม่มีสิทธิ์แก้ไขคำขอนี้" });
    return;
  }

  if (leave.status !== "PENDING") {
    await interaction.editReply({ content: "⚠️ ไม่สามารถยกเลิกคำขอนี้ได้เนื่องจากได้รับการพิจารณาไปแล้ว" });
    return;
  }

  await prisma.leaveRequest.update({
    where: { id: leaveId },
    data: { status: "CANCELLED" },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "ยกเลิกคำขอลางาน",
      category: "LEAVE",
      details: `${user.displayName || user.username} กดยกเลิกคำขอลางานด้วยตนเอง`,
    },
  });

  const embed = new EmbedBuilder()
    .setColor(THEME_COLORS.muted)
    .setTitle("⚪  LEAVE CANCELLED • ยกเลิกคำขอลางานเรียบร้อย")
    .setDescription("คุณได้ทำการยกเลิกคำขอลางานดังกล่าวเรียบร้อยแล้ว")
    .setFooter({ text: "LynnBot Operations System" });

  await interaction.editReply({ embeds: [embed], components: [] });
}

export async function handleLeaveDecisionWithDM(interaction: ButtonInteraction, leaveId: string, isApprove: boolean) {
  try {
    const reviewer = await ensureUser(interaction.user);

    const leave = await prisma.leaveRequest.findUnique({
      where: { id: leaveId },
      include: { user: true },
    });

    if (!leave) {
      await interaction.reply({ content: "❌ ไม่พบข้อมูลคำขอลางานนี้ในระบบ", ephemeral: true });
      return;
    }

    if (leave.status !== "PENDING") {
      await interaction.reply({
        content: `⚠️ คำขอนี้ได้รับการดำเนินการไปแล้ว (สถานะปัจจุบัน: ${leave.status})`,
        ephemeral: true,
      });
      return;
    }

    await prisma.leaveRequest.update({
      where: { id: leaveId },
      data: {
        status: isApprove ? "APPROVED" : "REJECTED",
        reviewedById: reviewer.id,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: reviewer.id,
        action: isApprove ? "อนุมัติคำขอลางาน" : "ปฏิเสธคำขอลางาน",
        category: "LEAVE",
        details: `${reviewer.displayName || reviewer.username} ${isApprove ? "อนุมัติ" : "ปฏิเสธ"} คำขอลาของ ${leave.user.displayName || leave.user.username}`,
      },
    });

    // Update the message in review channel
    const statusText = isApprove ? "✅ ได้รับการอนุมัติแล้ว (Approved)" : "❌ ไม่ได้รับการอนุมัติ (Rejected)";
    const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
      .setColor(isApprove ? THEME_COLORS.success : THEME_COLORS.danger)
      .addFields({
        name: "📌 ผลการพิจารณา",
        value: `${statusText}\nพิจารณาโดย: <@${interaction.user.id}> เมื่อ <t:${Math.floor(Date.now() / 1000)}:R>`,
      });

    await interaction.update({
      embeds: [updatedEmbed],
      components: [],
    });

    // Send DM Notification to applicant
    try {
      const applicantDiscordUser = await interaction.client.users.fetch(leave.user.discordId);
      if (applicantDiscordUser) {
        const dmEmbed = new EmbedBuilder()
          .setColor(isApprove ? THEME_COLORS.success : THEME_COLORS.danger)
          .setTitle("📋  LEAVE REQUEST NOTIFICATION • แจ้งผลการพิจารณาใบลา")
          .setDescription(
            `คำขอลางานของคุณได้รับการพิจารณาเรียบร้อยแล้ว\n\n` +
            `• **สถานะ:** ${statusText}\n` +
            `• **พิจารณาโดย:** <@${interaction.user.id}>\n` +
            `• **ช่วงเวลาลา:** ${leave.startDate.toLocaleDateString("th-TH")} (${leave.days} วัน)\n` +
            `• **เหตุผลเดิม:** ${leave.reason}\n\n` +
            `-# LynnBot Operations System • ติดต่อผู้ดูแลหากมีข้อสงสัยเพิ่มเติม`
          )
          .setFooter({ text: "LynnBot Operations System • Leave Service" })
          .setTimestamp();

        await applicantDiscordUser.send({ embeds: [dmEmbed] });
      }
    } catch (dmErr) {
      // User might have DMs disabled; ignore gracefully
    }
  } catch (err: any) {
    console.error("Error in leave decision handler:", err);
    await interaction.reply({ content: `❌ เกิดข้อผิดพลาด: ${err.message}`, ephemeral: true });
  }
}
