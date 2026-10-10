import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import type { BotCommand } from "../index.js";

export const helpCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("คู่มือคำสั่งการใช้งาน"),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(0x2997ff)
      .setTitle("📖 คู่มือและคำสั่งการใช้งาน • Lynn Assistant")
      .setDescription(
        [
          "ยินดีต้อนรับสู่ระบบ **LynnBot Operations** นะคะ! ด้านล่างนี้คือคำสั่งทั้งหมดที่สามารถใช้งานได้ค่ะ ✨",
          "",
          "**👤 ข้อมูลส่วนบุคคล (Self-Service)**",
          "• `/me` — ดูโปรไฟล์ ยอดเงินคงเหลือ เหรียญรางวัล (Badge) และสถิติรวม",
          "• `/balance` — ตรวจสอบยอดเงินในกระเป๋าดิจิทัล พร้อมปุ่มส่งสลิป",
          "• `/myslips [status]` — ติดตามสถานะสลิปโอนเงินที่ส่งเข้าระบบ",
          "• `/mytickets [status]` — ตรวจสอบรายการทิกเก็ตขอความช่วยเหลือ",
          "",
          "**⏰ ระบบบันทึกเวลาทำงาน (Attendance)**",
          "• `/clockin [note]` — บันทึกเวลาเริ่มงาน พร้อมหมายเหตุ",
          "• `/clockout [note]` — บันทึกเวลาออกงาน พร้อมสรุปชั่วโมงทำงาน",
          "• `/attendance [days]` — ตรวจสอบสรุปประวัติการเข้างานย้อนหลัง",
          "",
          "**🛒 ร้านค้ายศและไอเทม (Role Store)**",
          "• `/shop [category]` — เลือกดูรายการยศและสิทธิพิเศษที่เปิดจำหน่าย",
          "• `/buy <role>` — สั่งซื้อยศและรับบทบาทอัตโนมัติ",
          "",
          "**👑 เครื่องมือผู้ดูแลระบบ (Admin Tools)**",
          "• `/admin list` — ตรวจสอบรายชื่อทีมงานและสถานะปฏิบัติหน้าที่",
          "• `/admin info <user>` — ดูประวัติและข้อมูลงานของแอดมิน",
          "• `/userinfo <user>` — ตรวจสอบประวัติสมาชิกแบบเจาะลึก (X-ray)",
          "",
          `> 🌐 **ระบบจัดการผ่านเว็บ:** [คลิกเปิด Web Dashboard](${process.env.NEXTAUTH_URL || "http://localhost:3000"})`,
        ].join("\n")
      )
      .setFooter({ text: "Lynn Operations • Pro Minimal Dark" })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
