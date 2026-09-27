import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@lynnbot/database";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // ALL, PENDING, APPROVED, REJECTED

    const where: any = {};
    if (status && status !== "ALL") {
      where.status = status;
    }

    const [leaves, totalCount, pendingCount, approvedCount, rejectedCount] =
      await Promise.all([
        prisma.leaveRequest.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatar: true,
                discordId: true,
                role: true,
              },
            },
            reviewedBy: {
              select: {
                id: true,
                username: true,
                displayName: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 100,
        }),
        prisma.leaveRequest.count(),
        prisma.leaveRequest.count({ where: { status: "PENDING" } }),
        prisma.leaveRequest.count({ where: { status: "APPROVED" } }),
        prisma.leaveRequest.count({ where: { status: "REJECTED" } }),
      ]);

    // Check who is on leave today
    const now = new Date();
    const activeLeavesToday = await prisma.leaveRequest.count({
      where: {
        status: "APPROVED",
        startDate: { lte: now },
        endDate: { gte: now },
      },
    });

    return NextResponse.json({
      leaves,
      stats: {
        total: totalCount,
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
        activeToday: activeLeavesToday,
      },
    });
  } catch (error: any) {
    console.error("GET /api/leaves error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { leaveType, days, reason, startDate } = body;

    if (!leaveType || !reason || !startDate) {
      return NextResponse.json(
        { error: "กรุณาระบุประเภทการลา วันที่เริ่มลา และเหตุผล" },
        { status: 400 }
      );
    }

    const numDays = parseInt(days || "1", 10);
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + (numDays - 1));

    const leave = await prisma.leaveRequest.create({
      data: {
        userId: (session.user as any).id,
        leaveType,
        days: numDays,
        reason,
        startDate: start,
        endDate: end,
        status: "PENDING",
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: (session.user as any).id,
        action: "LEAVE_REQUESTED_WEB",
        category: "LEAVE",
        details: `ยื่นขอลางานผ่านเว็บ (${leaveType}, ${numDays} วัน): ${reason}`,
      },
    });

    return NextResponse.json({ success: true, leave });
  } catch (error: any) {
    console.error("POST /api/leaves error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
