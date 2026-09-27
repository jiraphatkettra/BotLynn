import { type VoiceState } from "discord.js";
import { prisma } from "@lynnbot/database";

export async function handleVoiceStateUpdate(
  oldState: VoiceState,
  newState: VoiceState
) {
  const member = newState.member || oldState.member;
  if (!member || member.user.bot) return;

  const discordId = member.user.id;
  const now = new Date();

  try {
    // Case 1: Joined a voice channel
    if (!oldState.channelId && newState.channelId) {
      const channel = newState.channel;
      const user = await prisma.user.upsert({
        where: { discordId },
        update: {
          username: member.user.username,
          displayName: member.displayName || member.user.username,
          avatar: member.user.avatar,
        },
        create: {
          discordId,
          username: member.user.username,
          displayName: member.displayName || member.user.username,
          avatar: member.user.avatar,
          role: "ADMIN",
        },
      });

      await prisma.voiceSession.create({
        data: {
          userId: user.id,
          channelId: newState.channelId,
          channelName: channel?.name || "Voice Channel",
          guildId: newState.guild.id,
          joinedAt: now,
        },
      });

      console.log(`🎙️ [Voice] ${member.user.username} joined ${channel?.name}`);
      return;
    }

    // Case 2: Left a voice channel
    if (oldState.channelId && !newState.channelId) {
      const user = await prisma.user.findUnique({
        where: { discordId },
      });

      if (user) {
        const activeSession = await prisma.voiceSession.findFirst({
          where: {
            userId: user.id,
            channelId: oldState.channelId,
            leftAt: null,
          },
          orderBy: { joinedAt: "desc" },
        });

        if (activeSession) {
          const duration = Math.max(
            1,
            Math.floor((now.getTime() - activeSession.joinedAt.getTime()) / 1000)
          );
          await prisma.voiceSession.update({
            where: { id: activeSession.id },
            data: {
              leftAt: now,
              duration,
            },
          });

          const mins = Math.floor(duration / 60);
          console.log(`🎙️ [Voice] ${member.user.username} left voice after ${mins}m`);
        }
      }
      return;
    }

    // Case 3: Switched voice channels
    if (
      oldState.channelId &&
      newState.channelId &&
      oldState.channelId !== newState.channelId
    ) {
      const user = await prisma.user.upsert({
        where: { discordId },
        update: {
          username: member.user.username,
          displayName: member.displayName || member.user.username,
        },
        create: {
          discordId,
          username: member.user.username,
          displayName: member.displayName || member.user.username,
          role: "ADMIN",
        },
      });

      // Close previous channel session
      const prevSession = await prisma.voiceSession.findFirst({
        where: {
          userId: user.id,
          channelId: oldState.channelId,
          leftAt: null,
        },
        orderBy: { joinedAt: "desc" },
      });

      if (prevSession) {
        const duration = Math.max(
          1,
          Math.floor((now.getTime() - prevSession.joinedAt.getTime()) / 1000)
        );
        await prisma.voiceSession.update({
          where: { id: prevSession.id },
          data: {
            leftAt: now,
            duration,
          },
        });
      }

      // Open new channel session
      await prisma.voiceSession.create({
        data: {
          userId: user.id,
          channelId: newState.channelId,
          channelName: newState.channel?.name || "Voice Channel",
          guildId: newState.guild.id,
          joinedAt: now,
        },
      });

      console.log(`🎙️ [Voice] ${member.user.username} moved to ${newState.channel?.name}`);
    }
  } catch (err) {
    console.error("❌ Error in handleVoiceStateUpdate:", err);
  }
}
