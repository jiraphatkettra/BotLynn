import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@lynnbot/database";
import { formatRelativeTime, formatCurrency, getDiscordAvatarUrl } from "@/lib/utils";

async function getDashboardData() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);

  const [
    totalAdmins,
    activeToday,
    totalTransactions,
    weeklyRevenue,
    recentAttendance,
    recentTransactions,
    recentLogs,
    pendingSlipsCount,
    openTicketsCount,
  ] = await Promise.all([
    prisma.user.count({ where: { isActive: true } }),
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
      include: { user: true },
    }),
    prisma.transaction.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { user: true, role: true },
    }),
    prisma.auditLog.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      include: { user: true },
    }),
    prisma.slip.count({ where: { status: "PENDING" } }),
    prisma.ticket.count({ where: { status: { in: ["OPEN", "CLAIMED"] } } }),
  ]);

  return {
    totalAdmins,
    activeToday,
    totalTransactions,
    weeklyRevenue: weeklyRevenue._sum.price || 0,
    recentAttendance,
    recentTransactions,
    recentLogs,
    pendingSlipsCount,
    openTicketsCount,
  };
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const data = await getDashboardData();

  const user = session?.user as any;
  const userName = user?.displayName || user?.name || "ผู้ดูแลระบบ";

  // Time-based Thai greeting
  const currentHour = new Date().getHours();
  let greetingTime = "สวัสดีตอนเช้า";
  if (currentHour >= 12 && currentHour < 17) greetingTime = "สวัสดีตอนบ่าย";
  else if (currentHour >= 17 && currentHour < 21) greetingTime = "สวัสดีตอนเย็น";
  else if (currentHour >= 21 || currentHour < 6) greetingTime = "สวัสดีตอนค่ำ";

  const thaiDateStr = new Date().toLocaleDateString("th-TH", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <>
      <div className="page-content" style={{ paddingTop: "28px" }}>
        {/* ======================================================== */}
        {/* 1. WELCOME HERO SECTION                                  */}
        {/* ======================================================== */}
        <div
          className="card mb-24"
          style={{
            position: "relative",
            overflow: "hidden",
            background: "linear-gradient(135deg, rgba(22, 22, 28, 0.95) 0%, rgba(28, 28, 38, 0.8) 100%)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            padding: "32px",
            borderRadius: "20px",
            boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4)",
          }}
        >
          {/* Subtle Ambient Glow */}
          <div
            style={{
              position: "absolute",
              top: "-80px",
              right: "-80px",
              width: "280px",
              height: "280px",
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(0, 113, 227, 0.25) 0%, rgba(0,0,0,0) 70%)",
              filter: "blur(40px)",
              pointerEvents: "none",
            }}
          />

          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                  <span
                    className="badge badge-success"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "12px",
                      padding: "4px 10px",
                    }}
                  >
                    <span
                      style={{
                        width: "7px",
                        height: "7px",
                        borderRadius: "50%",
                        background: "#30d158",
                        boxShadow: "0 0 8px #30d158",
                      }}
                    />
                    ระบบพร้อมใช้งาน • LynnBot Online
                  </span>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                    📅 {thaiDateStr}
                  </span>
                </div>

                <h1 style={{ fontSize: "28px", fontWeight: "700", color: "#fff", margin: "0 0 6px 0", letterSpacing: "-0.5px" }}>
                  {greetingTime}, {userName} 👋
                </h1>
                <p style={{ margin: 0, fontSize: "14px", color: "var(--text-secondary)", maxWidth: "620px", lineHeight: "1.6" }}>
                  ยินดีต้อนรับเข้าสู่ระบบบริหารจัดการ LynnBot Operations System ศูนย์ควบคุมสถิติ แอดมิน สลิปการชำระเงิน และการบริการเซิร์ฟเวอร์
                </p>
              </div>

              {/* Quick Status Badges */}
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                {data.pendingSlipsCount > 0 ? (
                  <Link
                    href="/slips"
                    className="btn btn-primary"
                    style={{
                      background: "#ff9f0a",
                      borderColor: "#ff9f0a",
                      color: "#000",
                      fontWeight: 600,
                      textDecoration: "none",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <span>🧾 สลิปรอตรวจ</span>
                    <span
                      style={{
                        background: "#000",
                        color: "#ff9f0a",
                        borderRadius: "12px",
                        padding: "1px 8px",
                        fontSize: "12px",
                        fontWeight: 700,
                      }}
                    >
                      {data.pendingSlipsCount}
                    </span>
                  </Link>
                ) : null}

                {data.openTicketsCount > 0 ? (
                  <Link
                    href="/tickets"
                    className="btn btn-secondary"
                    style={{
                      textDecoration: "none",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <span>🎫 ทิกเก็ตที่เปิดอยู่</span>
                    <span className="badge badge-purple" style={{ fontSize: "11px" }}>
                      {data.openTicketsCount}
                    </span>
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 2. QUICK NAVIGATION HUB (ปุ่มนำทางไปยังแต่ละส่วน)          */}
        {/* ======================================================== */}
        <div style={{ marginBottom: "28px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
            <h2 style={{ fontSize: "16px", fontWeight: "600", color: "#fff", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2997ff" strokeWidth="2">
                <rect width="7" height="9" x="3" y="3" rx="1"/>
                <rect width="7" height="5" x="14" y="3" rx="1"/>
                <rect width="7" height="9" x="14" y="12" rx="1"/>
                <rect width="7" height="5" x="3" y="16" rx="1"/>
              </svg>
              เมนูนำทางด่วน • Quick Navigation
            </h2>
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>คลิกเพื่อเปิดไปยังระบบต่างๆ</span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "14px",
            }}
          >
            {/* 1. Slips */}
            <Link
              href="/slips"
              style={{
                textDecoration: "none",
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "14px",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                transition: "all 0.2s ease",
              }}
              className="quick-nav-card"
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    background: "rgba(48, 209, 88, 0.15)",
                    color: "#30d158",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
                    <circle cx="9" cy="9" r="2"/>
                    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                  </svg>
                </div>
                {data.pendingSlipsCount > 0 && (
                  <span className="badge badge-warning" style={{ fontSize: "11px" }}>
                    รอตรวจ {data.pendingSlipsCount}
                  </span>
                )}
              </div>
              <div style={{ fontWeight: 600, fontSize: "15px", color: "#fff" }}>จัดการสลิปโอนเงิน</div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", lineHeight: "1.4" }}>
                ตรวจทานรูปภาพสลิป อนุมัติยอดเงินเข้ากระเป๋า
              </div>
            </Link>

            {/* 2. Tickets */}
            <Link
              href="/tickets"
              style={{
                textDecoration: "none",
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "14px",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                transition: "all 0.2s ease",
              }}
              className="quick-nav-card"
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    background: "rgba(0, 113, 227, 0.15)",
                    color: "#2997ff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                </div>
                {data.openTicketsCount > 0 && (
                  <span className="badge badge-purple" style={{ fontSize: "11px" }}>
                    เปิดอยู่ {data.openTicketsCount}
                  </span>
                )}
              </div>
              <div style={{ fontWeight: 600, fontSize: "15px", color: "#fff" }}>ระบบทิกเก็ต</div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", lineHeight: "1.4" }}>
                ดูแลห้องช่วยเหลือ ดูบทสนทนา Transcript
              </div>
            </Link>

            {/* 3. Attendance */}
            <Link
              href="/attendance"
              style={{
                textDecoration: "none",
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "14px",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                transition: "all 0.2s ease",
              }}
              className="quick-nav-card"
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    background: "rgba(175, 82, 222, 0.15)",
                    color: "#af52de",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                </div>
                <span className="badge badge-success" style={{ fontSize: "11px" }}>
                  วันนี้ {data.activeToday}
                </span>
              </div>
              <div style={{ fontWeight: 600, fontSize: "15px", color: "#fff" }}>ตอกบัตรเข้างาน</div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", lineHeight: "1.4" }}>
                บันทึกเวลาทำงาน กะงาน และการลา
              </div>
            </Link>

            {/* 4. Shop */}
            <Link
              href="/shop"
              style={{
                textDecoration: "none",
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "14px",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                transition: "all 0.2s ease",
              }}
              className="quick-nav-card"
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    background: "rgba(255, 45, 85, 0.15)",
                    color: "#ff2d55",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/>
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                  </svg>
                </div>
              </div>
              <div style={{ fontWeight: 600, fontSize: "15px", color: "#fff" }}>ร้านค้ายศ</div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", lineHeight: "1.4" }}>
                ตั้งค่ายศ ราคา และตรวจดูรายการสั่งซื้อ
              </div>
            </Link>

            {/* 5. Announcements */}
            <Link
              href="/announcements"
              style={{
                textDecoration: "none",
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "14px",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                transition: "all 0.2s ease",
              }}
              className="quick-nav-card"
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    background: "rgba(255, 159, 10, 0.15)",
                    color: "#ff9f0a",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                </div>
              </div>
              <div style={{ fontWeight: 600, fontSize: "15px", color: "#fff" }}>สตูดิโอประกาศ</div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", lineHeight: "1.4" }}>
                สร้างและส่งข้อความ Embed ลงดิสคอร์ด
              </div>
            </Link>

            {/* 6. Admins */}
            <Link
              href="/admins"
              style={{
                textDecoration: "none",
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "14px",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                transition: "all 0.2s ease",
              }}
              className="quick-nav-card"
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    background: "rgba(90, 200, 250, 0.15)",
                    color: "#5ac8fa",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                  </svg>
                </div>
                <span className="badge badge-purple" style={{ fontSize: "11px" }}>
                  {data.totalAdmins} คน
                </span>
              </div>
              <div style={{ fontWeight: 600, fontSize: "15px", color: "#fff" }}>ทีมแอดมิน & ยศ</div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", lineHeight: "1.4" }}>
                ผูกยศ Discord กับตำแหน่งแอดมิน
              </div>
            </Link>

            {/* 7. Backups */}
            <Link
              href="/backups"
              style={{
                textDecoration: "none",
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "14px",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                transition: "all 0.2s ease",
              }}
              className="quick-nav-card"
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    background: "rgba(100, 210, 255, 0.15)",
                    color: "#64d2ff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                  </svg>
                </div>
              </div>
              <div style={{ fontWeight: 600, fontSize: "15px", color: "#fff" }}>สำรองและกู้ยศ</div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", lineHeight: "1.4" }}>
                บันทึก Snapshot สมาชิกและยศสำรองฉุกเฉิน
              </div>
            </Link>

            {/* 8. Settings */}
            <Link
              href="/settings"
              style={{
                textDecoration: "none",
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "14px",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                transition: "all 0.2s ease",
              }}
              className="quick-nav-card"
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    background: "rgba(255, 255, 255, 0.1)",
                    color: "#e5e5ea",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                  </svg>
                </div>
              </div>
              <div style={{ fontWeight: 600, fontSize: "15px", color: "#fff" }}>ตั้งค่าระบบ</div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", lineHeight: "1.4" }}>
                PromptPay, TrueMoney, ห้อง Log สลิป
              </div>
            </Link>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 3. CORE STATS GRID                                       */}
        {/* ======================================================== */}
        <div className="stats-grid mb-24">
          <div className="stat-card" id="stat-admins">
            <div className="stat-card-header">
              <div className="stat-card-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                </svg>
              </div>
              <div className="stat-card-change positive">Active</div>
            </div>
            <div className="stat-card-value">{data.totalAdmins}</div>
            <div className="stat-card-label">แอดมินทั้งหมด</div>
          </div>

          <div className="stat-card" id="stat-attendance">
            <div className="stat-card-header">
              <div className="stat-card-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <div className="stat-card-change positive">วันนี้</div>
            </div>
            <div className="stat-card-value">{data.activeToday}</div>
            <div className="stat-card-label">ตอกบัตรวันนี้</div>
          </div>

          <div className="stat-card" id="stat-transactions">
            <div className="stat-card-header">
              <div className="stat-card-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/>
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                </svg>
              </div>
            </div>
            <div className="stat-card-value">{data.totalTransactions}</div>
            <div className="stat-card-label">ยอดซื้อยศทั้งหมด</div>
          </div>

          <div className="stat-card" id="stat-revenue">
            <div className="stat-card-header">
              <div className="stat-card-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" x2="12" y1="2" y2="22"/>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
              </div>
              <div className="stat-card-change positive">7 วัน</div>
            </div>
            <div className="stat-card-value">{formatCurrency(data.weeklyRevenue)}</div>
            <div className="stat-card-label">รายได้สัปดาห์นี้</div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 4. 2-COLUMN ACTIVITY & ATTENDANCE                        */}
        {/* ======================================================== */}
        <div className="grid-2">
          {/* Recent Attendance */}
          <div className="card" id="recent-attendance-card">
            <div className="card-header">
              <h3 className="card-title">
                <span className="card-title-icon">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                </span>
                การตอกบัตรล่าสุด
              </h3>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              {data.recentAttendance.length > 0 ? (
                <div className="data-table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>แอดมิน</th>
                        <th>เข้างาน</th>
                        <th>ออกงาน</th>
                        <th>สถานะ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recentAttendance.map((att) => (
                        <tr key={att.id}>
                          <td>
                            <div className="table-user">
                              <div className="table-avatar">
                                <img
                                  src={getDiscordAvatarUrl(att.user.discordId, att.user.avatar)}
                                  alt={att.user.displayName || att.user.username}
                                />
                              </div>
                              <div className="table-user-name">
                                {att.user.displayName || att.user.username}
                              </div>
                            </div>
                          </td>
                          <td style={{ color: "var(--text-primary)" }}>
                            {new Date(att.clockIn).toLocaleTimeString("th-TH", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td style={{ color: "var(--text-muted)" }}>
                            {att.clockOut
                              ? new Date(att.clockOut).toLocaleTimeString("th-TH", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "—"}
                          </td>
                          <td>
                            <span
                              className={`badge ${
                                att.status === "ON_TIME"
                                  ? "badge-success"
                                  : att.status === "LATE"
                                    ? "badge-warning"
                                    : "badge-error"
                              }`}
                            >
                              {att.status === "ON_TIME"
                                ? "ตรงเวลา"
                                : att.status === "LATE"
                                  ? "สาย"
                                  : "ออกก่อน"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state">
                  <p className="empty-state-title">ยังไม่มีการตอกบัตร</p>
                  <p className="empty-state-text">บันทึกจะแสดงที่นี่เมื่อมีแอดมินใช้ /clockin</p>
                </div>
              )}
            </div>
          </div>

          {/* Activity Feed */}
          <div className="card" id="activity-feed-card">
            <div className="card-header">
              <h3 className="card-title">
                <span className="card-title-icon">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="8" x2="21" y1="6" y2="6"/>
                    <line x1="8" x2="21" y1="12" y2="12"/>
                    <line x1="8" x2="21" y1="18" y2="18"/>
                    <line x1="3" x2="3.01" y1="6" y2="6"/>
                    <line x1="3" x2="3.01" y1="12" y2="12"/>
                    <line x1="3" x2="3.01" y1="18" y2="18"/>
                  </svg>
                </span>
                กิจกรรมล่าสุด
              </h3>
            </div>
            <div className="card-body">
              {data.recentLogs.length > 0 ? (
                <div className="activity-feed">
                  {data.recentLogs.map((log) => (
                    <div className="activity-item" key={log.id}>
                      <div className="activity-icon">
                        {log.category === "ATTENDANCE" ? (
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12 6 12 12 16 14"/>
                          </svg>
                        ) : log.category === "SHOP" ? (
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/>
                            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                          </svg>
                        ) : (
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect width="18" height="12" x="3" y="6" rx="2"/>
                            <path d="M12 2v4"/>
                          </svg>
                        )}
                      </div>
                      <div className="activity-content">
                        <div className="activity-text">
                          <strong>{log.user?.displayName || log.user?.username || "ระบบ"}</strong>{" "}
                          <span style={{ color: "var(--text-secondary)" }}>{log.action}</span>
                        </div>
                        <div className="activity-time">{formatRelativeTime(log.createdAt)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <p className="empty-state-title">ยังไม่มีกิจกรรม</p>
                  <p className="empty-state-text">กิจกรรมของระบบจะบันทึกอัตโนมัติ</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 5. RECENT PURCHASES                                      */}
        {/* ======================================================== */}
        <div className="card mt-24" id="recent-transactions-card">
          <div className="card-header">
            <h3 className="card-title">
              <span className="card-title-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
              </span>
              การซื้อยศล่าสุด
            </h3>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {data.recentTransactions.length > 0 ? (
              <div className="data-table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ผู้ซื้อ</th>
                      <th>ยศ</th>
                      <th>ราคา</th>
                      <th>สถานะ</th>
                      <th>วันที่</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentTransactions.map((tx) => (
                      <tr key={tx.id}>
                        <td>
                          <div className="table-user">
                            <div className="table-avatar">
                              <img
                                src={getDiscordAvatarUrl(tx.user.discordId, tx.user.avatar)}
                                alt={tx.user.displayName || tx.user.username}
                              />
                            </div>
                            <div className="table-user-name">
                              {tx.user.displayName || tx.user.username}
                            </div>
                          </div>
                        </td>
                        <td>
                          <span
                            className="badge badge-purple"
                            style={{
                              borderColor: tx.role.color ? `${tx.role.color}40` : undefined,
                              color: tx.role.color || undefined,
                            }}
                          >
                            {tx.role.name}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                          {formatCurrency(tx.price)}
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              tx.status === "COMPLETED"
                                ? "badge-success"
                                : tx.status === "REFUNDED"
                                  ? "badge-warning"
                                  : "badge-error"
                            }`}
                          >
                            {tx.status === "COMPLETED"
                              ? "สำเร็จ"
                              : tx.status === "REFUNDED"
                                ? "คืนเงิน"
                                : "ยกเลิก"}
                          </span>
                        </td>
                        <td style={{ color: "var(--text-muted)" }}>
                          {formatRelativeTime(tx.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <p className="empty-state-title">ยังไม่มีการซื้อยศ</p>
                <p className="empty-state-text">ข้อมูลจะแสดงเมื่อมีสมาชิกซื้อยศผ่านคำสั่ง /buy</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
