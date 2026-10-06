"use client";

import React, { useEffect, useState } from "react";

export default function LiveStatusPulse() {
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const [latency, setLatency] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function checkStatus() {
      try {
        const res = await fetch("/api/bot", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        if (isMounted) {
          setIsOnline(Boolean(data.isOnline ?? data.online));
          if (typeof data.latency === "number") {
            setLatency(data.latency);
          } else {
            setLatency(null);
          }
        }
      } catch {
        if (isMounted) {
          setIsOnline(false);
          setLatency(null);
        }
      }
    }

    checkStatus();
    const interval = setInterval(checkStatus, 15000); // Check every 15s
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  if (isOnline === null) {
    return null; // Don't render while determining initial status
  }

  return (
    <div
      className={`apple-bot-status ${isOnline ? "online" : "offline"}`}
      title={
        isOnline
          ? `ระบบบอทออนไลน์สมบูรณ์ • ความหน่วง: ${latency !== null ? `${latency}ms` : "ปกติ"}`
          : "ระบบบอทออฟไลน์ กรุณาตรวจสอบเซิร์ฟเวอร์"
      }
    >
      {/* Radar Status Dot */}
      <div style={{ position: "relative", width: "10px", height: "10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {isOnline && (
          <span
            className="radar-pulse-ring"
            style={{
              position: "absolute",
              width: "100%",
              height: "100%",
              borderRadius: "50%",
              background: "rgba(48, 209, 88, 0.4)",
            }}
          />
        )}
        <span className="apple-status-dot" />
      </div>

      {/* Mini ECG Heartbeat Line (only if online) */}
      {isOnline && (
        <svg
          width="28"
          height="12"
          viewBox="0 0 40 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ opacity: 0.85 }}
          className="live-status-ecg"
        >
          <path
            d="M0 8 H10 L13 2 L17 14 L21 6 L24 10 L27 8 H40"
            stroke="var(--success, #30d158)"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="ecg-line-sweep"
          />
        </svg>
      )}

      {/* Status text */}
      <span className="live-status-text">
        {isOnline ? (latency !== null ? `${latency}ms` : "ออนไลน์") : "ออฟไลน์"}
      </span>
    </div>
  );
}
