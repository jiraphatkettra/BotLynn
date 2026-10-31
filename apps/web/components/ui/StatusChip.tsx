import React from "react";

interface StatusChipProps {
  label: string;
  pulse?: boolean;
  accent?: boolean;
  className?: string;
  icon?: React.ReactNode;
}

export default function StatusChip({
  label,
  pulse = true,
  accent = false,
  className = "",
  icon,
}: StatusChipProps) {
  return (
    <div
      className={`inline-flex items-center gap-2 px-2.5 py-1 text-[10px] font-mono tracking-wider ${
        accent
          ? "bg-emerald-950/20 border border-emerald-500/30 text-emerald-300"
          : "bg-white/[0.03] border border-white/[0.08] text-neutral-300"
      } ${className}`}
    >
      {icon ? (
        <span className="shrink-0">{icon}</span>
      ) : (
        <span
          className={`w-1.5 h-1.5 shrink-0 ${
            accent ? "bg-emerald-400" : "bg-white/80"
          } ${pulse ? "animate-pulse" : ""}`}
        />
      )}
      <span>{label}</span>
    </div>
  );
}
