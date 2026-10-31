import Header from "@/components/Header";
import { prisma } from "@lynnbot/database";
import { formatDateTime, formatDuration } from "@/lib/utils";
import { Bot, Clock, RefreshCw, AlertTriangle, BarChart3 } from "lucide-react";

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
                }}
              >
                <Bot className={`w-10 h-10 ${isOnline ? "text-emerald-400" : "text-rose-500"}`} />
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
                  className="flex items-center gap-2"
                >
                  <span className={`w-3.5 h-3.5 rounded-full ${isOnline ? "bg-emerald-400 animate-pulse" : "bg-rose-500"}`} />
                  <span>{isOnline ? "ออนไลน์" : "ออฟไลน์"}</span>
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
              <div className="stat-card-icon"><Clock className="w-5 h-5 text-emerald-400" /></div>
            </div>
            <div className="stat-card-value">
              {formatDuration(Math.floor(data.totalUptime / 60))}
            </div>
            <div className="stat-card-label">Uptime รวม</div>
          </div>

          <div className="stat-card purple">
            <div className="stat-card-header">
              <div className="stat-card-icon"><RefreshCw className="w-5 h-5 text-violet-400" /></div>
            </div>
            <div className="stat-card-value">{data.sessions.length}</div>
            <div className="stat-card-label">จำนวน Sessions</div>
          </div>

          <div className="stat-card orange">
            <div className="stat-card-header">
              <div className="stat-card-icon"><AlertTriangle className="w-5 h-5 text-amber-400" /></div>
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
            <h3 className="card-title flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-sky-400 shrink-0" />
              <span>ประวัติ Sessions</span>
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
                              ? "Online"
                              : session.status === "ERROR"
                                ? "Error"
                                : session.status === "RESTARTING"
                                  ? "Restart"
                                  : "Offline"}
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
                <Bot className="w-8 h-8 mx-auto text-neutral-500 mb-2" />
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
