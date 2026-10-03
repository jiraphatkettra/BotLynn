import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import ReportGenerator from "@/components/ReportGenerator";

export const metadata = {
  title: "รายงาน & สรุปผลงาน • LynnBot",
  description: "สรุปรายงานรายเดือน การเงิน ชั่วโมงทำงาน และการส่งออกข้อมูล",
};

export default async function ReportsPage() {
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
            color: "#2997ff",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            marginBottom: "6px",
          }}
        >
          MONTHLY ANALYTICS & EXPORT
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
          รายงานสรุปผลงาน & ส่งออกข้อมูล
        </h1>
        <p style={{ fontSize: "14px", color: "var(--text-secondary)", margin: 0 }}>
          ตรวจสอบสรุปยอดรวมชั่วโมงงาน รายรับยศ และประสิทธิภาพการดูแลสมาชิก พร้อมดาวน์โหลดเป็นไฟล์ CSV สำหรับ Excel
        </p>
      </div>

      <ReportGenerator />
    </div>
  );
}
