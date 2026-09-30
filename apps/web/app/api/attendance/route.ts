export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@lynnbot/database";
import { isRootOwner } from "@/lib/utils";

// GET - List attendance records + check caller active clock-in
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    const where: any = {};
    if (userId) where.userId = userId;
    if (from || to) {
      where.clockIn = {};
      if (from) where.clockIn.gte = new Date(from);
      if (to) where.clockIn.lte = new Date(to);
    }

    const [attendances, total] = await Promise.all([
      prisma.attendance.findMany({
        where,
        include: { user: true },
        orderBy: { clockIn: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.attendance.count({ where }),
    ]);

    let myActiveAttendance = null;
    if (session?.user) {
      const user = session.user as any;
      if (user.id) {
        myActiveAttendance = await prisma.attendance.findFirst({
          where: {
            userId: user.id,
            clockOut: null,
          },
          orderBy: { clockIn: "desc" },
        });
      }
    }

    return NextResponse.json({
      data: attendances,
      myActiveAttendance,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching attendance:", error);
    return NextResponse.json(
      { error: "Failed to fetch attendance" },
      { status: 500 }
    );
  }
}

// POST - Create attendance (clock in)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();
    let { discordId, note, channel } = body;

    if (!discordId && session?.user) {
      discordId = (session.user as any).discordId;
      channel = channel || "Web Dashboard";
    }

    if (!discordId) {
      return NextResponse.json(
        { error: "discordId is required" },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { discordId },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Check if already clocked in
    const existingClockin = await prisma.attendance.findFirst({
      where: {
        userId: user.id,
        clockOut: null,
      },
    });

    if (existingClockin) {
      return NextResponse.json(
        { error: "Already clocked in", attendance: existingClockin },
        { status: 409 }
      );
    }

    // Determine status (late if after 9:00)
    const now = new Date();
    const hour = now.getHours();
    const status = hour >= 9 ? "LATE" : "ON_TIME";

    const attendance = await prisma.attendance.create({
      data: {
        userId: user.id,
        clockIn: now,
        status: status as any,
        note: note || (channel === "Web Dashboard" ? "ตอกบัตรผ่าน Web Dashboard" : undefined),
        channel,
      },
      include: { user: true },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "ตอกบัตรเข้างาน",
        category: "ATTENDANCE",
        details: `${user.displayName || user.username} ตอกบัตรเข้างาน${status === "LATE" ? " (มาสาย)" : ""} ผ่าน ${channel || "ระบบ"}`,
      },
    });

    return NextResponse.json({ data: attendance }, { status: 201 });
  } catch (error) {
    console.error("Error creating attendance:", error);
    return NextResponse.json(
      { error: "Failed to create attendance" },
      { status: 500 }
    );
  }
}

// PATCH - Clock out / Force Clock out
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();
    let { discordId, note, attendanceId, isForce } = body;

    // Handle Force Clock-Out by Owner / Manager
    if (attendanceId && isForce) {
      if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const sessionUser = session.user as any;
      const canForce =
        sessionUser.role === "OWNER" ||
        sessionUser.role === "MANAGER" ||
        isRootOwner(sessionUser.discordId);

      if (!canForce) {
        return NextResponse.json(
          { error: "เฉพาะ Owner หรือ Manager เท่านั้นที่สามารถบังคับออกงานได้" },
          { status: 403 }
        );
      }

      const activeAttendance = await prisma.attendance.findUnique({
        where: { id: attendanceId },
        include: { user: true },
      });

      if (!activeAttendance || activeAttendance.clockOut !== null) {
        return NextResponse.json(
          { error: "ไม่พบบันทึกการเข้างานที่ยังเปิดอยู่" },
          { status: 404 }
        );
      }

      const clockOut = new Date();
      const durationMs = clockOut.getTime() - activeAttendance.clockIn.getTime();
      const durationMinutes = Math.max(1, Math.floor(durationMs / (1000 * 60)));

      const attendance = await prisma.attendance.update({
        where: { id: attendanceId },
        data: {
          clockOut,
          duration: durationMinutes,
          note: note || `บังคับออกงานโดย ${sessionUser.displayName || sessionUser.username} (Web Dashboard)`,
        },
        include: { user: true },
      });

      await prisma.auditLog.create({
        data: {
          userId: sessionUser.id,
          action: "บังคับตอกบัตรออกงาน",
          category: "ATTENDANCE",
          details: `${sessionUser.username} บังคับตอกบัตรออกงานให้ ${activeAttendance.user.displayName || activeAttendance.user.username} (เวลาทำงาน ${durationMinutes} นาที)`,
        },
      });

      return NextResponse.json({ data: attendance });
    }

    // Normal self clock-out
    if (!discordId && session?.user) {
      discordId = (session.user as any).discordId;
    }

    if (!discordId) {
      return NextResponse.json(
        { error: "discordId is required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { discordId },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Find active clock-in
    const activeAttendance = await prisma.attendance.findFirst({
      where: {
        userId: user.id,
        clockOut: null,
      },
    });

    if (!activeAttendance) {
      return NextResponse.json(
        { error: "No active clock-in found" },
        { status: 404 }
      );
    }

    const clockOut = new Date();
    const durationMs = clockOut.getTime() - activeAttendance.clockIn.getTime();
    const durationMinutes = Math.floor(durationMs / (1000 * 60));

    // Check early leave (before 18:00)
    const hour = clockOut.getHours();
    const status = hour < 18 ? "EARLY_LEAVE" : activeAttendance.status;

    const attendance = await prisma.attendance.update({
      where: { id: activeAttendance.id },
      data: {
        clockOut,
        duration: durationMinutes,
        status: status as any,
        note: note || activeAttendance.note || "ตอกบัตรออกผ่าน Web Dashboard",
      },
      include: { user: true },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "ตอกบัตรออกงาน",
        category: "ATTENDANCE",
        details: `${user.displayName || user.username} ตอกบัตรออกงาน (ทำงาน ${durationMinutes} นาที)`,
      },
    });

    return NextResponse.json({ data: attendance });
  } catch (error) {
    console.error("Error updating attendance:", error);
    return NextResponse.json(
      { error: "Failed to update attendance" },
      { status: 500 }
    );
  }
}
