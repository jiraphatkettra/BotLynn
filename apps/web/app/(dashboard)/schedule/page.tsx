import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import ShiftCalendar from "@/components/ShiftCalendar";

export const metadata = {
  title: "ตารางเวรทีมงาน • LynnBot",
  description: "ระบบจัดตารางเวรและกะการทำงานของทีมงานแอดมิน",
};

export default async function SchedulePage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="page-content" style={{ padding: "32px 20px 80px" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto 24px" }}>
        <div
          style={{
            fontSize: "11px",
            fontWeight: 700,
            color: "#2997ff",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            marginBottom: "6px",
          }}
        >
          STAFF SCHEDULING
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
          ปฏิทินตารางเวร & จัดการกะทำงาน
        </h1>
        <p style={{ fontSize: "14px", color: "var(--text-secondary)", margin: 0 }}>
          วางแผนและมอบหมายกะการปฏิบัติหน้าที่ของทีมงานแอดมิน เพื่อความต่อเนื่องในการดูแลเซิร์ฟเวอร์
        </p>
      </div>

      <ShiftCalendar />
    </div>
  );
}
