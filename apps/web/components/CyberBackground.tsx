"use client";

import React, { useEffect, useState } from "react";

export default function CyberBackground() {
  const [mousePos, setMousePos] = useState({ x: 50, y: 30 });

  useEffect(() => {
    let ticking = false;
    function handleMouseMove(e: MouseEvent) {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setMousePos({
            x: (e.clientX / window.innerWidth) * 100,
            y: (e.clientY / window.innerHeight) * 100,
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
    <div
      className="cyber-background-root"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        zIndex: 0,
        overflow: "hidden",
      }}
    >
      {/* 1. Cursor Reactive Ambient Light Spotlight */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: `radial-gradient(900px circle at ${mousePos.x}% ${mousePos.y}%, rgba(10, 132, 255, 0.07) 0%, rgba(112, 0, 255, 0.04) 40%, transparent 70%)`,
          transition: "background 0.15s ease-out",
        }}
      />

      {/* 2. Floating Cybernetic Perspective Grid (Bottom) */}
      <div
        className="cyber-perspective-grid"
        style={{
          position: "absolute",
          bottom: 0,
          left: "-50%",
          width: "200%",
          height: "450px",
          backgroundImage:
            "linear-gradient(to right, rgba(255, 255, 255, 0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.04) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          transform: "perspective(600px) rotateX(65deg)",
          transformOrigin: "bottom center",
          maskImage: "linear-gradient(to bottom, transparent 0%, rgba(0, 0, 0, 0.7) 60%, black 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, rgba(0, 0, 0, 0.7) 60%, black 100%)",
          opacity: 0.7,
        }}
      />

      {/* 3. Deep Space Stars / Ambient Dust */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "radial-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
          opacity: 0.25,
        }}
      />
    </div>
  );
}
