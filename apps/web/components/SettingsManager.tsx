"use client";

import { useState, useEffect, useMemo } from "react";
import CustomSelect from "@/components/CustomSelect";

interface DiscordChannel {
  id: string;
  name: string;
}

interface SettingsManagerProps {
  initialSettings: Record<string, string>;
  isSuperAdmin: boolean;
}

const TABS = [
  { id: "all", label: "🌐 ทั้งหมด" },
  { id: "channels", label: "📢 ห้องแจ้งเตือน Discord" },
  { id: "attendance", label: "⏱️ ระบบตอกบัตร" },
  { id: "shop", label: "🛍️ ร้านค้ายศ" },
  { id: "welcome", label: "👋 ต้อนรับ & แจกยศ" },
  { id: "wallet", label: "💳 การเงิน & พร้อมเพย์" },
  { id: "tickets", label: "🎫 ทิกเก็ต & สลิป" },
];

export default function SettingsManager({
  initialSettings,
  isSuperAdmin,
}: SettingsManagerProps) {
  const [settings, setSettings] = useState<Record<string, string>>(initialSettings);
  const [savedSettings, setSavedSettings] = useState<Record<string, string>>(initialSettings);
  const [channels, setChannels] = useState<DiscordChannel[]>([]);
  const [roles, setRoles] = useState<{ id: string; name: string; color?: string }[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // UX Enhancements: Tabs & Search
  const [activeTab, setActiveTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Quick channel test
  const [testingChannel, setTestingChannel] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ channelId: string; success: boolean; message: string } | null>(null);

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

  // Track unsaved changes
  const changedKeys = useMemo(() => {
    const keys = new Set([...Object.keys(settings), ...Object.keys(savedSettings)]);
    const diffs: string[] = [];
    keys.forEach((key) => {
      const cur = (settings[key] || "").trim();
      const prev = (savedSettings[key] || "").trim();
      if (cur !== prev) {
        diffs.push(key);
      }
    });
    return diffs;
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
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });

      if (res.ok) {
        setSavedSettings(settings);
        showToast("บันทึกการตั้งค่าทั้งหมดเรียบร้อยแล้ว!", "success");
      } else {
        const data = await res.json();
        showToast(data.error || "เกิดข้อผิดพลาดในการบันทึก", "error");
      }
    } catch (e: any) {
      showToast(e.message || "Failed to save settings", "error");
    } finally {
      setSaving(false);
    }
  }

  // Quick Discord Channel Notification Test
  async function handleTestChannel(channelId?: string, channelLabel?: string) {
    if (!channelId) {
      showToast("กรุณาเลือกห้อง Discord ก่อนทดสอบส่งข้อความ", "error");
      return;
    }
    setTestingChannel(channelId);
    setTestResult(null);

    try {
      const res = await fetch("/api/discord/test-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId }),
      });
      const data = await res.json();

      if (res.ok) {
        setTestResult({
          channelId,
          success: true,
          message: `ส่งข้อความทดสอบเข้า ${channelLabel || "ห้องนี้"} สำเร็จแล้ว! ตรวจสอบที่ Discord ได้เลย`,
        });
        showToast("ส่งข้อความทดสอบเข้า Discord สำเร็จ!", "success");
      } else {
        setTestResult({
          channelId,
          success: false,
          message: data.error || "ไม่สามารถส่งข้อความได้ กรุณาตรวจสอบสิทธิ์บอท",
        });
        showToast(data.error || "บอทส่งข้อความไม่สำเร็จ", "error");
      }
    } catch (err: any) {
      setTestResult({
        channelId,
        success: false,
        message: err.message || "เกิดข้อผิดพลาดในการเชื่อมต่อ",
      });
      showToast(err.message || "Connection error", "error");
    } finally {
      setTestingChannel(null);
    }
  }

  // Search filter helper
  const q = searchQuery.toLowerCase().trim();
  function matchesSearch(...texts: (string | undefined | null)[]) {
    if (!q) return true;
    return texts.some((t) => t && t.toLowerCase().includes(q));
  }

  // Section visibility checks
  const showChannelsCard =
    (activeTab === "all" || activeTab === "channels") &&
    (matchesSearch(
      "ห้องสำหรับให้บอทส่งข้อความแจ้งเตือน",
      "discord channels",
      "ห้องส่งข้อความซื้อยศ",
      "shop purchase log",
      "ห้องแจ้งเตือนการตอกบัตร",
      "attendance log",
      "slip",
      "ticket"
    ));

  const showAttendanceCard =
    (activeTab === "all" || activeTab === "attendance") &&
    (matchesSearch(
      "ตั้งค่าระบบตอกบัตรเข้า-ออกงาน",
      "attendance",
      "เปิดใช้งานระบบตอกบัตร",
      "clockin",
      "clockout",
      "ตัดเวลาออกงานอัตโนมัติ",
      "auto clock-out"
    ));

  const showShopCard =
    (activeTab === "all" || activeTab === "shop") &&
    (matchesSearch(
      "ตั้งค่าร้านค้ายศใน discord",
      "shop",
      "เปิดใช้งานร้านค้ายศ",
      "ซื้อยศ"
    ));

  const showWelcomeCard =
    (activeTab === "all" || activeTab === "welcome") &&
    (matchesSearch(
      "ระบบต้อนรับ & แจกยศสมาชิกใหม่อัตโนมัติ",
      "welcome",
      "auto-role",
      "การ์ดต้อนรับ",
      "ห้องส่งข้อความต้อนรับ",
      "ข้อความต้อนรับกำหนดเอง",
      "ยศเริ่มต้นที่ต้องการแจก"
    ));

  const showWalletCard =
    (activeTab === "all" || activeTab === "wallet") &&
    (matchesSearch(
      "ระบบกระเป๋าเงิน & เติมเงิน",
      "wallet",
      "promptpay",
      "พร้อมเพย์",
      "truemoney",
      "ทรูมันนี่",
      "ซองของขวัญ",
      "qr code",
      "/topup"
    ));

  const showTicketsCard =
    (activeTab === "all" || activeTab === "tickets") &&
    (matchesSearch(
      "ระบบทิกเก็ต & ตรวจสอบสลิป",
      "ticket",
      "slip verification",
      "ห้อง discord สำหรับส่งสลิปให้แอดมินตรวจ",
      "admin slip channel",
      "ห้อง discord สำหรับจัดเก็บประวัติทิกเก็ต",
      "ticket archive"
    ));

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

      {/* SuperAdmin Notice / Status */}
      {!isSuperAdmin && (
        <div className="card mb-24" style={{ borderColor: "rgba(255, 214, 10, 0.2)" }}>
          <div className="card-body" style={{ padding: 16 }}>
            <span style={{ color: "var(--warning)" }}>⚠️ โหมดอ่านอย่างเดียว</span>
            <span className="text-muted" style={{ marginLeft: 8, fontSize: 13 }}>
              เฉพาะ SuperAdmin (OWNER) เท่านั้นที่มีสิทธิ์เปลี่ยนแปลงการตั้งค่าบอทและระบบ
            </span>
          </div>
        </div>
      )}

      {/* Navigation Tabs & Instant Search Bar */}
      <div className="settings-nav-bar">
        <div className="settings-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`settings-tab-btn ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="settings-search-wrapper">
          <svg
            className="settings-search-icon"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="settings-search-input"
            placeholder="ค้นหาการตั้งค่า... (เช่น ตอกบัตร, พร้อมเพย์)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              style={{
                position: "absolute",
                right: 10,
                top: "50%",
                transform: "translateY(-50%)",
                background: "transparent",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 1. Bot Notification Channels Card */}
      {showChannelsCard && (
        <div className="card mb-24">
          <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 className="card-title">
              <span className="card-title-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
              </span>
              ห้องสำหรับให้บอทส่งข้อความแจ้งเตือน (Discord Channels)
            </h3>
            <span className="text-muted text-xs">กดปุ่ม "ทดสอบส่ง" เพื่อเช็คสิทธิ์บอท</span>
          </div>
          <div className="card-body">
            <div className="settings-section">
              {/* Channel 1: Shop */}
              <div className="settings-row">
                <div>
                  <div className="settings-row-label">ห้องส่งข้อความซื้อยศ (Shop Purchase Log)</div>
                  <div className="settings-row-desc">
                    เมื่อสมาชิกซื้อยศสำเร็จ บอทจะโพสต์ใบเสร็จและประกาศลงในห้องนี้
                  </div>
                </div>
                <div style={{ minWidth: 280, maxWidth: 420, width: "100%", display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <CustomSelect
                      disabled={!isSuperAdmin || loadingChannels}
                      value={settings.shop_notify_channel || ""}
                      onChange={(val) => handleChange("shop_notify_channel", val)}
                      placeholder="— ไม่เปิดใช้งาน —"
                      searchPlaceholder="ค้นหาห้อง Discord (#channel)..."
                      options={[
                        { value: "", label: "— ไม่เปิดใช้งาน —" },
                        ...channels.map((ch) => ({
                          value: ch.id,
                          label: `#${ch.name}`,
                          sub: `ID: ${ch.id}`,
                        })),
                      ]}
                      style={{ width: "100%" }}
                    />
                  </div>
                  {settings.shop_notify_channel && (
                    <button
                      type="button"
                      className="channel-test-btn"
                      disabled={!isSuperAdmin || testingChannel === settings.shop_notify_channel}
                      onClick={() => handleTestChannel(settings.shop_notify_channel, "ห้องซื้อยศ")}
                      title="ทดสอบส่งข้อความแจ้งเตือนเข้าห้องนี้"
                    >
                      {testingChannel === settings.shop_notify_channel ? "⏳ กำลังส่ง..." : "⚡ ทดสอบ"}
                    </button>
                  )}
                </div>
              </div>

              {/* Channel 2: Attendance */}
              <div className="settings-row">
                <div>
                  <div className="settings-row-label">ห้องแจ้งเตือนการตอกบัตร (Attendance Log)</div>
                  <div className="settings-row-desc">
                    ส่งบันทึกเมื่อมีแอดมินใช้คำสั่ง /clockin หรือ /clockout
                  </div>
                </div>
                <div style={{ minWidth: 280, maxWidth: 420, width: "100%", display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <CustomSelect
                      disabled={!isSuperAdmin || loadingChannels}
                      value={settings.attendance_notify_channel || ""}
                      onChange={(val) => handleChange("attendance_notify_channel", val)}
                      placeholder="— ไม่เปิดใช้งาน —"
                      searchPlaceholder="ค้นหาห้อง Discord (#channel)..."
                      options={[
                        { value: "", label: "— ไม่เปิดใช้งาน —" },
                        ...channels.map((ch) => ({
                          value: ch.id,
                          label: `#${ch.name}`,
                          sub: `ID: ${ch.id}`,
                        })),
                      ]}
                      style={{ width: "100%" }}
                    />
                  </div>
                  {settings.attendance_notify_channel && (
                    <button
                      type="button"
                      className="channel-test-btn"
                      disabled={!isSuperAdmin || testingChannel === settings.attendance_notify_channel}
                      onClick={() => handleTestChannel(settings.attendance_notify_channel, "ห้องตอกบัตร")}
                      title="ทดสอบส่งข้อความแจ้งเตือนเข้าห้องนี้"
                    >
                      {testingChannel === settings.attendance_notify_channel ? "⏳ กำลังส่ง..." : "⚡ ทดสอบ"}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {testResult && (
              <div
                style={{
                  marginTop: 12,
                  padding: "8px 14px",
                  borderRadius: "var(--radius-md)",
                  background: testResult.success ? "rgba(48, 209, 88, 0.1)" : "rgba(255, 69, 58, 0.1)",
                  border: `1px solid ${testResult.success ? "rgba(48, 209, 88, 0.25)" : "rgba(255, 69, 58, 0.25)"}`,
                  color: testResult.success ? "#30d158" : "#ff453a",
                  fontSize: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span>{testResult.success ? "✓" : "✕"} {testResult.message}</span>
                <button
                  type="button"
                  onClick={() => setTestResult(null)}
                  style={{ background: "transparent", border: "none", color: "inherit", cursor: "pointer", fontSize: 11 }}
                >
                  ปิด
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. Attendance Configuration */}
      {showAttendanceCard && (
        <div className="card mb-24">
          <div className="card-header">
            <h3 className="card-title">
              <span className="card-title-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              </span>
              ตั้งค่าระบบตอกบัตรเข้า-ออกงาน
            </h3>
          </div>
          <div className="card-body">
            <div className="settings-section">
              <div className="settings-row">
                <div>
                  <div className="settings-row-label">เปิดใช้งานระบบตอกบัตร</div>
                  <div className="settings-row-desc">
                    อนุญาตให้แอดมินใช้คำสั่ง /clockin และ /clockout ใน Discord
                  </div>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    disabled={!isSuperAdmin}
                    checked={settings.attendance_enabled !== "false"}
                    onChange={(e) =>
                      handleChange("attendance_enabled", e.target.checked ? "true" : "false")
                    }
                  />
                  <span className="toggle-slider" />
                </label>
              </div>

              <div className="settings-row">
                <div>
                  <div className="settings-row-label">ตัดเวลาออกงานอัตโนมัติ (Auto Clock-out)</div>
                  <div className="settings-row-desc">
                    หากพบการเข้างานที่ค้างเกินจำนวนชั่วโมงนี้ ระบบจะบันทึกออกงานและแจ้งเตือน DM ให้อัตโนมัติ
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="number"
                    min={4}
                    max={24}
                    className="form-input"
                    disabled={!isSuperAdmin}
                    value={settings.auto_clockout_hours || "12"}
                    onChange={(e) => handleChange("auto_clockout_hours", e.target.value)}
                    style={{ width: 100, textAlign: "center" }}
                  />
                  <span className="text-muted" style={{ fontSize: 13 }}>ชั่วโมง</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Shop Configuration */}
      {showShopCard && (
        <div className="card mb-24">
          <div className="card-header">
            <h3 className="card-title">
              <span className="card-title-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/>
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                </svg>
              </span>
              ตั้งค่าร้านค้ายศใน Discord
            </h3>
          </div>
          <div className="card-body">
            <div className="settings-section">
              <div className="settings-row">
                <div>
                  <div className="settings-row-label">เปิดใช้งานร้านค้ายศ</div>
                  <div className="settings-row-desc">
                    อนุญาตให้สมาชิกเซิร์ฟเวอร์ดูร้านค้าและซื้อยศผ่านบอทได้
                  </div>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    disabled={!isSuperAdmin}
                    checked={settings.shop_enabled !== "false"}
                    onChange={(e) =>
                      handleChange("shop_enabled", e.target.checked ? "true" : "false")
                    }
                  />
                  <span className="toggle-slider" />
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Welcome & Auto-Role Configuration */}
      {showWelcomeCard && (
        <div className="card mb-24">
          <div className="card-header">
            <h3 className="card-title">
              <span className="card-title-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <line x1="19" y1="8" x2="19" y2="14" />
                  <line x1="22" y1="11" x2="16" y2="11" />
                </svg>
              </span>
              ระบบต้อนรับ & แจกยศสมาชิกใหม่อัตโนมัติ (Welcome & Auto-Role)
            </h3>
          </div>
          <div className="card-body">
            <div className="settings-section">
              <div className="settings-row">
                <div>
                  <div className="settings-row-label">เปิดใช้งานการ์ดต้อนรับสมาชิกใหม่</div>
                  <div className="settings-row-desc">
                    เมื่อมีสมาชิกกดเข้าร่วมเซิร์ฟเวอร์ บอทจะส่งการ์ดต้อนรับพร้อมรูปโปรไฟล์
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

              <div className="settings-row">
                <div>
                  <div className="settings-row-label">ห้องส่งข้อความต้อนรับ (Welcome Channel)</div>
                  <div className="settings-row-desc">
                    เลือกห้องใน Discord ที่ต้องการให้บอทส่งการ์ดต้อนรับ
                  </div>
                </div>
                <div style={{ minWidth: 280, maxWidth: 420, width: "100%", display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1 }}>
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
                  {settings.welcome_channel_id && (
                    <button
                      type="button"
                      className="channel-test-btn"
                      disabled={!isSuperAdmin || testingChannel === settings.welcome_channel_id}
                      onClick={() => handleTestChannel(settings.welcome_channel_id, "ห้องต้อนรับ")}
                      title="ทดสอบส่งข้อความเข้าห้องนี้"
                    >
                      {testingChannel === settings.welcome_channel_id ? "⏳..." : "⚡ ทดสอบ"}
                    </button>
                  )}
                </div>
              </div>

              <div className="settings-row">
                <div>
                  <div className="settings-row-label">ข้อความต้อนรับกำหนดเอง</div>
                  <div className="settings-row-desc">
                    รองรับตัวแปร &#123;user&#125;, &#123;username&#125;, &#123;server&#125;, &#123;count&#125;
                  </div>
                </div>
                <div style={{ minWidth: 280, maxWidth: 360, width: "100%" }}>
                  <input
                    type="text"
                    className="form-input"
                    disabled={!isSuperAdmin}
                    value={
                      settings.welcome_message ||
                      "ยินดีต้อนรับสู่ {server}! ขอให้มีความสุขกับการพูดคุยกับพวกเรา"
                    }
                    onChange={(e) => handleChange("welcome_message", e.target.value)}
                    style={{ width: "100%" }}
                  />
                </div>
              </div>

              <div className="settings-row">
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

              <div className="settings-row">
                <div>
                  <div className="settings-row-label">ยศเริ่มต้นที่ต้องการแจก (Default Role)</div>
                  <div className="settings-row-desc">
                    เลือกยศจากเซิร์ฟเวอร์ Discord สำหรับสมาชิกใหม่
                  </div>
                </div>
                <div style={{ minWidth: 280, maxWidth: 360, width: "100%" }}>
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
        </div>
      )}

      {/* 5. Wallet & Payment Configuration */}
      {showWalletCard && (
        <div className="card mb-24">
          <div className="card-header">
            <h3 className="card-title">
              <span className="card-title-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="14" x="2" y="5" rx="2" />
                  <line x1="2" y1="10" x2="22" y2="10" />
                </svg>
              </span>
              ระบบกระเป๋าเงิน & เติมเงิน (Wallet & PromptPay Topup)
            </h3>
          </div>
          <div className="card-body">
            <div className="settings-section">
              <div className="settings-row">
                <div>
                  <div className="settings-row-label">หมายเลขพร้อมเพย์สำหรับรับเงิน (PromptPay)</div>
                  <div className="settings-row-desc">
                    เบอร์โทรศัพท์หรือเลขประจำตัวผู้เสียภาษี สำหรับสร้าง QR Code ในคำสั่ง /topup
                  </div>
                </div>
                <div style={{ minWidth: 280, maxWidth: 360, width: "100%" }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="เช่น 0812345678 หรือ 140000..."
                    disabled={!isSuperAdmin}
                    value={settings.promptpay_number || ""}
                    onChange={(e) => handleChange("promptpay_number", e.target.value)}
                    style={{ width: "100%" }}
                  />
                </div>
              </div>

              <div className="settings-row">
                <div>
                  <div className="settings-row-label">เบอร์ TrueMoney Wallet สำหรับรับซองของขวัญ</div>
                  <div className="settings-row-desc">
                    เบอร์โทรศัพท์ทรูมันนี่สำหรับให้บอทดึงเงินจากลิงก์ซองของขวัญ TrueMoney เข้ากระเป๋าอัตโนมัติ
                  </div>
                </div>
                <div style={{ minWidth: 280, maxWidth: 360, width: "100%" }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="เช่น 0812345678"
                    disabled={!isSuperAdmin}
                    value={settings.truemoney_phone || ""}
                    onChange={(e) => handleChange("truemoney_phone", e.target.value)}
                    style={{ width: "100%" }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Ticket & Slip Verification Channels */}
      {showTicketsCard && (
        <div className="card mb-24">
          <div className="card-header">
            <h3 className="card-title">
              <span className="card-title-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
                  <circle cx="9" cy="9" r="2"/>
                  <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                </svg>
              </span>
              ระบบทิกเก็ต & ตรวจสอบสลิป (Ticket & Slip Verification)
            </h3>
          </div>
          <div className="card-body">
            <div className="settings-section">
              <div className="settings-row">
                <div>
                  <div className="settings-row-label">ห้อง Discord สำหรับส่งสลิปให้แอดมินตรวจ (Admin Slip Channel)</div>
                  <div className="settings-row-desc">
                    เมื่อสมาชิกส่งสลิปโอนเงิน บอทจะส่งสลิปพร้อมปุ่มกดอนุมัติ/ปฏิเสธมายังห้องนี้ทันที
                  </div>
                </div>
                <div style={{ minWidth: 280, maxWidth: 420, width: "100%", display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <CustomSelect
                      disabled={!isSuperAdmin || loadingChannels}
                      value={settings.slip_notify_channel || ""}
                      onChange={(val) => handleChange("slip_notify_channel", val)}
                      placeholder="— ไม่กำหนดห้องแจ้งสลิป —"
                      options={[
                        { value: "", label: "— ไม่กำหนดห้องแจ้งสลิป —" },
                        ...channels.map((ch) => ({
                          value: ch.id,
                          label: `#${ch.name}`,
                          sub: `ID: ${ch.id}`,
                        })),
                      ]}
                      style={{ width: "100%" }}
                    />
                  </div>
                  {settings.slip_notify_channel && (
                    <button
                      type="button"
                      className="channel-test-btn"
                      disabled={!isSuperAdmin || testingChannel === settings.slip_notify_channel}
                      onClick={() => handleTestChannel(settings.slip_notify_channel, "ห้องแจ้งสลิป")}
                      title="ทดสอบส่งข้อความเข้าห้องนี้"
                    >
                      {testingChannel === settings.slip_notify_channel ? "⏳..." : "⚡ ทดสอบ"}
                    </button>
                  )}
                </div>
              </div>

              <div className="settings-row">
                <div>
                  <div className="settings-row-label">ห้อง Discord สำหรับจัดเก็บประวัติทิกเก็ต (Ticket Archive)</div>
                  <div className="settings-row-desc">
                    เมื่อแอดมินปิดทิกเก็ต บอทจะสำเนาข้อความ (.txt) และรูปภาพทั้งหมดเข้าไปเก็บถาวรในห้องนี้
                  </div>
                </div>
                <div style={{ minWidth: 280, maxWidth: 420, width: "100%", display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <CustomSelect
                      disabled={!isSuperAdmin || loadingChannels}
                      value={settings.ticket_log_channel || ""}
                      onChange={(val) => handleChange("ticket_log_channel", val)}
                      placeholder="— ไม่บันทึกลงดิสคอร์ด —"
                      options={[
                        { value: "", label: "— ไม่บันทึกลงดิสคอร์ด —" },
                        ...channels.map((ch) => ({
                          value: ch.id,
                          label: `#${ch.name}`,
                          sub: `ID: ${ch.id}`,
                        })),
                      ]}
                      style={{ width: "100%" }}
                    />
                  </div>
                  {settings.ticket_log_channel && (
                    <button
                      type="button"
                      className="channel-test-btn"
                      disabled={!isSuperAdmin || testingChannel === settings.ticket_log_channel}
                      onClick={() => handleTestChannel(settings.ticket_log_channel, "ห้องบันทึกทิกเก็ต")}
                      title="ทดสอบส่งข้อความเข้าห้องนี้"
                    >
                      {testingChannel === settings.ticket_log_channel ? "⏳..." : "⚡ ทดสอบ"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* No matching search result */}
      {searchQuery && !showChannelsCard && !showAttendanceCard && !showShopCard && !showWelcomeCard && !showWalletCard && !showTicketsCard && (
        <div className="card" style={{ padding: "40px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
          <div style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>ไม่พบการตั้งค่าที่ตรงกับ "{searchQuery}"</div>
          <p className="text-muted text-xs">ลองค้นหาด้วยคำอื่น เช่น "ตอกบัตร", "พร้อมเพย์", "ยศ", "แจ้งเตือน"</p>
        </div>
      )}

      {/* Normal Bottom Save Bar (Static) */}
      {isSuperAdmin && (
        <div className="flex items-center justify-between" style={{ padding: "12px 0 24px" }}>
          <div className="text-muted text-xs">
            {hasChanges
              ? `✏️ มีการแก้ไขค้างอยู่ ${changedKeys.length} รายการ`
              : "✓ การตั้งค่าทั้งหมดเป็นปัจจุบัน"}
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            {hasChanges && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleReset}
                disabled={saving}
              >
                คืนค่าเดิม
              </button>
            )}
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving || !hasChanges}
            >
              {saving ? "กำลังบันทึก..." : hasChanges ? "บันทึกการตั้งค่า" : "บันทึกแล้ว"}
            </button>
          </div>
        </div>
      )}

      {/* Floating Sticky Save Bar (Appears seamlessly when user makes any changes) */}
      {isSuperAdmin && hasChanges && (
        <div className="sticky-save-bar" id="sticky-save-bar">
          <div className="sticky-save-status">
            <span className="sticky-save-status-dot" />
            <div>
              <strong>มีการเปลี่ยนแปลงการตั้งค่า ({changedKeys.length} รายการ)</strong>
              <div className="text-muted" style={{ fontSize: 11, marginTop: 1 }}>
                อย่าลืมกดบันทึกเพื่อให้การตั้งค่ามีผลกับการทำงานของบอท
              </div>
            </div>
          </div>

          <div className="sticky-save-actions">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleReset}
              disabled={saving}
            >
              ยกเลิก
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              style={{ minWidth: 120 }}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "กำลังบันทึก..." : "💾 บันทึกทันที"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
