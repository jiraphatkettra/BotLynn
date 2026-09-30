export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@lynnbot/database";
import { getDiscordAvatarUrl, isRootOwner, ROOT_OWNER_DISCORD_ID } from "@/lib/utils";

// POST - Sync members from Discord based on mapped admin roles
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const currentUserRole = (session?.user as any)?.role;
    const currentUserId = (session?.user as any)?.id;

    if (currentUserRole !== "OWNER") {
      return NextResponse.json(
        { error: "เฉพาะระดับ Owner เท่านั้นที่สามารถซิงค์ข้อมูลแอดมินได้" },
        { status: 403 }
      );
    }

    const token = process.env.DISCORD_TOKEN;
    const guildId = process.env.DISCORD_GUILD_ID;

    if (!token || !guildId) {
      return NextResponse.json(
        { error: "Discord credentials are not configured" },
        { status: 500 }
      );
    }

    // 1. Fetch current role mappings from Setting table
    const settings = await prisma.setting.findMany({
      where: {
        key: {
          in: [
            "admin_role_owner",
            "admin_role_manager",
            "admin_role_admin",
            "admin_role_moderator",
          ],
        },
      },
    });

    const mappings: Record<string, string> = {};
    settings.forEach((s) => {
      mappings[s.key] = s.value;
    });

    const ownerRoleId = mappings["admin_role_owner"];
    const managerRoleId = mappings["admin_role_manager"];
    const adminRoleId = mappings["admin_role_admin"];
    const moderatorRoleId = mappings["admin_role_moderator"];

    const mappedRoleIds = [ownerRoleId, managerRoleId, adminRoleId, moderatorRoleId].filter(Boolean);

    if (mappedRoleIds.length === 0) {
      return NextResponse.json(
        { error: "ยังไม่ได้กำหนดยศ Discord สำหรับตำแหน่งแอดมิน กรุณาตั้งค่ายศก่อนซิงค์" },
        { status: 400 }
      );
    }

    // 2. Fetch live members from Discord API
    const membersRes = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/members?limit=1000`,
      {
        headers: { Authorization: `Bot ${token}` },
      }
    );

    if (!membersRes.ok) {
      return NextResponse.json(
        { error: `ไม่สามารถดึงข้อมูลสมาชิกจาก Discord ได้ (${membersRes.statusText})` },
        { status: 502 }
      );
    }

    const rawMembers = await membersRes.json();
    const syncedDiscordIds: string[] = [];
    let addedCount = 0;
    let updatedCount = 0;

    for (const m of rawMembers) {
      if (!m.user || m.user.bot) continue;
      const userRoles: string[] = m.roles || [];

      let targetRole: "OWNER" | "MANAGER" | "ADMIN" | "MODERATOR" | null = null;

      // Root Owner is always guaranteed OWNER role regardless of Discord roles
      if (isRootOwner(m.user.id)) {
        targetRole = "OWNER";
      } else if (ownerRoleId && userRoles.includes(ownerRoleId)) {
        targetRole = "OWNER";
      } else if (managerRoleId && userRoles.includes(managerRoleId)) {
        targetRole = "MANAGER";
      } else if (adminRoleId && userRoles.includes(adminRoleId)) {
        targetRole = "ADMIN";
      } else if (moderatorRoleId && userRoles.includes(moderatorRoleId)) {
        targetRole = "MODERATOR";
      }

      if (!targetRole) continue;

      syncedDiscordIds.push(m.user.id);

      const avatarUrl = m.user.avatar
        ? `https://cdn.discordapp.com/avatars/${m.user.id}/${m.user.avatar}.png`
        : null;
      const displayName = m.nick || m.user.global_name || m.user.username;

      const existing = await prisma.user.findUnique({
        where: { discordId: m.user.id },
      });

      if (existing) {
        const finalRole = isRootOwner(existing.discordId) ? "OWNER" : targetRole;
        await prisma.user.update({
          where: { id: existing.id },
          data: {
            username: m.user.username,
            displayName,
            avatar: avatarUrl,
            role: finalRole,
            isActive: true,
          },
        });
        updatedCount++;
      } else {
        await prisma.user.create({
          data: {
            discordId: m.user.id,
            username: m.user.username,
            displayName,
            avatar: avatarUrl,
            role: targetRole,
            isActive: true,
          },
        });
        addedCount++;
      }
    }

    // Optional: Clean up users currently in DB who do NOT hold any mapped admin role
    // (excluding current session user and Root Owner so they can NEVER be removed)
    const body = await request.json().catch(() => ({}));
    let removedCount = 0;

    if (body.cleanUnmatched) {
      const allCurrentAdmins = await prisma.user.findMany({
        where: {
          id: { not: currentUserId },
          discordId: {
            notIn: [ROOT_OWNER_DISCORD_ID, ...syncedDiscordIds],
          },
        },
      });

      for (const a of allCurrentAdmins) {
        if (isRootOwner(a.discordId)) continue;
        await prisma.user.delete({ where: { id: a.id } });
        removedCount++;
      }
    }

    // 3. Log the audit
    await prisma.auditLog.create({
      data: {
        userId: currentUserId,
        action: "ซิงค์แอดมินตามยศ Discord",
        category: "ADMIN",
        details: `ซิงค์ทีมงานจาก Discord พบ ${syncedDiscordIds.length} คน (เพิ่มใหม่: ${addedCount}, อัปเดต: ${updatedCount}, ลบออก: ${removedCount})`,
      },
    });

    // 4. Return updated admin list
    const updatedAdmins = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        permissions: true,
        attendances: {
          take: 1,
          orderBy: { clockIn: "desc" },
        },
        _count: {
          select: { attendances: true, transactions: true },
        },
      },
    });

    const formatted = updatedAdmins.map((a) => ({
      ...a,
      avatar: getDiscordAvatarUrl(a.discordId, a.avatar),
    }));

    return NextResponse.json({
      success: true,
      message: `ซิงค์แอดมินสำเร็จ! พบสมาชิกทีมงานทั้งหมด ${syncedDiscordIds.length} คน`,
      stats: { totalSynced: syncedDiscordIds.length, addedCount, updatedCount, removedCount },
      data: formatted,
    });
  } catch (error: any) {
    console.error("Error in POST /api/admins/sync:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
