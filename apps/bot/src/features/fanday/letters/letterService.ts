import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  type ButtonInteraction,
  type ModalSubmitInteraction,
  type TextChannel,
} from "discord.js";
import { prisma } from "@lynnbot/database";
import { createFandayEmbed, FANDAY_COLORS } from "../../../utils/fandayTheme.js";

/**
 * 💌 1. Show Letter Composition Modal
 */
export async function showLetterComposeModal(interaction: ButtonInteraction, pairId: string) {
  const pair = await prisma.fandayPair.findUnique({
    where: { id: pairId },
  });

  if (!pair) {
    await interaction.reply({ content: "❌ ไม่พบข้อมูลคู่แฟนเดย์นี้", ephemeral: true });
    return;
  }

  const modal = new ModalBuilder()
    .setCustomId(`fd_modal_letter:${pairId}`)
    .setTitle("เขียนจดหมายความรู้สึกถึงคู่แฟนเดย์");

  const contentInput = new ActionRowBuilder<TextInputBuilder>().addComponents(
    new TextInputBuilder()
      .setCustomId("letter_content")
      .setLabel("ข้อความในจดหมายถึงคู่ของคุณ")
      .setPlaceholder("บอกเล่าความรู้สึก ขอบคุณที่ร่วมเล่นกิจกรรม หรือคำพูดดีๆ ที่อยากส่งต่อ...")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
      .setMaxLength(1000)
  );

  const anonInput = new ActionRowBuilder<TextInputBuilder>().addComponents(
    new TextInputBuilder()
      .setCustomId("letter_anonymous")
      .setLabel("ส่งแบบนิรนามหรือไม่? (พิมพ์ 'ใช่' หรือ 'ไม่')")
      .setPlaceholder("พิมพ์ 'ใช่' หากไม่ต้องการระบุชื่อผู้ส่ง (ค่าเริ่มต้น: ไม่)")
      .setStyle(TextInputStyle.Short)
      .setRequired(false)
      .setMaxLength(10)
  );

  modal.addComponents(contentInput, anonInput);
  await interaction.showModal(modal);
}

/**
 * 💌 2. Process Letter Submission
 */
export async function handleLetterSubmit(interaction: ModalSubmitInteraction, pairId: string) {
  try {
    const pair = await prisma.fandayPair.findUnique({
      where: { id: pairId },
      include: { event: true },
    });

    if (!pair) {
      await interaction.reply({ content: "❌ ไม่พบข้อมูลคู่แฟนเดย์นี้", ephemeral: true });
      return;
    }

    const content = interaction.fields.getTextInputValue("letter_content");
    const anonRaw = interaction.fields.getTextInputValue("letter_anonymous") || "";
    const isAnonymous = anonRaw.trim() === "ใช่" || anonRaw.toLowerCase() === "yes";

    const targetUserId = pair.playerAId === interaction.user.id ? pair.playerBId : pair.playerAId;

    // Save to database
    const letter = await prisma.fandayLetter.create({
      data: {
        eventId: pair.eventId,
        pairId: pair.id,
        fromId: interaction.user.id,
        toId: targetUserId,
        content,
        isAnonymous,
        status: "SENT",
        deliveredAt: new Date(),
      },
    });

    // Create confirmation embed for author
    const authorConfirmEmbed = createFandayEmbed({
      title: "💌 ส่งจดหมายถึงคู่ของคุณสำเร็จแล้ว!",
      description:
        `ระบบได้จัดส่งจดหมายของคุณถึง <@${targetUserId}> เรียบร้อยแล้วครับ\n\n` +
        `• **รูปแบบการส่ง:** ${isAnonymous ? "🎭 นิรนาม (ไม่ระบุชื่อ)" : "👤 ระบุชื่อผู้ส่ง"}\n` +
        `• **ข้อความของคุณ:**\n> *"${content}"*\n\n` +
        `ขอบคุณที่ร่วมสร้างความทรงจำดีๆ ในกิจกรรม **${pair.event.title}** นะครับ!`,
      color: FANDAY_COLORS.pink,
    });

    await interaction.reply({ embeds: [authorConfirmEmbed], ephemeral: true });

    // Build letter card for recipient
    const recipientEmbed = createFandayEmbed({
      title: "💌 คุณได้รับจดหมายแฟนเดย์ฉบับใหม่!",
      description:
        `มีจดหมายส่งถึงคุณในกิจกรรม **${pair.event.title}**:\n\n` +
        `• **จาก:** ${isAnonymous ? "🎭 ผู้ส่งนิรนาม (Secret Fanday)" : `<@${interaction.user.id}>`}\n\n` +
        `📜 **เนื้อความในจดหมาย:**\n` +
        `\`\`\`\n${content}\n\`\`\`\n` +
        `-# หากต้องการเขียนจดหมายตอบกลับ สามารถกดปุ่มด้านล่างได้เลยครับ`,
      color: FANDAY_COLORS.pink,
    });

    const replyRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`fd_letter_write:${pair.id}`)
        .setLabel("เขียนจดหมายตอบกลับ")
        .setEmoji("✍️")
        .setStyle(ButtonStyle.Primary)
    );

    // 1. Try sending directly to DM
    try {
      const recipientUser = await interaction.client.users.fetch(targetUserId);
      if (recipientUser) {
        await recipientUser.send({ embeds: [recipientEmbed], components: [replyRow] });
      }
    } catch (dmErr) {
      console.warn(`Could not DM letter to ${targetUserId}, will deliver in private channel`);
    }

    // 2. Also deliver into pair private thread if available
    if (pair.channelId) {
      try {
        const channel = interaction.client.channels.cache.get(pair.channelId) as TextChannel | undefined;
        if (channel) {
          await channel.send({
            content: `📬 มีจดหมายส่งถึง <@${targetUserId}> ครับ!`,
            embeds: [recipientEmbed],
            components: [replyRow],
          });
        }
      } catch (cErr) {
        console.warn("Could not post letter in pair channel:", cErr);
      }
    }

    // Audit Log
    await prisma.auditLog.create({
      data: {
        action: "Fanday: Letter Delivered",
        category: "FANDAY",
        details: `Letter delivered from ${isAnonymous ? "Anonymous" : interaction.user.id} to ${targetUserId} in event ${pair.event.title}`,
      },
    });
  } catch (err: any) {
    console.error("Error in handleLetterSubmit:", err);
  }
}

