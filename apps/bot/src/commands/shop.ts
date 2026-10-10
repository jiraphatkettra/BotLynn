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
        .setTitle("🛒 ร้านค้ายศ • Role Shop")
        .setDescription(
          "ขณะนี้ยังไม่มีรายการยศเปิดวางจำหน่ายในหมวดหมู่นี้นะคะ\n\n> 💡 แอดมินกำลังจัดเตรียมสิทธิพิเศษใหม่ ๆ โปรดติดตามประกาศเพิ่มเติมนะคะ ✨"
        )
        .setFooter({ text: "Lynn Operations • Role Store" });

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    const roleLines = roles.map((role) => {
      const stock = role.stock !== null ? `• เหลือ ${role.stock} สิทธิ์` : "• พร้อมจำหน่าย";
      return `### 🏷️ ${role.name}\n` +
        `> **ราคา:** \`฿${role.price.toLocaleString("th-TH")}\` (${stock})\n` +
        `> **สิทธิพิเศษ:** ${role.description || "รับบทบาทพิเศษและสิทธิ์ในการเข้าถึงห้องลับ"}\n` +
        `> 🛒 **วิธีสั่งซื้อ:** พิมพ์ \`/buy role:${role.name}\``;
    });

    const embed = new EmbedBuilder()
      .setColor(0x2997ff)
      .setTitle("🛒 ร้านค้ายศประจำเซิร์ฟเวอร์ • Role Shop")
      .setDescription(
        `ยินดีต้อนรับสู่ร้านค้ายศนะคะ! พบยศที่เปิดจำหน่ายทั้งหมด **${roles.length} รายการ**\n` +
          `ยอดเงินจะถูกหักจากกระเป๋าเงินดิจิทัลของคุณโดยอัตโนมัติค่ะ 💳\n\n` +
          roleLines.join("\n\n")
      )
      .setFooter({ text: `Lynn Operations • วางจำหน่ายทั้งหมด ${roles.length} รายการ` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
