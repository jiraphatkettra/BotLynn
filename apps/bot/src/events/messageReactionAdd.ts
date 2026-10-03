import { type MessageReaction, type User } from "discord.js";
import { prisma } from "@lynnbot/database";

export async function handleMessageReactionAdd(
  reaction: MessageReaction,
  user: User
) {
  if (user.bot) return;

  // Fetch partial reaction/message if needed
  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch {
      return;
    }
  }

  const emojiName = reaction.emoji.name || reaction.emoji.id || "";
  const messageId = reaction.message.id;

  const config = await prisma.reactionRole.findFirst({
    where: {
      messageId,
      emoji: emojiName,
    },
  });

  if (!config) return;

  const guild = reaction.message.guild;
  if (!guild) return;

  try {
    const member = await guild.members.fetch(user.id);
    if (member && !member.roles.cache.has(config.roleId)) {
      await member.roles.add(config.roleId);
    }
  } catch (err) {
    console.error("Failed to add reaction role:", err);
  }
}
