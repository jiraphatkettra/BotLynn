import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
} from "discord.js";
import { prisma } from "@lynnbot/database";
import type { BotCommand } from "../index.js";

export const leaveCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("leave")
    .setDescription("ระบบแจ้งลางานสำหรับทีมงาน (Staff Leave System)")
    .addSubcommand((sub) =>
      sub
        .setName("request")
        .setDescription("ยื่นคำขอลางาน")
        .addStringOption((opt) =>
          opt
            .setName("type")
            .setDescription("ประเภทการลา")
            .setRequired(true)
            .addChoices(
              { name: "🤒 ลาป่วย (Sick Leave)", value: "SICK" },
              { name: "💼 ลากิจ (Personal Leave)", value: "PERSONAL" },
              { name: "🏖️ ลาพักร้อน (Vacation)", value: "VACATION" },
              { name: "📝 อื่นๆ (Other)", value: "OTHER" }
            )
        )
        .addStringOption((opt) =>
          opt
            .setName("reason")
            .setDescription("เหตุผลการลา")
            .setRequired(true)
        )
        .addIntegerOption((opt) =>
          opt
            .setName("days")
            .setDescription("จำนวนวันที่ขอลา (ค่าเริ่มต้น 1 วัน)")
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(30)
        )
        .addStringOption((opt) =>
          opt
            .setName("start_date")
            .setDescription("วันที่เริ่มลา (เช่น พรุ่งนี้ หรือ 28/09/2026)")
            .setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub.setName("status").setDescription("ตรวจสอบสถานะคำขอลางานของตนเอง")
    )
    .addSubcommand((sub) =>
      sub
        .setName("list")
        .setDescription("ดูรายการคำขอลางานทั้งหมดที่รออนุมัติ (เฉพาะแอดมิน)")
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const discordId = interaction.user.id;

    // Upsert user
    const user = await prisma.user.upsert({
      where: { discordId },
      update: {
        username: interaction.user.username,
        displayName: interaction.user.displayName || interaction.user.username,
      },
      create: {
        discordId,
        username: interaction.user.username,
        displayName: interaction.user.displayName || interaction.user.username,
        role: "ADMIN",
      },
    });

    if (sub === "request") {
      await interaction.deferReply({ ephemeral: true });

      const leaveType = interaction.options.getString("type", true) as any;
      const days = interaction.options.getInteger("days") || 1;
      const reason = interaction.options.getString("reason", true);
      const startDateStr = interaction.options.getString("start_date");

      const startDate = new Date();
      if (startDateStr) {
        const parsed = new Date(startDateStr);
        if (!isNaN(parsed.getTime())) {
          startDate.setTime(parsed.getTime());
        }
      }

      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + (days - 1));

      const leave = await prisma.leaveRequest.create({
        data: {
          userId: user.id,
          leaveType,
          days,
          reason,
          startDate,
          endDate,
          status: "PENDING",
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "LEAVE_REQUESTED",
          category: "LEAVE",
          details: `${user.displayName || user.username} ยื่นขอลางาน (${leaveType}, ${days} วัน): ${reason}`,
        },
      });

      const typeLabels: Record<string, string> = {
        SICK: "🤒 ลาป่วย",
        PERSONAL: "💼 ลากิจ",
        VACATION: "🏖️ ลาพักร้อน",
        OTHER: "📝 อื่นๆ",
      };

      const embed = new EmbedBuilder()
        .setColor(0xff9500)
        .setTitle("📝 ยื่นคำขอลางานเรียบร้อยแล้ว")
        .setDescription(
          `ระบบได้ส่งคำขอลางานของคุณไปยังทีมบริหารเรียบร้อยแล้ว\n\n` +
            `• **ประเภทการลา:** ${typeLabels[leaveType] || leaveType}\n` +
            `• **จำนวนวัน:** ${days} วัน\n` +
            `• **ตั้งแต่วันที่:** ${startDate.toLocaleDateString("th-TH")}\n` +
            `• **ถึงวันที่:** ${endDate.toLocaleDateString("th-TH")}\n` +
            `• **เหตุผล:** ${reason}\n` +
            `• **สถานะ:** 🟡 รอการอนุมัติ (PENDING)`
        )
        .setFooter({ text: "LynnBot Leave System • รหัส: " + leave.id.slice(0, 8) })
        .setTimestamp();

      // Check if there is an attendance notify channel to post the request with action buttons
      const setting = await prisma.setting.findUnique({
        where: { key: "attendance_notify_channel" },
      });

      if (setting?.value && interaction.guild) {
        const notifyChannel = interaction.guild.channels.cache.get(
          setting.value
        ) as any;

        if (notifyChannel && notifyChannel.isTextBased()) {
          const notifyEmbed = new EmbedBuilder()
            .setColor(0xff9500)
            .setTitle("🌴 มีคำขอลางานใหม่ (Staff Leave Request)")
            .setDescription(
              `ทีมงาน <@${interaction.user.id}> ได้ยื่นคำขอลางาน\n\n` +
                `• **ผู้ขอลา:** ${user.displayName || user.username} (@${user.username})\n` +
                `• **ประเภท:** ${typeLabels[leaveType] || leaveType}\n` +
                `• **จำนวน:** ${days} วัน (${startDate.toLocaleDateString("th-TH")} - ${endDate.toLocaleDateString("th-TH")})\n` +
                `• **เหตุผล:** ${reason}`
            )
            .setFooter({ text: `Leave ID: ${leave.id}` })
            .setTimestamp();

          const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setCustomId(`leave_approve:${leave.id}`)
              .setLabel("อนุมัติการลา")
              .setStyle(ButtonStyle.Success)
              .setEmoji("✅"),
            new ButtonBuilder()
              .setCustomId(`leave_reject:${leave.id}`)
              .setLabel("ไม่อนุมัติ")
              .setStyle(ButtonStyle.Danger)
              .setEmoji("❌")
          );

          await notifyChannel.send({ embeds: [notifyEmbed], components: [row] });
        }
      }

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (sub === "status") {
      await interaction.deferReply({ ephemeral: true });

      const leaves = await prisma.leaveRequest.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { reviewedBy: true },
      });

      if (leaves.length === 0) {
        await interaction.editReply({ content: "คุณยังไม่มีประวัติการยื่นขอลางาน" });
        return;
      }

      const typeLabels: Record<string, string> = {
        SICK: "🤒 ลาป่วย",
        PERSONAL: "💼 ลากิจ",
        VACATION: "🏖️ ลาพักร้อน",
        OTHER: "📝 อื่นๆ",
      };

      const statusLabels: Record<string, string> = {
        PENDING: "🟡 รอพิจารณา",
        APPROVED: "🟢 อนุมัติแล้ว",
        REJECTED: "🔴 ไม่อนุมัติ",
        CANCELLED: "⚪ ยกเลิก",
      };

      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle(`ประวัติการขอลางาน • ${user.displayName || user.username}`)
        .setDescription(
          leaves
            .map(
              (l) =>
                `• **${typeLabels[l.leaveType]}** (${l.days} วัน): ` +
                `${statusLabels[l.status]}\n  ` +
                `วันที่: \`${new Date(l.startDate).toLocaleDateString("th-TH")}\` | เหตุผล: ${l.reason}` +
                (l.reviewedBy ? ` | ผู้พิจารณา: ${l.reviewedBy.username}` : "")
            )
            .join("\n\n")
        )
        .setFooter({ text: "LynnBot Leave System" })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (sub === "list") {
      await interaction.deferReply({ ephemeral: true });

      const pendingLeaves = await prisma.leaveRequest.findMany({
        where: { status: "PENDING" },
        include: { user: true },
        orderBy: { createdAt: "asc" },
      });

      if (pendingLeaves.length === 0) {
        await interaction.editReply({
          content: "✅ ไม่มีคำขอลางานที่ค้างรอพิจารณาในขณะนี้",
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(0xff9500)
        .setTitle(`📋 รายการขอลางานที่รออนุมัติ (${pendingLeaves.length} รายการ)`)
        .setDescription(
          pendingLeaves
            .map(
              (l) =>
                `• **${l.user.displayName || l.user.username}** (@${l.user.username})\n` +
                `  ประเภท: ${l.leaveType} | ${l.days} วัน (\`${new Date(l.startDate).toLocaleDateString("th-TH")}\`)\n` +
                `  เหตุผล: ${l.reason}\n` +
                `  ID: \`${l.id}\``
            )
            .join("\n\n") +
            `\n\n*สามารถกดอนุมัติหรือปฏิเสธได้ผ่านการแจ้งเตือนในห้อง Discord หรือหน้า Web Dashboard*`
        )
        .setFooter({ text: "LynnBot Leave Management" })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    }
  },
};
