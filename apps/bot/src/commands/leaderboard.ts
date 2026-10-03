import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { prisma } from "@lynnbot/database";
import { THEME_COLORS } from "../utils/theme.js";
import type { BotCommand } from "../index.js";

export const leaderboardCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("ดูกระดานผู้นำผลงานแอดมินและชั่วโมงทำงาน Top 5")
    .addStringOption((opt) =>
      opt
        .setName("category")
        .setDescription("หมวดหมู่การจัดอันดับ")
        .setRequired(false)
        .addChoices(
          { name: "⏱️ ชั่วโมงการทำงาน (Work Hours)", value: "hours" },
          { name: "🎫 ทิกเก็ตที่ปิดสำเร็จ (Closed Tickets)", value: "tickets" }
        )
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: false });

    const category = interaction.options.getString("category") || "hours";

    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        role: { in: ["OWNER", "MANAGER", "ADMIN", "MODERATOR"] },
      },
      include: {
        attendances: {
          where: { clockOut: { not: null } },
          select: { duration: true },
        },
        claimedTickets: {
          where: { status: "CLOSED" },
          select: { id: true },
        },
      },
    });

    const staffData = users.map((u) => {
      const totalMinutes = u.attendances.reduce((acc, curr) => acc + (curr.duration || 0), 0);
      const hours = Math.round((totalMinutes / 60) * 10) / 10;
      const closedCount = u.claimedTickets.length;
      return {
        discordId: u.discordId,
        displayName: u.displayName || u.username,
        hours,
        closedCount,
      };
    });

    const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];

    if (category === "hours") {
      const top5 = [...staffData].sort((a, b) => b.hours - a.hours).slice(0, 5);

      const embed = new EmbedBuilder()
        .setColor(THEME_COLORS.accent)
        .setTitle("🏆  STAFF LEADERBOARD • 5 อันดับชั่วโมงทำงานสูงสุด")
        .setDescription(
          top5.length === 0
            ? "⚪ ยังไม่มีข้อมูลการทำงานในระบบ"
            : top5
                .map(
                  (s, i) =>
                    `${medals[i]} <@${s.discordId}> — **${s.hours} ชั่วโมง**`
                )
                .join("\n\n") +
              "\n\n> ซิงค์ข้อมูลกับ LynnBot Control Hub Dashboard"
        )
        .setFooter({ text: "LynnBot Operations System • Hall of Fame" })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      return;
    } else {
      const top5 = [...staffData].sort((a, b) => b.closedCount - a.closedCount).slice(0, 5);

      const embed = new EmbedBuilder()
        .setColor(THEME_COLORS.accent)
        .setTitle("🎫  STAFF LEADERBOARD • 5 อันดับปิดทิกเก็ตมากที่สุด")
        .setDescription(
          top5.length === 0
            ? "⚪ ยังไม่มีข้อมูลทิกเก็ตที่ปิดสำเร็จ"
            : top5
                .map(
                  (s, i) =>
                    `${medals[i]} <@${s.discordId}> — **${s.closedCount} เคส**`
                )
                .join("\n\n") +
              "\n\n> ซิงค์ข้อมูลกับ LynnBot Control Hub Dashboard"
        )
        .setFooter({ text: "LynnBot Operations System • Hall of Fame" })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      return;
    }
  },
};
