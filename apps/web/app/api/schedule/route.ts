export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@lynnbot/database";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month"); // e.g. "2026-10" or null

    let dateFilter: any = {};
    if (month) {
      const [year, m] = month.split("-").map(Number);
      const start = new Date(year, m - 1, 1);
      const end = new Date(year, m, 1);
      dateFilter = { gte: start, lt: end };
    }

    const schedules = await prisma.shiftSchedule.findMany({
      where: month ? { date: dateFilter } : {},
      include: {
        user: {
          select: {
            id: true,
            discordId: true,
            username: true,
            displayName: true,
            avatar: true,
            role: true,
          },
        },
      },
      orderBy: { date: "asc" },
    });

    // Also fetch active staff users for scheduling dropdown
    const staffList = await prisma.user.findMany({
      where: {
        isActive: true,
        role: { in: ["OWNER", "MANAGER", "ADMIN", "MODERATOR"] },
      },
      select: {
        id: true,
        discordId: true,
        username: true,
        displayName: true,
        avatar: true,
        role: true,
      },
      orderBy: { displayName: "asc" },
    });

    return NextResponse.json({ schedules, staffList });
  } catch (error: any) {
    console.error("Error in GET /api/schedule:", error);
    return NextResponse.json({ error: error.message || "Failed to load schedules" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { userId, date, shiftType, startTime, endTime, note } = body;

    if (!userId || !date || !shiftType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    const schedule = await prisma.shiftSchedule.upsert({
      where: {
        userId_date: {
          userId,
          date: targetDate,
        },
      },
      update: {
        shiftType,
        startTime: startTime || "09:00",
        endTime: endTime || "17:00",
        note,
      },
      create: {
        userId,
        date: targetDate,
        shiftType,
        startTime: startTime || "09:00",
        endTime: endTime || "17:00",
        note,
        createdBy: session.user?.name || "Admin",
      },
      include: {
        user: true,
      },
    });

    // Log action
    await prisma.auditLog.create({
      data: {
        action: `จัดตารางเวร (${shiftType})`,
        category: "SCHEDULE",
        details: `กำหนดกะ ${shiftType} (${schedule.startTime}-${schedule.endTime}) ให้ ${schedule.user.displayName || schedule.user.username} วันที่ ${schedule.date.toLocaleDateString("th-TH")}`,
      },
    });

    return NextResponse.json({ success: true, schedule });
  } catch (error: any) {
    console.error("Error in POST /api/schedule:", error);
    return NextResponse.json({ error: error.message || "Failed to save schedule" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    const schedule = await prisma.shiftSchedule.delete({
      where: { id },
      include: { user: true },
    });

    await prisma.auditLog.create({
      data: {
        action: "ลบตารางเวร",
        category: "SCHEDULE",
        details: `ลบกะ ${schedule.shiftType} ของ ${schedule.user.displayName || schedule.user.username} วันที่ ${schedule.date.toLocaleDateString("th-TH")}`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in DELETE /api/schedule:", error);
    return NextResponse.json({ error: error.message || "Failed to delete schedule" }, { status: 500 });
  }
}
