import Header from "@/components/Header";
import { prisma } from "@lynnbot/database";
import AttendanceContainer from "@/components/AttendanceContainer";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isRootOwner } from "@/lib/utils";

async function getAttendanceData() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [attendances, todayCount, monthCount, avgDuration, users] =
    await Promise.all([
      prisma.attendance.findMany({
        orderBy: { clockIn: "desc" },
        take: 50,
        include: { user: true },
      }),
      prisma.attendance.count({
        where: { clockIn: { gte: todayStart } },
      }),
      prisma.attendance.count({
        where: { clockIn: { gte: monthStart } },
      }),
      prisma.attendance.aggregate({
        where: {
          duration: { not: null },
          clockIn: { gte: monthStart },
        },
        _avg: { duration: true },
      }),
      prisma.user.findMany({
        where: { isActive: true },
        select: { id: true, username: true, displayName: true, avatar: true },
      }),
    ]);

  return {
    attendances,
    todayCount,
    monthCount,
    avgDuration: Math.round(avgDuration._avg.duration || 0),
    totalAdmins: users.length,
  };
}

export default async function AttendancePage() {
  const [data, session] = await Promise.all([
    getAttendanceData(),
    getServerSession(authOptions),
  ]);

  const sessionUser = session?.user as any;
  const isManager =
    sessionUser?.role === "OWNER" ||
    sessionUser?.role === "MANAGER" ||
    isRootOwner(sessionUser?.discordId);

  const myActiveAttendance = sessionUser?.id
    ? await prisma.attendance.findFirst({
        where: { userId: sessionUser.id, clockOut: null },
        orderBy: { clockIn: "desc" },
      })
    : null;

  return (
    <>
      <Header
        title="ระบบเข้างานและลางาน"
        subtitle="บันทึกเวลาเข้า-ออกงาน ติดตามเวลาห้องเสียง และจัดการคำขอลางานของทีมงาน"
      />

      <div className="page-content">
        <AttendanceContainer
          data={data}
          initialActiveAttendance={myActiveAttendance}
          isManager={isManager}
        />
      </div>
    </>
  );
}
