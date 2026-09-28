import {
  type ButtonInteraction,
  type ModalSubmitInteraction,
  type StringSelectMenuInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  type GuildMember,
  type TextChannel,
} from "discord.js";
import { prisma } from "@lynnbot/database";
import { THEME_COLORS } from "../utils/theme.js";
import { createGuildRoleBackup } from "./backupService.js";

/**
 * Ensures user exists in database and returns the record
 */
async function ensureUser(discordUser: { id: string; username: string; displayName?: string; displayAvatarURL: () => string }) {
  return await prisma.user.upsert({
    where: { discordId: discordUser.id },
    update: {
      username: discordUser.username,
      displayName: discordUser.displayName || discordUser.username,
      avatar: discordUser.displayAvatarURL(),
    },
    create: {
      discordId: discordUser.id,
      username: discordUser.username,
      displayName: discordUser.displayName || discordUser.username,
      avatar: discordUser.displayAvatarURL(),
      role: "ADMIN",
    },
  });
}

/**
 * Helper: Find or assign/remove On Duty role
 */
async function toggleOnDutyRole(member: GuildMember | null, assign: boolean) {
  if (!member || !member.guild) return;
  try {
    const setting = await prisma.setting.findUnique({ where: { key: "on_duty_role_id" } });
    let roleId = setting?.value;

    if (!roleId) {
      // Find role named On Duty / เวร
      const found = member.guild.roles.cache.find(
        (r) =>
          r.name.toLowerCase().includes("on duty") ||
          r.name.toLowerCase().includes("onduty") ||
          r.name.includes("เข้าเวร")
      );
      if (found) roleId = found.id;
    }

    if (roleId && member.guild.roles.cache.has(roleId)) {
      if (assign && !member.roles.cache.has(roleId)) {
        await member.roles.add(roleId);
      } else if (!assign && member.roles.cache.has(roleId)) {
        await member.roles.remove(roleId);
      }
    }
  } catch (err) {
    // Ignore role permission errors if bot hierarchy is lower
    console.warn("⚠️ Could not toggle On Duty role:", err);
  }
}

/**
 * ============================================================================
 * 1. ATTENDANCE BUTTON HANDLERS
 * ============================================================================
 */
export async function handleAttendanceClockIn(interaction: ButtonInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const user = await ensureUser(interaction.user);

  const activeAttendance = await prisma.attendance.findFirst({
    where: { userId: user.id, clockOut: null },
  });

  if (activeAttendance) {
    const embed = new EmbedBuilder()
      .setColor(THEME_COLORS.warning)
      .setTitle("⏱️  ATTENDANCE • เข้างานอยู่แล้ว")
      .setDescription(
        `คุณได้ตอกบัตรเข้างานไปแล้วเมื่อ <t:${Math.floor(activeAttendance.clockIn.getTime() / 1000)}:T> (<t:${Math.floor(activeAttendance.clockIn.getTime() / 1000)}:R>)\n\n` +
        `> สถานะปัจจุบัน: กำลังปฏิบัติหน้าที่ (On Duty)\n\n` +
        `-# หากเสร็จสิ้นการปฏิบัติหน้าที่แล้ว กรุณากดปุ่ม "ออกงาน" บนแผงควบคุม`
      )
      .setFooter({ text: "LynnBot Operations System" });

    await interaction.editReply({ embeds: [embed] });
    return;
  }

  const now = new Date();

  await prisma.attendance.create({
    data: {
      userId: user.id,
      clockIn: now,
      status: "ON_TIME",
      channel: interaction.channelId,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "ตอกบัตรเข้างาน (Panel)",
      category: "ATTENDANCE",
      details: `${user.displayName || user.username} ตอกบัตรเข้างานผ่านแผงควบคุม`,
    },
  });

  // Assign On-Duty role if configured
  await toggleOnDutyRole(interaction.member as GuildMember, true);

  // Send notification to log channel if set
  try {
    const setting = await prisma.setting.findUnique({ where: { key: "attendance_notify_channel" } });
    if (setting?.value && interaction.guild) {
      const logChannel = interaction.guild.channels.cache.get(setting.value) as TextChannel | undefined;
      if (logChannel) {
        const logEmbed = new EmbedBuilder()
          .setColor(THEME_COLORS.success)
          .setDescription(`🟢  **เข้างาน** • <@${interaction.user.id}> เริ่มปฏิบัติหน้าที่เมื่อ <t:${Math.floor(now.getTime() / 1000)}:T>`)
          .setTimestamp();
        await logChannel.send({ embeds: [logEmbed] });
      }
    }
  } catch (err) {
    console.error("Attendance log notify error:", err);
  }

  const embed = new EmbedBuilder()
    .setColor(THEME_COLORS.success)
    .setTitle("⏱️  CLOCK-IN RECORDED • บันทึกเวลาเข้างานเรียบร้อย")
    .setDescription(
      `ยินดีต้อนรับสู่กะการปฏิบัติหน้าที่\n\n` +
      `• **เวลาเริ่มงาน:** <t:${Math.floor(now.getTime() / 1000)}:T> (<t:${Math.floor(now.getTime() / 1000)}:R>)\n` +
      `• **สถานะ:** 🟢 เข้างานตรงเวลา (On Time)\n\n` +
      `> ระบบกำลังบันทึกเวลาปฏิบัติหน้าที่ของคุณและซิงค์เข้าสู่ Dashboard\n\n` +
      `-# เมื่อเสร็จสิ้นภารกิจ กรุณากดปุ่ม "ออกงาน • Clock Out" บนแผงควบคุม`
    )
    .setFooter({ text: "LynnBot Operations System • ขอให้เป็นการทำงานที่ราบรื่นครับ" })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

export async function handleAttendanceClockOut(interaction: ButtonInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const user = await ensureUser(interaction.user);

  const activeAttendance = await prisma.attendance.findFirst({
    where: { userId: user.id, clockOut: null },
  });

  if (!activeAttendance) {
    const embed = new EmbedBuilder()
      .setColor(THEME_COLORS.danger)
      .setTitle("⏱️  ATTENDANCE • ไม่พบการเข้างาน")
      .setDescription(
        `ไม่พบประวัติการตอกบัตรเข้างานของคุณในระบบขณะนี้\n\n` +
        `> กรุณากดปุ่ม **เข้างาน • Clock In** ก่อนเพื่อเริ่มบันทึกเวลาปฏิบัติงาน`
      )
      .setFooter({ text: "LynnBot Operations System" });

    await interaction.editReply({ embeds: [embed] });
    return;
  }

  const now = new Date();
  const durationMs = now.getTime() - activeAttendance.clockIn.getTime();
  const durationMinutes = Math.floor(durationMs / (1000 * 60));
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;

  await prisma.attendance.update({
    where: { id: activeAttendance.id },
    data: {
      clockOut: now,
      duration: durationMinutes,
      status: "ON_TIME",
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "ตอกบัตรออกงาน (Panel)",
      category: "ATTENDANCE",
      details: `${user.displayName || user.username} ออกงาน (${hours} ชม. ${minutes} นาที)`,
    },
  });

  // Remove On-Duty role
  await toggleOnDutyRole(interaction.member as GuildMember, false);

  // Send notification to log channel if set
  try {
    const setting = await prisma.setting.findUnique({ where: { key: "attendance_notify_channel" } });
    if (setting?.value && interaction.guild) {
      const logChannel = interaction.guild.channels.cache.get(setting.value) as TextChannel | undefined;
      if (logChannel) {
        const logEmbed = new EmbedBuilder()
          .setColor(THEME_COLORS.danger)
          .setDescription(`🔴  **ออกงาน** • <@${interaction.user.id}> ออกเวรปฏิบัติงาน (${hours} ชม. ${minutes} นาที)`)
          .setTimestamp();
        await logChannel.send({ embeds: [logEmbed] });
      }
    }
  } catch (err) {
    console.error("Attendance log notify error:", err);
  }

  const embed = new EmbedBuilder()
    .setColor(THEME_COLORS.accent)
    .setTitle("🏁  CLOCK-OUT RECORDED • บันทึกเวลาออกงานเรียบร้อย")
    .setDescription(
      `บันทึกการสิ้นสุดกะการทำงานเรียบร้อยแล้ว\n\n` +
      `• **เวลาเข้างาน:** <t:${Math.floor(activeAttendance.clockIn.getTime() / 1000)}:T>\n` +
      `• **เวลาออกงาน:** <t:${Math.floor(now.getTime() / 1000)}:T>\n` +
      `• **ระยะเวลาปฏิบัติงานรวม:** **${hours} ชั่วโมง ${minutes} นาที**\n\n` +
      `> สรุป: ข้อมูลเวลาการทำงานถูกบันทึกลงฐานข้อมูลและแดชบอร์ดเรียบร้อยแล้ว\n\n` +
      `-# LynnBot Operations System • ขอบคุณสำหรับความทุ่มเทในการปฏิบัติหน้าที่`
    )
    .setFooter({ text: "LynnBot Operations System" })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

export async function handleAttendanceStatus(interaction: ButtonInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const user = await ensureUser(interaction.user);

  const activeAttendance = await prisma.attendance.findFirst({
    where: { userId: user.id, clockOut: null },
  });

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const monthAttendances = await prisma.attendance.findMany({
    where: {
      userId: user.id,
      clockIn: { gte: startOfMonth },
      clockOut: { not: null },
    },
  });

  const totalMinutes = monthAttendances.reduce((acc, curr) => acc + (curr.duration || 0), 0);
  const totalHours = Math.floor(totalMinutes / 60);
  const remMinutes = totalMinutes % 60;

  const embed = new EmbedBuilder()
    .setColor(THEME_COLORS.surface)
    .setTitle("📊  MY ATTENDANCE SUMMARY • สถิติการปฏิบัติงานของฉัน")
    .setDescription(
      `ข้อมูลการลงเวลาปฏิบัติหน้าที่ส่วนบุคคล (<@${interaction.user.id}>)\n\n` +
      `• **สถานะปัจจุบัน:** ${activeAttendance ? "🟢 กำลังปฏิบัติหน้าที่ (On Duty)" : "⚪ ออฟไลน์ (Off Duty)"}\n` +
      (activeAttendance
        ? `• **เข้างานตั้งแต่:** <t:${Math.floor(activeAttendance.clockIn.getTime() / 1000)}:T> (<t:${Math.floor(activeAttendance.clockIn.getTime() / 1000)}:R>)\n`
        : "") +
      `• **สถิติประจำเดือนนี้:** เข้างาน ${monthAttendances.length} ครั้ง\n` +
      `• **ชั่วโมงทำงานสะสม:** **${totalHours} ชั่วโมง ${remMinutes} นาที**\n\n` +
      `> ข้อมูลอัปเดตแบบเรียลไทม์ ซิงค์ตรงกับฐานข้อมูลส่วนกลาง`
    )
    .setFooter({ text: "LynnBot Operations System • Time Summary" })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

/**
 * ============================================================================
 * 2. LEAVE REQUEST MODAL & BUTTON HANDLERS
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

export async function handleLeaveModalSubmit(interaction: ModalSubmitInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const rawType = interaction.fields.getTextInputValue("leave_type").trim().toLowerCase();
  const rawStartDate = interaction.fields.getTextInputValue("leave_start").trim();
  const rawDays = interaction.fields.getTextInputValue("leave_days").trim();
  const reason = interaction.fields.getTextInputValue("leave_reason").trim();

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

  // Determine start date
  const now = new Date();
  let startDate = new Date();
  if (rawStartDate.includes("พรุ่งนี้")) {
    startDate.setDate(now.getDate() + 1);
  } else if (!rawStartDate.includes("วันนี้")) {
    const parts = rawStartDate.split(/[\/\-\.]/);
    if (parts.length === 3) {
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const y = parseInt(parts[2], 10);
      const parsed = new Date(y < 100 ? y + 2000 : y, m, d);
      if (!isNaN(parsed.getTime())) startDate = parsed;
    }
  }

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
      const reviewEmbed = new EmbedBuilder()
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
      .setFooter({ text: "LynnBot Operations System" });

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
    .setFooter({ text: "LynnBot Operations System" })
    .setTimestamp();

  // If there's an active pending leave, offer a cancel button
  const pendingLeave = leaves.find((l) => l.status === "PENDING");
  if (pendingLeave) {
    const cancelRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`leave_cancel:${pendingLeave.id}`)
        .setLabel("ยกเลิกคำขอล่าสุดที่รอดำเนินการ • Cancel Request")
        .setEmoji("✕")
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
          .setFooter({ text: "LynnBot Operations System" })
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

/**
 * ============================================================================
 * 3. SHOP & WALLET HANDLERS
 * ============================================================================
 */
export async function handleShopBrowse(interaction: ButtonInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const roles = await prisma.shopRole.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    take: 25,
  });

  if (roles.length === 0) {
    const embed = new EmbedBuilder()
      .setColor(THEME_COLORS.warning)
      .setTitle("🛒  SERVER SHOP • ร้านค้ายศ")
      .setDescription("ขณะนี้ยังไม่มียศเปิดจำหน่ายในระบบ")
      .setFooter({ text: "LynnBot Operations System" });

    await interaction.editReply({ embeds: [embed] });
    return;
  }

  const selectOptions = roles.map((r) => ({
    label: `${r.name} — ฿${r.price.toLocaleString("th-TH")}`,
    description: (r.description?.slice(0, 50) || "สิทธิพิเศษประจำยศ") + (r.stock !== null ? ` (เหลือ ${r.stock})` : ""),
    value: r.id,
    emoji: "🏷️",
  }));

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId("shop_select_role")
    .setPlaceholder("คลิกเลือกยศที่ต้องการสั่งซื้อ (Select a Role)...")
    .addOptions(selectOptions);

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

  const embed = new EmbedBuilder()
    .setColor(THEME_COLORS.surface)
    .setTitle("🛒  AVAILABLE ROLES • รายการยศที่เปิดจำหน่าย")
    .setDescription(
      `พบยศที่เปิดจำหน่ายทั้งหมด **${roles.length} รายการ**\n` +
      `กรุณาคลิกเลือกยศจากเมนูด้านล่าง เพื่อดูข้อมูลและยืนยันการสั่งซื้อ\n\n` +
      "> ระบบจะตรวจสอบยอดเงินในกระเป๋าของคุณก่อนยืนยันการชำระเงิน"
    )
    .setFooter({ text: "LynnBot Operations System • Role Shop" });

  await interaction.editReply({ embeds: [embed], components: [row] });
}

export async function handleShopSelectRole(interaction: StringSelectMenuInteraction) {
  await interaction.deferUpdate();

  const roleId = interaction.values[0];
  const user = await ensureUser(interaction.user);

  const shopRole = await prisma.shopRole.findUnique({
    where: { id: roleId },
  });

  if (!shopRole || !shopRole.isActive) {
    await interaction.editReply({
      content: "❌ ไม่พบยศดังกล่าว หรือยศนี้ถูกปิดจำหน่ายแล้ว",
      embeds: [],
      components: [],
    });
    return;
  }

  const hasEnough = user.balance >= shopRole.price;
  const balanceAfter = user.balance - shopRole.price;

  const embed = new EmbedBuilder()
    .setColor(hasEnough ? THEME_COLORS.accent : THEME_COLORS.warning)
    .setTitle("💳  ORDER CHECKOUT • สรุปรายการสั่งซื้อยศ")
    .setDescription(
      `คุณได้เลือกยศ: **${shopRole.name}**\n\n` +
      `• **ราคายศ:** ฿${shopRole.price.toLocaleString("th-TH")}\n` +
      `• **ยอดเงินปัจจุบันของคุณ:** ฿${user.balance.toLocaleString("th-TH")}\n` +
      `• **ยอดคงเหลือหลังชำระเงิน:** ฿${balanceAfter.toLocaleString("th-TH")}\n` +
      (shopRole.description ? `• **รายละเอียดสิทธิ์:** ${shopRole.description}\n\n` : "\n") +
      (hasEnough
        ? `> ระบบจะทำการหักยอดเงินและมอบยศ Discord ให้อัตโนมัติทันทีหลังยืนยัน\n\n`
        : `> ⚠️ **ยอดเงินของคุณไม่เพียงพอ** กรุณาเติมเงินเข้าระบบก่อนทำรายการสั่งซื้อ\n\n`) +
      `-# กรุณากดยืนยันเพื่อชำระเงิน หรือกดยกเลิกเพื่อเปลี่ยนรายการ`
    )
    .setFooter({ text: "LynnBot Operations System • Checkout Confirmation" });

  const buttonsRow = new ActionRowBuilder<ButtonBuilder>();

  if (hasEnough) {
    buttonsRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`shop_confirm_buy:${shopRole.id}`)
        .setLabel("ยืนยันการสั่งซื้อ • Confirm Buy")
        .setEmoji("💳")
        .setStyle(ButtonStyle.Success)
    );
  } else {
    buttonsRow.addComponents(
      new ButtonBuilder()
        .setCustomId("panel_wallet_topup")
        .setLabel("วิธีเติมเงิน • Top Up")
        .setEmoji("💸")
        .setStyle(ButtonStyle.Primary)
    );
  }

  buttonsRow.addComponents(
    new ButtonBuilder()
      .setCustomId("shop_cancel_checkout")
      .setLabel("ยกเลิก • Cancel")
      .setEmoji("✕")
      .setStyle(ButtonStyle.Secondary)
  );

  await interaction.editReply({ embeds: [embed], components: [buttonsRow] });
}

export async function handleShopConfirmBuy(interaction: ButtonInteraction, roleId: string) {
  await interaction.deferReply({ ephemeral: true });

  const user = await ensureUser(interaction.user);

  const shopRole = await prisma.shopRole.findUnique({
    where: { id: roleId },
  });

  if (!shopRole || !shopRole.isActive) {
    await interaction.editReply({ content: "❌ ไม่พบยศดังกล่าว หรือยศนี้ถูกปิดจำหน่ายแล้ว" });
    return;
  }

  if (user.balance < shopRole.price) {
    await interaction.editReply({
      content: `❌ ยอดเงินของคุณไม่เพียงพอ (ต้องการ ฿${shopRole.price} แต่มี ฿${user.balance})`,
    });
    return;
  }

  // Deduct balance and record transaction
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { balance: { decrement: shopRole.price } },
    }),
    prisma.transaction.create({
      data: {
        userId: user.id,
        roleId: shopRole.id,
        price: shopRole.price,
        status: "COMPLETED",
        note: "สั่งซื้อผ่าน Interactive Panel",
      },
    }),
    prisma.walletTransaction.create({
      data: {
        userId: user.id,
        amount: -shopRole.price,
        type: "PURCHASE",
        note: `สั่งซื้อยศ ${shopRole.name}`,
        createdBy: "SYSTEM",
      },
    }),
    prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "ซื้อยศ (Panel)",
        category: "SHOP",
        details: `${user.displayName || user.username} ซื้อยศ ${shopRole.name} ราคา ฿${shopRole.price}`,
      },
    }),
  ]);

  // Assign Discord Role
  let roleAssigned = false;
  if (interaction.guild && interaction.member) {
    try {
      const member = interaction.member as GuildMember;
      await member.roles.add(shopRole.discordRoleId);
      roleAssigned = true;
    } catch (roleErr) {
      console.error("Failed to assign role to member:", roleErr);
    }
  }

  // Notify log channel if set
  try {
    const setting = await prisma.setting.findUnique({ where: { key: "shop_notify_channel" } });
    if (setting?.value && interaction.guild) {
      const logChannel = interaction.guild.channels.cache.get(setting.value) as TextChannel | undefined;
      if (logChannel) {
        const logEmbed = new EmbedBuilder()
          .setColor(THEME_COLORS.accent)
          .setTitle("🎉  NEW SHOP PURCHASE • มีการสั่งซื้อยศใหม่")
          .setDescription(
            `<@${interaction.user.id}> ได้สั่งซื้อยศ **${shopRole.name}**\n` +
            `• ราคา: ฿${shopRole.price.toLocaleString("th-TH")}\n` +
            `• วันที่ทำรายการ: <t:${Math.floor(Date.now() / 1000)}:f>`
          )
          .setFooter({ text: "LynnBot Shop System" })
          .setTimestamp();
        await logChannel.send({ embeds: [logEmbed] });
      }
    }
  } catch (err) {
    console.error("Shop log notify error:", err);
  }

  const receiptEmbed = new EmbedBuilder()
    .setColor(THEME_COLORS.success)
    .setTitle("🎉  PURCHASE SUCCESSFUL • สั่งซื้อยศสำเร็จ")
    .setDescription(
      `ขอบคุณสำหรับการสนับสนุนเซิร์ฟเวอร์!\n\n` +
      `• **ยศที่ได้รับ:** **${shopRole.name}** (<@&${shopRole.discordRoleId}>)\n` +
      `• **หักยอดเงิน:** ฿${shopRole.price.toLocaleString("th-TH")}\n` +
      `• **ยอดเงินคงเหลือ:** ฿${(user.balance - shopRole.price).toLocaleString("th-TH")}\n\n` +
      (roleAssigned
        ? `> ระบบได้ทำการมอบยศ Discord ให้กับคุณเรียบร้อยแล้ว\n\n`
        : `> ⚠️ ไม่สามารถมอบยศ Discord ได้อัตโนมัติ (กรุณาแจ้งแอดมินเพื่อรับยศ)\n\n`) +
      `-# LynnBot Operations System • ขอให้สนุกกับการใช้งานเซิร์ฟเวอร์ครับ`
    )
    .setFooter({ text: "LynnBot Operations System • Purchase Receipt" })
    .setTimestamp();

  await interaction.editReply({ embeds: [receiptEmbed] });
}

export async function handleWalletBalance(interaction: ButtonInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const user = await ensureUser(interaction.user);

  const embed = new EmbedBuilder()
    .setColor(THEME_COLORS.surface)
    .setTitle("💳  MY WALLET • กระเป๋าเงินของฉัน")
    .setDescription(
      `ข้อมูลยอดเงินคงเหลือของ <@${interaction.user.id}>\n\n` +
      `### ฿${user.balance.toLocaleString("th-TH", { minimumFractionDigits: 2 })}\n\n` +
      `• **สถานะบัญชี:** พร้อมใช้งาน (Active)\n` +
      `• **สิทธิประโยชน์:** ใช้ซื้อยศและบริการเสริมในร้านค้าได้ทันที\n\n` +
      `> ต้องการเติมเงิน สามารถกดปุ่ม **วิธีเติมเงิน** ด้านล่างได้เลยครับ`
    )
    .setFooter({ text: "LynnBot Operations System • Wallet System" })
    .setTimestamp();

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("panel_wallet_topup")
      .setLabel("วิธีเติมเงิน • Top Up Info")
      .setEmoji("💸")
      .setStyle(ButtonStyle.Primary)
  );

  await interaction.editReply({ embeds: [embed], components: [row] });
}

export async function handleWalletTopupInfo(interaction: ButtonInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const setting = await prisma.setting.findUnique({ where: { key: "promptpay_number" } });
  const ppNumber = setting?.value;

  const embed = new EmbedBuilder()
    .setColor(THEME_COLORS.surface)
    .setTitle("💸  WALLET TOP UP • ช่องทางการเติมเงิน")
    .setDescription(
      `ระบบรองรับการเติมเงินเข้ากระเป๋าผ่านระบบ PromptPay และธนาคาร\n\n` +
      (ppNumber
        ? `• **หมายเลขพร้อมเพย์ (PromptPay):** \`${ppNumber}\`\n\n`
        : `• **หมายเลขพร้อมเพย์:** ติดต่อแอดมินผ่าน Ticket\n\n`) +
      `• **หรือใช้คำสั่งสแกน QR Code:** \`/topup amount:จำนวนเงิน\` เพื่อสร้าง QR Code พร้อมเพย์อัตโนมัติ\n\n` +
      `> หลังจากโอนเงิน สามารถกดปุ่ม **เปิดทิกเก็ต** ด้านล่างเพื่อส่งสลิปให้แอดมินปรับยอดเงินให้ทันที`
    )
    .setFooter({ text: "LynnBot Operations System • Wallet Top Up" })
    .setTimestamp();

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket_create")
      .setLabel("เปิดทิกเก็ตแจ้งโอนเงิน • Open Ticket")
      .setEmoji("📩")
      .setStyle(ButtonStyle.Primary)
  );

  await interaction.editReply({ embeds: [embed], components: [row] });
}

/**
 * ============================================================================
 * 4. ADMIN HUB BUTTON HANDLERS
 * ============================================================================
 */
export async function handleAdminStaffList(interaction: ButtonInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const staffUsers = await prisma.user.findMany({
    where: {
      role: { in: ["OWNER", "MANAGER", "ADMIN", "MODERATOR"] },
      isActive: true,
    },
    include: {
      attendances: {
        where: { clockOut: null },
      },
    },
    take: 15,
  });

  const staffLines = staffUsers.map((s) => {
    const isWorking = s.attendances.length > 0;
    const statusText = isWorking ? "🟢 กำลังเข้าเวร" : "⚪ ออฟไลน์";
    return `• <@${s.discordId}> (**${s.role}**) — ${statusText}`;
  });

  const embed = new EmbedBuilder()
    .setColor(THEME_COLORS.purple)
    .setTitle("👥  STAFF ROSTER • สรุปรายชื่อทีมงาน")
    .setDescription(
      `รายชื่อทีมงานทั้งหมด (${staffUsers.length} ท่าน)\n\n` +
      (staffLines.length > 0 ? staffLines.join("\n") : "ยังไม่มีข้อมูลทีมงาน") +
      `\n\n> ซิงค์ข้อมูลกับสิทธิ์การเข้าถึงใน Web Dashboard`
    )
    .setFooter({ text: "LynnBot Operations System • Staff Operations" })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

export async function handleAdminPendingLeaves(interaction: ButtonInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const pendingLeaves = await prisma.leaveRequest.findMany({
    where: { status: "PENDING" },
    include: { user: true },
    orderBy: { createdAt: "asc" },
    take: 5,
  });

  if (pendingLeaves.length === 0) {
    const embed = new EmbedBuilder()
      .setColor(THEME_COLORS.surface)
      .setTitle("⏳  PENDING LEAVES • คำขอลารออนุมัติ")
      .setDescription("✅ ขณะนี้ไม่มีคำขอลางานที่รอดำเนินการ")
      .setFooter({ text: "LynnBot Operations System" });

    await interaction.editReply({ embeds: [embed] });
    return;
  }

  const lines = pendingLeaves.map(
    (l) =>
      `• <@${l.user.discordId}> (${l.leaveType}) วันที่ ${l.startDate.toLocaleDateString("th-TH")} (${l.days} วัน)\n  เหตุผล: ${l.reason}`
  );

  const embed = new EmbedBuilder()
    .setColor(THEME_COLORS.warning)
    .setTitle(`⏳  PENDING LEAVES • มีคำขอลารออนุมัติ ${pendingLeaves.length} รายการ`)
    .setDescription(
      lines.join("\n\n") +
      `\n\n> ท่านสามารถตรวจสอบและกดอนุมัติ/ปฏิเสธได้จากการ์ดแจ้งเตือนในห้อง Staff หรือใน Web Dashboard`
    )
    .setFooter({ text: "LynnBot Operations System" })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

export async function handleAdminBackupServer(interaction: ButtonInteraction) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    await interaction.reply({
      content: "❌ คุณไม่มีสิทธิ์ (Manage Guild) ในการสำรองข้อมูลเซิร์ฟเวอร์",
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  if (!interaction.guild) {
    await interaction.editReply({ content: "❌ คำสั่งนี้สามารถใช้งานได้ในเซิร์ฟเวอร์เท่านั้น" });
    return;
  }

  try {
    const backup = await createGuildRoleBackup(
      interaction.guild,
      `DISCORD:${interaction.user.username}`
    );

    const embed = new EmbedBuilder()
      .setColor(THEME_COLORS.success)
      .setTitle("💾  SERVER BACKUP CREATED • สำรองข้อมูลสำเร็จ")
      .setDescription(
        `บันทึกข้อมูลยศและโครงสร้างสมาชิกเรียบร้อยแล้ว\n\n` +
        `• **ชื่อจุดสำรอง:** **${backup.name}**\n` +
        `• **ยศที่บันทึก:** ${backup.totalRoles} รายการ\n` +
        `• **สมาชิกที่จัดเก็บ:** ${backup.totalMembers} บัญชี\n` +
        `• **เวลาที่บันทึก:** <t:${Math.floor(Date.now() / 1000)}:F>\n\n` +
        `> สามารถตรวจสอบหรือกู้คืนได้ทุกเมื่อผ่านคำสั่ง \`/backup list\` หรือผ่าน Web Dashboard`
      )
      .setFooter({ text: "LynnBot Operations System • Backup Service" })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (err: any) {
    console.error("Backup error from panel:", err);
    await interaction.editReply({
      content: `❌ เกิดข้อผิดพลาดในการสำรองข้อมูล: ${err.message}`,
    });
  }
}
