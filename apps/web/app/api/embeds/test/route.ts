import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { type EmbedConfigData } from "@/lib/embedPresets";
import { prisma } from "@lynnbot/database";

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

    const guildId = process.env.DISCORD_GUILD_ID;
    const body = await req.json();
    const channelId = body.channelId;
    const embedConfig: EmbedConfigData = (body.embedConfig || body.config) as EmbedConfigData;

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

    // 1. Fetch Dynamic Variables (Roles count, Guild Name, Guild Emojis)
    let shopRoleCount = 0;
    try {
      shopRoleCount = await prisma.shopRole.count({ where: { isActive: true } });
    } catch (err) {
      console.warn("Failed to query shopRole count:", err);
    }

    let guildName = "753 BC";
    let guildEmojis: { id: string; name: string; animated?: boolean }[] = [];

    if (guildId) {
      try {
        const [guildRes, emojisRes] = await Promise.all([
          fetch(`https://discord.com/api/v10/guilds/${guildId}`, {
            headers: { Authorization: `Bot ${token}` },
            next: { revalidate: 300 },
          }).catch(() => null),
          fetch(`https://discord.com/api/v10/guilds/${guildId}/emojis`, {
            headers: { Authorization: `Bot ${token}` },
            next: { revalidate: 300 },
          }).catch(() => null),
        ]);

        if (guildRes && guildRes.ok) {
          const gData = await guildRes.json();
          if (gData.name) guildName = gData.name;
        }

        if (emojisRes && emojisRes.ok) {
          guildEmojis = await emojisRes.json();
        }
      } catch (err) {
        console.warn("Error fetching guild info/emojis:", err);
      }
    }

    const userObj = session.user as any;
    const discordId = userObj?.discordId || userObj?.id || "";
    const userMention = discordId ? `<@${discordId}>` : `@${userObj?.name || "สมาชิก"}`;
    const userName = userObj?.name || userObj?.username || "สมาชิก";

    // Helper to replace template variables & auto-resolve incomplete custom emojis
    function resolveText(text: string): string {
      if (!text) return "";
      let res = text;

      // Variables replacement
      res = res.replaceAll("{roles_count}", String(shopRoleCount));
      res = res.replaceAll("{server_name}", guildName);
      res = res.replaceAll("{user}", userMention);
      res = res.replaceAll("{username}", userName);
      res = res.replaceAll("{balance}", "0");
      res = res.replaceAll("{role_name}", "VIP Member");
      res = res.replaceAll("{price}", "100");

      // Auto-resolve custom emojis if user typed incomplete syntax e.g. <:70661email:> without ID
      if (guildEmojis.length > 0) {
        for (const e of guildEmojis) {
          const fullEmoji = e.animated ? `<a:${e.name}:${e.id}>` : `<:${e.name}:${e.id}>`;
          // Match <:name:> or <:name: > without ID
          const patternNoId = new RegExp(`<:${e.name}:\\s*>`, "g");
          res = res.replaceAll(patternNoId, fullEmoji);
        }
      }

      return res;
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
      discordEmbed.title = resolveText(embedConfig.title.text);
      if (embedConfig.title.url) {
        discordEmbed.url = resolveText(embedConfig.title.url);
      }
    }

    if (embedConfig.author?.enabled && embedConfig.author.name) {
      discordEmbed.author = {
        name: resolveText(embedConfig.author.name),
        icon_url: embedConfig.author.iconUrl || undefined,
        url: embedConfig.author.url || undefined,
      };
    }

    if (embedConfig.descriptionText?.enabled && embedConfig.descriptionText.text) {
      discordEmbed.description = resolveText(embedConfig.descriptionText.text);
    }

    if (embedConfig.thumbnail?.enabled && embedConfig.thumbnail.url) {
      discordEmbed.thumbnail = { url: embedConfig.thumbnail.url };
    }

    if (embedConfig.image?.enabled && embedConfig.image.url) {
      discordEmbed.image = { url: embedConfig.image.url };
    }

    if (embedConfig.footer?.enabled && embedConfig.footer.text) {
      discordEmbed.footer = {
        text: resolveText(embedConfig.footer.text),
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
          name: resolveText(f.name),
          value: resolveText(f.value),
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
