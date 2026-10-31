import React from "react";

interface PageFrameProps {
  children: React.ReactNode;
  showCenterLine?: boolean;
  className?: string;
}

export default function PageFrame({
  children,
  showCenterLine = false,
  className = "",
}: PageFrameProps) {
  return (
    <div className={`min-h-[calc(100vh-64px)] text-white overflow-x-clip relative selection:bg-white/20 pt-6 sm:pt-8 md:pt-10 pb-16 ${className}`}>
      <section className="relative w-full flex justify-center">
        {/* Central Bento Grid Container (Max-w-7xl, Perfectly Centered on X-axis) */}
        <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* ================= CONTINUOUS VERTICAL LINES LAYER ================= */}
          <div className="pointer-events-none absolute -top-8 -bottom-10 left-4 sm:left-6 lg:left-8 right-4 sm:right-6 lg:right-8 [mask-image:linear-gradient(to_bottom,transparent_0%,black_32px,black_calc(100%-40px),transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,transparent_0%,black_32px,black_calc(100%-40px),transparent_100%)] z-10">
            {/* V1: Left Vertical Line */}
            <div
              className="absolute left-0 top-0 bottom-0 w-[1px] bg-white/[0.08] circuit-top"
              style={{ animationDelay: "0ms" }}
            />

            {/* V2: Middle Vertical Line (if 50/50 split requested) */}
            {showCenterLine && (
              <div
                className="hidden lg:block absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-[1px] bg-white/[0.08] circuit-bottom"
                style={{ animationDelay: "0ms" }}
              />
            )}

            {/* V3: Right Vertical Line */}
            <div
              className="absolute right-0 top-0 bottom-0 w-[1px] bg-white/[0.08] circuit-top"
              style={{ animationDelay: "0ms" }}
            />
          </div>

          {/* ================= MAIN BENTO GRID FRAME ================= */}
          <div className="relative w-full bg-[#070809] border border-white/[0.08]">
            {/* Line 1: Top Closing Line */}
            <div className="relative h-[1px]">
              <div className="w-full h-[1px] bg-white/[0.08] circuit-left" style={{ animationDelay: "0ms" }} />
              <div
                className="pointer-events-none absolute right-full top-0 w-[420px] h-[1px] bg-gradient-to-l from-white/[0.08] to-transparent circuit-right"
                style={{ animationDelay: "0ms" }}
              />
              <div
                className="pointer-events-none absolute left-full top-0 w-[420px] h-[1px] bg-gradient-to-r from-white/[0.08] to-transparent circuit-left"
                style={{ animationDelay: "0ms" }}
              />
            </div>

            {/* Frame Content */}
            {children}

            {/* Bottom Closing Line */}
            <div className="relative h-[1px]">
              <div className="w-full h-[1px] bg-white/[0.08] circuit-right" style={{ animationDelay: "0ms" }} />
              <div
                className="pointer-events-none absolute right-full top-0 w-[420px] h-[1px] bg-gradient-to-l from-white/[0.08] to-transparent circuit-right"
                style={{ animationDelay: "0ms" }}
              />
              <div
                className="pointer-events-none absolute left-full top-0 w-[420px] h-[1px] bg-gradient-to-r from-white/[0.08] to-transparent circuit-left"
                style={{ animationDelay: "0ms" }}
              />
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}
