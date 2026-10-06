import {
  type ButtonInteraction,
  EmbedBuilder,
  type GuildMember,
  type TextChannel,
} from "discord.js";
import { prisma } from "@lynnbot/database";
import { THEME_COLORS } from "../../utils/theme.js";
import { ensureUser, toggleOnDutyRole } from "./common.js";
import { renderCustomEmbed } from "../embedService.js";

/**
 * ============================================================================
 * ATTENDANCE BUTTON HANDLERS
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
      .setFooter({ text: "LynnBot Operations System • Attendance" });

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

  const defaultEmbed = new EmbedBuilder()
    .setColor(THEME_COLORS.success)
    .setTitle("⏱️  CLOCK-IN RECORDED • บันทึกเวลาเข้างานเรียบร้อย")
    .setDescription(
      `ยินดีต้อนรับสู่กะการปฏิบัติหน้าที่\n\n` +
      `• **เวลาเริ่มงาน:** <t:${Math.floor(now.getTime() / 1000)}:T> (<t:${Math.floor(now.getTime() / 1000)}:R>)\n` +
      `• **สถานะ:** 🟢 เข้างานตรงเวลา (On Time)\n\n` +
      `> ระบบกำลังบันทึกเวลาปฏิบัติหน้าที่ของคุณและซิงค์เข้าสู่ Dashboard\n\n` +
      `-# เมื่อเสร็จสิ้นภารกิจ กรุณากดปุ่ม "ออกงาน • Clock Out" บนแผงควบคุม`
    )
    .setFooter({ text: "LynnBot Operations System • Attendance" })
    .setTimestamp();

  const embed = await renderCustomEmbed("attendance_clockin", defaultEmbed, {
    user: `<@${interaction.user.id}>`,
    time: `<t:${Math.floor(now.getTime() / 1000)}:T>`,
    role_status: "รับยศ On-Duty เรียบร้อยแล้ว",
  });

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
      .setFooter({ text: "LynnBot Operations System • Attendance" });

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

  const defaultEmbed = new EmbedBuilder()
    .setColor(THEME_COLORS.success)
    .setTitle("🏁  CLOCK-OUT RECORDED • บันทึกเวลาออกงานเรียบร้อย")
    .setDescription(
      `บันทึกการสิ้นสุดกะการทำงานเรียบร้อยแล้ว\n\n` +
      `• **เวลาเข้างาน:** <t:${Math.floor(activeAttendance.clockIn.getTime() / 1000)}:T>\n` +
      `• **เวลาออกงาน:** <t:${Math.floor(now.getTime() / 1000)}:T>\n` +
      `• **ระยะเวลาปฏิบัติงานรวม:** **${hours} ชั่วโมง ${minutes} นาที**\n\n` +
      `> สรุป: ข้อมูลเวลาการทำงานถูกบันทึกลงฐานข้อมูลและแดชบอร์ดเรียบร้อยแล้ว\n\n` +
      `-# LynnBot Operations System • ขอบคุณสำหรับความทุ่มเทในการปฏิบัติหน้าที่`
    )
    .setFooter({ text: "LynnBot Operations System • Attendance" })
    .setTimestamp();

  const embed = await renderCustomEmbed("attendance_clockout", defaultEmbed, {
    user: `<@${interaction.user.id}>`,
    clock_in_time: `<t:${Math.floor(activeAttendance.clockIn.getTime() / 1000)}:T>`,
    clock_out_time: `<t:${Math.floor(now.getTime() / 1000)}:T>`,
    duration: `${hours} ชั่วโมง ${minutes} นาที`,
  });

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
    .setColor(activeAttendance ? THEME_COLORS.success : THEME_COLORS.accent)
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
    .setFooter({ text: "LynnBot Operations System • Attendance" })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}
