import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { type EmbedConfigData } from "@/lib/embedPresets";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = process.env.DISCORD_TOKEN;
    if (!token) {
      return NextResponse.json(
        { error: "ไม่พบ DISCORD_TOKEN ในระบบ กรุณาตรวจสอบการเชื่อมต่อบอท" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { channelId, embedConfig } = body as {
      channelId: string;
      embedConfig: EmbedConfigData;
    };

    if (!channelId || !channelId.trim()) {
      return NextResponse.json(
        { error: "กรุณาระบุ Channel ID ห้องที่ต้องการทดสอบส่งข้อความ" },
        { status: 400 }
      );
    }

    if (!embedConfig) {
      return NextResponse.json(
        { error: "ข้อมูล Embed ไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    // Convert hex color to integer
    let colorInt = 0x2997ff;
    if (embedConfig.color?.enabled && embedConfig.color.hex) {
      const cleanHex = embedConfig.color.hex.replace("#", "");
      colorInt = parseInt(cleanHex, 16) || 0x2997ff;
    }

    // Build Discord REST API Embed object
    const discordEmbed: any = {};

    if (embedConfig.color?.enabled) {
      discordEmbed.color = colorInt;
    }

    if (embedConfig.title?.enabled && embedConfig.title.text) {
      discordEmbed.title = embedConfig.title.text;
      if (embedConfig.title.url) {
        discordEmbed.url = embedConfig.title.url;
      }
    }

    if (embedConfig.author?.enabled && embedConfig.author.name) {
      discordEmbed.author = {
        name: embedConfig.author.name,
        icon_url: embedConfig.author.iconUrl || undefined,
        url: embedConfig.author.url || undefined,
      };
    }

    if (embedConfig.descriptionText?.enabled && embedConfig.descriptionText.text) {
      discordEmbed.description = embedConfig.descriptionText.text;
    }

    if (embedConfig.thumbnail?.enabled && embedConfig.thumbnail.url) {
      discordEmbed.thumbnail = { url: embedConfig.thumbnail.url };
    }

    if (embedConfig.image?.enabled && embedConfig.image.url) {
      discordEmbed.image = { url: embedConfig.image.url };
    }

    if (embedConfig.footer?.enabled && embedConfig.footer.text) {
      discordEmbed.footer = {
        text: embedConfig.footer.text,
        icon_url: embedConfig.footer.iconUrl || undefined,
      };
    }

    if (embedConfig.timestamp?.enabled) {
      discordEmbed.timestamp = new Date().toISOString();
    }

    if (embedConfig.fields?.enabled && Array.isArray(embedConfig.fields.items)) {
      const activeFields = embedConfig.fields.items
        .filter((f) => f.enabled && f.name && f.value)
        .map((f) => ({
          name: f.name,
          value: f.value,
          inline: Boolean(f.inline),
        }));

      if (activeFields.length > 0) {
        discordEmbed.fields = activeFields;
      }
    }

    // Send to Discord via REST API
    const res = await fetch(
      `https://discord.com/api/v10/channels/${channelId.trim()}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bot ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: "🧪 **[LynnBot Embed Test Message • ตัวอย่างข้อความทดสอบ]**",
          embeds: [discordEmbed],
        }),
      }
    );

    if (!res.ok) {
      const errorJson = await res.json().catch(() => ({}));
      const errorMsg =
        errorJson.message || `Discord API Error (${res.status} ${res.statusText})`;
      return NextResponse.json(
        { error: `ไม่สามารถส่งข้อความได้: ${errorMsg} (กรุณาตรวจสอบว่าบอทอยู่ในห้องนี้และมีสิทธิ์ส่งข้อความ)` },
        { status: 400 }
      );
    }

    const messageData = await res.json();
    return NextResponse.json({
      success: true,
      messageId: messageData.id,
      channelId,
    });
  } catch (error: any) {
    console.error("Error in POST /api/embeds/test:", error);
    return NextResponse.json(
      { error: error.message || "เกิดข้อผิดพลาดในการทดสอบส่ง Embed" },
      { status: 500 }
    );
  }
}
