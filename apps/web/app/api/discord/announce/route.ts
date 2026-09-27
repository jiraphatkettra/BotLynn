export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@lynnbot/database";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentRole = (session.user as any).role;
    if (currentRole !== "OWNER" && currentRole !== "MANAGER") {
      return NextResponse.json(
        { error: "เฉพาะ Owner หรือ Manager เท่านั้นที่สามารถส่งประกาศได้" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { channelId, title, description, color, imageUrl, mention } = body;

    if (!channelId || !title || !description) {
      return NextResponse.json(
        { error: "กรุณาระบุห้อง Discord, หัวข้อ และเนื้อหาประกาศ" },
        { status: 400 }
      );
    }

    const token = process.env.DISCORD_TOKEN;
    if (!token) {
      return NextResponse.json(
        { error: "Discord bot token not configured" },
        { status: 500 }
      );
    }

    // Convert hex color to integer
    let colorInt = 0x000000;
    if (color) {
      const cleanHex = color.replace("#", "");
      const parsed = parseInt(cleanHex, 16);
      if (!isNaN(parsed)) colorInt = parsed;
    }

    const embed: any = {
      title,
      description,
      color: colorInt,
      footer: {
        text: `ประกาศโดย ${(session.user as any).name || (session.user as any).username} • LynnBot Announcement`,
      },
      timestamp: new Date().toISOString(),
    };

    if (imageUrl && imageUrl.startsWith("http")) {
      embed.image = { url: imageUrl };
    }

    let content = "";
    if (mention === "everyone") content = "@everyone";
    else if (mention === "here") content = "@here";

    const discordRes = await fetch(
      `https://discord.com/api/v10/channels/${channelId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bot ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: content || undefined,
          embeds: [embed],
        }),
      }
    );

    if (!discordRes.ok) {
      const errData = await discordRes.json();
      throw new Error(errData.message || "Failed to send message to Discord");
    }

    const msgData = await discordRes.json();

    await prisma.auditLog.create({
      data: {
        userId: (session.user as any).id,
        action: "ANNOUNCEMENT_SENT",
        category: "ANNOUNCEMENT",
        details: `ส่งประกาศหัวข้อ "${title}" ลงห้อง ID: ${channelId}`,
      },
    });

    return NextResponse.json({ success: true, messageId: msgData.id });
  } catch (error: any) {
    console.error("POST /api/discord/announce error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
