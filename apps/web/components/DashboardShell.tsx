import React from "react";
import Navbar from "@/components/Navbar";
import CommandPalette from "@/components/CommandPalette";
import NavigationProgress from "@/components/NavigationProgress";
import InteractiveDotGrid from "@/components/ui/InteractiveDotGrid";

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#070809] text-[#f5f5f7] relative selection:bg-white/20">
      {/* Precision Dot Matrix Background (matching discord-community-web) */}
      <InteractiveDotGrid />

      {/* Top Navigation Progress Bar */}
      <NavigationProgress />

      {/* Global Blueprint Top Navbar */}
      <Navbar />

      {/* Main Page Content */}
      <main className="main-content relative z-10">{children}</main>

      {/* Spotlight Command Palette (⌘K / Ctrl+K) */}
      <CommandPalette />
    </div>
  );
}
