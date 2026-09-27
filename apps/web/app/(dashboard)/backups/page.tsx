import Header from "@/components/Header";
import BackupManager from "@/components/BackupManager";

export const metadata = {
  title: "ระบบสำรองและกู้คืนยศ | LynnBot",
  description: "สำรองและกู้คืนโครงสร้างยศและสมาชิกดิสคอร์ดอัตโนมัติ",
};

export default function BackupsPage() {
  return (
    <>
      <Header
        title="ระบบสำรองและกู้คืนยศ"
        subtitle="บันทึก Snapshot ยศและสิทธิ์ในดิสคอร์ด ป้องกันการโดน Raid หรือเผลอลบยศ กู้คืนได้ทันที"
      />
      <div className="page-content">
        <BackupManager />
      </div>
    </>
  );
}
