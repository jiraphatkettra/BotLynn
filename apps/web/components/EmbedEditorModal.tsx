"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  DEFAULT_EMBED_PRESETS,
  EMBED_CATEGORIES,
  type EmbedConfigData,
  type EmbedFieldConfig,
} from "@/lib/embedPresets";

interface EmbedEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCategory?: string; // e.g. "shop", "moderation", "tickets", or "all"
  initialKey?: string;      // e.g. "shop_catalog"
  onSaved?: () => void;
}

interface DiscordChannel {
  id: string;
  name: string;
}

const PRESET_COLORS = [
  { name: "Lynn Blue", hex: "#2997ff" },
  { name: "Emerald Green", hex: "#30d158" },
  { name: "Sunset Orange", hex: "#ff9f0a" },
  { name: "Crimson Red", hex: "#ff453a" },
  { name: "Royal Purple", hex: "#bf5af2" },
  { name: "Cyber Yellow", hex: "#ffd60a" },
  { name: "Deep Sky", hex: "#64d2ff" },
  { name: "Obsidian Dark", hex: "#1c1c24" },
];

export default function EmbedEditorModal({
  isOpen,
  onClose,
  initialCategory = "all",
  initialKey,
  onSaved,
}: EmbedEditorModalProps) {
  // Category & Selected Embed
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [selectedKey, setSelectedKey] = useState<string | null>(initialKey || null);
  const [viewMode, setViewMode] = useState<"selector" | "editor">(
    initialKey ? "editor" : "selector"
  );

  // Embed Data
  const [embedsList, setEmbedsList] = useState<(EmbedConfigData & { isCustomized: boolean })[]>([]);
  const [config, setConfig] = useState<EmbedConfigData | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Channels for test send
  const [channels, setChannels] = useState<DiscordChannel[]>([]);
  const [selectedTestChannel, setSelectedTestChannel] = useState<string>("");
  const [testingSend, setTestingSend] = useState(false);
  const [showTestPanel, setShowTestPanel] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Textarea Ref for cursor-based variable insertion
  const descriptionTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Synchronize on modal open
  useEffect(() => {
    if (isOpen) {
      setSelectedCategory(initialCategory || "all");
      if (initialKey) {
        setSelectedKey(initialKey);
        setViewMode("editor");
      } else {
        setViewMode("selector");
      }
      loadEmbeds(initialCategory);
      loadChannels();
    }
  }, [isOpen, initialCategory, initialKey]);

  // Load embeds list from API
  async function loadEmbeds(cat?: string) {
    try {
      setLoading(true);
      const categoryParam = cat && cat !== "all" ? `?category=${cat}` : "";
      const res = await fetch(`/api/embeds${categoryParam}`);
      if (res.ok) {
        const data = await res.json();
        setEmbedsList(data.embeds || []);
      }
    } catch (err) {
      console.error("Error loading embeds:", err);
    } finally {
      setLoading(false);
    }
  }

  // Load Discord channels
  async function loadChannels() {
    try {
      const res = await fetch("/api/discord/guild-data");
      if (res.ok) {
        const data = await res.json();
        if (data.channels) {
          setChannels(data.channels);
          if (data.channels.length > 0 && !selectedTestChannel) {
            setSelectedTestChannel(data.channels[0].id);
          }
        }
      }
    } catch (err) {
      console.error("Error loading guild channels:", err);
    }
  }

  // Load specific embed config when selected
  useEffect(() => {
    if (!selectedKey) {
      setConfig(null);
      return;
    }

    async function loadConfig() {
      try {
        setLoading(true);
        const res = await fetch(`/api/embeds/${selectedKey}`);
        if (res.ok) {
          const data = await res.json();
          setConfig(data.embed);
          setViewMode("editor");
        } else {
          // Fallback to preset
          const preset = DEFAULT_EMBED_PRESETS[selectedKey!];
          if (preset) {
            setConfig(JSON.parse(JSON.stringify(preset)));
            setViewMode("editor");
          }
        }
      } catch (err) {
        console.error("Error loading embed config:", err);
        const preset = DEFAULT_EMBED_PRESETS[selectedKey!];
        if (preset) {
          setConfig(JSON.parse(JSON.stringify(preset)));
          setViewMode("editor");
        }
      } finally {
        setLoading(false);
      }
    }

    loadConfig();
  }, [selectedKey]);

  // Toast Helper
  function showToast(message: string, type: "success" | "error" = "success") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }

  // Handle Save
  async function handleSave() {
    if (!config || !selectedKey) return;
    try {
      setSaving(true);
      const res = await fetch(`/api/embeds/${selectedKey}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });

      if (res.ok) {
        showToast("บันทึกการตั้งค่า Embed เรียบร้อยแล้ว", "success");
        loadEmbeds(selectedCategory);
        if (onSaved) onSaved();
      } else {
        const errData = await res.json().catch(() => ({}));
        showToast(errData.error || "เกิดข้อผิดพลาดในการบันทึก", "error");
      }
    } catch (err: any) {
      showToast(err.message || "เกิดข้อผิดพลาดในการเชื่อมต่อ", "error");
    } finally {
      setSaving(false);
    }
  }

  // Handle Reset to Default
  async function handleReset() {
    if (!selectedKey) return;
    const confirmReset = window.confirm("คุณต้องการคืนค่า Embed นี้กลับเป็นค่าเริ่มต้นใช่หรือไม่?");
    if (!confirmReset) return;

    try {
      setResetting(true);
      const res = await fetch(`/api/embeds/${selectedKey}`, { method: "DELETE" });
      if (res.ok) {
        const preset = DEFAULT_EMBED_PRESETS[selectedKey];
        if (preset) {
          setConfig(JSON.parse(JSON.stringify(preset)));
        }
        showToast("รีเซ็ตเป็นค่าเริ่มต้นเรียบร้อยแล้ว", "success");
        loadEmbeds(selectedCategory);
        if (onSaved) onSaved();
      } else {
        showToast("ไม่สามารถรีเซ็ตค่าได้", "error");
      }
    } catch (err: any) {
      showToast(err.message || "เกิดข้อผิดพลาด", "error");
    } finally {
      setResetting(false);
    }
  }

  // Handle Test Send
  async function handleTestSend() {
    if (!config || !selectedTestChannel) {
      showToast("กรุณาเลือกห้อง Discord ที่ต้องการทดสอบ", "error");
      return;
    }

    try {
      setTestingSend(true);
      const res = await fetch("/api/embeds/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId: selectedTestChannel,
          config,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`ส่ง Embed ทดสอบเข้าห้อง #${data.channelName || "Discord"} สำเร็จ!`, "success");
        setShowTestPanel(false);
      } else {
        showToast(data.error || "ส่งทดสอบไม่สำเร็จ กรุณาตรวจสอบสิทธิ์ของบอท", "error");
      }
    } catch (err: any) {
      showToast(err.message || "เกิดข้อผิดพลาดในการส่ง", "error");
    } finally {
      setTestingSend(false);
    }
  }

  // Insert Variable Token into Description Textarea
  function insertVariable(token: string) {
    if (!config) return;
    const textarea = descriptionTextareaRef.current;
    if (!textarea) {
      setConfig({
        ...config,
        descriptionText: {
          ...config.descriptionText,
          text: config.descriptionText.text + " " + token,
        },
      });
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const oldText = config.descriptionText.text || "";
    const newText = oldText.substring(0, start) + token + oldText.substring(end);

    setConfig({
      ...config,
      descriptionText: {
        ...config.descriptionText,
        text: newText,
      },
    });

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + token.length, start + token.length);
    }, 0);
  }

  // Add New Field
  function handleAddField() {
    if (!config) return;
    const currentFields = config.fields?.items || [];
    if (currentFields.length >= 25) {
      showToast("Discord จำกัดฟิลด์สูงสุด 25 รายการ", "error");
      return;
    }

    const newField: EmbedFieldConfig = {
      id: `f_${Date.now()}`,
      name: `ฟิลด์ที่ ${currentFields.length + 1}`,
      value: "ข้อความรายละเอียดฟิลด์",
      inline: true,
      enabled: true,
    };

    setConfig({
      ...config,
      fields: {
        ...config.fields,
        items: [...currentFields, newField],
      },
    });
  }

  // Remove Field
  function handleRemoveField(fieldId: string) {
    if (!config) return;
    setConfig({
      ...config,
      fields: {
        ...config.fields,
        items: config.fields.items.filter((f) => f.id !== fieldId),
      },
    });
  }

  // Update Single Field
  function handleUpdateField(fieldId: string, patch: Partial<EmbedFieldConfig>) {
    if (!config) return;
    setConfig({
      ...config,
      fields: {
        ...config.fields,
        items: config.fields.items.map((f) =>
          f.id === fieldId ? { ...f, ...patch } : f
        ),
      },
    });
  }

  // Filter embeds for selector view
  const filteredEmbeds = useMemo(() => {
    if (selectedCategory === "all") return embedsList;
    return embedsList.filter((e) => e.category === selectedCategory);
  }, [embedsList, selectedCategory]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2100,
        backgroundColor: "rgba(0, 0, 0, 0.78)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "min(1240px, 96vw)",
          maxHeight: "92vh",
          backgroundColor: "#0d0d12",
          borderRadius: "20px",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          boxShadow: "0 24px 64px rgba(0, 0, 0, 0.8)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          color: "var(--text-primary)",
        }}
      >
        {/* ================================================================= */}
        {/* MODAL HEADER */}
        {/* ================================================================= */}
        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
            background: "rgba(255, 255, 255, 0.02)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
            {viewMode === "editor" ? (
              <button
                type="button"
                onClick={() => setViewMode("selector")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 12px",
                  borderRadius: "8px",
                  background: "rgba(255, 255, 255, 0.06)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  color: "var(--text-secondary)",
                  fontSize: "12px",
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <span>←</span>
                <span>เลือก Embed อื่น</span>
              </button>
            ) : (
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: "rgba(41, 151, 255, 0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "18px",
                }}
              >
                🎨
              </div>
            )}

            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <h2
                  style={{
                    fontSize: "16px",
                    fontWeight: 600,
                    color: "#ffffff",
                    margin: 0,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {viewMode === "editor" && config
                    ? config.name
                    : "ศูนย์ปรับแต่ง Discord Embed (Embed Studio)"}
                </h2>

                {viewMode === "editor" && config && (
                  <span
                    style={{
                      fontSize: "11px",
                      padding: "2px 8px",
                      borderRadius: "6px",
                      fontWeight: 600,
                      background: (config as any).isCustomized
                        ? "rgba(41, 151, 255, 0.18)"
                        : "rgba(255, 255, 255, 0.08)",
                      color: (config as any).isCustomized ? "#2997ff" : "var(--text-muted)",
                      border: `1px solid ${
                        (config as any).isCustomized
                          ? "rgba(41, 151, 255, 0.3)"
                          : "rgba(255, 255, 255, 0.12)"
                      }`,
                    }}
                  >
                    {(config as any).isCustomized ? "🎨 กำหนดเองแล้ว" : "ค่าเริ่มต้น"}
                  </span>
                )}
              </div>

              <p
                style={{
                  fontSize: "12px",
                  color: "var(--text-muted)",
                  margin: "2px 0 0 0",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {viewMode === "editor" && config
                  ? config.description
                  : "เลือก Embed ที่ต้องการแก้ไขเพื่อปรับแต่งข้อความ สี ฟิลด์ และเปิด/ปิดได้ทุกส่วน"}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {/* Quick Embed Switcher in Editor Mode */}
            {viewMode === "editor" && (
              <select
                value={selectedKey || ""}
                onChange={(e) => setSelectedKey(e.target.value)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "8px",
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  color: "#ffffff",
                  fontSize: "12px",
                  maxWidth: "220px",
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                {filteredEmbeds.map((e) => (
                  <option key={e.key} value={e.key} style={{ background: "#16161c", color: "#ffffff" }}>
                    {e.name}
                  </option>
                ))}
              </select>
            )}

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                color: "var(--text-secondary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                fontSize: "14px",
                transition: "all 0.15s ease",
              }}
              title="ปิดหน้าต่าง"
            >
              ✕
            </button>
          </div>
        </div>

        {/* ================================================================= */}
        {/* TOAST ALERT NOTIFICATION */}
        {/* ================================================================= */}
        {toast && (
          <div
            style={{
              padding: "10px 20px",
              background:
                toast.type === "success"
                  ? "rgba(48, 209, 88, 0.18)"
                  : "rgba(255, 69, 58, 0.18)",
              borderBottom: `1px solid ${
                toast.type === "success"
                  ? "rgba(48, 209, 88, 0.3)"
                  : "rgba(255, 69, 58, 0.3)"
              }`,
              color: toast.type === "success" ? "#30d158" : "#ff453a",
              fontSize: "13px",
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span>{toast.message}</span>
            <button
              type="button"
              onClick={() => setToast(null)}
              style={{
                background: "none",
                border: "none",
                color: "inherit",
                cursor: "pointer",
                fontSize: "12px",
              }}
            >
              ✕
            </button>
          </div>
        )}

        {/* ================================================================= */}
        {/* MODAL BODY */}
        {/* ================================================================= */}
        <div style={{ flex: 1, overflowY: "auto", display: "flex", minHeight: 0 }}>
          {viewMode === "selector" ? (
            /* ============================================================= */
            /* 1. EMBED SELECTOR VIEW (User picks which embed to configure)  */
            /* ============================================================= */
            <div style={{ flex: 1, padding: "24px", overflowY: "auto" }}>
              {/* Category Filter Tabs */}
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  overflowX: "auto",
                  paddingBottom: "16px",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                  marginBottom: "20px",
                }}
              >
                <button
                  type="button"
                  onClick={() => setSelectedCategory("all")}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "10px",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                    background:
                      selectedCategory === "all"
                        ? "rgba(41, 151, 255, 0.2)"
                        : "rgba(255, 255, 255, 0.04)",
                    border: `1px solid ${
                      selectedCategory === "all"
                        ? "rgba(41, 151, 255, 0.4)"
                        : "rgba(255, 255, 255, 0.08)"
                    }`,
                    color: selectedCategory === "all" ? "#2997ff" : "var(--text-secondary)",
                    whiteSpace: "nowrap",
                    transition: "all 0.15s ease",
                  }}
                >
                  🌐 ทั้งหมด ({embedsList.length})
                </button>

                {EMBED_CATEGORIES.map((cat) => {
                  const count = embedsList.filter((e) => e.category === cat.id).length;
                  const isActive = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      style={{
                        padding: "8px 16px",
                        borderRadius: "10px",
                        fontSize: "13px",
                        fontWeight: 600,
                        cursor: "pointer",
                        background: isActive
                          ? "rgba(41, 151, 255, 0.2)"
                          : "rgba(255, 255, 255, 0.04)",
                        border: `1px solid ${
                          isActive
                            ? "rgba(41, 151, 255, 0.4)"
                            : "rgba(255, 255, 255, 0.08)"
                        }`,
                        color: isActive ? "#2997ff" : "var(--text-secondary)",
                        whiteSpace: "nowrap",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.label}</span>
                      <span style={{ fontSize: "11px", opacity: 0.6 }}>({count})</span>
                    </button>
                  );
                })}
              </div>

              {/* Embed Cards Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                  gap: "16px",
                }}
              >
                {filteredEmbeds.map((item) => (
                  <div
                    key={item.key}
                    onClick={() => {
                      setSelectedKey(item.key);
                      setViewMode("editor");
                    }}
                    style={{
                      padding: "20px",
                      borderRadius: "14px",
                      background: "rgba(255, 255, 255, 0.03)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      cursor: "pointer",
                      transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: "14px",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)";
                      e.currentTarget.style.borderColor = "rgba(41, 151, 255, 0.35)";
                      e.currentTarget.style.transform = "translateY(-2px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)";
                      e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    <div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          justifyContent: "space-between",
                          gap: "10px",
                          marginBottom: "8px",
                        }}
                      >
                        <h4
                          style={{
                            fontSize: "14px",
                            fontWeight: 600,
                            color: "#ffffff",
                            margin: 0,
                          }}
                        >
                          {item.name}
                        </h4>

                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 600,
                            padding: "2px 7px",
                            borderRadius: "6px",
                            whiteSpace: "nowrap",
                            background: item.isCustomized
                              ? "rgba(41, 151, 255, 0.15)"
                              : "rgba(255, 255, 255, 0.06)",
                            color: item.isCustomized ? "#2997ff" : "var(--text-muted)",
                            border: `1px solid ${
                              item.isCustomized
                                ? "rgba(41, 151, 255, 0.3)"
                                : "rgba(255, 255, 255, 0.1)"
                            }`,
                          }}
                        >
                          {item.isCustomized ? "🎨 ปรับแต่งแล้ว" : "ค่าเริ่มต้น"}
                        </span>
                      </div>

                      <p
                        style={{
                          fontSize: "12px",
                          color: "var(--text-secondary)",
                          lineHeight: 1.5,
                          margin: 0,
                        }}
                      >
                        {item.description}
                      </p>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        paddingTop: "12px",
                        borderTop: "1px solid rgba(255, 255, 255, 0.06)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span
                          style={{
                            width: "10px",
                            height: "10px",
                            borderRadius: "50%",
                            backgroundColor: item.color?.hex || "#2997ff",
                            display: "inline-block",
                          }}
                        />
                        <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                          {item.supportedVariables?.length || 0} ตัวแปร
                        </span>
                      </div>

                      <span
                        style={{
                          fontSize: "12px",
                          color: "var(--accent)",
                          fontWeight: 500,
                        }}
                      >
                        คลิกเพื่อแก้ไข →
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* ============================================================= */
            /* 2. EMBED DETAILED EDITOR VIEW (Split Screen: Edit + Preview)  */
            /* ============================================================= */
            config && (
              <div
                style={{
                  flex: 1,
                  display: "grid",
                  gridTemplateColumns: "1.15fr 0.85fr",
                  minHeight: 0,
                  overflow: "hidden",
                }}
              >
                {/* --------------------------------------------------------- */}
                {/* LEFT COLUMN: EDIT FORM CONTROLS                           */}
                {/* --------------------------------------------------------- */}
                <div
                  style={{
                    padding: "20px 24px",
                    overflowY: "auto",
                    borderRight: "1px solid rgba(255, 255, 255, 0.08)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "20px",
                  }}
                >
                  {/* VARIABLE PLACEHOLDER CHIPS TOOLBAR */}
                  {config.supportedVariables && config.supportedVariables.length > 0 && (
                    <div
                      style={{
                        padding: "14px 16px",
                        borderRadius: "12px",
                        background: "rgba(41, 151, 255, 0.06)",
                        border: "1px solid rgba(41, 151, 255, 0.2)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "12px",
                          fontWeight: 600,
                          color: "#2997ff",
                          marginBottom: "8px",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <span>💡</span>
                        <span>ตัวแปรระบบที่แทรกได้ (คลิกเพื่อแทรกลงในข้อความ):</span>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                        {config.supportedVariables.map((v) => (
                          <button
                            key={v.key}
                            type="button"
                            onClick={() => insertVariable(v.key)}
                            style={{
                              padding: "4px 8px",
                              borderRadius: "6px",
                              background: "rgba(255, 255, 255, 0.08)",
                              border: "1px solid rgba(255, 255, 255, 0.12)",
                              color: "#ffffff",
                              fontSize: "11px",
                              fontFamily: "var(--font-mono, monospace)",
                              cursor: "pointer",
                              transition: "all 0.15s ease",
                            }}
                            title={`คลิกเพื่อใส่ ${v.key} (${v.label} เช่น: ${v.example})`}
                          >
                            <span style={{ color: "var(--accent)" }}>{v.key}</span>
                            <span style={{ color: "var(--text-muted)", marginLeft: "4px" }}>
                              • {v.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 1. ACCENT COLOR SECTION */}
                  <SectionCard
                    title="1. สีแถบไฮไลท์ (Accent Border Color)"
                    icon="🎨"
                    enabled={config.color.enabled}
                    onToggle={(enabled) =>
                      setConfig({ ...config, color: { ...config.color, enabled } })
                    }
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <input
                          type="color"
                          value={config.color.hex}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              color: { ...config.color, hex: e.target.value },
                            })
                          }
                          style={{
                            width: "36px",
                            height: "36px",
                            border: "none",
                            borderRadius: "8px",
                            cursor: "pointer",
                            background: "transparent",
                          }}
                        />
                        <input
                          type="text"
                          value={config.color.hex}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              color: { ...config.color, hex: e.target.value },
                            })
                          }
                          placeholder="#2997ff"
                          style={{
                            flex: 1,
                            padding: "8px 12px",
                            borderRadius: "8px",
                            background: "rgba(255, 255, 255, 0.04)",
                            border: "1px solid rgba(255, 255, 255, 0.1)",
                            color: "#ffffff",
                            fontSize: "13px",
                            fontFamily: "var(--font-mono, monospace)",
                          }}
                        />
                      </div>

                      {/* Color Presets */}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                        {PRESET_COLORS.map((p) => (
                          <button
                            key={p.hex}
                            type="button"
                            onClick={() =>
                              setConfig({
                                ...config,
                                color: { ...config.color, hex: p.hex },
                              })
                            }
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                              padding: "4px 8px",
                              borderRadius: "6px",
                              background:
                                config.color.hex.toLowerCase() === p.hex.toLowerCase()
                                  ? "rgba(255, 255, 255, 0.15)"
                                  : "rgba(255, 255, 255, 0.04)",
                              border: `1px solid ${
                                config.color.hex.toLowerCase() === p.hex.toLowerCase()
                                  ? p.hex
                                  : "rgba(255, 255, 255, 0.08)"
                              }`,
                              color: "#ffffff",
                              fontSize: "11px",
                              cursor: "pointer",
                            }}
                          >
                            <span
                              style={{
                                width: "8px",
                                height: "8px",
                                borderRadius: "50%",
                                backgroundColor: p.hex,
                              }}
                            />
                            <span>{p.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </SectionCard>

                  {/* 2. AUTHOR SECTION */}
                  <SectionCard
                    title="2. ข้อมูลผู้ส่ง (Author)"
                    icon="👤"
                    enabled={config.author.enabled}
                    onToggle={(enabled) =>
                      setConfig({ ...config, author: { ...config.author, enabled } })
                    }
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      <div>
                        <label style={{ fontSize: "11px", color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>
                          ชื่อ Author (Author Name)
                        </label>
                        <input
                          type="text"
                          value={config.author.name}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              author: { ...config.author, name: e.target.value },
                            })
                          }
                          placeholder="เช่น LynnBot Operations System"
                          style={{
                            width: "100%",
                            padding: "8px 12px",
                            borderRadius: "8px",
                            background: "rgba(255, 255, 255, 0.04)",
                            border: "1px solid rgba(255, 255, 255, 0.1)",
                            color: "#ffffff",
                            fontSize: "13px",
                          }}
                        />
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                        <div>
                          <label style={{ fontSize: "11px", color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>
                            ไอคอน Author (Icon URL)
                          </label>
                          <input
                            type="text"
                            value={config.author.iconUrl}
                            onChange={(e) =>
                              setConfig({
                                ...config,
                                author: { ...config.author, iconUrl: e.target.value },
                              })
                            }
                            placeholder="https://..."
                            style={{
                              width: "100%",
                              padding: "8px 12px",
                              borderRadius: "8px",
                              background: "rgba(255, 255, 255, 0.04)",
                              border: "1px solid rgba(255, 255, 255, 0.1)",
                              color: "#ffffff",
                              fontSize: "12px",
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: "11px", color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>
                            ลิงก์ Author (Author URL)
                          </label>
                          <input
                            type="text"
                            value={config.author.url}
                            onChange={(e) =>
                              setConfig({
                                ...config,
                                author: { ...config.author, url: e.target.value },
                              })
                            }
                            placeholder="https://..."
                            style={{
                              width: "100%",
                              padding: "8px 12px",
                              borderRadius: "8px",
                              background: "rgba(255, 255, 255, 0.04)",
                              border: "1px solid rgba(255, 255, 255, 0.1)",
                              color: "#ffffff",
                              fontSize: "12px",
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </SectionCard>

                  {/* 3. TITLE SECTION */}
                  <SectionCard
                    title="3. หัวข้อหลัก (Title)"
                    icon="🏷️"
                    enabled={config.title.enabled}
                    onToggle={(enabled) =>
                      setConfig({ ...config, title: { ...config.title, enabled } })
                    }
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      <div>
                        <label style={{ fontSize: "11px", color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>
                          ข้อความหัวข้อ (Title Text)
                        </label>
                        <input
                          type="text"
                          value={config.title.text}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              title: { ...config.title, text: e.target.value },
                            })
                          }
                          placeholder="หัวข้อการ์ด..."
                          style={{
                            width: "100%",
                            padding: "8px 12px",
                            borderRadius: "8px",
                            background: "rgba(255, 255, 255, 0.04)",
                            border: "1px solid rgba(255, 255, 255, 0.1)",
                            color: "#ffffff",
                            fontSize: "13px",
                            fontWeight: 600,
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: "11px", color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>
                          ลิงก์หัวข้อ (Title URL - เมื่อคลิกหัวข้อ)
                        </label>
                        <input
                          type="text"
                          value={config.title.url}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              title: { ...config.title, url: e.target.value },
                            })
                          }
                          placeholder="https://... (เว้นว่างได้)"
                          style={{
                            width: "100%",
                            padding: "8px 12px",
                            borderRadius: "8px",
                            background: "rgba(255, 255, 255, 0.04)",
                            border: "1px solid rgba(255, 255, 255, 0.1)",
                            color: "#ffffff",
                            fontSize: "12px",
                          }}
                        />
                      </div>
                    </div>
                  </SectionCard>

                  {/* 4. DESCRIPTION SECTION */}
                  <SectionCard
                    title="4. ข้อความรายละเอียด (Description)"
                    icon="📝"
                    enabled={config.descriptionText.enabled}
                    onToggle={(enabled) =>
                      setConfig({
                        ...config,
                        descriptionText: { ...config.descriptionText, enabled },
                      })
                    }
                  >
                    <div>
                      <textarea
                        ref={descriptionTextareaRef}
                        rows={7}
                        value={config.descriptionText.text}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            descriptionText: {
                              ...config.descriptionText,
                              text: e.target.value,
                            },
                          })
                        }
                        placeholder="พิมพ์เนื้อหาที่นี่... รองรับการขึ้นบรรทัดใหม่ ตัวหนา **คำ** และตัวแปร {user}"
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          borderRadius: "8px",
                          background: "rgba(255, 255, 255, 0.04)",
                          border: "1px solid rgba(255, 255, 255, 0.1)",
                          color: "#ffffff",
                          fontSize: "13px",
                          lineHeight: 1.6,
                          fontFamily: "var(--font-mono, monospace)",
                          resize: "vertical",
                        }}
                      />
                      <div
                        style={{
                          fontSize: "11px",
                          color: "var(--text-muted)",
                          marginTop: "6px",
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <span>รองรับ Markdown Discord (เช่น **หนา**, *เอียง*, &gt; อ้างอิง)</span>
                        <span>{config.descriptionText.text?.length || 0} / 4096 ตัวอักษร</span>
                      </div>
                    </div>
                  </SectionCard>

                  {/* 5. FIELDS SECTION */}
                  <SectionCard
                    title={`5. ฟิลด์ข้อมูลเสริม (Fields - ${config.fields?.items?.length || 0})`}
                    icon="📑"
                    enabled={config.fields.enabled}
                    onToggle={(enabled) =>
                      setConfig({ ...config, fields: { ...config.fields, enabled } })
                    }
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      {config.fields?.items?.map((field, idx) => (
                        <div
                          key={field.id}
                          style={{
                            padding: "12px",
                            borderRadius: "10px",
                            background: "rgba(255, 255, 255, 0.03)",
                            border: "1px solid rgba(255, 255, 255, 0.08)",
                            display: "flex",
                            flexDirection: "column",
                            gap: "8px",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--accent)" }}>
                                ฟิลด์ #{idx + 1}
                              </span>
                              <label style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "var(--text-secondary)", cursor: "pointer" }}>
                                <input
                                  type="checkbox"
                                  checked={field.enabled}
                                  onChange={(e) =>
                                    handleUpdateField(field.id, { enabled: e.target.checked })
                                  }
                                />
                                แสดงผล
                              </label>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <label style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "var(--text-secondary)", cursor: "pointer" }}>
                                <input
                                  type="checkbox"
                                  checked={field.inline}
                                  onChange={(e) =>
                                    handleUpdateField(field.id, { inline: e.target.checked })
                                  }
                                />
                                จัดแนวนอน (Inline)
                              </label>

                              <button
                                type="button"
                                onClick={() => handleRemoveField(field.id)}
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "var(--danger)",
                                  fontSize: "12px",
                                  cursor: "pointer",
                                  padding: "2px 6px",
                                }}
                                title="ลบฟิลด์นี้"
                              >
                                ✕
                              </button>
                            </div>
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "8px" }}>
                            <input
                              type="text"
                              value={field.name}
                              onChange={(e) =>
                                handleUpdateField(field.id, { name: e.target.value })
                              }
                              placeholder="ชื่อฟิลด์"
                              style={{
                                padding: "6px 10px",
                                borderRadius: "6px",
                                background: "rgba(255, 255, 255, 0.04)",
                                border: "1px solid rgba(255, 255, 255, 0.1)",
                                color: "#ffffff",
                                fontSize: "12px",
                                fontWeight: 600,
                              }}
                            />
                            <input
                              type="text"
                              value={field.value}
                              onChange={(e) =>
                                handleUpdateField(field.id, { value: e.target.value })
                              }
                              placeholder="รายละเอียดฟิลด์"
                              style={{
                                padding: "6px 10px",
                                borderRadius: "6px",
                                background: "rgba(255, 255, 255, 0.04)",
                                border: "1px solid rgba(255, 255, 255, 0.1)",
                                color: "#ffffff",
                                fontSize: "12px",
                              }}
                            />
                          </div>
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={handleAddField}
                        style={{
                          padding: "8px 12px",
                          borderRadius: "8px",
                          background: "rgba(255, 255, 255, 0.04)",
                          border: "1px dashed rgba(255, 255, 255, 0.16)",
                          color: "var(--text-secondary)",
                          fontSize: "12px",
                          fontWeight: 500,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px",
                        }}
                      >
                        <span>+ เพิ่มฟิลด์ใหม่ (Add Field)</span>
                      </button>
                    </div>
                  </SectionCard>

                  {/* 6. THUMBNAIL SECTION */}
                  <SectionCard
                    title="6. รูปภาพขนาดย่อ (Thumbnail - มุมขวาบน)"
                    icon="🖼️"
                    enabled={config.thumbnail.enabled}
                    onToggle={(enabled) =>
                      setConfig({ ...config, thumbnail: { ...config.thumbnail, enabled } })
                    }
                  >
                    <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                      <input
                        type="text"
                        value={config.thumbnail.url}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            thumbnail: { ...config.thumbnail, url: e.target.value },
                          })
                        }
                        placeholder="https://... (URL รูปภาพ PNG, JPG, WEBP)"
                        style={{
                          flex: 1,
                          padding: "8px 12px",
                          borderRadius: "8px",
                          background: "rgba(255, 255, 255, 0.04)",
                          border: "1px solid rgba(255, 255, 255, 0.1)",
                          color: "#ffffff",
                          fontSize: "12px",
                        }}
                      />
                      {config.thumbnail.url && (
                        <img
                          src={config.thumbnail.url}
                          alt="Thumbnail preview"
                          style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "6px",
                            objectFit: "cover",
                            border: "1px solid rgba(255, 255, 255, 0.12)",
                          }}
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                          }}
                        />
                      )}
                    </div>
                  </SectionCard>

                  {/* 7. LARGE IMAGE SECTION */}
                  <SectionCard
                    title="7. รูปภาพแบนเนอร์ใหญ่ (Large Image Banner)"
                    icon="🌄"
                    enabled={config.image.enabled}
                    onToggle={(enabled) =>
                      setConfig({ ...config, image: { ...config.image, enabled } })
                    }
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      <input
                        type="text"
                        value={config.image.url}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            image: { ...config.image, url: e.target.value },
                          })
                        }
                        placeholder="https://... (URL รูปภาพขนาดใหญ่แสดงใต้ Embed)"
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          borderRadius: "8px",
                          background: "rgba(255, 255, 255, 0.04)",
                          border: "1px solid rgba(255, 255, 255, 0.1)",
                          color: "#ffffff",
                          fontSize: "12px",
                        }}
                      />
                      {config.image.url && (
                        <img
                          src={config.image.url}
                          alt="Banner preview"
                          style={{
                            width: "100%",
                            maxHeight: "120px",
                            borderRadius: "6px",
                            objectFit: "cover",
                            border: "1px solid rgba(255, 255, 255, 0.12)",
                          }}
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                          }}
                        />
                      )}
                    </div>
                  </SectionCard>

                  {/* 8. FOOTER SECTION */}
                  <SectionCard
                    title="8. ข้อความส่วนท้าย (Footer)"
                    icon="📎"
                    enabled={config.footer.enabled}
                    onToggle={(enabled) =>
                      setConfig({ ...config, footer: { ...config.footer, enabled } })
                    }
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      <div>
                        <label style={{ fontSize: "11px", color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>
                          ข้อความ Footer (Footer Text)
                        </label>
                        <input
                          type="text"
                          value={config.footer.text}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              footer: { ...config.footer, text: e.target.value },
                            })
                          }
                          placeholder="เช่น LynnBot Operations System • Shop"
                          style={{
                            width: "100%",
                            padding: "8px 12px",
                            borderRadius: "8px",
                            background: "rgba(255, 255, 255, 0.04)",
                            border: "1px solid rgba(255, 255, 255, 0.1)",
                            color: "#ffffff",
                            fontSize: "12px",
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: "11px", color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>
                          ไอคอน Footer (Footer Icon URL)
                        </label>
                        <input
                          type="text"
                          value={config.footer.iconUrl}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              footer: { ...config.footer, iconUrl: e.target.value },
                            })
                          }
                          placeholder="https://... (เว้นว่างได้)"
                          style={{
                            width: "100%",
                            padding: "8px 12px",
                            borderRadius: "8px",
                            background: "rgba(255, 255, 255, 0.04)",
                            border: "1px solid rgba(255, 255, 255, 0.1)",
                            color: "#ffffff",
                            fontSize: "12px",
                          }}
                        />
                      </div>
                    </div>
                  </SectionCard>

                  {/* 9. TIMESTAMP SECTION */}
                  <SectionCard
                    title="9. เวลาประทับ (Timestamp)"
                    icon="⏰"
                    enabled={config.timestamp.enabled}
                    onToggle={(enabled) =>
                      setConfig({
                        ...config,
                        timestamp: { enabled },
                      })
                    }
                  >
                    <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: 0 }}>
                      เมื่อเปิดใช้งาน Discord จะแสดงเวลาส่งข้อความอัตโนมัติ (เช่น วันนี้ เวลา 18:00) ต่อท้ายข้อความ Footer
                    </p>
                  </SectionCard>
                </div>

                {/* --------------------------------------------------------- */}
                {/* RIGHT COLUMN: DISCORD LIVE DARK THEME PREVIEW             */}
                {/* --------------------------------------------------------- */}
                <div
                  style={{
                    padding: "24px",
                    backgroundColor: "#1e1f22",
                    display: "flex",
                    flexDirection: "column",
                    gap: "14px",
                    overflowY: "auto",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span
                        style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          background: "#30d158",
                          display: "inline-block",
                        }}
                      />
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: 600,
                          color: "var(--text-secondary)",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        }}
                      >
                        Discord Dark Theme Preview
                      </span>
                    </div>

                    <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                      อัปเดตแบบเรียลไทม์
                    </span>
                  </div>

                  {/* Discord Chat Bubble Emulation */}
                  <div
                    style={{
                      backgroundColor: "#313338",
                      borderRadius: "12px",
                      padding: "16px",
                      display: "flex",
                      gap: "16px",
                      border: "1px solid rgba(255, 255, 255, 0.05)",
                    }}
                  >
                    {/* Bot Avatar */}
                    <div
                      style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "50%",
                        backgroundColor: "#5865F2",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        fontWeight: 700,
                        color: "#ffffff",
                        fontSize: "16px",
                      }}
                    >
                      L
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Bot Header Line */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          marginBottom: "6px",
                        }}
                      >
                        <span style={{ fontSize: "14px", fontWeight: 600, color: "#ffffff" }}>
                          LynnBot
                        </span>
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 700,
                            padding: "1px 5px",
                            borderRadius: "4px",
                            backgroundColor: "#5865F2",
                            color: "#ffffff",
                          }}
                        >
                          BOT
                        </span>
                        <span style={{ fontSize: "11px", color: "#949ba4" }}>
                          วันนี้ เวลา 18:00
                        </span>
                      </div>

                      {/* Discord Embed Box */}
                      <div
                        style={{
                          backgroundColor: "#2b2d31",
                          borderRadius: "4px",
                          borderLeft: config.color.enabled
                            ? `4px solid ${config.color.hex || "#2997ff"}`
                            : "4px solid #1e1f22",
                          padding: "14px 16px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "10px",
                          maxWidth: "520px",
                          position: "relative",
                        }}
                      >
                        {/* Top-Right Thumbnail */}
                        {config.thumbnail.enabled && config.thumbnail.url && (
                          <div
                            style={{
                              position: "absolute",
                              top: "14px",
                              right: "16px",
                              width: "72px",
                              height: "72px",
                              borderRadius: "4px",
                              overflow: "hidden",
                            }}
                          >
                            <img
                              src={config.thumbnail.url}
                              alt="thumbnail"
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = "none";
                              }}
                            />
                          </div>
                        )}

                        {/* Author */}
                        {config.author.enabled && config.author.name && (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              fontSize: "12px",
                              fontWeight: 600,
                              color: "#ffffff",
                            }}
                          >
                            {config.author.iconUrl && (
                              <img
                                src={config.author.iconUrl}
                                alt="author icon"
                                style={{
                                  width: "20px",
                                  height: "20px",
                                  borderRadius: "50%",
                                  objectFit: "cover",
                                }}
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = "none";
                                }}
                              />
                            )}
                            <span>{config.author.name}</span>
                          </div>
                        )}

                        {/* Title */}
                        {config.title.enabled && config.title.text && (
                          <div
                            style={{
                              fontSize: "15px",
                              fontWeight: 700,
                              color: config.title.url ? "#00a8fc" : "#ffffff",
                              cursor: config.title.url ? "pointer" : "default",
                              paddingRight:
                                config.thumbnail.enabled && config.thumbnail.url
                                  ? "80px"
                                  : "0px",
                            }}
                          >
                            {config.title.text}
                          </div>
                        )}

                        {/* Description */}
                        {config.descriptionText.enabled && config.descriptionText.text && (
                          <div
                            style={{
                              fontSize: "13px",
                              color: "#dbdee1",
                              lineHeight: 1.5,
                              whiteSpace: "pre-wrap",
                              wordBreak: "break-word",
                              paddingRight:
                                config.thumbnail.enabled && config.thumbnail.url
                                  ? "80px"
                                  : "0px",
                            }}
                          >
                            {config.descriptionText.text}
                          </div>
                        )}

                        {/* Fields Grid */}
                        {config.fields.enabled &&
                          config.fields.items &&
                          config.fields.items.filter((f) => f.enabled).length > 0 && (
                            <div
                              style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: "10px",
                                marginTop: "4px",
                              }}
                            >
                              {config.fields.items
                                .filter((f) => f.enabled)
                                .map((f) => (
                                  <div
                                    key={f.id}
                                    style={{
                                      flex: f.inline ? "1 1 30%" : "1 1 100%",
                                      minWidth: f.inline ? "120px" : "100%",
                                    }}
                                  >
                                    <div
                                      style={{
                                        fontSize: "12px",
                                        fontWeight: 600,
                                        color: "#ffffff",
                                        marginBottom: "2px",
                                      }}
                                    >
                                      {f.name}
                                    </div>
                                    <div
                                      style={{
                                        fontSize: "13px",
                                        color: "#dbdee1",
                                        lineHeight: 1.4,
                                        wordBreak: "break-word",
                                      }}
                                    >
                                      {f.value}
                                    </div>
                                  </div>
                                ))}
                            </div>
                          )}

                        {/* Image Banner */}
                        {config.image.enabled && config.image.url && (
                          <div
                            style={{
                              marginTop: "8px",
                              borderRadius: "4px",
                              overflow: "hidden",
                              maxWidth: "100%",
                            }}
                          >
                            <img
                              src={config.image.url}
                              alt="banner"
                              style={{
                                width: "100%",
                                maxHeight: "240px",
                                objectFit: "cover",
                                display: "block",
                              }}
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = "none";
                              }}
                            />
                          </div>
                        )}

                        {/* Footer & Timestamp */}
                        {(config.footer.enabled || config.timestamp.enabled) && (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              fontSize: "11px",
                              color: "#949ba4",
                              marginTop: "4px",
                            }}
                          >
                            {config.footer.enabled && config.footer.iconUrl && (
                              <img
                                src={config.footer.iconUrl}
                                alt="footer icon"
                                style={{
                                  width: "16px",
                                  height: "16px",
                                  borderRadius: "50%",
                                  objectFit: "cover",
                                }}
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = "none";
                                }}
                              />
                            )}
                            {config.footer.enabled && (
                              <span>{config.footer.text || "LynnBot"}</span>
                            )}
                            {config.footer.enabled && config.timestamp.enabled && (
                              <span>•</span>
                            )}
                            {config.timestamp.enabled && <span>วันนี้ เวลา 18:00</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      padding: "12px 14px",
                      borderRadius: "10px",
                      background: "rgba(255, 255, 255, 0.03)",
                      border: "1px solid rgba(255, 255, 255, 0.06)",
                      fontSize: "11px",
                      color: "var(--text-muted)",
                      lineHeight: 1.5,
                    }}
                  >
                    💡 **คำแนะนำ:** ทุกส่วนของการ์ดสามารถเปิดหรือปิดสวิตช์ได้ตามต้องการ หากปิดส่วนใด ส่วนนั้นจะไม่ถูกส่งไปยัง Discord
                  </div>
                </div>
              </div>
            )
          )}
        </div>

        {/* ================================================================= */}
        {/* MODAL FOOTER ACTIONS */}
        {/* ================================================================= */}
        {viewMode === "editor" && config && (
          <div
            style={{
              padding: "16px 24px",
              borderTop: "1px solid rgba(255, 255, 255, 0.08)",
              background: "rgba(255, 255, 255, 0.02)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            {/* Left: Reset to Default */}
            <button
              type="button"
              disabled={resetting || saving}
              onClick={handleReset}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                borderRadius: "10px",
                background: "rgba(255, 69, 58, 0.1)",
                border: "1px solid rgba(255, 69, 58, 0.25)",
                color: "#ff453a",
                fontSize: "12px",
                fontWeight: 600,
                cursor: resetting ? "not-allowed" : "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <span>↺</span>
              <span>{resetting ? "กำลังรีเซ็ต..." : "รีเซ็ตค่าเริ่มต้น"}</span>
            </button>

            {/* Right: Test Send + Save */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              {/* Test Send Dropdown Panel */}
              <div style={{ position: "relative" }}>
                <button
                  type="button"
                  onClick={() => setShowTestPanel(!showTestPanel)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "8px 14px",
                    borderRadius: "10px",
                    background: "rgba(255, 255, 255, 0.06)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    color: "var(--text-secondary)",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  <span>🚀</span>
                  <span>ทดสอบส่งเข้า Discord</span>
                </button>

                {showTestPanel && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: "100%",
                      right: 0,
                      marginBottom: "8px",
                      width: "320px",
                      padding: "16px",
                      borderRadius: "14px",
                      background: "#16161c",
                      border: "1px solid rgba(255, 255, 255, 0.14)",
                      boxShadow: "0 12px 32px rgba(0, 0, 0, 0.6)",
                      zIndex: 100,
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                    }}
                  >
                    <div style={{ fontSize: "12px", fontWeight: 600, color: "#ffffff" }}>
                      เลือกห้อง Discord เพื่อทดสอบ
                    </div>
                    <select
                      value={selectedTestChannel}
                      onChange={(e) => setSelectedTestChannel(e.target.value)}
                      style={{
                        padding: "8px 10px",
                        borderRadius: "8px",
                        background: "rgba(255, 255, 255, 0.06)",
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                        color: "#ffffff",
                        fontSize: "12px",
                        outline: "none",
                      }}
                    >
                      {channels.map((ch) => (
                        <option key={ch.id} value={ch.id} style={{ background: "#16161c" }}>
                          #{ch.name}
                        </option>
                      ))}
                    </select>
                    <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                      <button
                        type="button"
                        onClick={() => setShowTestPanel(false)}
                        style={{
                          padding: "6px 10px",
                          borderRadius: "6px",
                          background: "none",
                          border: "none",
                          color: "var(--text-muted)",
                          fontSize: "11px",
                          cursor: "pointer",
                        }}
                      >
                        ยกเลิก
                      </button>
                      <button
                        type="button"
                        disabled={testingSend}
                        onClick={handleTestSend}
                        style={{
                          padding: "6px 12px",
                          borderRadius: "6px",
                          background: "var(--accent)",
                          border: "none",
                          color: "#ffffff",
                          fontSize: "12px",
                          fontWeight: 600,
                          cursor: testingSend ? "not-allowed" : "pointer",
                        }}
                      >
                        {testingSend ? "กำลังส่ง..." : "ส่งทันที"}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Save Button */}
              <button
                type="button"
                disabled={saving}
                onClick={handleSave}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 20px",
                  borderRadius: "10px",
                  background: "var(--accent)",
                  border: "none",
                  color: "#ffffff",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: saving ? "not-allowed" : "pointer",
                  boxShadow: "0 2px 8px rgba(41, 151, 255, 0.3)",
                }}
              >
                <span>💾</span>
                <span>{saving ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Sub-Component: Section Card with Toggle Switch
function SectionCard({
  title,
  icon,
  enabled,
  onToggle,
  children,
}: {
  title: string;
  icon: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        borderRadius: "14px",
        background: enabled ? "rgba(255, 255, 255, 0.03)" : "rgba(255, 255, 255, 0.015)",
        border: `1px solid ${enabled ? "rgba(255, 255, 255, 0.08)" : "rgba(255, 255, 255, 0.04)"}`,
        overflow: "hidden",
        transition: "all 0.15s ease",
      }}
    >
      {/* Section Header */}
      <div
        style={{
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: enabled ? "1px solid rgba(255, 255, 255, 0.06)" : "none",
          background: enabled ? "rgba(255, 255, 255, 0.02)" : "transparent",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span>{icon}</span>
          <span style={{ fontSize: "13px", fontWeight: 600, color: enabled ? "#ffffff" : "var(--text-disabled)" }}>
            {title}
          </span>
        </div>

        {/* Toggle Switch */}
        <label
          style={{
            position: "relative",
            display: "inline-block",
            width: "38px",
            height: "22px",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onToggle(e.target.checked)}
            style={{ opacity: 0, width: 0, height: 0 }}
          />
          <span
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: enabled ? "var(--accent)" : "rgba(255, 255, 255, 0.15)",
              borderRadius: "22px",
              transition: "0.2s",
            }}
          >
            <span
              style={{
                position: "absolute",
                height: "16px",
                width: "16px",
                left: enabled ? "19px" : "3px",
                bottom: "3px",
                backgroundColor: "#ffffff",
                borderRadius: "50%",
                transition: "0.2s",
              }}
            />
          </span>
        </label>
      </div>

      {/* Section Content */}
      {enabled && <div style={{ padding: "16px" }}>{children}</div>}
    </div>
  );
}
