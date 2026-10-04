import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { prisma } from "@lynnbot/database";
import type { BotCommand } from "../index.js";
import { THEME_COLORS } from "../utils/theme.js";

export const meCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("me")
    .setDescription("ดูโปรไฟล์และข้อมูลของตัวเอง"),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const discordId = interaction.user.id;

      // Upsert user to ensure they exist
      const user = await prisma.user.upsert({
        where: { discordId },
        update: {
          username: interaction.user.username,
          displayName: interaction.user.displayName || interaction.user.username,
          avatar: interaction.user.displayAvatarURL(),
        },
        create: {
          discordId,
          username: interaction.user.username,
          displayName: interaction.user.displayName || interaction.user.username,
          avatar: interaction.user.displayAvatarURL(),
          role: "MEMBER",
        },
      });

      // Fetch all related data in parallel
      const [
        badgeCount,
        badges,
        activeWarnings,
        totalWarnings,
        purchaseCount,
        recentPurchases,
        openTickets,
        pendingSlips,
        totalSlips,
      ] = await Promise.all([
        prisma.userBadge.count({ where: { userId: user.id } }),
        prisma.userBadge.findMany({
          where: { userId: user.id },
          include: { badge: true },
          orderBy: { earnedAt: "desc" },
          take: 8,
        }),
        prisma.warning.count({ where: { discordId, isActive: true } }),
        prisma.warning.count({ where: { discordId } }),
        prisma.transaction.count({
          where: { userId: user.id, status: "COMPLETED" },
        }),
        prisma.transaction.findMany({
          where: { userId: user.id, status: "COMPLETED" },
          include: { role: true },
          orderBy: { createdAt: "desc" },
          take: 3,
        }),
        prisma.ticket.count({
          where: { creatorId: discordId, status: { in: ["OPEN", "CLAIMED"] } },
        }),
        prisma.slip.count({
          where: { discordId, status: "PENDING" },
        }),
        prisma.slip.count({
          where: { discordId },
        }),
      ]);

      // Format role display
      const roleDisplay: Record<string, string> = {
        OWNER: "👑 เจ้าของ",
        MANAGER: "⭐ ผู้จัดการ",
        ADMIN: "🛡️ แอดมิน",
        MODERATOR: "🔰 มอเดอเรเตอร์",
        MEMBER: "👤 สมาชิก",
      };

      // Build badge display
      const badgeText =
        badges.length > 0
          ? badges.map((ub) => `${ub.badge.icon} ${ub.badge.name}`).join("  ")
          : "ยังไม่มี Badge — ทำกิจกรรมเพื่อรับ!";

      // Build recent purchases
      const purchaseText =
        recentPurchases.length > 0
          ? recentPurchases
              .map((tx) => {
                const date = new Date(tx.createdAt).toLocaleDateString("th-TH");
                return `• \`${date}\` **${tx.role.name}** — ฿${tx.price.toLocaleString("th-TH")}`;
              })
              .join("\n")
          : "ยังไม่เคยซื้อยศ";

      // Warning status
      const warningStatus =
        activeWarnings > 0
          ? `⚠️ **${activeWarnings}** การเตือนที่ยังมีผล (ทั้งหมด ${totalWarnings})`
          : `✅ ไม่มีการเตือน`;

      // Build embed
      const embed = new EmbedBuilder()
        .setColor(THEME_COLORS.surface)
        .setTitle(`👤 โปรไฟล์ของคุณ • ${user.displayName || user.username}`)
        .setThumbnail(interaction.user.displayAvatarURL({ size: 256 }))
        .setDescription(
          `**ตำแหน่ง:** ${roleDisplay[user.role] || user.role}\n` +
          `**เข้าร่วมระบบ:** ${new Date(user.createdAt).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })}`
        )
        .addFields(
          {
            name: "💳 กระเป๋าเงิน",
            value: `\`${user.balance.toLocaleString("th-TH", { minimumFractionDigits: 2 })} ฿\``,
            inline: true,
          },
          {
            name: "🛒 ยศที่ซื้อ",
            value: `\`${purchaseCount} รายการ\``,
            inline: true,
          },
          {
            name: "🎫 ทิกเก็ตเปิดอยู่",
            value: `\`${openTickets} เคส\``,
            inline: true,
          },
          {
            name: "🏆 Badges ที่ได้รับ",
            value: badgeText,
          },
          {
            name: "⚖️ สถานะการเตือน",
            value: warningStatus,
            inline: true,
          },
          {
            name: "🧾 สลิป",
            value: `รอตรวจ \`${pendingSlips}\` / ส่งแล้ว \`${totalSlips}\``,
            inline: true,
          },
        );

      // Add recent purchases if any
      if (recentPurchases.length > 0) {
        embed.addFields({
          name: "🛍️ ซื้อยศล่าสุด",
          value: purchaseText,
        });
      }

      // Add dashboard link if user is staff
      const dashboardUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
      if (["OWNER", "MANAGER", "ADMIN", "MODERATOR"].includes(user.role)) {
        embed.addFields({
          name: "🌐 Web Dashboard",
          value: `[เปิดแดชบอร์ด](${dashboardUrl})`,
        });
      }

      embed
        .setFooter({ text: "LynnBot Self-Service • /me" })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (err: any) {
      console.error("Error in /me:", err);
      await interaction.editReply({
        content: `❌ เกิดข้อผิดพลาด: ${err.message}`,
      });
    }
  },
};
