import { prisma } from "@lynnbot/database";
import { getDiscordAvatarUrl } from "@/lib/utils";

export const metadata = {
  title: "ทำเนียบทีมงาน • LynnBot",
  description: "รายชื่อผู้ดูแลและทีมงานเซิร์ฟเวอร์",
};

export const dynamic = "force-dynamic";

export default async function PublicStaffPage() {
  const staff = await prisma.user.findMany({
    where: {
      isActive: true,
      role: { in: ["OWNER", "MANAGER", "ADMIN", "MODERATOR"] },
    },
    include: {
      attendances: {
        where: { clockOut: null },
      },
    },
    orderBy: { role: "asc" },
  });

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "48px 20px 80px" }}>
      <div style={{ textAlign: "center", marginBottom: "48px" }}>
        <div
          style={{
            fontSize: "12px",
            fontWeight: 700,
            color: "#2997ff",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            marginBottom: "8px",
          }}
        >
          COMMUNITY LEADERSHIP
        </div>
        <h1
          style={{
            fontSize: "clamp(28px, 4vw, 40px)",
            fontWeight: 800,
            color: "#ffffff",
            letterSpacing: "-0.03em",
            margin: "0 0 12px",
          }}
        >
          ทำเนียบผู้ดูแล & ทีมงานเซิร์ฟเวอร์
        </h1>
        <p style={{ fontSize: "15px", color: "var(--text-secondary)", maxWidth: "600px", margin: "0 auto" }}>
          สมาชิกสามารถติดต่อทีมงานเพื่อขอความช่วยเหลือ แจ้งปัญหา หรือสอบถามข้อมูลเพิ่มเติมผ่านระบบทิกเก็ตใน Discord
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "20px",
        }}
      >
        {staff.map((s) => {
          const isOnDuty = s.attendances.length > 0;
          return (
            <div
              key={s.id}
              style={{
                padding: "20px",
                borderRadius: "18px",
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                display: "flex",
                alignItems: "center",
                gap: "16px",
              }}
            >
              <div style={{ position: "relative" }}>
                <img
                  src={getDiscordAvatarUrl(s.discordId, s.avatar)}
                  alt={s.displayName || s.username}
                  style={{ width: "54px", height: "54px", borderRadius: "50%" }}
                />
                <span
                  style={{
                    position: "absolute",
                    bottom: 0,
                    right: 0,
                    width: "14px",
                    height: "14px",
                    borderRadius: "50%",
                    background: isOnDuty ? "#30d158" : "rgba(255, 255, 255, 0.2)",
                    border: "2px solid #000000",
                  }}
                />
              </div>

              <div>
                <div style={{ fontSize: "16px", fontWeight: 700, color: "#ffffff" }}>
                  {s.displayName || s.username}
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>
                  @{s.username}
                </div>
                <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                  <span
                    style={{
                      fontSize: "10.5px",
                      fontWeight: 600,
                      padding: "2px 8px",
                      borderRadius: "6px",
                      background: "rgba(41, 151, 255, 0.15)",
                      color: "#2997ff",
                    }}
                  >
                    {s.role}
                  </span>
                  <span
                    style={{
                      fontSize: "11px",
                      color: isOnDuty ? "#30d158" : "var(--text-muted)",
                    }}
                  >
                    {isOnDuty ? "🟢 ปฏิบัติหน้าที่อยู่" : "⚪ ออฟไลน์"}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
