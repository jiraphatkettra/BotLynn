export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@lynnbot/database";

export interface AppNotification {
  id: string;
  type: "slip" | "ticket" | "leave";
  title: string;
  description: string;
  timestamp: string;
  link: string;
  priority: "high" | "medium" | "low";
  iconType: "slip" | "ticket" | "leave";
  badgeText?: string;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [
      pendingSlipsCount,
      openTicketsCount,
      pendingLeavesCount,
      pendingSlips,
      openTickets,
      pendingLeaves,
    ] = await Promise.all([
      prisma.slip.count({ where: { status: "PENDING" } }),
      prisma.ticket.count({ where: { status: { in: ["OPEN", "CLAIMED"] } } }),
      prisma.leaveRequest.count({ where: { status: "PENDING" } }),
      prisma.slip.findMany({
        where: { status: "PENDING" },
        orderBy: { createdAt: "desc" },
        take: 6,
        select: {
          id: true,
          discordName: true,
          amount: true,
          ticketId: true,
          createdAt: true,
        },
      }),
      prisma.ticket.findMany({
        where: { status: { in: ["OPEN", "CLAIMED"] } },
        orderBy: { createdAt: "desc" },
        take: 6,
        select: {
          id: true,
          ticketId: true,
          creatorName: true,
          subject: true,
          status: true,
          createdAt: true,
        },
      }),
      prisma.leaveRequest.findMany({
        where: { status: "PENDING" },
        orderBy: { createdAt: "desc" },
        take: 6,
        include: {
          user: {
            select: {
              displayName: true,
              username: true,
            },
          },
        },
      }),
    ]);

    const notifications: AppNotification[] = [];

    // Map pending slips
    for (const slip of pendingSlips) {
      notifications.push({
        id: `slip-${slip.id}`,
        type: "slip",
        title: `สลิปรอตรวจสอบ ${slip.amount ? `฿${slip.amount.toLocaleString()}` : ""}`.trim(),
        description: `ผู้ส่ง: ${slip.discordName || "สมาชิก"} ${slip.ticketId ? `(${slip.ticketId})` : ""}`,
        timestamp: slip.createdAt.toISOString(),
        link: "/slips",
        priority: "high",
        iconType: "slip",
        badgeText: "สลิปใหม่",
      });
    }

    // Map open tickets
    for (const ticket of openTickets) {
      notifications.push({
        id: `ticket-${ticket.id}`,
        type: "ticket",
        title: `ทิกเก็ต: ${ticket.subject || "ติดต่อทีมงาน"}`,
        description: `เปิดโดย: ${ticket.creatorName} (${ticket.status === "CLAIMED" ? "กำลังดูแล" : "รอดำเนินการ"})`,
        timestamp: ticket.createdAt.toISOString(),
        link: "/tickets",
        priority: ticket.status === "OPEN" ? "high" : "medium",
        iconType: "ticket",
        badgeText: ticket.status === "OPEN" ? "รอแอดมิน" : "รับเคสแล้ว",
      });
    }

    // Map pending leaves
    for (const leave of pendingLeaves) {
      const applicant = leave.user?.displayName || leave.user?.username || "ทีมงาน";
      notifications.push({
        id: `leave-${leave.id}`,
        type: "leave",
        title: `คำขอลาหยุดรอการอนุมัติ`,
        description: `${applicant} ยื่นลา ${leave.days} วัน (${leave.reason || leave.leaveType})`,
        timestamp: leave.createdAt.toISOString(),
        link: "/leaves",
        priority: "medium",
        iconType: "leave",
        badgeText: "รออนุมัติ",
      });
    }

    // Sort by timestamp descending
    notifications.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    const totalCount = pendingSlipsCount + openTicketsCount + pendingLeavesCount;

    return NextResponse.json({
      totalCount,
      counts: {
        pendingSlips: pendingSlipsCount,
        openTickets: openTicketsCount,
        pendingLeaves: pendingLeavesCount,
      },
      notifications,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error in GET /api/notifications:", error);
    return NextResponse.json(
      {
        totalCount: 0,
        counts: { pendingSlips: 0, openTickets: 0, pendingLeaves: 0 },
        notifications: [],
        error: error.message || "Failed to fetch notifications",
      },
      { status: 500 }
    );
  }
}
