import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@lynnbot/database";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const backups = await prisma.roleBackup.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ backups });
  } catch (error: any) {
    console.error("GET /api/discord/backups error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = process.env.DISCORD_TOKEN;
    const guildId =
      process.env.DISCORD_GUILD_ID || "1549749097412431896";

    if (!token || !guildId) {
      return NextResponse.json(
        { error: "Discord credentials not configured" },
        { status: 500 }
      );
    }

    // 1. Fetch live roles from Discord
    const rolesRes = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/roles`,
      {
        headers: { Authorization: `Bot ${token}` },
      }
    );

    if (!rolesRes.ok) {
      throw new Error(`Failed to fetch roles from Discord: ${rolesRes.statusText}`);
    }

    const roles = await rolesRes.json();
    const rolesData = roles
      .filter((r: any) => r.id !== guildId && !r.managed)
      .map((r: any) => ({
        id: r.id,
        name: r.name,
        color: r.color,
        hoist: r.hoist,
        position: r.position,
        permissions: r.permissions,
        mentionable: r.mentionable,
      }));

    // 2. Fetch live members from Discord (up to 1000)
    const membersRes = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/members?limit=1000`,
      {
        headers: { Authorization: `Bot ${token}` },
      }
    );

    let membersData: Record<string, string[]> = {};
    if (membersRes.ok) {
      const members = await membersRes.json();
      for (const m of members) {
        if (m.roles && m.roles.length > 0) {
          membersData[m.user.id] = m.roles;
        }
      }
    }

    const now = new Date();
    const timeStr = now.toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const dateStr = now.toLocaleDateString("th-TH");

    const creatorName =
      (session.user as any).name || (session.user as any).username || "Web Admin";

    const backup = await prisma.roleBackup.create({
      data: {
        name: `จุดสำรอง ${dateStr} เวลา ${timeStr}`,
        guildId,
        totalRoles: rolesData.length,
        totalMembers: Object.keys(membersData).length,
        rolesData,
        membersData,
        createdBy: creatorName,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: (session.user as any).id,
        action: "BACKUP_ROLES_CREATED",
        category: "BACKUP",
        details: `สร้างจุดสำรองยศ: ${backup.name} (${rolesData.length} ยศ, ${Object.keys(membersData).length} สมาชิก)`,
      },
    });

    return NextResponse.json({ success: true, backup });
  } catch (error: any) {
    console.error("POST /api/discord/backups error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create backup" },
      { status: 500 }
    );
  }
}
