"use client";

import React from "react";
import Navbar from "@/components/Navbar";
import CommandPalette from "@/components/CommandPalette";
import NavigationProgress from "@/components/NavigationProgress";
import CyberBackground from "@/components/CyberBackground";
import MobileBottomNav from "@/components/MobileBottomNav";

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dashboard-layout">
      {/* Sci-Fi Ambient Aurora & Perspective Cyber Grid Background */}
      <CyberBackground />

      {/* Apple-style Top Navigation Progress Bar */}
      <NavigationProgress />

      {/* Global Top Navbar */}
      <Navbar />

      {/* Main Page Content */}
      <main className="main-content">{children}</main>

      {/* Mobile Sticky Bottom Navigation Dock (Phones & Small Tablets) */}
      <MobileBottomNav />

      {/* Global Apple-style Spotlight Command Palette (⌘K / Ctrl+K) */}
      <CommandPalette />
    </div>
  );
}
