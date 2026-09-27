export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;

    if (userRole !== "OWNER") {
      return NextResponse.json(
        { error: "เฉพาะ SuperAdmin (OWNER) เท่านั้นที่สามารถเข้าถึงได้" },
        { status: 403 }
      );
    }

    const token = process.env.DISCORD_TOKEN;
    const guildId = process.env.DISCORD_GUILD_ID;

    if (!token || !guildId) {
      return NextResponse.json(
        { error: "DISCORD_TOKEN or DISCORD_GUILD_ID is not configured" },
        { status: 400 }
      );
    }

    // Fetch roles and channels in parallel from Discord API
    const [rolesRes, channelsRes] = await Promise.all([
      fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
        headers: { Authorization: `Bot ${token}` },
        next: { revalidate: 30 },
      }),
      fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
        headers: { Authorization: `Bot ${token}` },
        next: { revalidate: 30 },
      }),
    ]);

    if (!rolesRes.ok || !channelsRes.ok) {
      return NextResponse.json(
        { error: "ไม่สามารถดึงข้อมูลจาก Discord ได้" },
        { status: 502 }
      );
    }

    const rawRoles = await rolesRes.json();
    const rawChannels = await channelsRes.json();

    // Filter and format roles (exclude @everyone, sort by position)
    const roles = rawRoles
      .filter((r: any) => r.id !== guildId)
      .map((r: any) => ({
        id: r.id,
        name: r.name,
        color:
          r.color && r.color > 0
            ? `#${r.color.toString(16).padStart(6, "0")}`
            : "#86868b",
        position: r.position,
        managed: r.managed || false,
      }))
      .sort((a: any, b: any) => b.position - a.position);

    // Filter text channels only (type 0 = GUILD_TEXT, type 5 = GUILD_ANNOUNCEMENT)
    const channels = rawChannels
      .filter((c: any) => c.type === 0 || c.type === 5)
      .map((c: any) => ({
        id: c.id,
        name: c.name,
        type: c.type,
      }))
      .sort((a: any, b: any) => a.name.localeCompare(b.name));

    return NextResponse.json({ roles, channels });
  } catch (error) {
    console.error("Error fetching Discord guild data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
