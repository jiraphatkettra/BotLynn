import { Client, EmbedBuilder, type TextChannel } from "discord.js";
import { prisma } from "@lynnbot/database";
import { THEME_COLORS } from "../utils/theme.js";

/**
 * Periodically checks for expired giveaways and resolves winners
 */
export async function checkExpiredGiveaways(client: Client) {
  try {
    const expiredGiveaways = await prisma.giveaway.findMany({
      where: {
        isActive: true,
        endsAt: { lte: new Date() },
      },
      include: {
        entries: true,
      },
    });

    for (const giveaway of expiredGiveaways) {
      // 1. Pick winners
      const entries = [...giveaway.entries];
      const winners: typeof entries = [];
      const numWinners = Math.min(giveaway.maxWinners, entries.length);

      for (let i = 0; i < numWinners; i++) {
        const randomIndex = Math.floor(Math.random() * entries.length);
        winners.push(entries.splice(randomIndex, 1)[0]);
      }

      // 2. Mark inactive
      await prisma.giveaway.update({
        where: { id: giveaway.id },
        data: { isActive: false },
      });

      // 3. Update message and announce in Discord
      try {
        const channel = (await client.channels.fetch(giveaway.channelId)) as TextChannel | null;
        if (channel) {
          const winnerText =
            winners.length > 0
              ? winners.map((w) => `<@${w.discordId}>`).join(", ")
              : "ไม่มีผู้เข้าร่วมกิจกรรม";

          const endEmbed = new EmbedBuilder()
            .setColor(THEME_COLORS.success)
            .setTitle("🎉 สิ้นสุดกิจกรรมแจกรางวัลแล้ว!")
            .setDescription(
              `• **ของรางวัล:** **${giveaway.prize}**\n` +
              `• **ผู้จัดกิจกรรม:** <@${giveaway.hostId}>\n` +
              `• **ผู้ชนะ:** ${winnerText}\n\n` +
              `> ขอแสดงความยินดีกับผู้ได้รับรางวัลทุกท่านครับ ✨`
            )
            .setFooter({ text: `Giveaway ID: ${giveaway.id}` })
            .setTimestamp();

          if (giveaway.messageId) {
            try {
              const originalMsg = await channel.messages.fetch(giveaway.messageId);
              if (originalMsg) {
                await originalMsg.edit({ embeds: [endEmbed], components: [] });
              }
            } catch {}
          }

          if (winners.length > 0) {
            await channel.send({
              content: `🎊 ยินดีด้วยกับ ${winnerText} ที่ได้รับรางวัล **${giveaway.prize}** จากกิจกรรม!`,
            });
          }
        }
      } catch (err) {
        console.error(`Failed to resolve giveaway ${giveaway.id}:`, err);
      }
    }
  } catch (err) {
    console.error("Error in checkExpiredGiveaways:", err);
  }
}

/**
 * Periodically checks for scheduled announcements and delivers them
 */
export async function checkScheduledMessages(client: Client) {
  try {
    const dueMessages = await prisma.scheduledMessage.findMany({
      where: {
        isActive: true,
        scheduledAt: { lte: new Date() },
      },
    });

    for (const msg of dueMessages) {
      try {
        const channel = (await client.channels.fetch(msg.channelId)) as TextChannel | null;
        if (channel) {
          const payload: any = {};
          if (msg.content) payload.content = msg.content;
          if (msg.embedData) {
            const embed = new EmbedBuilder(msg.embedData as any);
            payload.embeds = [embed];
          }

          await channel.send(payload);

          // Update record
          if (msg.isRecurring) {
            await prisma.scheduledMessage.update({
              where: { id: msg.id },
              data: { lastSentAt: new Date() },
            });
          } else {
            await prisma.scheduledMessage.update({
              where: { id: msg.id },
              data: {
                isActive: false,
                lastSentAt: new Date(),
              },
            });
          }
        }
      } catch (err) {
        console.error(`Failed to send scheduled message ${msg.id}:`, err);
      }
    }
  } catch (err) {
    console.error("Error in checkScheduledMessages:", err);
  }
}
