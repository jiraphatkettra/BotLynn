"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

interface DynamicVoiceConfig {
  id: string;
  guildId: string;
  categoryId: string;
  categoryName: string | null;
  zoneName: string;
  userLimit: number;
  minChannels: number;
  spareChannels: number;
  emojis: string;
  blockGroupSize: number;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

interface DiscordCategory {
  id: string;
  name: string;
}

const COMMON_EMOJIS = [
  "🎮", "🥪", "🥐", "🥓", "🥨", "🍿",
  "🍑", "🍎", "🍓", "🍈", "🍋", "🍇",
  "🍉", "🍊", "🍩", "🍰", "🎧", "🎬", "💬"
];

export default function DynamicVoiceManager() {
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role;
  const isAdmin = ["OWNER", "MANAGER", "ADMIN"].includes(userRole);

  const [configs, setConfigs] = useState<DynamicVoiceConfig[]>([]);
  const [categories, setCategories] = useState<DiscordCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<DynamicVoiceConfig | null>(null);

  const [syncingId, setSyncingId] = useState<string | null>(null);

  // Form State
  const [categoryId, setCategoryId] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [zoneName, setZoneName] = useState("เล่นเกม");
  const [userLimit, setUserLimit] = useState(5);
  const [minChannels, setMinChannels] = useState(5);
  const [spareChannels, setSpareChannels] = useState(1);
  const [emojis, setEmojis] = useState("🎮");
  const [isEnabled, setIsEnabled] = useState(true);
  const [autoSeed, setAutoSeed] = useState(true);

  // Fetch configs
  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/voice/dynamic");
      if (res.ok) {
        const data = await res.json();
        setConfigs(data.configs || []);
        setCategories(data.categories || []);
      }
    } catch (err) {
      console.error("Failed to load dynamic voice configs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setEditingConfig(null);
    setCategoryId(categories.length > 0 ? categories[0].id : "");
    setCategoryName(categories.length > 0 ? categories[0].name : "");
    setZoneName("เล่นเกม");
    setUserLimit(5);
    setMinChannels(5);
    setSpareChannels(1);
    setEmojis("🎮");
    setIsEnabled(true);
    setModalOpen(true);
  };

  const openEditModal = (cfg: DynamicVoiceConfig) => {
    setEditingConfig(cfg);
    setCategoryId(cfg.categoryId);
    setCategoryName(cfg.categoryName || "");
    setZoneName(cfg.zoneName);
    setUserLimit(cfg.userLimit);
    setMinChannels(cfg.minChannels);
    setSpareChannels(cfg.spareChannels);
    setEmojis(cfg.emojis);
    setIsEnabled(cfg.isEnabled);
    setModalOpen(true);
  };

  const applyPreset = (preset: "GAMING" | "LIVING") => {
    if (preset === "GAMING") {
      setZoneName("เล่นเกม");
      setUserLimit(5);
      setMinChannels(5);
      setSpareChannels(1);
      setEmojis("🎮");
    } else {
      setZoneName("พูดคุย");
      setUserLimit(10);
      setMinChannels(5);
      setSpareChannels(1);
      setEmojis("🥪, 🥐, 🥓, 🥨, 🍿, 🍑, 🍎, 🍓, 🍈, 🍋");
    }
  };

  const handleToggle = async (cfg: DynamicVoiceConfig) => {
    try {
      const res = await fetch("/api/voice/dynamic", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: cfg.id,
          isEnabled: !cfg.isEnabled,
        }),
      });
      if (res.ok) {
        setConfigs((prev) =>
          prev.map((c) => (c.id === cfg.id ? { ...c, isEnabled: !c.isEnabled } : c))
        );
      }
    } catch (err) {
      console.error("Failed to toggle config:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการลบการตั้งค่าหมวดหมู่นี้?")) return;
    try {
      const res = await fetch(`/api/voice/dynamic?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setConfigs((prev) => prev.filter((c) => c.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete config:", err);
    }
  };

  const handleSync = async (cfg: DynamicVoiceConfig) => {
    try {
      setSyncingId(cfg.id);
      const res = await fetch("/api/voice/dynamic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync", id: cfg.id }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || "ซิงค์และตรวจสอบชุดห้องเริ่มต้นเรียบร้อยแล้ว!");
      } else {
        alert(data.error || "เกิดข้อผิดพลาดในการซิงค์");
      }
    } catch (err) {
      console.error("Sync error:", err);
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setSyncingId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId.trim() || !zoneName.trim()) {
      alert("กรุณาระบุ Category ID และชื่อโซน");
      return;
    }

    try {
      setSaving(true);
      const selectedCat = categories.find((c) => c.id === categoryId);
      const payload = {
        categoryId,
        categoryName: categoryName || selectedCat?.name || "Voice Category",
        zoneName,
        userLimit: Number(userLimit) || 0,
        minChannels: Number(minChannels) || 5,
        spareChannels: Number(spareChannels) || 1,
        emojis,
        isEnabled,
        autoSeed,
      };

      if (editingConfig) {
        const res = await fetch("/api/voice/dynamic", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingConfig.id, ...payload }),
        });
        if (res.ok) {
          await loadData();
          setModalOpen(false);
        } else {
          const err = await res.json();
          alert(err.error || "เกิดข้อผิดพลาดในการบันทึก");
        }
      } else {
        const res = await fetch("/api/voice/dynamic", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          await loadData();
          setModalOpen(false);
        } else {
          const err = await res.json();
          alert(err.error || "เกิดข้อผิดพลาดในการสร้าง");
        }
      }
    } catch (err) {
      console.error("Error saving config:", err);
      alert("เกิดข้อผิดพลาด");
    } finally {
      setSaving(false);
    }
  };

  // Helper preview generator for room tree lines
  const generatePreviewLines = (zone: string, userCount: number, emojiListStr: string) => {
    const emojiList = emojiListStr.split(",").map((s) => s.trim()).filter(Boolean);
    const getEmoji = (idx: number) =>
      emojiList.length > 0 ? emojiList[(idx - 1) % emojiList.length] : "🎮";

    return [
      { name: `╭ ㆍ ${zone}ㆍ01 ㆍ ${getEmoji(1)} ⁺`, limit: userCount, status: "เต็ม (5/5)" },
      { name: `┆ ㆍ ${zone}ㆍ02 ㆍ ${getEmoji(2)} ⁺`, limit: userCount, status: "เต็ม (5/5)" },
      { name: `┆ ㆍ ${zone}ㆍ03 ㆍ ${getEmoji(3)} ⁺`, limit: userCount, status: "เต็ม (5/5)" },
      { name: `┆ ㆍ ${zone}ㆍ04 ㆍ ${getEmoji(4)} ⁺`, limit: userCount, status: "เต็ม (5/5)" },
      { name: `╰ ㆍ ${zone}ㆍ05 ㆍ ${getEmoji(5)} ⁺`, limit: userCount, status: "คนเริ่มเข้า (4/5)" },
      { name: `╭ ㆍ ${zone}ㆍ06 ㆍ ${getEmoji(6)} ⁺`, limit: userCount, status: "⚡ บอทแตกห้องใหม่อัตโนมัติ! (0/5)", highlight: true },
    ];
  };

  return (
    <div className="card mb-24 animate-scale-in" style={{ borderTop: "3px solid var(--accent)" }}>
      <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h3 className="card-title" style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "18px" }}>
            <span style={{ fontSize: "22px" }}>🎙️</span>
            ระบบห้องเสียงไดนามิก (Auto-Expanding Voice Pool)
          </h3>
          <p className="card-subtitle" style={{ color: "var(--text-muted)", fontSize: "13px", marginTop: "4px" }}>
            แก้ปัญหาห้องเสียงเต็มอัตโนมัติ โดยบอทจะแตกห้องใหม่ให้ทันทีเมื่อคนเริ่มเต็ม และลบห้องส่วนเกินคืนเมื่อไม่มีคนใช้งาน
          </p>
        </div>

        {isAdmin && (
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button
              onClick={openCreateModal}
              className="btn btn-primary"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 16px",
                fontWeight: 600,
                fontSize: "13px",
                borderRadius: "var(--radius-pill)",
              }}
            >
              <span>+</span> เพิ่มโซนห้องเสียง
            </button>
          </div>
        )}
      </div>

      <div className="card-body">
        {/* Visual Live Demonstration / Architecture Box */}
        <div
          style={{
            background: "rgba(255, 255, 255, 0.02)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-lg)",
            padding: "16px 20px",
            marginBottom: "20px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "20px",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <span className="badge badge-accent" style={{ fontSize: "11px", fontWeight: 700 }}>
                💡 หลักการทำงานแบบอัตโนมัติ
              </span>
              <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                Slash Command: <code style={{ color: "var(--accent)", background: "rgba(41, 151, 255, 0.1)", padding: "2px 6px", borderRadius: "4px" }}>/dynamic-voice setup</code>
              </span>
            </div>
            <ul style={{ paddingLeft: "18px", color: "var(--text-secondary)", fontSize: "13px", lineHeight: "1.7" }}>
              <li>
                <strong style={{ color: "var(--text-primary)" }}>โครงสร้างกิ่งไม้สวยงาม:</strong> รักษารูปทรง <code>╭ ┆ ┆ ┆ ╰</code> เป็นบล็อกละ 5 ห้อง พร้อมเลข 2 หลัก <code>01, 02..</code>
              </li>
              <li>
                <strong style={{ color: "var(--text-primary)" }}>ห้องขั้นต่ำ 5 ห้อง:</strong> เซิร์ฟเวอร์จะคงห้อง 01 - 05 ไว้ตลอดเวลา ไม่ต้องสร้างมือ
              </li>
              <li>
                <strong style={{ color: "var(--text-primary)" }}>แตกห้องอัตโนมัติ:</strong> เมื่อห้องว่างเหลือน้อยกว่าที่กำหนด บอทจะงอกห้อง 06, 07.. ให้อัตโนมัติ
              </li>
              <li>
                <strong style={{ color: "var(--text-primary)" }}>ยุบห้องอัตโนมัติ:</strong> เมื่อสมาชิกแยกย้ายและห้องว่างเกิน บอทจะลบห้องส่วนเกินคืนรูปทรง 5 ห้องเดิมทันที
              </li>
            </ul>
          </div>

          {/* Mini Visual Tree Example */}
          <div
            style={{
              background: "#050508",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "var(--radius-md)",
              padding: "12px 16px",
              fontFamily: "var(--font-mono)",
              fontSize: "12px",
            }}
          >
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "8px", fontWeight: 600, display: "flex", justifyContent: "space-between" }}>
              <span>ตัวอย่างการแตกห้องในหมวดหมู่</span>
              <span style={{ color: "var(--success)" }}>🟢 LIVE SIMULATION</span>
            </div>
            {generatePreviewLines("เล่นเกม", 5, "🎮").map((line, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "4px 6px",
                  borderRadius: "4px",
                  background: line.highlight ? "rgba(48, 209, 88, 0.12)" : "transparent",
                  border: line.highlight ? "1px solid rgba(48, 209, 88, 0.3)" : "none",
                  marginBottom: "2px",
                }}
              >
                <span style={{ color: line.highlight ? "var(--success)" : "var(--text-primary)" }}>
                  {line.name}
                </span>
                <span style={{ fontSize: "11px", color: line.highlight ? "var(--success)" : "var(--text-muted)" }}>
                  {line.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Configurations List */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
            กำลังโหลดข้อมูลการตั้งค่า...
          </div>
        ) : configs.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "36px 20px",
              background: "rgba(255, 255, 255, 0.02)",
              borderRadius: "var(--radius-md)",
              border: "1px dashed var(--border-subtle)",
            }}
          >
            <div style={{ fontSize: "36px", marginBottom: "8px" }}>🎙️</div>
            <div style={{ fontWeight: 600, fontSize: "15px", color: "var(--text-primary)", marginBottom: "4px" }}>
              ยังไม่มีการตั้งค่าหมวดหมู่ Dynamic Voice
            </div>
            <div style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "16px", maxWidth: "500px", margin: "0 auto 16px" }}>
              กดปุ่มด้านล่างเพื่อเริ่มเปิดใช้งานระบบกับหมวดหมู่ใน Discord หรือใช้คำสั่ง <code>/dynamic-voice setup</code> ในห้องแชทได้ทันที
            </div>
            {isAdmin && (
              <button onClick={openCreateModal} className="btn btn-primary" style={{ padding: "8px 20px" }}>
                + เพิ่มการตั้งค่าหมวดหมู่แรก
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 420px), 1fr))", gap: "16px" }}>
            {configs.map((cfg) => {
              const emojiChips = cfg.emojis.split(",").map((e) => e.trim()).filter(Boolean);
              return (
                <div
                  key={cfg.id}
                  style={{
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-lg)",
                    padding: "18px 20px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: "14px",
                    position: "relative",
                  }}
                >
                  <div>
                    {/* Header: Name + Status */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", marginBottom: "10px" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontSize: "18px" }}>{emojiChips[0] || "🎙️"}</span>
                          <h4 style={{ fontWeight: 700, fontSize: "16px", color: "var(--text-primary)" }}>
                            {cfg.categoryName || "Discord Category"}
                          </h4>
                        </div>
                        <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                          ID: <code style={{ fontSize: "11px" }}>{cfg.categoryId}</code>
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span
                          style={{
                            padding: "3px 10px",
                            borderRadius: "var(--radius-pill)",
                            fontSize: "12px",
                            fontWeight: 600,
                            background: cfg.isEnabled ? "rgba(48, 209, 88, 0.15)" : "rgba(255, 69, 58, 0.15)",
                            color: cfg.isEnabled ? "var(--success)" : "var(--danger)",
                            border: `1px solid ${cfg.isEnabled ? "rgba(48, 209, 88, 0.3)" : "rgba(255, 69, 58, 0.3)"}`,
                          }}
                        >
                          {cfg.isEnabled ? "🟢 เปิดใช้งาน" : "🔴 ปิดใช้งาน"}
                        </span>
                      </div>
                    </div>

                    {/* Zone parameters info */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3, 1fr)",
                        gap: "8px",
                        background: "rgba(0, 0, 0, 0.25)",
                        padding: "10px 12px",
                        borderRadius: "var(--radius-md)",
                        marginBottom: "12px",
                      }}
                    >
                      <div>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>ชื่อคำนำโซน</div>
                        <div style={{ fontWeight: 700, fontSize: "14px", color: "var(--text-primary)" }}>
                          {cfg.zoneName}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>จำกัดต่อห้อง</div>
                        <div style={{ fontWeight: 700, fontSize: "14px", color: "var(--accent)" }}>
                          {cfg.userLimit > 0 ? `${cfg.userLimit} คน` : "ไม่จำกัด"}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>ห้องขั้นต่ำ</div>
                        <div style={{ fontWeight: 700, fontSize: "14px", color: "var(--success)" }}>
                          {cfg.minChannels} ห้อง
                        </div>
                      </div>
                    </div>

                    {/* Emoji Sequence */}
                    <div style={{ marginBottom: "6px" }}>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px" }}>
                        ชุด Emoji ประจำห้อง (วนซ้ำตามลำดับ):
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                        {emojiChips.slice(0, 10).map((em, idx) => (
                          <span
                            key={idx}
                            style={{
                              background: "rgba(255, 255, 255, 0.05)",
                              border: "1px solid var(--border-subtle)",
                              borderRadius: "4px",
                              padding: "2px 6px",
                              fontSize: "12px",
                            }}
                          >
                            {em}
                          </span>
                        ))}
                        {emojiChips.length > 10 && (
                          <span style={{ fontSize: "11px", color: "var(--text-muted)", alignSelf: "center" }}>
                            +{emojiChips.length - 10} รายการ
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  {isAdmin && (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        paddingTop: "12px",
                        borderTop: "1px solid var(--border-subtle)",
                        marginTop: "auto",
                      }}
                    >
                      <button
                        onClick={() => handleToggle(cfg)}
                        className="btn"
                        style={{
                          fontSize: "12px",
                          padding: "5px 12px",
                          background: cfg.isEnabled ? "rgba(255, 69, 58, 0.1)" : "rgba(48, 209, 88, 0.1)",
                          color: cfg.isEnabled ? "var(--danger)" : "var(--success)",
                          border: `1px solid ${cfg.isEnabled ? "rgba(255, 69, 58, 0.3)" : "rgba(48, 209, 88, 0.3)"}`,
                          borderRadius: "var(--radius-sm)",
                        }}
                      >
                        {cfg.isEnabled ? "ปิดระบบชั่วคราว" : "เปิดใช้งานระบบ"}
                      </button>

                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          onClick={() => handleSync(cfg)}
                          disabled={syncingId === cfg.id}
                          className="btn"
                          title="ตรวจเช็กและสร้างห้องเริ่มต้น 01-05 ให้ครบชุดใน Discord"
                          style={{
                            fontSize: "12px",
                            padding: "5px 12px",
                            background: "rgba(41, 151, 255, 0.1)",
                            color: "var(--accent)",
                            border: "1px solid rgba(41, 151, 255, 0.3)",
                            borderRadius: "var(--radius-sm)",
                          }}
                        >
                          {syncingId === cfg.id ? "กำลังซิงค์..." : "⚡ ซิงค์ห้องชุด"}
                        </button>

                        <button
                          onClick={() => openEditModal(cfg)}
                          className="btn"
                          style={{
                            fontSize: "12px",
                            padding: "5px 12px",
                            background: "rgba(255, 255, 255, 0.06)",
                            border: "1px solid var(--border-subtle)",
                            borderRadius: "var(--radius-sm)",
                          }}
                        >
                          ✏️ แก้ไข
                        </button>
                        <button
                          onClick={() => handleDelete(cfg.id)}
                          className="btn"
                          style={{
                            fontSize: "12px",
                            padding: "5px 10px",
                            background: "transparent",
                            color: "var(--danger)",
                            borderRadius: "var(--radius-sm)",
                          }}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Setup / Edit Zone Config */}
      {modalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
          onClick={() => setModalOpen(false)}
        >
          <div
            style={{
              background: "#121217",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-xl)",
              width: "100%",
              maxWidth: "540px",
              padding: "24px 28px",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.6)",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
              <h3 style={{ fontWeight: 700, fontSize: "18px", color: "var(--text-primary)" }}>
                {editingConfig ? "✏️ แก้ไขการตั้งค่าโซนห้องเสียง" : "➕ เพิ่มโซนห้องเสียงไดนามิกใหม่"}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                style={{
                  background: "transparent",
                  fontSize: "18px",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            {/* Quick Presets */}
            <div style={{ marginBottom: "18px" }}>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "6px", fontWeight: 600 }}>
                เลือกพรีเซ็ตสำเร็จรูป (Quick Presets):
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => applyPreset("GAMING")}
                  style={{
                    padding: "10px 12px",
                    background: zoneName === "เล่นเกม" ? "rgba(41, 151, 255, 0.15)" : "rgba(255, 255, 255, 0.03)",
                    border: `1px solid ${zoneName === "เล่นเกม" ? "var(--accent)" : "var(--border-subtle)"}`,
                    borderRadius: "var(--radius-md)",
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: "13px", color: "var(--text-primary)" }}>🎮 Gaming Zone</div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>เล่นเกม • จำกัด 5 คน • 🎮</div>
                </button>

                <button
                  type="button"
                  onClick={() => applyPreset("LIVING")}
                  style={{
                    padding: "10px 12px",
                    background: zoneName === "พูดคุย" ? "rgba(48, 209, 88, 0.15)" : "rgba(255, 255, 255, 0.03)",
                    border: `1px solid ${zoneName === "พูดคุย" ? "var(--success)" : "var(--border-subtle)"}`,
                    borderRadius: "var(--radius-md)",
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: "13px", color: "var(--text-primary)" }}>☕ Living Zone</div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>พูดคุย • จำกัด 10 คน • ผลไม้/ขนม</div>
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Category Selection */}
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>
                  หมวดหมู่ใน Discord (Category) *
                </label>
                {categories.length > 0 ? (
                  <select
                    value={categoryId}
                    onChange={(e) => {
                      setCategoryId(e.target.value);
                      const cat = categories.find((c) => c.id === e.target.value);
                      if (cat) setCategoryName(cat.name);
                    }}
                    disabled={!!editingConfig}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      background: "rgba(255, 255, 255, 0.04)",
                      border: "1px solid var(--border-default)",
                      borderRadius: "var(--radius-md)",
                      color: "var(--text-primary)",
                      fontSize: "13px",
                    }}
                  >
                    <option value="" disabled>-- เลือกหมวดหมู่ Discord --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.id})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    placeholder="ใส่ Discord Category ID (เช่น 1234567890)"
                    disabled={!!editingConfig}
                    required
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      background: "rgba(255, 255, 255, 0.04)",
                      border: "1px solid var(--border-default)",
                      borderRadius: "var(--radius-md)",
                      color: "var(--text-primary)",
                      fontSize: "13px",
                    }}
                  />
                )}
              </div>

              {/* Category Custom Label */}
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>
                  ชื่อหมวดหมู่ที่แสดง
                </label>
                <input
                  type="text"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="เช่น Gaming Zone, Living Zone"
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    background: "rgba(255, 255, 255, 0.04)",
                    border: "1px solid var(--border-default)",
                    borderRadius: "var(--radius-md)",
                    color: "var(--text-primary)",
                    fontSize: "13px",
                  }}
                />
              </div>

              {/* Zone Name & User Limit */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>
                    ชื่อคำนำโซน (Zone Name) *
                  </label>
                  <input
                    type="text"
                    value={zoneName}
                    onChange={(e) => setZoneName(e.target.value)}
                    placeholder="เช่น เล่นเกม, พูดคุย"
                    required
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      background: "rgba(255, 255, 255, 0.04)",
                      border: "1px solid var(--border-default)",
                      borderRadius: "var(--radius-md)",
                      color: "var(--text-primary)",
                      fontSize: "13px",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>
                    จำกัดคนต่อห้อง (0 = ไม่จำกัด)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="99"
                    value={userLimit}
                    onChange={(e) => setUserLimit(Number(e.target.value))}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      background: "rgba(255, 255, 255, 0.04)",
                      border: "1px solid var(--border-default)",
                      borderRadius: "var(--radius-md)",
                      color: "var(--text-primary)",
                      fontSize: "13px",
                    }}
                  />
                </div>
              </div>

              {/* Min Channels & Spare Channels */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>
                    จำนวนห้องขั้นต่ำ (คงไว้ตลอด)
                  </label>
                  <input
                    type="number"
                    min="2"
                    max="20"
                    value={minChannels}
                    onChange={(e) => setMinChannels(Number(e.target.value))}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      background: "rgba(255, 255, 255, 0.04)",
                      border: "1px solid var(--border-default)",
                      borderRadius: "var(--radius-md)",
                      color: "var(--text-primary)",
                      fontSize: "13px",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>
                    ห้องว่างสำรอง (ต่ำกว่านี้จะแตกห้อง)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={spareChannels}
                    onChange={(e) => setSpareChannels(Number(e.target.value))}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      background: "rgba(255, 255, 255, 0.04)",
                      border: "1px solid var(--border-default)",
                      borderRadius: "var(--radius-md)",
                      color: "var(--text-primary)",
                      fontSize: "13px",
                    }}
                  />
                </div>
              </div>

              {/* Emoji Sequence */}
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>
                  Emoji ท้ายชื่อห้อง (คั่นด้วยจุลภาค <code>,</code>)
                </label>
                <input
                  type="text"
                  value={emojis}
                  onChange={(e) => setEmojis(e.target.value)}
                  placeholder="เช่น 🎮 หรือ 🥪, 🥐, 🥓, 🥨, 🍿"
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    background: "rgba(255, 255, 255, 0.04)",
                    border: "1px solid var(--border-default)",
                    borderRadius: "var(--radius-md)",
                    color: "var(--text-primary)",
                    fontSize: "13px",
                    marginBottom: "8px",
                  }}
                />

                {/* Quick Add Chips */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center" }}>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>คลิกเพื่อเพิ่ม:</span>
                  {COMMON_EMOJIS.map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setEmojis((prev) => (prev ? `${prev}, ${em}` : em))}
                      style={{
                        padding: "2px 8px",
                        background: "rgba(255, 255, 255, 0.05)",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "12px",
                      }}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>

              {/* Auto Seed Rooms (Only for new zones) */}
              {!editingConfig && (
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "4px" }}>
                  <input
                    type="checkbox"
                    id="autoSeedCheck"
                    checked={autoSeed}
                    onChange={(e) => setAutoSeed(e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: "var(--accent)" }}
                  />
                  <label htmlFor="autoSeedCheck" style={{ fontSize: "13px", color: "var(--text-primary)", cursor: "pointer" }}>
                    ⚡ สั่งบอทสร้างห้องชุดเริ่มต้น (01 ถึง {minChannels}) ใน Discord ให้ทันที
                  </label>
                </div>
              )}

              {/* Enable / Disable */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "2px" }}>
                <input
                  type="checkbox"
                  id="isEnabledCheck"
                  checked={isEnabled}
                  onChange={(e) => setIsEnabled(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: "var(--accent)" }}
                />
                <label htmlFor="isEnabledCheck" style={{ fontSize: "13px", color: "var(--text-primary)", cursor: "pointer" }}>
                  เปิดให้บอทเริ่มแตกห้องและดูแลหมวดหมู่นี้ทันที (Enabled)
                </label>
              </div>

              {/* Form Buttons */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn"
                  style={{
                    padding: "8px 18px",
                    background: "transparent",
                    color: "var(--text-muted)",
                    borderRadius: "var(--radius-md)",
                  }}
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-primary"
                  style={{
                    padding: "8px 22px",
                    fontWeight: 600,
                    borderRadius: "var(--radius-md)",
                  }}
                >
                  {saving ? "กำลังบันทึก..." : editingConfig ? "บันทึกการแก้ไข" : "สร้างและเปิดใช้งาน"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
