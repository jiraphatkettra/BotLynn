import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { prisma } from "@lynnbot/database";
import type { BotCommand } from "../index.js";

export const clockoutCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("clockout")
    .setDescription("ตอกบัตรออกงาน")
    .addStringOption((option) =>
      option
        .setName("note")
        .setDescription("หมายเหตุเพิ่มเติม")
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const discordId = interaction.user.id;
    const note = interaction.options.getString("note");

    const user = await prisma.user.findUnique({
      where: { discordId },
    });

    if (!user) {
      await interaction.editReply({
        content: "ไม่พบข้อมูลผู้ใช้ กรุณาตอกบัตรเข้างานก่อน (`/clockin`)",
      });
      return;
    }

    const activeAttendance = await prisma.attendance.findFirst({
      where: {
        userId: user.id,
        clockOut: null,
      },
    });

    if (!activeAttendance) {
      const embed = new EmbedBuilder()
        .setColor(0xff453a)
        .setTitle("ไม่พบการตอกบัตรเข้างาน")
        .setDescription("คุณยังไม่ได้ตอกบัตรเข้างาน ใช้คำสั่ง `/clockin` เพื่อเริ่มงาน")
        .setFooter({ text: "LynnBot" });

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    const clockOut = new Date();
    const durationMs = clockOut.getTime() - activeAttendance.clockIn.getTime();
    const durationMinutes = Math.floor(durationMs / (1000 * 60));
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;

    await prisma.attendance.update({
      where: { id: activeAttendance.id },
      data: {
        clockOut,
        duration: durationMinutes,
        status: "ON_TIME",
        note: note || activeAttendance.note,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "ตอกบัตรออกงาน",
        category: "ATTENDANCE",
        details: `${user.displayName || user.username} ตอกบัตรออกงาน (${hours} ชม. ${minutes} นาที)`,
      },
    });

    const embed = new EmbedBuilder()
      .setColor(0x000000)
      .setAuthor({
        name: interaction.user.displayName || interaction.user.username,
        iconURL: interaction.user.displayAvatarURL(),
      })
      .setTitle("🏁 บันทึกเวลาออกงานเรียบร้อย")
      .setDescription(
        `• **เวลาเข้างาน:** <t:${Math.floor(activeAttendance.clockIn.getTime() / 1000)}:T>\n` +
          `• **เวลาออกงาน:** <t:${Math.floor(clockOut.getTime() / 1000)}:T>\n` +
          `• **ระยะเวลาปฏิบัติงานรวม:** **${hours} ชม. ${minutes} นาที**${
            note ? `\n• **หมายเหตุ:** ${note}` : ""
          }`
      )
      .setFooter({ text: "LynnBot Attendance System" })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
