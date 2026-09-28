import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";
import { THEME_COLORS } from "../utils/theme.js";

/**
 * 1. Attendance Panel (แผงตอกบัตรเข้า-ออกงาน)
 */
export function buildAttendancePanel() {
  const embed = new EmbedBuilder()
    .setColor(THEME_COLORS.surface)
    .setTitle("⏱️  ATTENDANCE STATION • ระบบลงเวลาปฏิบัติงาน")
    .setDescription(
      "บันทึกเวลาการเข้าและออกเวรสำหรับทีมงาน LynnBot\n" +
      "ระบบจะทำการบันทึกและซิงค์สถิติเข้าสู่ Web Dashboard อัตโนมัติ\n\n" +
      "> สถานะระบบ: พร้อมใช้งาน (Active) • 24/7 Time Tracking\n\n" +
      "-# กรุณากดปุ่มเพื่อบันทึกเวลาตามจริง การทำงานของปุ่มจะแสดงผลแบบส่วนตัว (Ephemeral)"
    )
    .setFooter({ text: "LynnBot Operations System • Attendance Station" })
    .setTimestamp();

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("panel_att_in")
      .setLabel("เข้างาน • Clock In")
      .setEmoji("🟢")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("panel_att_out")
      .setLabel("ออกงาน • Clock Out")
      .setEmoji("🔴")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId("panel_att_status")
      .setLabel("บันทึกของฉัน • My Status")
      .setEmoji("📊")
      .setStyle(ButtonStyle.Secondary)
  );

  return { embeds: [embed], components: [row] };
}

/**
 * 2. Leave Request Panel (แผงยื่นคำขอลางาน)
 */
export function buildLeavePanel() {
  const embed = new EmbedBuilder()
    .setColor(THEME_COLORS.surface)
    .setTitle("📝  STAFF LEAVE SYSTEM • ระบบยื่นคำขอลางาน")
    .setDescription(
      "บริการยื่นใบลาสำหรับทีมงานและบุคลากรทุกฝ่าย\n" +
      "รองรับการลาป่วย (Sick), ลากิจ (Personal) และลาพักร้อน (Vacation)\n\n" +
      "> การดำเนินงาน: เมื่อยื่นคำขอ ระบบจะส่งให้หัวหน้างานพิจารณา และแจ้งเตือนผลผ่าน DM\n\n" +
      "-# สมาชิกสามารถยื่นคำขอใหม่ หรือตรวจสอบสถานะใบลาเดิมได้จากปุ่มด้านล่าง"
    )
    .setFooter({ text: "LynnBot Operations System • Staff Leave Service" })
    .setTimestamp();

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("panel_leave_request")
      .setLabel("ยื่นคำขอลางาน • Request Leave")
      .setEmoji("📝")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("panel_leave_status")
      .setLabel("เช็คสถานะใบลา • My Requests")
      .setEmoji("🔍")
      .setStyle(ButtonStyle.Secondary)
  );

  return { embeds: [embed], components: [row] };
}

/**
 * 3. Shop & Wallet Panel (แผงร้านค้ายศ & กระเป๋าเงิน)
 */
export function buildShopPanel() {
  const embed = new EmbedBuilder()
    .setColor(THEME_COLORS.surface)
    .setTitle("🛒  SERVER SHOP & WALLET • ร้านค้ายศและบริการ")
    .setDescription(
      "เลือกซื้อยศพิเศษและสิทธิประโยชน์เพื่อร่วมสนับสนุนเซิร์ฟเวอร์\n" +
      "ชำระเงินผ่านกระเป๋าเงิน (Wallet) พร้อมระบบมอบยศให้อัตโนมัติ 24 ชม.\n\n" +
      "> ระบบการซื้อ: เลือกดูรายการยศ ตรวจสอบราคา และกดยืนยันชำระเงินได้อย่างปลอดภัย\n\n" +
      "-# สามารถตรวจสอบยอดเงินคงเหลือของคุณได้ตลอดเวลาผ่านปุ่มด้านล่าง"
    )
    .setFooter({ text: "LynnBot Operations System • Shop & Economy" })
    .setTimestamp();

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("panel_shop_browse")
      .setLabel("เลือกซื้อยศ • Browse Roles")
      .setEmoji("🛒")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("panel_wallet_balance")
      .setLabel("กระเป๋าเงิน • My Wallet")
      .setEmoji("💳")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("panel_wallet_topup")
      .setLabel("วิธีเติมเงิน • Top Up Info")
      .setEmoji("💸")
      .setStyle(ButtonStyle.Secondary)
  );

  return { embeds: [embed], components: [row] };
}

/**
 * 4. Ticket Support Panel (แผงศูนย์บริการและช่วยเหลือ)
 */
export function buildTicketPanel() {
  const embed = new EmbedBuilder()
    .setColor(THEME_COLORS.surface)
    .setTitle("📩  TICKET SUPPORT • ศูนย์บริการช่วยเหลือ & ติดต่อทีมงาน")
    .setDescription(
      "หากคุณพบปัญหา แจ้งปัญหาการซื้อยศ ติดต่อทีมงาน หรือต้องการสอบถามข้อมูล\n" +
      "สามารถกดปุ่มด้านล่างเพื่อเปิดห้องสนทนาส่วนตัว (Private Ticket) ได้ทันที\n\n" +
      "> ความเป็นส่วนตัว: มีเฉพาะคุณและทีมผู้ดูแลเท่านั้นที่มองเห็นห้องสนทนานี้\n\n" +
      "-# ทีมงานพร้อมให้ความช่วยเหลือและตอบกลับอย่างรวดเร็วที่สุด"
    )
    .setFooter({ text: "LynnBot Operations System • Ticket Helpdesk" })
    .setTimestamp();

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket_create")
      .setLabel("เปิดทิกเก็ตติดต่อทีมงาน • Open Ticket")
      .setEmoji("📩")
      .setStyle(ButtonStyle.Primary)
  );

  return { embeds: [embed], components: [row] };
}

/**
 * 5. Admin Hub Panel (แผงควบคุมสำหรับห้อง Staff ส่วนตัว)
 */
export function buildAdminHubPanel() {
  const embed = new EmbedBuilder()
    .setColor(THEME_COLORS.surface)
    .setTitle("🛡️  STAFF CONTROL HUB • แผงควบคุมด่วนสำหรับทีมงาน")
    .setDescription(
      "ศูนย์รวมคำสั่งปฏิบัติการด่วนสำหรับแอดมินและผู้ดูแลเซิร์ฟเวอร์\n" +
      "เข้าถึงข้อมูลและสั่งการระบบได้ทันทีโดยไม่ต้องพิมพ์คำสั่ง Slash Command\n\n" +
      "> สิทธิ์การเข้าถึง: เจ้าหน้าที่และผู้ดูแลเซิร์ฟเวอร์เท่านั้น (Staff Only)\n\n" +
      "-# ทุกการกระทำจะถูกบันทึกลง Audit Logs และส่งซิงค์เข้า Dashboard"
    )
    .setFooter({ text: "LynnBot Operations System • Staff Operations" })
    .setTimestamp();

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("panel_admin_staff")
      .setLabel("รายชื่อทีมงาน • Staff List")
      .setEmoji("👥")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("panel_admin_leaves")
      .setLabel("คำขอลารออนุมัติ • Pending Leaves")
      .setEmoji("⏳")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("panel_admin_backup")
      .setLabel("สำรองข้อมูลเซิร์ฟเวอร์ • Backup Server")
      .setEmoji("💾")
      .setStyle(ButtonStyle.Secondary)
  );

  return { embeds: [embed], components: [row] };
}
