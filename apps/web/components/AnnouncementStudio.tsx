"use client";

import { useState, useEffect, useRef } from "react";
import CustomSelect from "@/components/CustomSelect";

interface DiscordChannel {
  id: string;
  name: string;
  type?: number;
}

interface DiscordRole {
  id: string;
  name: string;
  color: string;
  position: number;
  managed?: boolean;
}

export default function AnnouncementStudio() {
  const [channels, setChannels] = useState<DiscordChannel[]>([]);
  const [roles, setRoles] = useState<DiscordRole[]>([]);
  const [loadingGuildData, setLoadingGuildData] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState("");
  const [title, setTitle] = useState("📢 ประกาศจากทีมงาน");
  const [description, setDescription] = useState(
    "ยินดีต้อนรับสมาชิกทุกท่านเข้าสู่เซิร์ฟเวอร์\nกรุณาอ่านกฎระเบียบและติดตามข่าวสารอัปเดตได้ที่ห้องนี้"
  );
  const [color, setColor] = useState("#5865F2");
  const [imageUrl, setImageUrl] = useState("");

  // Mention State
  const [mentionPreset, setMentionPreset] = useState<"none" | "everyone" | "here">("none");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [customMention, setCustomMention] = useState("");
  const [showRoleDrawer, setShowRoleDrawer] = useState(false);
  const [roleSearch, setRoleSearch] = useState("");
  const [showCustomMention, setShowCustomMention] = useState(false);

  // In-text Toolbar State
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [activeToolbarDropdown, setActiveToolbarDropdown] = useState<"none" | "roles" | "channels">("none");
  const [toolbarRoleSearch, setToolbarRoleSearch] = useState("");
  const [toolbarChannelSearch, setToolbarChannelSearch] = useState("");
  const toolbarDropdownRef = useRef<HTMLDivElement>(null);

  const [sending, setSending] = useState(false);
  const [resultMsg, setResultMsg] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  // Fetch Guild Data (Channels & Roles)
  useEffect(() => {
    setLoadingGuildData(true);
    fetch("/api/discord/guild-data")
      .then((r) => r.json())
      .then((data) => {
        if (data.channels) {
          setChannels(data.channels);
          if (data.channels.length > 0) {
            setSelectedChannel(data.channels[0].id);
          }
        }
        if (data.roles) {
          setRoles(data.roles);
        }
      })
      .catch((e) => console.error("Error loading Discord data:", e))
      .finally(() => setLoadingGuildData(false));
  }, []);

  // Close toolbar dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        toolbarDropdownRef.current &&
        !toolbarDropdownRef.current.contains(event.target as Node)
      ) {
        setActiveToolbarDropdown("none");
      }
    };
    if (activeToolbarDropdown !== "none") {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [activeToolbarDropdown]);

  // Quick insertion into description textarea
  const insertAtCursor = (textToInsert: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setDescription((prev) => (prev ? prev + " " + textToInsert : textToInsert));
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentVal = description;
    const updatedVal = currentVal.substring(0, start) + textToInsert + currentVal.substring(end);
    setDescription(updatedVal);

    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + textToInsert.length;
    }, 10);
  };

  const wrapSelection = (prefix: string, suffix: string, defaultText: string = "ข้อความ") => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setDescription((prev) => `${prev} ${prefix}${defaultText}${suffix}`);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = description.substring(start, end) || defaultText;
    const replacement = `${prefix}${selectedText}${suffix}`;
    const updatedVal = description.substring(0, start) + replacement + description.substring(end);
    setDescription(updatedVal);

    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = start + prefix.length;
      textarea.selectionEnd = start + prefix.length + selectedText.length;
    }, 10);
  };

  // Toggle role in selected list
  const toggleRoleSelection = (roleId: string) => {
    setSelectedRoles((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
    );
  };

  const clearAllMentions = () => {
    setMentionPreset("none");
    setSelectedRoles([]);
    setCustomMention("");
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChannel) {
      setResultMsg({ type: "error", text: "กรุณาเลือกห้อง Discord ที่ต้องการส่ง" });
      return;
    }

    try {
      setSending(true);
      setResultMsg(null);

      const currentChan = channels.find((c) => c.id === selectedChannel);
      const res = await fetch("/api/discord/announce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId: selectedChannel,
          channelName: currentChan ? `#${currentChan.name}` : selectedChannel,
          title,
          description,
          color,
          imageUrl: imageUrl.trim() || undefined,
          mention: mentionPreset,
          mentionRoles: selectedRoles,
          customMention: customMention.trim() || undefined,
        }),
      });

      if (res.ok) {
        setResultMsg({
          type: "success",
          text: "✅ ส่งประกาศลงห้อง Discord เรียบร้อยแล้ว พร้อมระบบแจ้งเตือน (Mentions)!",
        });
      } else {
        const err = await res.json();
        setResultMsg({
          type: "error",
          text: `❌ เกิดข้อผิดพลาด: ${err.error || "ไม่สามารถส่งข้อความได้"}`,
        });
      }
    } catch (err: any) {
      setResultMsg({ type: "error", text: "❌ เกิดข้อผิดพลาดในการเชื่อมต่อ" });
    } finally {
      setSending(false);
    }
  };

  const colorPresets = [
    { label: "Discord Blurple", hex: "#5865F2" },
    { label: "Black", hex: "#000000" },
    { label: "Blue", hex: "#2997ff" },
    { label: "Green", hex: "#34c759" },
    { label: "Orange", hex: "#ff9500" },
    { label: "Purple", hex: "#af52de" },
    { label: "Red", hex: "#ff3b30" },
  ];

  // Helper to parse description into rich Discord preview nodes
  const renderDiscordContent = (content: string) => {
    if (!content) return null;

    const lines = content.split("\n");
    return lines.map((line, lineIdx) => {
      const isQuote = line.startsWith("> ");
      const lineContent = isQuote ? line.substring(2) : line;

      // Regex matching: <@&ID>, <#ID>, @everyone, @here, **bold**, *italic*, `code`
      const regex = /(<@&\d+>|<#\d+>|@everyone|@here|\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
      const parts = lineContent.split(regex);

      const renderedParts = parts.map((part, partIdx) => {
        if (!part) return null;

        if (part === "@everyone") {
          return (
            <span
              key={partIdx}
              style={{
                background: "rgba(88, 101, 242, 0.3)",
                color: "#c9cdfb",
                padding: "1px 5px",
                borderRadius: "3px",
                fontWeight: 600,
                fontSize: "12px",
                display: "inline-block",
                margin: "0 1px",
              }}
            >
              @everyone
            </span>
          );
        }

        if (part === "@here") {
          return (
            <span
              key={partIdx}
              style={{
                background: "rgba(88, 101, 242, 0.3)",
                color: "#c9cdfb",
                padding: "1px 5px",
                borderRadius: "3px",
                fontWeight: 600,
                fontSize: "12px",
                display: "inline-block",
                margin: "0 1px",
              }}
            >
              @here
            </span>
          );
        }

        const roleMatch = part.match(/^<@&(\d+)>$/);
        if (roleMatch) {
          const roleId = roleMatch[1];
          const matchedRole = roles.find((r) => r.id === roleId);
          const rColor =
            matchedRole?.color && matchedRole.color !== "#86868b"
              ? matchedRole.color
              : "#5865F2";
          return (
            <span
              key={partIdx}
              style={{
                background: `${rColor}22`,
                color: rColor,
                padding: "1px 6px",
                borderRadius: "3px",
                fontWeight: 600,
                fontSize: "12px",
                display: "inline-block",
                margin: "0 1px",
                borderLeft: `2px solid ${rColor}`,
              }}
            >
              @{matchedRole ? matchedRole.name : "role"}
            </span>
          );
        }

        const channelMatch = part.match(/^<#(\d+)>$/);
        if (channelMatch) {
          const chanId = channelMatch[1];
          const matchedChan = channels.find((c) => c.id === chanId);
          return (
            <span
              key={partIdx}
              style={{
                background: "rgba(88, 101, 242, 0.18)",
                color: "#c9cdfb",
                padding: "1px 5px",
                borderRadius: "3px",
                fontWeight: 500,
                fontSize: "12px",
                display: "inline-block",
                margin: "0 1px",
              }}
            >
              #{matchedChan ? matchedChan.name : "channel"}
            </span>
          );
        }

        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={partIdx} style={{ fontWeight: 700, color: "#ffffff" }}>
              {part.slice(2, -2)}
            </strong>
          );
        }

        if (part.startsWith("*") && part.endsWith("*")) {
          return (
            <em key={partIdx} style={{ fontStyle: "italic" }}>
              {part.slice(1, -1)}
            </em>
          );
        }

        if (part.startsWith("`") && part.endsWith("`")) {
          return (
            <code
              key={partIdx}
              style={{
                background: "#1e1f22",
                padding: "1px 4px",
                borderRadius: "3px",
                fontSize: "12px",
                color: "#e0e1e5",
                fontFamily: "monospace",
              }}
            >
              {part.slice(1, -1)}
            </code>
          );
        }

        return <span key={partIdx}>{part}</span>;
      });

      if (isQuote) {
        return (
          <div
            key={lineIdx}
            style={{
              borderLeft: "3px solid #4e5058",
              paddingLeft: "8px",
              margin: "2px 0",
              color: "#949ba4",
            }}
          >
            {renderedParts}
          </div>
        );
      }

      return (
        <div key={lineIdx} style={{ minHeight: "18px" }}>
          {renderedParts}
        </div>
      );
    });
  };

  const filteredDrawerRoles = roles.filter((r) =>
    r.name.toLowerCase().includes(roleSearch.toLowerCase())
  );

  const filteredToolbarRoles = roles.filter((r) =>
    r.name.toLowerCase().includes(toolbarRoleSearch.toLowerCase())
  );

  const filteredToolbarChannels = channels.filter((c) =>
    c.name.toLowerCase().includes(toolbarChannelSearch.toLowerCase())
  );

  const hasAnyMentions =
    mentionPreset !== "none" || selectedRoles.length > 0 || customMention.trim().length > 0;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 350px), 1fr))",
        gap: "24px",
      }}
    >
      {/* Left Form */}
      <div className="card" style={{ padding: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#ffffff", margin: 0 }}>
            สตูดิโอสร้างประกาศ (Announcement Studio)
          </h3>
          <span
            style={{
              fontSize: "11px",
              padding: "2px 8px",
              borderRadius: "12px",
              background: "rgba(88, 101, 242, 0.15)",
              color: "#5865F2",
              fontWeight: 600,
              border: "1px solid rgba(88, 101, 242, 0.3)",
            }}
          >
            DISCORD v10
          </span>
        </div>
        <p style={{ fontSize: "13px", color: "#86868b", margin: "0 0 20px 0" }}>
          สร้างข้อความแบบ Rich Embed พร้อมแท็กแจ้งเตือน (@everyone, @here, ยศ Discord) ส่งตรงลงห้องได้ทันที
        </p>

        <form onSubmit={handleSend} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          {/* Channel Select */}
          <div>
            <label
              style={{
                fontSize: "13px",
                fontWeight: 500,
                color: "#e5e5e7",
                display: "block",
                marginBottom: "6px",
              }}
            >
              เลือกห้องที่จะส่งประกาศ (Discord Channel)
            </label>
            <CustomSelect
              value={selectedChannel}
              onChange={setSelectedChannel}
              placeholder={loadingGuildData ? "กำลังโหลดห้อง Discord..." : "เลือกห้อง Discord..."}
              options={channels.map((ch) => ({
                value: ch.id,
                label: `#${ch.name}`,
                sub: `ID: ${ch.id}`,
              }))}
            />
          </div>

          {/* Mention Tag Section */}
          <div
            style={{
              background: "rgba(255, 255, 255, 0.02)",
              border: "1px solid rgba(255, 255, 255, 0.06)",
              borderRadius: "10px",
              padding: "14px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <label
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  margin: 0,
                }}
              >
                <span>🔔 การแท็กแจ้งเตือน (Outer Mention Notification)</span>
              </label>

              {hasAnyMentions && (
                <button
                  type="button"
                  onClick={clearAllMentions}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#ff453a",
                    fontSize: "11px",
                    fontWeight: 500,
                    cursor: "pointer",
                    padding: "2px 6px",
                    borderRadius: "4px",
                  }}
                >
                  ล้างแท็กทั้งหมด
                </button>
              )}
            </div>

            <p style={{ fontSize: "12px", color: "#86868b", margin: "0 0 10px 0" }}>
              การแท็กตรงนี้จะส่งอยู่นอกกล่อง Embed เพื่อส่งเสียงแจ้งเตือนและ Alert สมาชิกจริงใน Discord
            </p>

            {/* Mention Preset Buttons */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr 1fr 1.4fr", gap: "8px" }}>
              <button
                type="button"
                onClick={() => {
                  setMentionPreset("none");
                  setSelectedRoles([]);
                }}
                style={{
                  padding: "8px 4px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: 500,
                  border: "1px solid",
                  borderColor:
                    mentionPreset === "none" && selectedRoles.length === 0
                      ? "rgba(255,255,255,0.4)"
                      : "rgba(255,255,255,0.06)",
                  background:
                    mentionPreset === "none" && selectedRoles.length === 0
                      ? "#ffffff"
                      : "rgba(255,255,255,0.03)",
                  color:
                    mentionPreset === "none" && selectedRoles.length === 0 ? "#000000" : "#86868b",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                ไม่แท็ก
              </button>

              <button
                type="button"
                onClick={() => setMentionPreset(mentionPreset === "everyone" ? "none" : "everyone")}
                style={{
                  padding: "8px 4px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: 600,
                  border: "1px solid",
                  borderColor:
                    mentionPreset === "everyone" ? "#ff9500" : "rgba(255,255,255,0.06)",
                  background:
                    mentionPreset === "everyone"
                      ? "rgba(255, 149, 0, 0.18)"
                      : "rgba(255,255,255,0.03)",
                  color: mentionPreset === "everyone" ? "#ffb340" : "#86868b",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "4px",
                  boxShadow:
                    mentionPreset === "everyone" ? "0 0 12px rgba(255, 149, 0, 0.25)" : "none",
                  transition: "all 0.15s ease",
                }}
              >
                <span>📢</span> @everyone
              </button>

              <button
                type="button"
                onClick={() => setMentionPreset(mentionPreset === "here" ? "none" : "here")}
                style={{
                  padding: "8px 4px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: 600,
                  border: "1px solid",
                  borderColor: mentionPreset === "here" ? "#34c759" : "rgba(255,255,255,0.06)",
                  background:
                    mentionPreset === "here"
                      ? "rgba(52, 199, 89, 0.18)"
                      : "rgba(255,255,255,0.03)",
                  color: mentionPreset === "here" ? "#34c759" : "#86868b",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "4px",
                  boxShadow:
                    mentionPreset === "here" ? "0 0 12px rgba(52, 199, 89, 0.25)" : "none",
                  transition: "all 0.15s ease",
                }}
              >
                <span>🟢</span> @here
              </button>

              <button
                type="button"
                onClick={() => setShowRoleDrawer(!showRoleDrawer)}
                style={{
                  padding: "8px 6px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: 600,
                  border: "1px solid",
                  borderColor:
                    selectedRoles.length > 0 || showRoleDrawer
                      ? "#5865F2"
                      : "rgba(255,255,255,0.06)",
                  background:
                    selectedRoles.length > 0 || showRoleDrawer
                      ? "rgba(88, 101, 242, 0.18)"
                      : "rgba(255,255,255,0.03)",
                  color:
                    selectedRoles.length > 0 || showRoleDrawer ? "#c9cdfb" : "#86868b",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "4px",
                  boxShadow:
                    selectedRoles.length > 0 ? "0 0 12px rgba(88, 101, 242, 0.25)" : "none",
                  transition: "all 0.15s ease",
                }}
              >
                <span>🏷️</span> ยศ Discord {selectedRoles.length > 0 && `(${selectedRoles.length})`}
              </button>
            </div>

            {/* Selected Role Badges */}
            {selectedRoles.length > 0 && (
              <div
                style={{
                  marginTop: "10px",
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "6px",
                  alignItems: "center",
                }}
              >
                <span style={{ fontSize: "11px", color: "#86868b" }}>ยศที่เลือก:</span>
                {selectedRoles.map((roleId) => {
                  const role = roles.find((r) => r.id === roleId);
                  const roleColor =
                    role?.color && role.color !== "#86868b" ? role.color : "#5865F2";
                  return (
                    <span
                      key={roleId}
                      style={{
                        fontSize: "12px",
                        fontWeight: 600,
                        padding: "2px 8px",
                        borderRadius: "12px",
                        background: `${roleColor}25`,
                        color: roleColor,
                        border: `1px solid ${roleColor}50`,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <span
                        style={{
                          width: "6px",
                          height: "6px",
                          borderRadius: "50%",
                          background: roleColor,
                        }}
                      />
                      @{role?.name || "role"}
                      <button
                        type="button"
                        onClick={() => toggleRoleSelection(roleId)}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: roleColor,
                          cursor: "pointer",
                          padding: 0,
                          fontSize: "12px",
                          lineHeight: 1,
                        }}
                      >
                        ✕
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            {/* Role Picker Drawer Panel */}
            {showRoleDrawer && (
              <div
                style={{
                  marginTop: "12px",
                  padding: "12px",
                  background: "rgba(0, 0, 0, 0.35)",
                  borderRadius: "8px",
                  border: "1px solid rgba(88, 101, 242, 0.25)",
                }}
              >
                <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
                  <input
                    type="text"
                    value={roleSearch}
                    onChange={(e) => setRoleSearch(e.target.value)}
                    placeholder="ค้นหายศ (เช่น VIP, Member, แอดมิน)..."
                    style={{
                      flex: 1,
                      padding: "6px 10px",
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "6px",
                      color: "#ffffff",
                      fontSize: "12px",
                    }}
                  />
                  {selectedRoles.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedRoles([])}
                      style={{
                        padding: "6px 10px",
                        borderRadius: "6px",
                        background: "rgba(255, 59, 48, 0.15)",
                        color: "#ff453a",
                        border: "1px solid rgba(255, 59, 48, 0.25)",
                        fontSize: "11px",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      ล้างยศทั้งหมด
                    </button>
                  )}
                </div>

                <div
                  style={{
                    maxHeight: "150px",
                    overflowY: "auto",
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "6px",
                  }}
                >
                  {filteredDrawerRoles.length === 0 ? (
                    <div style={{ fontSize: "12px", color: "#86868b", padding: "8px 0" }}>
                      {roles.length === 0
                        ? "กำลังโหลดยศ หรือไม่พบยศใน Discord"
                        : "ไม่พบยศที่ตรงกับการค้นหา"}
                    </div>
                  ) : (
                    filteredDrawerRoles.map((role) => {
                      const isSelected = selectedRoles.includes(role.id);
                      const roleColor =
                        role.color && role.color !== "#86868b" ? role.color : "#5865F2";
                      return (
                        <button
                          type="button"
                          key={role.id}
                          onClick={() => toggleRoleSelection(role.id)}
                          style={{
                            padding: "4px 8px",
                            borderRadius: "6px",
                            fontSize: "12px",
                            fontWeight: isSelected ? 600 : 500,
                            border: "1px solid",
                            borderColor: isSelected ? roleColor : "rgba(255,255,255,0.08)",
                            background: isSelected ? `${roleColor}33` : "rgba(255,255,255,0.03)",
                            color: isSelected ? "#ffffff" : "#c9cdfb",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                            transition: "all 0.1s ease",
                          }}
                        >
                          <span
                            style={{
                              width: "7px",
                              height: "7px",
                              borderRadius: "50%",
                              background: roleColor,
                              display: "inline-block",
                            }}
                          />
                          @{role.name}
                          {isSelected && <span style={{ color: roleColor, marginLeft: "2px" }}>✓</span>}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Custom Mention Toggle */}
            <div style={{ marginTop: "10px" }}>
              {!showCustomMention && !customMention ? (
                <button
                  type="button"
                  onClick={() => setShowCustomMention(true)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#86868b",
                    fontSize: "11px",
                    cursor: "pointer",
                    padding: 0,
                    textDecoration: "underline",
                  }}
                >
                  + กำหนดแท็กเพิ่มเติมเอง (Custom ID / User Mention)
                </button>
              ) : (
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <input
                    type="text"
                    value={customMention}
                    onChange={(e) => setCustomMention(e.target.value)}
                    placeholder="เช่น <@123456789> หรือข้อความนำหน้า..."
                    style={{
                      flex: 1,
                      padding: "6px 10px",
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: "6px",
                      color: "#ffffff",
                      fontSize: "12px",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setCustomMention("");
                      setShowCustomMention(false);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#86868b",
                      fontSize: "12px",
                      cursor: "pointer",
                    }}
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Title */}
          <div>
            <label
              style={{
                fontSize: "13px",
                fontWeight: 500,
                color: "#e5e5e7",
                display: "block",
                marginBottom: "6px",
              }}
            >
              หัวข้อประกาศ (Title)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ใส่หัวข้อประกาศ..."
              style={{
                width: "100%",
                padding: "10px 12px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "8px",
                color: "#ffffff",
                fontSize: "13px",
              }}
            />
          </div>

          {/* Description & In-Text Mention Toolbar */}
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "6px",
              }}
            >
              <label
                style={{
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "#e5e5e7",
                  margin: 0,
                }}
              >
                เนื้อหาประกาศ (Description)
              </label>
            </div>

            {/* Quick Insert Toolbar */}
            <div
              ref={toolbarDropdownRef}
              style={{
                position: "relative",
                display: "flex",
                flexWrap: "wrap",
                gap: "5px",
                alignItems: "center",
                padding: "6px 8px",
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderBottom: "none",
                borderTopLeftRadius: "8px",
                borderTopRightRadius: "8px",
              }}
            >
              <span style={{ fontSize: "11px", color: "#86868b", marginRight: "3px" }}>
                แทรกแท็ก:
              </span>

              {/* + @everyone button */}
              <button
                type="button"
                onClick={() => insertAtCursor("@everyone ")}
                style={{
                  padding: "2px 7px",
                  borderRadius: "4px",
                  background: "rgba(255, 149, 0, 0.15)",
                  border: "1px solid rgba(255, 149, 0, 0.3)",
                  color: "#ffb340",
                  fontSize: "11px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
                title="แทรก @everyone ลงในเนื้อหา"
              >
                + @everyone
              </button>

              {/* + @here button */}
              <button
                type="button"
                onClick={() => insertAtCursor("@here ")}
                style={{
                  padding: "2px 7px",
                  borderRadius: "4px",
                  background: "rgba(52, 199, 89, 0.15)",
                  border: "1px solid rgba(52, 199, 89, 0.3)",
                  color: "#34c759",
                  fontSize: "11px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
                title="แทรก @here ลงในเนื้อหา"
              >
                + @here
              </button>

              {/* + Role mention popover button */}
              <button
                type="button"
                onClick={() =>
                  setActiveToolbarDropdown(activeToolbarDropdown === "roles" ? "none" : "roles")
                }
                style={{
                  padding: "2px 7px",
                  borderRadius: "4px",
                  background: "rgba(88, 101, 242, 0.15)",
                  border: "1px solid rgba(88, 101, 242, 0.3)",
                  color: "#c9cdfb",
                  fontSize: "11px",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "3px",
                }}
                title="แทรกยศ Discord ลงในเนื้อหา"
              >
                <span>+ 🏷️ ยศ...</span>
                <span>▾</span>
              </button>

              {/* + Channel mention popover button */}
              <button
                type="button"
                onClick={() =>
                  setActiveToolbarDropdown(
                    activeToolbarDropdown === "channels" ? "none" : "channels"
                  )
                }
                style={{
                  padding: "2px 7px",
                  borderRadius: "4px",
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  color: "#e5e5e7",
                  fontSize: "11px",
                  fontWeight: 500,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "3px",
                }}
                title="แทรกชื่อห้อง #channel ลงในเนื้อหา"
              >
                <span>+ #️⃣ ช่อง...</span>
                <span>▾</span>
              </button>

              <div
                style={{
                  width: "1px",
                  height: "14px",
                  background: "rgba(255,255,255,0.1)",
                  margin: "0 4px",
                }}
              />

              {/* Markdown Helpers */}
              <button
                type="button"
                onClick={() => wrapSelection("**", "**", "ตัวหนา")}
                style={{
                  padding: "2px 6px",
                  borderRadius: "4px",
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  color: "#ffffff",
                  fontSize: "11px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
                title="ตัวหนา (**text**)"
              >
                B
              </button>

              <button
                type="button"
                onClick={() => wrapSelection("*", "*", "ตัวเอียง")}
                style={{
                  padding: "2px 6px",
                  borderRadius: "4px",
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  color: "#ffffff",
                  fontSize: "11px",
                  fontStyle: "italic",
                  cursor: "pointer",
                }}
                title="ตัวเอียง (*text*)"
              >
                I
              </button>

              <button
                type="button"
                onClick={() => insertAtCursor("\n> ")}
                style={{
                  padding: "2px 6px",
                  borderRadius: "4px",
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  color: "#ffffff",
                  fontSize: "11px",
                  cursor: "pointer",
                }}
                title="บล็อกอ้างอิง (> quote)"
              >
                &gt; Quote
              </button>

              <button
                type="button"
                onClick={() => wrapSelection("`", "`", "โค้ด")}
                style={{
                  padding: "2px 6px",
                  borderRadius: "4px",
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  color: "#ffffff",
                  fontSize: "11px",
                  fontFamily: "monospace",
                  cursor: "pointer",
                }}
                title="โค้ด (`code`)"
              >
                Code
              </button>

              {/* Roles Dropdown Popover */}
              {activeToolbarDropdown === "roles" && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: "80px",
                    zIndex: 50,
                    width: "250px",
                    background: "#1e1f22",
                    border: "1px solid rgba(88, 101, 242, 0.4)",
                    borderRadius: "8px",
                    padding: "8px",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
                  }}
                >
                  <input
                    type="text"
                    value={toolbarRoleSearch}
                    onChange={(e) => setToolbarRoleSearch(e.target.value)}
                    placeholder="พิมพ์ชื่อยศ..."
                    autoFocus
                    style={{
                      width: "100%",
                      padding: "6px 8px",
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "5px",
                      color: "#ffffff",
                      fontSize: "12px",
                      marginBottom: "6px",
                    }}
                  />
                  <div style={{ maxHeight: "160px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "2px" }}>
                    {filteredToolbarRoles.length === 0 ? (
                      <div style={{ fontSize: "12px", color: "#86868b", padding: "6px" }}>
                        ไม่พบยศ
                      </div>
                    ) : (
                      filteredToolbarRoles.map((role) => {
                        const roleColor =
                          role.color && role.color !== "#86868b" ? role.color : "#5865F2";
                        return (
                          <button
                            type="button"
                            key={role.id}
                            onClick={() => {
                              insertAtCursor(`<@&${role.id}> `);
                              setActiveToolbarDropdown("none");
                            }}
                            style={{
                              textAlign: "left",
                              padding: "6px 8px",
                              borderRadius: "4px",
                              background: "transparent",
                              border: "none",
                              color: "#dbdee1",
                              fontSize: "12px",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              width: "100%",
                            }}
                            onMouseEnter={(e) => {
                              (e.currentTarget as any).style.background = "rgba(88, 101, 242, 0.2)";
                            }}
                            onMouseLeave={(e) => {
                              (e.currentTarget as any).style.background = "transparent";
                            }}
                          >
                            <span
                              style={{
                                width: "8px",
                                height: "8px",
                                borderRadius: "50%",
                                background: roleColor,
                                flexShrink: 0,
                              }}
                            />
                            <span style={{ color: roleColor, fontWeight: 600 }}>@{role.name}</span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Channels Dropdown Popover */}
              {activeToolbarDropdown === "channels" && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: "140px",
                    zIndex: 50,
                    width: "250px",
                    background: "#1e1f22",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    borderRadius: "8px",
                    padding: "8px",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
                  }}
                >
                  <input
                    type="text"
                    value={toolbarChannelSearch}
                    onChange={(e) => setToolbarChannelSearch(e.target.value)}
                    placeholder="พิมพ์ชื่อห้อง..."
                    autoFocus
                    style={{
                      width: "100%",
                      padding: "6px 8px",
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "5px",
                      color: "#ffffff",
                      fontSize: "12px",
                      marginBottom: "6px",
                    }}
                  />
                  <div style={{ maxHeight: "160px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "2px" }}>
                    {filteredToolbarChannels.length === 0 ? (
                      <div style={{ fontSize: "12px", color: "#86868b", padding: "6px" }}>
                        ไม่พบห้อง
                      </div>
                    ) : (
                      filteredToolbarChannels.map((ch) => (
                        <button
                          type="button"
                          key={ch.id}
                          onClick={() => {
                            insertAtCursor(`<#${ch.id}> `);
                            setActiveToolbarDropdown("none");
                          }}
                          style={{
                            textAlign: "left",
                            padding: "6px 8px",
                            borderRadius: "4px",
                            background: "transparent",
                            border: "none",
                            color: "#dbdee1",
                            fontSize: "12px",
                            cursor: "pointer",
                            width: "100%",
                          }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as any).style.background = "rgba(255, 255, 255, 0.08)";
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as any).style.background = "transparent";
                          }}
                        >
                          #{ch.name}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <textarea
              ref={textareaRef}
              rows={6}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="พิมพ์เนื้อหาประกาศ รองรับ Markdown (**ตัวหนา**, *ตัวเอียง*, > คำคม) หรือแท็ก @everyone, ยศ..."
              style={{
                width: "100%",
                padding: "10px 12px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderTopLeftRadius: "0",
                borderTopRightRadius: "0",
                borderBottomLeftRadius: "8px",
                borderBottomRightRadius: "8px",
                color: "#ffffff",
                fontSize: "13px",
                lineHeight: "1.5",
                resize: "vertical",
              }}
            />
          </div>

          {/* Color Presets */}
          <div>
            <label
              style={{
                fontSize: "13px",
                fontWeight: 500,
                color: "#e5e5e7",
                display: "block",
                marginBottom: "6px",
              }}
            >
              สีขอบ Embed (Accent Color)
            </label>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              {colorPresets.map((c) => (
                <button
                  type="button"
                  key={c.hex}
                  onClick={() => setColor(c.hex)}
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    background: c.hex,
                    border:
                      color.toLowerCase() === c.hex.toLowerCase()
                        ? "2px solid #ffffff"
                        : "1px solid rgba(255,255,255,0.2)",
                    cursor: "pointer",
                    boxShadow:
                      color.toLowerCase() === c.hex.toLowerCase()
                        ? `0 0 10px ${c.hex}`
                        : "none",
                  }}
                  title={c.label}
                />
              ))}
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                style={{
                  width: "90px",
                  padding: "4px 8px",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "6px",
                  color: "#ffffff",
                  fontSize: "12px",
                  textAlign: "center",
                  marginLeft: "8px",
                }}
              />
            </div>
          </div>

          {/* Banner / Image URL */}
          <div>
            <label
              style={{
                fontSize: "13px",
                fontWeight: 500,
                color: "#e5e5e7",
                display: "block",
                marginBottom: "6px",
              }}
            >
              ลิงก์รูปภาพประกอบ / แบนเนอร์ (Image URL - ไม่บังคับ)
            </label>
            <input
              type="text"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/banner.png"
              style={{
                width: "100%",
                padding: "8px 12px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "8px",
                color: "#ffffff",
                fontSize: "13px",
              }}
            />
          </div>

          {/* Feedback Msg */}
          {resultMsg && (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: "8px",
                fontSize: "13px",
                background:
                  resultMsg.type === "success"
                    ? "rgba(52,199,89,0.12)"
                    : "rgba(255,59,48,0.12)",
                color: resultMsg.type === "success" ? "#34c759" : "#ff453a",
                border: `1px solid ${
                  resultMsg.type === "success" ? "rgba(52,199,89,0.2)" : "rgba(255,59,48,0.2)"
                }`,
              }}
            >
              {resultMsg.text}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={sending}
            className="btn btn-primary"
            style={{
              padding: "12px",
              fontSize: "14px",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              marginTop: "8px",
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M22 2L11 13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
            {sending ? "กำลังส่งประกาศ..." : "ส่งประกาศลง Discord ทันที"}
          </button>
        </form>
      </div>

      {/* Right Column: Live Discord Preview */}
      <div>
        <div
          style={{
            marginBottom: "12px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: "#86868b",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            ตัวอย่างข้อความบน Discord (Live Preview)
          </span>
          {selectedChannel && (
            <span style={{ fontSize: "12px", color: "#86868b" }}>
              ห้อง: #{channels.find((c) => c.id === selectedChannel)?.name || "channel"}
            </span>
          )}
        </div>

        {/* Discord Mock Container */}
        <div
          style={{
            background: "#313338",
            borderRadius: "12px",
            padding: "18px 20px",
            fontFamily: "var(--font-sans)",
            color: "#dbdee1",
            boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
            border: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          {/* Discord Bot Header */}
          <div
            style={{
              display: "flex",
              gap: "12px",
              alignItems: "flex-start",
              marginBottom: "6px",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                background: "#5865F2",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                fontWeight: 700,
                fontSize: "14px",
                flexShrink: 0,
                boxShadow: "0 2px 10px rgba(88, 101, 242, 0.4)",
              }}
            >
              LB
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontWeight: 600, color: "#f2f3f5", fontSize: "14px" }}>
                  LynnBot
                </span>
                <span
                  style={{
                    background: "#5865f2",
                    color: "#ffffff",
                    fontSize: "10px",
                    fontWeight: 700,
                    padding: "1px 4px",
                    borderRadius: "3px",
                  }}
                >
                  BOT
                </span>
                <span style={{ fontSize: "11px", color: "#949ba4", marginLeft: "4px" }}>
                  วันนี้ เวลา 21:00
                </span>
              </div>

              {/* Live Discord Outer Mentions (Real Push Notification text) */}
              {hasAnyMentions && (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "6px",
                    alignItems: "center",
                    marginTop: "6px",
                  }}
                >
                  {mentionPreset === "everyone" && (
                    <span
                      style={{
                        background: "rgba(88, 101, 242, 0.3)",
                        color: "#c9cdfb",
                        padding: "1px 6px",
                        borderRadius: "3px",
                        fontSize: "13px",
                        fontWeight: 600,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "2px",
                      }}
                    >
                      @everyone
                    </span>
                  )}

                  {mentionPreset === "here" && (
                    <span
                      style={{
                        background: "rgba(88, 101, 242, 0.3)",
                        color: "#c9cdfb",
                        padding: "1px 6px",
                        borderRadius: "3px",
                        fontSize: "13px",
                        fontWeight: 600,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "2px",
                      }}
                    >
                      @here
                    </span>
                  )}

                  {selectedRoles.map((roleId) => {
                    const role = roles.find((r) => r.id === roleId);
                    const roleColor =
                      role?.color && role.color !== "#86868b" ? role.color : "#5865F2";
                    return (
                      <span
                        key={roleId}
                        style={{
                          background: `${roleColor}25`,
                          color: roleColor,
                          padding: "1px 6px",
                          borderRadius: "3px",
                          fontSize: "13px",
                          fontWeight: 600,
                          borderLeft: `2px solid ${roleColor}`,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        @{role?.name || "role"}
                      </span>
                    );
                  })}

                  {customMention.trim() && (
                    <span style={{ color: "#dbdee1", fontSize: "13px" }}>
                      {customMention.trim()}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Embed Container */}
          <div
            style={{
              marginLeft: "52px",
              borderLeft: `4px solid ${color}`,
              background: "#2b2d31",
              borderRadius: "4px",
              padding: "12px 16px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <div style={{ fontSize: "15px", fontWeight: 700, color: "#ffffff" }}>
              {title || "หัวข้อประกาศ"}
            </div>

            <div
              style={{
                fontSize: "13px",
                color: "#dbdee1",
                lineHeight: "1.5",
              }}
            >
              {renderDiscordContent(description || "เนื้อหาประกาศ...")}
            </div>

            {imageUrl && (
              <div style={{ marginTop: "8px" }}>
                <img
                  src={imageUrl}
                  alt="Banner preview"
                  style={{
                    maxWidth: "100%",
                    maxHeight: "260px",
                    borderRadius: "4px",
                    objectFit: "cover",
                  }}
                  onError={(e) => {
                    (e.target as any).style.display = "none";
                  }}
                />
              </div>
            )}

            <div
              style={{
                fontSize: "11px",
                color: "#949ba4",
                marginTop: "4px",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <span>ประกาศโดย LynnBot • วันนี้ เวลา 21:00</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
