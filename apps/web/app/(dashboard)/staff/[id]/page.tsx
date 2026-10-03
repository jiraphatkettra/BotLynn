import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@lynnbot/database";
import Link from "next/link";
import { Metadata } from "next";

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: { username: true },
  });

  return {
    title: user ? `${user.username} | ข้อมูลผลงานทีมงาน` : "ข้อมูลผลงานทีมงาน",
    description: "ประวัติการทำงาน สถิติกะ และเหรียญรางวัลของทีมงาน",
  };
}

export default async function StaffProfilePage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/auth/signin");
  }

  const staff = await prisma.user.findUnique({
    where: { id: params.id },
    include: {
      attendances: {
        orderBy: { clockIn: "desc" },
        take: 30,
      },
      claimedTickets: {
        where: { status: "CLOSED" },
        take: 50,
      },
      leaveRequests: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      userBadges: {
        include: { badge: true },
        orderBy: { earnedAt: "desc" },
      },
      assignedTasks: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      walletTransactions: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      auditLogs: {
        orderBy: { createdAt: "desc" },
        take: 15,
      },
    },
  });

  if (!staff) {
    notFound();
  }

  // Calculate Attendance Metrics
  const allAttendances = await prisma.attendance.findMany({
    where: { userId: staff.id, clockOut: { not: null } },
  });

  const totalMinutes = allAttendances.reduce((acc, a) => acc + (a.duration || 0), 0);
  const totalHours = (totalMinutes / 60).toFixed(1);
  const totalShifts = allAttendances.length;
  const avgHoursPerShift = totalShifts > 0 ? (totalMinutes / 60 / totalShifts).toFixed(1) : "0";

  // Calculate streak (days worked in recent days)
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const datesWorkedSet = new Set(
    allAttendances.map((a) => {
      const d = new Date(a.clockIn);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    })
  );

  let checkDay = new Date(today);
  while (datesWorkedSet.has(checkDay.getTime())) {
    streak++;
    checkDay.setDate(checkDay.getDate() - 1);
  }

  const closedTicketsCount = await prisma.ticket.count({
    where: { claimedById: staff.id, status: "CLOSED" },
  });

  const activeTicketsCount = await prisma.ticket.count({
    where: { claimedById: staff.id, status: { in: ["OPEN", "CLAIMED"] } },
  });

  const approvedLeavesCount = staff.leaveRequests.filter((l) => l.status === "APPROVED").length;

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "2rem" }}>
      {/* Breadcrumb / Back button */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem" }}>
        <Link href="/admins" style={{ color: "var(--accent-blue)", textDecoration: "none" }}>
          ◀ รายชื่อทีมงาน
        </Link>
        <span style={{ color: "var(--text-muted)" }}>/</span>
        <span style={{ color: "var(--text-secondary)" }}>โปรไฟล์ผลงานรายบุคคล</span>
      </div>

      {/* Top Profile Hero Card */}
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-xl)",
          padding: "2rem",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "1.5rem",
          boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
          {staff.avatar ? (
            <img
              src={`https://cdn.discordapp.com/avatars/${staff.discordId}/${staff.avatar}.png?size=128`}
              alt={staff.username}
              style={{
                width: "90px",
                height: "90px",
                borderRadius: "var(--radius-full)",
                border: "3px solid var(--accent-blue)",
                objectFit: "cover",
              }}
            />
          ) : (
            <div
              style={{
                width: "90px",
                height: "90px",
                borderRadius: "var(--radius-full)",
                background: "linear-gradient(135deg, var(--accent-blue), #9c27b0)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "2.5rem",
                color: "#fff",
                fontWeight: 700,
              }}
            >
              {staff.username.slice(0, 1).toUpperCase()}
            </div>
          )}

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
              <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 700, color: "var(--text-primary)" }}>
                {staff.displayName || staff.username}
              </h1>
              <span
                style={{
                  background:
                    staff.role === "OWNER"
                      ? "rgba(255, 69, 58, 0.15)"
                      : staff.role === "MANAGER"
                      ? "rgba(255, 159, 10, 0.15)"
                      : staff.role === "ADMIN"
                      ? "rgba(0, 113, 227, 0.15)"
                      : "rgba(255, 255, 255, 0.08)",
                  color:
                    staff.role === "OWNER"
                      ? "var(--accent-danger)"
                      : staff.role === "MANAGER"
                      ? "var(--accent-warning)"
                      : staff.role === "ADMIN"
                      ? "var(--accent-blue)"
                      : "var(--text-secondary)",
                  padding: "0.25rem 0.75rem",
                  borderRadius: "var(--radius-full)",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                }}
              >
                {staff.role}
              </span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.3rem",
                  fontSize: "0.8rem",
                  color: staff.isActive ? "var(--accent-success)" : "var(--text-muted)",
                }}
              >
                <span
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: staff.isActive ? "var(--accent-success)" : "var(--text-muted)",
                  }}
                />
                {staff.isActive ? "สถานะพร้อมทำงาน" : "ระงับการทำงาน"}
              </span>
            </div>

            <p style={{ margin: "0.4rem 0 0", color: "var(--text-muted)", fontSize: "0.875rem" }}>
              Discord Tag: <code>@{staff.username}</code> • ID: <code>{staff.discordId}</code>
            </p>
            <p style={{ margin: "0.2rem 0 0", color: "var(--text-muted)", fontSize: "0.82rem" }}>
              เข้าร่วมระบบเมื่อ: {new Date(staff.createdAt).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
        </div>

        {/* Quick Balance or Action */}
        <div
          style={{
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-lg)",
            padding: "1rem 1.5rem",
            textAlign: "right",
          }}
        >
          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>ยอดเงินคงเหลือในกระเป๋า</div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--accent-success)" }}>
            ฿{staff.balance.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* 4 Telemetry Metrics Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-lg)",
            padding: "1.25rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
          }}
        >
          <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>⏱️ ชั่วโมงงานสะสม</span>
          <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "var(--accent-blue)" }}>
            {totalHours} <span style={{ fontSize: "1rem", fontWeight: 500, color: "var(--text-muted)" }}>ชม.</span>
          </div>
          <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
            จากทั้งหมด {totalShifts} กะ (เฉลี่ย {avgHoursPerShift} ชม./กะ)
          </span>
        </div>

        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-lg)",
            padding: "1.25rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
          }}
        >
          <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>🔥 ตอกบัตรต่อเนื่อง (Streak)</span>
          <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "var(--accent-warning)" }}>
            {streak} <span style={{ fontSize: "1rem", fontWeight: 500, color: "var(--text-muted)" }}>วัน</span>
          </div>
          <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
            ความสม่ำเสมอในการปฏิบัติหน้าที่
          </span>
        </div>

        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-lg)",
            padding: "1.25rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
          }}
        >
          <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>🎫 ทิกเก็ตที่ดูแล</span>
          <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "var(--accent-success)" }}>
            {closedTicketsCount}{" "}
            <span style={{ fontSize: "1rem", fontWeight: 500, color: "var(--text-muted)" }}>เคส</span>
          </div>
          <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
            กำลังดำเนินการ {activeTicketsCount} เคส
          </span>
        </div>

        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-lg)",
            padding: "1.25rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
          }}
        >
          <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>🏖️ วันลาที่อนุมัติ</span>
          <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "var(--text-primary)" }}>
            {approvedLeavesCount} <span style={{ fontSize: "1rem", fontWeight: 500, color: "var(--text-muted)" }}>ครั้ง</span>
          </div>
          <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
            คำขอลาทั้งหมด {staff.leaveRequests.length} รายการ
          </span>
        </div>
      </div>

      {/* Badges Showcase Section */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-xl)",
          padding: "1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)" }}>
          🏅 เหรียญรางวัลที่ได้รับ ({staff.userBadges.length})
        </h3>
        {staff.userBadges.length === 0 ? (
          <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.875rem" }}>
            ยังไม่ได้รับเหรียญรางวัล ทำงานและตอกบัตรอย่างสม่ำเสมอเพื่อปลดล็อกเหรียญ!
          </p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "0.75rem" }}>
            {staff.userBadges.map((ub) => (
              <div
                key={ub.id}
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  padding: "0.75rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                }}
              >
                <span style={{ fontSize: "1.75rem" }}>{ub.badge.icon || "🎖️"}</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--text-primary)" }}>
                    {ub.badge.name}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    ได้รับเมื่อ {new Date(ub.earnedAt).toLocaleDateString("th-TH")}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Two Column Layout: Recent Attendance Logs & Audit Log Timeline */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: "1.5rem" }}>
        {/* Recent Shifts */}
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-xl)",
            padding: "1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          }}
        >
          <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)" }}>
            🕒 ประวัติตอกบัตรล่าสุด (30 กะล่าสุด)
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: "400px", overflowY: "auto" }}>
            {staff.attendances.map((att) => (
              <div
                key={att.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0.6rem 0.8rem",
                  background: "rgba(255,255,255,0.02)",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border-subtle)",
                  fontSize: "0.85rem",
                }}
              >
                <div>
                  <div style={{ fontWeight: 500, color: "var(--text-primary)" }}>
                    {new Date(att.clockIn).toLocaleDateString("th-TH", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    {new Date(att.clockIn).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })} -{" "}
                    {att.clockOut
                      ? new Date(att.clockOut).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })
                      : "กำลังปฏิบัติหน้าที่"}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span
                    style={{
                      fontWeight: 600,
                      color: att.clockOut ? "var(--accent-blue)" : "var(--accent-success)",
                    }}
                  >
                    {att.duration ? `${(att.duration / 60).toFixed(1)} ชม.` : "กำลังทำงาน"}
                  </span>
                </div>
              </div>
            ))}
            {staff.attendances.length === 0 && (
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center", margin: "1rem 0" }}>
                ยังไม่มีประวัติตอกบัตร
              </p>
            )}
          </div>
        </div>

        {/* Audit Log Timeline */}
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-xl)",
            padding: "1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          }}
        >
          <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)" }}>
            📜 ไทม์ไลน์กิจกรรม (Audit Log Timeline)
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxHeight: "400px", overflowY: "auto" }}>
            {staff.auditLogs.map((log) => (
              <div
                key={log.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.75rem",
                  padding: "0.6rem 0.8rem",
                  background: "rgba(255,255,255,0.02)",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border-subtle)",
                  fontSize: "0.85rem",
                }}
              >
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: "var(--accent-blue)",
                    marginTop: "0.35rem",
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{log.action}</span>
                    <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                      {new Date(log.createdAt).toLocaleDateString("th-TH", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "0.15rem" }}>
                    หมวดหมู่: {log.category}
                  </div>
                </div>
              </div>
            ))}
            {staff.auditLogs.length === 0 && (
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center", margin: "1rem 0" }}>
                ไม่มีบันทึกกิจกรรมล่าสุด
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
