import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@lynnbot/database";
import { DEFAULT_EMBED_PRESETS, type EmbedConfigData } from "@/lib/embedPresets";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");

    // Fetch all custom embed settings from DB
    const savedSettings = await prisma.setting.findMany({
      where: {
        category: "embed_config",
      },
    });

    const savedMap: Record<string, Partial<EmbedConfigData>> = {};
    for (const s of savedSettings) {
      try {
        const parsedKey = s.key.replace(/^embed_config:/, "");
        savedMap[parsedKey] = JSON.parse(s.value);
      } catch (e) {
        console.error(`Failed to parse embed config for ${s.key}:`, e);
      }
    }

    // Merge default presets with saved custom overrides
    const result: (EmbedConfigData & { isCustomized: boolean })[] = [];

    for (const [key, preset] of Object.entries(DEFAULT_EMBED_PRESETS)) {
      if (category && preset.category !== category) {
        continue;
      }

      const custom = savedMap[key];
      if (custom) {
        result.push({
          ...preset,
          ...custom,
          isCustomized: true,
        });
      } else {
        result.push({
          ...preset,
          isCustomized: false,
        });
      }
    }

    return NextResponse.json({
      embeds: result,
      total: result.length,
    });
  } catch (error: any) {
    console.error("Error in GET /api/embeds:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
