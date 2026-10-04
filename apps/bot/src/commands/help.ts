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
          "**👤 ข้อมูลส่วนตัว (Self-Service)**",
          "`/me` — ดูโปรไฟล์ ยอดเงิน Badge และข้อมูลรวมของตัวเอง",
          "`/balance` — เช็คยอดเงินคงเหลือในกระเป๋า",
          "`/myslips [status]` — ดูประวัติสลิปที่ส่ง",
          "`/mytickets [status]` — ดูทิกเก็ตที่เปิดไว้",
          "",
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
          "`/userinfo <user>` — ดูข้อมูลรวมของสมาชิก (X-ray)",
          "`/welcome test` — ทดสอบส่งข้อความต้อนรับ Embed",
          "`/welcome setup` — ตั้งค่าห้องและข้อความต้อนรับ",
          "",
          `**เว็บแดชบอร์ด:** ${process.env.NEXTAUTH_URL || "http://localhost:3000"}`,
        ].join("\n")
      )
      .setFooter({ text: "LynnBot" });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
