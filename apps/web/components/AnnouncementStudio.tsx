"use client";

import { useState, useEffect } from "react";
import CustomSelect from "@/components/CustomSelect";

interface DiscordChannel {
  id: string;
  name: string;
}

export default function AnnouncementStudio() {
  const [channels, setChannels] = useState<DiscordChannel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState("");
  const [title, setTitle] = useState("📢 ประกาศจากทีมงาน");
  const [description, setDescription] = useState(
    "ยินดีต้อนรับสมาชิกทุกท่านเข้าสู่เซิร์ฟเวอร์\nกรุณาอ่านกฎระเบียบและติดตามข่าวสารอัปเดตได้ที่ห้องนี้"
  );
  const [color, setColor] = useState("#000000");
  const [imageUrl, setImageUrl] = useState("");
  const [mention, setMention] = useState<"none" | "everyone" | "here">("none");
  const [sending, setSending] = useState(false);
  const [resultMsg, setResultMsg] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  useEffect(() => {
    fetch("/api/discord/guild-data")
      .then((r) => r.json())
      .then((data) => {
        if (data.channels) {
          setChannels(data.channels);
          if (data.channels.length > 0) {
            setSelectedChannel(data.channels[0].id);
          }
        }
      })
      .catch((e) => console.error("Error loading channels:", e));
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChannel) {
      setResultMsg({ type: "error", text: "กรุณาเลือกห้อง Discord ที่ต้องการส่ง" });
      return;
    }

    try {
      setSending(true);
      setResultMsg(null);
      const res = await fetch("/api/discord/announce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId: selectedChannel,
          title,
          description,
          color,
          imageUrl: imageUrl.trim() || undefined,
          mention,
        }),
      });

      if (res.ok) {
        setResultMsg({
          type: "success",
          text: "✅ ส่งประกาศลงห้อง Discord เรียบร้อยแล้ว!",
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
    { label: "Black", hex: "#000000" },
    { label: "Blue", hex: "#2997ff" },
    { label: "Green", hex: "#34c759" },
    { label: "Orange", hex: "#ff9500" },
    { label: "Purple", hex: "#af52de" },
    { label: "Red", hex: "#ff3b30" },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))", gap: "24px" }}>
      {/* Left Form */}
      <div className="card" style={{ padding: "24px" }}>
        <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#ffffff", margin: "0 0 4px 0" }}>
          สตูดิโอสร้างประกาศ (Announcement Studio)
        </h3>
        <p style={{ fontSize: "13px", color: "#86868b", margin: "0 0 20px 0" }}>
          สร้างข้อความแบบ Rich Embed และสั่งส่งลงห้อง Discord ได้ทันทีจากหน้าเว็บ
        </p>

        <form onSubmit={handleSend} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Channel Select */}
          <div>
            <label style={{ fontSize: "13px", fontWeight: 500, color: "#e5e5e7", display: "block", marginBottom: "6px" }}>
              เลือกห้องที่จะส่งประกาศ (Discord Channel)
            </label>
            <CustomSelect
              value={selectedChannel}
              onChange={setSelectedChannel}
              placeholder="เลือกห้อง Discord..."
              options={channels.map((ch) => ({
                value: ch.id,
                label: `#${ch.name}`,
                sub: `ID: ${ch.id}`,
              }))}
            />
          </div>

          {/* Mention Tag */}
          <div>
            <label style={{ fontSize: "13px", fontWeight: 500, color: "#e5e5e7", display: "block", marginBottom: "6px" }}>
              การแท็กสมาชิก (Mention)
            </label>
            <div style={{ display: "flex", gap: "8px" }}>
              {[
                { id: "none", label: "ไม่แท็ก" },
                { id: "here", label: "@here" },
                { id: "everyone", label: "@everyone" },
              ].map((m) => (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => setMention(m.id as any)}
                  style={{
                    flex: 1,
                    padding: "8px",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontWeight: 500,
                    border: "1px solid",
                    borderColor: mention === m.id ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.06)",
                    background: mention === m.id ? "#ffffff" : "rgba(255,255,255,0.03)",
                    color: mention === m.id ? "#000000" : "#86868b",
                    cursor: "pointer",
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label style={{ fontSize: "13px", fontWeight: 500, color: "#e5e5e7", display: "block", marginBottom: "6px" }}>
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

          {/* Description */}
          <div>
            <label style={{ fontSize: "13px", fontWeight: 500, color: "#e5e5e7", display: "block", marginBottom: "6px" }}>
              เนื้อหาประกาศ (Description)
            </label>
            <textarea
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="พิมพ์เนื้อหาประกาศ รองรับ Markdown (**ตัวหนา**, *ตัวเอียง*, > คำคม)..."
              style={{
                width: "100%",
                padding: "10px 12px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "8px",
                color: "#ffffff",
                fontSize: "13px",
                lineHeight: "1.5",
                resize: "vertical",
              }}
            />
          </div>

          {/* Color Presets */}
          <div>
            <label style={{ fontSize: "13px", fontWeight: 500, color: "#e5e5e7", display: "block", marginBottom: "6px" }}>
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
                    border: color === c.hex ? "2px solid #ffffff" : "1px solid rgba(255,255,255,0.2)",
                    cursor: "pointer",
                    boxShadow: color === c.hex ? `0 0 10px ${c.hex}` : "none",
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
            <label style={{ fontSize: "13px", fontWeight: 500, color: "#e5e5e7", display: "block", marginBottom: "6px" }}>
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
                background: resultMsg.type === "success" ? "rgba(52,199,89,0.12)" : "rgba(255,59,48,0.12)",
                color: resultMsg.type === "success" ? "#34c759" : "#ff453a",
                border: `1px solid ${resultMsg.type === "success" ? "rgba(52,199,89,0.2)" : "rgba(255,59,48,0.2)"}`,
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
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 2L11 13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
            {sending ? "กำลังส่งประกาศ..." : "ส่งประกาศลง Discord ทันที"}
          </button>
        </form>
      </div>

      {/* Right Column: Live Discord Preview */}
      <div>
        <div style={{ marginBottom: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "13px", fontWeight: 600, color: "#86868b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            ตัวอย่างข้อความบน Discord (Live Preview)
          </span>
          {selectedChannel && (
            <span style={{ fontSize: "12px", color: "#86868b" }}>
              ห้อง: #{channels.find((c) => c.id === selectedChannel)?.name || "channel"}
            </span>
          )}
        </div>

        {/* Discord Mock Card */}
        <div
          style={{
            background: "#313338",
            borderRadius: "12px",
            padding: "16px 20px",
            fontFamily: "var(--font-sans)",
            color: "#dbdee1",
            boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
          }}
        >
          {/* Discord Bot Header */}
          <div style={{ display: "flex", gap: "12px", alignItems: "flex-start", marginBottom: "8px" }}>
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
              }}
            >
              LB
            </div>
            <div>
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

              {mention !== "none" && (
                <div style={{ color: "#c9cdfb", fontSize: "13px", marginTop: "4px", fontWeight: 500 }}>
                  @{mention}
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

            <div style={{ fontSize: "13px", color: "#dbdee1", whiteSpace: "pre-wrap", lineHeight: "1.5" }}>
              {description || "เนื้อหาประกาศ..."}
            </div>

            {imageUrl && (
              <div style={{ marginTop: "8px" }}>
                <img
                  src={imageUrl}
                  alt="Banner preview"
                  style={{ maxWidth: "100%", maxHeight: "250px", borderRadius: "4px", objectFit: "cover" }}
                  onError={(e) => {
                    (e.target as any).style.display = "none";
                  }}
                />
              </div>
            )}

            <div style={{ fontSize: "11px", color: "#949ba4", marginTop: "4px" }}>
              ประกาศโดย LynnBot • วันนี้ เวลา 21:00
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
