import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import ModerationManager from "@/components/ModerationManager";

export const metadata = {
  title: "ระบบเตือน & บันทึกลงโทษ • LynnBot",
  description: "บันทึกและจัดการประวัติการตักเตือนสมาชิก (Warnings & Moderation)",
};

export default async function ModerationPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="page-content" style={{ padding: "32px 20px 80px" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto 28px" }}>
        <div
          style={{
            fontSize: "11px",
            fontWeight: 700,
            color: "#ff453a",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            marginBottom: "6px",
          }}
        >
          SECURITY & DISCIPLINE
        </div>
        <h1
          style={{
            fontSize: "clamp(24px, 3vw, 32px)",
            fontWeight: 700,
            color: "#ffffff",
            letterSpacing: "-0.025em",
            margin: "0 0 8px",
          }}
        >
          บันทึกการตักเตือน & ควบคุมพฤติกรรม
        </h1>
        <p style={{ fontSize: "14px", color: "var(--text-secondary)", margin: 0 }}>
          ตรวจสอบประวัติการเตือน จัดการระดับความผิด และควบคุมการลงโทษสมาชิกอัตโนมัติ
        </p>
      </div>

      <ModerationManager />
    </div>
  );
}
