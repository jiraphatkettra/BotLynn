"use client";

import React, { useState, useEffect } from "react";
import { formatRelativeTime, getDiscordAvatarUrl } from "@/lib/utils";

interface StaffNoteItem {
  id: string;
  title: string;
  content: string;
  category: string;
  isPinned: boolean;
  author: {
    id: string;
    displayName: string | null;
    username: string;
    avatar: string | null;
  };
  createdAt: string;
}

const CATEGORIES: Record<string, { label: string; color: string; bg: string }> = {
  SOP: { label: "SOP ขั้นตอนปฏิบัติ", color: "#2997ff", bg: "rgba(41, 151, 255, 0.15)" },
  FAQ: { label: "FAQ ถาม-ตอบ", color: "#30d158", bg: "rgba(48, 209, 88, 0.15)" },
  GUIDE: { label: "GUIDE คู่มือ", color: "#ff9f0a", bg: "rgba(255, 159, 10, 0.15)" },
  MEMO: { label: "MEMO บันทึกงาน", color: "#a78bfa", bg: "rgba(167, 139, 250, 0.15)" },
  GENERAL: { label: "ทั่วไป", color: "#86868b", bg: "rgba(255, 255, 255, 0.08)" },
};

export default function StaffNotesManager() {
  const [notes, setNotes] = useState<StaffNoteItem[]>([]);
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // New Note Form
  const [formData, setFormData] = useState({
    title: "",
    category: "SOP",
    content: "",
    isPinned: false,
  });

  const loadNotes = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/notes");
      if (res.ok) {
        const json = await res.json();
        setNotes(json.notes || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotes();
  }, []);

  const handleTogglePin = async (id: string, currentPin: boolean) => {
    try {
      const res = await fetch("/api/notes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isPinned: !currentPin }),
      });
      if (res.ok) {
        loadNotes();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteNote = async (id: string) => {
    if (!confirm("ต้องการลบบันทึกนี้หรือไม่?")) return;
    try {
      const res = await fetch(`/api/notes?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        loadNotes();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setModalOpen(false);
        setFormData({ title: "", category: "SOP", content: "", isPinned: false });
        loadNotes();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredNotes = notes.filter((n) => {
    const matchCat = activeCategory === "ALL" || n.category === activeCategory;
    const matchSearch =
      searchQuery === "" ||
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div style={{ width: "100%", maxWidth: "1100px", margin: "0 auto" }}>
      {/* Action Bar */}
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
        {/* Search Input */}
        <div style={{ position: "relative", minWidth: "260px", flex: 1, maxWidth: "400px" }}>
          <input
            type="text"
            placeholder="ค้นหา SOP, คู่มือ, หรือคำถาม..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 14px 10px 36px",
              borderRadius: "12px",
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              color: "#ffffff",
              fontSize: "13px",
            }}
          />
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{ position: "absolute", left: "12px", top: "12px", color: "var(--text-muted)" }}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>

        {/* Add Note Button */}
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "9px 20px",
            borderRadius: "9999px",
            background: "#2997ff",
            color: "#ffffff",
            border: "none",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
            boxShadow: "0 0 20px rgba(41, 151, 255, 0.4)",
          }}
        >
          <span>+ สร้างบันทึกใหม่</span>
        </button>
      </div>

      {/* Category Pills */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          marginBottom: "24px",
          overflowX: "auto",
          paddingBottom: "4px",
        }}
      >
        <button
          type="button"
          onClick={() => setActiveCategory("ALL")}
          style={{
            padding: "6px 14px",
            borderRadius: "9999px",
            border: "none",
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer",
            background: activeCategory === "ALL" ? "#2997ff" : "rgba(255, 255, 255, 0.05)",
            color: activeCategory === "ALL" ? "#ffffff" : "var(--text-secondary)",
          }}
        >
          ทั้งหมด ({notes.length})
        </button>

        {Object.entries(CATEGORIES).map(([key, cat]) => {
          const count = notes.filter((n) => n.category === key).length;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveCategory(key)}
              style={{
                padding: "6px 14px",
                borderRadius: "var(--radius-pill)",
                border: "none",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                background: activeCategory === key ? cat.color : "rgba(255, 255, 255, 0.05)",
                color: activeCategory === key ? "#ffffff" : "var(--text-secondary)",
              }}
            >
              {cat.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Notes Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "16px",
        }}
      >
        {filteredNotes.length === 0 ? (
          <div className="empty-state" style={{ gridColumn: "1 / -1" }}>
            <div className="empty-state-icon">📝</div>
            <p className="empty-state-title">ไม่พบบันทึกหรือคู่มือ</p>
            <p className="empty-state-text">ยังไม่มีบันทึกในหมวดหมู่นี้ หรือลองปรับคำค้นหาใหม่</p>
          </div>
        ) : (
          filteredNotes.map((note) => {
          const cat = CATEGORIES[note.category] || CATEGORIES.GENERAL;
          return (
            <div
              key={note.id}
              style={{
                padding: "20px",
                borderRadius: "18px",
                background: "rgba(255, 255, 255, 0.03)",
                border: `1px solid ${note.isPinned ? "rgba(255, 159, 10, 0.4)" : "rgba(255, 255, 255, 0.08)"}`,
                boxShadow: note.isPinned ? "0 8px 30px rgba(255, 159, 10, 0.15)" : "none",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                position: "relative",
              }}
            >
              {/* Card Header */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: "6px",
                    background: cat.bg,
                    color: cat.color,
                  }}
                >
                  {cat.label}
                </span>

                <div style={{ display: "flex", gap: "6px" }}>
                  {/* Pin button */}
                  <button
                    type="button"
                    onClick={() => handleTogglePin(note.id, note.isPinned)}
                    title={note.isPinned ? "ยกเลิกปักหมุด" : "ปักหมุดสำคัญ"}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "14px",
                      opacity: note.isPinned ? 1 : 0.4,
                      transition: "opacity 0.15s ease",
                    }}
                  >
                    📌
                  </button>

                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={() => handleDeleteNote(note.id)}
                    title="ลบบันทึก"
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "12px",
                      color: "var(--text-muted)",
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Title */}
              <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#ffffff", margin: 0, lineHeight: 1.4 }}>
                {note.title}
              </h3>

              {/* Content Body */}
              <div
                style={{
                  fontSize: "13px",
                  color: "rgba(255, 255, 255, 0.75)",
                  lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                  flex: 1,
                }}
              >
                {note.content}
              </div>

              {/* Card Footer */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingTop: "12px",
                  borderTop: "1px solid rgba(255, 255, 255, 0.05)",
                  fontSize: "11px",
                  color: "var(--text-muted)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span>โดย: {note.author.displayName || note.author.username}</span>
                </div>
                <div>{formatRelativeTime(note.createdAt)}</div>
              </div>
            </div>
          );
        }))}
      </div>

      {/* Create Modal */}
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
            zIndex: 1100,
            padding: "16px",
          }}
          onClick={() => setModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "520px",
              background: "rgba(18, 18, 22, 0.98)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: "20px",
              padding: "24px",
              boxShadow: "0 24px 60px rgba(0, 0, 0, 0.8)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
              <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#ffffff", margin: 0 }}>
                สร้างบันทึก / SOP ทีมงาน
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "18px" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNote} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "6px" }}>
                  หัวข้อเรื่อง
                </label>
                <input
                  type="text"
                  placeholder="เช่น ขั้นตอนการตรวจสลิปโอนเงิน"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
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
                  หมวดหมู่
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
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
                  {Object.entries(CATEGORIES).map(([key, cat]) => (
                    <option key={key} value={key} style={{ background: "#1a1a20", color: "#fff" }}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "6px" }}>
                  เนื้อหารายละเอียด
                </label>
                <textarea
                  rows={6}
                  placeholder="พิมพ์ขั้นตอนการปฏิบัติงาน กฎ หรือคำแนะนำ..."
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  required
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "10px",
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    color: "#ffffff",
                    fontSize: "13px",
                    resize: "vertical",
                  }}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <input
                  type="checkbox"
                  id="pin-note"
                  checked={formData.isPinned}
                  onChange={(e) => setFormData({ ...formData, isPinned: e.target.checked })}
                />
                <label htmlFor="pin-note" style={{ fontSize: "13px", color: "#ffffff", cursor: "pointer" }}>
                  📌 ปักหมุดไว้บนสุด (สำคัญ)
                </label>
              </div>

              <button
                type="submit"
                style={{
                  marginTop: "8px",
                  padding: "10px 16px",
                  borderRadius: "10px",
                  background: "#2997ff",
                  border: "none",
                  color: "#ffffff",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                บันทึกเอกสาร
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
