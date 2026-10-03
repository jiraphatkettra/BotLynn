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

function renderProgressBar(percentage: number, length = 12): string {
  const filled = Math.round((percentage / 100) * length);
  const empty = length - filled;
  return "█".repeat(filled) + "░".repeat(empty);
}

export const pollCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("poll")
    .setDescription("สร้างโพลและการโหวตความคิดเห็นในเซิร์ฟเวอร์")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName("create")
        .setDescription("สร้างโพลใหม่")
        .addStringOption((opt) =>
          opt.setName("question").setDescription("คำถามของโพล").setRequired(true)
        )
        .addStringOption((opt) =>
          opt.setName("opt1").setDescription("ตัวเลือกที่ 1").setRequired(true)
        )
        .addStringOption((opt) =>
          opt.setName("opt2").setDescription("ตัวเลือกที่ 2").setRequired(true)
        )
        .addStringOption((opt) =>
          opt.setName("opt3").setDescription("ตัวเลือกที่ 3 (ไม่บังคับ)").setRequired(false)
        )
        .addStringOption((opt) =>
          opt.setName("opt4").setDescription("ตัวเลือกที่ 4 (ไม่บังคับ)").setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("end")
        .setDescription("ปิดการโหวตโพลและสรุปผล")
        .addStringOption((opt) =>
          opt.setName("id").setDescription("Poll ID").setRequired(true)
        )
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "create") {
      await interaction.deferReply({ ephemeral: true });

      const question = interaction.options.getString("question", true);
      const opt1 = interaction.options.getString("opt1", true);
      const opt2 = interaction.options.getString("opt2", true);
      const opt3 = interaction.options.getString("opt3");
      const opt4 = interaction.options.getString("opt4");

      const optionsList = [opt1, opt2, opt3, opt4].filter(Boolean) as string[];

      const channel = interaction.channel as TextChannel;
      if (!channel) {
        await interaction.editReply({ content: "❌ ไม่สามารถส่งข้อความเข้าห้องนี้ได้" });
        return;
      }

      // 1. Create Poll in DB
      const poll = await prisma.poll.create({
        data: {
          question,
          channelId: channel.id,
          creatorId: interaction.user.id,
          creatorName: interaction.user.displayName || interaction.user.username,
          isActive: true,
          options: {
            create: optionsList.map((label, idx) => ({
              label,
              emoji: ["1️⃣", "2️⃣", "3️⃣", "4️⃣"][idx],
            })),
          },
        },
        include: {
          options: true,
        },
      });

      // 2. Build Embed and Buttons
      const embed = new EmbedBuilder()
        .setColor(THEME_COLORS.accent)
        .setTitle(`📊  POLL • ${question}`)
        .setDescription(
          `คลิกปุ่มตัวเลือกด้านล่างเพื่อลงคะแนนโหวต (เปลี่ยนตัวเลือกได้)\n\n` +
          poll.options
            .map(
              (o) =>
                `**${o.emoji} ${o.label}**\n${renderProgressBar(0)} **0%** (0 โหวต)`
            )
            .join("\n\n") +
          `\n\n> สร้างโดย: <@${interaction.user.id}> • ผู้โหวตทั้งหมด: **0 คน**`
        )
        .setFooter({ text: `Poll ID: ${poll.id}` })
        .setTimestamp();

      const row = new ActionRowBuilder<ButtonBuilder>();
      poll.options.forEach((opt) => {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`poll_vote:${poll.id}:${opt.id}`)
            .setLabel(opt.label.slice(0, 50))
            .setEmoji(opt.emoji || "🔘")
            .setStyle(ButtonStyle.Secondary)
        );
      });

      const msg = await channel.send({ embeds: [embed], components: [row] });

      await prisma.poll.update({
        where: { id: poll.id },
        data: { messageId: msg.id },
      });

      await interaction.editReply({ content: "✅ สร้างโพลเรียบร้อยแล้ว!" });
      return;
    }

    if (subcommand === "end") {
      await interaction.deferReply({ ephemeral: true });
      const pollId = interaction.options.getString("id", true);

      const poll = await prisma.poll.findUnique({
        where: { id: pollId },
        include: {
          options: {
            include: { votes: true },
          },
        },
      });

      if (!poll) {
        await interaction.editReply({ content: "❌ ไม่พบโพลดังกล่าว" });
        return;
      }

      await prisma.poll.update({
        where: { id: pollId },
        data: { isActive: false },
      });

      const totalVotes = poll.options.reduce((acc, curr) => acc + curr.votes.length, 0);

      const endEmbed = new EmbedBuilder()
        .setColor(THEME_COLORS.success)
        .setTitle(`📊  FINAL RESULTS • ${poll.question}`)
        .setDescription(
          `🔒 **โพลนี้ปิดการลงคะแนนเรียบร้อยแล้ว**\n\n` +
          poll.options
            .map((o) => {
              const count = o.votes.length;
              const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
              return `**${o.emoji} ${o.label}**\n${renderProgressBar(pct)} **${pct}%** (${count} โหวต)`;
            })
            .join("\n\n") +
          `\n\n> ผู้ลงคะแนนทั้งหมด: **${totalVotes} คน**`
        )
        .setFooter({ text: `Poll ID: ${poll.id}` })
        .setTimestamp();

      const channel = interaction.guild?.channels.cache.get(poll.channelId) as TextChannel | undefined;
      if (channel && poll.messageId) {
        try {
          const originalMsg = await channel.messages.fetch(poll.messageId);
          if (originalMsg) {
            await originalMsg.edit({ embeds: [endEmbed], components: [] });
          }
        } catch {}
      }

      await interaction.editReply({ content: "✅ ปิดการโหวตโพลและสรุปผลเรียบร้อยแล้ว" });
      return;
    }
  },
};

/**
 * Handle user clicking an option in Poll
 */
export async function handlePollVote(
  interaction: ButtonInteraction,
  pollId: string,
  optionId: string
) {
  await interaction.deferReply({ ephemeral: true });

  const poll = await prisma.poll.findUnique({
    where: { id: pollId },
    include: {
      options: {
        include: { votes: true },
      },
    },
  });

  if (!poll || !poll.isActive) {
    await interaction.editReply({ content: "❌ โพลนี้ถูกปิดการลงคะแนนแล้ว" });
    return;
  }

  // Check if user already voted in any option of this poll
  let previousVoteOptionId: string | null = null;
  for (const opt of poll.options) {
    if (opt.votes.some((v) => v.discordId === interaction.user.id)) {
      previousVoteOptionId = opt.id;
      break;
    }
  }

  if (previousVoteOptionId) {
    // Remove previous vote
    await prisma.pollVote.delete({
      where: {
        optionId_discordId: {
          optionId: previousVoteOptionId,
          discordId: interaction.user.id,
        },
      },
    });
  }

  if (previousVoteOptionId === optionId) {
    await interaction.editReply({ content: "⚪ คุณได้ยกเลิกการลงคะแนนในตัวเลือกนี้แล้ว" });
  } else {
    // Add new vote
    await prisma.pollVote.create({
      data: {
        optionId,
        discordId: interaction.user.id,
      },
    });
    await interaction.editReply({ content: "✅ บันทึกคะแนนโหวตของคุณเรียบร้อยแล้ว!" });
  }

  // Refresh message embed in Discord channel
  try {
    const refreshedPoll = await prisma.poll.findUnique({
      where: { id: pollId },
      include: {
        options: {
          include: { votes: true },
        },
      },
    });

    if (refreshedPoll) {
      const totalVotes = refreshedPoll.options.reduce((acc, curr) => acc + curr.votes.length, 0);

      const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0]).setDescription(
        `คลิกปุ่มตัวเลือกด้านล่างเพื่อลงคะแนนโหวต (เปลี่ยนตัวเลือกได้)\n\n` +
        refreshedPoll.options
          .map((o) => {
            const count = o.votes.length;
            const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
            return `**${o.emoji} ${o.label}**\n${renderProgressBar(pct)} **${pct}%** (${count} โหวต)`;
          })
          .join("\n\n") +
        `\n\n> สร้างโดย: <@${refreshedPoll.creatorId}> • ผู้โหวตทั้งหมด: **${totalVotes} คน**`
      );

      await interaction.message.edit({ embeds: [updatedEmbed] });
    }
  } catch (err) {}
}
