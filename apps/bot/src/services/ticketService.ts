import {
  type ButtonInteraction,
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import { prisma } from "@lynnbot/database";

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

    // Fetch messages for transcript
    let transcriptData = "";
    try {
      const channel = interaction.channel as any;
      const messages = await channel.messages.fetch({ limit: 100 });
      const sorted = Array.from(messages.values()).reverse();

      transcriptData = sorted
        .map(
          (m: any) =>
            `[${new Date(m.createdTimestamp).toLocaleString("th-TH")}] ${
              m.author.username
            }: ${m.content || (m.attachments.size ? "[ไฟล์แนบ]" : "")}`
        )
        .join("\n");
    } catch (e) {
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
