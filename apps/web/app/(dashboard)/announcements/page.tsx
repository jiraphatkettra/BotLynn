import Header from "@/components/Header";
import AnnouncementStudio from "@/components/AnnouncementStudio";

export const metadata = {
  title: "สตูดิโอประกาศ Discord | LynnBot",
  description: "สร้างและส่งประกาศ Rich Embed ลงห้อง Discord แบบ Real-time",
};

export default function AnnouncementsPage() {
  return (
    <>
      <Header
        title="สตูดิโอประกาศ & บรอดแคสต์"
        subtitle="สร้างข้อความ Rich Embed ตกแต่งรูปภาพและสีขอบ พร้อมส่งตรงลงห้อง Discord ได้ทันที"
      />
      <div className="page-content">
        <AnnouncementStudio />
      </div>
    </>
  );
}
