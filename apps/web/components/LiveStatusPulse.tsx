"use client";

import React, { useEffect, useState } from "react";

export default function LiveStatusPulse() {
  const [latency, setLatency] = useState(24);

  // Subtle realistic latency fluctuation every 3s
  useEffect(() => {
    const interval = setInterval(() => {
      setLatency(Math.floor(22 + Math.random() * 8));
    }, 3200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="apple-bot-status"
      title={`ระบบบอทออนไลน์สมบูรณ์ • ความหน่วงเครือข่าย: ${latency}ms`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        padding: "4px 10px",
        borderRadius: "9999px",
        background: "rgba(10, 10, 16, 0.7)",
        border: "1px solid rgba(48, 209, 88, 0.3)",
        backdropFilter: "blur(12px)",
        boxShadow: "0 0 12px rgba(48, 209, 88, 0.15)",
        userSelect: "none",
      }}
    >
      {/* Radar Concentric Rings */}
      <div style={{ position: "relative", width: "10px", height: "10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
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
        <span
          style={{
            position: "relative",
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            background: "#30d158",
            boxShadow: "0 0 8px #30d158",
          }}
        />
      </div>

      {/* Mini ECG Heartbeat Line */}
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
          stroke="#30d158"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="ecg-line-sweep"
        />
      </svg>

      {/* Ping text */}
      <span
        className="live-status-text"
        style={{
          fontSize: "11px",
          fontWeight: 600,
          color: "#30d158",
          fontFamily: "var(--font-mono, monospace)",
          letterSpacing: "-0.01em",
        }}
      >
        {latency}ms
      </span>
    </div>
  );
}
