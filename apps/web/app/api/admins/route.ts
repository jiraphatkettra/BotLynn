export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@lynnbot/database";
import { getDiscordAvatarUrl } from "@/lib/utils";

// GET - List admins with permissions, attendance, and transactions
export async function GET() {
  try {
    const admins = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        permissions: true,
        attendances: {
          take: 5,
          orderBy: { clockIn: "desc" },
        },
        _count: {
          select: { attendances: true, transactions: true },
        },
      },
    });

    const formattedAdmins = admins.map((admin) => ({
      ...admin,
      avatar: getDiscordAvatarUrl(admin.discordId, admin.avatar),
    }));

    return NextResponse.json({ data: formattedAdmins });
  } catch (error) {
    console.error("Error fetching admins:", error);
    return NextResponse.json(
      { error: "Failed to fetch admins" },
      { status: 500 }
    );
  }
}

// PATCH - Update admin role, status, and granular permissions (Owner only)
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const currentUserRole = (session?.user as any)?.role;

    if (currentUserRole !== "OWNER") {
      return NextResponse.json(
        { error: "เฉพาะระดับ Owner เท่านั้นที่สามารถจัดการสิทธิ์และบทบาทของสมาชิกได้" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, role, isActive, permissions } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Admin id is required" },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (role) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;

    const admin = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    // Handle granular permissions if provided: array of { permission: string, granted: boolean }
    if (Array.isArray(permissions)) {
      for (const p of permissions) {
        if (p.permission) {
          await prisma.permission.upsert({
            where: {
              userId_permission: {
                userId: id,
                permission: p.permission,
              },
            },
            update: {
              granted: Boolean(p.granted),
              grantedBy: (session?.user as any)?.id,
            },
            create: {
              userId: id,
              permission: p.permission,
              granted: Boolean(p.granted),
              grantedBy: (session?.user as any)?.id,
            },
          });
        }
      }
    }

    // Fetch updated user with permissions
    const updatedAdmin = await prisma.user.findUnique({
      where: { id },
      include: {
        permissions: true,
        _count: {
          select: { attendances: true, transactions: true },
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: (session?.user as any)?.id,
        action: "อัปเดตสิทธิ์แอดมิน",
        category: "ADMIN",
        details: `อัปเดตสิทธิ์/บทบาทของ ${admin.displayName || admin.username} (Role: ${admin.role})`,
      },
    });

    return NextResponse.json({ data: updatedAdmin });
  } catch (error: any) {
    console.error("Error updating admin:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update admin" },
      { status: 500 }
    );
  }
}
