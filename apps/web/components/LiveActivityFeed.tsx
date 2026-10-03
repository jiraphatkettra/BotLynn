"use client";

import { useState, useEffect } from "react";

interface LiveEvent {
  id: string;
  action: string;
  category: string;
  executorName: string;
  createdAt: string;
  details?: any;
}

export default function LiveActivityFeed({ initialLogs }: { initialLogs: any[] }) {
  const [logs, setLogs] = useState<LiveEvent[]>(initialLogs || []);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource("/api/events/stream");

      eventSource.addEventListener("connected", () => {
        setIsConnected(true);
      });

      eventSource.addEventListener("log", (e) => {
        try {
          const newLog = JSON.parse(e.data);
          setLogs((prev) => [newLog, ...prev.slice(0, 9)]);
        } catch {}
      });

      eventSource.onerror = () => {
        setIsConnected(false);
      };
    } catch (e) {
      setIsConnected(false);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, []);

  return (
    <div className="dashboard-activity-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
        <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#ffffff", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
          <span>📜</span>
          <span>กิจกรรมแบบเรียลไทม์ (Live Activity)</span>
        </h3>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              backgroundColor: isConnected ? "#30d158" : "#86868b",
              boxShadow: isConnected ? "0 0 8px #30d158" : "none",
              animation: isConnected ? "pulse 2s infinite" : "none",
            }}
          />
          <span style={{ fontSize: "11px", color: isConnected ? "#30d158" : "var(--text-muted)", fontWeight: 500 }}>
            {isConnected ? "LIVE SYNC" : "OFFLINE"}
          </span>
        </div>
      </div>

      <div>
        {logs.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {logs.map((log) => (
              <div
                key={log.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 14px",
                  borderRadius: "12px",
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid rgba(255, 255, 255, 0.05)",
                }}
              >
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "#ffffff" }}>
                    {log.action}
                  </div>
                  <div style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.45)" }}>
                    โดย <span style={{ color: "var(--accent-blue)" }}>{log.executorName}</span> • หมวด {log.category}
                  </div>
                </div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                  {new Date(log.createdAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: "40px", textAlign: "center", color: "rgba(255, 255, 255, 0.4)", fontSize: "13px" }}>
            ไม่มีประวัติกิจกรรมล่าสุด
          </div>
        )}
      </div>
    </div>
  );
}
