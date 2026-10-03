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

const DEFAULT_LIVING_EMOJIS = "🥪, 🥐, 🥓, 🥨, 🍿, 🍑, 🍎, 🍓, 🍋‍🟩, 🍋, 🍇, 🍉, 🍊, 🍩, 🍰";

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
  const [creatingSleep, setCreatingSleep] = useState(false);
  const [creatingLiving, setCreatingLiving] = useState(false);

  // Form State
  const [categoryId, setCategoryId] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [zoneName, setZoneName] = useState("พูดคุย");
  const [userLimit, setUserLimit] = useState(10);
  const [minChannels, setMinChannels] = useState(10);
  const [spareChannels, setSpareChannels] = useState(1);
  const [emojis, setEmojis] = useState(DEFAULT_LIVING_EMOJIS);
  const [blockGroupSize, setBlockGroupSize] = useState(5);
  const [isEnabled, setIsEnabled] = useState(true);
  const [autoSeed, setAutoSeed] = useState(false);

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
    const initialCat = categories.length > 0 ? categories[0] : null;
    setCategoryId(initialCat?.id || "");
    setCategoryName(initialCat?.name || "");
    setZoneName("พูดคุย");
    setUserLimit(10);
    setMinChannels(10);
    setSpareChannels(1);
    setEmojis(DEFAULT_LIVING_EMOJIS);
    setBlockGroupSize(5);
    setIsEnabled(true);
    setAutoSeed(false);
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
    setBlockGroupSize(cfg.blockGroupSize || (cfg.minChannels <= 3 ? 3 : 5));
    setIsEnabled(cfg.isEnabled);
    setAutoSeed(false);
    setModalOpen(true);
  };

  const applyPreset = (preset: "LIVING" | "SLEEP_GROUP" | "SLEEP_DUO" | "SLEEP_SOLO" | "GAMING") => {
    if (preset === "LIVING") {
      setZoneName("พูดคุย");
      setUserLimit(10);
      setMinChannels(10);
      setBlockGroupSize(5);
      setEmojis(DEFAULT_LIVING_EMOJIS);
    } else if (preset === "SLEEP_GROUP") {
      setZoneName("นอนรวม");
      setUserLimit(5);
      setMinChannels(3);
      setBlockGroupSize(3);
      setEmojis("🛏️");
    } else if (preset === "SLEEP_DUO") {
      setZoneName("นอนคู่");
      setUserLimit(2);
      setMinChannels(3);
      setBlockGroupSize(3);
      setEmojis("🛏️");
    } else if (preset === "SLEEP_SOLO") {
      setZoneName("นอนเดี่ยว");
      setUserLimit(1);
      setMinChannels(3);
      setBlockGroupSize(3);
      setEmojis("🛏️");
    } else if (preset === "GAMING") {
      setZoneName("เล่นเกม");
      setUserLimit(5);
      setMinChannels(5);
      setBlockGroupSize(5);
      setEmojis("🎮");
    }
  };

  const handleCreateSleepingZone = async () => {
    const defaultCat = categories.find((c) => c.name.toLowerCase().includes("dream") || c.name.includes("นอน"))?.id || (categories.length > 0 ? categories[0].id : "");
    const catChoice = prompt(
      "ระบุ Discord Category ID สำหรับโซนห้องนอน (Dreamland 3-in-1: นอนรวม, นอนคู่, นอนเดี่ยว):",
      defaultCat
    );
    if (!catChoice?.trim()) return;

    try {
      setCreatingSleep(true);
      const catObj = categories.find((c) => c.id === catChoice.trim());
      const res = await fetch("/api/voice/dynamic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create-sleeping-zone",
          categoryId: catChoice.trim(),
          categoryName: catObj?.name || "Dreamland",
          userLimit: 5,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || "เปิดใช้งานโซนห้องนอนสำเร็จ!");
        await loadData();
      } else {
        alert(data.error || "เกิดข้อผิดพลาดในการสร้างโซนห้องนอน");
      }
    } catch (err) {
      console.error(err);
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setCreatingSleep(false);
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

  const handleDelete = async (id: string, zone: string) => {
    if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบโซน "${zone}" ออกจากระบบ?`)) return;
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
        alert(data.message || "ซิงค์และจัดเรียงห้องเรียบร้อยแล้ว!");
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
        minChannels: Number(minChannels) || 3,
        spareChannels: Number(spareChannels) || 1,
        emojis,
        blockGroupSize: Number(blockGroupSize) || 5,
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

  // Group configurations by Category for clean organization
  const groupedConfigs = configs.reduce<Record<string, { categoryName: string; items: DynamicVoiceConfig[] }>>(
    (acc, cfg) => {
      const catKey = cfg.categoryId;
      if (!acc[catKey]) {
        acc[catKey] = {
          categoryName: cfg.categoryName || `Category: ${cfg.categoryId}`,
          items: [],
        };
      }
      acc[catKey].items.push(cfg);
      return acc;
    },
    {}
  );

  return (
    <div className="card mb-24" style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)" }}>
      {/* Clean Top Header */}
      <div
        style={{
          padding: "20px 24px",
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
            ระบบขยายและยุบห้องอัตโนมัติ (Dynamic Voice Pools)
          </h3>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: "4px 0 0 0" }}>
            แตกห้องเป็นบล็อกเมื่อห้องเต็ม และยุบคืนรูปทรงเดิมเมื่อแยกย้าย โดยระบบจะรันเลขและวนลูปอีโมจิต่อเนื่องอัตโนมัติ
          </p>
        </div>

        {isAdmin && (
          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            <button
              onClick={handleCreateSleepingZone}
              disabled={creatingSleep}
              className="btn btn-secondary"
              style={{ fontSize: "13px", fontWeight: 600, padding: "8px 16px" }}
            >
              {creatingSleep ? "กำลังตั้งค่า..." : "โซนห้องนอน 3-in-1 (Dreamland)"}
            </button>

            <button
              onClick={openCreateModal}
              className="btn btn-primary"
              style={{ fontSize: "13px", fontWeight: 600, padding: "8px 16px" }}
            >
              + เพิ่มโซนห้องเสียง
            </button>
          </div>
        )}
      </div>

      <div style={{ padding: "24px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: "var(--text-muted)", fontSize: "14px" }}>
            กำลังโหลดข้อมูลโซนห้องเสียง...
          </div>
        ) : configs.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "40px 20px",
              background: "rgba(255, 255, 255, 0.01)",
              borderRadius: "var(--radius-md)",
              border: "1px dashed var(--border-subtle)",
            }}
          >
            <div style={{ fontWeight: 600, fontSize: "15px", color: "var(--text-primary)", marginBottom: "4px" }}>
              ยังไม่มีการตั้งค่าโซนห้องเสียง
            </div>
            <div style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "16px" }}>
              กดปุ่มเพิ่มโซนห้องเสียงด้านบน หรือใช้คำสั่ง <code>/dynamic-voice setup</code> ใน Discord
            </div>
            {isAdmin && (
              <button onClick={openCreateModal} className="btn btn-primary" style={{ fontSize: "13px" }}>
                + เพิ่มโซนห้องเสียง
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {Object.entries(groupedConfigs).map(([catId, group]) => (
              <div
                key={catId}
                style={{
                  background: "rgba(255, 255, 255, 0.015)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-lg)",
                  overflow: "hidden",
                }}
              >
                {/* Category Header */}
                <div
                  style={{
                    padding: "14px 20px",
                    background: "rgba(255, 255, 255, 0.03)",
                    borderBottom: "1px solid var(--border-subtle)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "10px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontWeight: 700, fontSize: "14px", color: "var(--text-primary)" }}>
                      {group.categoryName}
                    </span>
                    <span style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "monospace" }}>
                      ID: {catId}
                    </span>
                  </div>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                    {group.items.length} โซนย่อยในหมวดนี้
                  </span>
                </div>

                {/* Sub-Zones Table / Grid */}
                <div style={{ padding: "16px 20px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))", gap: "16px" }}>
                  {group.items.map((cfg) => {
                    const emojiList = cfg.emojis.split(",").map((e) => e.trim()).filter(Boolean);
                    const primaryEmoji = emojiList[0] || "";

                    return (
                      <div
                        key={cfg.id}
                        style={{
                          background: "rgba(0, 0, 0, 0.3)",
                          border: "1px solid var(--border-subtle)",
                          borderRadius: "var(--radius-md)",
                          padding: "16px",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                          gap: "14px",
                        }}
                      >
                        <div>
                          {/* Zone Name & Status */}
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <span style={{ fontWeight: 700, fontSize: "15px", color: "#fff" }}>
                                {cfg.zoneName}
                              </span>
                              {primaryEmoji && (
                                <span style={{ fontSize: "14px" }}>
                                  {primaryEmoji} ⁺
                                </span>
                              )}
                            </div>

                            <button
                              onClick={() => handleToggle(cfg)}
                              title={cfg.isEnabled ? "คลิกเพื่อปิดใช้งาน" : "คลิกเพื่อเปิดใช้งาน"}
                              style={{
                                cursor: "pointer",
                                border: "none",
                                background: cfg.isEnabled ? "rgba(48, 209, 88, 0.15)" : "rgba(255, 69, 58, 0.15)",
                                color: cfg.isEnabled ? "var(--success)" : "var(--danger)",
                                padding: "4px 10px",
                                borderRadius: "var(--radius-full)",
                                fontSize: "12px",
                                fontWeight: 600,
                              }}
                            >
                              {cfg.isEnabled ? "เปิดใช้งาน" : "ปิดชั่วคราว"}
                            </button>
                          </div>

                          {/* Zone Specs Grid */}
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "repeat(3, 1fr)",
                              gap: "8px",
                              background: "rgba(255, 255, 255, 0.02)",
                              border: "1px solid rgba(255, 255, 255, 0.04)",
                              borderRadius: "var(--radius-sm)",
                              padding: "10px",
                              marginBottom: "12px",
                              textAlign: "center",
                            }}
                          >
                            <div>
                              <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>ห้องฐาน</div>
                              <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>
                                {cfg.minChannels} ห้อง
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>แตกทีละ</div>
                              <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--accent)" }}>
                                {cfg.blockGroupSize || 5} ห้อง
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>จำกัดคน</div>
                              <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>
                                {cfg.userLimit > 0 ? `${cfg.userLimit} คน` : "ไม่จำกัด"}
                              </div>
                            </div>
                          </div>

                          {/* Emoji Sequence Info */}
                          <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                            <span>ลำดับอีโมจิ ({emojiList.length} รายการ - วนลูปอัตโนมัติ):</span>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "4px" }}>
                              {emojiList.slice(0, 10).map((em, idx) => (
                                <span
                                  key={idx}
                                  style={{
                                    background: "rgba(255, 255, 255, 0.04)",
                                    borderRadius: "3px",
                                    padding: "1px 5px",
                                    fontSize: "12px",
                                  }}
                                >
                                  {em}
                                </span>
                              ))}
                              {emojiList.length > 10 && (
                                <span style={{ fontSize: "11px", color: "var(--text-muted)", alignSelf: "center" }}>
                                  +{emojiList.length - 10} รายการ
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Admin Action Buttons */}
                        {isAdmin && (
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              paddingTop: "10px",
                              borderTop: "1px solid rgba(255, 255, 255, 0.05)",
                              marginTop: "8px",
                            }}
                          >
                            <button
                              onClick={() => handleSync(cfg)}
                              disabled={syncingId === cfg.id}
                              className="btn btn-secondary"
                              style={{ fontSize: "12px", padding: "4px 10px", fontWeight: 600 }}
                            >
                              {syncingId === cfg.id ? "กำลังซิงค์..." : "ซิงค์/จัดเรียง"}
                            </button>

                            <div style={{ display: "flex", gap: "6px" }}>
                              <button
                                onClick={() => openEditModal(cfg)}
                                className="btn btn-secondary"
                                style={{ fontSize: "12px", padding: "4px 10px" }}
                              >
                                แก้ไข
                              </button>
                              <button
                                onClick={() => handleDelete(cfg.id, cfg.zoneName)}
                                className="btn btn-secondary"
                                style={{ fontSize: "12px", padding: "4px 10px", color: "var(--danger)" }}
                              >
                                ลบ
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Create / Edit Zone */}
      {modalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: "540px",
              background: "#101015",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-lg)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid var(--border-subtle)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h4 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#fff" }}>
                {editingConfig ? `แก้ไขโซน: ${editingConfig.zoneName}` : "เพิ่มโซนห้องเสียงใหม่"}
              </h4>
              <button
                onClick={() => setModalOpen(false)}
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "18px" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: "20px" }}>
              {/* Presets Row (Only when creating) */}
              {!editingConfig && (
                <div style={{ marginBottom: "16px" }}>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "6px" }}>
                    เลือกแม่แบบเริ่มต้น (Presets):
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    <button
                      type="button"
                      onClick={() => applyPreset("LIVING")}
                      className="btn btn-secondary"
                      style={{ fontSize: "12px", padding: "4px 10px" }}
                    >
                      พูดคุย (ฐาน 10 / แตก 5)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset("SLEEP_GROUP")}
                      className="btn btn-secondary"
                      style={{ fontSize: "12px", padding: "4px 10px" }}
                    >
                      นอนรวม (ฐาน 3 / แตก 3)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset("SLEEP_DUO")}
                      className="btn btn-secondary"
                      style={{ fontSize: "12px", padding: "4px 10px" }}
                    >
                      นอนคู่ (ฐาน 3 / แตก 3)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset("SLEEP_SOLO")}
                      className="btn btn-secondary"
                      style={{ fontSize: "12px", padding: "4px 10px" }}
                    >
                      นอนเดี่ยว (ฐาน 3 / แตก 3)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset("GAMING")}
                      className="btn btn-secondary"
                      style={{ fontSize: "12px", padding: "4px 10px" }}
                    >
                      เล่นเกม (ฐาน 5 / แตก 5)
                    </button>
                  </div>
                </div>
              )}

              {/* Category ID / Select */}
              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px" }}>
                  หมวดหมู่ใน Discord (Category)
                </label>
                {categories.length > 0 ? (
                  <select
                    value={categoryId}
                    onChange={(e) => {
                      setCategoryId(e.target.value);
                      const cat = categories.find((c) => c.id === e.target.value);
                      if (cat) setCategoryName(cat.name);
                    }}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      background: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "var(--radius-sm)",
                      color: "#fff",
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
                    placeholder="Discord Category ID เช่น 1553703855467003925"
                    required
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      background: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "var(--radius-sm)",
                      color: "#fff",
                      fontSize: "13px",
                    }}
                  />
                )}
              </div>

              {/* Zone Name & User Limit */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px" }}>
                    ชื่อโซน
                  </label>
                  <input
                    type="text"
                    value={zoneName}
                    onChange={(e) => setZoneName(e.target.value)}
                    placeholder="เช่น พูดคุย, เล่นเกม, นอนรวม"
                    required
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      background: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "var(--radius-sm)",
                      color: "#fff",
                      fontSize: "13px",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px" }}>
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
                      padding: "8px 12px",
                      background: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "var(--radius-sm)",
                      color: "#fff",
                      fontSize: "13px",
                    }}
                  />
                </div>
              </div>

              {/* Base Rooms & Block Size */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px" }}>
                    ห้องฐานเริ่มต้น (ขั้นต่ำ)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={minChannels}
                    onChange={(e) => setMinChannels(Number(e.target.value))}
                    required
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      background: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "var(--radius-sm)",
                      color: "#fff",
                      fontSize: "13px",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px" }}>
                    ขนาดบล็อก (แตกทีละกี่ห้อง)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={blockGroupSize}
                    onChange={(e) => setBlockGroupSize(Number(e.target.value))}
                    required
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      background: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "var(--radius-sm)",
                      color: "#fff",
                      fontSize: "13px",
                    }}
                  />
                </div>
              </div>

              {/* Emojis Sequence Input */}
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px" }}>
                  รายการอีโมจิประจำห้อง (คั่นด้วยจุลภาค)
                </label>
                <input
                  type="text"
                  value={emojis}
                  onChange={(e) => setEmojis(e.target.value)}
                  placeholder="เช่น 🥪, 🥐, 🥓, 🥨, 🍿 หรือ 🛏️ หรือ 🎮"
                  required
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-sm)",
                    color: "#fff",
                    fontSize: "13px",
                  }}
                />
                <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                  หากมีคนเข้าใช้งานจนแตกห้องเกินจำนวนรายการอีโมจิ ระบบจะวนลูปนำรูปแรกกลับมาใช้ใหม่ในชุดถัดไปอัตโนมัติ
                </div>
              </div>

              {/* Toggles */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "var(--text-primary)", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={isEnabled}
                    onChange={(e) => setIsEnabled(e.target.checked)}
                  />
                  เปิดใช้งานการขยายและยุบห้องอัตโนมัติทันที
                </label>

                {!editingConfig && (
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "var(--text-muted)", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={autoSeed}
                      onChange={(e) => setAutoSeed(e.target.checked)}
                    />
                    สร้างห้องฐานที่ยังขาดใน Discord ทันทีหลังบันทึก (Auto-seed)
                  </label>
                )}
              </div>

              {/* Submit Buttons */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn btn-secondary"
                  style={{ fontSize: "13px", padding: "8px 16px" }}
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-primary"
                  style={{ fontSize: "13px", padding: "8px 20px", fontWeight: 600 }}
                >
                  {saving ? "กำลังบันทึก..." : editingConfig ? "บันทึกการแก้ไข" : "สร้างโซน"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
