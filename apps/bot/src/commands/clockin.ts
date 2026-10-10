import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { prisma } from "@lynnbot/database";
import type { BotCommand } from "../index.js";

export const clockinCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("clockin")
    .setDescription("ตอกบัตรเข้างาน")
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

    let user = await prisma.user.findUnique({
      where: { discordId },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          discordId,
          username: interaction.user.username,
          displayName:
            interaction.user.displayName || interaction.user.username,
          avatar: interaction.user.displayAvatarURL(),
        },
      });
    }

    const existingClockin = await prisma.attendance.findFirst({
      where: {
        userId: user.id,
        clockOut: null,
      },
    });

    if (existingClockin) {
      const embed = new EmbedBuilder()
        .setColor(0xffd60a)
        .setAuthor({
          name: interaction.user.displayName || interaction.user.username,
          iconURL: interaction.user.displayAvatarURL(),
        })
        .setTitle("⚠️ คุณอยู่ในช่วงปฏิบัติงานอยู่แล้วนะคะ")
        .setDescription(
          `ระบบตรวจพบบันทึกการเข้างานของคุณเมื่อ <t:${Math.floor(existingClockin.clockIn.getTime() / 1000)}:R>\n\n> 💡 เมื่อเสร็จสิ้นภารกิจ สามารถพิมพ์คำสั่ง \`/clockout\` เพื่อบันทึกเวลาออกงานและสรุปชั่วโมงงานได้เลยค่ะ`
        )
        .setFooter({ text: "Lynn Operations • Attendance System" });

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    const now = new Date();

    await prisma.attendance.create({
      data: {
        userId: user.id,
        clockIn: now,
        status: "ON_TIME",
        note,
        channel: interaction.channelId,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "ตอกบัตรเข้างาน",
        category: "ATTENDANCE",
        details: `${user.displayName || user.username} ตอกบัตรเข้างาน`,
      },
    });

    const embed = new EmbedBuilder()
      .setColor(0x30d158)
      .setAuthor({
        name: interaction.user.displayName || interaction.user.username,
        iconURL: interaction.user.displayAvatarURL(),
      })
      .setTitle("✨ บันทึกเวลาเข้างานเรียบร้อยแล้วค่ะ")
      .setDescription(
        `ยินดีต้อนรับสู่กะการทำงานนะคะ ขอให้เป็นวันที่ราบรื่นและมีพลังใจเต็มเปี่ยมค่ะ!\n\n` +
          `• ⏱️ **เริ่มงาน:** <t:${Math.floor(now.getTime() / 1000)}:T> (<t:${Math.floor(now.getTime() / 1000)}:R>)\n` +
          `${note ? `• 📝 **บันทึกช่วยจำ:** ${note}\n` : ""}\n` +
          `> 💡 เมื่อปฏิบัติงานเสร็จสิ้น สามารถพิมพ์คำสั่ง \`/clockout\` เพื่อสรุปเวลาออกงานได้เลยนะคะ`
      )
      .setFooter({ text: "Lynn Operations • Attendance System" })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
