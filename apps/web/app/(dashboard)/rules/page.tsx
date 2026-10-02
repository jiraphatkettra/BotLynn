import Header from "@/components/Header";
import StaffRulesViewer from "@/components/StaffRulesViewer";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "กฎทีมงานและระเบียบปฏิบัติ | LynnBot",
  description: "คู่มือระเบียบปฏิบัติ จริยธรรม และมาตรฐานการทำงานของทีมงาน 753 BC DISCORD SERVER",
};

export default function RulesPage() {
  return (
    <>
      <Header
        title="กฎทีมงานและระเบียบปฏิบัติ"
        subtitle="753 BC DISCORD SERVER • ฉบับที่ 1.0 (มีผลบังคับใช้วันที่ 2 ตุลาคม 2569)"
      />

      <div className="page-content">
        <StaffRulesViewer />
      </div>
    </>
  );
}
