import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@lynnbot/database";

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const backup = await prisma.roleBackup.findUnique({
      where: { id: params.id },
    });

    if (!backup) {
      return NextResponse.json(
        { error: "Backup not found" },
        { status: 404 }
      );
    }

    await prisma.roleBackup.delete({
      where: { id: params.id },
    });

    await prisma.auditLog.create({
      data: {
        userId: (session.user as any).id,
        action: "BACKUP_ROLES_DELETED",
        category: "BACKUP",
        details: `ลบจุดสำรองยศ: ${backup.name}`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE backup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
