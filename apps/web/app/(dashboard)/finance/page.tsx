import Header from "@/components/Header";
import FinanceManager from "@/components/FinanceManager";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "บัญชีรายรับ-รายจ่าย | LynnBot",
  description: "ระบบบันทึกรายรับ-รายจ่ายแมนนวล สรุปงบประมาณ และกำไรขาดทุนของเซิร์ฟเวอร์",
};

export default function FinancePage() {
  return (
    <>
      <Header
        title="บัญชีรายรับ-รายจ่าย (Cashflow & Accounting)"
        subtitle="ระบบบันทึกและจัดการรายรับ รายจ่าย งบประมาณ และสรุปผลกำไรสุทธิของเซิร์ฟเวอร์"
      />

      <div className="page-content">
        <FinanceManager />
      </div>
    </>
  );
}
