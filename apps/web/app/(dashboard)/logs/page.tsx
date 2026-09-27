import Header from "@/components/Header";
import { prisma } from "@lynnbot/database";
import { formatDateTime, formatRelativeTime } from "@/lib/utils";

async function getLogsData() {
  const [logs, totalLogs, categoryCounts] = await Promise.all([
    prisma.auditLog.findMany({
      take: 100,
      orderBy: { createdAt: "desc" },
      include: { user: true },
    }),
    prisma.auditLog.count(),
    prisma.auditLog.groupBy({
      by: ["category"],
      _count: true,
    }),
  ]);

  return { logs, totalLogs, categoryCounts };
}

const categoryIcons: Record<string, string> = {
  AUTH: "🔐",
  ATTENDANCE: "⏰",
  SHOP: "🏷️",
  ADMIN: "👤",
  SYSTEM: "⚙️",
  BOT: "🤖",
  PERMISSION: "🔑",
};

const categoryLabels: Record<string, string> = {
  AUTH: "การเข้าสู่ระบบ",
  ATTENDANCE: "ตอกบัตร",
  SHOP: "ร้านค้า",
  ADMIN: "แอดมิน",
  SYSTEM: "ระบบ",
  BOT: "บอท",
  PERMISSION: "สิทธิ์",
};

export default async function LogsPage() {
  const data = await getLogsData();

  return (
    <>
      <Header
        title="ประวัติกิจกรรม"
        subtitle={`ทั้งหมด ${data.totalLogs} รายการ`}
      />

      <div className="page-content">
        {/* Category Stats */}
        <div
          className="flex gap-12 mb-24 stagger"
          style={{ flexWrap: "wrap" }}
        >
          {data.categoryCounts.map((cat) => (
            <div
              key={cat.category}
              className="flex items-center gap-8"
              style={{
                padding: "10px 18px",
                background: "var(--glass-bg)",
                border: "1px solid var(--glass-border)",
                borderRadius: "var(--radius-full)",
                fontSize: 14,
              }}
            >
              <span>{categoryIcons[cat.category] || "📋"}</span>
              <span>{categoryLabels[cat.category] || cat.category}</span>
              <span
                style={{
                  fontWeight: 700,
                  color: "var(--primary-300)",
                }}
              >
                {cat._count}
              </span>
            </div>
          ))}
        </div>

        {/* Logs Table */}
        <div className="card" id="logs-table-card">
          <div className="card-header">
            <h3 className="card-title">
              <span className="card-title-icon">📝</span>
              บันทึกกิจกรรม
            </h3>
          </div>
          <div className="card-body">
            {data.logs.length > 0 ? (
              <div className="data-table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>เวลา</th>
                      <th>ผู้ใช้</th>
                      <th>ประเภท</th>
                      <th>การกระทำ</th>
                      <th>รายละเอียด</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.logs.map((log) => (
                      <tr key={log.id}>
                        <td>
                          <div>
                            <div style={{ fontSize: 13 }}>
                              {formatRelativeTime(log.createdAt)}
                            </div>
                            <div
                              className="text-muted"
                              style={{ fontSize: 11 }}
                            >
                              {formatDateTime(log.createdAt)}
                            </div>
                          </div>
                        </td>
                        <td>
                          {log.user ? (
                            <div className="table-user">
                              {log.user.avatar ? (
                                <div className="table-avatar">
                                  <img
                                    src={log.user.avatar}
                                    alt={log.user.username}
                                  />
                                </div>
                              ) : (
                                <div className="table-avatar-placeholder">
                                  {log.user.username[0].toUpperCase()}
                                </div>
                              )}
                              <div className="table-user-name">
                                {log.user.displayName || log.user.username}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted">System</span>
                          )}
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              log.category === "AUTH"
                                ? "badge-info"
                                : log.category === "ATTENDANCE"
                                  ? "badge-success"
                                  : log.category === "SHOP"
                                    ? "badge-purple"
                                    : log.category === "BOT"
                                      ? "badge-warning"
                                      : "badge-neutral"
                            }`}
                          >
                            {categoryIcons[log.category]}{" "}
                            {categoryLabels[log.category] || log.category}
                          </span>
                        </td>
                        <td style={{ fontWeight: 500 }}>{log.action}</td>
                        <td className="text-muted text-sm">
                          {log.details || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">📝</div>
                <p className="empty-state-title">ยังไม่มีประวัติ</p>
                <p className="empty-state-text">
                  กิจกรรมจะถูกบันทึกอัตโนมัติ
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
