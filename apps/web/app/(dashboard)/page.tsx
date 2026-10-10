import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@lynnbot/database";
import { formatRelativeTime, formatCurrency, getDiscordAvatarUrl } from "@/lib/utils";
import AnalyticsCharts from "@/components/AnalyticsCharts";
import LiveActivityFeed from "@/components/LiveActivityFeed";

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
  const userName = user?.displayName || user?.name || "ผู้ดูแลระบบ";

  const hasUrgentTasks = data.pendingSlipsCount > 0 || data.openTicketsCount > 0;

  return (
    <div className="ios-dashboard-container">
      {/* ======================================================== */}
      {/* 1. CALM GREETING & STATUS BANNER (iOS 27 STYLE)           */}
      {/* ======================================================== */}
      <header className="ios-overview-header">
        <div className="ios-overview-header-main">
          <div className="ios-pill-badge">
            <span className="ios-badge-dot" />
            <span>ศูนย์ควบคุมระบบดิสคอร์ด</span>
          </div>
          <h1 className="ios-page-title">
            สวัสดี, {userName}
          </h1>
          <p className="ios-page-subtitle">
            ภาพรวมการดำเนินงาน สถิติธุรกรรม และสถานะทีมงานแบบเรียลไทม์
          </p>
        </div>

        <div className="ios-overview-header-meta">
          <div className="ios-live-indicator">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v4" />
              <path d="M12 18v4" />
              <path d="m4.93 4.93 2.83 2.83" />
              <path d="m16.24 16.24 2.83 2.83" />
              <path d="M2 12h4" />
              <path d="M18 12h4" />
              <path d="m4.93 19.07 2.83-2.83" />
              <path d="m16.24 7.76 2.83-2.83" />
            </svg>
            <span>ระบบออนไลน์ 100%</span>
          </div>
        </div>
      </header>

      {/* ======================================================== */}
      {/* 2. SINGLE PRIMARY ACTION ALERT CARD                      */}
      {/* ======================================================== */}
      {hasUrgentTasks ? (
        <section className="ios-action-banner" aria-label="งานค้างที่ต้องดำเนินการ">
          <div className="ios-action-banner-content">
            <div className="ios-action-banner-icon warning">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <div className="ios-action-banner-text">
              <div className="ios-action-banner-title">
                มีงานที่ต้องตรวจสอบในระบบ
              </div>
              <div className="ios-action-banner-desc">
                {data.pendingSlipsCount > 0 && `สลิปโอนเงินรอตรวจสอบ ${data.pendingSlipsCount} รายการ`}
                {data.pendingSlipsCount > 0 && data.openTicketsCount > 0 && " • "}
                {data.openTicketsCount > 0 && `ทิกเก็ตเปิดค้าง ${data.openTicketsCount} เคส`}
              </div>
            </div>
          </div>

          <div className="ios-action-banner-cta">
            {data.pendingSlipsCount > 0 ? (
              <Link href="/slips" className="ios-btn-primary">
                <span>ตรวจสอบสลิป ({data.pendingSlipsCount})</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
            ) : (
              <Link href="/tickets" className="ios-btn-primary">
                <span>จัดการทิกเก็ต ({data.openTicketsCount})</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
            )}

            {data.pendingSlipsCount > 0 && data.openTicketsCount > 0 && (
              <Link href="/tickets" className="ios-btn-ghost">
                <span>ดูทิกเก็ต ({data.openTicketsCount})</span>
              </Link>
            )}
          </div>
        </section>
      ) : (
        <section className="ios-action-banner calm" aria-label="สถานะงาน">
          <div className="ios-action-banner-content">
            <div className="ios-action-banner-icon success">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <div className="ios-action-banner-text">
              <div className="ios-action-banner-title">
                การดำเนินงานราบรื่น ไม่มีงานค้าง
              </div>
              <div className="ios-action-banner-desc">
                สลิปทั้งหมดได้รับการตรวจสอบและทิกเก็ตทุกเคสได้รับการดูแลเรียบร้อยแล้ว
              </div>
            </div>
          </div>
          <div className="ios-action-banner-cta">
            <Link href="/settings" className="ios-btn-ghost">
              <span>ตรวจสอบการตั้งค่า</span>
            </Link>
          </div>
        </section>
      )}

      {/* ======================================================== */}
      {/* 3. BENTO METRICS BAR (3 CLEAN METRIC CARDS)              */}
      {/* ======================================================== */}
      <section className="ios-bento-grid" aria-label="สถิติภาพรวม">
        {/* Metric 1: Admins */}
        <div className="ios-bento-card">
          <div className="ios-bento-card-header">
            <span className="ios-bento-card-label">ทีมงานในระบบ</span>
            <div className="ios-bento-card-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
          </div>
          <div className="ios-bento-card-val">
            {data.totalAdmins}
            <span className="ios-bento-card-unit">ท่าน</span>
          </div>
          <div className="ios-bento-card-sub">
            เข้างานวันนี้ {data.activeToday} คน
          </div>
        </div>

        {/* Metric 2: Revenue */}
        <div className="ios-bento-card">
          <div className="ios-bento-card-header">
            <span className="ios-bento-card-label">ยอดขายยศ (7 วัน)</span>
            <div className="ios-bento-card-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
          </div>
          <div className="ios-bento-card-val">
            ฿{formatCurrency(data.weeklyRevenue)}
          </div>
          <div className="ios-bento-card-sub">
            สำเร็จ {data.totalTransactions} รายการ
          </div>
        </div>

        {/* Metric 3: Accounting Records */}
        <div className="ios-bento-card">
          <div className="ios-bento-card-header">
            <span className="ios-bento-card-label">บันทึกบัญชี & งบ</span>
            <div className="ios-bento-card-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="9" y1="21" x2="9" y2="9" />
              </svg>
            </div>
          </div>
          <div className="ios-bento-card-val">
            {data.financeRecordsCount}
            <span className="ios-bento-card-unit">รายการ</span>
          </div>
          <div className="ios-bento-card-sub">
            บันทึกรายรับ-รายจ่ายเซิร์ฟเวอร์
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 4. ANALYTICS & TELEMETRY SECTION                        */}
      {/* ======================================================== */}
      <section className="ios-section-wrap" aria-label="สถิติและการวิเคราะห์">
        <AnalyticsCharts />
      </section>

      {/* ======================================================== */}
      {/* 5. CORE SYSTEM CAPABILITIES GRID (CLEAN VECTOR ICONS)   */}
      {/* ======================================================== */}
      <section className="ios-section-wrap" id="systems-showcase" aria-label="ระบบงานหลัก">
        <div className="ios-section-header">
          <div>
            <h2 className="ios-section-title">ระบบงานหลัก</h2>
            <p className="ios-section-desc">เข้าถึงระบบจัดการหลักของเซิร์ฟเวอร์ได้อย่างรวดเร็ว</p>
          </div>
          <span className="ios-section-hint">กด ⌘K เพื่อค้นหาด่วน</span>
        </div>

        <div className="ios-capabilities-grid">
          {/* Card 1: Slips */}
          <Link href="/slips" className="ios-capability-card">
            <div className="ios-cap-top">
              <div className="ios-cap-icon-box">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                  <circle cx="9" cy="9" r="2" />
                  <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                </svg>
              </div>
              <span className={`ios-badge ${data.pendingSlipsCount > 0 ? "warning" : "neutral"}`}>
                {data.pendingSlipsCount > 0 ? `รอตรวจ ${data.pendingSlipsCount}` : "เรียบร้อย"}
              </span>
            </div>
            <div className="ios-cap-body">
              <h3 className="ios-cap-title">ตรวจสลิปโอนเงิน</h3>
              <p className="ios-cap-desc">ตรวจสอบยอดสลิปจาก Discord พร้อมอนุมัติเครดิตเข้ากระเป๋าในคลิกเดียว</p>
            </div>
            <div className="ios-cap-footer">
              <span className="ios-cap-link">เปิดระบบตรวจสลิป</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          </Link>

          {/* Card 2: Finance */}
          <Link href="/finance" className="ios-capability-card">
            <div className="ios-cap-top">
              <div className="ios-cap-icon-box">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </div>
              <span className="ios-badge success">
                บัญชีงบประมาณ
              </span>
            </div>
            <div className="ios-cap-body">
              <h3 className="ios-cap-title">รายรับ-รายจ่าย</h3>
              <p className="ios-cap-desc">บันทึกบัญชีการเงินเซิร์ฟเวอร์ แนบหลักฐาน และคำนวณกำไรสุทธิอัตโนมัติ</p>
            </div>
            <div className="ios-cap-footer">
              <span className="ios-cap-link">จัดการรายรับ-รายจ่าย</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          </Link>

          {/* Card 3: Tickets */}
          <Link href="/tickets" className="ios-capability-card">
            <div className="ios-cap-top">
              <div className="ios-cap-icon-box">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </div>
              <span className={`ios-badge ${data.openTicketsCount > 0 ? "info" : "neutral"}`}>
                {data.openTicketsCount > 0 ? `เคสค้าง ${data.openTicketsCount}` : "ไม่มีเคสค้าง"}
              </span>
            </div>
            <div className="ios-cap-body">
              <h3 className="ios-cap-title">ทิกเก็ตดูแลสมาชิก</h3>
              <p className="ios-cap-desc">รับเรื่องร้องเรียน เคลมเคส และสนทนากับสมาชิก Discord ผ่านแดชบอร์ด</p>
            </div>
            <div className="ios-cap-footer">
              <span className="ios-cap-link">ศูนย์ทิกเก็ต</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          </Link>

          {/* Card 4: Shop */}
          <Link href="/shop" className="ios-capability-card">
            <div className="ios-cap-top">
              <div className="ios-cap-icon-box">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                  <path d="M3 6h18" />
                  <path d="M16 10a4 4 0 0 1-8 0" />
                </svg>
              </div>
              <span className="ios-badge neutral">
                {data.totalTransactions} รายการ
              </span>
            </div>
            <div className="ios-cap-body">
              <h3 className="ios-cap-title">ร้านค้ายศ Discord</h3>
              <p className="ios-cap-desc">จัดการรายการยศ กำหนดราคา สต็อก และตรวจสอบประวัติการซื้อ</p>
            </div>
            <div className="ios-cap-footer">
              <span className="ios-cap-link">จัดการร้านค้ายศ</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          </Link>

          {/* Card 5: Attendance */}
          <Link href="/attendance" className="ios-capability-card">
            <div className="ios-cap-top">
              <div className="ios-cap-icon-box">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <span className="ios-badge neutral">
                วันนี้ {data.activeToday} คน
              </span>
            </div>
            <div className="ios-cap-body">
              <h3 className="ios-cap-title">เวลาทำงาน & เวร</h3>
              <p className="ios-cap-desc">บันทึกเวลาเข้า-ออกงานของทีมงาน ตรวจวัดระยะเวลาห้องเสียง และคำขอลา</p>
            </div>
            <div className="ios-cap-footer">
              <span className="ios-cap-link">ดูบันทึกเวลา</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          </Link>

          {/* Card 6: Admins & Staff */}
          <Link href="/admins" className="ios-capability-card">
            <div className="ios-cap-top">
              <div className="ios-cap-icon-box">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <span className="ios-badge neutral">
                {data.totalAdmins} ท่าน
              </span>
            </div>
            <div className="ios-cap-body">
              <h3 className="ios-cap-title">ทีมงาน & สิทธิ์</h3>
              <p className="ios-cap-desc">กำหนดสิทธิ์รายบุคคล ซิงค์ยศ Discord และระบบคุ้มครอง Root Owner</p>
            </div>
            <div className="ios-cap-footer">
              <span className="ios-cap-link">จัดการทีมงาน</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          </Link>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 6. RECENT ACTIVITY & TRANSACTIONS FEED                   */}
      {/* ======================================================== */}
      <section className="ios-activity-grid" aria-label="ประวัติกิจกรรมล่าสุด">
        {/* Recent Transactions Card */}
        <div className="ios-activity-card">
          <div className="ios-activity-header">
            <div className="ios-activity-title-group">
              <div className="ios-activity-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                  <path d="M3 6h18" />
                  <path d="M16 10a4 4 0 0 1-8 0" />
                </svg>
              </div>
              <h3 className="ios-activity-title">รายการซื้อยศล่าสุด</h3>
            </div>
            <Link href="/shop" className="ios-activity-more">
              <span>ดูทั้งหมด</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>
          </div>

          <div className="ios-activity-body">
            {data.recentTransactions.length > 0 ? (
              <div className="ios-list-stack">
                {data.recentTransactions.map((tx) => (
                  <div key={tx.id} className="ios-list-row">
                    <div className="ios-list-row-main">
                      <img
                        src={getDiscordAvatarUrl(tx.user.discordId, tx.user.avatar)}
                        alt={tx.user.displayName || tx.user.username}
                        loading="lazy"
                        decoding="async"
                        className="ios-avatar"
                      />
                      <div className="ios-list-row-info">
                        <div className="ios-list-row-title">
                          {tx.user.displayName || tx.user.username}
                        </div>
                        <div className="ios-list-row-desc">
                          ยศ <span className="ios-highlight">{tx.role.name}</span> • {formatRelativeTime(tx.createdAt)}
                        </div>
                      </div>
                    </div>
                    <div className="ios-list-row-meta success">
                      ฿{formatCurrency(tx.price)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="ios-empty-state">
                <div className="ios-empty-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                    <path d="M3 6h18" />
                    <path d="M16 10a4 4 0 0 1-8 0" />
                  </svg>
                </div>
                <div className="ios-empty-title">ยังไม่มีรายการซื้อยศ</div>
                <div className="ios-empty-desc">ประวัติการซื้อจะปรากฏที่นี่เมื่อสมาชิกเริ่มสั่งซื้อยศ</div>
              </div>
            )}
          </div>
        </div>

        {/* Real-time Activity Feed */}
        <LiveActivityFeed initialLogs={data.recentLogs} />
      </section>
    </div>
  );
}
