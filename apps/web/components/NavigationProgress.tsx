"use client";

import React, { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";

export default function NavigationProgress() {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const completeTimerRef = useRef<NodeJS.Timeout | null>(null);

  // When pathname changes, complete and hide
  useEffect(() => {
    if (visible) {
      setProgress(100);
      if (timerRef.current) clearInterval(timerRef.current);
      completeTimerRef.current = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 300);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (completeTimerRef.current) clearTimeout(completeTimerRef.current);
    };
  }, [pathname]);

  // Intercept click on internal links
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      // Find the closest anchor tag
      const target = (e.target as HTMLElement)?.closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      // Check if it's an internal dashboard navigation link
      if (
        href &&
        href.startsWith("/") &&
        !href.startsWith("#") &&
        !target.hasAttribute("download") &&
        target.getAttribute("target") !== "_blank" &&
        href !== pathname
      ) {
        // Start progress
        if (timerRef.current) clearInterval(timerRef.current);
        if (completeTimerRef.current) clearTimeout(completeTimerRef.current);

        setVisible(true);
        setProgress(20);

        // Trickle progress up to 85%
        timerRef.current = setInterval(() => {
          setProgress((prev) => {
            if (prev >= 85) {
              if (timerRef.current) clearInterval(timerRef.current);
              return 85;
            }
            return prev + (85 - prev) * 0.15;
          });
        }, 150);
      }
    };

    document.addEventListener("click", handleClick, { capture: true });
    return () => {
      document.removeEventListener("click", handleClick, { capture: true });
    };
  }, [pathname]);

  if (!visible && progress === 0) return null;

  return (
    <div className="apple-top-progress" aria-hidden="true">
      <div
        className="apple-top-progress-fill"
        style={{
          width: `${progress}%`,
          opacity: visible ? 1 : 0,
        }}
      />
    </div>
  );
}
