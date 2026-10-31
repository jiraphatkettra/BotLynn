import React from "react";

interface TopSectionStripProps {
  gridRef: string; // e.g. "GRID_REF // 001"
  pageCode: string; // e.g. "LYNNBOT_HUB"
}

export function TopSectionStrip({ gridRef, pageCode }: TopSectionStripProps) {
  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 h-7 sm:h-8 relative text-[10px] font-mono text-neutral-500 uppercase tracking-widest select-none bg-[#070809]">
        <div className="px-5 flex items-center">
          <span className="anim-fade-in">{gridRef}</span>
        </div>
        <div className="hidden lg:flex px-5 items-center justify-end">
          <span className="anim-fade-in text-neutral-400">{pageCode}</span>
        </div>
      </div>

      {/* Hairline below GRID_REF */}
      <div className="relative h-[1px]">
        <div className="w-full h-[1px] bg-white/[0.08] circuit-right" style={{ animationDelay: "0ms" }} />
      </div>
    </>
  );
}

interface BottomSectionStripProps {
  figLabel: string; // e.g. "FIG_01" or "STATUS // LIVE"
  statusText: string; // e.g. "SYSTEM_READY"
}

export function BottomSectionStrip({ figLabel, statusText }: BottomSectionStripProps) {
  return (
    <>
      {/* Hairline above bottom strip */}
      <div className="relative h-[1px]">
        <div className="w-full h-[1px] bg-white/[0.08] circuit-left" style={{ animationDelay: "0ms" }} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 h-7 sm:h-8 relative text-[10px] font-mono text-neutral-500 uppercase tracking-widest select-none bg-[#070809]">
        <div className="px-5 flex items-center">
          <span>{figLabel}</span>
        </div>
        <div className="hidden lg:flex px-5 items-center justify-end">
          <span className="text-neutral-400 font-mono">{statusText}</span>
        </div>
      </div>
    </>
  );
}
