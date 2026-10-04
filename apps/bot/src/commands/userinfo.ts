import {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} from "discord.js";
import { prisma } from "@lynnbot/database";
import type { BotCommand } from "../index.js";
import { THEME_COLORS } from "../utils/theme.js";

export const userinfoCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("ดูข้อมูลรวมของสมาชิก (เฉพาะทีมงาน)")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("สมาชิกที่ต้องการดูข้อมูล")
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const targetUser = interaction.options.getUser("user", true);
      const targetMember = interaction.guild?.members.cache.get(targetUser.id);

      // Fetch or create user in DB
      const dbUser = await prisma.user.upsert({
        where: { discordId: targetUser.id },
        update: {
          username: targetUser.username,
          displayName: targetUser.displayName || targetUser.username,
          avatar: targetUser.displayAvatarURL(),
        },
        create: {
          discordId: targetUser.id,
          username: targetUser.username,
          displayName: targetUser.displayName || targetUser.username,
          avatar: targetUser.displayAvatarURL(),
          role: "MEMBER",
        },
      });

      // Fetch all related data in parallel
      const [
        walletTransactions,
        activeWarnings,
        totalWarnings,
        recentWarnings,
        purchaseCount,
        recentPurchases,
        totalSpent,
        openTickets,
        totalTickets,
        pendingSlips,
        approvedSlips,
        totalSlips,
        badges,
        recentAttendance,
        leaveRequests,
      ] = await Promise.all([
        prisma.walletTransaction.findMany({
          where: { userId: dbUser.id },
          orderBy: { createdAt: "desc" },
          take: 5,
        }),
        prisma.warning.count({
          where: { discordId: targetUser.id, isActive: true },
        }),
        prisma.warning.count({
          where: { discordId: targetUser.id },
        }),
        prisma.warning.findMany({
          where: { discordId: targetUser.id, isActive: true },
          orderBy: { createdAt: "desc" },
          take: 3,
        }),
        prisma.transaction.count({
          where: { userId: dbUser.id, status: "COMPLETED" },
        }),
        prisma.transaction.findMany({
          where: { userId: dbUser.id, status: "COMPLETED" },
          include: { role: true },
          orderBy: { createdAt: "desc" },
          take: 5,
        }),
        prisma.transaction.aggregate({
          where: { userId: dbUser.id, status: "COMPLETED" },
          _sum: { price: true },
        }),
        prisma.ticket.count({
          where: {
            creatorId: targetUser.id,
            status: { in: ["OPEN", "CLAIMED"] },
          },
        }),
        prisma.ticket.count({
          where: { creatorId: targetUser.id },
        }),
        prisma.slip.count({
          where: { discordId: targetUser.id, status: "PENDING" },
        }),
        prisma.slip.count({
          where: { discordId: targetUser.id, status: "APPROVED" },
        }),
        prisma.slip.count({
          where: { discordId: targetUser.id },
        }),
        prisma.userBadge.findMany({
          where: { userId: dbUser.id },
          include: { badge: true },
          orderBy: { earnedAt: "desc" },
          take: 6,
        }),
        prisma.attendance.findMany({
          where: { userId: dbUser.id },
          orderBy: { clockIn: "desc" },
          take: 3,
        }),
        prisma.leaveRequest.count({
          where: { userId: dbUser.id, status: "PENDING" },
        }),
      ]);

      // Role display
      const roleDisplay: Record<string, string> = {
        OWNER: "👑 เจ้าของ",
        MANAGER: "⭐ ผู้จัดการ",
        ADMIN: "🛡️ แอดมิน",
        MODERATOR: "🔰 มอเดอเรเตอร์",
        MEMBER: "👤 สมาชิก",
      };

      // ─── Build Embed ───
      const embed = new EmbedBuilder()
        .setColor(
          activeWarnings >= 3
            ? THEME_COLORS.danger
            : activeWarnings > 0
              ? THEME_COLORS.warning
              : THEME_COLORS.accent
        )
        .setTitle(
          `🔍 ข้อมูลสมาชิก • ${dbUser.displayName || dbUser.username}`
        )
        .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
        .setDescription(
          `**Discord:** <@${targetUser.id}>\n` +
          `**ตำแหน่ง:** ${roleDisplay[dbUser.role] || dbUser.role}\n` +
          `**สถานะ:** ${dbUser.isActive ? "🟢 Active" : "🔴 Inactive"}\n` +
          `**เข้าร่วมระบบ:** ${new Date(dbUser.createdAt).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })}` +
          (targetMember?.joinedAt
            ? `\n**เข้าเซิร์ฟเวอร์:** ${targetMember.joinedAt.toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })}`
            : "")
        );

      // ─── Financial Overview ───
      const spent = totalSpent._sum.price || 0;
      embed.addFields(
        {
          name: "💰 ข้อมูลการเงิน",
          value:
            `กระเป๋าเงิน: \`${dbUser.balance.toLocaleString("th-TH", { minimumFractionDigits: 2 })} ฿\`\n` +
            `ซื้อยศแล้ว: \`${purchaseCount} ครั้ง\` (รวม \`${spent.toLocaleString("th-TH")} ฿\`)`,
          inline: false,
        },
      );

      // ─── Slips ───
      embed.addFields({
        name: "🧾 สลิป",
        value:
          `ทั้งหมด \`${totalSlips}\` | อนุมัติ \`${approvedSlips}\` | รอตรวจ \`${pendingSlips}\``,
        inline: true,
      });

      // ─── Tickets ───
      embed.addFields({
        name: "🎫 ทิกเก็ต",
        value: `ทั้งหมด \`${totalTickets}\` | เปิดอยู่ \`${openTickets}\``,
        inline: true,
      });

      // ─── Warnings ───
      if (activeWarnings > 0) {
        const warningLines = recentWarnings
          .map((w) => {
            const date = new Date(w.createdAt).toLocaleDateString("th-TH");
            const severityEmoji: Record<string, string> = {
              LOW: "🟡",
              MEDIUM: "🟠",
              HIGH: "🔴",
              CRITICAL: "⛔",
            };
            return `${severityEmoji[w.severity] || "⚠️"} \`${date}\` **${w.severity}** — ${w.reason}`;
          })
          .join("\n");

        embed.addFields({
          name: `⚠️ การเตือนที่มีผล (${activeWarnings}/${totalWarnings})`,
          value: warningLines,
        });
      } else {
        embed.addFields({
          name: "⚠️ การเตือน",
          value: `✅ ไม่มีการเตือนที่มีผล (ทั้งหมด ${totalWarnings})`,
          inline: true,
        });
      }

      // ─── Recent Purchases ───
      if (recentPurchases.length > 0) {
        const purchaseLines = recentPurchases
          .map((tx) => {
            const date = new Date(tx.createdAt).toLocaleDateString("th-TH");
            return `• \`${date}\` **${tx.role.name}** — ฿${tx.price.toLocaleString("th-TH")}`;
          })
          .join("\n");
        embed.addFields({
          name: "🛍️ ซื้อยศล่าสุด",
          value: purchaseLines,
        });
      }

      // ─── Badges ───
      if (badges.length > 0) {
        const badgeText = badges
          .map((ub) => `${ub.badge.icon} ${ub.badge.name}`)
          .join("  ");
        embed.addFields({
          name: "🏆 Badges",
          value: badgeText,
        });
      }

      // ─── Recent Wallet Transactions ───
      if (walletTransactions.length > 0) {
        const txLines = walletTransactions
          .map((tx) => {
            const date = new Date(tx.createdAt).toLocaleDateString("th-TH");
            const sign = tx.amount >= 0 ? "+" : "";
            return `• \`${date}\` **${sign}${tx.amount} ฿** (${tx.type})`;
          })
          .join("\n");
        embed.addFields({
          name: "💳 ธุรกรรมกระเป๋าเงินล่าสุด",
          value: txLines,
        });
      }

      // ─── Attendance (if staff) ───
      if (
        ["OWNER", "MANAGER", "ADMIN", "MODERATOR"].includes(dbUser.role) &&
        recentAttendance.length > 0
      ) {
        const attLines = recentAttendance
          .map((att) => {
            const date = new Date(att.clockIn).toLocaleDateString("th-TH");
            const time = new Date(att.clockIn).toLocaleTimeString("th-TH", {
              hour: "2-digit",
              minute: "2-digit",
            });
            const dur = att.duration
              ? `${Math.floor(att.duration / 60)} ชม. ${att.duration % 60} น.`
              : "ยังไม่ Clock Out";
            return `• \`${date} ${time}\` — ${dur}`;
          })
          .join("\n");

        embed.addFields({
          name: "⏱️ ตอกบัตรล่าสุด",
          value: attLines,
        });

        if (leaveRequests > 0) {
          embed.addFields({
            name: "📝 คำขอลา",
            value: `มีคำขอลารออนุมัติ \`${leaveRequests}\` รายการ`,
            inline: true,
          });
        }
      }

      embed
        .setFooter({
          text: `LynnBot Admin Tools • /userinfo • ค้นหาโดย ${interaction.user.username}`,
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (err: any) {
      console.error("Error in /userinfo:", err);
      await interaction.editReply({
        content: `❌ เกิดข้อผิดพลาด: ${err.message}`,
      });
    }
  },
};
