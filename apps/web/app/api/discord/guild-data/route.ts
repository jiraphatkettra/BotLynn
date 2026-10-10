export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "กรุณาเข้าสู่ระบบก่อนเรียกดูข้อมูล" },
        { status: 401 }
      );
    }

    const userRole = (session?.user as any)?.role;
    const allowedRoles = ["OWNER", "MANAGER", "ADMIN", "MODERATOR"];
    if (userRole && !allowedRoles.includes(userRole)) {
      return NextResponse.json(
        { error: "เฉพาะทีมงาน (Owner, Manager, Admin, Moderator) เท่านั้นที่สามารถเข้าถึงข้อมูลห้องและยศได้" },
        { status: 403 }
      );
    }

    let token = process.env.DISCORD_TOKEN?.trim();
    let guildId = process.env.DISCORD_GUILD_ID?.trim();

    // Clean any surrounding quotes
    if (token && ((token.startsWith('"') && token.endsWith('"')) || (token.startsWith("'") && token.endsWith("'")))) {
      token = token.slice(1, -1).trim();
    }
    if (guildId && ((guildId.startsWith('"') && guildId.endsWith('"')) || (guildId.startsWith("'") && guildId.endsWith("'")))) {
      guildId = guildId.slice(1, -1).trim();
    }

    if (!token || !guildId) {
      return NextResponse.json(
        {
          error: "ยังไม่ได้ตั้งค่า DISCORD_TOKEN หรือ DISCORD_GUILD_ID ใน Environment Variables บน Vercel",
          missing: {
            DISCORD_TOKEN: !token,
            DISCORD_GUILD_ID: !guildId,
          },
        },
        { status: 400 }
      );
    }

    // Fetch roles and channels in parallel from Discord API
    const [rolesRes, channelsRes] = await Promise.all([
      fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
        headers: { Authorization: `Bot ${token}` },
        cache: "no-store",
      }),
      fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
        headers: { Authorization: `Bot ${token}` },
        cache: "no-store",
      }),
    ]);

    if (!rolesRes.ok || !channelsRes.ok) {
      const rolesErr = !rolesRes.ok ? await rolesRes.text() : "";
      const channelsErr = !channelsRes.ok ? await channelsRes.text() : "";
      console.error("Discord API fetch error in /api/discord/guild-data:", {
        rolesStatus: rolesRes.status,
        rolesErr,
        channelsStatus: channelsRes.status,
        channelsErr,
        guildId,
      });

      let errorMsg = "ไม่สามารถดึงข้อมูลจาก Discord ได้";
      if (rolesRes.status === 401 || channelsRes.status === 401) {
        errorMsg = "DISCORD_TOKEN ไม่ถูกต้องหรือหมดอายุ (401 Unauthorized) กรุณาอัปเดตโทเค็นบอทใน Vercel";
      } else if (rolesRes.status === 403 || channelsRes.status === 403) {
        errorMsg = "บอทไม่มีสิทธิ์เข้าถึงเซิร์ฟเวอร์หรือช่อง (403 Forbidden - โปรดตรวจสอบสิทธิ์ View Channels ของบอทใน Discord)";
      } else if (rolesRes.status === 404 || channelsRes.status === 404) {
        errorMsg = `ไม่พบเซิร์ฟเวอร์ DISCORD_GUILD_ID (${guildId}) หรือบอทยังไม่ได้เข้าร่วมเซิร์ฟเวอร์นี้ (404 Not Found)`;
      }

      return NextResponse.json(
        {
          error: errorMsg,
          details: {
            rolesStatus: rolesRes.status,
            channelsStatus: channelsRes.status,
          },
        },
        { status: 502 }
      );
    }

    const rawRoles = await rolesRes.json();
    const rawChannels = await channelsRes.json();

    if (!Array.isArray(rawRoles) || !Array.isArray(rawChannels)) {
      return NextResponse.json(
        { error: "ข้อมูลที่ได้รับจาก Discord มีรูปแบบไม่ถูกต้อง" },
        { status: 502 }
      );
    }

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
      { error: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์ (Internal Server Error)" },
      { status: 500 }
    );
  }
}
