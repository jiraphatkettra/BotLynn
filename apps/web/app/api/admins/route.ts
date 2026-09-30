export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@lynnbot/database";
import { getDiscordAvatarUrl, isRootOwner } from "@/lib/utils";

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

    const targetUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: "ไม่พบข้อมูลแอดมินในระบบ" },
        { status: 404 }
      );
    }

    // Root Owner protection: Cannot demote role or deactivate Root Owner
    if (isRootOwner(targetUser.discordId)) {
      if (role && role !== "OWNER") {
        return NextResponse.json(
          { error: "ไม่สามารถเปลี่ยนตำแหน่งหรือลดสิทธิ์ของเจ้าของสูงสุดได้ (Root Owner ล็อคตำแหน่ง Owner ถาวร)" },
          { status: 403 }
        );
      }
      if (isActive === false) {
        return NextResponse.json(
          { error: "ไม่สามารถระงับการใช้งานเจ้าของสูงสุดได้ (Root Owner)" },
          { status: 403 }
        );
      }
    }

    const updateData: any = {};
    if (role) updateData.role = isRootOwner(targetUser.discordId) ? "OWNER" : role;
    if (isActive !== undefined) updateData.isActive = isRootOwner(targetUser.discordId) ? true : isActive;

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

// DELETE - Remove admin from system (Owner only)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const currentUserRole = (session?.user as any)?.role;
    const currentUserId = (session?.user as any)?.id;

    if (currentUserRole !== "OWNER") {
      return NextResponse.json(
        { error: "เฉพาะระดับ Owner เท่านั้นที่สามารถลบแอดมินออกจากระบบได้" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "กรุณาระบุรหัสผู้ใช้ (Admin ID)" },
        { status: 400 }
      );
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: "ไม่พบข้อมูลแอดมินในระบบ" },
        { status: 404 }
      );
    }

    // Root Owner protection: Cannot be deleted by anyone, even other Owners
    if (isRootOwner(targetUser.discordId)) {
      return NextResponse.json(
        { error: "ไม่สามารถลบเจ้าของสูงสุดของระบบได้ (Root Owner ได้รับการปกป้อง ต้องแก้ไขในโค้ดเท่านั้น)" },
        { status: 403 }
      );
    }

    if (targetUser.id === currentUserId) {
      return NextResponse.json(
        { error: "คุณไม่สามารถลบบัญชีของตนเองได้" },
        { status: 400 }
      );
    }

    // Delete user and cascade relations
    await prisma.user.delete({
      where: { id },
    });

    await prisma.auditLog.create({
      data: {
        userId: currentUserId,
        action: "ลบแอดมินออกจากระบบ",
        category: "ADMIN",
        details: `ลบแอดมิน ${targetUser.displayName || targetUser.username} (@${targetUser.username}, Role: ${targetUser.role}) ออกจากระบบ`,
      },
    });

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    console.error("Error deleting admin:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to delete admin" },
      { status: 500 }
    );
  }
}
