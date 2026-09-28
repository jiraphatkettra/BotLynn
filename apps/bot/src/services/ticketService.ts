import {
  type ButtonInteraction,
  type TextChannel,
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder,
} from "discord.js";
import { prisma } from "@lynnbot/database";
import { recordIncomingSlip } from "./slipService.js";

export async function handleTicketCreate(interaction: ButtonInteraction) {
  if (!interaction.guild) return;

  await interaction.deferReply({ ephemeral: true });

  try {
    const existing = await prisma.ticket.findFirst({
      where: {
        guildId: interaction.guildId!,
        creatorId: interaction.user.id,
        status: { in: ["OPEN", "CLAIMED"] },
      },
    });

    if (existing) {
      await interaction.editReply({
        content: `⚠️ คุณมีทิกเก็ตที่ยังเปิดอยู่แล้ว: <#${existing.channelId}>\nกรุณาใช้ห้องสนทนาดังกล่าว หรือรอให้แอดมินปิดก่อนเปิดใหม่ครับ`,
      });
      return;
    }

    const count = await prisma.ticket.count();
    const ticketId = `ticket-${String(count + 1).padStart(4, "0")}`;

    // Create private text channel
    const channel = await interaction.guild.channels.create({
      name: `🎫-${ticketId}-${interaction.user.username.slice(0, 10).toLowerCase()}`,
      type: ChannelType.GuildText,
      permissionOverwrites: [
        {
          id: interaction.guild.roles.everyone.id,
          deny: [PermissionFlagsBits.ViewChannel],
        },
        {
          id: interaction.user.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.AttachFiles,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.EmbedLinks,
          ],
        },
        {
          id: interaction.client.user.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ManageChannels,
            PermissionFlagsBits.ReadMessageHistory,
          ],
        },
      ],
    });

    // Save ticket in DB
    await prisma.ticket.create({
      data: {
        ticketId,
        channelId: channel.id,
        guildId: interaction.guildId!,
        creatorId: interaction.user.id,
        creatorName: interaction.user.username,
        status: "OPEN",
        subject: "บริการทั่วไป & แจ้งปัญหา",
      },
    });

    // Send greeting in the channel
    const embed = new EmbedBuilder()
      .setColor(0x16161c)
      .setTitle(`🎫  TICKET #${ticketId.toUpperCase()} • ศูนย์บริการช่วยเหลือ`)
      .setDescription(
        `ยินดีต้อนรับคุณ <@${interaction.user.id}>\n\n` +
        `กรุณาระบุรายละเอียดปัญหา เรื่องที่ต้องการสอบถาม หรือแนบหลักฐานทิ้งไว้ในห้องนี้ได้เลยครับ\n` +
        `ทีมผู้ดูแลจะเข้ามาตรวจสอบและให้บริการอย่างรวดเร็วที่สุด\n\n` +
        `> เจ้าหน้าที่: เฉพาะคุณและทีมงานเท่านั้นที่สามารถเข้าถึงห้องนี้ได้\n\n` +
        `-# คลิกปุ่มด้านล่างเพื่อรับเรื่องหรือปิดทิกเก็ต`
      )
      .setFooter({
        text: "LynnBot Operations System • Ticket Helpdesk",
      })
      .setTimestamp();

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("ticket_claim")
        .setLabel("รับเรื่อง • Claim")
        .setStyle(ButtonStyle.Success)
        .setEmoji("🙋‍♂️"),
      new ButtonBuilder()
        .setCustomId("ticket_close")
        .setLabel("ปิดทิกเก็ต • Close")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("🔒")
    );

    await channel.send({
      content: `<@${interaction.user.id}> ยินดีต้อนรับสู่ระบบช่วยเหลือ`,
      embeds: [embed],
      components: [row],
    });

    await interaction.editReply({
      content: `✅ เปิดห้องทิกเก็ตสำเร็จแล้ว: <#${channel.id}>`,
    });
  } catch (error: any) {
    console.error("❌ Error in handleTicketCreate:", error);
    await interaction.editReply({
      content: `❌ เกิดข้อผิดพลาดในการสร้างทิกเก็ต: ${error.message}`,
    });
  }
}

export async function handleTicketClaim(interaction: ButtonInteraction) {
  if (!interaction.guild || !interaction.channel) return;

  try {
    const ticket = await prisma.ticket.findUnique({
      where: { channelId: interaction.channelId },
    });

    if (!ticket) {
      await interaction.reply({
        content: "❌ ไม่พบข้อมูลทิกเก็ตนี้ในระบบ",
        ephemeral: true,
      });
      return;
    }

    if (ticket.status === "CLAIMED") {
      await interaction.reply({
        content: `⚠️ ทิกเก็ตนี้มีผู้รับเรื่องแล้ว`,
        ephemeral: true,
      });
      return;
    }

    // Upsert admin user
    const adminUser = await prisma.user.upsert({
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
    });

    await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        status: "CLAIMED",
        claimedById: adminUser.id,
      },
    });

    const embed = new EmbedBuilder()
      .setColor(0x30d158)
      .setTitle("🙋‍♂️  TICKET CLAIMED • เจ้าหน้าที่รับเรื่องแล้ว")
      .setDescription(
        `เจ้าหน้าที่ <@${interaction.user.id}> (${interaction.user.username}) ได้ทำการรับเรื่องและกำลังเข้าดูแลทิกเก็ตนี้ให้กับคุณครับ`
      )
      .setFooter({ text: "LynnBot Operations System" })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  } catch (error: any) {
    console.error("❌ Error in handleTicketClaim:", error);
    await interaction.reply({
      content: `❌ เกิดข้อผิดพลาด: ${error.message}`,
      ephemeral: true,
    });
  }
}

export async function handleTicketClose(interaction: ButtonInteraction) {
  if (!interaction.guild || !interaction.channel) return;

  await interaction.deferReply();

  try {
    const ticket = await prisma.ticket.findUnique({
      where: { channelId: interaction.channelId },
    });

    if (!ticket) {
      await interaction.editReply({
        content: "❌ ไม่พบข้อมูลทิกเก็ตนี้ในระบบ",
      });
      return;
    }

    // Fetch messages for rich transcript & slip archiving
    let transcriptData = "";
    const richMessages: any[] = [];
    const slipAttachments: AttachmentBuilder[] = [];

    try {
      const channel = interaction.channel as any;
      const messages = await channel.messages.fetch({ limit: 100 });
      const sorted = Array.from(messages.values()).reverse() as any[];

      const plainLines: string[] = [];

      for (const m of sorted) {
        const msgAttachments: any[] = [];
        for (const att of m.attachments.values()) {
          const isImg =
            att.contentType?.startsWith("image/") ||
            /\.(png|jpe?g|webp|gif)$/i.test(att.name);

          msgAttachments.push({
            id: att.id,
            name: att.name,
            url: att.url,
            contentType: att.contentType,
            isImage: isImg,
          });

          if (isImg && !m.author.bot) {
            slipAttachments.push(
              new AttachmentBuilder(att.url, {
                name: `slip_${ticket.ticketId}_${att.name}`,
              })
            );

            // Record into Slip database if not already recorded
            try {
              await recordIncomingSlip({
                guild: interaction.guild,
                channelId: interaction.channelId,
                author: m.author,
                attachment: att,
                ticketId: ticket.ticketId,
              });
            } catch (err) {
              console.error("Auto slip record error on close:", err);
            }
          }
        }

        const dateStr = new Date(m.createdTimestamp).toLocaleString("th-TH");
        let line = `[${dateStr}] ${m.author.username}: ${m.content || ""}`;
        if (msgAttachments.length) {
          line += ` [ไฟล์แนบ: ${msgAttachments.map((a) => a.name).join(", ")}]`;
        }
        plainLines.push(line);

        richMessages.push({
          id: m.id,
          author: m.author.displayName || m.author.username,
          authorId: m.author.id,
          avatar: m.author.displayAvatarURL ? m.author.displayAvatarURL() : null,
          bot: m.author.bot,
          content: m.content || "",
          timestamp: m.createdTimestamp,
          attachments: msgAttachments,
        });
      }

      const plainText = plainLines.join("\n");
      const transcriptPayload = {
        version: 2,
        ticketId: ticket.ticketId,
        creatorName: ticket.creatorName,
        creatorId: ticket.creatorId,
        closedBy: interaction.user.username,
        closedAt: new Date().toISOString(),
        totalMessages: richMessages.length,
        slipsCount: slipAttachments.length,
        messages: richMessages,
        plainText,
      };

      transcriptData = JSON.stringify(transcriptPayload);

      // Forward to Discord log channel if configured
      try {
        const logSetting = await prisma.setting.findUnique({
          where: { key: "ticket_log_channel" },
        });
        if (logSetting?.value) {
          const logChannel = interaction.guild.channels.cache.get(logSetting.value) as TextChannel | undefined;
          if (logChannel) {
            const txtBuffer = Buffer.from(plainText, "utf-8");
            const txtFile = new AttachmentBuilder(txtBuffer, {
              name: `transcript-${ticket.ticketId}.txt`,
            });

            const logEmbed = new EmbedBuilder()
              .setColor(0x0071e3)
              .setTitle(`📋  TICKET ARCHIVE • ประวัติทิกเก็ต #${ticket.ticketId.toUpperCase()}`)
              .setDescription(
                `**ข้อมูลทิกเก็ตที่ปิดแล้ว:**\n` +
                `• **รหัสทิกเก็ต:** \`${ticket.ticketId}\`\n` +
                `• **ผู้เปิด:** <@${ticket.creatorId}> (${ticket.creatorName})\n` +
                `• **ผู้ปิด:** <@${interaction.user.id}>\n` +
                `• **จำนวนข้อความ:** \`${richMessages.length}\` ข้อความ\n` +
                `• **สลิป / รูปภาพแนบ:** \`${slipAttachments.length}\` ไฟล์\n` +
                `• **เวลาปิด:** <t:${Math.floor(Date.now() / 1000)}:f>\n\n` +
                `> 📁 แนบไฟล์ประวัติบทสนทนา (.txt) และสำเนารูปภาพสลิปทั้งหมดด้านล่าง`
              )
              .setFooter({ text: "LynnBot Operations System • Ticket Archive" })
              .setTimestamp();

            const filesToSend = [txtFile, ...slipAttachments.slice(0, 9)];
            await logChannel.send({ embeds: [logEmbed], files: filesToSend });
          }
        }
      } catch (logErr) {
        console.error("Error forwarding transcript to Discord log channel:", logErr);
      }
    } catch (e) {
      console.error("Transcript generate error:", e);
      transcriptData = "ไม่สามารถดึงข้อความย้อนหลังได้";
    }

    // Update ticket in database
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        status: "CLOSED",
        closedAt: new Date(),
        closedBy: interaction.user.username,
        transcript: transcriptData,
      },
    });

    const closeEmbed = new EmbedBuilder()
      .setColor(0xff453a)
      .setTitle("🔒  TICKET CLOSED • ปิดทิกเก็ตเรียบร้อยแล้ว")
      .setDescription(
        `ทิกเก็ตนี้ถูกปิดโดย <@${interaction.user.id}>\n` +
        `บันทึกประวัติการสนทนาถูกจัดเก็บลง Web Dashboard เรียบร้อยแล้ว\n\n` +
        `> ห้องสนทนานี้จะถูกลบโดยอัตโนมัติภายใน 5 วินาที...`
      )
      .setFooter({ text: "LynnBot Operations System" })
      .setTimestamp();

    await interaction.editReply({ embeds: [closeEmbed] });

    setTimeout(async () => {
      try {
        await interaction.channel?.delete();
      } catch (e) {
        console.error("Error deleting ticket channel:", e);
      }
    }, 5000);
  } catch (error: any) {
    console.error("❌ Error in handleTicketClose:", error);
    await interaction.editReply({
      content: `❌ เกิดข้อผิดพลาดในการปิดทิกเก็ต: ${error.message}`,
    });
  }
}
