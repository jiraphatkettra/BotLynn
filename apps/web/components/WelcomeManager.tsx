"use client";

import { useState, useEffect, useMemo } from "react";
import CustomSelect from "@/components/CustomSelect";

interface DiscordChannel {
  id: string;
  name: string;
}

interface WelcomeManagerProps {
  initialSettings: Record<string, string>;
  isSuperAdmin: boolean;
  standalone?: boolean;
}

export default function WelcomeManager({
  initialSettings,
  isSuperAdmin,
  standalone = false,
}: WelcomeManagerProps) {
  const [settings, setSettings] = useState<Record<string, string>>(initialSettings);
  const [savedSettings, setSavedSettings] = useState<Record<string, string>>(initialSettings);
  const [channels, setChannels] = useState<DiscordChannel[]>([]);
  const [roles, setRoles] = useState<{ id: string; name: string; color?: string }[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testingWelcome, setTestingWelcome] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (isSuperAdmin) {
      setLoadingChannels(true);
      fetch("/api/discord/guild-data")
        .then((r) => r.json())
        .then((data) => {
          if (data.channels) setChannels(data.channels);
          if (data.roles) setRoles(data.roles);
        })
        .catch((e) => console.error("Error loading channels:", e))
        .finally(() => setLoadingChannels(false));
    }
  }, [isSuperAdmin]);

  // Keep state synced if initialSettings change
  useEffect(() => {
    setSettings(initialSettings);
    setSavedSettings(initialSettings);
  }, [initialSettings]);

  const welcomeKeys = [
    "welcome_enabled",
    "welcome_dm_enabled",
    "welcome_show_author",
    "welcome_author_text",
    "welcome_show_fields",
    "welcome_channel_id",
    "rules_channel_id",
    "welcome_title",
    "welcome_embed_color",
    "welcome_message",
    "welcome_banner_url",
    "autorole_enabled",
    "autorole_id",
  ];

  const changedKeys = useMemo(() => {
    return welcomeKeys.filter((key) => {
      const cur = (settings[key] || "").trim();
      const prev = (savedSettings[key] || "").trim();
      return cur !== prev;
    });
  }, [settings, savedSettings]);

  const hasChanges = changedKeys.length > 0;

  function handleChange(key: string, value: string) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  function handleReset() {
    setSettings(savedSettings);
    showToast("คืนค่าเดิมเรียบร้อยแล้ว", "success");
  }

  function showToast(message: string, type: "success" | "error" = "success") {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  }

  async function handleSave() {
    if (!isSuperAdmin) return;
    setSaving(true);
    try {
      const payload: Record<string, string> = {};
      for (const k of welcomeKeys) {
        if (settings[k] !== undefined) {
          payload[k] = settings[k];
        }
      }

      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: payload }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "เกิดข้อผิดพลาดในการบันทึก");
      }

      setSavedSettings({ ...settings });
      showToast("บันทึกการตั้งค่าระบบต้อนรับสำเร็จแล้ว!", "success");
    } catch (err: any) {
      showToast(err.message || "เกิดข้อผิดพลาดในการบันทึก", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleTestWelcome() {
    const channelId = settings.welcome_channel_id;
    if (!channelId) {
      showToast("กรุณาเลือกห้องส่งข้อความต้อนรับก่อนกดทดสอบ", "error");
      return;
    }

    setTestingWelcome(true);
    try {
      const res = await fetch("/api/welcome/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId,
          title: settings.welcome_title,
          message: settings.welcome_message,
          color: settings.welcome_embed_color || "#2997ff",
          bannerUrl: settings.welcome_banner_url,
          rulesChannelId: settings.rules_channel_id,
          showFields: settings.welcome_show_fields === "true",
          showAuthor: settings.welcome_show_author !== "false",
          authorText: settings.welcome_author_text,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || "ส่งการ์ดต้อนรับทดสอบเข้า Discord สำเร็จ!", "success");
      } else {
        showToast(data.error || "ไม่สามารถส่งข้อความได้", "error");
      }
    } catch (err: any) {
      showToast(err.message || "เกิดข้อผิดพลาดในการเชื่อมต่อ", "error");
    } finally {
      setTestingWelcome(false);
    }
  }

  return (
    <div style={{ position: "relative", paddingBottom: hasChanges ? "90px" : "20px" }}>
      {/* Toast Alert */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 20,
            right: 20,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 18px",
            borderRadius: "var(--radius-md)",
            background: toast.type === "success" ? "rgba(48, 209, 88, 0.16)" : "rgba(255, 69, 58, 0.16)",
            border: `1px solid ${toast.type === "success" ? "rgba(48, 209, 88, 0.4)" : "rgba(255, 69, 58, 0.4)"}`,
            color: toast.type === "success" ? "#30d158" : "#ff453a",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
            fontSize: 13,
            fontWeight: 500,
            animation: "fadeIn 0.2s ease",
          }}
        >
          <span>{toast.type === "success" ? "✓" : "⚠️"}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Main Card */}
      <div className="card mb-24">
        <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 className="card-title">
            <span className="card-title-icon">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <line x1="19" y1="8" x2="19" y2="14" />
                <line x1="22" y1="11" x2="16" y2="11" />
              </svg>
            </span>
            ระบบต้อนรับ & แจกยศสมาชิกใหม่อัตโนมัติ (Welcome Studio)
          </h3>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            disabled={!isSuperAdmin || testingWelcome || !settings.welcome_channel_id}
            onClick={handleTestWelcome}
            title={!settings.welcome_channel_id ? "กรุณาเลือกห้องส่งข้อความต้อนรับก่อนกดทดสอบ" : "ทดสอบส่งเข้าห้อง Discord ที่เลือก"}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 600 }}
          >
            {testingWelcome ? (
              <>
                <span className="spinner" style={{ width: 14, height: 14 }} /> กำลังส่งข้อความ...
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
                ทดสอบส่งเข้า Discord ทันที
              </>
            )}
          </button>
        </div>

        <div className="card-body">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 24 }}>
            {/* Left Column: Configuration Controls */}
            <div className="settings-section" style={{ border: "none", padding: 0 }}>
              {/* 1. Toggles */}
              <div className="settings-row" style={{ padding: "12px 0" }}>
                <div>
                  <div className="settings-row-label">เปิดใช้งานการ์ดต้อนรับสมาชิกใหม่</div>
                  <div className="settings-row-desc">
                    ส่งการ์ดต้อนรับแบบ Embed เข้าห้อง Discord ทันทีที่มีสมาชิกใหม่เข้าร่วม
                  </div>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    disabled={!isSuperAdmin}
                    checked={settings.welcome_enabled !== "false"}
                    onChange={(e) =>
                      handleChange("welcome_enabled", e.target.checked ? "true" : "false")
                    }
                  />
                  <span className="toggle-slider" />
                </label>
              </div>

              <div className="settings-row" style={{ padding: "12px 0" }}>
                <div>
                  <div className="settings-row-label">ส่งข้อความทักทายเข้า DM ส่วนตัว</div>
                  <div className="settings-row-desc">
                    ส่งข้อความต้อนรับและคำแนะนำเข้าแชทส่วนตัวของสมาชิกใหม่อัตโนมัติ
                  </div>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    disabled={!isSuperAdmin}
                    checked={settings.welcome_dm_enabled === "true"}
                    onChange={(e) =>
                      handleChange("welcome_dm_enabled", e.target.checked ? "true" : "false")
                    }
                  />
                  <span className="toggle-slider" />
                </label>
              </div>

              {/* Author Header Toggle */}
              <div className="settings-row" style={{ padding: "12px 0" }}>
                <div>
                  <div className="settings-row-label">แสดงแถบชื่อผู้เข้าร่วมด้านบน (Author Header)</div>
                  <div className="settings-row-desc">
                    แสดงรูปโปรไฟล์และข้อความ 'ชื่อ เข้าร่วมเซิร์ฟเวอร์ ✨' ที่ขอบบนสุดของการ์ด (มีหรือไม่มีก็ได้)
                  </div>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    disabled={!isSuperAdmin}
                    checked={settings.welcome_show_author !== "false"}
                    onChange={(e) =>
                      handleChange("welcome_show_author", e.target.checked ? "true" : "false")
                    }
                  />
                  <span className="toggle-slider" />
                </label>
              </div>

              {/* Custom Author Text if Author is Enabled */}
              {settings.welcome_show_author !== "false" && (
                <div className="settings-row" style={{ padding: "10px 0", background: "rgba(255,255,255,0.02)", borderRadius: "var(--radius-sm)", paddingLeft: 10, paddingRight: 10 }}>
                  <div>
                    <div className="settings-row-label" style={{ fontSize: 13 }}>ข้อความแถบผู้เข้าร่วม (Author Text)</div>
                    <div className="settings-row-desc">
                      ค่าเริ่มต้น: &#123;name&#125; เข้าร่วมเซิร์ฟเวอร์ ✨
                    </div>
                  </div>
                  <div style={{ minWidth: 200, maxWidth: 300, width: "100%" }}>
                    <input
                      type="text"
                      className="form-input"
                      disabled={!isSuperAdmin}
                      value={settings.welcome_author_text || ""}
                      onChange={(e) => handleChange("welcome_author_text", e.target.value)}
                      placeholder="{name} เข้าร่วมเซิร์ฟเวอร์ ✨"
                      style={{ width: "100%", fontSize: 13 }}
                    />
                  </div>
                </div>
              )}

              {/* Member Info Grid Toggle */}
              <div className="settings-row" style={{ padding: "12px 0" }}>
                <div>
                  <div className="settings-row-label">แสดงกล่องข้อมูลสมาชิก 3 ช่อง (Member Info Grid)</div>
                  <div className="settings-row-desc">
                    แสดงแถบข้อมูลสมาชิก (@ชื่อ), ลำดับสมาชิกคนที่, และวันที่สร้างบัญชี (ปิดเพื่อความมินิมอล ไม่รก)
                  </div>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    disabled={!isSuperAdmin}
                    checked={settings.welcome_show_fields === "true"}
                    onChange={(e) =>
                      handleChange("welcome_show_fields", e.target.checked ? "true" : "false")
                    }
                  />
                  <span className="toggle-slider" />
                </label>
              </div>

              {/* 2. Channel Selectors */}
              <div className="settings-row" style={{ padding: "12px 0" }}>
                <div>
                  <div className="settings-row-label">ห้องส่งข้อความต้อนรับ (Welcome Channel)</div>
                  <div className="settings-row-desc">
                    เลือกห้องใน Discord ที่ต้องการให้บอทส่งการ์ดต้อนรับ
                  </div>
                </div>
                <div style={{ minWidth: 240, maxWidth: 320, width: "100%" }}>
                  <CustomSelect
                    disabled={!isSuperAdmin || loadingChannels}
                    value={settings.welcome_channel_id || ""}
                    onChange={(val) => handleChange("welcome_channel_id", val)}
                    placeholder="— ไม่เลือกห้อง —"
                    options={[
                      { value: "", label: "— ไม่เลือกห้อง —" },
                      ...channels.map((ch) => ({
                        value: ch.id,
                        label: `#${ch.name}`,
                        sub: `ID: ${ch.id}`,
                      })),
                    ]}
                    style={{ width: "100%" }}
                  />
                </div>
              </div>

              <div className="settings-row" style={{ padding: "12px 0" }}>
                <div>
                  <div className="settings-row-label">ห้องกฎระเบียบเซิร์ฟเวอร์ (Rules Channel)</div>
                  <div className="settings-row-desc">
                    ใช้สำหรับทำปุ่มกดลิงก์และแทนที่ตัวแปร &#123;rules&#125;
                  </div>
                </div>
                <div style={{ minWidth: 240, maxWidth: 320, width: "100%" }}>
                  <CustomSelect
                    disabled={!isSuperAdmin || loadingChannels}
                    value={settings.rules_channel_id || ""}
                    onChange={(val) => handleChange("rules_channel_id", val)}
                    placeholder="— ตรวจหาอัตโนมัติ —"
                    options={[
                      { value: "", label: "— ตรวจหาอัตโนมัติ —" },
                      ...channels.map((ch) => ({
                        value: ch.id,
                        label: `#${ch.name}`,
                        sub: `ID: ${ch.id}`,
                      })),
                    ]}
                    style={{ width: "100%" }}
                  />
                </div>
              </div>

              {/* 3. Title */}
              <div className="settings-row" style={{ padding: "12px 0" }}>
                <div>
                  <div className="settings-row-label">หัวข้อการ์ดต้อนรับ (Title)</div>
                  <div className="settings-row-desc">
                    ข้อความหัวเรื่องด้านบนการ์ด (เว้นว่างไว้หากไม่ต้องการให้มีหัวข้อ หรือใช้ &#123;server&#125;, &#123;name&#125; ได้)
                  </div>
                </div>
                <div style={{ minWidth: 240, maxWidth: 320, width: "100%" }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input
                      type="text"
                      className="form-input"
                      disabled={!isSuperAdmin}
                      value={settings.welcome_title !== undefined ? settings.welcome_title : ""}
                      onChange={(e) => handleChange("welcome_title", e.target.value)}
                      placeholder="เว้นว่างได้ (ไม่แสดงหัวข้อ)"
                      style={{ flex: 1 }}
                    />
                    {settings.welcome_title && (
                      <button
                        type="button"
                        className="btn btn-xs btn-secondary"
                        disabled={!isSuperAdmin}
                        onClick={() => handleChange("welcome_title", "")}
                        title="ลบหัวข้อ (ไม่ใส่หัวข้อ)"
                        style={{ padding: "4px 8px", fontSize: 11, flexShrink: 0 }}
                      >
                        ✕ ลบ
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* 4. Color Palette */}
              <div className="settings-row" style={{ padding: "12px 0", alignItems: "flex-start" }}>
                <div>
                  <div className="settings-row-label">สีแถบข้างการ์ด Embed (Theme Color)</div>
                  <div className="settings-row-desc">
                    เลือกสีของเส้นขอบด้านซ้ายของการ์ดต้อนรับใน Discord
                  </div>
                </div>
                <div style={{ minWidth: 240, maxWidth: 320, width: "100%" }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                    {[
                      { color: "#2997ff", label: "Apple Blue" },
                      { color: "#00f0ff", label: "Cyan" },
                      { color: "#30d158", label: "Green" },
                      { color: "#8b5cf6", label: "Purple" },
                      { color: "#ffd60a", label: "Gold" },
                      { color: "#ff453a", label: "Red" },
                      { color: "#16161c", label: "Dark" },
                    ].map((preset) => {
                      const isSelected = (settings.welcome_embed_color || "#2997ff").toLowerCase() === preset.color.toLowerCase();
                      return (
                        <button
                          key={preset.color}
                          type="button"
                          disabled={!isSuperAdmin}
                          onClick={() => handleChange("welcome_embed_color", preset.color)}
                          title={preset.label}
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: "50%",
                            backgroundColor: preset.color,
                            border: isSelected ? "2px solid #ffffff" : "1px solid rgba(255,255,255,0.2)",
                            boxShadow: isSelected ? `0 0 10px ${preset.color}` : "none",
                            cursor: "pointer",
                            padding: 0,
                          }}
                        />
                      );
                    })}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="color"
                      disabled={!isSuperAdmin}
                      value={settings.welcome_embed_color || "#2997ff"}
                      onChange={(e) => handleChange("welcome_embed_color", e.target.value)}
                      style={{
                        width: 34,
                        height: 34,
                        padding: 0,
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--border-subtle)",
                        backgroundColor: "transparent",
                        cursor: "pointer",
                      }}
                    />
                    <input
                      type="text"
                      className="form-input"
                      disabled={!isSuperAdmin}
                      value={settings.welcome_embed_color || "#2997ff"}
                      onChange={(e) => handleChange("welcome_embed_color", e.target.value)}
                      placeholder="#2997ff"
                      style={{ flex: 1, fontFamily: "var(--font-mono, monospace)", fontSize: 13 }}
                    />
                  </div>
                </div>
              </div>

              {/* 5. Message Content & Quick Insert Chips */}
              <div style={{ padding: "12px 0" }}>
                <div style={{ marginBottom: 8 }}>
                  <div className="settings-row-label">ข้อความต้อนรับกำหนดเอง (Welcome Message)</div>
                  <div className="settings-row-desc">
                    พิมพ์ข้อความต้อนรับ รองรับการขึ้นบรรทัดใหม่ และคลิกแท็กตัวแปรด้านล่างเพื่อแทรกอัตโนมัติ
                  </div>
                </div>
                <textarea
                  className="form-input"
                  disabled={!isSuperAdmin}
                  rows={5}
                  value={
                    settings.welcome_message !== undefined
                      ? settings.welcome_message
                      : "ยินดีต้อนรับสู่ {server}! ขอให้มีความสุขกับการพูดคุยและร่วมกิจกรรมกับพวกเรานะครับ ✨"
                  }
                  onChange={(e) => handleChange("welcome_message", e.target.value)}
                  placeholder="พิมพ์ข้อความต้อนรับที่นี่..."
                  style={{ width: "100%", lineHeight: 1.5, resize: "vertical" }}
                />
                {/* Variable insertion tags */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                  {[
                    { tag: "{user}", desc: "แท็กสมาชิก (@ชื่อ)" },
                    { tag: "{username}", desc: "ชื่อไอดี" },
                    { tag: "{name}", desc: "ชื่อแสดง" },
                    { tag: "{server}", desc: "ชื่อเซิร์ฟเวอร์" },
                    { tag: "{count}", desc: "สมาชิกลำดับที่" },
                    { tag: "{rules}", desc: "แท็กห้องกฎ" },
                  ].map((item) => (
                    <button
                      key={item.tag}
                      type="button"
                      className="btn btn-xs btn-secondary"
                      disabled={!isSuperAdmin}
                      onClick={() => {
                        const cur = settings.welcome_message !== undefined ? settings.welcome_message : "ยินดีต้อนรับสู่ {server}!";
                        handleChange("welcome_message", cur + " " + item.tag);
                      }}
                      style={{
                        fontSize: 11,
                        padding: "2px 8px",
                        fontFamily: "var(--font-mono, monospace)",
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.12)",
                      }}
                      title={item.desc}
                    >
                      + {item.tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* 6. Banner URL */}
              <div className="settings-row" style={{ padding: "12px 0" }}>
                <div>
                  <div className="settings-row-label">รูปภาพแบนเนอร์ด้านล่าง (Banner Image URL)</div>
                  <div className="settings-row-desc">
                    URL รูปภาพแนวนอนสำหรับแสดงด้านล่างของการ์ด (เว้นว่างเพื่อใช้แบนเนอร์ของเซิร์ฟเวอร์)
                  </div>
                </div>
                <div style={{ minWidth: 240, maxWidth: 320, width: "100%" }}>
                  <input
                    type="url"
                    className="form-input"
                    disabled={!isSuperAdmin}
                    value={settings.welcome_banner_url || ""}
                    onChange={(e) => handleChange("welcome_banner_url", e.target.value)}
                    placeholder="https://example.com/banner.png"
                    style={{ width: "100%" }}
                  />
                </div>
              </div>

              {/* 7. Auto-Role */}
              <div style={{ borderTop: "1px solid var(--border-subtle)", marginTop: 12, paddingTop: 12 }}>
                <div className="settings-row" style={{ padding: "10px 0" }}>
                  <div>
                    <div className="settings-row-label">เปิดใช้งานแจกยศเริ่มต้นอัตโนมัติ (Auto-Role)</div>
                    <div className="settings-row-desc">
                      มอบยศให้สมาชิกใหม่ทันทีที่กดเข้าเซิร์ฟเวอร์ โดยไม่ต้องรอแอดมินกดให้
                    </div>
                  </div>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      disabled={!isSuperAdmin}
                      checked={settings.autorole_enabled === "true"}
                      onChange={(e) =>
                        handleChange("autorole_enabled", e.target.checked ? "true" : "false")
                      }
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>

                <div className="settings-row" style={{ padding: "10px 0" }}>
                  <div>
                    <div className="settings-row-label">ยศเริ่มต้นที่ต้องการแจก (Default Role)</div>
                    <div className="settings-row-desc">
                      เลือกยศจากเซิร์ฟเวอร์ Discord สำหรับสมาชิกใหม่
                    </div>
                  </div>
                  <div style={{ minWidth: 240, maxWidth: 320, width: "100%" }}>
                    <CustomSelect
                      disabled={!isSuperAdmin || loadingChannels}
                      value={settings.autorole_id || ""}
                      onChange={(val) => handleChange("autorole_id", val)}
                      placeholder="— ไม่แจกยศ —"
                      options={[
                        { value: "", label: "— ไม่แจกยศ —" },
                        ...roles.map((r) => ({
                          value: r.id,
                          label: `@${r.name}`,
                          sub: `ID: ${r.id}`,
                        })),
                      ]}
                      style={{ width: "100%" }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Live Interactive Discord Embed Mockup */}
            <div
              style={{
                background: "rgba(10, 10, 14, 0.7)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-lg)",
                padding: 20,
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border-subtle)", paddingBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                  Live Preview • ตัวอย่างการ์ดใน Discord
                </span>
                <span style={{ fontSize: 11, color: "var(--accent)", background: "rgba(41,151,255,0.1)", padding: "2px 8px", borderRadius: 9999 }}>
                  Real-time Sync
                </span>
              </div>

              {/* Discord Message Mockup */}
              <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                {/* Bot Avatar */}
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    backgroundColor: "#000",
                    overflow: "hidden",
                    flexShrink: 0,
                  }}
                >
                  <img src="/logo.png" alt="Bot" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e: any) => { e.target.style.display = "none"; }} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Bot Header */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>LynnBot</span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        backgroundColor: "#5865f2",
                        color: "#fff",
                        borderRadius: 3,
                        padding: "1px 4px",
                        letterSpacing: "0.05em",
                      }}
                    >
                      APP
                    </span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>วันนี้ เวลา 16:45</span>
                  </div>

                  <div style={{ fontSize: 14, color: "#939aff", marginBottom: 8 }}>@จิ๊กโก๋</div>

                  {/* Discord Embed Box */}
                  <div
                    style={{
                      backgroundColor: "#2b2d31",
                      borderLeft: `4px solid ${settings.welcome_embed_color || "#2997ff"}`,
                      borderRadius: "0 4px 4px 0",
                      padding: "12px 16px",
                      maxWidth: 480,
                      boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
                    }}
                  >
                    {/* Author (Optional: rendered only if showAuthor is true) */}
                    {settings.welcome_show_author !== "false" && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <div style={{ width: 22, height: 22, borderRadius: "50%", backgroundColor: "#555", overflow: "hidden" }}>
                          <img src="/logo.png" alt="User" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e: any) => { e.target.style.display = "none"; }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#dbdee1" }}>
                          {(settings.welcome_author_text || "{name} เข้าร่วมเซิร์ฟเวอร์ ✨")
                            .replace(/\{name\}/g, "จิ๊กโก๋")
                            .replace(/\{user\}/g, "@จิ๊กโก๋")
                            .replace(/\{server\}/g, "753 BC")}
                        </span>
                      </div>
                    )}

                    {/* Title & Thumbnail Grid */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        {/* Title (Optional) */}
                        {Boolean(settings.welcome_title && settings.welcome_title.trim()) && (
                          <h4
                            style={{
                              fontSize: 14,
                              fontWeight: 700,
                              color: "#fff",
                              margin: "0 0 8px 0",
                              lineHeight: 1.3,
                            }}
                          >
                            {settings.welcome_title
                              .replace(/\{server\}/g, "753 BC")
                              .replace(/\{user\}/g, "จิ๊กโก๋")
                              .replace(/\{name\}/g, "จิ๊กโก๋")}
                          </h4>
                        )}

                        {/* Description */}
                        <div
                          style={{
                            fontSize: 13,
                            color: "#dbdee1",
                            lineHeight: 1.45,
                            whiteSpace: "pre-line",
                            marginBottom: 12,
                          }}
                        >
                          {(settings.welcome_message || "ยินดีต้อนรับสู่ {server}! ขอให้มีความสุขกับการพูดคุยและร่วมกิจกรรมกับพวกเรานะครับ ✨")
                            .replace(/\{user\}/g, "@จิ๊กโก๋")
                            .replace(/\{username\}/g, "dasd08930")
                            .replace(/\{name\}/g, "จิ๊กโก๋")
                            .replace(/\{server\}/g, "753 BC")
                            .replace(/\{count\}/g, "60")
                            .replace(/\{rules\}/g, "#rules")}
                        </div>
                      </div>

                      {/* Thumbnail */}
                      <div
                        style={{
                          width: 64,
                          height: 64,
                          borderRadius: "50%",
                          backgroundColor: "#404249",
                          overflow: "hidden",
                          flexShrink: 0,
                          boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
                        }}
                      >
                        <img src="/logo.png" alt="Member" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e: any) => { e.target.style.display = "none"; }} />
                      </div>
                    </div>

                    {/* Fields (Optional: Hidden by default) */}
                    {settings.welcome_show_fields === "true" && (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, margin: "10px 0" }}>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "#949ba4" }}>👤 สมาชิก</div>
                          <div style={{ fontSize: 12, color: "#5865f2", fontWeight: 600 }}>@จิ๊กโก๋</div>
                          <div style={{ fontSize: 10, color: "#80848e" }}>dasd08930</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "#949ba4" }}>👥 ลำดับสมาชิก</div>
                          <div style={{ fontSize: 12, color: "#dbdee1", fontWeight: 600 }}>คนที่ #60</div>
                          <div style={{ fontSize: 10, color: "#80848e" }}>ในเซิร์ฟเวอร์</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "#949ba4" }}>📅 สร้างบัญชีเมื่อ</div>
                          <div style={{ fontSize: 12, color: "#dbdee1" }}>วันนี้</div>
                          <div style={{ fontSize: 10, color: "#80848e" }}>(จำลอง)</div>
                        </div>
                      </div>
                    )}

                    {settings.rules_channel_id && (
                      <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#949ba4" }}>📜 เริ่มต้นใช้งาน</div>
                        <div style={{ fontSize: 12, color: "#5865f2" }}>อ่านกฎระเบียบก่อนเริ่มคุย: #rules</div>
                      </div>
                    )}

                    {/* Banner Image Preview */}
                    {settings.welcome_banner_url && (
                      <div style={{ marginTop: 10, borderRadius: 4, overflow: "hidden", maxHeight: 180 }}>
                        <img
                          src={settings.welcome_banner_url}
                          alt="Banner Preview"
                          style={{ width: "100%", objectFit: "cover" }}
                          onError={(e: any) => { e.target.style.display = "none"; }}
                        />
                      </div>
                    )}

                    {/* Footer */}
                    <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: "#949ba4" }}>
                      <span>753 BC Community • LynnBot Welcome System</span>
                    </div>
                  </div>

                  {/* Discord Action Button Mockup */}
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        backgroundColor: "#4e5058",
                        color: "#fff",
                        fontSize: 12,
                        fontWeight: 600,
                        padding: "6px 12px",
                        borderRadius: 3,
                        cursor: "default",
                      }}
                    >
                      <span>📖</span>
                      <span>กฎระเบียบเซิร์ฟเวอร์ ↗</span>
                    </div>
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        backgroundColor: "#4e5058",
                        color: "#fff",
                        fontSize: 12,
                        fontWeight: 600,
                        padding: "6px 12px",
                        borderRadius: 3,
                        cursor: "default",
                      }}
                    >
                      <span>📢</span>
                      <span>ห้องประกาศเซิร์ฟเวอร์ ↗</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Save Bar */}
      {hasChanges && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            gap: 16,
            padding: "12px 24px",
            background: "rgba(18, 18, 24, 0.9)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-lg)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
            animation: "slideUp 0.25s ease",
          }}
        >
          <div style={{ fontSize: 13, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--warning)" }} />
            <span>มีการแก้ไขการตั้งค่า {changedKeys.length} รายการที่ยังไม่ได้บันทึก</span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              disabled={saving}
              onClick={handleReset}
            >
              คืนค่าเดิม
            </button>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              disabled={saving}
              onClick={handleSave}
              style={{ fontWeight: 600, minWidth: 120 }}
            >
              {saving ? (
                <>
                  <span className="spinner" style={{ width: 14, height: 14 }} /> กำลังบันทึก...
                </>
              ) : (
                "บันทึกการตั้งค่า"
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
