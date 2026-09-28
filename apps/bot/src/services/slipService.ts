import {
  type Guild,
  type TextChannel,
  type ButtonInteraction,
  type ModalSubmitInteraction,
  type Attachment,
  type User as DiscordUser,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  AttachmentBuilder,
} from "discord.js";
import { prisma } from "@lynnbot/database";
import { THEME_COLORS } from "../utils/theme.js";
import { uploadToR2 } from "./r2Service.js";

/**
 * Ensures user exists in database and returns the record
 */
async function ensureUser(discordUser: DiscordUser) {
  return await prisma.user.upsert({
    where: { discordId: discordUser.id },
    update: {
      username: discordUser.username,
      displayName: discordUser.displayName || discordUser.username,
      avatar: discordUser.avatar,
    },
    create: {
      discordId: discordUser.id,
      username: discordUser.username,
      displayName: discordUser.displayName || discordUser.username,
      avatar: discordUser.avatar,
      role: "ADMIN",
    },
  });
}

/**
 * Records an incoming slip attachment to database, uploads to R2 if configured,
 * and notifies the admin slip review channel.
 */
export async function recordIncomingSlip({
  guild,
  channelId,
  author,
  attachment,
  ticketId,
  amount,
}: {
  guild: Guild;
  channelId?: string;
  author: DiscordUser;
  attachment: Attachment;
  ticketId?: string;
  amount?: number | null;
}) {
  const isImage =
    attachment.contentType?.startsWith("image/") ||
    /\.(png|jpe?g|webp|gif)$/i.test(attachment.name);

  if (!isImage) return null;

  const user = await ensureUser(author);

  // 1. Download buffer
  let buffer: Buffer | null = null;
  try {
    const res = await fetch(attachment.url);
    if (res.ok) {
      const arr = await res.arrayBuffer();
      buffer = Buffer.from(arr);
    }
  } catch (err) {
    console.error("Failed to download slip image buffer:", err);
  }

  // 2. Upload to Cloudflare R2 if available
  let imageUrl = attachment.url;
  let r2Key: string | null = null;

  if (buffer) {
    const r2Result = await uploadToR2(
      buffer,
      attachment.name,
      attachment.contentType || "image/png"
    );
    if (r2Result) {
      imageUrl = r2Result.url;
      r2Key = r2Result.key;
    }
  }

  // 3. Save to database
  const slip = await prisma.slip.create({
    data: {
      userId: user.id,
      discordId: author.id,
      discordName: author.displayName || author.username,
      channelId: channelId || null,
      ticketId: ticketId || null,
      imageUrl,
      r2Key,
      originalName: attachment.name,
      amount: amount || null,
      status: "PENDING",
    },
  });

  // 4. Forward to Admin Slip Review Channel
  try {
    const slipChannelSetting = await prisma.setting.findUnique({
      where: { key: "slip_notify_channel" },
    });
    const logChannelSetting = await prisma.setting.findUnique({
      where: { key: "ticket_log_channel" },
    });

    const targetChannelId = slipChannelSetting?.value || logChannelSetting?.value;
    if (targetChannelId) {
      const adminChannel = guild.channels.cache.get(targetChannelId) as TextChannel | undefined;
      if (adminChannel) {
        const webUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

        const embed = new EmbedBuilder()
          .setColor(THEME_COLORS.accent)
          .setTitle("🧾  NEW PAYMENT SLIP • ได้รับสลิปโอนเงินใหม่")
          .setDescription(
            `มีสมาชิกส่งสลิปโอนเงินเข้ามาเพื่อรอการตรวจสอบและอนุมัติ\n\n` +
            `• **รหัสสลิป:** \`#${slip.id.slice(-6).toUpperCase()}\`\n` +
            `• **ผู้ส่ง:** <@${author.id}> (\`${author.username}\`)\n` +
            (ticketId ? `• **ห้องทิกเก็ต:** \`${ticketId}\`\n` : "") +
            (amount ? `• **ยอดที่ระบุ:** **฿${amount.toLocaleString("th-TH", { minimumFractionDigits: 2 })}**\n` : "") +
            `• **สถานะ:** ⏳ **รอตรวจสอบ (PENDING)**\n` +
            `• **เวลาส่ง:** <t:${Math.floor(Date.now() / 1000)}:f>\n` +
            (r2Key ? `• **ระบบจัดเก็บ:** ☁️ Cloudflare R2 (ถาวร)\n\n` : `• **ระบบจัดเก็บ:** 📁 Discord Storage\n\n`) +
            `> แอดมินสามารถกดปุ่มด้านล่างเพื่ออนุมัติหรือปฏิเสธสลิปได้ทันที`
          )
          .setImage(imageUrl)
          .setFooter({ text: "LynnBot Operations System • Slip Verification" })
          .setTimestamp();

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`slip_approve_${slip.id}`)
            .setLabel("อนุมัติ & ปรับยอดเงิน")
            .setEmoji("✅")
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`slip_reject_${slip.id}`)
            .setLabel("ปฏิเสธสลิป")
            .setEmoji("❌")
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setLabel("เปิดใน Web Dashboard")
            .setEmoji("🌐")
            .setStyle(ButtonStyle.Link)
            .setURL(`${webUrl}/slips`)
        );

        // If buffer is available and no R2, also attach image for permanent discord archiving
        if (buffer && !r2Key) {
          const file = new AttachmentBuilder(buffer, { name: `slip_${slip.id.slice(-6)}.png` });
          embed.setImage(`attachment://slip_${slip.id.slice(-6)}.png`);
          await adminChannel.send({ embeds: [embed], files: [file], components: [row] });
        } else {
          await adminChannel.send({ embeds: [embed], components: [row] });
        }
      }
    }
  } catch (err) {
    console.error("Error sending slip to admin channel:", err);
  }

  return slip;
}

/**
 * Handles clicking the Approve button on a slip in Discord
 */
export async function handleSlipApproveClick(
  interaction: ButtonInteraction,
  slipId: string
) {
  const slip = await prisma.slip.findUnique({ where: { id: slipId } });
  if (!slip) {
    await interaction.reply({ content: "❌ ไม่พบข้อมูลสลิปนี้ในระบบ", ephemeral: true });
    return;
  }

  if (slip.status !== "PENDING") {
    await interaction.reply({
      content: `⚠️ สลิปนี้ได้รับการประมวลผลแล้ว (สถานะ: ${slip.status})`,
      ephemeral: true,
    });
    return;
  }

  const modal = new ModalBuilder()
    .setCustomId(`modal_slip_approve_${slip.id}`)
    .setTitle(`อนุมัติสลิป #${slip.id.slice(-6).toUpperCase()}`);

  const amountInput = new TextInputBuilder()
    .setCustomId("slip_amount")
    .setLabel("จำนวนเงินที่ต้องการเติมเข้ากระเป๋า (THB)")
    .setValue(slip.amount ? String(slip.amount) : "")
    .setPlaceholder("เช่น 50, 100, 300")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const noteInput = new TextInputBuilder()
    .setCustomId("slip_note")
    .setLabel("หมายเหตุเพิ่มเติม (ถ้ามี)")
    .setPlaceholder("เช่น เติมเงินผ่าน PromptPay ยอด 100 บาท")
    .setStyle(TextInputStyle.Short)
    .setRequired(false);

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(amountInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(noteInput)
  );

  await interaction.showModal(modal);
}

/**
 * Handles submitting the Approve modal in Discord
 */
export async function handleSlipApproveModalSubmit(
  interaction: ModalSubmitInteraction,
  slipId: string
) {
  await interaction.deferReply({ ephemeral: true });

  const rawAmount = interaction.fields.getTextInputValue("slip_amount").trim();
  const note = interaction.fields.getTextInputValue("slip_note")?.trim() || "อนุมัติสลิปโอนเงิน";
  const amount = parseFloat(rawAmount);

  if (isNaN(amount) || amount <= 0) {
    await interaction.editReply({ content: "❌ กรุณาระบุจำนวนเงินเป็นตัวเลขที่มากกว่า 0" });
    return;
  }

  const slip = await prisma.slip.findUnique({
    where: { id: slipId },
    include: { user: true },
  });

  if (!slip) {
    await interaction.editReply({ content: "❌ ไม่พบข้อมูลสลิปนี้ในระบบ" });
    return;
  }

  if (slip.status !== "PENDING") {
    await interaction.editReply({
      content: `⚠️ สลิปนี้ได้รับการประมวลผลไปแล้ว (สถานะ: ${slip.status})`,
    });
    return;
  }

  const admin = await ensureUser(interaction.user);

  // Execute approval transaction
  await prisma.$transaction([
    prisma.slip.update({
      where: { id: slip.id },
      data: {
        status: "APPROVED",
        amount,
        note,
        reviewedById: admin.id,
        reviewedByName: interaction.user.displayName || interaction.user.username,
        reviewedAt: new Date(),
      },
    }),
    prisma.user.update({
      where: { discordId: slip.discordId },
      data: {
        balance: { increment: amount },
      },
    }),
    prisma.walletTransaction.create({
      data: {
        userId: slip.userId || admin.id,
        amount,
        type: "TOPUP",
        note: `อนุมัติสลิป #${slip.id.slice(-6).toUpperCase()} (${note})`,
        createdBy: `ADMIN:${interaction.user.username}`,
      },
    }),
    prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: "อนุมัติสลิปโอนเงิน",
        category: "SLIP",
        details: `${interaction.user.username} อนุมัติสลิป #${slip.id.slice(-6).toUpperCase()} ของ <@${slip.discordId}> จำนวน ฿${amount}`,
      },
    }),
  ]);

  // Update original admin message embed if possible
  try {
    if (interaction.message) {
      const originalEmbed = EmbedBuilder.from(interaction.message.embeds[0])
        .setColor(THEME_COLORS.success)
        .setTitle("✅  SLIP APPROVED • สลิปได้รับการอนุมัติแล้ว")
        .setDescription(
          `สลิปโอนเงินนี้ได้รับการตรวจสอบและเติมเงินเข้ากระเป๋าเรียบร้อยแล้ว\n\n` +
          `• **รหัสสลิป:** \`#${slip.id.slice(-6).toUpperCase()}\`\n` +
          `• **ผู้ส่ง:** <@${slip.discordId}>\n` +
          `• **ยอดเงินที่อนุมัติ:** **+฿${amount.toLocaleString("th-TH", { minimumFractionDigits: 2 })}**\n` +
          `• **สถานะ:** ✅ **อนุมัติแล้ว (APPROVED)**\n` +
          `• **ผู้อนุมัติ:** <@${interaction.user.id}>\n` +
          `• **เวลาอนุมัติ:** <t:${Math.floor(Date.now() / 1000)}:f>\n` +
          `• **หมายเหตุ:** ${note}`
        );

      await interaction.message.edit({
        embeds: [originalEmbed],
        components: [], // disable buttons
      });
    }
  } catch (err) {
    console.error("Could not edit original slip message:", err);
  }

  // Notify submitter in DM or channel if possible
  try {
    const targetUser = await interaction.client.users.fetch(slip.discordId);
    if (targetUser) {
      const dmEmbed = new EmbedBuilder()
        .setColor(THEME_COLORS.success)
        .setTitle("🎉  PAYMENT APPROVED • ยอดเงินเข้ากระเป๋าแล้ว")
        .setDescription(
          `สลิปโอนเงินของคุณได้รับการตรวจสอบและอนุมัติเรียบร้อยแล้ว!\n\n` +
          `• **ยอดเงินที่ได้รับ:** **+฿${amount.toLocaleString("th-TH", { minimumFractionDigits: 2 })}**\n` +
          `• **รหัสอ้างอิง:** \`#${slip.id.slice(-6).toUpperCase()}\`\n` +
          `• **ผู้อนุมัติ:** ${interaction.user.displayName || interaction.user.username}\n\n` +
          `> คุณสามารถใช้ยอดเงินคงเหลือเพื่อซื้อยศในเซิร์ฟเวอร์ได้ทันทีครับ\n\n` +
          `-# LynnBot Security Payment • ขอขอบคุณสำหรับการสนับสนุนครับ`
        )
        .setTimestamp();
      await targetUser.send({ embeds: [dmEmbed] });
    }
  } catch (dmErr) {
    // DM might be closed
  }

  await interaction.editReply({
    content: `✅ อนุมัติสลิป #${slip.id.slice(-6).toUpperCase()} สำเร็จ! เติมเงิน **฿${amount.toLocaleString("th-TH", { minimumFractionDigits: 2 })}** เข้ากระเป๋า <@${slip.discordId}> เรียบร้อยแล้ว`,
  });
}

/**
 * Handles clicking the Reject button on a slip in Discord
 */
export async function handleSlipRejectClick(
  interaction: ButtonInteraction,
  slipId: string
) {
  const slip = await prisma.slip.findUnique({ where: { id: slipId } });
  if (!slip) {
    await interaction.reply({ content: "❌ ไม่พบข้อมูลสลิปนี้ในระบบ", ephemeral: true });
    return;
  }

  if (slip.status !== "PENDING") {
    await interaction.reply({
      content: `⚠️ สลิปนี้ได้รับการประมวลผลแล้ว (สถานะ: ${slip.status})`,
      ephemeral: true,
    });
    return;
  }

  const modal = new ModalBuilder()
    .setCustomId(`modal_slip_reject_${slip.id}`)
    .setTitle(`ปฏิเสธสลิป #${slip.id.slice(-6).toUpperCase()}`);

  const reasonInput = new TextInputBuilder()
    .setCustomId("reject_reason")
    .setLabel("ระบุเหตุผลที่ปฏิเสธสลิป")
    .setPlaceholder("เช่น ไม่พบยอดโอนเงิน, สลิปซ้ำ, ยอดเงินไม่ถูกต้อง")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput)
  );

  await interaction.showModal(modal);
}

/**
 * Handles submitting the Reject modal in Discord
 */
export async function handleSlipRejectModalSubmit(
  interaction: ModalSubmitInteraction,
  slipId: string
) {
  await interaction.deferReply({ ephemeral: true });

  const reason = interaction.fields.getTextInputValue("reject_reason").trim();

  const slip = await prisma.slip.findUnique({ where: { id: slipId } });
  if (!slip) {
    await interaction.editReply({ content: "❌ ไม่พบข้อมูลสลิปนี้ในระบบ" });
    return;
  }

  if (slip.status !== "PENDING") {
    await interaction.editReply({
      content: `⚠️ สลิปนี้ได้รับการประมวลผลไปแล้ว (สถานะ: ${slip.status})`,
    });
    return;
  }

  const admin = await ensureUser(interaction.user);

  await prisma.$transaction([
    prisma.slip.update({
      where: { id: slip.id },
      data: {
        status: "REJECTED",
        note: reason,
        reviewedById: admin.id,
        reviewedByName: interaction.user.displayName || interaction.user.username,
        reviewedAt: new Date(),
      },
    }),
    prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: "ปฏิเสธสลิปโอนเงิน",
        category: "SLIP",
        details: `${interaction.user.username} ปฏิเสธสลิป #${slip.id.slice(-6).toUpperCase()} ของ <@${slip.discordId}> (สาเหตุ: ${reason})`,
      },
    }),
  ]);

  // Update original admin message embed if possible
  try {
    if (interaction.message) {
      const originalEmbed = EmbedBuilder.from(interaction.message.embeds[0])
        .setColor(THEME_COLORS.danger)
        .setTitle("❌  SLIP REJECTED • สลิปถูกปฏิเสธ")
        .setDescription(
          `สลิปโอนเงินนี้ถูกปฏิเสธโดยแอดมิน\n\n` +
          `• **รหัสสลิป:** \`#${slip.id.slice(-6).toUpperCase()}\`\n` +
          `• **ผู้ส่ง:** <@${slip.discordId}>\n` +
          `• **สถานะ:** ❌ **ปฏิเสธ (REJECTED)**\n` +
          `• **ผู้ตรวจสอบ:** <@${interaction.user.id}>\n` +
          `• **เวลาตรวจสอบ:** <t:${Math.floor(Date.now() / 1000)}:f>\n` +
          `• **สาเหตุที่ปฏิเสธ:** **${reason}**`
        );

      await interaction.message.edit({
        embeds: [originalEmbed],
        components: [], // disable buttons
      });
    }
  } catch (err) {
    console.error("Could not edit original slip message:", err);
  }

  // Notify submitter in DM if possible
  try {
    const targetUser = await interaction.client.users.fetch(slip.discordId);
    if (targetUser) {
      const dmEmbed = new EmbedBuilder()
        .setColor(THEME_COLORS.danger)
        .setTitle("⚠️  SLIP REJECTED • สลิปโอนเงินไม่ผ่านการอนุมัติ")
        .setDescription(
          `สลิปโอนเงินของคุณไม่ผ่านการตรวจสอบ\n\n` +
          `• **รหัสอ้างอิง:** \`#${slip.id.slice(-6).toUpperCase()}\`\n` +
          `• **สาเหตุ:** **${reason}**\n` +
          `• **ผู้ตรวจสอบ:** ${interaction.user.displayName || interaction.user.username}\n\n` +
          `> หากคุณคิดว่านี่เป็นข้อผิดพลาด กรุณาเปิดทิกเก็ตเพื่อติดต่อแอดมินโดยตรงครับ`
        )
        .setTimestamp();
      await targetUser.send({ embeds: [dmEmbed] });
    }
  } catch (dmErr) {
    // DM might be closed
  }

  await interaction.editReply({
    content: `❌ ปฏิเสธสลิป #${slip.id.slice(-6).toUpperCase()} เรียบร้อยแล้ว (สาเหตุ: ${reason})`,
  });
}
