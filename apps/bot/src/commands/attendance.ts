import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { prisma } from "@lynnbot/database";
import type { BotCommand } from "../index.js";

export const attendanceCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("attendance")
    .setDescription("ดูประวัติตอกบัตร")
    .addIntegerOption((option) =>
      option
        .setName("days")
        .setDescription("จำนวนวันย้อนหลัง (ค่าเริ่มต้น 7 วัน)")
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(90)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const days = interaction.options.getInteger("days") || 7;
    const discordId = interaction.user.id;

    const user = await prisma.user.findUnique({
      where: { discordId },
    });

    if (!user) {
      await interaction.editReply({
        content: "🔍 ไม่พบประวัติผู้ใช้ในระบบนะคะ หากต้องการเริ่มบันทึกเวลาปฏิบัติงาน สามารถพิมพ์คำสั่ง `/clockin` ได้เลยค่ะ",
      });
      return;
    }

    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    const attendances = await prisma.attendance.findMany({
      where: {
        userId: user.id,
        clockIn: { gte: fromDate },
      },
      orderBy: { clockIn: "desc" },
      take: 20,
    });

    const totalDays = attendances.length;
    const totalMinutes = attendances.reduce(
      (sum, a) => sum + (a.duration || 0),
      0
    );

    const embed = new EmbedBuilder()
      .setColor(0x2997ff)
      .setAuthor({
        name: user.displayName || user.username,
        iconURL: interaction.user.displayAvatarURL(),
      })
      .setTitle(`📊 สรุปประวัติการปฏิบัติงาน (${days} วันที่ผ่านมา)`)
      .setDescription(
        `• 📋 **จำนวนครั้งที่เข้างาน:** **${totalDays} ครั้ง**\n` +
          `• ⌛ **เวลารวมการปฏิบัติหน้าที่:** **${Math.floor(totalMinutes / 60)} ชั่วโมง ${totalMinutes % 60} นาที**\n\n` +
          (totalDays === 0 ? "> 💡 *ยังไม่มีประวัติการตอกบัตรในช่วงเวลานี้นะคะ*" : "> ✨ *ขอบคุณสำหรับความตั้งใจและหน้าที่ที่รับผิดชอบนะคะ*")
      )
      .setFooter({ text: "Lynn Operations • Attendance History" })
      .setTimestamp();

    if (attendances.length > 0) {
      const historyLines = attendances.slice(0, 8).map((att) => {
        const date = att.clockIn.toLocaleDateString("th-TH", {
          month: "numeric",
          day: "numeric",
        });
        const inTime = att.clockIn.toLocaleTimeString("th-TH", {
          hour: "2-digit",
          minute: "2-digit",
        });
        const outTime = att.clockOut
          ? att.clockOut.toLocaleTimeString("th-TH", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "กำลังทำงานอยู่ ⚡";
        const statusText =
          att.status === "ON_TIME"
            ? "ตรงเวลา ✅"
            : att.status === "LATE"
              ? "สาย ⚠️"
              : "ออกก่อน ℹ️";

        return `• \`${date}\` **${inTime}** - **${outTime}** (${statusText})`;
      });

      embed.addFields({
        name: "📋 รายการบันทึกล่าสุด",
        value: historyLines.join("\n"),
      });
    }

    await interaction.editReply({ embeds: [embed] });
  },
};
