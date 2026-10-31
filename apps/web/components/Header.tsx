"use client";

import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface HeaderProps {
  title: string;
  subtitle?: string;
  gridRef?: string;
  pageCode?: string;
  children?: React.ReactNode;
}

export default function Header({
  title,
  subtitle,
  gridRef = "GRID_REF // 001",
  pageCode = "LYNNBOT_PORTAL",
  children,
}: HeaderProps) {
  return (
    <div className="w-full bg-[#070809] border-b border-white/[0.08] relative">
      {/* Top Technical Section Strip */}
      <div className="w-full border-b border-white/[0.08] px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between text-[10px] font-mono text-neutral-500 uppercase tracking-widest select-none">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-neutral-600 inline-block" />
          <span>{gridRef}</span>
        </div>
        <div className="flex items-center gap-2">
          <span>{pageCode}</span>
          <span className="w-1.5 h-1.5 bg-emerald-500/80 inline-block animate-pulse" />
        </div>
      </div>

      {/* Main Header Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2.5 max-w-3xl">
            {/* Breadcrumb Path */}
            <div className="flex items-center gap-1.5 text-xs font-mono text-neutral-400">
              <Link href="/" className="hover:text-white transition-colors">
                LYNNBOT
              </Link>
              <ChevronRight className="w-3.5 h-3.5 text-neutral-600 shrink-0" />
              <span className="text-neutral-200 font-semibold">{title}</span>
            </div>

            {/* Page Title */}
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white font-sans">
              {title}
            </h1>

            {/* Subtitle */}
            {subtitle && (
              <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed font-sans max-w-2xl">
                {subtitle}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          {children && (
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              {children}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
