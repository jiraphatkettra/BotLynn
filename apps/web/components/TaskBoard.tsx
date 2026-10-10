"use client";

import { useState, useEffect } from "react";

interface TaskItem {
  id: string;
  title: string;
  description: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status: "TODO" | "IN_PROGRESS" | "DONE" | "CANCELLED";
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  assignee: {
    id: string;
    username: string;
    discordId: string;
    avatar: string | null;
  } | null;
  assignedBy: {
    id: string;
    username: string;
    discordId: string;
    avatar: string | null;
  };
}

interface StaffMember {
  id: string;
  username: string;
  discordId: string;
  role: string;
  avatar: string | null;
}

const Icons = {
  Kanban: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle" }}>
      <rect width="18" height="18" x="3" y="3" rx="2"/>
      <path d="M8 7v7M12 7v4M16 7v9"/>
    </svg>
  ),
  User: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle" }}>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  Calendar: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle" }}>
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
      <line x1="16" x2="16" y1="2" y2="6"/>
      <line x1="8" x2="8" y1="2" y2="6"/>
      <line x1="3" x2="21" y1="10" y2="10"/>
    </svg>
  ),
  AlertTriangle: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle" }}>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
      <line x1="12" x2="12" y1="9" y2="13"/>
      <line x1="12" x2="12.01" y1="17" y2="17"/>
    </svg>
  ),
  Clock: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle" }}>
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  Zap: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle" }}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  ),
  Check: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle" }}>
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  CheckCircle: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle" }}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  ),
  Trash: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle" }}>
      <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
      <line x1="10" x2="10" y1="11" y2="17"/>
      <line x1="14" x2="14" y1="11" y2="17"/>
    </svg>
  ),
  Plus: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle" }}>
      <line x1="12" x2="12" y1="5" y2="19"/>
      <line x1="5" x2="19" y1="12" y2="12"/>
    </svg>
  ),
  ArrowLeft: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle" }}>
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  ),
};

const PRIORITY_CONFIG = {
  LOW: { label: "ต่ำ (Low)", color: "#16a34a", bg: "rgba(22,163,74,0.12)", border: "rgba(22,163,74,0.3)" },
  MEDIUM: { label: "ปานกลาง (Medium)", color: "#0071e3", bg: "rgba(0,113,227,0.12)", border: "rgba(0,113,227,0.3)" },
  HIGH: { label: "สูง (High)", color: "#d97706", bg: "rgba(217,119,6,0.12)", border: "rgba(217,119,6,0.3)" },
  URGENT: { label: "เร่งด่วน (Urgent)", color: "#dc2626", bg: "rgba(220,38,38,0.14)", border: "rgba(220,38,38,0.35)" },
};

export default function TaskBoard() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPriority, setFilterPriority] = useState<string>("ALL");
  const [filterAssignee, setFilterAssignee] = useState<string>("ALL");
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [priority, setPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("MEDIUM");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchTasks = async () => {
    try {
      const res = await fetch("/api/tasks");
      const data = await res.json();
      if (res.ok) {
        setTasks(data.tasks || []);
        setStaffMembers(data.staffMembers || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          assigneeId: assigneeId || null,
          priority,
          dueDate: dueDate || null,
        }),
      });

      if (res.ok) {
        setTitle("");
        setDescription("");
        setAssigneeId("");
        setPriority("MEDIUM");
        setDueDate("");
        setShowAddModal(false);
        fetchTasks();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: TaskItem["status"]) => {
    try {
      // Optimistic update
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t))
      );

      await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      fetchTasks();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการลบงานนี้?")) return;
    try {
      setTasks((prev) => prev.filter((t) => t.id !== id));
      await fetch(`/api/tasks?id=${id}`, { method: "DELETE" });
      fetchTasks();
    } catch (e) {
      console.error(e);
    }
  };

  const filteredTasks = tasks.filter((t) => {
    if (filterPriority !== "ALL" && t.priority !== filterPriority) return false;
    if (filterAssignee !== "ALL") {
      if (filterAssignee === "UNASSIGNED" && t.assignee) return false;
      if (filterAssignee !== "UNASSIGNED" && t.assignee?.id !== filterAssignee) return false;
    }
    return true;
  });

  const todoTasks = filteredTasks.filter((t) => t.status === "TODO");
  const inProgressTasks = filteredTasks.filter((t) => t.status === "IN_PROGRESS");
  const doneTasks = filteredTasks.filter((t) => t.status === "DONE");

  const renderTaskCard = (task: TaskItem) => {
    const pConf = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.MEDIUM;
    const isOverdue =
      task.dueDate &&
      task.status !== "DONE" &&
      new Date(task.dueDate).getTime() < Date.now();

    return (
      <div
        key={task.id}
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-md)",
          padding: "1rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
          boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
          transition: "transform 0.15s ease, border-color 0.15s ease",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
          <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.4 }}>
            {task.title}
          </h4>
          <span
            style={{
              padding: "0.2rem 0.5rem",
              borderRadius: "var(--radius-full)",
              fontSize: "0.75rem",
              fontWeight: 600,
              color: pConf.color,
              background: pConf.bg,
              border: `1px solid ${pConf.border}`,
              whiteSpace: "nowrap",
            }}
          >
            {pConf.label}
          </span>
        </div>

        {task.description && (
          <p
            style={{
              margin: 0,
              fontSize: "0.82rem",
              color: "var(--text-secondary)",
              lineHeight: 1.5,
              whiteSpace: "pre-line",
            }}
          >
            {task.description}
          </p>
        )}

        {/* Due date & Assignee Info */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: "0.5rem",
            borderTop: "1px solid var(--border-subtle)",
            fontSize: "0.78rem",
            color: "var(--text-muted)",
          }}
        >
          <div>
            {task.assignee ? (
              <span style={{ color: "var(--text-primary)", fontWeight: 500, display: "inline-flex", alignItems: "center", gap: "4px" }}>
                <Icons.User /> {task.assignee.username}
              </span>
            ) : (
              <span style={{ color: "var(--text-muted)", fontStyle: "italic", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                <Icons.Clock /> ยังไม่มอบหมาย
              </span>
            )}
          </div>
          {task.dueDate && (
            <div style={{ color: isOverdue ? "var(--danger)" : "var(--text-muted)", display: "inline-flex", alignItems: "center", gap: "4px", fontWeight: isOverdue ? 600 : 400 }}>
              {isOverdue ? <Icons.AlertTriangle /> : <Icons.Calendar />}
              {isOverdue && "เลยกำหนด "}
              {new Date(task.dueDate).toLocaleDateString("th-TH", {
                day: "numeric",
                month: "short",
              })}
            </div>
          )}
        </div>

        {/* Action Buttons to Move Status */}
        <div
          style={{
            display: "flex",
            gap: "0.4rem",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "0.25rem",
          }}
        >
          <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
            {task.status !== "TODO" && (
              <button
                onClick={() => handleUpdateStatus(task.id, "TODO")}
                title="ย้ายไป รอดำเนินการ"
                className="btn btn-secondary btn-sm"
                style={{
                  padding: "0.25rem 0.5rem",
                  fontSize: "0.75rem",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <Icons.ArrowLeft /> รอดำเนินการ
              </button>
            )}
            {task.status !== "IN_PROGRESS" && (
              <button
                onClick={() => handleUpdateStatus(task.id, "IN_PROGRESS")}
                title="ย้ายไป กำลังทำ"
                style={{
                  background: "rgba(0,113,227,0.12)",
                  border: "1px solid rgba(0,113,227,0.3)",
                  color: "#0071e3",
                  borderRadius: "var(--radius-sm)",
                  padding: "0.25rem 0.5rem",
                  fontSize: "0.75rem",
                  cursor: "pointer",
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <Icons.Zap /> กำลังทำ
              </button>
            )}
            {task.status !== "DONE" && (
              <button
                onClick={() => handleUpdateStatus(task.id, "DONE")}
                title="ย้ายไป เสร็จสิ้น"
                style={{
                  background: "rgba(22,163,74,0.12)",
                  border: "1px solid rgba(22,163,74,0.3)",
                  color: "#16a34a",
                  borderRadius: "var(--radius-sm)",
                  padding: "0.25rem 0.5rem",
                  fontSize: "0.75rem",
                  cursor: "pointer",
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <Icons.Check /> เสร็จสิ้น
              </button>
            )}
          </div>
          <button
            onClick={() => handleDeleteTask(task.id)}
            title="ลบงาน"
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              padding: "0.25rem",
              borderRadius: "4px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icons.Trash />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header Controls */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
            <Icons.Kanban /> กระดานติดตามงาน (Task Kanban)
          </h2>
          <p style={{ margin: "0.25rem 0 0", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
            มอบหมายและจัดการสถานะงานของทีมงาน LynnBot
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
          {/* Filter Priority */}
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="form-select"
            style={{
              padding: "0.5rem 0.75rem",
              borderRadius: "var(--radius-md)",
              fontSize: "0.85rem",
            }}
          >
            <option value="ALL">ทุกระดับความสำคัญ</option>
            <option value="LOW">ต่ำ (Low)</option>
            <option value="MEDIUM">ปานกลาง (Medium)</option>
            <option value="HIGH">สูง (High)</option>
            <option value="URGENT">เร่งด่วน (Urgent)</option>
          </select>

          {/* Filter Assignee */}
          <select
            value={filterAssignee}
            onChange={(e) => setFilterAssignee(e.target.value)}
            className="form-select"
            style={{
              padding: "0.5rem 0.75rem",
              borderRadius: "var(--radius-md)",
              fontSize: "0.85rem",
            }}
          >
            <option value="ALL">ทุกคน</option>
            <option value="UNASSIGNED">ยังไม่มอบหมาย</option>
            {staffMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.username}
              </option>
            ))}
          </select>

          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary"
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "var(--radius-md)",
              fontWeight: 600,
              fontSize: "0.875rem",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <Icons.Plus /> เพิ่มงานใหม่
          </button>
        </div>
      </div>

      {/* Kanban Board Columns */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-secondary)" }}>
          กำลังโหลดข้อมูลงาน...
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "1.25rem",
            alignItems: "start",
          }}
        >
          {/* Column 1: TODO */}
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-lg)",
              padding: "1rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
              minHeight: "450px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingBottom: "0.75rem",
                borderBottom: "1px solid var(--border-subtle)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-muted)" }}>
                <Icons.Clock />
                <span style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--text-primary)" }}>
                  รอดำเนินการ (To-Do)
                </span>
              </div>
              <span
                style={{
                  background: "var(--bg-tertiary)",
                  padding: "0.15rem 0.5rem",
                  borderRadius: "var(--radius-full)",
                  fontSize: "0.75rem",
                  color: "var(--text-muted)",
                }}
              >
                {todoTasks.length}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {todoTasks.map(renderTaskCard)}
              {todoTasks.length === 0 && (
                <div className="empty-state" style={{ padding: "2rem 1rem" }}>
                  <div className="empty-state-icon" style={{ fontSize: "20px", color: "var(--text-muted)" }}><Icons.Clock /></div>
                  <p className="empty-state-title" style={{ fontSize: "13px" }}>ไม่มีงานรอดำเนินการ</p>
                  <p className="empty-state-text" style={{ fontSize: "11px" }}>กดปุ่มสร้างงานใหม่เพื่อเพิ่มงาน</p>
                </div>
              )}
            </div>
          </div>

          {/* Column 2: IN PROGRESS */}
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-lg)",
              padding: "1rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
              minHeight: "450px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingBottom: "0.75rem",
                borderBottom: "1px solid var(--border-subtle)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#0071e3" }}>
                <Icons.Zap />
                <span style={{ fontWeight: 600, fontSize: "0.95rem", color: "#0071e3" }}>
                  กำลังดำเนินการ (In Progress)
                </span>
              </div>
              <span
                style={{
                  background: "rgba(0,113,227,0.12)",
                  padding: "0.15rem 0.5rem",
                  borderRadius: "var(--radius-full)",
                  fontSize: "0.75rem",
                  color: "#0071e3",
                  fontWeight: 600,
                }}
              >
                {inProgressTasks.length}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {inProgressTasks.map(renderTaskCard)}
              {inProgressTasks.length === 0 && (
                <div className="empty-state" style={{ padding: "2rem 1rem" }}>
                  <div className="empty-state-icon" style={{ fontSize: "20px", color: "#0071e3" }}><Icons.Zap /></div>
                  <p className="empty-state-title" style={{ fontSize: "13px" }}>ไม่มีงานกำลังทำ</p>
                  <p className="empty-state-text" style={{ fontSize: "11px" }}>ย้ายงานจากรอดำเนินการมาที่นี่</p>
                </div>
              )}
            </div>
          </div>

          {/* Column 3: DONE */}
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-lg)",
              padding: "1rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
              minHeight: "450px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingBottom: "0.75rem",
                borderBottom: "1px solid var(--border-subtle)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#16a34a" }}>
                <Icons.CheckCircle />
                <span style={{ fontWeight: 600, fontSize: "0.95rem", color: "#16a34a" }}>
                  เสร็จสิ้น (Done)
                </span>
              </div>
              <span
                style={{
                  background: "rgba(22,163,74,0.12)",
                  padding: "0.15rem 0.5rem",
                  borderRadius: "var(--radius-full)",
                  fontSize: "0.75rem",
                  color: "#16a34a",
                  fontWeight: 600,
                }}
              >
                {doneTasks.length}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {doneTasks.map(renderTaskCard)}
              {doneTasks.length === 0 && (
                <div className="empty-state" style={{ padding: "2rem 1rem" }}>
                  <div className="empty-state-icon" style={{ fontSize: "24px" }}>✅</div>
                  <p className="empty-state-title" style={{ fontSize: "13px" }}>ยังไม่มีงานที่เสร็จสิ้น</p>
                  <p className="empty-state-text" style={{ fontSize: "11px" }}>งานที่เสร็จแล้วจะมาแสดงที่นี่</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Task Modal */}
      {showAddModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "1rem",
          }}
        >
          <div
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-xl)",
              width: "100%",
              maxWidth: "500px",
              padding: "1.75rem",
              display: "flex",
              flexDirection: "column",
              gap: "1.25rem",
              boxShadow: "var(--shadow-elevated)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "6px" }}>
                <Icons.Plus /> เพิ่มงานใหม่
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "1.2rem" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTask} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "0.3rem" }}>
                  ชื่องาน / หัวข้อ *
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ตรวจสอบความถูกต้องของสลิปประจำวัน"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="form-input"
                  style={{
                    width: "100%",
                    fontSize: "0.9rem",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "0.3rem" }}>
                  รายละเอียดงาน
                </label>
                <textarea
                  rows={3}
                  placeholder="ระบุรายละเอียดขั้นตอน หรือลิงก์ที่เกี่ยวข้อง..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="form-input"
                  style={{
                    width: "100%",
                    fontSize: "0.9rem",
                    resize: "vertical",
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "0.3rem" }}>
                    ผู้รับผิดชอบ
                  </label>
                  <select
                    value={assigneeId}
                    onChange={(e) => setAssigneeId(e.target.value)}
                    className="form-select"
                    style={{
                      width: "100%",
                      fontSize: "0.85rem",
                    }}
                  >
                    <option value="">(ยังไม่ระบุ)</option>
                    {staffMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.username}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "0.3rem" }}>
                    ระดับความสำคัญ
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="form-select"
                    style={{
                      width: "100%",
                      fontSize: "0.85rem",
                    }}
                  >
                    <option value="LOW">ต่ำ (Low)</option>
                    <option value="MEDIUM">ปานกลาง (Medium)</option>
                    <option value="HIGH">สูง (High)</option>
                    <option value="URGENT">เร่งด่วน (Urgent)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "0.3rem" }}>
                  กำหนดส่ง (Due Date)
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="form-input"
                  style={{
                    width: "100%",
                    fontSize: "0.85rem",
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn btn-secondary"
                  style={{
                    padding: "0.6rem 1rem",
                    fontSize: "0.85rem",
                  }}
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-primary"
                  style={{
                    padding: "0.6rem 1.25rem",
                    fontWeight: 600,
                    fontSize: "0.85rem",
                  }}
                >
                  {saving ? "กำลังบันทึก..." : "บันทึกงาน"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
