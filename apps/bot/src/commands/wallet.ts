import {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder,
} from "discord.js";
import { prisma } from "@lynnbot/database";
import type { BotCommand } from "../index.js";
import { generatePromptPayQR } from "../services/promptpayService.js";

export const balanceCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("balance")
    .setDescription("เช็คยอดเงินคงเหลือในกระเป๋า (Wallet Balance)"),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const user = await prisma.user.upsert({
        where: { discordId: interaction.user.id },
        update: {
          username: interaction.user.username,
          displayName: interaction.user.displayName || interaction.user.username,
        },
        create: {
          discordId: interaction.user.id,
          username: interaction.user.username,
          displayName: interaction.user.displayName || interaction.user.username,
          role: "ADMIN",
        },
        include: {
          walletTransactions: {
            orderBy: { createdAt: "desc" },
            take: 5,
          },
        },
      });

      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle(`💳 กระเป๋าเงินของคุณ • ${user.displayName || user.username}`)
        .setDescription(
          `**ยอดเงินคงเหลือ:** \`${user.balance.toLocaleString("th-TH", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })} ฿\`\n\nสามารถใช้ยอดเงินนี้ซื้อยศในเซิร์ฟเวอร์ได้ทันทีผ่านคำสั่ง \`/buy\``
        )
        .setThumbnail(interaction.user.displayAvatarURL())
        .setFooter({ text: "LynnBot Wallet System" })
        .setTimestamp();

      if (user.walletTransactions && user.walletTransactions.length > 0) {
        const historyText = user.walletTransactions
          .map((tx) => {
            const sign = tx.amount >= 0 ? "+" : "";
            const date = new Date(tx.createdAt).toLocaleDateString("th-TH");
            return `• \`${date}\` **${sign}${tx.amount} ฿** (${tx.type}) ${tx.note ? `- ${tx.note}` : ""}`;
          })
          .join("\n");
        embed.addFields({ name: "📋 ประวัติทำรายการล่าสุด", value: historyText });
      }

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("ticket_create")
          .setLabel("แจ้งเติมเงิน / ส่งสลิป")
          .setStyle(ButtonStyle.Success)
          .setEmoji("📩")
      );

      await interaction.editReply({ embeds: [embed], components: [row] });
    } catch (err: any) {
      console.error("❌ [Wallet] Error in /balance:", err);
      await interaction.editReply({ content: `❌ เกิดข้อผิดพลาด: ${err.message}` });
    }
  },
};

export const topupCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("topup")
    .setDescription("เติมเงินเข้ากระเป๋าด้วย PromptPay QR หรือส่งสลิป")
    .addNumberOption((option) =>
      option
        .setName("amount")
        .setDescription("จำนวนเงินที่ต้องการเติม (เช่น 50, 100, 300)")
        .setRequired(false)
        .setMinValue(1)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const amount = interaction.options.getNumber("amount");

      // Fetch promptpay number from settings
      const setting = await prisma.setting.findUnique({
        where: { key: "promptpay_number" },
      });
      const promptpayNumber = setting?.value?.trim() || "0954268212";

      const { buffer } = await generatePromptPayQR(promptpayNumber, amount);
      const attachment = new AttachmentBuilder(buffer, { name: "promptpay_qr.png" });

      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle("💳 เติมเงินเข้ากระเป๋า (PromptPay Topup)")
        .setDescription(
          `สแกน QR Code ด้านล่างผ่านแอปพลิเคชันธนาคารทุกแห่งเพื่อเติมเงิน\n\n` +
            (amount ? `💰 **ยอดที่ต้องชำระ:** \`${amount.toLocaleString("th-TH", { minimumFractionDigits: 2 })} ฿\`\n` : "") +
            `📱 **หมายเลขพร้อมเพย์:** \`${promptpayNumber}\`\n\n` +
            `เมื่อโอนเงินเสร็จเรียบร้อย กรุณากดปุ่ม **"📩 แจ้งส่งสลิป"** ด้านล่าง เพื่อให้แอดมินตรวจสอบและเพิ่มยอดเงินเข้ากระเป๋าให้ทันที`
        )
        .setImage("attachment://promptpay_qr.png")
        .setFooter({ text: "LynnBot Security Payment • ตรวจสอบสลิป 24 ชม." })
        .setTimestamp();

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("ticket_create")
          .setLabel("แจ้งส่งสลิปโอนเงิน")
          .setStyle(ButtonStyle.Success)
          .setEmoji("📩")
      );

      await interaction.editReply({ embeds: [embed], files: [attachment], components: [row] });
    } catch (err: any) {
      console.error("❌ [Wallet] Error in /topup:", err);
      await interaction.editReply({ content: `❌ เกิดข้อผิดพลาด: ${err.message}` });
    }
  },
};

export const giveBalanceCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("give-balance")
    .setDescription("เติมหรือลดเงินในกระเป๋าของสมาชิก (เฉพาะแอดมิน)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption((option) =>
      option.setName("user").setDescription("สมาชิกที่ต้องการเติมเงิน").setRequired(true)
    )
    .addNumberOption((option) =>
      option.setName("amount").setDescription("จำนวนเงินที่ต้องการเพิ่ม (ใส่ค่าลบเพื่อลดเงิน)").setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("note").setDescription("เหตุผลหรือหมายเหตุ").setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const targetUser = interaction.options.getUser("user", true);
      const amount = interaction.options.getNumber("amount", true);
      const note = interaction.options.getString("note") || "ปรับปรุงยอดเงินโดยแอดมิน";

      const user = await prisma.user.upsert({
        where: { discordId: targetUser.id },
        update: {
          balance: { increment: amount },
          avatar: targetUser.displayAvatarURL(),
        },
        create: {
          discordId: targetUser.id,
          username: targetUser.username,
          displayName: targetUser.displayName || targetUser.username,
          avatar: targetUser.displayAvatarURL(),
          balance: Math.max(0, amount),
          role: "ADMIN",
        },
      });

      // Prevent balance from going below 0
      if (user.balance < 0) {
        await prisma.user.update({
          where: { id: user.id },
          data: { balance: 0 },
        });
      }

      await prisma.walletTransaction.create({
        data: {
          userId: user.id,
          amount,
          type: amount >= 0 ? "ADMIN_TOPUP" : "ADMIN_DEDUCT",
          note,
          createdBy: interaction.user.username,
        },
      });

      await prisma.auditLog.create({
        data: {
          action: "WALLET_BALANCE_ADJUSTED",
          category: "WALLET",
          details: `แอดมิน ${interaction.user.username} ปรับยอดเงินให้ ${targetUser.username}: ${amount >= 0 ? "+" : ""}${amount} ฿ (คงเหลือ: ${user.balance} ฿)`,
        },
      });

      const embed = new EmbedBuilder()
        .setColor(0x34c759)
        .setTitle("✅ ปรับปรุงยอดเงินสำเร็จ")
        .setDescription(
          `ปรับปรุงยอดเงินให้ <@${targetUser.id}> เรียบร้อยแล้ว\n\n` +
            `• **จำนวนที่ปรับ:** \`${amount >= 0 ? "+" : ""}${amount} ฿\`\n` +
            `• **ยอดเงินคงเหลือปัจจุบัน:** \`${user.balance.toLocaleString("th-TH")} ฿\`\n` +
            `• **หมายเหตุ:** ${note}`
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (err: any) {
      console.error("❌ [Wallet] Error in /give-balance:", err);
      await interaction.editReply({ content: `❌ เกิดข้อผิดพลาด: ${err.message}` });
    }
  },
};
