"use client";

import React, { useEffect, useState } from "react";

type ThemeMode = "light" | "dark" | "system";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("lynnbot-theme") as ThemeMode | null;
    if (saved && (saved === "light" || saved === "dark" || saved === "system")) {
      setTheme(saved);
    } else {
      setTheme("dark");
    }
  }, []);

  const toggleTheme = () => {
    // Determine next theme: dark -> light -> dark
    const currentResolved = document.documentElement.getAttribute("data-theme") || "dark";
    const nextTheme: ThemeMode = currentResolved === "dark" ? "light" : "dark";

    setTheme(nextTheme);
    localStorage.setItem("lynnbot-theme", nextTheme);

    const root = document.documentElement;
    root.setAttribute("data-theme", nextTheme);
    root.classList.remove("light", "dark");
    root.classList.add(nextTheme);

    window.dispatchEvent(new CustomEvent("theme-changed", { detail: nextTheme }));
  };

  // Prevent layout shift during SSR
  if (!mounted) {
    return (
      <div
        className="ios-compact-theme-btn skeleton-pulse"
        aria-hidden="true"
        style={{ width: 34, height: 34, borderRadius: "50%" }}
      />
    );
  }

  const isLight = theme === "light";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`ios-compact-theme-btn ${isLight ? "light" : "dark"}`}
      title={isLight ? "เปลี่ยนเป็นโหมดมืด (Dark Mode)" : "เปลี่ยนเป็นโหมดสว่าง (Light Mode)"}
      aria-label={isLight ? "เปลี่ยนเป็นโหมดมืด" : "เปลี่ยนเป็นโหมดสว่าง"}
    >
      {isLight ? (
        /* Sun Icon for Light Mode */
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#f59e0b"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="ios-theme-icon sun"
        >
          <circle cx="12" cy="12" r="4" fill="rgba(245, 158, 11, 0.15)" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="m4.93 4.93 1.41 1.41" />
          <path d="m17.66 17.66 1.41 1.41" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <path d="m6.34 17.66-1.41 1.41" />
          <path d="m19.07 4.93-1.41 1.41" />
        </svg>
      ) : (
        /* Moon Icon for Dark Mode */
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#93c5fd"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="ios-theme-icon moon"
        >
          <path
            d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"
            fill="rgba(147, 197, 253, 0.15)"
          />
        </svg>
      )}
    </button>
  );
}
