import Header from "@/components/Header";
import DynamicVoiceManager from "@/components/DynamicVoiceManager";
import { prisma } from "@lynnbot/database";
import { formatDuration, getDiscordAvatarUrl, formatRelativeTime, formatDateTime } from "@/lib/utils";

async function getVoiceStatsData() {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 7);

  const [
    totalSessions,
    totalDuration,
    activeSessions,
    recentSessions,
    userLeaderboard,
    uniqueUsers,
  ] = await Promise.all([
    prisma.voiceSession.count(),
    prisma.voiceSession.aggregate({
      where: { duration: { not: null } },
      _sum: { duration: true },
    }),
    prisma.voiceSession.findMany({
      where: { leftAt: null },
      include: {
        user: {
          select: {
            id: true,
            discordId: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
      },
      orderBy: { joinedAt: "desc" },
    }),
    prisma.voiceSession.findMany({
      take: 25,
      orderBy: { joinedAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            discordId: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
      },
    }),
    prisma.voiceSession.groupBy({
      by: ["userId"],
      where: { duration: { not: null } },
      _sum: { duration: true },
      _count: true,
      orderBy: { _sum: { duration: "desc" } },
      take: 15,
    }),
    prisma.voiceSession.groupBy({
      by: ["userId"],
      _count: true,
    }),
  ]);

  // Fetch user info for leaderboard
  const userIds = userLeaderboard.map((u) => u.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: {
      id: true,
      discordId: true,
      username: true,
      displayName: true,
      avatar: true,
    },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  const leaderboardWithUsers = userLeaderboard.map((entry) => ({
    user: userMap.get(entry.userId),
    totalSeconds: entry._sum.duration || 0,
    sessionCount: entry._count,
  }));

  const totalSeconds = totalDuration._sum.duration || 0;
  const avgPerSession = totalSessions > 0 ? Math.round(totalSeconds / totalSessions) : 0;

  return {
    totalSessions,
    totalSeconds,
    avgPerSession,
    activeNow: activeSessions.length,
    activeSessions,
    recentSessions,
    leaderboard: leaderboardWithUsers,
    uniqueUserCount: uniqueUsers.length,
  };
}

function formatVoiceDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} วินาที`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours} ชม. ${mins} น.`;
  return `${mins} นาที`;
}

export const metadata = {
  title: "สถิติห้องเสียง | LynnBot",
  description: "ดูสถิติการเข้าห้อง Voice ของสมาชิก Leaderboard และประวัติ Sessions",
};

export default async function VoiceStatsPage() {
  const data = await getVoiceStatsData();

  return (
    <>
      <Header
        title="สถิติห้องเสียง (Voice Stats)"
        subtitle="ดูสถิติการเข้าห้อง Voice, Leaderboard, และประวัติ Sessions ของสมาชิก"
      />

      <div className="page-content">
        {/* Active Now Banner */}
        {data.activeNow > 0 && (
          <div
            className="card mb-24 animate-scale-in"
            style={{
              borderTop: "3px solid var(--success-400)",
            }}
          >
            <div className="card-body">
              <div className="flex items-center gap-16" style={{ flexWrap: "wrap" }}>
                <div
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: "var(--radius-xl)",
                    background: "rgba(16, 185, 129, 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 24,
                  }}
                >
                  🎙️
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "var(--success-400)" }}>
                    🟢 {data.activeNow} คนกำลังอยู่ในห้องเสียงตอนนี้
                  </div>
                  <div className="flex gap-12 mt-8" style={{ flexWrap: "wrap" }}>
                    {data.activeSessions.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center gap-8"
                        style={{
                          padding: "6px 12px",
                          background: "var(--glass-bg)",
                          border: "1px solid var(--glass-border)",
                          borderRadius: "var(--radius-full)",
                          fontSize: 13,
                        }}
                      >
                        <img
                          src={getDiscordAvatarUrl(s.user.discordId, s.user.avatar)}
                          alt={s.user.displayName || s.user.username}
                          style={{ width: 20, height: 20, borderRadius: "50%" }}
                        />
                        <span>{s.user.displayName || s.user.username}</span>
                        {s.channelName && (
                          <span className="text-muted" style={{ fontSize: 11 }}>
                            ({s.channelName})
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Voice Automation Management */}
        <DynamicVoiceManager />

        {/* Stat Cards */}
        <div className="stats-grid stagger">
          <div className="stat-card blue">
            <div className="stat-card-header">
              <div className="stat-card-icon">🕐</div>
            </div>
            <div className="stat-card-value">{formatVoiceDuration(data.totalSeconds)}</div>
            <div className="stat-card-label">เวลารวม Voice ทั้งหมด</div>
          </div>

          <div className="stat-card purple">
            <div className="stat-card-header">
              <div className="stat-card-icon">📊</div>
            </div>
            <div className="stat-card-value">{data.totalSessions.toLocaleString()}</div>
            <div className="stat-card-label">จำนวน Sessions ทั้งหมด</div>
          </div>

          <div className="stat-card green">
            <div className="stat-card-header">
              <div className="stat-card-icon">👥</div>
            </div>
            <div className="stat-card-value">{data.uniqueUserCount}</div>
            <div className="stat-card-label">ผู้ใช้ที่เคยเข้า Voice</div>
          </div>

          <div className="stat-card orange">
            <div className="stat-card-header">
              <div className="stat-card-icon">⏱️</div>
            </div>
            <div className="stat-card-value">{formatVoiceDuration(data.avgPerSession)}</div>
            <div className="stat-card-label">เฉลี่ยต่อ Session</div>
          </div>
        </div>

        {/* 2-column layout: Leaderboard + Recent Sessions */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 380px), 1fr))", gap: "24px", marginTop: "24px" }}>
          {/* Leaderboard */}
          <div className="card" id="voice-leaderboard-card">
            <div className="card-header">
              <h3 className="card-title">
                <span className="card-title-icon">🏆</span>
                อันดับ Voice Leaderboard
              </h3>
            </div>
            <div className="card-body">
              {data.leaderboard.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {data.leaderboard.map((entry, idx) => (
                    <div
                      key={entry.user?.id || idx}
                      className="flex items-center gap-12"
                      style={{
                        padding: "10px 14px",
                        background: idx < 3 ? "rgba(255, 255, 255, 0.03)" : "transparent",
                        borderRadius: "var(--radius-md)",
                        border: idx < 3 ? "1px solid rgba(255,255,255,0.06)" : "none",
                      }}
                    >
                      {/* Rank */}
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          background:
                            idx === 0
                              ? "linear-gradient(135deg, #FFD700, #FFA500)"
                              : idx === 1
                                ? "linear-gradient(135deg, #C0C0C0, #A0A0A0)"
                                : idx === 2
                                  ? "linear-gradient(135deg, #CD7F32, #B87333)"
                                  : "rgba(255,255,255,0.06)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 700,
                          fontSize: 13,
                          color: idx < 3 ? "#000" : "var(--text-muted)",
                          flexShrink: 0,
                        }}
                      >
                        {idx + 1}
                      </div>

                      {/* Avatar */}
                      {entry.user && (
                        <img
                          src={getDiscordAvatarUrl(entry.user.discordId, entry.user.avatar)}
                          alt={entry.user.displayName || entry.user.username}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            flexShrink: 0,
                          }}
                        />
                      )}

                      {/* Name */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {entry.user?.displayName || entry.user?.username || "ไม่ทราบชื่อ"}
                        </div>
                        <div className="text-muted text-xs">
                          {entry.sessionCount} sessions
                        </div>
                      </div>

                      {/* Duration */}
                      <div style={{ fontWeight: 700, fontSize: 14, color: "var(--primary-300)", whiteSpace: "nowrap" }}>
                        {formatVoiceDuration(entry.totalSeconds)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-state-icon">🎙️</div>
                  <p className="empty-state-title">ยังไม่มีข้อมูล</p>
                  <p className="empty-state-text">จะมีข้อมูลเมื่อสมาชิกเข้าใช้ห้อง Voice</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Sessions Table */}
          <div className="card" id="voice-recent-card">
            <div className="card-header">
              <h3 className="card-title">
                <span className="card-title-icon">📋</span>
                Sessions ล่าสุด
              </h3>
            </div>
            <div className="card-body">
              {data.recentSessions.length > 0 ? (
                <div className="data-table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>ผู้ใช้</th>
                        <th>ห้อง</th>
                        <th>เวลาเข้า</th>
                        <th>ระยะเวลา</th>
                        <th>สถานะ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recentSessions.map((s) => (
                        <tr key={s.id}>
                          <td>
                            <div className="table-user">
                              <div className="table-avatar">
                                <img
                                  src={getDiscordAvatarUrl(s.user.discordId, s.user.avatar)}
                                  alt={s.user.displayName || s.user.username}
                                />
                              </div>
                              <div className="table-user-name">
                                {s.user.displayName || s.user.username}
                              </div>
                            </div>
                          </td>
                          <td>
                            <span style={{ fontSize: 13 }}>
                              {s.channelName || s.channelId}
                            </span>
                          </td>
                          <td>
                            <div>
                              <div style={{ fontSize: 13 }}>
                                {formatRelativeTime(s.joinedAt)}
                              </div>
                              <div className="text-muted" style={{ fontSize: 11 }}>
                                {formatDateTime(s.joinedAt)}
                              </div>
                            </div>
                          </td>
                          <td style={{ fontWeight: 600 }}>
                            {s.duration
                              ? formatVoiceDuration(s.duration)
                              : s.leftAt
                                ? "—"
                                : "กำลังใช้งาน"}
                          </td>
                          <td>
                            {!s.leftAt ? (
                              <span className="badge badge-success">🟢 ออนไลน์</span>
                            ) : (
                              <span className="badge badge-neutral">⚫ ออกแล้ว</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-state-icon">📋</div>
                  <p className="empty-state-title">ยังไม่มี Sessions</p>
                  <p className="empty-state-text">ข้อมูลจะปรากฏเมื่อสมาชิกเข้าห้อง Voice</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
