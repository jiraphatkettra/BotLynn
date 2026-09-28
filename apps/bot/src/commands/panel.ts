import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  type TextChannel,
} from "discord.js";
import type { BotCommand } from "../index.js";
import {
  buildAttendancePanel,
  buildLeavePanel,
  buildShopPanel,
  buildTicketPanel,
  buildAdminHubPanel,
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
          { name: "🛡️ แผงควบคุมด่วนทีมงาน (Staff Control Hub)", value: "admin-hub" }
        )
    )
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("เลือกห้องที่ต้องการให้ส่งการ์ด (หากไม่เลือกจะส่งในห้องนี้)")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    ),

  async execute(interaction) {
    const panelType = interaction.options.getString("type", true);
    const targetChannel =
      (interaction.options.getChannel("channel") as TextChannel | null) ||
      (interaction.channel as TextChannel);

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
      default:
        await interaction.reply({
          content: "❌ ไม่พบประเภทแผงควบคุมที่ระบุ",
          ephemeral: true,
        });
        return;
    }

    try {
      await targetChannel.send(panelData);

      // Reply ephemerally to the admin so the command invocation does not clutter the chat
      await interaction.reply({
        content: `✅ ติดตั้ง **${panelNameTh}** เรียบร้อยแล้วที่ห้อง <#${targetChannel.id}>\n-# ข้อความคำสั่งนี้มองเห็นเฉพาะคุณ ช่องแชทจะแสดงเฉพาะแผงควบคุมของบอทเพื่อความสะอาดตา`,
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
