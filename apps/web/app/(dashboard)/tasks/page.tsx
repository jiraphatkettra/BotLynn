import { Metadata } from "next";
import TaskBoard from "@/components/TaskBoard";

export const metadata: Metadata = {
  title: "ระบบมอบหมายงาน (Tasks) | LynnBot Operations",
  description: "จัดการและติดตามความคืบหน้าของงานทีมงาน LynnBot",
};

export default function TasksPage() {
  return (
    <div style={{ padding: "1.5rem", maxWidth: "1400px", margin: "0 auto" }}>
      <TaskBoard />
    </div>
  );
}
