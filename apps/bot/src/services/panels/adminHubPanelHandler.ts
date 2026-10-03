import {
  type ButtonInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
} from "discord.js";
import { prisma } from "@lynnbot/database";
import { THEME_COLORS } from "../../utils/theme.js";
import { createGuildRoleBackup } from "../backupService.js";

/**
 * ============================================================================
 * ADMIN HUB BUTTON HANDLERS
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
