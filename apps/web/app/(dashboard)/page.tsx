import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@lynnbot/database";
import { formatRelativeTime, formatCurrency, getDiscordAvatarUrl } from "@/lib/utils";
import LynnCoreOrb from "@/components/LynnCoreOrb";
import TiltCard from "@/components/TiltCard";
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

  return (
    <div className="page-content dashboard-page-container">
      {/* ======================================================== */}
      {/* 1. HERO SECTION (REFERENCE DESIGN: STUDENT COURSE HUB)    */}
      {/* ======================================================== */}
      <section className="dashboard-hero-section">
        {/* Subtle Ambient Radial Glow */}
        <div className="dashboard-hero-glow" />

        <div className="dashboard-hero-inner">
          {/* Top Pill Tag with glowing dot */}
          <div className="dashboard-hero-pill">
            <span
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                background: "#0A84FF",
                boxShadow: "0 0 10px #0A84FF",
              }}
            />
            <span
              style={{
                fontSize: "13px",
                fontWeight: 500,
                color: "#c7c7cc",
                letterSpacing: "0.01em",
              }}
            >
              Next-Generation Discord Management
            </span>
          </div>

          {/* 3D Holographic Interactive Quantum Core Orb */}
          <LynnCoreOrb />

          {/* Hero Headline */}
          <h1 className="dashboard-hero-headline">
            LynnBot Control Hub
          </h1>

          {/* Subtitle */}
          <p className="dashboard-hero-subtitle">
            ศูนย์รวมและบริหารจัดการระบบเซิร์ฟเวอร์ดิสคอร์ดสำหรับผู้ดูแล — วางแผนและควบคุมคอมมูนิตี้
            อย่างชาญฉลาด รวดเร็ว และแม่นยำ
          </p>

          {/* CTA Buttons */}
          <div className="dashboard-hero-cta">
            <a
              href="#systems-showcase"
              className="btn-hero-primary"
            >
              <span>สำรวจระบบทั้งหมด</span>
              <span>→</span>
            </a>

            <Link
              href="/settings"
              className="btn-hero-secondary"
            >
              <span>เกี่ยวกับระบบ</span>
            </Link>
          </div>

          {/* Urgent Action Pills (if pending slips or open tickets exist) */}
          {(data.pendingSlipsCount > 0 || data.openTicketsCount > 0) && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                flexWrap: "wrap",
                marginBottom: "28px",
              }}
            >
              {data.pendingSlipsCount > 0 && (
                <Link
                  href="/slips"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "6px 14px",
                    borderRadius: "9999px",
                    background: "rgba(255, 159, 10, 0.14)",
                    border: "1px solid rgba(255, 159, 10, 0.35)",
                    color: "#ff9f0a",
                    fontSize: "12.5px",
                    fontWeight: 500,
                    textDecoration: "none",
                  }}
                >
                  <span>⚠️ มีสลิปรอตรวจสอบ {data.pendingSlipsCount} รายการ</span>
                  <span>→</span>
                </Link>
              )}
              {data.openTicketsCount > 0 && (
                <Link
                  href="/tickets"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "6px 14px",
                    borderRadius: "9999px",
                    background: "rgba(41, 151, 255, 0.14)",
                    border: "1px solid rgba(41, 151, 255, 0.35)",
                    color: "#2997ff",
                    fontSize: "12.5px",
                    fontWeight: 500,
                    textDecoration: "none",
                  }}
                >
                  <span>💬 มีทิกเก็ตเปิดค้าง {data.openTicketsCount} เคส</span>
                  <span>→</span>
                </Link>
              )}
            </div>
          )}

          {/* Centered Metric Summary Cards - Perfectly Balanced & Responsive */}
          <div className="dashboard-hero-metrics">
            {/* Card 1 - Admins */}
            <div className="dashboard-hero-metric-card metric-cyan">
              <div className="dashboard-hero-metric-val">
                {data.totalAdmins}
              </div>
              <div className="dashboard-hero-metric-lbl">
                ทีมงานในระบบ
              </div>
            </div>

            {/* Card 2 - Weekly Revenue */}
            <div className="dashboard-hero-metric-card metric-gold">
              <div className="dashboard-hero-metric-val">
                ฿{formatCurrency(data.weeklyRevenue)}
              </div>
              <div className="dashboard-hero-metric-lbl">
                ยอดขายยศ (7 วัน)
              </div>
            </div>

            {/* Card 3 - Status */}
            <div className="dashboard-hero-metric-card metric-green">
              <div className="dashboard-hero-metric-val" style={{ color: "#30d158" }}>
                100%
              </div>
              <div className="dashboard-hero-metric-lbl">
                สถานะระบบออนไลน์
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 2. AUDIENCE & PURPOSE SECTION (FROM REFERENCE SCREENSHOT) */}
      {/* ======================================================== */}
      <section
        style={{
          width: "100%",
          maxWidth: "1080px",
          margin: "0 auto",
        }}
      >
        <div className="dashboard-audience-card">
          {/* Small Cyan Sub-header */}
          <div
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: "#2997ff",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              marginBottom: "14px",
            }}
          >
            AUDIENCE & PURPOSE
          </div>

          {/* Section Title */}
          <h2
            style={{
              fontSize: "clamp(22px, 3vw, 30px)",
              fontWeight: 700,
              color: "#ffffff",
              letterSpacing: "-0.025em",
              lineHeight: 1.25,
              margin: "0 0 16px",
            }}
          >
            กลุ่มผู้ใช้งานเป้าหมาย & ศูนย์ควบคุมระบบ
          </h2>

          {/* Section Body */}
          <p
            style={{
              fontSize: "15px",
              color: "rgba(255, 255, 255, 0.7)",
              lineHeight: 1.75,
              margin: 0,
              maxWidth: "880px",
            }}
          >
            ออกแบบมาเพื่อให้ผู้ดูแลและทีมงานเข้าถึงเครื่องมือจัดการเซิร์ฟเวอร์ได้อย่างราบรื่น
            ตรวจสอบสลิปโอนเงิน อนุมัติยศอัตโนมัติ ติดตามเวลาทำงานของแอดมิน และดูแลสมาชิกผ่านระบบทิกเก็ตได้อย่างสะดวกและมีประสิทธิภาพสูงสุด
            พร้อมระบบความปลอดภัยคุ้มครองสิทธิ์เจ้าของสูงสุด (Root Owner) ตลอด 24 ชั่วโมง
          </p>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 2.5 ANALYTICS & TELEMETRY SECTION                        */}
      {/* ======================================================== */}
      <AnalyticsCharts />

      {/* ======================================================== */}
      {/* 3. CORE SYSTEMS SHOWCASE (SCROLLABLE PRODUCT TOUR)       */}
      {/* ======================================================== */}
      <section
        id="systems-showcase"
        style={{
          width: "100%",
          maxWidth: "1080px",
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: "#2997ff",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                marginBottom: "6px",
              }}
            >
              CORE CAPABILITIES
            </div>
            <h2
              style={{
                fontSize: "clamp(22px, 3vw, 28px)",
                fontWeight: 700,
                color: "#ffffff",
                letterSpacing: "-0.02em",
                margin: 0,
              }}
            >
              แนะนำระบบการทำงานหลักของเว็บ
            </h2>
          </div>
          <span style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.45)" }}>
            กด ⌘K เพื่อค้นหาหรือข้ามไปยังหน้าใดก็ได้ทันที
          </span>
        </div>

        {/* 6 Modular Capability Cards Grid */}
        <div className="dashboard-capabilities-grid">
          {/* Card 1: Slips */}
          <div className="dashboard-capability-card">
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <span style={{ fontSize: "28px" }}>🧾</span>
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    padding: "3px 10px",
                    borderRadius: "9999px",
                    background: "rgba(255, 159, 10, 0.12)",
                    color: "#ff9f0a",
                    border: "1px solid rgba(255, 159, 10, 0.25)",
                  }}
                >
                  {data.pendingSlipsCount > 0 ? `รอตรวจ ${data.pendingSlipsCount}` : "สลิปพร้อมเพย์"}
                </span>
              </div>
              <h3 style={{ fontSize: "18px", fontWeight: 600, color: "#ffffff", margin: "0 0 10px" }}>
                ระบบตรวจสลิปโอนเงิน
              </h3>
              <p style={{ fontSize: "13.5px", color: "rgba(255, 255, 255, 0.6)", lineHeight: 1.65, margin: 0 }}>
                รับภาพสลิปที่สมาชิกส่งในห้อง Discord ตรวจสอบความถูกต้อง พร้อมปุ่มเติมยอดเงินเข้าบัญชีสมาชิกทันทีในคลิกเดียว
              </p>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "16px", borderTop: "1px solid rgba(255, 255, 255, 0.06)" }}>
              <span style={{ fontSize: "12px", color: data.pendingSlipsCount > 0 ? "#ff9f0a" : "rgba(255, 255, 255, 0.4)" }}>
                {data.pendingSlipsCount > 0 ? `⚠️ มีสลิปรอตรวจ ${data.pendingSlipsCount} รายการ` : "✓ ดำเนินการครบแล้ว"}
              </span>
              <Link
                href="/slips"
                style={{
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "#0A84FF",
                  textDecoration: "none",
                }}
              >
                เปิดระบบตรวจสลิป →
              </Link>
            </div>
          </div>

          {/* Card: Finance & Cashflow */}
          <div className="dashboard-capability-card">
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <span style={{ fontSize: "28px" }}>💰</span>
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    padding: "3px 10px",
                    borderRadius: "9999px",
                    background: "rgba(48, 209, 88, 0.12)",
                    color: "#30d158",
                    border: "1px solid rgba(48, 209, 88, 0.25)",
                  }}
                >
                  บัญชีรายรับ-รายจ่าย
                </span>
              </div>
              <h3 style={{ fontSize: "18px", fontWeight: 600, color: "#ffffff", margin: "0 0 10px" }}>
                ระบบบัญชี & งบเซิร์ฟเวอร์
              </h3>
              <p style={{ fontSize: "13.5px", color: "rgba(255, 255, 255, 0.6)", lineHeight: 1.65, margin: 0 }}>
                บันทึกรายรับและรายจ่ายแบบกำหนดเอง ระบุประเภท หมวดหมู่ เลขบิล และแนบหลักฐาน พร้อมคำนวณกำไรขาดทุนสุทธิอัตโนมัติ
              </p>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "16px", borderTop: "1px solid rgba(255, 255, 255, 0.06)" }}>
              <span style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.4)" }}>
                บันทึกแล้ว {data.financeRecordsCount} รายการ
              </span>
              <Link
                href="/finance"
                style={{
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "#0A84FF",
                  textDecoration: "none",
                }}
              >
                จัดการรายรับ-รายจ่าย →
              </Link>
            </div>
          </div>

          {/* Card 2: Tickets */}
          <div className="dashboard-capability-card">
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <span style={{ fontSize: "28px" }}>🎫</span>
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    padding: "3px 10px",
                    borderRadius: "9999px",
                    background: "rgba(41, 151, 255, 0.12)",
                    color: "#2997ff",
                    border: "1px solid rgba(41, 151, 255, 0.25)",
                  }}
                >
                  บริการ & ซัพพอร์ต
                </span>
              </div>
              <h3 style={{ fontSize: "18px", fontWeight: 600, color: "#ffffff", margin: "0 0 10px" }}>
                ระบบทิกเก็ตดูแลสมาชิก
              </h3>
              <p style={{ fontSize: "13.5px", color: "rgba(255, 255, 255, 0.6)", lineHeight: 1.65, margin: 0 }}>
                ศูนย์รับเรื่องร้องเรียนและช่วยเหลือสมาชิกใน Discord แอดมินสามารถเคลมเคส แชทโต้ตอบ และบันทึกประวัติข้อความได้ครบถ้วน
              </p>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "16px", borderTop: "1px solid rgba(255, 255, 255, 0.06)" }}>
              <span style={{ fontSize: "12px", color: data.openTicketsCount > 0 ? "#2997ff" : "rgba(255, 255, 255, 0.4)" }}>
                {data.openTicketsCount > 0 ? `💬 มีเคสค้าง ${data.openTicketsCount} รายการ` : "✓ ไม่มีเคสค้าง"}
              </span>
              <Link
                href="/tickets"
                style={{
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "#0A84FF",
                  textDecoration: "none",
                }}
              >
                เข้าสู่ศูนย์ทิกเก็ต →
              </Link>
            </div>
          </div>

          {/* Card 3: Shop */}
          <div className="dashboard-capability-card">
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <span style={{ fontSize: "28px" }}>🛍️</span>
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    padding: "3px 10px",
                    borderRadius: "9999px",
                    background: "rgba(48, 209, 88, 0.12)",
                    color: "#30d158",
                    border: "1px solid rgba(48, 209, 88, 0.25)",
                  }}
                >
                  ร้านค้ายศอัตโนมัติ
                </span>
              </div>
              <h3 style={{ fontSize: "18px", fontWeight: 600, color: "#ffffff", margin: "0 0 10px" }}>
                ร้านค้ายศ Discord
              </h3>
              <p style={{ fontSize: "13.5px", color: "rgba(255, 255, 255, 0.6)", lineHeight: 1.65, margin: 0 }}>
                เปิดขายยศดิสคอร์ดให้สมาชิกซื้อผ่านคำสั่งในบอท พร้อมจัดการสต็อก ตั้งราคา และส่งข้อความแจ้งเตือนอัตโนมัติ
              </p>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "16px", borderTop: "1px solid rgba(255, 255, 255, 0.06)" }}>
              <span style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.4)" }}>
                สำเร็จ {data.totalTransactions} ครั้ง
              </span>
              <Link
                href="/shop"
                style={{
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "#0A84FF",
                  textDecoration: "none",
                }}
              >
                จัดการร้านค้ายศ →
              </Link>
            </div>
          </div>

          {/* Card 4: Attendance */}
          <div className="dashboard-capability-card">
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <span style={{ fontSize: "28px" }}>⏱️</span>
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    padding: "3px 10px",
                    borderRadius: "9999px",
                    background: "rgba(167, 139, 250, 0.12)",
                    color: "#a78bfa",
                    border: "1px solid rgba(167, 139, 250, 0.25)",
                  }}
                >
                  เวลาทำงาน
                </span>
              </div>
              <h3 style={{ fontSize: "18px", fontWeight: 600, color: "#ffffff", margin: "0 0 10px" }}>
                ตอกบัตร & ห้องเสียง
              </h3>
              <p style={{ fontSize: "13.5px", color: "rgba(255, 255, 255, 0.6)", lineHeight: 1.65, margin: 0 }}>
                บันทึกเวลาเข้า-ออกงานของแอดมิน ตรวจวัดระยะเวลาสแตนด์บายห้องเสียงใน Discord พร้อมระบบยื่นขอลางาน
              </p>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "16px", borderTop: "1px solid rgba(255, 255, 255, 0.06)" }}>
              <span style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.4)" }}>
                เข้างานวันนี้ {data.activeToday} คน
              </span>
              <Link
                href="/attendance"
                style={{
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "#0A84FF",
                  textDecoration: "none",
                }}
              >
                ดูบันทึกเวลา →
              </Link>
            </div>
          </div>

          {/* Card 5: Admins & Root Owner */}
          <div className="dashboard-capability-card">
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <span style={{ fontSize: "28px" }}>👥</span>
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    padding: "3px 10px",
                    borderRadius: "9999px",
                    background: "rgba(255, 69, 58, 0.12)",
                    color: "#ff453a",
                    border: "1px solid rgba(255, 69, 58, 0.25)",
                  }}
                >
                  ทีมงาน & สิทธิ์
                </span>
              </div>
              <h3 style={{ fontSize: "18px", fontWeight: 600, color: "#ffffff", margin: "0 0 10px" }}>
                จัดการทีมงาน & สิทธิ์
              </h3>
              <p style={{ fontSize: "13.5px", color: "rgba(255, 255, 255, 0.6)", lineHeight: 1.65, margin: 0 }}>
                กำหนดสิทธิ์รายบุคคล ซิงค์ยศจาก Discord และมีระบบคุ้มครองเจ้าของสูงสุด (Root Owner) ในระดับแกนโค้ด
              </p>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "16px", borderTop: "1px solid rgba(255, 255, 255, 0.06)" }}>
              <span style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.4)" }}>
                ทีมงานทั้งหมด {data.totalAdmins} ท่าน
              </span>
              <Link
                href="/admins"
                style={{
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "#0A84FF",
                  textDecoration: "none",
                }}
              >
                จัดการทีมงาน →
              </Link>
            </div>
          </div>

          {/* Card 6: Settings */}
          <div className="dashboard-capability-card">
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <span style={{ fontSize: "28px" }}>⚙️</span>
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    padding: "3px 10px",
                    borderRadius: "9999px",
                    background: "rgba(255, 255, 255, 0.06)",
                    color: "#a1a1a6",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                  }}
                >
                  การตั้งค่าบอท
                </span>
              </div>
              <h3 style={{ fontSize: "18px", fontWeight: 600, color: "#ffffff", margin: "0 0 10px" }}>
                ตั้งค่าระบบ & ห้อง Discord
              </h3>
              <p style={{ fontSize: "13.5px", color: "rgba(255, 255, 255, 0.6)", lineHeight: 1.65, margin: 0 }}>
                กำหนดห้องส่งแจ้งเตือนสำหรับบอท เชื่อมต่อบัญชีพร้อมเพย์ และมีปุ่มทดสอบส่ง Ping ข้อความเข้า Discord ได้ทันที
              </p>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "16px", borderTop: "1px solid rgba(255, 255, 255, 0.06)" }}>
              <span style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.4)" }}>
                7 หมวดหมู่การตั้งค่า
              </span>
              <Link
                href="/settings"
                style={{
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "#0A84FF",
                  textDecoration: "none",
                }}
              >
                เปิดหน้าตั้งค่า →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 4. RECENT ACTIVITY FEED                                  */}
      {/* ======================================================== */}
      <section className="dashboard-activity-grid">
        {/* Recent Transactions */}
        <div className="dashboard-activity-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#ffffff", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
              <span>🛍️</span>
              <span>รายการซื้อยศล่าสุด</span>
            </h3>
            <Link href="/shop" style={{ fontSize: "12.5px", color: "#0A84FF", textDecoration: "none" }}>
              ดูทั้งหมด →
            </Link>
          </div>

          <div>
            {data.recentTransactions.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {data.recentTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 14px",
                      borderRadius: "12px",
                      background: "rgba(255, 255, 255, 0.02)",
                      border: "1px solid rgba(255, 255, 255, 0.05)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <img
                        src={getDiscordAvatarUrl(tx.user.discordId, tx.user.avatar)}
                        alt={tx.user.displayName || tx.user.username}
                        loading="lazy"
                        decoding="async"
                        style={{ width: "34px", height: "34px", borderRadius: "50%" }}
                      />
                      <div>
                        <div style={{ fontSize: "13px", fontWeight: 600, color: "#ffffff" }}>
                          {tx.user.displayName || tx.user.username}
                        </div>
                        <div style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.45)" }}>
                          ซื้อยศ <span style={{ color: "#2997ff" }}>{tx.role.name}</span> • {formatRelativeTime(tx.createdAt)}
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: "#30d158" }}>
                      ฿{formatCurrency(tx.price)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: "40px", textAlign: "center", color: "rgba(255, 255, 255, 0.4)", fontSize: "13px" }}>
                ยังไม่มีรายการซื้อยศ
              </div>
            )}
          </div>
        </div>

        {/* Recent Audit Logs (Real-time SSE Sync) */}
        <LiveActivityFeed initialLogs={data.recentLogs} />
      </section>
    </div>
  );
}
