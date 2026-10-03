import Header from "@/components/Header";
import DynamicVoiceManager from "@/components/DynamicVoiceManager";
import { prisma } from "@lynnbot/database";

export const dynamic = "force-dynamic";

async function getVoiceSummary() {
  const [totalSessions, totalDuration, uniqueUsers] = await Promise.all([
    prisma.voiceSession.count(),
    prisma.voiceSession.aggregate({
      where: { duration: { not: null } },
      _sum: { duration: true },
    }),
    prisma.voiceSession.groupBy({
      by: ["userId"],
      _count: true,
    }),
  ]);

  const totalSeconds = totalDuration._sum.duration || 0;

  return {
    totalSessions,
    totalSeconds,
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
  title: "ระบบห้องเสียง | LynnBot",
  description: "จัดการระบบห้องเสียงไดนามิก ขยายและยุบห้องอัตโนมัติ และดาวน์โหลดประวัติการใช้งาน",
};

export default async function VoicePage() {
  const summary = await getVoiceSummary();

  return (
    <>
      <Header
        title="ระบบห้องเสียง (Voice System)"
        subtitle="จัดการระบบห้องเสียงไดนามิก ขยายและยุบห้องอัตโนมัติ และส่งออก Log การใช้งาน"
      />

      <div className="page-content">
        {/* Top Summary Bar & Export Action */}
        <div
          className="card mb-24"
          style={{
            background: "rgba(255, 255, 255, 0.02)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-lg)",
            padding: "16px 24px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "20px",
            }}
          >
            {/* Quick Stats */}
            <div style={{ display: "flex", alignItems: "center", gap: "32px", flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>
                  เวลารวม Voice ทั้งหมด
                </div>
                <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)" }}>
                  {formatVoiceDuration(summary.totalSeconds)}
                </div>
              </div>

              <div style={{ width: "1px", height: "30px", background: "var(--border-subtle)" }} />

              <div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>
                  จำนวน Sessions
                </div>
                <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)" }}>
                  {summary.totalSessions.toLocaleString()} ครั้ง
                </div>
              </div>

              <div style={{ width: "1px", height: "30px", background: "var(--border-subtle)" }} />

              <div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>
                  ผู้ใช้ที่เคยเข้าใช้งาน
                </div>
                <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)" }}>
                  {summary.uniqueUserCount.toLocaleString()} คน
                </div>
              </div>
            </div>

            {/* CSV Log Download Button */}
            <div>
              <a
                href="/api/export/voice"
                download
                className="btn btn-secondary"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "9px 18px",
                  fontSize: "13px",
                  fontWeight: 600,
                  borderRadius: "var(--radius-md)",
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                ดาวน์โหลด Log ห้องเสียง (CSV)
              </a>
            </div>
          </div>
        </div>

        {/* Dynamic Voice Pools Manager */}
        <DynamicVoiceManager />
      </div>
    </>
  );
}
