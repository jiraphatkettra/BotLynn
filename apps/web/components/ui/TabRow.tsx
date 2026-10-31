import React from "react";

export interface TabItem {
  id: string;
  label: string;
  subText?: string;
}

interface TabRowProps {
  tabs: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  showCounter?: boolean;
  className?: string;
}

export default function TabRow({
  tabs,
  activeId,
  onChange,
  showCounter = true,
  className = "",
}: TabRowProps) {
  const activeIndex = tabs.findIndex((t) => t.id === activeId);
  const currentNum = activeIndex >= 0 ? activeIndex + 1 : 1;

  return (
    <div className={`flex items-center justify-between gap-2 overflow-x-auto select-none py-1 ${className}`}>
      {/* Tabs */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {tabs.map((tab) => {
          const isActive = tab.id === activeId;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`group px-2.5 sm:px-3 py-1.5 text-[10px] sm:text-[11px] font-mono tracking-wider transition-all duration-150 flex items-center gap-1.5 cursor-pointer whitespace-nowrap border ${
                isActive
                  ? "bg-white text-black border-white font-semibold"
                  : "bg-white/[0.02] text-neutral-400 border-white/[0.1] hover:text-white hover:border-white/30 hover:bg-white/[0.04]"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 shrink-0 ${
                  isActive ? "bg-black" : "bg-neutral-500 group-hover:bg-white"
                }`}
              />
              <span>{tab.label}</span>
              {tab.subText && (
                <span
                  className={`text-[9px] ml-1 font-sans font-normal ${
                    isActive ? "text-neutral-700" : "text-neutral-500"
                  }`}
                >
                  ({tab.subText})
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Counter right */}
      {showCounter && (
        <div className="text-[10px] font-mono text-neutral-500 shrink-0 pl-2">
          [{currentNum} / {tabs.length}]
        </div>
      )}
    </div>
  );
}
