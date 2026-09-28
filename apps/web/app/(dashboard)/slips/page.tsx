import Header from "@/components/Header";
import SlipManager from "@/components/SlipManager";

export const metadata = {
  title: "จัดการสลิปโอนเงิน — LynnBot",
  description: "ระบบตรวจสอบ อนุมัติ และจัดเก็บรูปภาพสลิปโอนเงิน",
};

export default function SlipsPage() {
  return (
    <>
      <Header
        title="จัดการสลิปโอนเงิน"
        subtitle="ตรวจสอบสลิปการโอนเงิน ตรวจทานหลักฐาน อนุมัติยอดเงินเข้ากระเป๋า และจัดเก็บประวัติสลิป"
      />
      <div className="page-content">
        <SlipManager />
      </div>
    </>
  );
}
