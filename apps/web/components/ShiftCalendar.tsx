"use client";

import React, { useState, useEffect } from "react";
import { getDiscordAvatarUrl } from "@/lib/utils";

interface StaffUser {
  id: string;
  discordId: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  role: string;
}

interface ShiftItem {
  id: string;
  userId: string;
  user: StaffUser;
  date: string;
  shiftType: string;
  startTime: string;
  endTime: string;
  note: string | null;
}

const SHIFT_TYPES: Record<string, { label: string; color: string; bg: string; defaultStart: string; defaultEnd: string }> = {
  MORNING: {
    label: "กะเช้า",
    color: "#2997ff",
    bg: "rgba(41, 151, 255, 0.15)",
    defaultStart: "09:00",
    defaultEnd: "15:00",
  },
  AFTERNOON: {
    label: "กะบ่าย",
    color: "#ff9f0a",
    bg: "rgba(255, 159, 10, 0.15)",
    defaultStart: "15:00",
    defaultEnd: "21:00",
  },
  NIGHT: {
    label: "กะดึก",
    color: "#a78bfa",
    bg: "rgba(167, 139, 250, 0.15)",
    defaultStart: "21:00",
    defaultEnd: "05:00",
  },
  FULL: {
    label: "เต็มวัน",
    color: "#30d158",
    bg: "rgba(48, 209, 88, 0.15)",
    defaultStart: "09:00",
    defaultEnd: "21:00",
  },
};

export default function ShiftCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [schedules, setSchedules] = useState<ShiftItem[]>([]);
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<ShiftItem | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    userId: "",
    date: "",
    shiftType: "MORNING",
    startTime: "09:00",
    endTime: "15:00",
    note: "",
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  const monthParam = `${year}-${String(month + 1).padStart(2, "0")}`;

  const loadSchedules = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/schedule?month=${monthParam}`);
      if (res.ok) {
        const data = await res.json();
        setSchedules(data.schedules || []);
        setStaffList(data.staffList || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchedules();
  }, [monthParam]);

  const thaiMonths = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];

  // Calendar math
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0=Sun, 1=Mon...
  // Shift to start week on Monday: 0=Mon ... 6=Sun
  const startOffset = (firstDayOfMonth + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const openAddModal = (dateStr?: string) => {
    const defaultDate = dateStr || new Date().toISOString().split("T")[0];
    setEditingShift(null);
    setFormData({
      userId: staffList[0]?.id || "",
      date: defaultDate,
      shiftType: "MORNING",
      startTime: "09:00",
      endTime: "15:00",
      note: "",
    });
    setModalOpen(true);
  };

  const openEditModal = (shift: ShiftItem) => {
    setEditingShift(shift);
    const d = new Date(shift.date).toISOString().split("T")[0];
    setFormData({
      userId: shift.userId,
      date: d,
      shiftType: shift.shiftType,
      startTime: shift.startTime,
      endTime: shift.endTime,
      note: shift.note || "",
    });
    setModalOpen(true);
  };

  const handleSaveShift = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setModalOpen(false);
        loadSchedules();
      } else {
        const err = await res.json();
        alert(err.error || "เกิดข้อผิดพลาด");
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteShift = async (id: string) => {
    if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการลบกะการทำงานนี้?")) return;
    try {
      const res = await fetch(`/api/schedule?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setModalOpen(false);
        loadSchedules();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ width: "100%", maxWidth: "1200px", margin: "0 auto" }}>
      {/* Calendar Top Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "24px",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <h2 style={{ fontSize: "24px", fontWeight: 700, color: "#ffffff", margin: 0 }}>
            {thaiMonths[month]} {year + 543}
          </h2>

          <div style={{ display: "flex", gap: "6px" }}>
            <button
              type="button"
              onClick={handlePrevMonth}
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "#ffffff",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ←
            </button>
            <button
              type="button"
              onClick={handleToday}
              style={{
                padding: "0 12px",
                height: "32px",
                borderRadius: "8px",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "#ffffff",
                fontSize: "12px",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              วันนี้
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "#ffffff",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              →
            </button>
          </div>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={() => openAddModal()}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 18px",
            borderRadius: "var(--radius-pill)",
            background: "#2997ff",
            color: "#ffffff",
            border: "none",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
            boxShadow: "0 0 20px rgba(41, 151, 255, 0.4)",
          }}
        >
          <span>+ จัดตารางเวร</span>
        </button>
      </div>

      {/* Calendar Grid Container */}
      <div
        style={{
          background: "rgba(255, 255, 255, 0.02)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "20px",
          overflow: "hidden",
          backdropFilter: "blur(20px)",
        }}
      >
        {/* Day Header Row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            background: "rgba(255, 255, 255, 0.03)",
          }}
        >
          {["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์", "อาทิตย์"].map((day, i) => (
            <div
              key={day}
              style={{
                padding: "12px 8px",
                textAlign: "center",
                fontSize: "12px",
                fontWeight: 600,
                color: i >= 5 ? "#ff9f0a" : "var(--text-secondary)",
              }}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gridAutoRows: "minmax(120px, auto)",
          }}
        >
          {/* Empty prefix cells */}
          {Array.from({ length: startOffset }).map((_, i) => (
            <div
              key={`empty-${i}`}
              style={{
                borderRight: "1px solid rgba(255, 255, 255, 0.04)",
                borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                background: "rgba(0, 0, 0, 0.2)",
              }}
            />
          ))}

          {/* Month Day Cells */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
            const isToday =
              new Date().getFullYear() === year &&
              new Date().getMonth() === month &&
              new Date().getDate() === dayNum;

            // Find shifts on this date
            const dayShifts = schedules.filter((s) => {
              const sDate = new Date(s.date);
              return (
                sDate.getFullYear() === year &&
                sDate.getMonth() === month &&
                sDate.getDate() === dayNum
              );
            });

            return (
              <div
                key={dayNum}
                onClick={() => openAddModal(dateStr)}
                style={{
                  padding: "8px",
                  borderRight: "1px solid rgba(255, 255, 255, 0.06)",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
                  background: isToday ? "rgba(41, 151, 255, 0.04)" : "transparent",
                  position: "relative",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                  transition: "background 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = isToday
                    ? "rgba(41, 151, 255, 0.08)"
                    : "rgba(255, 255, 255, 0.04)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = isToday
                    ? "rgba(41, 151, 255, 0.04)"
                    : "transparent";
                }}
              >
                {/* Date Header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "4px",
                  }}
                >
                  <span
                    style={{
                      width: "24px",
                      height: "24px",
                      borderRadius: "50%",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "12px",
                      fontWeight: isToday ? 700 : 500,
                      background: isToday ? "#2997ff" : "transparent",
                      color: isToday ? "#ffffff" : "var(--text-secondary)",
                    }}
                  >
                    {dayNum}
                  </span>
                </div>

                {/* Shifts List for this day */}
                <div style={{ display: "flex", flexDirection: "column", gap: "4px", overflowY: "auto" }}>
                  {dayShifts.map((shift) => {
                    const typeConfig = SHIFT_TYPES[shift.shiftType] || SHIFT_TYPES.MORNING;
                    return (
                      <div
                        key={shift.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(shift);
                        }}
                        style={{
                          padding: "4px 8px",
                          borderRadius: "6px",
                          background: typeConfig.bg,
                          border: `1px solid ${typeConfig.color}40`,
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          fontSize: "11px",
                          color: "#ffffff",
                          transition: "transform 0.1s ease",
                        }}
                      >
                        <img
                          src={getDiscordAvatarUrl(shift.user.discordId, shift.user.avatar)}
                          alt={shift.user.displayName || shift.user.username}
                          style={{ width: "16px", height: "16px", borderRadius: "50%" }}
                        />
                        <span style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {shift.user.displayName || shift.user.username}
                        </span>
                        <span style={{ fontSize: "10px", color: typeConfig.color, marginLeft: "auto" }}>
                          {typeConfig.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {!loading && schedules.length === 0 && (
        <div className="empty-state" style={{ marginTop: "20px" }}>
          <div className="empty-state-icon">📅</div>
          <p className="empty-state-title">ยังไม่มีตารางเวรในเดือนนี้</p>
          <p className="empty-state-text">กดปุ่ม "+ จัดตารางเวร" หรือคลิกที่ช่องวันที่เพื่อกำหนดเวรให้ทีมงาน</p>
        </div>
      )}

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(12px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: "var(--z-modal, 2000)",
            padding: "16px",
          }}
          onClick={() => setModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "460px",
              background: "rgba(18, 18, 22, 0.98)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: "20px",
              padding: "24px",
              boxShadow: "0 24px 60px rgba(0, 0, 0, 0.8)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#ffffff", margin: 0 }}>
                {editingShift ? "แก้ไขตารางเวร" : "เพิ่มตารางเวรใหม่"}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "18px" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveShift} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Staff Select */}
              <div>
                <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "6px" }}>
                  เลือกแอดมิน / ทีมงาน
                </label>
                <select
                  value={formData.userId}
                  onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                  required
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "10px",
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    color: "#ffffff",
                    fontSize: "14px",
                  }}
                >
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id} style={{ background: "#1a1a20", color: "#fff" }}>
                      {s.displayName || s.username} ({s.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* Date & Shift Type */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "6px" }}>
                    วันที่ปฏิบัติหน้าที่
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "10px",
                      background: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                      color: "#ffffff",
                      fontSize: "13px",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "6px" }}>
                    ประเภทกะ
                  </label>
                  <select
                    value={formData.shiftType}
                    onChange={(e) => {
                      const type = e.target.value;
                      const defaults = SHIFT_TYPES[type] || SHIFT_TYPES.MORNING;
                      setFormData({
                        ...formData,
                        shiftType: type,
                        startTime: defaults.defaultStart,
                        endTime: defaults.defaultEnd,
                      });
                    }}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "10px",
                      background: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                      color: "#ffffff",
                      fontSize: "13px",
                    }}
                  >
                    {Object.entries(SHIFT_TYPES).map(([k, v]) => (
                      <option key={k} value={k} style={{ background: "#1a1a20", color: "#fff" }}>
                        {v.label} ({v.defaultStart}-{v.defaultEnd})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Time Range */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "6px" }}>
                    เวลาเริ่ม
                  </label>
                  <input
                    type="text"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    placeholder="09:00"
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "10px",
                      background: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                      color: "#ffffff",
                      fontSize: "13px",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "6px" }}>
                    เวลาสิ้นสุด
                  </label>
                  <input
                    type="text"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    placeholder="17:00"
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "10px",
                      background: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                      color: "#ffffff",
                      fontSize: "13px",
                    }}
                  />
                </div>
              </div>

              {/* Note */}
              <div>
                <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "6px" }}>
                  หมายเหตุเพิ่มเติม (Optional)
                </label>
                <input
                  type="text"
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  placeholder="เช่น ประจำห้องตั๋ว หรือดูแลโซนเสียง"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "10px",
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    color: "#ffffff",
                    fontSize: "13px",
                  }}
                />
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                {editingShift && (
                  <button
                    type="button"
                    onClick={() => handleDeleteShift(editingShift.id)}
                    style={{
                      padding: "10px 16px",
                      borderRadius: "10px",
                      background: "rgba(255, 69, 58, 0.15)",
                      border: "1px solid rgba(255, 69, 58, 0.3)",
                      color: "#ff453a",
                      fontSize: "13px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    ลบกะ
                  </button>
                )}

                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: "10px 16px",
                    borderRadius: "10px",
                    background: "#2997ff",
                    border: "none",
                    color: "#ffffff",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                    boxShadow: "0 0 20px rgba(41, 151, 255, 0.4)",
                  }}
                >
                  บันทึกตารางเวร
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
