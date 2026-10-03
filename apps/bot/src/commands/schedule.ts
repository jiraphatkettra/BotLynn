import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { prisma } from "@lynnbot/database";
import { THEME_COLORS } from "../utils/theme.js";
import type { BotCommand } from "../index.js";

const SHIFT_LABELS: Record<string, string> = {
  MORNING: "🌅 กะเช้า",
  AFTERNOON: "☀️ กะบ่าย",
  NIGHT: "🌙 กะดึก",
  FULL: "⭐ เต็มวัน",
};

export const scheduleCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("schedule")
    .setDescription("ดูตารางเวรและกะการปฏิบัติหน้าที่ของทีมงาน")
    .addSubcommand((sub) =>
      sub
        .setName("today")
        .setDescription("ดูตารางเวรทีมงานประจำวันนี้")
    )
    .addSubcommand((sub) =>
      sub
        .setName("week")
        .setDescription("ดูตารางเวรทีมงานสัปดาห์นี้")
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const subcommand = interaction.options.getSubcommand();
    const now = new Date();

    if (subcommand === "today") {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfDay = new Date(startOfDay);
      endOfDay.setDate(endOfDay.getDate() + 1);

      const shifts = await prisma.shiftSchedule.findMany({
        where: {
          date: { gte: startOfDay, lt: endOfDay },
        },
        include: { user: true },
        orderBy: { startTime: "asc" },
      });

      const embed = new EmbedBuilder()
        .setColor(THEME_COLORS.accent)
        .setTitle(`📅  STAFF SCHEDULE TODAY • ตารางเวรวันนี้ (${startOfDay.toLocaleDateString("th-TH")})`)
        .setFooter({ text: "LynnBot Operations System • Scheduling Service" })
        .setTimestamp();

      if (shifts.length === 0) {
        embed.setDescription("⚪ วันนี้ไม่มีตารางเวรที่กำหนดไว้ในระบบ");
      } else {
        const lines = shifts.map((s) => {
          const shiftName = SHIFT_LABELS[s.shiftType] || s.shiftType;
          return `• **${shiftName}** (${s.startTime} - ${s.endTime}): <@${s.user.discordId}> ${s.note ? `\n  └ *${s.note}*` : ""}`;
        });
        embed.setDescription(lines.join("\n\n"));
      }

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (subcommand === "week") {
      const dayOfWeek = (now.getDay() + 6) % 7; // Monday = 0
      const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 7);

      const shifts = await prisma.shiftSchedule.findMany({
        where: {
          date: { gte: startOfWeek, lt: endOfWeek },
        },
        include: { user: true },
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
      });

      const embed = new EmbedBuilder()
        .setColor(THEME_COLORS.accent)
        .setTitle(`📅  STAFF SCHEDULE WEEKLY • ตารางเวรสัปดาห์นี้`)
        .setDescription(
          `ช่วงวันที่ ${startOfWeek.toLocaleDateString("th-TH")} ถึง ${new Date(endOfWeek.getTime() - 1).toLocaleDateString("th-TH")}\n\n` +
          (shifts.length === 0
            ? "⚪ สัปดาห์นี้ยังไม่มีตารางเวรที่กำหนดไว้"
            : shifts
                .map(
                  (s) =>
                    `• **${s.date.toLocaleDateString("th-TH", { weekday: "short", day: "numeric", month: "short" })}** [${SHIFT_LABELS[s.shiftType] || s.shiftType}]: <@${s.user.discordId}> (${s.startTime}-${s.endTime})`
                )
                .join("\n"))
        )
        .setFooter({ text: "LynnBot Operations System • Scheduling Service" })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      return;
    }
  },
};
