import {
  ChannelType,
  VoiceChannel,
  CategoryChannel,
  Guild,
  type VoiceState,
} from "discord.js";
import { prisma } from "@lynnbot/database";

// Default Food & Fruit emoji sequence for Living/Talk zone (30 unique non-repeating food items)
export const DEFAULT_TALK_EMOJIS = [
  "🥪", "🥐", "🥓", "🥨", "🍿",
  "🍑", "🍎", "🍓", "🍋‍🟩", "🍋",
  "🍇", "🍉", "🍊", "🍩", "🍰",
  "🍔", "🍟", "🍕", "🌮", "🍜",
  "🍣", "🥞", "🍦", "🍫", "🍪",
  "🍮", "🧇", "🍡", "🧋", "☕",
];

export const DEFAULT_GAME_EMOJI = "🎮";
export const DEFAULT_SLEEP_EMOJI = "🛏️";

// In-memory mutex locks to prevent race conditions during voice channel creation/deletion
const categoryLocks = new Set<string>();

/**
 * Parse an existing Discord channel name into structural components:
 * branch, prefix text, room number, delimiter before emoji, raw emoji, and suffix.
 */
export function parseSampleChannelName(sampleName: string) {
  const m = sampleName.match(
    /^([╭┆╰│├└\s]*)(.*?)(\d{1,3})(\s*[^a-zA-Z0-9\s\p{Emoji}]*?\s*)(\p{Extended_Pictographic}(?:(?:\u200D|\uFE0F|\uFE0E)?[\p{Extended_Pictographic}\u{E0020}-\u{E007E}])*?)(.*)$/u
  );
  if (!m) return null;
  const variationMatch = m[6].match(/^[\uFE0F\uFE0E]+/);
  const variation = variationMatch ? variationMatch[0] : "";
  return {
    branch: m[1],
    prefix: m[2],
    numStr: m[3],
    numLength: m[3].length,
    numSep: m[4],
    rawEmoji: m[5] + variation,
    suffix: m[6].slice(variation.length),
  };
}

/**
 * Build a new voice channel name by directly copying the exact spacing,
 * dots, and separators of a preceding sample channel in the same zone.
 */
export function buildVoiceChannelNameFromSample(
  sampleName: string,
  index: number,
  emojis: string[],
  isBlockEnd: boolean = false,
  blockSize: number = 5
): string {
  const parsed = parseSampleChannelName(sampleName);
  const padNum = String(index).padStart(parsed ? parsed.numLength : 2, "0");

  const posInBlock = ((index - 1) % blockSize) + 1;
  let branch = "┆";
  if (posInBlock === 1) {
    branch = "╭";
  } else if (posInBlock === blockSize || isBlockEnd) {
    branch = "╰";
  }

  if (!parsed) {
    const emoji =
      emojis.length > 0
        ? emojis[(index - 1) % emojis.length]
        : DEFAULT_GAME_EMOJI;
    return `${branch}﹒${sampleName}· ${padNum}﹒${emoji} ⁺`;
  }

  const emoji =
    emojis.length > 0
      ? emojis[(index - 1) % emojis.length]
      : parsed.rawEmoji;

  return `${branch}${parsed.prefix}${padNum}${parsed.numSep}${emoji}${parsed.suffix}`;
}

/**
 * Standard fallback channel name generator when no existing channels exist to clone from.
 */
export function buildVoiceChannelName(
  zoneName: string,
  index: number,
  emojis: string[],
  isBlockEnd: boolean = false,
  blockGroupSize: number = 5
): string {
  const padNum = String(index).padStart(2, "0");
  const posInBlock = ((index - 1) % blockGroupSize) + 1;
  let branch = "┆";
  if (posInBlock === 1) {
    branch = "╭";
  } else if (posInBlock === blockGroupSize || isBlockEnd) {
    branch = "╰";
  }

  const emoji =
    emojis.length > 0
      ? emojis[(index - 1) % emojis.length]
      : DEFAULT_GAME_EMOJI;

  return `${branch}﹒${zoneName}· ${padNum}﹒${emoji} ⁺`;
}

/**
 * Robustly extract room number from channel name across any separator format (ㆍ, ·, •, ﹒, ., -, etc.)
 */
export function extractRoomNumber(channelName: string): number | null {
  const match =
    channelName.match(/[ㆍ·•﹒\.\-\s](\d{1,3})[ㆍ·•﹒\.\-\s]/) ||
    channelName.match(/(\d{1,3})/);
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
 * Process a specific category for expansion or pruning across all its configured sub-zones.
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
    const category = guild.channels.cache.get(categoryId) as CategoryChannel;
    if (!category || category.type !== ChannelType.GuildCategory) {
      return;
    }

    let configs = await prisma.dynamicVoiceConfig.findMany({
      where: { categoryId },
    });

    // 1. Smart Auto-detection if not yet registered in DB:
    if (configs.length === 0) {
      const catName = category.name.toLowerCase();

      // Case A: Sleeping Zone (Dreamland / ห้องนอน)
      if (
        catName.includes("dreamland") ||
        catName.includes("นอน") ||
        catName.includes("sleep")
      ) {
        const sleepZones = [
          { name: "นอนรวม", limit: 5 },
          { name: "นอนคู่", limit: 2 },
          { name: "นอนเดี่ยว", limit: 1 },
        ];
        for (const z of sleepZones) {
          await prisma.dynamicVoiceConfig.upsert({
            where: {
              categoryId_zoneName: {
                categoryId,
                zoneName: z.name,
              },
            },
            update: {
              userLimit: z.limit,
            },
            create: {
              guildId: guild.id,
              categoryId,
              categoryName: category.name,
              zoneName: z.name,
              userLimit: z.limit,
              minChannels: 3,
              spareChannels: 1,
              emojis: "🛌",
              blockGroupSize: 3,
              isEnabled: true,
            },
          });
        }
        console.log(`🎙️ [Dynamic Voice] Auto-registered 3-in-1 Sleeping Zone: ${category.name}`);
        await seedDynamicVoiceChannels(guild, categoryId);
      }
      // Case B: Gaming Zone
      else if (catName.includes("gaming") || catName.includes("เกม")) {
        await prisma.dynamicVoiceConfig.upsert({
          where: {
            categoryId_zoneName: {
              categoryId,
              zoneName: "เล่นเกม",
            },
          },
          update: {},
          create: {
            guildId: guild.id,
            categoryId,
            categoryName: category.name,
            zoneName: "เล่นเกม",
            userLimit: 5,
            minChannels: 5,
            spareChannels: 1,
            emojis: "🎮",
            blockGroupSize: 5,
            isEnabled: true,
          },
        });
        console.log(`🎙️ [Dynamic Voice] Auto-registered Gaming Zone: ${category.name}`);
        await seedDynamicVoiceChannels(guild, categoryId);
      }
      // Case C: Living / Talk Zone
      else if (
        catName.includes("living") ||
        catName.includes("talk") ||
        catName.includes("พูดคุย")
      ) {
        const existingVoice = category.children.cache.filter(
          (ch): ch is VoiceChannel =>
            ch.type === ChannelType.GuildVoice && ch.name.includes("พูดคุย")
        );
        const initialMin = Math.max(existingVoice.size, 10);

        await prisma.dynamicVoiceConfig.upsert({
          where: {
            categoryId_zoneName: {
              categoryId,
              zoneName: "พูดคุย",
            },
          },
          update: {
            minChannels: initialMin,
          },
          create: {
            guildId: guild.id,
            categoryId,
            categoryName: category.name,
            zoneName: "พูดคุย",
            userLimit: 10,
            minChannels: initialMin,
            spareChannels: 1,
            emojis: DEFAULT_TALK_EMOJIS.join(","),
            blockGroupSize: 5,
            isEnabled: true,
          },
        });
        console.log(`🎙️ [Dynamic Voice] Auto-registered Living Zone: ${category.name} (minChannels: ${initialMin})`);
        await seedDynamicVoiceChannels(guild, categoryId);
      }
      // Case D: Scan any existing aesthetic voice channels
      else {
        const existingVoiceChannels = category.children.cache.filter(
          (ch): ch is VoiceChannel =>
            ch.type === ChannelType.GuildVoice &&
            extractRoomNumber(ch.name) !== null
        );

        const detectedZones = new Map<string, { emoji: string; limit: number; count: number }>();
        for (const [, ch] of existingVoiceChannels) {
          const parsed = parseSampleChannelName(ch.name);
          if (parsed) {
            const cleanZone = parsed.prefix.replace(/^[ㆍ·•﹒\.\-\s]+|[ㆍ·•﹒\.\-\s]+$/g, "").trim();
            if (cleanZone) {
              if (!detectedZones.has(cleanZone)) {
                detectedZones.set(cleanZone, {
                  emoji: parsed.rawEmoji || "🎙️",
                  limit: ch.userLimit || 5,
                  count: 1,
                });
              } else {
                detectedZones.get(cleanZone)!.count++;
              }
            }
          }
        }

        for (const [zName, info] of detectedZones.entries()) {
          const blockSize = info.count <= 3 ? 3 : 5;
          await prisma.dynamicVoiceConfig.upsert({
            where: {
              categoryId_zoneName: {
                categoryId,
                zoneName: zName,
              },
            },
            update: {},
            create: {
              guildId: guild.id,
              categoryId,
              categoryName: category.name,
              zoneName: zName,
              userLimit: info.limit,
              minChannels: info.count >= 3 ? info.count : 3,
              spareChannels: 1,
              emojis: info.emoji,
              blockGroupSize: blockSize,
              isEnabled: true,
            },
          });
          console.log(`🎙️ [Dynamic Voice] Auto-captured zone '${zName}' in '${category.name}'`);
        }
      }

      configs = await prisma.dynamicVoiceConfig.findMany({
        where: { categoryId },
      });
    }

    // 2. Process each configured sub-zone independently
    for (const config of configs) {
      if (config.isEnabled) {
        await processSingleZoneDynamicVoice(category, config);
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
 * Process a single sub-zone (e.g. "นอนรวม", "นอนคู่", "นอนเดี่ยว", "เล่นเกม") within a category.
 */
async function processSingleZoneDynamicVoice(
  category: CategoryChannel,
  config: {
    zoneName: string;
    userLimit: number;
    minChannels: number;
    spareChannels: number;
    emojis: string;
    blockGroupSize: number;
  }
) {
  const emojis = config.emojis.split(",").map((e) => e.trim()).filter(Boolean);
  const minChannels = config.minChannels || 3;
  const spareChannels = config.spareChannels || 1;
  const zoneName = config.zoneName;
  const blockSize = config.blockGroupSize || minChannels;

  // Find all voice channels belonging to this sub-zone
  const voiceChannels = category.children.cache
    .filter(
      (ch): ch is VoiceChannel =>
        ch.type === ChannelType.GuildVoice && ch.name.includes(zoneName)
    )
    .map((ch) => ({
      channel: ch,
      roomNumber: extractRoomNumber(ch.name) || 0,
      memberCount: ch.members.size,
      userLimit: ch.userLimit,
    }))
    .sort((a, b) => a.roomNumber - b.roomNumber);

  // Inherit userLimit directly from Discord channels so manual changes in Discord are respected!
  const effectiveUserLimit =
    voiceChannels.length > 0 && voiceChannels[0].userLimit > 0
      ? voiceChannels[0].userLimit
      : config.userLimit;

  // Sync back to database if admin adjusted limit in Discord
  if (
    voiceChannels.length > 0 &&
    voiceChannels[0].userLimit !== config.userLimit &&
    (config as any).id
  ) {
    prisma.dynamicVoiceConfig
      .update({
        where: { id: (config as any).id },
        data: { userLimit: voiceChannels[0].userLimit },
      })
      .catch(() => {});
  }

  const emptyChannels = voiceChannels.filter((v) => v.memberCount === 0);
  const totalChannels = voiceChannels.length;

  // BATCH EXPANSION LOGIC:
  // If the number of empty rooms is less than spareChannels (e.g. 0 empty rooms left / set is full)
  if (emptyChannels.length < spareChannels) {
    const highestNum =
      voiceChannels.length > 0
        ? Math.max(...voiceChannels.map((v) => v.roomNumber))
        : 0;

    const lastChannelOfZone = voiceChannels[voiceChannels.length - 1];
    const basePos = lastChannelOfZone ? lastChannelOfZone.channel.position : undefined;
    const sampleChannel = lastChannelOfZone ? lastChannelOfZone.channel : null;
    const sampleName = sampleChannel ? sampleChannel.name : null;

    console.log(
      `🎙️ [Dynamic Voice] Batch-expanding ${blockSize} rooms for '${zoneName}' in '${category.name}' (Rooms ${highestNum + 1} to ${highestNum + blockSize}, Limit: ${effectiveUserLimit})...`
    );

    // Create the entire block (e.g. 3 rooms: 04, 05, 06 or 5 rooms: 11, 12, 13, 14, 15) sequentially
    for (let step = 1; step <= blockSize; step++) {
      const roomNum = highestNum + step;
      const isEnd = step === blockSize;
      const newName = sampleName
        ? buildVoiceChannelNameFromSample(
            sampleName,
            roomNum,
            emojis,
            isEnd,
            blockSize
          )
        : buildVoiceChannelName(
            zoneName,
            roomNum,
            emojis,
            isEnd,
            blockSize
          );

      await category.guild.channels.create({
        name: newName,
        type: ChannelType.GuildVoice,
        parent: category.id,
        userLimit: effectiveUserLimit,
        position: basePos !== undefined ? basePos + step : undefined,
        reason: `[LynnBot Dynamic Voice] Batch-expanded room ${roomNum} for ${zoneName}`,
      });
    }

    return;
  }

  // BATCH PRUNING LOGIC:
  // If we have surplus channels above minChannels
  if (totalChannels > minChannels) {
    const surplusChannels = voiceChannels.filter((v) => v.roomNumber > minChannels);

    if (surplusChannels.length >= blockSize) {
      // Find the highest batch block (e.g. rooms 04-06 or rooms 06-10)
      const highestNum = Math.max(...surplusChannels.map((v) => v.roomNumber));
      const blockStart = highestNum - blockSize + 1;
      const blockChannels = surplusChannels.filter(
        (v) => v.roomNumber >= blockStart && v.roomNumber <= highestNum
      );

      // Check if every single room in this highest surplus block is empty
      const isBlockCompletelyEmpty =
        blockChannels.length === blockSize &&
        blockChannels.every((v) => v.memberCount === 0);

      // Check if lower remaining channels have at least 1 empty room (so we don't prune while lower rooms are still 100% full)
      const lowerChannels = voiceChannels.filter((v) => v.roomNumber < blockStart);
      const hasEmptyInLower = lowerChannels.some((v) => v.memberCount === 0);

      if (isBlockCompletelyEmpty && hasEmptyInLower) {
        console.log(
          `🎙️ [Dynamic Voice] Entire surplus block [Rooms ${blockStart} to ${highestNum}] for '${zoneName}' is empty. Pruning whole block...`
        );

        // Delete from highest number downwards (e.g. 06 -> 05 -> 04)
        const toDeleteSorted = [...blockChannels].sort((a, b) => b.roomNumber - a.roomNumber);
        for (const chInfo of toDeleteSorted) {
          await chInfo.channel
            .delete(
              `[LynnBot Dynamic Voice] Batch-pruning empty surplus block room ${chInfo.roomNumber} (${zoneName})`
            )
            .catch((err) =>
              console.error(`Error deleting channel ${chInfo.roomNumber}:`, err)
            );
        }
      }
    }
  }
}

/**
 * Seed or verify initial minimum channels for a zone or all zones in a category
 */
export async function seedDynamicVoiceChannels(
  guild: Guild,
  categoryId: string,
  targetZoneName?: string
) {
  const configs = await prisma.dynamicVoiceConfig.findMany({
    where: {
      categoryId,
      ...(targetZoneName ? { zoneName: targetZoneName } : {}),
    },
  });
  if (configs.length === 0) return;

  const category = guild.channels.cache.get(categoryId) as CategoryChannel;
  if (!category || category.type !== ChannelType.GuildCategory) return;

  for (const config of configs) {
    const emojis = config.emojis.split(",").map((e) => e.trim()).filter(Boolean);
    const minChannels = config.minChannels || 3;
    const zoneName = config.zoneName;
    const blockSize = config.blockGroupSize || minChannels;

    const existingVoice = category.children.cache.filter(
      (ch) => ch.type === ChannelType.GuildVoice && ch.name.includes(zoneName)
    );

    const existingSample = existingVoice.first() as VoiceChannel | undefined;
    const effectiveLimit =
      existingSample && existingSample.userLimit > 0
        ? existingSample.userLimit
        : config.userLimit;
    const sampleName = existingSample?.name;

    if (existingVoice.size < minChannels) {
      const existingNumbers = new Set(
        existingVoice.map((ch) => extractRoomNumber(ch.name)).filter(Boolean)
      );

      for (let i = 1; i <= minChannels; i++) {
        if (!existingNumbers.has(i)) {
          const name = sampleName
            ? buildVoiceChannelNameFromSample(
                sampleName,
                i,
                emojis,
                i === minChannels,
                blockSize
              )
            : buildVoiceChannelName(
                zoneName,
                i,
                emojis,
                i === minChannels,
                blockSize
              );
          console.log(`🎙️ [Dynamic Voice] Seeding missing room ${i} for ${zoneName}: ${name}`);
          await category.guild.channels.create({
            name,
            type: ChannelType.GuildVoice,
            parent: category.id,
            userLimit: effectiveLimit,
            reason: `[LynnBot Dynamic Voice] Initial room setup ${i} for ${zoneName}`,
          });
        }
      }
    }
  }
}
