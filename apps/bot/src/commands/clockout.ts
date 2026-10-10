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
        content: "🔍 ไม่พบประวัติผู้ใช้ในระบบนะคะ หากต้องการเปิดกะ สามารถพิมพ์คำสั่ง `/clockin` ได้เลยค่ะ",
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
        .setTitle("🔍 ไม่พบบันทึกเวลาเข้างานในรอบนี้")
        .setDescription(
          "ดูเหมือนคุณยังไม่ได้กดตอกบัตรเข้างานนะคะ\n\n> 💡 หากกำลังเริ่มต้นปฏิบัติหน้าที่ สามารถพิมพ์คำสั่ง `/clockin` เพื่อเปิดกะได้ทันทีเลยค่ะ"
        )
        .setFooter({ text: "Lynn Operations • Attendance System" });

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
      .setColor(0x2997ff)
      .setAuthor({
        name: interaction.user.displayName || interaction.user.username,
        iconURL: interaction.user.displayAvatarURL(),
      })
      .setTitle("🎉 บันทึกเวลาออกงานเรียบร้อย ขอบคุณสำหรับความทุ่มเทค่ะ!")
      .setDescription(
        `เหนื่อยหน่อยนะคะในกะนี้ พักผ่อนให้เต็มที่แล้วพบกันใหม่รอบหน้าน้า ✨\n\n` +
          `• ⏱️ **เวลาเข้างาน:** <t:${Math.floor(activeAttendance.clockIn.getTime() / 1000)}:T>\n` +
          `• 🏁 **เวลาออกงาน:** <t:${Math.floor(clockOut.getTime() / 1000)}:T>\n` +
          `• ⌛ **ระยะเวลาปฏิบัติหน้าที่รวม:** **${hours} ชั่วโมง ${minutes} นาที**${
            note ? `\n• 📝 **บันทึกช่วยจำ:** ${note}` : ""
          }`
      )
      .setFooter({ text: "Lynn Operations • Attendance System" })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
