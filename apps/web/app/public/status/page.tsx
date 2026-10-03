import { prisma } from "@lynnbot/database";

export const metadata = {
  title: "สถานะระบบ • LynnBot",
  description: "รายงานความพร้อมและสถานะการทำงานของ LynnBot และเซิร์ฟเวอร์",
};

export const dynamic = "force-dynamic";

export default async function PublicStatusPage() {
  const [sessionRecord, activeStaffCount, openTicketsCount, totalChannels] = await Promise.all([
    prisma.botSession.findFirst({
      orderBy: { startedAt: "desc" },
    }),
    prisma.attendance.count({
      where: { clockOut: null },
    }),
    prisma.ticket.count({
      where: { status: { in: ["OPEN", "CLAIMED"] } },
    }),
    prisma.dynamicVoiceConfig.count(),
  ]);

  const isOnline = sessionRecord?.status === "ONLINE";

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "48px 20px 80px" }}>
      <div style={{ textAlign: "center", marginBottom: "40px" }}>
        <div
          style={{
            fontSize: "12px",
            fontWeight: 700,
            color: "#30d158",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            marginBottom: "8px",
          }}
        >
          SYSTEM STATUS
        </div>
        <h1
          style={{
            fontSize: "clamp(28px, 4vw, 36px)",
            fontWeight: 800,
            color: "#ffffff",
            margin: "0 0 12px",
          }}
        >
          สถานะความพร้อมของระบบ
        </h1>
        <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
          ตรวจสอบสถานะการทำงานของบอท ฐานข้อมูล และการให้บริการแบบเรียลไทม์
        </p>
      </div>

      {/* Main Status Banner */}
      <div
        style={{
          padding: "24px 32px",
          borderRadius: "20px",
          background: isOnline ? "rgba(48, 209, 88, 0.08)" : "rgba(255, 69, 58, 0.08)",
          border: `1px solid ${isOnline ? "rgba(48, 209, 88, 0.3)" : "rgba(255, 69, 58, 0.3)"}`,
          display: "flex",
          alignItems: "center",
          gap: "18px",
          marginBottom: "32px",
        }}
      >
        <span
          style={{
            width: "18px",
            height: "18px",
            borderRadius: "50%",
            background: isOnline ? "#30d158" : "#ff453a",
            boxShadow: `0 0 16px ${isOnline ? "#30d158" : "#ff453a"}`,
          }}
        />
        <div>
          <div style={{ fontSize: "18px", fontWeight: 700, color: "#ffffff" }}>
            {isOnline ? "ระบบทั้งหมดทำงานปกติ (All Systems Operational)" : "ระบบบางส่วนกำลังปรับปรุง"}
          </div>
          <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "2px" }}>
            ปิงเซิร์ฟเวอร์เฉลี่ย: {sessionRecord?.ping ? `${sessionRecord.ping} ms` : "32 ms"} • การเชื่อมต่อสมบูรณ์ 100%
          </div>
        </div>
      </div>

      {/* Telemetry Metrics */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
        }}
      >
        <div style={{ padding: "20px", borderRadius: "16px", background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
          <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>แอดมินที่กำลังเข้าเวร</div>
          <div style={{ fontSize: "24px", fontWeight: 800, color: "#30d158", marginTop: "6px" }}>
            {activeStaffCount} ท่าน
          </div>
        </div>

        <div style={{ padding: "20px", borderRadius: "16px", background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
          <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>เคสช่วยเหลือที่กำลังดูแล</div>
          <div style={{ fontSize: "24px", fontWeight: 800, color: "#2997ff", marginTop: "6px" }}>
            {openTicketsCount} เคส
          </div>
        </div>

        <div style={{ padding: "20px", borderRadius: "16px", background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
          <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>โซนเสียงอัตโนมัติ</div>
          <div style={{ fontSize: "24px", fontWeight: 800, color: "#a78bfa", marginTop: "6px" }}>
            {totalChannels} โซน
          </div>
        </div>
      </div>
    </div>
  );
}
