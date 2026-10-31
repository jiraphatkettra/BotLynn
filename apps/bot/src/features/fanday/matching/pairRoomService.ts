import {
  ChannelType,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type Guild,
  type TextChannel,
} from "discord.js";
import { prisma } from "@lynnbot/database";
import { createFandayEmbed, FANDAY_COLORS } from "../../../utils/fandayTheme.js";
import { renderCustomEmbed } from "../../../services/embedService.js";

/**
 * Creates private thread or channel for a matched pair and sends the greeting announcement
 */
export async function createPairPrivateRoom({
  guild,
  pairId,
}: {
  guild: Guild;
  pairId: string;
}) {
  const pair = await prisma.fandayPair.findUnique({
    where: { id: pairId },
    include: { event: true },
  });

  if (!pair) return null;

  try {
    const parentChannelId = pair.event.panelChannelId || guild.systemChannelId;
    let targetParent = parentChannelId
      ? (guild.channels.cache.get(parentChannelId) as TextChannel | undefined)
      : null;

    if (!targetParent) {
      targetParent = guild.channels.cache.find(
        (c) => c.type === ChannelType.GuildText && c.permissionsFor(guild.members.me!)?.has(PermissionFlagsBits.SendMessages)
      ) as TextChannel | undefined;
    }

    if (!targetParent) {
      console.error("No suitable text channel found to create pair room");
      return null;
    }

    // Create Private Thread in the target parent channel
    const thread = await targetParent.threads.create({
      name: `💞﹒fanday-${pair.id.slice(-4).toUpperCase()}`,
      autoArchiveDuration: 1440, // 24 hours
      type: ChannelType.PrivateThread,
      reason: `Fanday private pair room for <@${pair.playerAId}> and <@${pair.playerBId}>`,
    });

    // Add both members to the thread
    await thread.members.add(pair.playerAId).catch(() => {});
    await thread.members.add(pair.playerBId).catch(() => {});

    // Save channelId
    await prisma.fandayPair.update({
      where: { id: pair.id },
      data: { channelId: thread.id },
    });

    // Build Match Announcement Embed
    const defaultEmbed = createFandayEmbed({
      title: "💘 ยินดีต้อนรับสู่ห้องกิจกรรมแฟนเดย์ส่วนตัว!",
      description:
        `สวัสดีครับ <@${pair.playerAId}> และ <@${pair.playerBId}>!\n\n` +
        `ห้องสนทนานี้คือห้องส่วนตัวของคู่คุณตลอดระยะเวลากิจกรรม **${pair.event.title}**\n` +
        `• **ดัชนีความเข้ากัน (Compatibility):** \`${pair.compatibility || 90}%\`\n` +
        `• **เหตุผลการจับคู่:** *"${pair.reason || "บุคลิกภาพและความสนใจเข้ากันได้เป็นอย่างดี"}"*\n\n` +
        `**🎯 สิ่งที่คุณสามารถทำร่วมกันได้:**\n` +
        `1. กดปุ่ม **"เริ่มเล่นมินิเกมคู่"** ด้านล่างเพื่อเริ่มเล่นเกมสะสมคะแนนความสนิท\n` +
        `2. เมื่อจบกิจกรรม สามารถกด **"เขียนจดหมายถึงคู่"** เพื่อบอกความรู้สึกได้\n` +
        `3. หากพบปัญหาหรือความไม่สะดวกใจ สามารถกด **"รายงาน/ขอความช่วยเหลือ"** เพื่อแจ้งทีมงานได้ทันที`,
      color: FANDAY_COLORS.pink,
    });

    const embed = await renderCustomEmbed("fanday_match_reveal", defaultEmbed, {
      player_a: `<@${pair.playerAId}>`,
      player_b: `<@${pair.playerBId}>`,
      compat_score: `${pair.compatibility || 90}%`,
      match_reason: pair.reason || "บุคลิกภาพและความสนใจเข้ากันได้เป็นอย่างดี",
      pair_channel: `<#${thread.id}>`,
    });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`fd_game_menu:${pair.id}`)
        .setLabel("เริ่มเล่นมินิเกมคู่")
        .setEmoji("🎮")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`fd_letter_write:${pair.id}`)
        .setLabel("เขียนจดหมายถึงคู่")
        .setEmoji("💌")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`fd_report:${pair.id}`)
        .setLabel("รายงานปัญหา")
        .setEmoji("🚩")
        .setStyle(ButtonStyle.Secondary)
    );

    await thread.send({
      content: `🔔 <@${pair.playerAId}> <@${pair.playerBId}> ห้องกิจกรรมของคุณพร้อมแล้วครับ!`,
      embeds: [embed],
      components: [row],
    });

    return thread;
  } catch (err) {
    console.error("Error creating pair private room:", err);
    return null;
  }
}

