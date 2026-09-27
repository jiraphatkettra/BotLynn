import Header from "@/components/Header";
import TicketManager from "@/components/TicketManager";

export const metadata = {
  title: "ระบบทิกเก็ตช่วยเหลือ | LynnBot",
  description: "จัดการคำร้องเรียนและช่วยเหลือสมาชิกดิสคอร์ด",
};

export default function TicketsPage() {
  return (
    <>
      <Header
        title="ระบบทิกเก็ตช่วยเหลือ"
        subtitle="ตรวจดูคำขอเปิดห้องช่วยเหลือ สนทนากับสมาชิก และดูประวัติ Transcript ย้อนหลัง"
      />
      <div className="page-content">
        <TicketManager />
      </div>
    </>
  );
}
