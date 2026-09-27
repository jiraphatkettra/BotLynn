import Header from "@/components/Header";
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
      take: 6,
      orderBy: { clockIn: "desc" },
      include: { user: true },
    }),
    prisma.transaction.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      include: { user: true, role: true },
    }),
    prisma.auditLog.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      include: { user: true },
    }),
  ]);

  return {
    totalAdmins,
    activeToday,
    totalTransactions,
    weeklyRevenue: weeklyRevenue._sum.price || 0,
    recentAttendance,
    recentTransactions,
    recentLogs,
  };
}

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <>
      <Header
        title="แดชบอร์ด"
        subtitle={`ยินดีต้อนรับ — ข้อมูลล่าสุด ${new Date().toLocaleDateString("th-TH", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`}
      />

      <div className="page-content">
        {/* Stats Grid */}
        <div className="stats-grid">
          <div className="stat-card" id="stat-admins">
            <div className="stat-card-header">
              <div className="stat-card-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
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
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/>
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                  <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/>
                  <path d="M2 7h20"/>
                </svg>
              </div>
            </div>
            <div className="stat-card-value">{data.totalTransactions}</div>
            <div className="stat-card-label">ยอดซื้อยศทั้งหมด</div>
          </div>

          <div className="stat-card" id="stat-revenue">
            <div className="stat-card-header">
              <div className="stat-card-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" x2="12" y1="2" y2="22"/>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
              </div>
              <div className="stat-card-change positive">7 วัน</div>
            </div>
            <div className="stat-card-value">
              {formatCurrency(data.weeklyRevenue)}
            </div>
            <div className="stat-card-label">รายได้สัปดาห์นี้</div>
          </div>
        </div>

        {/* 2-Column Grid */}
        <div className="grid-2">
          {/* Recent Attendance */}
          <div className="card" id="recent-attendance-card">
            <div className="card-header">
              <h3 className="card-title">
                <span className="card-title-icon">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                              ? new Date(att.clockOut).toLocaleTimeString(
                                  "th-TH",
                                  { hour: "2-digit", minute: "2-digit" }
                                )
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
                  <p className="empty-state-text">
                    บันทึกจะแสดงที่นี่เมื่อมีแอดมินใช้ /clockin
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Activity Feed */}
          <div className="card" id="activity-feed-card">
            <div className="card-header">
              <h3 className="card-title">
                <span className="card-title-icon">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12 6 12 12 16 14"/>
                          </svg>
                        ) : log.category === "SHOP" ? (
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/>
                            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                          </svg>
                        ) : (
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect width="18" height="12" x="3" y="6" rx="2"/>
                            <path d="M12 2v4"/>
                          </svg>
                        )}
                      </div>
                      <div className="activity-content">
                        <div className="activity-text">
                          <strong>
                            {log.user?.displayName || log.user?.username || "ระบบ"}
                          </strong>{" "}
                          <span style={{ color: "var(--text-secondary)" }}>{log.action}</span>
                        </div>
                        <div className="activity-time">
                          {formatRelativeTime(log.createdAt)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <p className="empty-state-title">ยังไม่มีกิจกรรม</p>
                  <p className="empty-state-text">
                    กิจกรรมของระบบจะบันทึกอัตโนมัติ
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="card mt-24" id="recent-transactions-card">
          <div className="card-header">
            <h3 className="card-title">
              <span className="card-title-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                              borderColor: tx.role.color
                                ? `${tx.role.color}40`
                                : undefined,
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
                <p className="empty-state-text">
                  ข้อมูลจะแสดงเมื่อมีสมาชิกซื้อยศผ่านคำสั่ง /buy
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
