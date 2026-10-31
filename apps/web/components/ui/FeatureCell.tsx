import React from "react";

interface FeatureCellProps {
  icon: React.ReactNode;
  label: string;
  title: string;
  description?: string;
  className?: string;
  borderRight?: boolean;
  borderBottom?: boolean;
}

export function FeatureCell({
  icon,
  label,
  title,
  description,
  className = "",
  borderRight = false,
  borderBottom = false,
}: FeatureCellProps) {
  return (
    <div
      className={`p-5 sm:p-6 relative group hover:bg-white/[0.02] transition-colors ${
        borderRight ? "sm:border-r border-white/[0.08]" : ""
      } ${borderBottom ? "border-b border-white/[0.08]" : ""} ${className}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="w-8 h-8 bg-white/[0.05] border border-white/[0.1] flex items-center justify-center text-white/80 group-hover:text-white transition-colors">
          {icon}
        </div>
        <span className="text-[10px] font-mono text-neutral-500 tracking-wider uppercase">
          {label}
        </span>
      </div>
      <div className="text-sm sm:text-[14px] font-semibold text-white/95 group-hover:text-white transition-colors">
        {title}
      </div>
      {description && (
        <p className="text-xs text-neutral-400 leading-relaxed mt-1.5 line-clamp-2">
          {description}
        </p>
      )}
    </div>
  );
}

interface FeatureStripProps {
  icon: React.ReactNode;
  title: string;
  label: string;
  className?: string;
}

export function FeatureStrip({ icon, title, label, className = "" }: FeatureStripProps) {
  return (
    <div
      className={`border-t border-white/[0.08] px-4 sm:px-5 py-3 flex items-center justify-between bg-white/[0.01] hover:bg-white/[0.02] transition-colors ${className}`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="text-white/80 shrink-0">{icon}</div>
        <span className="text-xs sm:text-[13px] text-neutral-300 font-medium truncate">
          {title}
        </span>
      </div>
      <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider shrink-0 ml-3">
        {label}
      </span>
    </div>
  );
}
