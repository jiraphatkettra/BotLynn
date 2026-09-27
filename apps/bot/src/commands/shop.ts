import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { prisma } from "@lynnbot/database";
import type { BotCommand } from "../index.js";

export const shopCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("shop")
    .setDescription("ดูรายการยศที่มีจำหน่าย")
    .addStringOption((option) =>
      option
        .setName("category")
        .setDescription("หมวดหมู่")
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const category = interaction.options.getString("category");

    const where: any = { isActive: true };
    if (category) where.category = category;

    const roles = await prisma.shopRole.findMany({
      where,
      orderBy: { sortOrder: "asc" },
      include: {
        _count: { select: { transactions: true } },
      },
    });

    if (roles.length === 0) {
      const embed = new EmbedBuilder()
        .setColor(0xffd60a)
        .setTitle("ร้านค้ายศ")
        .setDescription("ขณะนี้ยังไม่มียศเปิดจำหน่าย")
        .setFooter({ text: "LynnBot" });

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    const roleLines = roles.map((role) => {
      const stock = role.stock !== null ? `(เหลือ ${role.stock})` : "";
      return `**${role.name}** — ฿${role.price.toLocaleString("th-TH")} ${stock}\n${role.description || "สิทธิพิเศษประจำยศ"}\nสั่งซื้อ: \`/buy role:${role.name}\``;
    });

    const embed = new EmbedBuilder()
      .setColor(0x2997ff)
      .setTitle("ร้านค้ายศ")
      .setDescription(roleLines.join("\n\n"))
      .setFooter({ text: `ยศทั้งหมด ${roles.length} รายการ • LynnBot` });

    await interaction.editReply({ embeds: [embed] });
  },
};
