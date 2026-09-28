export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@lynnbot/database";

// GET - Retrieve Discord Roles and Current Role Mappings
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const currentUserRole = (session?.user as any)?.role;

    if (currentUserRole !== "OWNER") {
      return NextResponse.json(
        { error: "เฉพาะระดับ Owner เท่านั้นที่สามารถดูหรือแก้ไขการตั้งค่านี้ได้" },
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

    // 1. Fetch live Discord Roles
    const rolesRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
      headers: { Authorization: `Bot ${token}` },
      next: { revalidate: 30 },
    });

    if (!rolesRes.ok) {
      return NextResponse.json(
        { error: `ไม่สามารถดึงข้อมูลยศจาก Discord ได้ (${rolesRes.statusText})` },
        { status: 502 }
      );
    }

    const rawRoles = await rolesRes.json();
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
      }))
      .sort((a: any, b: any) => b.position - a.position);

    // 2. Fetch current role mappings from database Setting table
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

    return NextResponse.json({
      roles,
      mappings: {
        owner: mappings["admin_role_owner"] || "",
        manager: mappings["admin_role_manager"] || "",
        admin: mappings["admin_role_admin"] || "",
        moderator: mappings["admin_role_moderator"] || "",
      },
    });
  } catch (error: any) {
    console.error("Error in GET /api/admins/roles:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Save Discord Role Mappings
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const currentUserRole = (session?.user as any)?.role;

    if (currentUserRole !== "OWNER") {
      return NextResponse.json(
        { error: "เฉพาะระดับ Owner เท่านั้นที่สามารถบันทึกการตั้งค่านี้ได้" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { owner, manager, admin, moderator } = body;

    const updates = [
      { key: "admin_role_owner", value: owner || "" },
      { key: "admin_role_manager", value: manager || "" },
      { key: "admin_role_admin", value: admin || "" },
      { key: "admin_role_moderator", value: moderator || "" },
    ];

    for (const item of updates) {
      await prisma.setting.upsert({
        where: { key: item.key },
        update: { value: item.value },
        create: {
          key: item.key,
          value: item.value,
          category: "admin_roles",
          description: `Discord role mapping for ${item.key}`,
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: (session?.user as any)?.id,
        action: "อัปเดตการจับคู่ยศแอดมิน Discord",
        category: "ADMIN",
        details: `อัปเดตยศ Discord สำหรับทีมงาน (Owner: ${owner || "none"}, Manager: ${manager || "none"}, Admin: ${admin || "none"}, Mod: ${moderator || "none"})`,
      },
    });

    return NextResponse.json({
      success: true,
      mappings: { owner, manager, admin, moderator },
    });
  } catch (error: any) {
    console.error("Error in POST /api/admins/roles:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
