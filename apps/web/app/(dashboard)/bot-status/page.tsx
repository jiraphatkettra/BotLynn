import Header from "@/components/Header";
import { prisma } from "@lynnbot/database";
import { formatDateTime, formatDuration } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function getBotStatusData() {
  const [sessions, currentSession, totalUptime] = await Promise.all([
    prisma.botSession.findMany({
      take: 20,
      orderBy: { startedAt: "desc" },
    }),
    prisma.botSession.findFirst({
      where: { status: "ONLINE" },
      orderBy: { startedAt: "desc" },
    }),
    prisma.botSession.aggregate({
      where: { duration: { not: null } },
      _sum: { duration: true },
    }),
  ]);

  return {
    sessions,
    currentSession,
    totalUptime: totalUptime._sum.duration || 0,
  };
}

export default async function BotStatusPage() {
  const data = await getBotStatusData();

  const isOnline = !!data.currentSession;
  const uptimeSeconds = data.currentSession
    ? Math.floor(
        (new Date().getTime() -
          new Date(data.currentSession.startedAt).getTime()) /
          1000
      )
    : 0;

  return (
    <>
      <Header title="สถานะบอท" subtitle="ตรวจสอบสถานะและประวัติการทำงานของบอท" />

      <div className="page-content">
        {/* Current Status */}
        <div
          className="card mb-24 animate-scale-in"
          id="bot-current-status"
          style={{
            borderTop: isOnline
              ? "3px solid var(--success-400)"
              : "3px solid var(--error-400)",
          }}
        >
          <div className="card-body">
            <div className="flex items-center gap-24">
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: "var(--radius-xl)",
                  background: isOnline
                    ? "rgba(16, 185, 129, 0.1)"
                    : "rgba(239, 68, 68, 0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 40,
                }}
              >
                🤖
              </div>
              <div>
                <h2
                  style={{
                    fontSize: 28,
                    fontWeight: 800,
                    color: isOnline
                      ? "var(--success-400)"
                      : "var(--error-400)",
                  }}
                >
                  {isOnline ? "🟢 ออนไลน์" : "🔴 ออฟไลน์"}
                </h2>
                <p className="text-muted" style={{ marginTop: 4 }}>
                  {isOnline
                    ? `ทำงานมาแล้ว ${formatDuration(Math.floor(uptimeSeconds / 60))}`
                    : "บอทไม่ได้ทำงานอยู่"}
                </p>
                {data.currentSession && (
                  <div className="flex gap-24 mt-16">
                    <div>
                      <span className="text-muted text-xs">Guilds</span>
                      <div style={{ fontWeight: 700, fontSize: 20 }}>
                        {data.currentSession.guilds}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted text-xs">Users</span>
                      <div style={{ fontWeight: 700, fontSize: 20 }}>
                        {data.currentSession.users}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted text-xs">Ping</span>
                      <div style={{ fontWeight: 700, fontSize: 20 }}>
                        {data.currentSession.ping || "—"}ms
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="stats-grid stagger">
          <div className="stat-card green">
            <div className="stat-card-header">
              <div className="stat-card-icon">⏱️</div>
            </div>
            <div className="stat-card-value">
              {formatDuration(Math.floor(data.totalUptime / 60))}
            </div>
            <div className="stat-card-label">Uptime รวม</div>
          </div>

          <div className="stat-card purple">
            <div className="stat-card-header">
              <div className="stat-card-icon">🔄</div>
            </div>
            <div className="stat-card-value">{data.sessions.length}</div>
            <div className="stat-card-label">จำนวน Sessions</div>
          </div>

          <div className="stat-card orange">
            <div className="stat-card-header">
              <div className="stat-card-icon">⚠️</div>
            </div>
            <div className="stat-card-value">
              {data.sessions.filter((s) => s.status === "ERROR").length}
            </div>
            <div className="stat-card-label">ข้อผิดพลาด</div>
          </div>
        </div>

        {/* Session History */}
        <div className="card" id="bot-sessions-card">
          <div className="card-header">
            <h3 className="card-title">
              <span className="card-title-icon">📊</span>
              ประวัติ Sessions
            </h3>
          </div>
          <div className="card-body">
            {data.sessions.length > 0 ? (
              <div className="data-table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>สถานะ</th>
                      <th>เริ่มทำงาน</th>
                      <th>หยุดทำงาน</th>
                      <th>ระยะเวลา</th>
                      <th>Guilds</th>
                      <th>Users</th>
                      <th>Ping</th>
                      <th>สาเหตุ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.sessions.map((session) => (
                      <tr key={session.id}>
                        <td>
                          <span
                            className={`badge ${
                              session.status === "ONLINE"
                                ? "badge-success"
                                : session.status === "ERROR"
                                  ? "badge-error"
                                  : session.status === "RESTARTING"
                                    ? "badge-warning"
                                    : "badge-neutral"
                            }`}
                          >
                            {session.status === "ONLINE"
                              ? "🟢 Online"
                              : session.status === "ERROR"
                                ? "🔴 Error"
                                : session.status === "RESTARTING"
                                  ? "🟡 Restart"
                                  : "⚫ Offline"}
                          </span>
                        </td>
                        <td>{formatDateTime(session.startedAt)}</td>
                        <td>
                          {session.stoppedAt
                            ? formatDateTime(session.stoppedAt)
                            : "—"}
                        </td>
                        <td>
                          {session.duration
                            ? formatDuration(Math.floor(session.duration / 60))
                            : "กำลังทำงาน"}
                        </td>
                        <td>{session.guilds}</td>
                        <td>{session.users}</td>
                        <td>{session.ping ? `${session.ping}ms` : "—"}</td>
                        <td className="text-muted text-sm">
                          {session.reason || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">🤖</div>
                <p className="empty-state-title">ยังไม่มีข้อมูล</p>
                <p className="empty-state-text">
                  ข้อมูลจะปรากฏเมื่อบอทเริ่มทำงาน
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
