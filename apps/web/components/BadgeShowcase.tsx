"use client";

import React from "react";

interface BadgeItem {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  tier: string;
  _count?: { userBadges: number };
}

const TIER_COLORS: Record<string, { border: string; glow: string; text: string }> = {
  BRONZE: { border: "#cd7f32", glow: "rgba(205, 127, 50, 0.3)", text: "#cd7f32" },
  SILVER: { border: "#c0c0c0", glow: "rgba(192, 192, 192, 0.3)", text: "#c0c0c0" },
  GOLD: { border: "#ffd700", glow: "rgba(255, 215, 0, 0.4)", text: "#ffd700" },
  DIAMOND: { border: "#00f0ff", glow: "rgba(0, 240, 255, 0.4)", text: "#00f0ff" },
};

export default function BadgeShowcase({ badges }: { badges: BadgeItem[] }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        gap: "16px",
      }}
    >
      {badges.map((b) => {
        const tier = TIER_COLORS[b.tier] || TIER_COLORS.BRONZE;
        return (
          <div
            key={b.id}
            style={{
              padding: "18px",
              borderRadius: "16px",
              background: "rgba(255, 255, 255, 0.03)",
              border: `1px solid ${tier.border}40`,
              boxShadow: `0 8px 30px ${tier.glow}`,
              display: "flex",
              alignItems: "flex-start",
              gap: "14px",
              transition: "transform 0.2s ease, border-color 0.2s ease",
            }}
          >
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                background: "rgba(255, 255, 255, 0.06)",
                border: `1px solid ${tier.border}60`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "22px",
                flexShrink: 0,
              }}
            >
              {b.icon}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px" }}>
                <span style={{ fontSize: "14px", fontWeight: 700, color: "#ffffff" }}>
                  {b.name}
                </span>
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    padding: "2px 6px",
                    borderRadius: "4px",
                    background: `${tier.border}20`,
                    color: tier.text,
                    border: `1px solid ${tier.border}50`,
                  }}
                >
                  {b.tier}
                </span>
              </div>
              <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: "4px 0 8px" }}>
                {b.description}
              </p>
              <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                ครอบครองแล้ว {b._count?.userBadges || 0} คน
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
