import {
  type ButtonInteraction,
  type ModalSubmitInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  AttachmentBuilder,
  type TextChannel,
} from "discord.js";
import { prisma } from "@lynnbot/database";
import { THEME_COLORS } from "../../utils/theme.js";
import { extractVoucherCode, redeemTrueMoneyVoucher } from "../truemoneyService.js";
import { generatePromptPayQR } from "../promptpayService.js";
import { ensureUser } from "./common.js";

/**
 * ============================================================================
 * WALLET PANEL HANDLERS
 * ============================================================================
 */
export async function handleWalletBalance(interaction: ButtonInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const user = await ensureUser(interaction.user);

  const embed = new EmbedBuilder()
    .setColor(THEME_COLORS.surface)
    .setTitle("💳  MY WALLET • กระเป๋าเงินของฉัน")
    .setDescription(
      `ข้อมูลยอดเงินคงเหลือของ <@${interaction.user.id}>\n\n` +
      `### ฿${user.balance.toLocaleString("th-TH", { minimumFractionDigits: 2 })}\n\n` +
      `• **สถานะบัญชี:** พร้อมใช้งาน (Active)\n` +
      `• **สิทธิประโยชน์:** ใช้ซื้อยศและบริการเสริมในร้านค้าได้ทันที\n\n` +
      `> ต้องการเติมเงิน สามารถกดปุ่ม **วิธีเติมเงิน** ด้านล่างได้เลยครับ`
    )
    .setFooter({ text: "LynnBot Operations System • Wallet" })
    .setTimestamp();

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("panel_wallet_topup")
      .setLabel("วิธีเติมเงิน • Top Up Info")
      .setEmoji("💸")
      .setStyle(ButtonStyle.Primary)
  );

  await interaction.editReply({ embeds: [embed], components: [row] });
}

export async function handleWalletTopupInfo(interaction: ButtonInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const ppSetting = await prisma.setting.findUnique({ where: { key: "promptpay_number" } });
  const tmSetting = await prisma.setting.findUnique({ where: { key: "truemoney_phone" } });
  const ppNumber = ppSetting?.value;
  const tmPhone = tmSetting?.value;

  const embed = new EmbedBuilder()
    .setColor(THEME_COLORS.surface)
    .setTitle("💸  WALLET TOP UP • ช่องทางการเติมเงินเข้ากระเป๋า")
    .setDescription(
      "ระบบรองรับการเติมเงินเข้ากระเป๋า 2 ช่องทางหลัก:\n\n" +
      "**1. 📲 พร้อมเพย์ (PromptPay QR Code)**\n" +
      (ppNumber
        ? `• หมายเลขพร้อมเพย์: \`${ppNumber}\`\n`
        : `• หมายเลขพร้อมเพย์: ติดต่อแอดมินผ่าน Ticket\n`) +
      "• กดปุ่ม **สร้าง QR Code พร้อมเพย์** ด้านล่าง เพื่อระบุยอดเงินและสแกนจ่ายได้ทันที\n\n" +
      "**2. 🎁 TrueMoney Wallet (ซองของขวัญ)**\n" +
      (tmPhone
        ? `• รองรับการเติมเงินอัตโนมัติ 24 ชม. (เบอร์รับ: \`${tmPhone.slice(0, 3)}****${tmPhone.slice(-3)}\`)\n`
        : "• รองรับการเติมเงินอัตโนมัติ 24 ชม. ผ่านระบบซองของขวัญ\n") +
      "• สร้างซองของขวัญในแอป TrueMoney แล้วกดปุ่ม **เติมเงินด้วยซอง TrueMoney** เพื่อรับเงินเข้ากระเป๋าอัตโนมัติทันที\n\n" +
      "> หลังจากโอนเงินผ่าน PromptPay สามารถกดปุ่ม **แจ้งส่งสลิป** เพื่อส่งหลักฐานให้แอดมินได้ตลอดเวลา"
    )
    .setFooter({ text: "LynnBot Operations System • Wallet" })
    .setTimestamp();

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("panel_topup_qr")
      .setLabel("สร้าง QR Code พร้อมเพย์")
      .setEmoji("📲")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("panel_topup_truemoney")
      .setLabel("เติมเงินด้วยซอง TrueMoney")
      .setEmoji("🎁")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("ticket_create")
      .setLabel("แจ้งส่งสลิป (เปิดทิกเก็ต)")
      .setEmoji("📩")
      .setStyle(ButtonStyle.Secondary)
  );

  await interaction.editReply({ embeds: [embed], components: [row] });
}

export async function showPromptPayModal(interaction: ButtonInteraction) {
  const modal = new ModalBuilder()
    .setCustomId("modal_topup_promptpay")
    .setTitle("ชำระเงินผ่าน PromptPay QR Code");

  const amountInput = new TextInputBuilder()
    .setCustomId("topup_amount")
    .setLabel("จำนวนเงินที่ต้องการเติม (บาท)")
    .setPlaceholder("เช่น 50, 100, 300 หรือเว้นว่างเพื่อสแกนระบุยอดเอง")
    .setStyle(TextInputStyle.Short)
    .setRequired(false);

  modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(amountInput));
  await interaction.showModal(modal);
}

export async function handlePromptPayModalSubmit(interaction: ModalSubmitInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const rawAmount = interaction.fields.getTextInputValue("topup_amount").trim();
  const amount = rawAmount ? parseFloat(rawAmount) : null;

  const setting = await prisma.setting.findUnique({ where: { key: "promptpay_number" } });
  const promptpayNumber = setting?.value?.trim() || "0954268212";

  try {
    const { buffer } = await generatePromptPayQR(promptpayNumber, amount);
    const attachment = new AttachmentBuilder(buffer, { name: "promptpay_qr.png" });

    const embed = new EmbedBuilder()
      .setColor(THEME_COLORS.accent)
      .setTitle("💳  PROMPTPAY QR CODE • สแกนเพื่อชำระเงิน")
      .setDescription(
        `สแกน QR Code ด้านล่างผ่านแอปพลิเคชันธนาคารทุกแห่งเพื่อเติมเงิน\n\n` +
        (amount && !isNaN(amount) && amount > 0
          ? `• **ยอดที่ต้องชำระ:** **฿${amount.toLocaleString("th-TH", { minimumFractionDigits: 2 })}**\n`
          : "") +
        `• **หมายเลขพร้อมเพย์:** \`${promptpayNumber}\`\n\n` +
        `> เมื่อโอนเงินเสร็จเรียบร้อย กรุณากดปุ่ม **"แจ้งส่งสลิปโอนเงิน"** ด้านล่างเพื่อให้แอดมินตรวจสอบและปรับยอดเงินเข้ากระเป๋าให้ทันที\n\n` +
        `-# LynnBot Security Payment • ตรวจสอบสลิป 24 ชม.`
      )
      .setImage("attachment://promptpay_qr.png")
      .setFooter({ text: "LynnBot Operations System • PromptPay Payment" })
      .setTimestamp();

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("ticket_create")
        .setLabel("แจ้งส่งสลิปโอนเงิน • Open Ticket")
        .setEmoji("📩")
        .setStyle(ButtonStyle.Success)
    );

    await interaction.editReply({ embeds: [embed], files: [attachment], components: [row] });
  } catch (err: any) {
    console.error("Generate PromptPay QR Error:", err);
    await interaction.editReply({
      content: `❌ ไม่สามารถสร้าง QR Code ได้: ${err.message}`,
    });
  }
}

export async function showTrueMoneyModal(interaction: ButtonInteraction) {
  const modal = new ModalBuilder()
    .setCustomId("modal_topup_truemoney")
    .setTitle("เติมเงินด้วยซองของขวัญ TrueMoney");

  const linkInput = new TextInputBuilder()
    .setCustomId("truemoney_link")
    .setLabel("ลิงก์ซองของขวัญ TrueMoney Wallet")
    .setPlaceholder("https://gift.truemoney.com/campaign/?v=...")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(linkInput));
  await interaction.showModal(modal);
}

export async function handleTrueMoneyModalSubmit(interaction: ModalSubmitInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const rawLink = interaction.fields.getTextInputValue("truemoney_link").trim();

  // 1. Fetch configured TrueMoney phone number from database Setting table
  const tmSetting = await prisma.setting.findUnique({ where: { key: "truemoney_phone" } });
  const receiverPhone = tmSetting?.value;

  if (!receiverPhone) {
    const errorEmbed = new EmbedBuilder()
      .setColor(THEME_COLORS.danger)
      .setTitle("⚠️  TRUEMONEY NOT CONFIGURED • ระบบยังไม่พร้อมใช้งาน")
      .setDescription(
        "ระบบ TrueMoney Wallet ยังไม่ได้ตั้งค่าเบอร์รับเงิน\n" +
        "กรุณาแจ้งแอดมินหรือผู้ดูแลให้เข้าไปกำหนด **เบอร์ TrueMoney Wallet** ในหน้า Web Dashboard"
      )
      .setFooter({ text: "LynnBot Operations System • Wallet" });

    await interaction.editReply({ embeds: [errorEmbed] });
    return;
  }

  // 2. Extract voucher code
  const voucherCode = extractVoucherCode(rawLink);
  if (!voucherCode) {
    const errorEmbed = new EmbedBuilder()
      .setColor(THEME_COLORS.danger)
      .setTitle("❌  INVALID LINK • ลิงก์ไม่ถูกต้อง")
      .setDescription(
        "รูปแบบลิงก์ซองของขวัญ TrueMoney ไม่ถูกต้อง\n\n" +
        "• ตัวอย่างลิงก์ที่ถูกต้อง: `https://gift.truemoney.com/campaign/?v=xxxxxx`\n" +
        "• กรุณาคัดลอกลิงก์ซองของขวัญที่สร้างจากแอป TrueMoney แล้วลองใหม่อีกครั้ง"
      )
      .setFooter({ text: "LynnBot Operations System • Wallet" });

    await interaction.editReply({ embeds: [errorEmbed] });
    return;
  }

  // 3. Redeem voucher via TrueMoney API
  const result = await redeemTrueMoneyVoucher(receiverPhone, voucherCode);

  if (!result.success || !result.amount) {
    const errorEmbed = new EmbedBuilder()
      .setColor(THEME_COLORS.danger)
      .setTitle("❌  REDEEM FAILED • เติมเงินไม่สำเร็จ")
      .setDescription(
        `ไม่สามารถดึงเงินจากซองของขวัญ TrueMoney ได้\n\n` +
        `• **สาเหตุ:** **${result.errorMessage || "เกิดข้อผิดพลาด"}**\n` +
        (result.errorCode ? `• **รหัสข้อผิดพลาด:** \`${result.errorCode}\`\n\n` : "\n") +
        `> คำแนะนำ: ตรวจสอบว่าซองของขวัญถูกใช้งานไปแล้วหรือไม่ หรือสร้างจากเบอร์เดียวกันกับเบอร์รับเงินของระบบ`
      )
      .setFooter({ text: "LynnBot Operations System • Wallet" });

    await interaction.editReply({ embeds: [errorEmbed] });
    return;
  }

  const amount = result.amount;
  const user = await ensureUser(interaction.user);

  // 4. Credit balance to user wallet in a database transaction
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { balance: { increment: amount } },
    }),
    prisma.walletTransaction.create({
      data: {
        userId: user.id,
        amount: amount,
        type: "TOPUP",
        note: `เติมเงิน TrueMoney ซองของขวัญ (฿${amount})`,
        createdBy: "SYSTEM",
      },
    }),
    prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "เติมเงิน TrueMoney Wallet",
        category: "WALLET",
        details: `${user.displayName || user.username} เติมเงินผ่าน TrueMoney ซองของขวัญ จำนวน ฿${amount} (จาก: ${result.ownerName || "ไม่ระบุ"})`,
      },
    }),
  ]);

  // 5. Notify log channel if configured
  try {
    const setting = await prisma.setting.findUnique({ where: { key: "shop_notify_channel" } });
    if (setting?.value && interaction.guild) {
      const logChannel = interaction.guild.channels.cache.get(setting.value) as TextChannel | undefined;
      if (logChannel) {
        const logEmbed = new EmbedBuilder()
          .setColor(THEME_COLORS.success)
          .setTitle("🎁  TRUEMONEY TOP UP • เติมเงินสำเร็จ")
          .setDescription(
            `<@${interaction.user.id}> ได้เติมเงินผ่าน TrueMoney ซองของขวัญ\n` +
            `• ยอดเงิน: **+฿${amount.toLocaleString("th-TH", { minimumFractionDigits: 2 })}**\n` +
            `• ผู้สร้างซอง: ${result.ownerName || "ไม่ระบุ"}\n` +
            `• วันที่ทำรายการ: <t:${Math.floor(Date.now() / 1000)}:f>`
          )
          .setTimestamp();
        await logChannel.send({ embeds: [logEmbed] });
      }
    }
  } catch (err) {
    console.error("TrueMoney log notify error:", err);
  }

  const newBalance = user.balance + amount;

  const successEmbed = new EmbedBuilder()
    .setColor(THEME_COLORS.success)
    .setTitle("🎉  TOP UP SUCCESSFUL • เติมเงินสำเร็จ")
    .setDescription(
      `ระบบได้ดึงเงินจากซองของขวัญและเพิ่มเข้ากระเป๋าของคุณเรียบร้อยแล้ว!\n\n` +
      `• **ยอดเงินที่ได้รับ:** **+฿${amount.toLocaleString("th-TH", { minimumFractionDigits: 2 })}**\n` +
      `• **ยอดเงินคงเหลือใหม่:** **฿${newBalance.toLocaleString("th-TH", { minimumFractionDigits: 2 })}**\n` +
      `• **ผู้สร้างซอง:** ${result.ownerName || "สมาชิก TrueMoney"}\n\n` +
      `> ยอดเงินพร้อมใช้งานในระบบ สามารถใช้สั่งซื้อยศในเซิร์ฟเวอร์ได้ทันที\n\n` +
      `-# LynnBot Wallet System • ขอขอบคุณสำหรับการสนับสนุนครับ`
    )
    .setFooter({ text: "LynnBot Operations System • Wallet" })
    .setTimestamp();

  await interaction.editReply({ embeds: [successEmbed] });
}
