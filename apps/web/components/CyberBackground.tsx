"use client";

import React, { useEffect, useState } from "react";

export default function CyberBackground() {
  const [mousePos, setMousePos] = useState({ x: 50, y: 30 });

  useEffect(() => {
    const isTouchOnly = typeof window !== "undefined" && window.matchMedia("(hover: none)").matches;
    if (isTouchOnly) return;

    let ticking = false;
    function handleMouseMove(e: MouseEvent) {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setMousePos({
            x: Math.round((e.clientX / window.innerWidth) * 100),
            y: Math.round((e.clientY / window.innerHeight) * 100),
          });
          ticking = false;
        });
        ticking = true;
      }
    }

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div className="ios-liquid-canvas-mesh" aria-hidden="true">
      {/* 1. Azure Liquid Sphere */}
      <div
        className="ios-liquid-orb orb-azure"
        style={{
          transform: `translate3d(${(mousePos.x - 50) * 0.15}px, ${(mousePos.y - 50) * 0.15}px, 0)`,
        }}
      />

      {/* 2. Lavender / Violet Liquid Sphere */}
      <div
        className="ios-liquid-orb orb-violet"
        style={{
          transform: `translate3d(${(50 - mousePos.x) * 0.18}px, ${(50 - mousePos.y) * 0.18}px, 0)`,
        }}
      />

      {/* 3. Sunset Rose / Coral Sphere */}
      <div
        className="ios-liquid-orb orb-amber"
        style={{
          transform: `translate3d(${(mousePos.x - 50) * 0.1}px, ${(50 - mousePos.y) * 0.1}px, 0)`,
        }}
      />

      {/* 4. Mint / Emerald Liquid Sphere */}
      <div
        className="ios-liquid-orb orb-emerald"
        style={{
          transform: `translate3d(${(50 - mousePos.x) * 0.12}px, ${(mousePos.y - 50) * 0.12}px, 0)`,
        }}
      />

      {/* 5. Liquid Optical Noise & Specular Diffusion Layer */}
      <div className="ios-liquid-specular-wash" />
    </div>
  );
}
