import {
  ChannelType,
  VoiceChannel,
  CategoryChannel,
  Guild,
  type VoiceState,
} from "discord.js";
import { prisma } from "@lynnbot/database";

// Default Food & Fruit emoji sequence for Living/Talk zone (matches user's photo!)
export const DEFAULT_TALK_EMOJIS = [
  "🥪", "🥐", "🥓", "🥨", "🍿",
  "🍑", "🍎", "🍓", "🍈", "🍋",
  "🍇", "🍉", "🍊", "🍩", "🍰",
];

export const DEFAULT_GAME_EMOJI = "🎮";

// In-memory mutex locks to prevent race conditions during voice channel creation/deletion
const categoryLocks = new Set<string>();

/**
 * Build voice channel name matching the exact aesthetic tree pattern:
 * e.g. ╭ ㆍ เล่นเกมㆍ01 ㆍ 🎮 ⁺
 *      ┆ ㆍ เล่นเกมㆍ02 ㆍ 🎮 ⁺
 *      ╰ ㆍ เล่นเกมㆍ05 ㆍ 🎮 ⁺
 *      ╭ ㆍ พูดคุยㆍ06 ㆍ 🍑 ⁺
 */
export function buildVoiceChannelName(
  zoneName: string,
  index: number,
  emojis: string[],
  isBlockEnd: boolean = false
): string {
  const padNum = String(index).padStart(2, "0");

  // Determine tree branch character based on blocks of 5
  // Pos 1 in block (1, 6, 11...): ╭
  // Pos 5 in block (5, 10, 15...) or last of current set: ╰
  // Others: ┆
  const posInBlock = ((index - 1) % 5) + 1;
  let branch = "┆";
  if (posInBlock === 1) {
    branch = "╭";
  } else if (posInBlock === 5 || isBlockEnd) {
    branch = "╰";
  }

  // Pick emoji (if list provided, cycle through; otherwise use single emoji)
  const emoji =
    emojis.length > 0
      ? emojis[(index - 1) % emojis.length]
      : DEFAULT_GAME_EMOJI;

  return `${branch} ㆍ ${zoneName}ㆍ${padNum} ㆍ ${emoji} ⁺`;
}

/**
 * Parse room number from channel name
 */
export function extractRoomNumber(channelName: string): number | null {
  const match = channelName.match(/ㆍ\s*(\d{1,3})\s*ㆍ/);
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }
  return null;
}

/**
 * Handle dynamic voice channel expansion and pruning when members join, leave, or switch rooms.
 */
export async function handleDynamicVoiceState(
  oldState: VoiceState,
  newState: VoiceState
) {
  const guild = newState.guild || oldState.guild;
  if (!guild) return;

  // Identify affected categories
  const affectedCategoryIds = new Set<string>();

  const newChannel = newState.channel;
  if (newChannel && newChannel.parentId) {
    affectedCategoryIds.add(newChannel.parentId);
  }

  const oldChannel = oldState.channel;
  if (oldChannel && oldChannel.parentId) {
    affectedCategoryIds.add(oldChannel.parentId);
  }

  for (const categoryId of affectedCategoryIds) {
    await processCategoryDynamicVoice(guild, categoryId);
  }
}

/**
 * Process a specific category for expansion or pruning.
 */
export async function processCategoryDynamicVoice(
  guild: Guild,
  categoryId: string
) {
  // If lock is held, skip this tick (debouncing)
  if (categoryLocks.has(categoryId)) {
    return;
  }

  categoryLocks.add(categoryId);

  try {
    // 1. Fetch config from database
    let config = await prisma.dynamicVoiceConfig.findUnique({
      where: { categoryId },
    });

    const category = guild.channels.cache.get(categoryId) as CategoryChannel;
    if (!category || category.type !== ChannelType.GuildCategory) {
      return;
    }

    // Smart Auto-detection if not in DB:
    if (!config) {
      const catName = category.name.toLowerCase();
      if (catName.includes("gaming") || catName.includes("เกม")) {
        config = await prisma.dynamicVoiceConfig.create({
          data: {
            guildId: guild.id,
            categoryId,
            categoryName: category.name,
            zoneName: "เล่นเกม",
            userLimit: 5,
            minChannels: 5,
            spareChannels: 1,
            emojis: "🎮",
          },
        });
        console.log(`🎙️ [Dynamic Voice] Auto-registered Gaming Zone: ${category.name}`);
        await seedDynamicVoiceChannels(guild, categoryId);
      } else if (
        catName.includes("living") ||
        catName.includes("talk") ||
        catName.includes("พูดคุย")
      ) {
        config = await prisma.dynamicVoiceConfig.create({
          data: {
            guildId: guild.id,
            categoryId,
            categoryName: category.name,
            zoneName: "พูดคุย",
            userLimit: 10,
            minChannels: 5,
            spareChannels: 1,
            emojis: DEFAULT_TALK_EMOJIS.join(","),
          },
        });
        console.log(`🎙️ [Dynamic Voice] Auto-registered Living Zone: ${category.name}`);
        await seedDynamicVoiceChannels(guild, categoryId);
      } else {
        // Check if any voice channel in this category matches the aesthetic pattern
        const sampleVoice = category.children.cache.find(
          (ch): ch is VoiceChannel =>
            ch.type === ChannelType.GuildVoice &&
            /ㆍ\s*(\d{1,3})\s*ㆍ/.test(ch.name)
        );

        if (sampleVoice) {
          const match = sampleVoice.name.match(
            /[╭┆╰]?\s*ㆍ\s*([^ㆍ]+)ㆍ\s*(\d{1,3})\s*ㆍ\s*([^\s⁺]+)\s*⁺?/
          );
          const detectedZone = match?.[1]?.trim() || category.name.replace(/zone/i, "").trim();
          const detectedEmoji = match?.[3]?.trim() || "🎙️";
          const detectedLimit = sampleVoice.userLimit || 5;

          config = await prisma.dynamicVoiceConfig.create({
            data: {
              guildId: guild.id,
              categoryId,
              categoryName: category.name,
              zoneName: detectedZone,
              userLimit: detectedLimit,
              minChannels: 5,
              spareChannels: 1,
              emojis: detectedEmoji,
            },
          });
          console.log(
            `🎙️ [Dynamic Voice] Auto-captured pattern for new zone '${category.name}': Zone='${detectedZone}', Emoji='${detectedEmoji}', Limit=${detectedLimit}`
          );
          await seedDynamicVoiceChannels(guild, categoryId);
        }
      }
    }

    if (!config || !config.isEnabled) {
      return;
    }

    const emojis = config.emojis.split(",").map((e) => e.trim()).filter(Boolean);
    const minChannels = config.minChannels || 5;
    const spareChannels = config.spareChannels || 1;
    const zoneName = config.zoneName || "ห้อง";

    // 2. Find all voice channels belonging to this category
    const voiceChannels = category.children.cache
      .filter(
        (ch): ch is VoiceChannel =>
          ch.type === ChannelType.GuildVoice && ch.name.includes(zoneName)
      )
      .map((ch) => ({
        channel: ch,
        roomNumber: extractRoomNumber(ch.name) || 0,
        memberCount: ch.members.size,
      }))
      .sort((a, b) => a.roomNumber - b.roomNumber);

    const emptyChannels = voiceChannels.filter((v) => v.memberCount === 0);
    const totalChannels = voiceChannels.length;

    // 3. EXPANSION LOGIC:
    // If the number of empty rooms is less than spareChannels (e.g. 0 empty rooms left)
    if (emptyChannels.length < spareChannels) {
      const highestNum =
        voiceChannels.length > 0
          ? Math.max(...voiceChannels.map((v) => v.roomNumber))
          : 0;
      const nextNumber = highestNum + 1;

      // Determine new channel name
      const newName = buildVoiceChannelName(
        zoneName,
        nextNumber,
        emojis,
        false
      );

      console.log(
        `🎙️ [Dynamic Voice] High occupancy in '${category.name}' (${emptyChannels.length} empty). Expanding with room ${nextNumber}...`
      );

      await category.guild.channels.create({
        name: newName,
        type: ChannelType.GuildVoice,
        parent: category.id,
        userLimit: config.userLimit,
        reason: `[LynnBot Dynamic Voice] Auto-expanded room ${nextNumber} for ${zoneName}`,
      });

      return;
    }

    // 4. PRUNING LOGIC:
    // If we have surplus channels above minChannels AND more empty channels than needed
    if (totalChannels > minChannels && emptyChannels.length > spareChannels) {
      // Find empty channels that have a room number greater than minChannels
      const prunableChannels = emptyChannels
        .filter((v) => v.roomNumber > minChannels)
        .sort((a, b) => b.roomNumber - a.roomNumber); // highest number first

      if (prunableChannels.length > 0) {
        const toDelete = prunableChannels[0];
        console.log(
          `🎙️ [Dynamic Voice] Room ${toDelete.roomNumber} in '${category.name}' is empty and surplus. Pruning...`
        );

        await toDelete.channel.delete(
          `[LynnBot Dynamic Voice] Auto-pruning empty surplus room ${toDelete.roomNumber}`
        );
      }
    }
  } catch (error) {
    console.error(`❌ [Dynamic Voice] Error processing category ${categoryId}:`, error);
  } finally {
    // Release lock after 1.5s delay to prevent spamming Discord rate limits
    setTimeout(() => {
      categoryLocks.delete(categoryId);
    }, 1500);
  }
}

/**
 * Seed or verify initial minimum channels for a zone
 */
export async function seedDynamicVoiceChannels(
  guild: Guild,
  categoryId: string
) {
  const config = await prisma.dynamicVoiceConfig.findUnique({
    where: { categoryId },
  });
  if (!config) return;

  const category = guild.channels.cache.get(categoryId) as CategoryChannel;
  if (!category || category.type !== ChannelType.GuildCategory) return;

  const emojis = config.emojis.split(",").map((e) => e.trim()).filter(Boolean);
  const minChannels = config.minChannels || 5;
  const zoneName = config.zoneName;

  const existingVoice = category.children.cache.filter(
    (ch) => ch.type === ChannelType.GuildVoice && ch.name.includes(zoneName)
  );

  if (existingVoice.size < minChannels) {
    const existingNumbers = new Set(
      existingVoice.map((ch) => extractRoomNumber(ch.name)).filter(Boolean)
    );

    for (let i = 1; i <= minChannels; i++) {
      if (!existingNumbers.has(i)) {
        const name = buildVoiceChannelName(
          zoneName,
          i,
          emojis,
          i === minChannels
        );
        console.log(`🎙️ [Dynamic Voice] Seeding missing room ${i}: ${name}`);
        await category.guild.channels.create({
          name,
          type: ChannelType.GuildVoice,
          parent: category.id,
          userLimit: config.userLimit,
          reason: `[LynnBot Dynamic Voice] Initial room setup ${i}`,
        });
      }
    }
  }
}
