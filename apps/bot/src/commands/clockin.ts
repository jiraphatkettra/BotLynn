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
        .setTitle("ตอกบัตรเข้างานอยู่แล้ว")
        .setDescription(
          `เข้างานเมื่อ <t:${Math.floor(existingClockin.clockIn.getTime() / 1000)}:R>\nใช้ \`/clockout\` เมื่อต้องการตอกบัตรออก`
        )
        .setFooter({ text: "LynnBot" });

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
      .setColor(0x000000)
      .setAuthor({
        name: interaction.user.displayName || interaction.user.username,
        iconURL: interaction.user.displayAvatarURL(),
      })
      .setTitle("⏱️ บันทึกเวลาเข้างานเรียบร้อย")
      .setDescription(
        `เข้างานเวลา: <t:${Math.floor(now.getTime() / 1000)}:T> (<t:${Math.floor(now.getTime() / 1000)}:R>)${
          note ? `\nหมายเหตุ: ${note}` : ""
        }\n\nเมื่อเสร็จสิ้นการปฏิบัติงาน สามารถใช้คำสั่ง \`/clockout\` เพื่อบันทึกเวลาออกงาน`
      )
      .setFooter({ text: "LynnBot Attendance System" })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
