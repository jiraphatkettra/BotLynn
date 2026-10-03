import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  ChannelType,
} from "discord.js";
import { prisma } from "@lynnbot/database";
import type { BotCommand } from "../index.js";

export const ticketSetupCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("ticket-setup")
    .setDescription("ตั้งค่าและส่งการ์ดเปิดทิกเก็ต (Ticket Support Embed)")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("ห้องที่ต้องการให้ส่งการ์ดทิกเก็ต (ถ้าไม่เลือกจะส่งห้องปัจจุบัน)")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    )
    .addChannelOption((option) =>
      option
        .setName("log_channel")
        .setDescription("ห้องสำหรับแจ้งเตือนแอดมิน / บันทึกประวัติทิกเก็ต (Ticket Log Channel)")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("title")
        .setDescription("หัวข้อการ์ดทิกเก็ต (ค่าเริ่มต้น: ศูนย์บริการ & ติดต่อทีมงาน)")
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("description")
        .setDescription("คำอธิบาย (รายละเอียดการเปิดทิกเก็ต)")
        .setRequired(false)
    ),

  async execute(interaction) {
    const targetChannel =
      (interaction.options.getChannel("channel") as any) ||
      interaction.channel;
    const logChannel = interaction.options.getChannel("log_channel") as any;

    const title =
      interaction.options.getString("title") ||
      "ศูนย์บริการช่วยเหลือ & ติดต่อทีมงาน";

    const description =
      interaction.options.getString("description") ||
      "หากคุณพบปัญหา ต้องการสอบถามข้อมูล ติดต่อทีมงาน หรือแจ้งปัญหาการซื้อยศ\nสามารถกดปุ่มด้านล่างเพื่อเปิดห้องสนทนาส่วนตัว (Ticket) กับทีมแอดมินได้ทันที";

    const embed = new EmbedBuilder()
      .setColor(0x16161c)
      .setTitle(`📩  ${title.toUpperCase()} • TICKET SUPPORT`)
      .setDescription(
        `${description}\n\n` +
        `> เจ้าหน้าที่: มีเฉพาะคุณและทีมแอดมินเท่านั้นที่สามารถมองเห็นห้องสนทนานี้\n\n` +
        `-# ทีมงานพร้อมดูแลและตอบกลับอย่างรวดเร็วที่สุด`
      )
      .setFooter({
        text: "LynnBot Operations System • Ticket Helpdesk",
      })
      .setTimestamp();

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("ticket_create")
        .setLabel("เปิดทิกเก็ตติดต่อทีมงาน • Open Ticket")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("📩")
    );

    try {
      await targetChannel.send({
        embeds: [embed],
        components: [row],
      });

      let logNote = "";
      if (logChannel) {
        await prisma.setting.upsert({
          where: { key: "ticket_log_channel" },
          update: { value: logChannel.id },
          create: {
            key: "ticket_log_channel",
            value: logChannel.id,
            category: "channels",
            description: "ห้องบันทึกและแจ้งเตือนทิกเก็ต",
          },
        });
        logNote = `\n• บันทึกห้องแจ้งเตือนทิกเก็ตไปยัง <#${logChannel.id}> สำเร็จ`;
      }

      await interaction.reply({
        content: `✅ ส่งการ์ดทิกเก็ตไปยัง <#${targetChannel.id}> เรียบร้อยแล้ว${logNote}`,
        ephemeral: true,
      });
    } catch (err: any) {
      console.error("Error sending ticket setup:", err);
      await interaction.reply({
        content: `❌ ไม่สามารถส่งข้อความได้: ${err.message}`,
        ephemeral: true,
      });
    }
  },
};

export const ticketClaimCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("ticket-claim")
    .setDescription("รับเรื่องดูแลทิกเก็ตนี้ (สำหรับทีมงานและผู้ดูแล)")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    const { handleTicketClaim } = await import("../services/ticketService.js");
    await handleTicketClaim(interaction);
  },
};

