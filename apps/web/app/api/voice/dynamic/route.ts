import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@lynnbot/database";

export const dynamic = "force-dynamic";

// Default Food & Fruit emoji sequence for Living/Talk zone (30 unique non-repeating food items)
const DEFAULT_TALK_EMOJIS = [
  "🥪", "🥐", "🥓", "🥨", "🍿",
  "🍑", "🍎", "🍓", "🍋‍🟩", "🍋",
  "🍇", "🍉", "🍊", "🍩", "🍰",
  "🍔", "🍟", "🍕", "🌮", "🍜",
  "🍣", "🥞", "🍦", "🍫", "🍪",
  "🍮", "🧇", "🍡", "🧋", "☕",
];

function parseSampleChannelName(sampleName: string) {
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

function buildVoiceChannelNameFromSample(
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
    const emoji = emojis.length > 0 ? emojis[(index - 1) % emojis.length] : "🎮";
    return `${branch}﹒${sampleName}· ${padNum}﹒${emoji} ⁺`;
  }

  const emoji =
    emojis.length > 0
      ? emojis[(index - 1) % emojis.length]
      : parsed.rawEmoji;

  return `${branch}${parsed.prefix}${padNum}${parsed.numSep}${emoji}${parsed.suffix}`;
}

function buildVoiceChannelName(
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
  const emoji = emojis.length > 0 ? emojis[(index - 1) % emojis.length] : "🎮";
  return `${branch}﹒${zoneName}· ${padNum}﹒${emoji} ⁺`;
}

function extractRoomNumber(channelName: string): number | null {
  const match =
    channelName.match(/[ㆍ·•﹒\.\-\s](\d{1,3})[ㆍ·•﹒\.\-\s]/) ||
    channelName.match(/(\d{1,3})/);
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }
  return null;
}

async function seedDiscordVoiceChannels(
  categoryId: string,
  zoneName: string,
  emojis: string,
  userLimit: number,
  minChannels: number,
  blockGroupSize: number = 5
): Promise<number> {
  const token = process.env.DISCORD_TOKEN;
  const guildId = process.env.DISCORD_GUILD_ID;
  if (!token || !guildId || !categoryId) return 0;

  try {
    const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
      headers: { Authorization: `Bot ${token}` },
    });
    if (!res.ok) return 0;

    const allChannels = await res.json();
    const existingVoice = allChannels.filter(
      (c: any) => c.type === 2 && c.parent_id === categoryId && c.name.includes(zoneName)
    );

    const sampleName = existingVoice.length > 0 ? existingVoice[0].name : null;

    const existingNums = new Set(
      existingVoice
        .map((c: any) => extractRoomNumber(c.name))
        .filter(Boolean)
    );

    const emojiList = emojis.split(",").map((e: string) => e.trim()).filter(Boolean);
    const minRooms = Number(minChannels) || 3;
    let createdCount = 0;

    for (let i = 1; i <= minRooms; i++) {
      if (!existingNums.has(i)) {
        const name = sampleName
          ? buildVoiceChannelNameFromSample(
              sampleName,
              i,
              emojiList,
              i === minRooms,
              blockGroupSize
            )
          : buildVoiceChannelName(
              zoneName,
              i,
              emojiList,
              i === minRooms,
              blockGroupSize
            );
        const createRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
          method: "POST",
          headers: {
            Authorization: `Bot ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            type: 2, // GUILD_VOICE
            parent_id: categoryId,
            user_limit: Number(userLimit) || 0,
          }),
        });
        if (createRes.ok) createdCount++;
      }
    }
    return createdCount;
  } catch (err) {
    console.error("Error seeding Discord channels:", err);
    return 0;
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const configs = await prisma.dynamicVoiceConfig.findMany({
      orderBy: [{ categoryId: "asc" }, { createdAt: "asc" }],
    });

    // Attempt to fetch categories from Discord API if configured
    let categories: Array<{ id: string; name: string }> = [];
    const token = process.env.DISCORD_TOKEN;
    const guildId = process.env.DISCORD_GUILD_ID;

    if (token && guildId) {
      try {
        const res = await fetch(
          `https://discord.com/api/v10/guilds/${guildId}/channels`,
          {
            headers: { Authorization: `Bot ${token}` },
            next: { revalidate: 30 },
          }
        );
        if (res.ok) {
          const channels = await res.json();
          // Type 4 is GUILD_CATEGORY
          categories = channels
            .filter((c: any) => c.type === 4)
            .map((c: any) => ({
              id: c.id,
              name: c.name,
            }))
            .sort((a: any, b: any) => a.name.localeCompare(b.name));
        }
      } catch (err) {
        console.error("Failed to fetch Discord categories:", err);
      }
    }

    return NextResponse.json({
      configs,
      categories,
      defaultTalkEmojis: DEFAULT_TALK_EMOJIS,
    });
  } catch (error) {
    console.error("Error in GET /api/voice/dynamic:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any)?.role;
    if (!["OWNER", "MANAGER", "ADMIN"].includes(role)) {
      return NextResponse.json(
        { error: "เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่สามารถตั้งค่าได้" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const guildId = process.env.DISCORD_GUILD_ID || "guild_default";

    // Action A: Manual Sync for a single config
    if (body.action === "sync" && body.id) {
      const config = await prisma.dynamicVoiceConfig.findUnique({
        where: { id: body.id },
      });
      if (!config) {
        return NextResponse.json({ error: "Config not found" }, { status: 404 });
      }

      const created = await seedDiscordVoiceChannels(
        config.categoryId,
        config.zoneName,
        config.emojis,
        config.userLimit,
        config.minChannels,
        config.blockGroupSize
      );

      return NextResponse.json({
        success: true,
        message: `ซิงค์สำเร็จ! ตรวจสอบและสร้างห้องเพิ่มเติม ${created} ห้องสำหรับโซน ${config.zoneName}`,
      });
    }

    // Action B: 1-Click Sleeping Zone 3-in-1 (นอนรวม + นอนคู่ + นอนเดี่ยว)
    if (body.action === "create-sleeping-zone") {
      const { categoryId, categoryName, userLimit = 5 } = body;
      if (!categoryId) {
        return NextResponse.json({ error: "กรุณาระบุหมวดหมู่ Discord" }, { status: 400 });
      }

      const sleepZones = [
        { name: "นอนรวม", limit: 5 },
        { name: "นอนคู่", limit: 2 },
        { name: "นอนเดี่ยว", limit: 1 },
      ];
      let totalCreated = 0;

      for (const sz of sleepZones) {
        await prisma.dynamicVoiceConfig.upsert({
          where: {
            categoryId_zoneName: {
              categoryId,
              zoneName: sz.name,
            },
          },
          update: {
            categoryName: categoryName || undefined,
            userLimit: sz.limit,
            minChannels: 3,
            spareChannels: 1,
            emojis: "🛌",
            blockGroupSize: 3,
            isEnabled: true,
          },
          create: {
            guildId,
            categoryId,
            categoryName: categoryName || "Sleeping Zone",
            zoneName: sz.name,
            userLimit: sz.limit,
            minChannels: 3,
            spareChannels: 1,
            emojis: "🛌",
            blockGroupSize: 3,
            isEnabled: true,
          },
        });

        // Seed 3 rooms for this sub-zone
        const created = await seedDiscordVoiceChannels(
          categoryId,
          sz.name,
          "🛌",
          sz.limit,
          3,
          3
        );
        totalCreated += created;
      }

      return NextResponse.json({
        success: true,
        message: `เปิดใช้งานโซนห้องนอนสำเร็จ! เสกห้องครบชุด 3 ประเภท (รวมสร้าง ${totalCreated} ห้องใน Discord)`,
      });
    }

    // Action C: Standard Single Zone Creation/Update
    const {
      categoryId,
      categoryName,
      zoneName,
      userLimit = 5,
      minChannels = 5,
      spareChannels = 1,
      emojis = "🎮",
      blockGroupSize,
      isEnabled = true,
      autoSeed = true,
    } = body;

    if (!categoryId || !zoneName) {
      return NextResponse.json(
        { error: "กรุณาระบุหมวดหมู่ (Category ID) และชื่อโซน (Zone Name)" },
        { status: 400 }
      );
    }

    const calculatedBlockSize =
      Number(blockGroupSize) || (Number(minChannels) <= 3 ? 3 : 5);

    const config = await prisma.dynamicVoiceConfig.upsert({
      where: {
        categoryId_zoneName: {
          categoryId,
          zoneName,
        },
      },
      update: {
        categoryName: categoryName || undefined,
        zoneName,
        userLimit: Number(userLimit) || 0,
        minChannels: Number(minChannels) || 5,
        spareChannels: Number(spareChannels) || 1,
        emojis,
        blockGroupSize: calculatedBlockSize,
        isEnabled: isEnabled !== undefined ? Boolean(isEnabled) : true,
      },
      create: {
        guildId,
        categoryId,
        categoryName: categoryName || null,
        zoneName,
        userLimit: Number(userLimit) || 0,
        minChannels: Number(minChannels) || 5,
        spareChannels: Number(spareChannels) || 1,
        emojis,
        blockGroupSize: calculatedBlockSize,
        isEnabled: isEnabled !== undefined ? Boolean(isEnabled) : true,
      },
    });

    // Auto-seed rooms in Discord
    if (autoSeed) {
      await seedDiscordVoiceChannels(
        categoryId,
        zoneName,
        emojis,
        Number(userLimit) || 0,
        Number(minChannels) || 5,
        calculatedBlockSize
      );
    }

    return NextResponse.json({ success: true, config });
  } catch (error) {
    console.error("Error in POST /api/voice/dynamic:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any)?.role;
    if (!["OWNER", "MANAGER", "ADMIN"].includes(role)) {
      return NextResponse.json(
        { error: "เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่สามารถตั้งค่าได้" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      id,
      isEnabled,
      userLimit,
      minChannels,
      spareChannels,
      zoneName,
      emojis,
      categoryName,
      blockGroupSize,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing config ID" }, { status: 400 });
    }

    const updateData: any = {};
    if (isEnabled !== undefined) updateData.isEnabled = Boolean(isEnabled);
    if (userLimit !== undefined) updateData.userLimit = Number(userLimit);
    if (minChannels !== undefined) updateData.minChannels = Number(minChannels);
    if (spareChannels !== undefined) updateData.spareChannels = Number(spareChannels);
    if (zoneName !== undefined) updateData.zoneName = zoneName;
    if (emojis !== undefined) updateData.emojis = emojis;
    if (categoryName !== undefined) updateData.categoryName = categoryName;
    if (blockGroupSize !== undefined) updateData.blockGroupSize = Number(blockGroupSize);

    const updated = await prisma.dynamicVoiceConfig.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, config: updated });
  } catch (error) {
    console.error("Error in PUT /api/voice/dynamic:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any)?.role;
    if (!["OWNER", "MANAGER", "ADMIN"].includes(role)) {
      return NextResponse.json(
        { error: "เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่สามารถลบได้" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing config ID" }, { status: 400 });
    }

    await prisma.dynamicVoiceConfig.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/voice/dynamic:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
