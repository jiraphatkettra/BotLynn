"use client";

import { useState, useEffect } from "react";

interface VoiceUser {
  user: {
    id: string;
    discordId: string;
    username: string;
    displayName: string | null;
    avatar: string | null;
    role: string;
  };
  totalSeconds: number;
  sessionCount: number;
  isCurrentlyInVoice: boolean;
  currentChannel?: string;
}

export default function VoiceStandbyWidget() {
  const [data, setData] = useState<{
    activeNow: number;
    totalHours: number;
    leaderboard: VoiceUser[];
  }>({
    activeNow: 0,
    totalHours: 0,
    leaderboard: [],
  });
  const [hourlyRate, setHourlyRate] = useState<number>(50);
  const [loading, setLoading] = useState(true);

  const fetchVoiceStats = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/voice?days=30");
      if (res.ok) {
        const json = await res.json();
        setData({
          activeNow: json.activeNow || 0,
          totalHours: json.totalHours || 0,
          leaderboard: json.leaderboard || [],
        });
      }
    } catch (e) {
      console.error("Error fetching voice data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVoiceStats();
    const interval = setInterval(fetchVoiceStats, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const formatHours = (seconds: number) => {
    const hours = (seconds / 3600).toFixed(1);
    return `${hours} ชม.`;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Voice Metrics Grid */}
      <div className="stats-grid">
        <div className="stat-card" style={{ borderColor: "rgba(52,199,89,0.2)" }}>
          <div className="stat-card-header">
            <div className="stat-card-icon" style={{ background: "rgba(52,199,89,0.1)", color: "#34c759" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            </div>
          </div>
          <div className="stat-card-value" style={{ color: "#34c759" }}>
            {data.activeNow} คน
          </div>
          <div className="stat-card-label">เฝ้าห้องเสียงสด (Voice Online)</div>
        </div>

        <div className="stat-card" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          <div className="stat-card-header">
            <div className="stat-card-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
          </div>
          <div className="stat-card-value">{data.totalHours} ชม.</div>
          <div className="stat-card-label">เวลารวมในห้องเสียง (30 วัน)</div>
        </div>

        <div className="stat-card" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          <div className="stat-card-header">
            <div className="stat-card-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
          </div>
          <div className="stat-card-value" style={{ color: "#2997ff" }}>
            {(data.totalHours * hourlyRate).toLocaleString("th-TH")} ฿
          </div>
          <div className="stat-card-label">
            ประมาณการค่าตอบแทน (@{hourlyRate}฿/ชม.)
          </div>
        </div>
      </div>

      {/* Voice Standby Table */}
      <div className="card" style={{ padding: "0px", overflow: "hidden" }}>
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div>
            <h3 style={{ fontSize: "15px", fontWeight: 600, color: "#ffffff", margin: 0 }}>
              สถิติการเฝ้าห้องเสียงของทีมงาน (Voice Standby Tracking)
            </h3>
            <span style={{ fontSize: "12px", color: "#86868b" }}>
              ตรวจจับการเข้า-ออกห้องเสียงอัตโนมัติ คำนวณชั่วโมง และประมาณการค่าตอบแทน
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "12px", color: "#86868b" }}>เรทค่าจ้าง:</span>
            <input
              type="number"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(Number(e.target.value) || 0)}
              style={{
                width: "70px",
                padding: "4px 8px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "6px",
                color: "#ffffff",
                fontSize: "12px",
                textAlign: "center",
              }}
            />
            <span style={{ fontSize: "12px", color: "#86868b" }}>฿ / ชม.</span>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <th style={{ padding: "12px 20px", fontSize: "12px", color: "#86868b", textAlign: "left" }}>
                  อันดับ / ทีมงาน
                </th>
                <th style={{ padding: "12px 20px", fontSize: "12px", color: "#86868b", textAlign: "left" }}>
                  สถานะห้องเสียง
                </th>
                <th style={{ padding: "12px 20px", fontSize: "12px", color: "#86868b", textAlign: "left" }}>
                  จำนวนครั้งที่เข้า
                </th>
                <th style={{ padding: "12px 20px", fontSize: "12px", color: "#86868b", textAlign: "left" }}>
                  ชั่วโมงรวม
                </th>
                <th style={{ padding: "12px 20px", fontSize: "12px", color: "#86868b", textAlign: "right" }}>
                  ค่าตอบแทนโดยประมาณ
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "30px", color: "#86868b" }}>
                    กำลังโหลดสถิติห้องเสียง...
                  </td>
                </tr>
              ) : data.leaderboard.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "30px", color: "#86868b" }}>
                    ยังไม่มีข้อมูลการเข้าห้องเสียง ระบบจะเริ่มบันทึกอัตโนมัติเมื่อมีสมาชิกเข้า Voice Channel
                  </td>
                </tr>
              ) : (
                data.leaderboard.map((item, index) => {
                  const hours = item.totalSeconds / 3600;
                  const wage = Math.round(hours * hourlyRate);

                  return (
                    <tr
                      key={item.user.id}
                      style={{
                        borderBottom: "1px solid rgba(255,255,255,0.04)",
                        background: item.isCurrentlyInVoice
                          ? "rgba(52,199,89,0.03)"
                          : "transparent",
                      }}
                    >
                      <td style={{ padding: "12px 20px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span
                            style={{
                              fontSize: "12px",
                              fontWeight: 600,
                              color: index < 3 ? "#ffffff" : "#86868b",
                              width: "16px",
                            }}
                          >
                            {index + 1}
                          </span>
                          <div style={{ display: "flex", flexDirection: "column" }}>
                            <span style={{ fontSize: "13px", fontWeight: 500, color: "#ffffff" }}>
                              {item.user.displayName || item.user.username}
                            </span>
                            <span style={{ fontSize: "11px", color: "#86868b" }}>
                              @{item.user.username}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: "12px 20px" }}>
                        {item.isCurrentlyInVoice ? (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              padding: "4px 8px",
                              borderRadius: "6px",
                              fontSize: "11px",
                              fontWeight: 600,
                              background: "rgba(52,199,89,0.12)",
                              color: "#34c759",
                              border: "1px solid rgba(52,199,89,0.2)",
                            }}
                          >
                            <div style={{ position: "relative", width: "8px", height: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <span className="voice-audio-pulse-ring" />
                              <span
                                style={{
                                  position: "relative",
                                  width: "6px",
                                  height: "6px",
                                  borderRadius: "50%",
                                  background: "#34c759",
                                  boxShadow: "0 0 8px #34c759",
                                }}
                              />
                            </div>
                            <span>{item.currentChannel ? `ในห้อง ${item.currentChannel}` : "กำลังออนไลน์"}</span>
                            {/* Animated Audio Equalizer Visualizer */}
                            <div style={{ display: "inline-flex", alignItems: "flex-end", gap: "2px", height: "10px", marginLeft: "2px" }}>
                              <span style={{ width: "2px", height: "60%", background: "#34c759", borderRadius: "1px", animation: "pulseGlow 0.9s infinite alternate" }} />
                              <span style={{ width: "2px", height: "100%", background: "#34c759", borderRadius: "1px", animation: "pulseGlow 0.7s infinite alternate 0.2s" }} />
                              <span style={{ width: "2px", height: "45%", background: "#34c759", borderRadius: "1px", animation: "pulseGlow 1.1s infinite alternate 0.4s" }} />
                            </div>
                          </span>
                        ) : (
                          <span style={{ fontSize: "12px", color: "#48484a" }}>
                            ออฟไลน์
                          </span>
                        )}
                      </td>

                      <td style={{ padding: "12px 20px", fontSize: "13px", color: "#86868b" }}>
                        {item.sessionCount} ครั้ง
                      </td>

                      <td style={{ padding: "12px 20px", fontSize: "13px", fontWeight: 600, color: "#ffffff" }}>
                        {formatHours(item.totalSeconds)}
                      </td>

                      <td style={{ padding: "12px 20px", textAlign: "right", fontSize: "13px", fontWeight: 600, color: "#2997ff" }}>
                        {wage.toLocaleString("th-TH")} ฿
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
