import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@lynnbot/database";
import { formatRelativeTime, formatCurrency, getDiscordAvatarUrl } from "@/lib/utils";
import PageFrame from "@/components/ui/PageFrame";
import { TopSectionStrip, BottomSectionStrip } from "@/components/ui/SectionStrip";
import StatusChip from "@/components/ui/StatusChip";
import Button from "@/components/ui/Button";
import AnalyticsCharts from "@/components/AnalyticsCharts";
import LiveActivityFeed from "@/components/LiveActivityFeed";
import {
  Users,
  Receipt,
  Wallet,
  Clock,
  Shield,
  ShoppingBag,
  Settings,
  ArrowUpRight,
  Activity,
  AlertTriangle,
  MessageSquare,
  Sliders,
  CheckCircle2,
  TrendingUp,
  FileText,
  Calendar,
} from "lucide-react";

async function getDashboardData() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);

  const [
    totalAdminsRes,
    activeTodayRes,
    totalTransactionsRes,
    weeklyRevenueRes,
    recentAttendanceRes,
    recentTransactionsRes,
    recentLogsRes,
    pendingSlipsCountRes,
    openTicketsCountRes,
    financeRecordsCountRes,
  ] = await Promise.allSettled([
    prisma.user.count({
      where: {
        isActive: true,
        role: { in: ["OWNER", "MANAGER", "ADMIN", "MODERATOR"] },
      },
    }),
    prisma.attendance.count({
      where: { clockIn: { gte: todayStart } },
    }),
    prisma.transaction.count({
      where: { status: "COMPLETED" },
    }),
    prisma.transaction.aggregate({
      where: {
        status: "COMPLETED",
        createdAt: { gte: weekStart },
      },
      _sum: { price: true },
    }),
    prisma.attendance.findMany({
      take: 5,
      orderBy: { clockIn: "desc" },
      include: {
        user: {
          select: { id: true, username: true, displayName: true, avatar: true, discordId: true },
        },
      },
    }),
    prisma.transaction.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { id: true, username: true, displayName: true, avatar: true, discordId: true },
        },
        role: true,
      },
    }),
    prisma.auditLog.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { id: true, username: true, displayName: true, avatar: true, discordId: true },
        },
      },
    }),
    prisma.slip.count({ where: { status: "PENDING" } }),
    prisma.ticket.count({ where: { status: { in: ["OPEN", "CLAIMED"] } } }),
    prisma.financeRecord.count(),
  ]);

  const totalAdmins = totalAdminsRes.status === "fulfilled" ? totalAdminsRes.value : 0;
  const activeToday = activeTodayRes.status === "fulfilled" ? activeTodayRes.value : 0;
  const totalTransactions = totalTransactionsRes.status === "fulfilled" ? totalTransactionsRes.value : 0;
  const weeklyRevenue = weeklyRevenueRes.status === "fulfilled" ? (weeklyRevenueRes.value._sum.price || 0) : 0;
  const recentAttendance = recentAttendanceRes.status === "fulfilled" ? recentAttendanceRes.value : [];
  const recentTransactions = recentTransactionsRes.status === "fulfilled" ? recentTransactionsRes.value : [];
  const recentLogs = recentLogsRes.status === "fulfilled" ? recentLogsRes.value : [];
  const pendingSlipsCount = pendingSlipsCountRes.status === "fulfilled" ? pendingSlipsCountRes.value : 0;
  const openTicketsCount = openTicketsCountRes.status === "fulfilled" ? openTicketsCountRes.value : 0;
  const financeRecordsCount = financeRecordsCountRes.status === "fulfilled" ? financeRecordsCountRes.value : 0;

  return {
    totalAdmins,
    activeToday,
    totalTransactions,
    weeklyRevenue,
    recentAttendance,
    recentTransactions,
    recentLogs,
    pendingSlipsCount,
    openTicketsCount,
    financeRecordsCount,
  };
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const data = await getDashboardData();

  const user = session?.user as any;
  const userName = user?.displayName || user?.name || "Admin";

  return (
    <PageFrame showCenterLine={false} className="pt-2 sm:pt-4 pb-20">
      {/* Top Technical Section Strip */}
      <TopSectionStrip gridRef="GRID_REF // 001" pageCode="LYNNBOT_ADMIN_PORTAL" />

      {/* Hero Header Section */}
      <div className="p-6 sm:p-8 lg:p-10 border-b border-white/[0.08] relative">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            {/* Status Chip */}
            <StatusChip
              label="LYNNBOT CONTROL HUB // ONLINE"
              pulse
              className="mb-2"
            />

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white leading-tight font-sans">
              ศูนย์ควบคุมระบบแอดมิน
            </h1>

            <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed font-sans">
              ยินดีต้อนรับคุณ <span className="text-white font-medium">{userName}</span> — บริหารจัดการเซิร์ฟเวอร์ดิสคอร์ด ตรวจสอบสลิป บันทึกเวลาแอดมิน และติดตามสถานะระบบได้อย่างแม่นยำ
            </p>
          </div>

          {/* Quick CTAs */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Button
              href="/slips"
              variant={data.pendingSlipsCount > 0 ? "money" : "secondary"}
              icon={<Receipt className="w-4 h-4" />}
            >
              <span>ตรวจสลิป</span>
              {data.pendingSlipsCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 bg-amber-500/20 text-amber-300 text-[10px] font-mono border border-amber-500/30">
                  {data.pendingSlipsCount}
                </span>
              )}
            </Button>

            <Button
              href="/attendance"
              variant="secondary"
              icon={<Clock className="w-4 h-4" />}
            >
              เวลาทำงาน
            </Button>

            <Button
              href="/settings"
              variant="ghost"
              icon={<Settings className="w-4 h-4" />}
            >
              ตั้งค่า
            </Button>
          </div>
        </div>

        {/* Urgent Alert Banner (Only when pending items exist) */}
        {(data.pendingSlipsCount > 0 || data.openTicketsCount > 0) && (
          <div className="mt-6 pt-5 border-t border-white/[0.06] flex flex-wrap items-center gap-3">
            {data.pendingSlipsCount > 0 && (
              <Link
                href="/slips"
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-950/20 border border-amber-500/30 text-amber-300 text-xs font-mono hover:bg-amber-900/30 transition-colors"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>รอตรวจสลิปโอนเงิน: {data.pendingSlipsCount} รายการ</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-amber-400" />
              </Link>
            )}

            {data.openTicketsCount > 0 && (
              <Link
                href="/tickets"
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-sky-950/20 border border-sky-500/30 text-sky-300 text-xs font-mono hover:bg-sky-900/30 transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span>ทิกเก็ตเปิดค้าง: {data.openTicketsCount} เคส</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-sky-400" />
              </Link>
            )}
          </div>
        )}
      </div>

      {/* 4-Column Bento Metric Summary Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-white/[0.08] border-b border-white/[0.08] bg-[#070809]">
        {/* Metric 1: Admins */}
        <div className="p-5 sm:p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400 text-xs font-mono">
            <span>01 // STAFF</span>
            <Users className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-bold font-mono text-white tracking-tight">
              {data.totalAdmins}
            </div>
            <div className="text-[11px] text-neutral-400 mt-1 font-sans">
              ทีมงานที่เปิดใช้งานในระบบ
            </div>
          </div>
        </div>

        {/* Metric 2: Revenue */}
        <div className="p-5 sm:p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400 text-xs font-mono">
            <span>02 // REVENUE</span>
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-400 tracking-tight">
              ฿{formatCurrency(data.weeklyRevenue)}
            </div>
            <div className="text-[11px] text-neutral-400 mt-1 font-sans">
              ยอดขายยศสัปดาห์นี้
            </div>
          </div>
        </div>

        {/* Metric 3: Active Today */}
        <div className="p-5 sm:p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400 text-xs font-mono">
            <span>03 // ATTENDANCE</span>
            <Clock className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-bold font-mono text-sky-400 tracking-tight">
              {data.activeToday}
            </div>
            <div className="text-[11px] text-neutral-400 mt-1 font-sans">
              ตอกบัตรปฏิบัติงานวันนี้
            </div>
          </div>
        </div>

        {/* Metric 4: System Health */}
        <div className="p-5 sm:p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400 text-xs font-mono">
            <span>04 // STATUS</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-bold font-mono text-white tracking-tight flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-emerald-400 animate-pulse shrink-0" />
              <span>100%</span>
            </div>
            <div className="text-[11px] text-neutral-400 mt-1 font-sans">
              Discord Gateway & API ปกติ
            </div>
          </div>
        </div>
      </div>

      {/* Core Systems Modules Grid */}
      <div className="p-6 sm:p-8 lg:p-10 border-b border-white/[0.08]">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
              SYSTEM_CAPABILITIES // BENTO
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight font-sans mt-1">
              โมดูลระบบการจัดการ
            </h2>
          </div>
          <span className="text-xs text-neutral-500 font-mono hidden sm:inline-block">
            กด ⌘K เพื่อค้นหาด่วน
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {/* Module 1: Slips */}
          <Link
            href="/slips"
            className="group p-5 bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.08] hover:border-white/20 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-9 h-9 flex items-center justify-center bg-white/[0.04] border border-white/[0.08] text-neutral-300 group-hover:text-white transition-colors">
                  <Receipt className="w-4 h-4" />
                </div>
                {data.pendingSlipsCount > 0 ? (
                  <span className="px-2 py-0.5 text-[10px] font-mono bg-amber-950/30 text-amber-300 border border-amber-500/30">
                    รอตรวจ {data.pendingSlipsCount}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-[10px] font-mono bg-white/[0.04] text-neutral-400 border border-white/[0.08]">
                    พร้อมเพย์
                  </span>
                )}
              </div>
              <h3 className="text-sm font-semibold text-white group-hover:text-sky-300 transition-colors">
                ระบบตรวจสลิปโอนเงิน
              </h3>
              <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
                ตรวจภาพสลิปที่ส่งใน Discord ตรวจสอบ QR Slip อัตโนมัติและอนุมัติเครดิตทันที
              </p>
            </div>
            <div className="pt-4 mt-4 border-t border-white/[0.06] flex items-center justify-between text-xs text-neutral-400 group-hover:text-white font-mono">
              <span>OPEN_SLIPS</span>
              <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
          </Link>

          {/* Module 2: Finance */}
          <Link
            href="/finance"
            className="group p-5 bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.08] hover:border-white/20 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-9 h-9 flex items-center justify-center bg-white/[0.04] border border-white/[0.08] text-emerald-400 transition-colors">
                  <Wallet className="w-4 h-4" />
                </div>
                <span className="px-2 py-0.5 text-[10px] font-mono bg-white/[0.04] text-neutral-400 border border-white/[0.08]">
                  {data.financeRecordsCount} บิล
                </span>
              </div>
              <h3 className="text-sm font-semibold text-white group-hover:text-emerald-300 transition-colors">
                รายรับ-รายจ่าย & งบเซิร์ฟเวอร์
              </h3>
              <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
                บันทึกบัญชี แยกหมวดหมู่ เลขบิล แนบหลักฐาน และคำนวณกำไรสุทธิแบบอัตโนมัติ
              </p>
            </div>
            <div className="pt-4 mt-4 border-t border-white/[0.06] flex items-center justify-between text-xs text-neutral-400 group-hover:text-white font-mono">
              <span>FINANCE_LEDGER</span>
              <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
          </Link>

          {/* Module 3: Tickets */}
          <Link
            href="/tickets"
            className="group p-5 bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.08] hover:border-white/20 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-9 h-9 flex items-center justify-center bg-white/[0.04] border border-white/[0.08] text-sky-400 transition-colors">
                  <MessageSquare className="w-4 h-4" />
                </div>
                {data.openTicketsCount > 0 ? (
                  <span className="px-2 py-0.5 text-[10px] font-mono bg-sky-950/30 text-sky-300 border border-sky-500/30">
                    เปิดอยู่ {data.openTicketsCount}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-[10px] font-mono bg-white/[0.04] text-neutral-400 border border-white/[0.08]">
                    เคลียร์ครบ
                  </span>
                )}
              </div>
              <h3 className="text-sm font-semibold text-white group-hover:text-sky-300 transition-colors">
                ศูนย์ทิกเก็ต & ซัพพอร์ต
              </h3>
              <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
                รับเคสช่วยเหลือสมาชิก แอดมินเคลมเคส สนทนาโต้ตอบ และเก็บบันทึกประวัติ
              </p>
            </div>
            <div className="pt-4 mt-4 border-t border-white/[0.06] flex items-center justify-between text-xs text-neutral-400 group-hover:text-white font-mono">
              <span>SUPPORT_TICKETS</span>
              <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
          </Link>

          {/* Module 4: Attendance & Time Clock */}
          <Link
            href="/attendance"
            className="group p-5 bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.08] hover:border-white/20 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-9 h-9 flex items-center justify-center bg-white/[0.04] border border-white/[0.08] text-indigo-400 transition-colors">
                  <Clock className="w-4 h-4" />
                </div>
                <span className="px-2 py-0.5 text-[10px] font-mono bg-white/[0.04] text-neutral-400 border border-white/[0.08]">
                  วันนี้ {data.activeToday} คน
                </span>
              </div>
              <h3 className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors">
                ตอกบัตร & บันทึกเวลา
              </h3>
              <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
                บันทึกเวลาเข้า-ออกงานทีมงาน สแตนด์บายห้องเสียง และระบบยื่นคำขอลางาน
              </p>
            </div>
            <div className="pt-4 mt-4 border-t border-white/[0.06] flex items-center justify-between text-xs text-neutral-400 group-hover:text-white font-mono">
              <span>ATTENDANCE_LOGS</span>
              <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
          </Link>

          {/* Module 5: Role Shop */}
          <Link
            href="/shop"
            className="group p-5 bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.08] hover:border-white/20 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-9 h-9 flex items-center justify-center bg-white/[0.04] border border-white/[0.08] text-purple-400 transition-colors">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <span className="px-2 py-0.5 text-[10px] font-mono bg-white/[0.04] text-neutral-400 border border-white/[0.08]">
                  {data.totalTransactions} รายการ
                </span>
              </div>
              <h3 className="text-sm font-semibold text-white group-hover:text-purple-300 transition-colors">
                ร้านค้ายศ Discord
              </h3>
              <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
                จัดการแพ็กเกจยศ ตั้งราคา จัดโปรโมชัน และตั้งค่าระบบส่งมอบยศอัตโนมัติ
              </p>
            </div>
            <div className="pt-4 mt-4 border-t border-white/[0.06] flex items-center justify-between text-xs text-neutral-400 group-hover:text-white font-mono">
              <span>ROLE_STORE</span>
              <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
          </Link>

          {/* Module 6: Admins & Permissions */}
          <Link
            href="/admins"
            className="group p-5 bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.08] hover:border-white/20 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-9 h-9 flex items-center justify-center bg-white/[0.04] border border-white/[0.08] text-rose-400 transition-colors">
                  <Shield className="w-4 h-4" />
                </div>
                <span className="px-2 py-0.5 text-[10px] font-mono bg-white/[0.04] text-neutral-400 border border-white/[0.08]">
                  {data.totalAdmins} ท่าน
                </span>
              </div>
              <h3 className="text-sm font-semibold text-white group-hover:text-rose-300 transition-colors">
                ทีมงาน & สิทธิ์ความปลอดภัย
              </h3>
              <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
                กำหนดสิทธิ์แอดมินรายบุคคล ซิงค์ตำแหน่งจาก Discord พร้อมคุ้มครองสิทธิ์ Root Owner
              </p>
            </div>
            <div className="pt-4 mt-4 border-t border-white/[0.06] flex items-center justify-between text-xs text-neutral-400 group-hover:text-white font-mono">
              <span>ACCESS_CONTROL</span>
              <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
          </Link>
        </div>
      </div>

      {/* Analytics & Live Telemetry Component */}
      <div className="p-6 sm:p-8 lg:p-10 border-b border-white/[0.08]">
        <AnalyticsCharts />
      </div>

      {/* Recent Activity Grid */}
      <div className="p-6 sm:p-8 lg:p-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          {/* Recent Role Transactions */}
          <div className="p-5 sm:p-6 bg-white/[0.02] border border-white/[0.08] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-purple-400" />
                  <h3 className="text-sm font-semibold text-white font-sans">
                    รายการสั่งซื้อยศล่าสุด
                  </h3>
                </div>
                <Link
                  href="/shop"
                  className="text-xs font-mono text-neutral-400 hover:text-white flex items-center gap-1 transition-colors"
                >
                  <span>ALL_ORDERS</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {data.recentTransactions.length > 0 ? (
                <div className="space-y-2.5">
                  {data.recentTransactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="p-3 bg-white/[0.02] border border-white/[0.06] flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={getDiscordAvatarUrl(tx.user.discordId, tx.user.avatar)}
                          alt={tx.user.displayName || tx.user.username}
                          className="w-8 h-8 rounded-full border border-white/10 shrink-0"
                          loading="lazy"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-white truncate">
                            {tx.user.displayName || tx.user.username}
                          </div>
                          <div className="text-[11px] text-neutral-400 truncate">
                            ยศ <span className="text-neutral-200">{tx.role.name}</span> • {formatRelativeTime(tx.createdAt)}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs font-mono font-semibold text-emerald-400 shrink-0">
                        ฿{formatCurrency(tx.price)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-neutral-500 font-mono">
                  [NO_RECENT_TRANSACTIONS]
                </div>
              )}
            </div>
          </div>

          {/* Real-time Audit Logs Feed */}
          <div className="p-5 sm:p-6 bg-white/[0.02] border border-white/[0.08]">
            <LiveActivityFeed initialLogs={data.recentLogs} />
          </div>
        </div>
      </div>

      {/* Bottom Technical Section Strip */}
      <BottomSectionStrip figLabel="FIG_01 // TELEMETRY" statusText="SYSTEM_READY // SYNCHRONIZED" />
    </PageFrame>
  );
}
