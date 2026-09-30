"use client";

import React from "react";
import Link from "next/link";

interface HeaderProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export default function Header({ title, subtitle, children }: HeaderProps) {
  return (
    <div className="page-header-container">
      <header className="page-header" id="page-header">
        <div className="page-header-main">
          {/* Apple-style Breadcrumbs */}
          <div className="apple-breadcrumbs">
            <Link href="/" className="apple-breadcrumb-link">
              LynnBot
            </Link>
            <span className="apple-breadcrumb-separator">/</span>
            <span className="apple-breadcrumb-current">{title}</span>
          </div>

          <h1 className="page-header-title">{title}</h1>
          {subtitle && <p className="page-header-subtitle">{subtitle}</p>}
        </div>

        {children && <div className="page-header-actions">{children}</div>}
      </header>
    </div>
  );
}
