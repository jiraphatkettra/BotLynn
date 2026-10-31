"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  DEFAULT_EMBED_PRESETS,
  EMBED_CATEGORIES,
  type EmbedConfigData,
  type EmbedFieldConfig,
} from "@/lib/embedPresets";
import {
  Palette,
  Globe,
  User,
  Tag,
  AlignLeft,
  Layers,
  Image as ImageIcon,
  ImagePlus,
  Paperclip,
  Clock,
  Info,
  Send,
  Save,
  RotateCcw,
  X,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  ShoppingBag,
  Scale,
  Ticket,
  Calendar,
  Wallet,
  UserCheck,
} from "lucide-react";

interface EmbedEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCategory?: string;
  initialKey?: string;
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

function getCategoryIcon(catId: string, className = "w-4 h-4") {
  switch (catId) {
    case "shop":
      return <ShoppingBag className={className} />;
    case "moderation":
      return <Scale className={className} />;
    case "tickets":
      return <Ticket className={className} />;
    case "attendance":
      return <Clock className={className} />;
    case "leaves":
      return <Calendar className={className} />;
    case "wallet":
      return <Wallet className={className} />;
    case "welcome":
      return <UserCheck className={className} />;
    default:
      return <Globe className={className} />;
  }
}

export default function EmbedEditorModal({
  isOpen,
  onClose,
  initialCategory = "all",
  initialKey,
  onSaved,
}: EmbedEditorModalProps) {
  // Navigation & View Mode
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

  // Accordion open/close state for sections
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    color: true,
    author: true,
    title: true,
    description: true,
    fields: true,
    thumbnail: true,
    image: true,
    footer: true,
    timestamp: true,
  });

  // Discord channels for test sending
  const [channels, setChannels] = useState<DiscordChannel[]>([]);
  const [selectedTestChannel, setSelectedTestChannel] = useState<string>("");
  const [testingSend, setTestingSend] = useState(false);
  const [showTestPanel, setShowTestPanel] = useState(false);

  // Toast feedback
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Textarea Ref for cursor-based variable token insertion
  const descriptionTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Modal open synchronizer
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

  // Load guild channels
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
      console.error("Error loading channels:", err);
    }
  }

  // Load config when selectedKey changes
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

  // Toggle Accordion section
  function toggleSection(sectionKey: string) {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  }

  function expandAll() {
    setExpandedSections({
      color: true,
      author: true,
      title: true,
      description: true,
      fields: true,
      thumbnail: true,
      image: true,
      footer: true,
      timestamp: true,
    });
  }

  function collapseAll() {
    setExpandedSections({
      color: false,
      author: false,
      title: false,
      description: false,
      fields: false,
      thumbnail: false,
      image: false,
      footer: false,
      timestamp: false,
    });
  }

  // Save Config
  async function handleSave() {
    if (!config || !selectedKey) return;
    try {
      setSaving(true);
      const res = await fetch(`/api/embeds/${selectedKey}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config, ...config }),
      });

      if (res.ok) {
        showToast("บันทึกการตั้งค่า Discord Embed เรียบร้อยแล้ว", "success");
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

  // Reset to Default
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

  // Test Send to Discord Channel
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
          embedConfig: config,
          config,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`ส่ง Embed ทดสอบเข้าห้อง #${data.channelName || "Discord"} สำเร็จ!`, "success");
        setShowTestPanel(false);
      } else {
        showToast(data.error || "ส่งทดสอบไม่สำเร็จ กรุณาตรวจสอบสิทธิ์บอทในห้องดังกล่าว", "error");
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
          text: (config.descriptionText.text || "") + " " + token,
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

  // Add Field
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

    setExpandedSections((prev) => ({ ...prev, fields: true }));
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
      className="fixed inset-0 z-[2100] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-[96vw] max-w-[1440px] h-[92vh] max-h-[92vh] flex flex-col bg-[#070809] border border-white/[0.08] rounded-none overflow-hidden text-[#f5f5f7] shadow-2xl">
        {/* ================================================================= */}
        {/* HEADER BAR                                                        */}
        {/* ================================================================= */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-[#0c0d0f]/95 shrink-0">
          <div className="flex items-center gap-4 min-w-0">
            {viewMode === "editor" ? (
              <button
                type="button"
                onClick={() => setViewMode("selector")}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-mono font-medium text-neutral-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] rounded-none transition-colors"
              >
                <span>←</span>
                <span>เลือก Embed อื่น</span>
              </button>
            ) : (
              <div className="w-8 h-8 flex items-center justify-center bg-blue-500/10 border border-blue-500/30 text-blue-400 shrink-0">
                <Palette className="w-4 h-4" />
              </div>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <span className="font-mono text-[10px] tracking-wider text-blue-400 uppercase">
                  EMBED_STUDIO // {viewMode === "editor" ? "CONFIG" : "CATALOG"}
                </span>
                {viewMode === "editor" && config && (
                  <span
                    className={`font-mono text-[10px] px-2 py-0.5 border ${
                      (config as any).isCustomized
                        ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
                        : "bg-white/[0.04] border-white/[0.08] text-neutral-400"
                    }`}
                  >
                    {(config as any).isCustomized ? "CUSTOMIZED" : "DEFAULT_PRESET"}
                  </span>
                )}
              </div>
              <h2 className="text-base sm:text-lg font-semibold text-white tracking-tight truncate">
                {viewMode === "editor" && config
                  ? config.name
                  : "ศูนย์ปรับแต่ง Discord Embed (Discord Embed Studio)"}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {viewMode === "editor" && (
              <select
                value={selectedKey || ""}
                onChange={(e) => setSelectedKey(e.target.value)}
                className="hidden sm:block px-3 py-1.5 bg-[#000000] border border-white/[0.12] text-xs text-white rounded-none focus:outline-none focus:border-blue-500 max-w-[260px]"
              >
                {filteredEmbeds.map((e) => (
                  <option key={e.key} value={e.key} className="bg-[#070809] text-white">
                    {e.name}
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center bg-white/[0.04] hover:bg-white/[0.1] border border-white/[0.08] text-neutral-400 hover:text-white rounded-none transition-colors"
              title="ปิดหน้าต่าง"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ================================================================= */}
        {/* TOAST NOTIFICATION                                                */}
        {/* ================================================================= */}
        {toast && (
          <div
            className={`px-6 py-2.5 flex items-center justify-between text-xs font-mono font-medium border-b shrink-0 ${
              toast.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                : "bg-red-500/10 border-red-500/20 text-red-400"
            }`}
          >
            <span>{toast.message}</span>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="text-current hover:opacity-75"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ================================================================= */}
        {/* MODAL MAIN CONTENT AREA                                           */}
        {/* ================================================================= */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {viewMode === "selector" ? (
            /* ============================================================= */
            /* 1. SELECTOR VIEW (Template Picker)                            */
            /* ============================================================= */
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-[#000000]">
              {/* Category Filter Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-4 border-b border-white/[0.08] mb-6">
                <button
                  type="button"
                  onClick={() => setSelectedCategory("all")}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-mono rounded-none transition-colors shrink-0 ${
                    selectedCategory === "all"
                      ? "bg-blue-500/15 border border-blue-500 text-blue-400 font-semibold"
                      : "bg-[#070809] border border-white/[0.08] text-neutral-400 hover:text-white hover:border-white/[0.15]"
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>ทั้งหมด ({embedsList.length})</span>
                </button>

                {EMBED_CATEGORIES.map((cat) => {
                  const count = embedsList.filter((e) => e.category === cat.id).length;
                  const isActive = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-mono rounded-none transition-colors shrink-0 ${
                        isActive
                          ? "bg-blue-500/15 border border-blue-500 text-blue-400 font-semibold"
                          : "bg-[#070809] border border-white/[0.08] text-neutral-400 hover:text-white hover:border-white/[0.15]"
                      }`}
                    >
                      {getCategoryIcon(cat.id, "w-3.5 h-3.5")}
                      <span>{cat.label}</span>
                      <span className="text-[10px] text-neutral-500 font-mono">[{count}]</span>
                    </button>
                  );
                })}
              </div>

              {/* Template Cards Bento Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredEmbeds.map((item) => (
                  <div
                    key={item.key}
                    onClick={() => {
                      setSelectedKey(item.key);
                      setViewMode("editor");
                    }}
                    className="group relative flex flex-col justify-between p-5 bg-[#070809] hover:bg-[#0c0e11] border border-white/[0.08] hover:border-blue-500/50 rounded-none cursor-pointer transition-all duration-150"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <span className="font-mono text-[10px] text-neutral-500 group-hover:text-blue-400 transition-colors uppercase">
                          EMBED // {item.category}
                        </span>
                        <span
                          className={`font-mono text-[9px] px-1.5 py-0.5 border ${
                            item.isCustomized
                              ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
                              : "bg-white/[0.04] border-white/[0.08] text-neutral-500"
                          }`}
                        >
                          {item.isCustomized ? "CUSTOM" : "DEFAULT"}
                        </span>
                      </div>

                      <h3 className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors mb-2">
                        {item.name}
                      </h3>

                      <p className="text-xs text-neutral-400 leading-relaxed line-clamp-2">
                        {item.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-4 mt-4 border-t border-white/[0.06] text-xs font-mono">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-none"
                          style={{ backgroundColor: item.color?.hex || "#2997ff" }}
                        />
                        <span className="text-neutral-500 text-[11px]">
                          {item.supportedVariables?.length || 0} ตัวแปร
                        </span>
                      </div>

                      <span className="text-blue-400 group-hover:translate-x-0.5 transition-transform">
                        แก้ไข Embed →
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* ============================================================= */
            /* 2. SPLIT-SCREEN EDITOR VIEW                                   */
            /* ============================================================= */
            config && (
              <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
                {/* --------------------------------------------------------- */}
                {/* LEFT COLUMN: EDIT FORM CONTROLS                           */}
                {/* --------------------------------------------------------- */}
                <div className="col-span-12 lg:col-span-7 h-full overflow-y-auto flex flex-col gap-4 p-5 sm:p-6 bg-[#000000] border-r border-white/[0.08] min-h-0">
                  {/* Variable Chips Toolbar */}
                  {config.supportedVariables && config.supportedVariables.length > 0 && (
                    <div className="flex-shrink-0 p-4 bg-[#070809] border border-blue-500/20 rounded-none">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-xs font-mono text-blue-400">
                          <Info className="w-3.5 h-3.5" />
                          <span>ตัวแปรระบบที่แทรกได้ (คลิกเพื่อแทรกลงในข้อความ):</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={expandAll}
                            className="text-[10px] font-mono text-neutral-400 hover:text-white hover:underline"
                          >
                            [ขยายทั้งหมด]
                          </button>
                          <span className="text-neutral-600">/</span>
                          <button
                            type="button"
                            onClick={collapseAll}
                            className="text-[10px] font-mono text-neutral-400 hover:text-white hover:underline"
                          >
                            [ยุบทั้งหมด]
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {config.supportedVariables.map((v) => (
                          <button
                            key={v.key}
                            type="button"
                            onClick={() => insertVariable(v.key)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] hover:border-blue-500/50 text-white rounded-none transition-colors"
                            title={`คลิกเพื่อแทรก ${v.key} (${v.label} เช่น: ${v.example})`}
                          >
                            <span className="text-blue-400">{v.key}</span>
                            <span className="text-neutral-400 text-[11px]">• {v.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 1. ACCENT COLOR SECTION */}
                  <BentoSectionCard
                    index="01"
                    title="สีแถบไฮไลท์ (Accent Border Color)"
                    icon={<Palette className="w-4 h-4 text-blue-400" />}
                    enabled={config.color.enabled}
                    isExpanded={expandedSections.color}
                    onToggleExpand={() => toggleSection("color")}
                    onToggleEnabled={(enabled) =>
                      setConfig({ ...config, color: { ...config.color, enabled } })
                    }
                  >
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={config.color.hex}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              color: { ...config.color, hex: e.target.value },
                            })
                          }
                          className="w-10 h-10 border border-white/[0.15] bg-transparent cursor-pointer rounded-none p-0.5"
                        />
                        <div className="flex-1">
                          <label className="block text-[11px] font-mono text-neutral-400 mb-1">
                            HEX COLOR CODE
                          </label>
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
                            className="w-full px-3 py-2 bg-[#000000] border border-white/[0.12] focus:border-blue-500 text-xs font-mono text-white rounded-none outline-none"
                          />
                        </div>
                      </div>

                      {/* Quick Color Presets */}
                      <div>
                        <span className="block text-[11px] font-mono text-neutral-500 mb-1.5">
                          QUICK PRESETS:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {PRESET_COLORS.map((p) => {
                            const isSelected =
                              config.color.hex.toLowerCase() === p.hex.toLowerCase();
                            return (
                              <button
                                key={p.hex}
                                type="button"
                                onClick={() =>
                                  setConfig({
                                    ...config,
                                    color: { ...config.color, hex: p.hex },
                                  })
                                }
                                className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-mono border rounded-none transition-colors ${
                                  isSelected
                                    ? "bg-white/[0.12] border-white text-white"
                                    : "bg-white/[0.03] border-white/[0.08] text-neutral-400 hover:text-white hover:border-white/[0.2]"
                                }`}
                              >
                                <span
                                  className="w-2.5 h-2.5 rounded-none shrink-0"
                                  style={{ backgroundColor: p.hex }}
                                />
                                <span>{p.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </BentoSectionCard>

                  {/* 2. AUTHOR SECTION */}
                  <BentoSectionCard
                    index="02"
                    title="ข้อมูลผู้ส่ง (Author)"
                    icon={<User className="w-4 h-4 text-emerald-400" />}
                    enabled={config.author.enabled}
                    isExpanded={expandedSections.author}
                    onToggleExpand={() => toggleSection("author")}
                    onToggleEnabled={(enabled) =>
                      setConfig({ ...config, author: { ...config.author, enabled } })
                    }
                  >
                    <div className="flex flex-col gap-3">
                      <div>
                        <label className="block text-[11px] font-mono text-neutral-400 mb-1">
                          ชื่อ AUTHOR (AUTHOR NAME)
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
                          className="w-full px-3 py-2 bg-[#000000] border border-white/[0.12] focus:border-blue-500 text-xs text-white rounded-none outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-mono text-neutral-400 mb-1">
                            ไอคอน AUTHOR (ICON URL)
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
                            placeholder="https://... (URL รูปภาพ)"
                            className="w-full px-3 py-2 bg-[#000000] border border-white/[0.12] focus:border-blue-500 text-xs text-white rounded-none outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-mono text-neutral-400 mb-1">
                            ลิงก์ AUTHOR (CLICK URL)
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
                            placeholder="https://... (เว้นว่างได้)"
                            className="w-full px-3 py-2 bg-[#000000] border border-white/[0.12] focus:border-blue-500 text-xs text-white rounded-none outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </BentoSectionCard>

                  {/* 3. TITLE SECTION */}
                  <BentoSectionCard
                    index="03"
                    title="หัวข้อหลัก (Title)"
                    icon={<Tag className="w-4 h-4 text-purple-400" />}
                    enabled={config.title.enabled}
                    isExpanded={expandedSections.title}
                    onToggleExpand={() => toggleSection("title")}
                    onToggleEnabled={(enabled) =>
                      setConfig({ ...config, title: { ...config.title, enabled } })
                    }
                  >
                    <div className="flex flex-col gap-3">
                      <div>
                        <label className="block text-[11px] font-mono text-neutral-400 mb-1">
                          ข้อความหัวข้อ (TITLE TEXT)
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
                          className="w-full px-3 py-2.5 bg-[#000000] border border-white/[0.12] focus:border-blue-500 text-sm font-semibold text-white rounded-none outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-mono text-neutral-400 mb-1">
                          ลิงก์หัวข้อเมื่อคลิก (TITLE URL)
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
                          className="w-full px-3 py-2 bg-[#000000] border border-white/[0.12] focus:border-blue-500 text-xs text-white rounded-none outline-none"
                        />
                      </div>
                    </div>
                  </BentoSectionCard>

                  {/* 4. DESCRIPTION SECTION */}
                  <BentoSectionCard
                    index="04"
                    title="ข้อความรายละเอียด (Description)"
                    icon={<AlignLeft className="w-4 h-4 text-cyan-400" />}
                    enabled={config.descriptionText.enabled}
                    isExpanded={expandedSections.description}
                    onToggleExpand={() => toggleSection("description")}
                    onToggleEnabled={(enabled) =>
                      setConfig({
                        ...config,
                        descriptionText: { ...config.descriptionText, enabled },
                      })
                    }
                  >
                    <div className="flex flex-col gap-2">
                      <textarea
                        ref={descriptionTextareaRef}
                        rows={8}
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
                        placeholder="พิมพ์เนื้อหาที่นี่... รองรับการขึ้นบรรทัดใหม่ ตัวหนา **คำ** และตัวแปร {server_name}"
                        className="w-full p-3 bg-[#000000] border border-white/[0.12] focus:border-blue-500 text-xs font-mono text-white rounded-none outline-none leading-relaxed resize-y"
                      />
                      <div className="flex items-center justify-between text-[11px] font-mono text-neutral-500">
                        <span>Markdown: **หนา**, *เอียง*, &gt; อ้างอิง</span>
                        <span>{config.descriptionText.text?.length || 0} / 4096 ตัวอักษร</span>
                      </div>
                    </div>
                  </BentoSectionCard>

                  {/* 5. FIELDS SECTION */}
                  <BentoSectionCard
                    index="05"
                    title={`ฟิลด์ข้อมูลเสริม (Fields - ${config.fields?.items?.length || 0})`}
                    icon={<Layers className="w-4 h-4 text-amber-400" />}
                    enabled={config.fields.enabled}
                    isExpanded={expandedSections.fields}
                    onToggleExpand={() => toggleSection("fields")}
                    onToggleEnabled={(enabled) =>
                      setConfig({ ...config, fields: { ...config.fields, enabled } })
                    }
                  >
                    <div className="flex flex-col gap-3">
                      {config.fields?.items?.map((field, idx) => (
                        <div
                          key={field.id}
                          className="p-3 bg-[#000000] border border-white/[0.08] flex flex-col gap-2 rounded-none"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono font-medium text-blue-400">
                              FIELD #{idx + 1}
                            </span>
                            <div className="flex items-center gap-3">
                              <label className="flex items-center gap-1.5 text-[11px] font-mono text-neutral-400 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={field.inline}
                                  onChange={(e) =>
                                    handleUpdateField(field.id, { inline: e.target.checked })
                                  }
                                  className="rounded-none border-white/20 bg-black"
                                />
                                จัดแนวนอน (Inline)
                              </label>

                              <button
                                type="button"
                                onClick={() => handleRemoveField(field.id)}
                                className="text-red-400 hover:text-red-300 p-1"
                                title="ลบฟิลด์นี้"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <input
                              type="text"
                              value={field.name}
                              onChange={(e) =>
                                handleUpdateField(field.id, { name: e.target.value })
                              }
                              placeholder="ชื่อฟิลด์..."
                              className="col-span-1 px-3 py-1.5 bg-[#070809] border border-white/[0.1] text-xs font-semibold text-white rounded-none outline-none focus:border-blue-500"
                            />
                            <input
                              type="text"
                              value={field.value}
                              onChange={(e) =>
                                handleUpdateField(field.id, { value: e.target.value })
                              }
                              placeholder="รายละเอียดฟิลด์..."
                              className="col-span-2 px-3 py-1.5 bg-[#070809] border border-white/[0.1] text-xs text-white rounded-none outline-none focus:border-blue-500"
                            />
                          </div>
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={handleAddField}
                        className="inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-white/[0.03] hover:bg-white/[0.06] border border-dashed border-white/[0.15] hover:border-blue-500/50 text-xs font-mono text-neutral-300 hover:text-white rounded-none transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>เพิ่มฟิลด์ใหม่ (Add Field)</span>
                      </button>
                    </div>
                  </BentoSectionCard>

                  {/* 6. THUMBNAIL SECTION */}
                  <BentoSectionCard
                    index="06"
                    title="รูปภาพขนาดย่อ (Thumbnail - มุมขวาบน)"
                    icon={<ImageIcon className="w-4 h-4 text-orange-400" />}
                    enabled={config.thumbnail.enabled}
                    isExpanded={expandedSections.thumbnail}
                    onToggleExpand={() => toggleSection("thumbnail")}
                    onToggleEnabled={(enabled) =>
                      setConfig({ ...config, thumbnail: { ...config.thumbnail, enabled } })
                    }
                  >
                    <div className="flex items-center gap-3">
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
                        className="flex-1 px-3 py-2 bg-[#000000] border border-white/[0.12] focus:border-blue-500 text-xs text-white rounded-none outline-none font-mono"
                      />
                      {config.thumbnail.url && (
                        <div className="w-10 h-10 border border-white/[0.15] bg-black shrink-0 overflow-hidden">
                          <img
                            src={config.thumbnail.url}
                            alt="Thumbnail"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = "none";
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </BentoSectionCard>

                  {/* 7. LARGE IMAGE BANNER SECTION */}
                  <BentoSectionCard
                    index="07"
                    title="รูปภาพแบนเนอร์ใหญ่ (Large Banner Image)"
                    icon={<ImagePlus className="w-4 h-4 text-pink-400" />}
                    enabled={config.image.enabled}
                    isExpanded={expandedSections.image}
                    onToggleExpand={() => toggleSection("image")}
                    onToggleEnabled={(enabled) =>
                      setConfig({ ...config, image: { ...config.image, enabled } })
                    }
                  >
                    <div className="flex flex-col gap-2">
                      <input
                        type="text"
                        value={config.image.url}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            image: { ...config.image, url: e.target.value },
                          })
                        }
                        placeholder="https://... (URL รูปภาพขนาดใหญ่แสดงใต้เนื้อหา)"
                        className="w-full px-3 py-2 bg-[#000000] border border-white/[0.12] focus:border-blue-500 text-xs text-white rounded-none outline-none font-mono"
                      />
                      {config.image.url && (
                        <div className="max-h-36 w-full border border-white/[0.15] bg-black overflow-hidden mt-1">
                          <img
                            src={config.image.url}
                            alt="Banner Preview"
                            className="w-full max-h-36 object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = "none";
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </BentoSectionCard>

                  {/* 8. FOOTER SECTION */}
                  <BentoSectionCard
                    index="08"
                    title="ข้อความส่วนท้าย (Footer)"
                    icon={<Paperclip className="w-4 h-4 text-indigo-400" />}
                    enabled={config.footer.enabled}
                    isExpanded={expandedSections.footer}
                    onToggleExpand={() => toggleSection("footer")}
                    onToggleEnabled={(enabled) =>
                      setConfig({ ...config, footer: { ...config.footer, enabled } })
                    }
                  >
                    <div className="flex flex-col gap-3">
                      <div>
                        <label className="block text-[11px] font-mono text-neutral-400 mb-1">
                          ข้อความ FOOTER (FOOTER TEXT)
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
                          placeholder="เช่น LynnBot Operations System • Wallet"
                          className="w-full px-3 py-2 bg-[#000000] border border-white/[0.12] focus:border-blue-500 text-xs text-white rounded-none outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-mono text-neutral-400 mb-1">
                          ไอคอน FOOTER (ICON URL)
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
                          placeholder="https://... (URL รูปภาพขนาดเล็ก)"
                          className="w-full px-3 py-2 bg-[#000000] border border-white/[0.12] focus:border-blue-500 text-xs text-white rounded-none outline-none"
                        />
                      </div>
                    </div>
                  </BentoSectionCard>

                  {/* 9. TIMESTAMP SECTION */}
                  <BentoSectionCard
                    index="09"
                    title="เวลาประทับ (Timestamp)"
                    icon={<Clock className="w-4 h-4 text-slate-400" />}
                    enabled={config.timestamp.enabled}
                    isExpanded={expandedSections.timestamp}
                    onToggleExpand={() => toggleSection("timestamp")}
                    onToggleEnabled={(enabled) =>
                      setConfig({ ...config, timestamp: { enabled } })
                    }
                  >
                    <p className="text-xs text-neutral-400 leading-relaxed m-0">
                      เมื่อเปิดใช้งาน Discord จะแสดงเวลาส่งข้อความตามเวลาสากลต่อท้ายข้อความ Footer โดยอัตโนมัติ (เช่น วันนี้ เวลา 18:00)
                    </p>
                  </BentoSectionCard>

                  <div className="p-3 bg-white/[0.02] border border-white/[0.06] text-xs font-mono text-neutral-500 shrink-0">
                    💡 คำแนะนำ: คุณสามารถเปิดหรือปิดสวิตช์ได้ทุกส่วน หากปิดส่วนใด ส่วนนั้นจะไม่ถูกส่งไปยัง Discord
                  </div>
                </div>

                {/* --------------------------------------------------------- */}
                {/* RIGHT COLUMN: DISCORD LIVE DARK THEME PREVIEW             */}
                {/* --------------------------------------------------------- */}
                <div className="col-span-12 lg:col-span-5 h-full overflow-y-auto p-5 sm:p-6 bg-[#070809] flex flex-col gap-4 min-h-0">
                  <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-none bg-emerald-400 animate-pulse" />
                      <span className="font-mono text-xs font-semibold tracking-wider text-neutral-300 uppercase">
                        DISCORD_LIVE // SIMULATOR
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-neutral-500">
                      REALTIME PREVIEW
                    </span>
                  </div>

                  {/* Discord Chat Container */}
                  <div className="bg-[#313338] border border-white/[0.08] p-4 flex gap-4 rounded-none">
                    {/* Bot Avatar */}
                    <div className="w-10 h-10 rounded-full bg-[#5865F2] flex items-center justify-center shrink-0 text-white font-bold text-sm select-none">
                      L
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Bot Header Line */}
                      <div className="flex items-center gap-2 mb-2 select-none">
                        <span className="text-sm font-semibold text-white">LynnBot</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-none bg-[#5865F2] text-white">
                          BOT
                        </span>
                        <span className="text-[11px] text-[#949ba4]">
                          วันนี้ เวลา 18:00
                        </span>
                      </div>

                      {/* Discord Embed Box */}
                      <div
                        className="bg-[#2b2d31] rounded-none p-4 flex flex-col gap-3 relative max-w-[540px]"
                        style={{
                          borderLeft: config.color.enabled
                            ? `4px solid ${config.color.hex || "#2997ff"}`
                            : "4px solid #1e1f22",
                        }}
                      >
                        {/* Thumbnail in Top Right */}
                        {config.thumbnail.enabled && config.thumbnail.url && (
                          <div className="absolute top-4 right-4 w-16 h-16 rounded-none overflow-hidden bg-black/40 border border-white/10 shrink-0">
                            <img
                              src={config.thumbnail.url}
                              alt="Thumbnail"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = "none";
                              }}
                            />
                          </div>
                        )}

                        {/* Author */}
                        {config.author.enabled && config.author.name && (
                          <div className="flex items-center gap-2 select-none pr-16">
                            {config.author.iconUrl && (
                              <img
                                src={config.author.iconUrl}
                                alt="Author icon"
                                className="w-5 h-5 rounded-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = "none";
                                }}
                              />
                            )}
                            <span className="text-xs font-semibold text-[#f2f3f5] hover:underline cursor-pointer">
                              {config.author.name}
                            </span>
                          </div>
                        )}

                        {/* Title */}
                        {config.title.enabled && config.title.text && (
                          <div className="pr-16">
                            <h4 className="text-sm font-bold text-white hover:underline cursor-pointer leading-snug">
                              {formatDiscordMarkdown(config.title.text)}
                            </h4>
                          </div>
                        )}

                        {/* Description */}
                        {config.descriptionText.enabled && config.descriptionText.text && (
                          <div className="text-xs text-[#dbdee1] leading-relaxed whitespace-pre-wrap font-sans">
                            {formatDiscordMarkdown(config.descriptionText.text)}
                          </div>
                        )}

                        {/* Fields */}
                        {config.fields.enabled &&
                          config.fields.items &&
                          config.fields.items.length > 0 && (
                            <div className="grid grid-cols-12 gap-2 mt-1">
                              {config.fields.items
                                .filter((f) => f.enabled !== false)
                                .map((field) => (
                                  <div
                                    key={field.id}
                                    className={
                                      field.inline ? "col-span-6 sm:col-span-4" : "col-span-12"
                                    }
                                  >
                                    <div className="text-xs font-bold text-white mb-0.5">
                                      {formatDiscordMarkdown(field.name)}
                                    </div>
                                    <div className="text-xs text-[#dbdee1] leading-relaxed">
                                      {formatDiscordMarkdown(field.value)}
                                    </div>
                                  </div>
                                ))}
                            </div>
                          )}

                        {/* Large Image Banner */}
                        {config.image.enabled && config.image.url && (
                          <div className="mt-1 max-h-48 rounded-none overflow-hidden bg-black/40 border border-white/10">
                            <img
                              src={config.image.url}
                              alt="Banner"
                              className="w-full max-h-48 object-cover"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = "none";
                              }}
                            />
                          </div>
                        )}

                        {/* Footer & Timestamp */}
                        {(config.footer.enabled || config.timestamp.enabled) && (
                          <div className="flex items-center gap-2 pt-2 border-t border-white/[0.04] text-[11px] text-[#949ba4] select-none">
                            {config.footer.enabled && config.footer.iconUrl && (
                              <img
                                src={config.footer.iconUrl}
                                alt="Footer icon"
                                className="w-4 h-4 rounded-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = "none";
                                }}
                              />
                            )}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {config.footer.enabled && config.footer.text && (
                                <span>{formatDiscordMarkdown(config.footer.text)}</span>
                              )}
                              {config.footer.enabled &&
                                config.footer.text &&
                                config.timestamp.enabled && <span>•</span>}
                              {config.timestamp.enabled && <span>วันนี้ เวลา 18:00</span>}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          )}
        </div>

        {/* ================================================================= */}
        {/* BOTTOM ACTION FOOTER                                              */}
        {/* ================================================================= */}
        {viewMode === "editor" && config && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-white/[0.08] bg-[#0c0d0f] shrink-0">
            {/* Left: Reset */}
            <button
              type="button"
              disabled={resetting || saving}
              onClick={handleReset}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-mono font-medium rounded-none transition-colors disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{resetting ? "กำลังรีเซ็ต..." : "รีเซ็ตค่าเริ่มต้น"}</span>
            </button>

            {/* Right: Test Send + Save */}
            <div className="flex items-center gap-3">
              {/* Test Send Dropdown Panel */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowTestPanel(!showTestPanel)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.12] text-neutral-300 hover:text-white text-xs font-mono font-medium rounded-none transition-colors"
                >
                  <Send className="w-3.5 h-3.5 text-blue-400" />
                  <span>ทดสอบส่งเข้า Discord</span>
                </button>

                {showTestPanel && (
                  <div className="absolute bottom-full right-0 mb-2 w-80 p-4 bg-[#070809] border border-white/[0.15] shadow-2xl rounded-none z-50 flex flex-col gap-3">
                    <span className="text-xs font-mono font-semibold text-white">
                      เลือกห้อง Discord เพื่อทดสอบส่ง
                    </span>
                    <select
                      value={selectedTestChannel}
                      onChange={(e) => setSelectedTestChannel(e.target.value)}
                      className="w-full px-3 py-2 bg-[#000000] border border-white/[0.12] text-xs text-white rounded-none outline-none focus:border-blue-500 font-mono"
                    >
                      {channels.map((ch) => (
                        <option key={ch.id} value={ch.id} className="bg-[#070809]">
                          #{ch.name}
                        </option>
                      ))}
                    </select>
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowTestPanel(false)}
                        className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white font-mono"
                      >
                        ยกเลิก
                      </button>
                      <button
                        type="button"
                        disabled={testingSend}
                        onClick={handleTestSend}
                        className="px-4 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-mono font-medium rounded-none disabled:opacity-50"
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
                className="inline-flex items-center gap-2 px-6 py-2 bg-blue-500 hover:bg-blue-600 border border-blue-400 text-white text-xs font-mono font-semibold rounded-none shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Sub-Component: Raycast / Linear Bento Accordion Card
function BentoSectionCard({
  index,
  title,
  icon,
  enabled,
  isExpanded,
  onToggleExpand,
  onToggleEnabled,
  children,
}: {
  index: string;
  title: string;
  icon: React.ReactNode;
  enabled: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onToggleEnabled: (enabled: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`w-full flex-shrink-0 border rounded-none transition-colors duration-150 ${
        enabled
          ? "bg-[#070809] border-white/[0.12]"
          : "bg-[#000000] border-white/[0.04] opacity-75"
      }`}
    >
      {/* Accordion Header */}
      <div className="flex items-center justify-between p-3.5 sm:p-4 bg-white/[0.02] border-b border-white/[0.04]">
        <div
          onClick={onToggleExpand}
          className="flex items-center gap-3 cursor-pointer select-none flex-1 min-w-0"
        >
          <span className="font-mono text-[10px] text-neutral-500 tracking-wider">
            {index} //
          </span>
          <span className="text-neutral-400">{icon}</span>
          <span
            className={`text-xs sm:text-sm font-semibold truncate ${
              enabled ? "text-white" : "text-neutral-500"
            }`}
          >
            {title}
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0 ml-3">
          {/* Bento Sharp Switch */}
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => {
                onToggleEnabled(e.target.checked);
                if (e.target.checked && !isExpanded) {
                  onToggleExpand();
                }
              }}
              className="sr-only"
            />
            <div
              className={`w-10 h-5 border transition-colors duration-150 rounded-none relative ${
                enabled
                  ? "bg-blue-500 border-blue-400"
                  : "bg-white/[0.06] border-white/[0.15]"
              }`}
            >
              <div
                className={`absolute top-0.5 bottom-0.5 w-3.5 bg-white rounded-none transition-transform duration-150 ${
                  enabled ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </div>
          </label>

          {/* Chevron expand toggle */}
          <button
            type="button"
            onClick={onToggleExpand}
            className="p-1 text-neutral-400 hover:text-white transition-colors"
            title={isExpanded ? "ยุบเนื้อหา" : "ขยายเนื้อหา"}
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Accordion Content */}
      {isExpanded && enabled && (
        <div className="p-4 sm:p-5 border-t border-white/[0.06] bg-[#0c0d0f]/60">
          {children}
        </div>
      )}
    </div>
  );
}

// Discord Markdown & Custom Emoji Helper for Live Simulator Preview
function formatDiscordMarkdown(text: string): React.ReactNode {
  if (!text) return "";

  // 1. System variable interpolation
  let parsed = text;
  parsed = parsed.replaceAll("{roles_count}", "0");
  parsed = parsed.replaceAll("{server_name}", "753 BC");
  parsed = parsed.replaceAll("{user}", "@สมาชิก");
  parsed = parsed.replaceAll("{username}", "คุณ");
  parsed = parsed.replaceAll("{balance}", "0");
  parsed = parsed.replaceAll("{price}", "100");
  parsed = parsed.replaceAll("{role_name}", "VIP Member");

  // 2. Auto-resolve incomplete known emojis (e.g. <:70661email:> without ID)
  parsed = parsed.replaceAll(/<:70661email:\s*>/g, "<:70661email:1561687861894447155>");

  const lines = parsed.split("\n");
  return lines.map((line, idx) => {
    const isQuote = line.trim().startsWith(">");
    const cleanLine = isQuote ? line.trim().replace(/^>\s*/, "") : line;

    // Tokenize for bold (**text**) and custom emojis (<:name:id> or <a:name:id>)
    const parts = cleanLine.split(/(<a?:[a-zA-Z0-9_]+:\d+>|\*\*[^*]+\*\*)/g);
    const content = parts.map((part, pIdx) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={pIdx} className="font-bold text-white">{part.slice(2, -2)}</strong>;
      }

      // Check Discord custom emoji pattern
      const emojiMatch = part.match(/^<(a)?:([a-zA-Z0-9_]+):(\d+)>$/);
      if (emojiMatch) {
        const [, , emojiName, emojiId] = emojiMatch;
        return (
          <img
            key={pIdx}
            src={`https://cdn.discordapp.com/emojis/${emojiId}.webp?size=48&quality=lossless`}
            alt={`:${emojiName}:`}
            title={`:${emojiName}:`}
            className="inline-block w-4 h-4 align-text-bottom mx-0.5 object-contain"
            onError={(e) => {
              (e.target as HTMLElement).style.display = "none";
            }}
          />
        );
      }

      return part;
    });

    if (isQuote) {
      return (
        <div key={idx} className="border-l-4 border-neutral-600 pl-2 text-neutral-400 my-0.5">
          {content}
        </div>
      );
    }

    return (
      <div key={idx} className="min-h-[1.25em]">
        {content}
      </div>
    );
  });
}
