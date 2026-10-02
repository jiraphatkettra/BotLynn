export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@lynnbot/database";
import { isRootOwner } from "@/lib/utils";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionUser = session.user as any;
    const isOwner = sessionUser.role === "OWNER" || isRootOwner(sessionUser.discordId);

    const [users, permissions] = await Promise.all([
      prisma.user.findMany({
        where: {
          isActive: true,
          role: { in: ["OWNER", "MANAGER", "ADMIN", "MODERATOR"] },
        },
        orderBy: { role: "asc" },
        select: {
          id: true,
          discordId: true,
          username: true,
          displayName: true,
          avatar: true,
          role: true,
        },
      }),
      prisma.permission.findMany({
        select: {
          id: true,
          userId: true,
          permission: true,
          granted: true,
        },
      }),
    ]);

    return NextResponse.json({
      users,
      permissions,
      isOwner,
    });
  } catch (error: any) {
    console.error("GET /api/permissions error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionUser = session.user as any;
    const isOwner = sessionUser.role === "OWNER" || isRootOwner(sessionUser.discordId);

    if (!isOwner) {
      return NextResponse.json(
        { error: "เฉพาะ Owner หรือผู้ดูแลระดับสูงสุดเท่านั้นที่สามารถแก้ไขสิทธิ์ได้" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId, permission, granted } = body;

    if (!userId || !permission || typeof granted !== "boolean") {
      return NextResponse.json(
        { error: "ข้อมูลไม่ครบถ้วน (ต้องระบุ userId, permission, granted)" },
        { status: 400 }
      );
    }

    // Check target user
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, discordId: true, username: true, displayName: true, role: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "ไม่พบผู้ใช้ที่ระบุ" }, { status: 404 });
    }

    if (targetUser.role === "OWNER" || isRootOwner(targetUser.discordId)) {
      return NextResponse.json(
        { error: "ไม่สามารถแก้ไขสิทธิ์ของ Owner หรือเจ้าของสูงสุดได้ (มีสิทธิ์ทั้งหมดโดยสมบูรณ์)" },
        { status: 400 }
      );
    }

    // Upsert permission
    const updated = await prisma.permission.upsert({
      where: {
        userId_permission: {
          userId,
          permission,
        },
      },
      update: {
        granted,
        grantedBy: sessionUser.username || sessionUser.name || "OWNER",
      },
      create: {
        userId,
        permission,
        granted,
        grantedBy: sessionUser.username || sessionUser.name || "OWNER",
      },
    });

    // Write AuditLog
    await prisma.auditLog.create({
      data: {
        userId: sessionUser.id,
        action: "UPDATE_PERMISSION",
        category: "PERMISSION",
        details: `${granted ? "เปิดใช้งานสิทธิ์" : "ปิดใช้งานสิทธิ์"} "${permission}" ให้กับ ${targetUser.displayName || targetUser.username}`,
        metadata: {
          targetUserId: userId,
          targetUsername: targetUser.username,
          permission,
          granted,
        },
      },
    });

    return NextResponse.json({
      success: true,
      permission: updated,
    });
  } catch (error: any) {
    console.error("PATCH /api/permissions error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
