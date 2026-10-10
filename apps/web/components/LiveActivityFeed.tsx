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
        <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.85 }}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
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
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
                    {log.action}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                    โดย <span style={{ color: "var(--accent)" }}>{log.executorName}</span> • หมวด {log.category}
                  </div>
                </div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                  {new Date(log.createdAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
            ไม่มีประวัติกิจกรรมล่าสุด
          </div>
        )}
      </div>
    </div>
  );
}
