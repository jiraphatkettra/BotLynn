import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { prisma } from "@lynnbot/database";
import type { BotCommand } from "../index.js";
import { THEME_COLORS } from "../utils/theme.js";

export const myslipsCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("myslips")
    .setDescription("ดูประวัติสลิปที่ส่งทั้งหมดของคุณ")
    .addStringOption((option) =>
      option
        .setName("status")
        .setDescription("กรองตามสถานะ")
        .setRequired(false)
        .addChoices(
          { name: "🟡 รอตรวจสอบ", value: "PENDING" },
          { name: "🟢 อนุมัติแล้ว", value: "APPROVED" },
          { name: "🔴 ปฏิเสธ", value: "REJECTED" },
        )
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const discordId = interaction.user.id;
      const statusFilter = interaction.options.getString("status");

      const where: any = { discordId };
      if (statusFilter) {
        where.status = statusFilter;
      }

      const [slips, totalCount, pendingCount, approvedCount, rejectedCount] =
        await Promise.all([
          prisma.slip.findMany({
            where,
            orderBy: { createdAt: "desc" },
            take: 10,
          }),
          prisma.slip.count({ where: { discordId } }),
          prisma.slip.count({ where: { discordId, status: "PENDING" } }),
          prisma.slip.count({ where: { discordId, status: "APPROVED" } }),
          prisma.slip.count({ where: { discordId, status: "REJECTED" } }),
        ]);

      // Status emoji map
      const statusEmoji: Record<string, string> = {
        PENDING: "🟡",
        APPROVED: "🟢",
        REJECTED: "🔴",
      };
      const statusLabel: Record<string, string> = {
        PENDING: "รอตรวจสอบ",
        APPROVED: "อนุมัติแล้ว",
        REJECTED: "ปฏิเสธ",
      };

      // Build summary
      const summaryText =
        `📊 **สรุปสลิปทั้งหมด:** \`${totalCount}\` รายการ\n` +
        `🟡 รอตรวจสอบ \`${pendingCount}\` • 🟢 อนุมัติแล้ว \`${approvedCount}\` • 🔴 ปฏิเสธ \`${rejectedCount}\``;

      // Build slip list
      let slipList: string;
      if (slips.length === 0) {
        slipList = statusFilter
          ? `ไม่พบสลิปที่มีสถานะ "${statusLabel[statusFilter]}"`
          : "คุณยังไม่เคยส่งสลิปเข้าระบบ";
      } else {
        slipList = slips
          .map((slip, i) => {
            const date = new Date(slip.createdAt).toLocaleDateString("th-TH", {
              day: "numeric",
              month: "short",
              year: "2-digit",
            });
            const time = new Date(slip.createdAt).toLocaleTimeString("th-TH", {
              hour: "2-digit",
              minute: "2-digit",
            });
            const amountText = slip.amount
              ? `฿${slip.amount.toLocaleString("th-TH", { minimumFractionDigits: 2 })}`
              : "ไม่ระบุ";
            const bankText = slip.senderBank ? ` (${slip.senderBank})` : "";
            const noteText = slip.note ? `\n   💬 ${slip.note}` : "";

            return (
              `**${i + 1}.** ${statusEmoji[slip.status]} ${statusLabel[slip.status]}` +
              ` — \`${date} ${time}\`\n` +
              `   💰 จำนวน: **${amountText}**${bankText}` +
              `${slip.transRef ? `\n   🔖 Ref: \`${slip.transRef}\`` : ""}` +
              `${noteText}`
            );
          })
          .join("\n\n");
      }

      // Choose embed color based on filter
      const embedColor = statusFilter
        ? statusFilter === "APPROVED"
          ? THEME_COLORS.success
          : statusFilter === "REJECTED"
            ? THEME_COLORS.danger
            : THEME_COLORS.warning
        : THEME_COLORS.surface;

      const filterLabel = statusFilter
        ? ` (${statusLabel[statusFilter]})`
        : "";

      const embed = new EmbedBuilder()
        .setColor(embedColor)
        .setTitle(
          `🧾 ประวัติสลิปของคุณ${filterLabel} • ${interaction.user.displayName || interaction.user.username}`
        )
        .setDescription(`${summaryText}\n\n${slipList}`)
        .setThumbnail(interaction.user.displayAvatarURL())
        .setFooter({
          text: `LynnBot Self-Service • /myslips${slips.length > 0 ? ` • แสดง ${slips.length} จาก ${totalCount} รายการ` : ""}`,
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (err: any) {
      console.error("Error in /myslips:", err);
      await interaction.editReply({
        content: `❌ เกิดข้อผิดพลาด: ${err.message}`,
      });
    }
  },
};
