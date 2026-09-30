import Header from "@/components/Header";
import LeaveManager from "@/components/LeaveManager";

export const metadata = {
  title: "ระบบลาหยุด | LynnBot",
  description: "ส่งคำขอลาหยุด ตรวจสอบ และอนุมัติคำขอลาของทีมงาน",
};

export default function LeavesPage() {
  return (
    <>
      <Header
        title="ระบบลาหยุด"
        subtitle="ส่งคำขอลา, ตรวจสอบ, อนุมัติ/ปฏิเสธคำขอลาของทีมงาน"
      />
      <div className="page-content">
        <LeaveManager />
      </div>
    </>
  );
}
