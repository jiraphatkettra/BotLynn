import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type TextChannel,
  PermissionFlagsBits,
  type ButtonInteraction,
} from "discord.js";
import { prisma } from "@lynnbot/database";
import { THEME_COLORS } from "../utils/theme.js";
import type { BotCommand } from "../index.js";

export const giveawayCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("giveaway")
    .setDescription("ระบบจัดกิจกรรมแจกรางวัล (Giveaways)")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName("create")
        .setDescription("สร้างกิจกรรมแจกของรางวัลใหม่")
        .addStringOption((opt) =>
          opt.setName("prize").setDescription("ชื่อของรางวัลที่แจก").setRequired(true)
        )
        .addIntegerOption((opt) =>
          opt.setName("duration").setDescription("ระยะเวลากิจกรรม (นาที)").setRequired(true).setMinValue(1)
        )
        .addIntegerOption((opt) =>
          opt.setName("winners").setDescription("จำนวนผู้ชนะ (ค่าเริ่มต้น 1)").setRequired(false).setMinValue(1)
        )
        .addChannelOption((opt) =>
          opt.setName("channel").setDescription("ห้องที่จะส่งกิจกรรม (ค่าเริ่มต้นห้องนี้)").setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("end")
        .setDescription("สิ้นสุดกิจกรรมทันทีและสุ่มผู้ชนะ")
        .addStringOption((opt) =>
          opt.setName("id").setDescription("Giveaway ID").setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("reroll")
        .setDescription("สุ่มผู้ชนะใหม่")
        .addStringOption((opt) =>
          opt.setName("id").setDescription("Giveaway ID").setRequired(true)
        )
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "create") {
      await interaction.deferReply({ ephemeral: true });

      const prize = interaction.options.getString("prize", true);
      const durationMinutes = interaction.options.getInteger("duration", true);
      const maxWinners = interaction.options.getInteger("winners") || 1;
      const targetChannel =
        (interaction.options.getChannel("channel") as TextChannel) ||
        (interaction.channel as TextChannel);

      if (!targetChannel) {
        await interaction.editReply({ content: "❌ ไม่สามารถส่งข้อความเข้าห้องดังกล่าวได้" });
        return;
      }

      const endsAt = new Date(Date.now() + durationMinutes * 60 * 1000);

      // 1. Create Giveaway record
      const giveaway = await prisma.giveaway.create({
        data: {
          title: `🎉 แจก: ${prize}`,
          prize,
          channelId: targetChannel.id,
          hostId: interaction.user.id,
          hostName: interaction.user.displayName || interaction.user.username,
          maxWinners,
          endsAt,
          isActive: true,
        },
      });

      // 2. Build Embed & Join Button
      const embed = new EmbedBuilder()
        .setColor(THEME_COLORS.accent)
        .setTitle(`🎉  GIVEAWAY: ${prize}`)
        .setDescription(
          `คลิกปุ่ม **"🎉 เข้าร่วมกิจกรรม"** ด้านล่างเพื่อลุ้นรับรางวัล!\n\n` +
          `• **ของรางวัล:** **${prize}**\n` +
          `• **จำนวนผู้ชนะ:** **${maxWinners} คน**\n` +
          `• **ผู้จัดกิจกรรม:** <@${interaction.user.id}>\n` +
          `• **สิ้นสุดกิจกรรม:** <t:${Math.floor(endsAt.getTime() / 1000)}:R> (<t:${Math.floor(endsAt.getTime() / 1000)}:f>)\n\n` +
          `> จำนวนผู้เข้าร่วมขณะนี้: **0 คน**`
        )
        .setFooter({ text: `Giveaway ID: ${giveaway.id}` })
        .setTimestamp(endsAt);

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`giveaway_join:${giveaway.id}`)
          .setLabel("🎉 เข้าร่วมกิจกรรม")
          .setStyle(ButtonStyle.Primary)
      );

      const sentMessage = await targetChannel.send({ embeds: [embed], components: [row] });

      await prisma.giveaway.update({
        where: { id: giveaway.id },
        data: { messageId: sentMessage.id },
      });

      await interaction.editReply({
        content: `✅ สร้างกิจกรรมแจกรางวัลเรียบร้อยแล้วในห้อง <#${targetChannel.id}>`,
      });
      return;
    }

    if (subcommand === "end" || subcommand === "reroll") {
      await interaction.deferReply({ ephemeral: true });
      const giveawayId = interaction.options.getString("id", true);

      const giveaway = await prisma.giveaway.findUnique({
        where: { id: giveawayId },
        include: { entries: true },
      });

      if (!giveaway) {
        await interaction.editReply({ content: "❌ ไม่พบกิจกรรมแจกรางวัลนี้" });
        return;
      }

      if (giveaway.entries.length === 0) {
        await interaction.editReply({ content: "⚠️ ไม่มีผู้เข้าร่วมกิจกรรมนี้ จึงไม่สามารถสุ่มผู้ชนะได้" });
        return;
      }

      // Random winner selection
      const shuffled = [...giveaway.entries].sort(() => 0.5 - Math.random());
      const winners = shuffled.slice(0, giveaway.maxWinners);
      const winnerMentions = winners.map((w) => `<@${w.discordId}>`).join(", ");

      if (subcommand === "end") {
        await prisma.giveaway.update({
          where: { id: giveaway.id },
          data: { isActive: false },
        });
      }

      const channel = interaction.guild?.channels.cache.get(giveaway.channelId) as TextChannel | undefined;
      if (channel) {
        const winEmbed = new EmbedBuilder()
          .setColor(THEME_COLORS.success)
          .setTitle(`🎊  WINNER ANNOUNCEMENT • ประกาศผลรางวัล!`)
          .setDescription(
            `ยินดีด้วยกับผู้โชคดีที่ได้รับ **${giveaway.prize}**\n\n` +
            `🏆 **ผู้ชนะ:** ${winnerMentions}\n` +
            `• ผู้จัดกิจกรรม: <@${giveaway.hostId}>\n` +
            `• ผู้เข้าร่วมทั้งหมด: ${giveaway.entries.length} คน\n\n` +
            `-# กรุณาติดต่อแอดมินหรือเปิด Ticket เพื่อรับของรางวัล`
          )
          .setFooter({ text: `Giveaway ID: ${giveaway.id}` })
          .setTimestamp();

        await channel.send({ content: `🎉 ขอแสดงความยินดีกับ ${winnerMentions}!`, embeds: [winEmbed] });
      }

      await interaction.editReply({
        content: `🎉 ${subcommand === "end" ? "สิ้นสุดกิจกรรม" : "สุ่มผู้ชนะใหม่"} เรียบร้อยแล้ว! ผู้ชนะคือ: ${winnerMentions}`,
      });
      return;
    }
  },
};

/**
 * Handle user clicking "🎉 เข้าร่วมกิจกรรม"
 */
export async function handleGiveawayJoin(interaction: ButtonInteraction, giveawayId: string) {
  await interaction.deferReply({ ephemeral: true });

  const giveaway = await prisma.giveaway.findUnique({
    where: { id: giveawayId },
    include: { entries: true },
  });

  if (!giveaway || !giveaway.isActive || new Date() > giveaway.endsAt) {
    await interaction.editReply({ content: "❌ กิจกรรมแจกรางวัลนี้สิ้นสุดลงแล้ว" });
    return;
  }

  const existing = giveaway.entries.find((e) => e.discordId === interaction.user.id);
  if (existing) {
    // Leave entry
    await prisma.giveawayEntry.delete({
      where: {
        giveawayId_discordId: {
          giveawayId,
          discordId: interaction.user.id,
        },
      },
    });
    await interaction.editReply({ content: "⚪ คุณได้ยกเลิกการเข้าร่วมกิจกรรมนี้แล้ว" });
  } else {
    // Join entry
    await prisma.giveawayEntry.create({
      data: {
        giveawayId,
        discordId: interaction.user.id,
        discordName: interaction.user.displayName || interaction.user.username,
      },
    });
    await interaction.editReply({ content: "🎉 คุณได้เข้าร่วมกิจกรรมแจกรางวัลเรียบร้อยแล้ว! ขอให้โชคดีครับ ✨" });
  }

  // Update participant count in the message embed
  try {
    const updatedCount = await prisma.giveawayEntry.count({ where: { giveawayId } });
    const originalEmbed = interaction.message.embeds[0];
    if (originalEmbed) {
      const newEmbed = EmbedBuilder.from(originalEmbed).setDescription(
        `คลิกปุ่ม **"🎉 เข้าร่วมกิจกรรม"** ด้านล่างเพื่อลุ้นรับรางวัล!\n\n` +
        `• **ของรางวัล:** **${giveaway.prize}**\n` +
        `• **จำนวนผู้ชนะ:** **${giveaway.maxWinners} คน**\n` +
        `• **ผู้จัดกิจกรรม:** <@${giveaway.hostId}>\n` +
        `• **สิ้นสุดกิจกรรม:** <t:${Math.floor(giveaway.endsAt.getTime() / 1000)}:R> (<t:${Math.floor(giveaway.endsAt.getTime() / 1000)}:f>)\n\n` +
        `> จำนวนผู้เข้าร่วมขณะนี้: **${updatedCount} คน**`
      );
      await interaction.message.edit({ embeds: [newEmbed] });
    }
  } catch (err) {
    // Ignore edit failures
  }
}
