import { prisma } from "@lynnbot/database";
import { formatCurrency } from "@/lib/utils";

export const metadata = {
  title: "ร้านค้ายศสาธารณะ • LynnBot",
  description: "รายการยศและสิทธิพิเศษที่เปิดจำหน่ายในเซิร์ฟเวอร์ดิสคอร์ด",
};

export const dynamic = "force-dynamic";

export default async function PublicShopPage() {
  const roles = await prisma.shopRole.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "48px 20px 80px" }}>
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
          DISCORD STORE
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
          ร้านค้ายศ & สิทธิพิเศษเซิร์ฟเวอร์
        </h1>
        <p style={{ fontSize: "15px", color: "var(--text-secondary)", maxWidth: "600px", margin: "0 auto" }}>
          สนับสนุนเซิร์ฟเวอร์พร้อมรับยศพิเศษ สิทธิ์เข้าห้อง VIP และฟังก์ชันเสริมมากมาย สั่งซื้อได้ผ่าน Discord Bot ได้ทันทีตลอด 24 ชั่วโมง
        </p>
      </div>

      {/* Roles Bento Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "24px",
          marginBottom: "48px",
        }}
      >
        {roles.map((role) => (
          <div
            key={role.id}
            style={{
              padding: "28px",
              borderRadius: "20px",
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              boxShadow: "0 12px 30px rgba(0, 0, 0, 0.5)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                <span style={{ fontSize: "24px" }}>{role.icon || "🏷️"}</span>
                <h3 style={{ fontSize: "20px", fontWeight: 700, color: "#ffffff", margin: 0 }}>
                  {role.name}
                </h3>
              </div>

              <p style={{ fontSize: "13.5px", color: "rgba(255, 255, 255, 0.7)", lineHeight: 1.6, marginBottom: "20px" }}>
                {role.description || "สิทธิพิเศษและสีชื่อเฉพาะสำหรับผู้สนับสนุนเซิร์ฟเวอร์"}
              </p>
            </div>

            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: "6px",
                  paddingTop: "16px",
                  borderTop: "1px solid rgba(255, 255, 255, 0.06)",
                  marginBottom: "16px",
                }}
              >
                <span style={{ fontSize: "28px", fontWeight: 800, color: "#2997ff" }}>
                  ฿{formatCurrency(role.price)}
                </span>
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                  / ถาวร
                </span>
                {role.stock !== null && (
                  <span style={{ fontSize: "11px", color: "#ff9f0a", marginLeft: "auto" }}>
                    เหลือ {role.stock} สิทธิ์
                  </span>
                )}
              </div>

              <div
                style={{
                  padding: "10px",
                  borderRadius: "10px",
                  background: "rgba(41, 151, 255, 0.1)",
                  border: "1px solid rgba(41, 151, 255, 0.25)",
                  textAlign: "center",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#2997ff",
                }}
              >
                พิมพ์คำสั่ง <code>/buy</code> หรือกดปุ่มใน Discord
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
