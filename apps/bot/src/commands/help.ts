import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import type { BotCommand } from "../index.js";

export const helpCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("คู่มือคำสั่งการใช้งาน"),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(0x2997ff)
      .setTitle("คำสั่งการใช้งาน LynnBot")
      .setDescription(
        [
          "**ระบบตอกบัตร**",
          "`/clockin [note]` — ตอกบัตรเข้างาน",
          "`/clockout [note]` — ตอกบัตรออกงาน",
          "`/attendance [days]` — ประวัติตอกบัตร",
          "",
          "**ร้านค้ายศ**",
          "`/shop [category]` — ดูรายการยศที่มีจำหน่าย",
          "`/buy <role>` — ซื้อยศ",
          "",
          "**จัดการแอดมิน** (สำหรับผู้ดูแล)",
          "`/admin list` — รายชื่อแอดมิน",
          "`/admin info <user>` — ข้อมูลแอดมิน",
          "`/admin setrole <user> <role>` — กำหนดตำแหน่ง",
          "",
          `**เว็บแดชบอร์ด:** ${process.env.NEXTAUTH_URL || "http://localhost:3000"}`,
        ].join("\n")
      )
      .setFooter({ text: "LynnBot" });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
