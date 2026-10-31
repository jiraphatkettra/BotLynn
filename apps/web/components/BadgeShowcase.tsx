"use client";

import React from "react";
import { Flame, Zap, Shield, Gem, Award } from "lucide-react";

interface BadgeItem {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  tier: string;
  _count?: { userBadges: number };
}

const TIER_COLORS: Record<string, { border: string; text: string; bg: string }> = {
  BRONZE: { border: "#cd7f32", text: "#cd7f32", bg: "rgba(205, 127, 50, 0.1)" },
  SILVER: { border: "#c0c0c0", text: "#c0c0c0", bg: "rgba(192, 192, 192, 0.1)" },
  GOLD: { border: "#ffd700", text: "#ffd700", bg: "rgba(255, 215, 0, 0.1)" },
  DIAMOND: { border: "#00f0ff", text: "#00f0ff", bg: "rgba(0, 240, 255, 0.1)" },
};

function getBadgeVectorIcon(icon: string, name: string) {
  const combined = (icon + " " + name).toLowerCase();
  if (combined.includes("flame") || combined.includes("streak") || combined.includes("🔥")) {
    return <Flame className="w-5 h-5 text-amber-500" />;
  }
  if (combined.includes("zap") || combined.includes("ticket") || combined.includes("⚡")) {
    return <Zap className="w-5 h-5 text-sky-400" />;
  }
  if (combined.includes("shield") || combined.includes("work") || combined.includes("🛡")) {
    return <Shield className="w-5 h-5 text-emerald-400" />;
  }
  if (combined.includes("gem") || combined.includes("legend") || combined.includes("top") || combined.includes("💎")) {
    return <Gem className="w-5 h-5 text-cyan-400" />;
  }
  return <Award className="w-5 h-5 text-amber-400" />;
}

// Clean emoji characters out of badge names
function sanitizeBadgeName(name: string): string {
  return name.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "").trim();
}

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
        const cleanName = sanitizeBadgeName(b.name);

        return (
          <div
            key={b.id}
            style={{
              padding: "20px",
              borderRadius: "0px",
              background: "#070809",
              border: `1px solid rgba(255, 255, 255, 0.08)`,
              borderTop: `2px solid ${tier.border}`,
              display: "flex",
              alignItems: "flex-start",
              gap: "14px",
              boxShadow: "none",
            }}
          >
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "0px",
                background: tier.bg,
                border: `1px solid ${tier.border}40`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {getBadgeVectorIcon(b.icon, b.name)}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px", marginBottom: "4px" }}>
                <span style={{ fontSize: "14px", fontWeight: 600, color: "#ffffff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {cleanName}
                </span>
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    padding: "2px 6px",
                    borderRadius: "0px",
                    background: tier.bg,
                    color: tier.text,
                    border: `1px solid ${tier.border}50`,
                    fontFamily: "var(--font-mono, monospace)",
                    flexShrink: 0,
                  }}
                >
                  {b.tier}
                </span>
              </div>
              <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: "4px 0 8px", lineHeight: "1.4" }}>
                {b.description}
              </p>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-mono, monospace)" }}>
                [HOLDERS: {b._count?.userBadges || 0}]
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
