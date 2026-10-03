import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import StaffNotesManager from "@/components/StaffNotesManager";

export const metadata = {
  title: "บันทึกภายใน & SOP • LynnBot",
  description: "ศูนย์รวมเอกสาร SOP ขั้นตอนการปฏิบัติงาน และบันทึกช่วยจำสำหรับทีมงาน",
};

export default async function NotesPage() {
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
          INTERNAL KNOWLEDGE BASE
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
          บันทึกภายในทีมงาน & SOP Wiki
        </h1>
        <p style={{ fontSize: "14px", color: "var(--text-secondary)", margin: 0 }}>
          รวบรวมระเบียบปฏิบัติ คำแนะนำการแก้ปัญหา และคู่มือประจำตำแหน่ง เพื่อมาตรฐานการดูแลเซิร์ฟเวอร์
        </p>
      </div>

      <StaffNotesManager />
    </div>
  );
}
