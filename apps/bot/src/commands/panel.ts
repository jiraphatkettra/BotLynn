import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  type TextChannel,
} from "discord.js";
import { prisma } from "@lynnbot/database";
import type { BotCommand } from "../index.js";
import {
  buildAttendancePanel,
  buildLeavePanel,
  buildShopPanel,
  buildTicketPanel,
  buildAdminHubPanel,
  buildModerationPanel,
} from "../services/panelService.js";

export const panelCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("panel")
    .setDescription("ติดตั้งแผงควบคุมถาวรแบบปุ่มกด (Persistent Interactive Panel)")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((option) =>
      option
        .setName("type")
        .setDescription("เลือกประเภทแผงควบคุมที่ต้องการติดตั้ง")
        .setRequired(true)
        .addChoices(
          { name: "⏱️ แผงตอกบัตรเข้า-ออกงาน (Attendance Station)", value: "attendance" },
          { name: "📝 แผงยื่นคำขอลางาน (Staff Leave System)", value: "leave" },
          { name: "🛒 แผงร้านค้ายศ & กระเป๋าเงิน (Shop & Wallet)", value: "shop" },
          { name: "📩 แผงศูนย์ช่วยเหลือ (Ticket Support)", value: "ticket" },
          { name: "🛡️ แผงควบคุมด่วนทีมงาน (Staff Control Hub)", value: "admin-hub" },
          { name: "⚖️ แผงตักเตือน & บันทึกลงโทษ (Moderation & Warning)", value: "moderation" }
        )
    )
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("เลือกห้องที่ต้องการให้ส่งการ์ด (หากไม่เลือกจะส่งในห้องนี้)")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    )
    .addChannelOption((option) =>
      option
        .setName("log_channel")
        .setDescription("ห้องสำหรับแจ้งเตือนแอดมิน / บันทึก Log (สำหรับ Ticket, Shop หรือ Moderation)")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    ),

  async execute(interaction) {
    const panelType = interaction.options.getString("type", true);
    const targetChannel =
      (interaction.options.getChannel("channel") as TextChannel | null) ||
      (interaction.channel as TextChannel);
    const logChannel = interaction.options.getChannel("log_channel") as TextChannel | null;

    if (!targetChannel) {
      await interaction.reply({
        content: "❌ ไม่สามารถระบุห้องข้อความปลายทางได้",
        ephemeral: true,
      });
      return;
    }

    let panelData: { embeds: any[]; components: any[] };
    let panelNameTh = "";

    switch (panelType) {
      case "attendance":
        panelData = buildAttendancePanel();
        panelNameTh = "แผงตอกบัตรเข้า-ออกงาน (Attendance Station)";
        break;
      case "leave":
        panelData = buildLeavePanel();
        panelNameTh = "แผงยื่นคำขอลางาน (Staff Leave System)";
        break;
      case "shop":
        panelData = buildShopPanel();
        panelNameTh = "แผงร้านค้ายศ & กระเป๋าเงิน (Shop & Wallet)";
        break;
      case "ticket":
        panelData = buildTicketPanel();
        panelNameTh = "แผงศูนย์ช่วยเหลือ (Ticket Support)";
        break;
      case "admin-hub":
        panelData = buildAdminHubPanel();
        panelNameTh = "แผงควบคุมด่วนทีมงาน (Staff Control Hub)";
        break;
      case "moderation":
        panelData = buildModerationPanel();
        panelNameTh = "แผงควบคุมความประพฤติ & บันทึกการลงโทษ (Moderation & Warning)";
        break;
      default:
        await interaction.reply({
          content: "❌ ไม่พบประเภทแผงควบคุมที่ระบุ",
          ephemeral: true,
        });
        return;
    }

    try {
      await targetChannel.send(panelData);

      let logNote = "";
      if (logChannel) {
        if (panelType === "ticket") {
          await prisma.setting.upsert({
            where: { key: "ticket_log_channel" },
            update: { value: logChannel.id },
            create: { key: "ticket_log_channel", value: logChannel.id, category: "channels", description: "ห้องบันทึกและแจ้งเตือนทิกเก็ต" },
          });
          logNote = `\n• บันทึกห้องแจ้งเตือนทิกเก็ตไปยัง <#${logChannel.id}> สำเร็จ`;
        } else if (panelType === "shop") {
          await prisma.setting.upsert({
            where: { key: "slip_notify_channel" },
            update: { value: logChannel.id },
            create: { key: "slip_notify_channel", value: logChannel.id, category: "channels", description: "ห้องแจ้งเตือนสลิปร้านค้ายศ" },
          });
          await prisma.setting.upsert({
            where: { key: "slip_log_channel" },
            update: { value: logChannel.id },
            create: { key: "slip_log_channel", value: logChannel.id, category: "channels", description: "ห้องแจ้งเตือนสลิปร้านค้ายศ" },
          });
          logNote = `\n• บันทึกห้องแจ้งเตือนสลิปร้านค้าไปยัง <#${logChannel.id}> สำเร็จ`;
        } else if (panelType === "attendance") {
          await prisma.setting.upsert({
            where: { key: "attendance_log_channel" },
            update: { value: logChannel.id },
            create: { key: "attendance_log_channel", value: logChannel.id, category: "channels", description: "ห้องแจ้งเตือนตอกบัตร" },
          });
          logNote = `\n• บันทึกห้องแจ้งเตือนตอกบัตรไปยัง <#${logChannel.id}> สำเร็จ`;
        } else if (panelType === "moderation") {
          await prisma.setting.upsert({
            where: { key: "moderation_notify_channel" },
            update: { value: logChannel.id },
            create: { key: "moderation_notify_channel", value: logChannel.id, category: "channels", description: "ห้องประกาศการตักเตือนและลงโทษสมาชิก" },
          });
          logNote = `\n• บันทึกห้องประกาศเตือนและลงโทษสมาชิกไปยัง <#${logChannel.id}> สำเร็จ`;
        }
      }

      // Reply ephemerally to the admin so the command invocation does not clutter the chat
      await interaction.reply({
        content: `✅ ติดตั้ง **${panelNameTh}** เรียบร้อยแล้วที่ห้อง <#${targetChannel.id}>${logNote}\n-# ข้อความคำสั่งนี้มองเห็นเฉพาะคุณ ช่องแชทจะแสดงเฉพาะแผงควบคุมของบอทเพื่อความสะอาดตา`,
        ephemeral: true,
      });
    } catch (err: any) {
      console.error("Error sending panel message:", err);
      await interaction.reply({
        content: `❌ เกิดข้อผิดพลาดในการส่งแผงควบคุม: ${err.message}`,
        ephemeral: true,
      });
    }
  },
};
