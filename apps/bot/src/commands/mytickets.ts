import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { prisma } from "@lynnbot/database";
import type { BotCommand } from "../index.js";
import { THEME_COLORS } from "../utils/theme.js";

export const myticketsCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("mytickets")
    .setDescription("ดูทิกเก็ตที่คุณเปิดไว้ทั้งหมด")
    .addStringOption((option) =>
      option
        .setName("status")
        .setDescription("กรองตามสถานะ")
        .setRequired(false)
        .addChoices(
          { name: "🟢 เปิดอยู่", value: "OPEN" },
          { name: "🟡 กำลังดูแล", value: "CLAIMED" },
          { name: "🔴 ปิดแล้ว", value: "CLOSED" },
        )
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const discordId = interaction.user.id;
      const statusFilter = interaction.options.getString("status");

      const where: any = { creatorId: discordId };
      if (statusFilter) {
        where.status = statusFilter;
      }

      const [tickets, totalCount, openCount, claimedCount, closedCount] =
        await Promise.all([
          prisma.ticket.findMany({
            where,
            orderBy: { createdAt: "desc" },
            take: 10,
            include: {
              claimedBy: { select: { username: true, displayName: true } },
            },
          }),
          prisma.ticket.count({ where: { creatorId: discordId } }),
          prisma.ticket.count({
            where: { creatorId: discordId, status: "OPEN" },
          }),
          prisma.ticket.count({
            where: { creatorId: discordId, status: "CLAIMED" },
          }),
          prisma.ticket.count({
            where: { creatorId: discordId, status: "CLOSED" },
          }),
        ]);

      // Status display
      const statusEmoji: Record<string, string> = {
        OPEN: "🟢",
        CLAIMED: "🟡",
        CLOSED: "🔴",
      };
      const statusLabel: Record<string, string> = {
        OPEN: "เปิดอยู่",
        CLAIMED: "กำลังดูแล",
        CLOSED: "ปิดแล้ว",
      };

      // Summary
      const summaryText =
        `📊 **สรุปทิกเก็ตทั้งหมด:** \`${totalCount}\` เคส\n` +
        `🟢 เปิดอยู่ \`${openCount}\` • 🟡 กำลังดูแล \`${claimedCount}\` • 🔴 ปิดแล้ว \`${closedCount}\``;

      // Ticket list
      let ticketList: string;
      if (tickets.length === 0) {
        ticketList = statusFilter
          ? `ไม่พบทิกเก็ตที่มีสถานะ "${statusLabel[statusFilter]}"`
          : "คุณยังไม่เคยเปิดทิกเก็ต";
      } else {
        ticketList = tickets
          .map((ticket, i) => {
            const date = new Date(ticket.createdAt).toLocaleDateString(
              "th-TH",
              { day: "numeric", month: "short", year: "2-digit" }
            );
            const time = new Date(ticket.createdAt).toLocaleTimeString(
              "th-TH",
              { hour: "2-digit", minute: "2-digit" }
            );

            const claimedText = ticket.claimedBy
              ? `\n   👤 ผู้ดูแล: **${ticket.claimedBy.displayName || ticket.claimedBy.username}**`
              : "";

            const closedText =
              ticket.status === "CLOSED" && ticket.closedAt
                ? `\n   📅 ปิดเมื่อ: \`${new Date(ticket.closedAt).toLocaleDateString("th-TH")}\``
                : "";

            // Calculate time since creation for open tickets
            let durationText = "";
            if (ticket.status !== "CLOSED") {
              const diff = Date.now() - new Date(ticket.createdAt).getTime();
              const hours = Math.floor(diff / (1000 * 60 * 60));
              const days = Math.floor(hours / 24);
              if (days > 0) {
                durationText = `\n   ⏱️ เปิดมาแล้ว: **${days} วัน ${hours % 24} ชม.**`;
              } else if (hours > 0) {
                durationText = `\n   ⏱️ เปิดมาแล้ว: **${hours} ชม.**`;
              }
            }

            return (
              `**${i + 1}.** ${statusEmoji[ticket.status]} ${statusLabel[ticket.status]}` +
              ` — \`${ticket.ticketId}\`\n` +
              `   📝 หัวข้อ: ${ticket.subject || "สอบถามทั่วไป"}\n` +
              `   🕐 สร้างเมื่อ: \`${date} ${time}\`` +
              `${claimedText}${closedText}${durationText}`
            );
          })
          .join("\n\n");
      }

      // Embed color based on filter
      const embedColor = statusFilter
        ? statusFilter === "OPEN"
          ? THEME_COLORS.success
          : statusFilter === "CLAIMED"
            ? THEME_COLORS.warning
            : THEME_COLORS.danger
        : THEME_COLORS.surface;

      const filterLabel = statusFilter
        ? ` (${statusLabel[statusFilter]})`
        : "";

      const embed = new EmbedBuilder()
        .setColor(embedColor)
        .setTitle(
          `🎫 ทิกเก็ตของคุณ${filterLabel} • ${interaction.user.displayName || interaction.user.username}`
        )
        .setDescription(`${summaryText}\n\n${ticketList}`)
        .setThumbnail(interaction.user.displayAvatarURL())
        .setFooter({
          text: `LynnBot Self-Service • /mytickets${tickets.length > 0 ? ` • แสดง ${tickets.length} จาก ${totalCount} เคส` : ""}`,
        })
        .setTimestamp();

      // Add helpful tip for open tickets
      if (openCount > 0 || claimedCount > 0) {
        embed.addFields({
          name: "💡 คำแนะนำ",
          value:
            "หากต้องการติดตามผลทิกเก็ต สามารถพิมพ์ข้อความเพิ่มเติมในห้องทิกเก็ตที่เปิดไว้ได้เลย",
        });
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (err: any) {
      console.error("Error in /mytickets:", err);
      await interaction.editReply({
        content: `❌ เกิดข้อผิดพลาด: ${err.message}`,
      });
    }
  },
};
