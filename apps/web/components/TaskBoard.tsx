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

const PRIORITY_CONFIG = {
  LOW: { label: "ต่ำ", color: "var(--text-muted)", bg: "rgba(255,255,255,0.06)", border: "rgba(255,255,255,0.1)" },
  MEDIUM: { label: "ปานกลาง", color: "var(--accent-blue)", bg: "rgba(0,113,227,0.12)", border: "rgba(0,113,227,0.25)" },
  HIGH: { label: "สูง", color: "var(--accent-warning)", bg: "rgba(255,159,10,0.12)", border: "rgba(255,159,10,0.25)" },
  URGENT: { label: "เร่งด่วน", color: "var(--accent-danger)", bg: "rgba(255,69,58,0.15)", border: "rgba(255,69,58,0.3)" },
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
              <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                👤 {task.assignee.username}
              </span>
            ) : (
              <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>
                ⚪ ยังไม่มอบหมาย
              </span>
            )}
          </div>
          {task.dueDate && (
            <div style={{ color: isOverdue ? "var(--accent-danger)" : "var(--text-muted)" }}>
              {isOverdue ? "⚠️ เลยกำหนด " : "📅 "}
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
          <div style={{ display: "flex", gap: "0.3rem" }}>
            {task.status !== "TODO" && (
              <button
                onClick={() => handleUpdateStatus(task.id, "TODO")}
                title="ย้ายไป รอดำเนินการ"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid var(--border-subtle)",
                  color: "var(--text-secondary)",
                  borderRadius: "var(--radius-sm)",
                  padding: "0.25rem 0.5rem",
                  fontSize: "0.75rem",
                  cursor: "pointer",
                }}
              >
                ◀ รอดำเนินการ
              </button>
            )}
            {task.status !== "IN_PROGRESS" && (
              <button
                onClick={() => handleUpdateStatus(task.id, "IN_PROGRESS")}
                title="ย้ายไป กำลังทำ"
                style={{
                  background: "rgba(0,113,227,0.15)",
                  border: "1px solid rgba(0,113,227,0.3)",
                  color: "var(--accent-blue)",
                  borderRadius: "var(--radius-sm)",
                  padding: "0.25rem 0.5rem",
                  fontSize: "0.75rem",
                  cursor: "pointer",
                }}
              >
                ⚡ กำลังทำ
              </button>
            )}
            {task.status !== "DONE" && (
              <button
                onClick={() => handleUpdateStatus(task.id, "DONE")}
                title="ย้ายไป เสร็จสิ้น"
                style={{
                  background: "rgba(48,209,88,0.15)",
                  border: "1px solid rgba(48,209,88,0.3)",
                  color: "var(--accent-success)",
                  borderRadius: "var(--radius-sm)",
                  padding: "0.25rem 0.5rem",
                  fontSize: "0.75rem",
                  cursor: "pointer",
                }}
              >
                ✓ เสร็จสิ้น
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
              padding: "0.2rem",
              fontSize: "0.8rem",
            }}
          >
            🗑️
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
          <h2 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)" }}>
            📋 กระดานติดตามงาน (Task Kanban)
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
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-primary)",
              padding: "0.5rem 0.75rem",
              borderRadius: "var(--radius-md)",
              fontSize: "0.85rem",
            }}
          >
            <option value="ALL">ทุกระดับความสำคัญ</option>
            <option value="LOW">🟢 ต่ำ</option>
            <option value="MEDIUM">🔵 ปานกลาง</option>
            <option value="HIGH">🟠 สูง</option>
            <option value="URGENT">🔴 เร่งด่วน</option>
          </select>

          {/* Filter Assignee */}
          <select
            value={filterAssignee}
            onChange={(e) => setFilterAssignee(e.target.value)}
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-primary)",
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
            style={{
              background: "var(--accent-blue)",
              border: "none",
              color: "#fff",
              padding: "0.5rem 1rem",
              borderRadius: "var(--radius-md)",
              fontWeight: 600,
              fontSize: "0.875rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
            }}
          >
            <span>➕</span> เพิ่มงานใหม่
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
              background: "rgba(255,255,255,0.02)",
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
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontSize: "1rem" }}>⚪</span>
                <span style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--text-primary)" }}>
                  รอดำเนินการ (To-Do)
                </span>
              </div>
              <span
                style={{
                  background: "rgba(255,255,255,0.08)",
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
                  <div className="empty-state-icon" style={{ fontSize: "24px" }}>📋</div>
                  <p className="empty-state-title" style={{ fontSize: "13px" }}>ไม่มีงานรอดำเนินการ</p>
                  <p className="empty-state-text" style={{ fontSize: "11px" }}>กดปุ่มสร้างงานใหม่เพื่อเพิ่มงาน</p>
                </div>
              )}
            </div>
          </div>

          {/* Column 2: IN PROGRESS */}
          <div
            style={{
              background: "rgba(0,113,227,0.02)",
              border: "1px solid rgba(0,113,227,0.15)",
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
                borderBottom: "1px solid rgba(0,113,227,0.15)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontSize: "1rem" }}>🟡</span>
                <span style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--accent-blue)" }}>
                  กำลังดำเนินการ (In Progress)
                </span>
              </div>
              <span
                style={{
                  background: "rgba(0,113,227,0.15)",
                  padding: "0.15rem 0.5rem",
                  borderRadius: "var(--radius-full)",
                  fontSize: "0.75rem",
                  color: "var(--accent-blue)",
                }}
              >
                {inProgressTasks.length}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {inProgressTasks.map(renderTaskCard)}
              {inProgressTasks.length === 0 && (
                <div className="empty-state" style={{ padding: "2rem 1rem" }}>
                  <div className="empty-state-icon" style={{ fontSize: "24px" }}>⚡</div>
                  <p className="empty-state-title" style={{ fontSize: "13px" }}>ไม่มีงานกำลังทำ</p>
                  <p className="empty-state-text" style={{ fontSize: "11px" }}>ย้ายงานจากรอดำเนินการมาที่นี่</p>
                </div>
              )}
            </div>
          </div>

          {/* Column 3: DONE */}
          <div
            style={{
              background: "rgba(48,209,88,0.02)",
              border: "1px solid rgba(48,209,88,0.15)",
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
                borderBottom: "1px solid rgba(48,209,88,0.15)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontSize: "1rem" }}>✅</span>
                <span style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--accent-success)" }}>
                  เสร็จสิ้น (Done)
                </span>
              </div>
              <span
                style={{
                  background: "rgba(48,209,88,0.15)",
                  padding: "0.15rem 0.5rem",
                  borderRadius: "var(--radius-full)",
                  fontSize: "0.75rem",
                  color: "var(--accent-success)",
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
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-xl)",
              width: "100%",
              maxWidth: "500px",
              padding: "1.75rem",
              display: "flex",
              flexDirection: "column",
              gap: "1.25rem",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "var(--text-primary)" }}>
                ➕ เพิ่มงานใหม่
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
                  style={{
                    width: "100%",
                    padding: "0.6rem 0.8rem",
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-md)",
                    color: "var(--text-primary)",
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
                  style={{
                    width: "100%",
                    padding: "0.6rem 0.8rem",
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-md)",
                    color: "var(--text-primary)",
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
                    style={{
                      width: "100%",
                      padding: "0.6rem 0.8rem",
                      background: "var(--bg-card)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "var(--radius-md)",
                      color: "var(--text-primary)",
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
                    style={{
                      width: "100%",
                      padding: "0.6rem 0.8rem",
                      background: "var(--bg-card)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "var(--radius-md)",
                      color: "var(--text-primary)",
                      fontSize: "0.85rem",
                    }}
                  >
                    <option value="LOW">🟢 ต่ำ</option>
                    <option value="MEDIUM">🔵 ปานกลาง</option>
                    <option value="HIGH">🟠 สูง</option>
                    <option value="URGENT">🔴 เร่งด่วน</option>
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
                  style={{
                    width: "100%",
                    padding: "0.6rem 0.8rem",
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-md)",
                    color: "var(--text-primary)",
                    fontSize: "0.85rem",
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    background: "transparent",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-secondary)",
                    padding: "0.6rem 1rem",
                    borderRadius: "var(--radius-md)",
                    cursor: "pointer",
                    fontSize: "0.85rem",
                  }}
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    background: "var(--accent-blue)",
                    border: "none",
                    color: "#fff",
                    padding: "0.6rem 1.25rem",
                    borderRadius: "var(--radius-md)",
                    fontWeight: 600,
                    cursor: saving ? "not-allowed" : "pointer",
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
