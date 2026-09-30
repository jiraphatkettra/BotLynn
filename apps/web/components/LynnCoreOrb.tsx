"use client";

import React, { useEffect, useRef, useState } from "react";

export default function LynnCoreOrb() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  // Mouse move listener with normalized coordinates (-1 to 1)
  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const x = Math.max(-1, Math.min(1, (e.clientX - centerX) / (window.innerWidth / 2)));
      const y = Math.max(-1, Math.min(1, (e.clientY - centerY) / (window.innerHeight / 2)));
      setMousePos({ x, y });
    }

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Canvas particle starfield & energy beam simulation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let time = 0;

    const particles: Array<{
      radius: number;
      speed: number;
      angle: number;
      size: number;
      color: string;
      alpha: number;
    }> = [];

    const colors = ["#00F0FF", "#2997FF", "#7000FF", "#00FF88", "#FFFFFF"];

    for (let i = 0; i < 40; i++) {
      particles.push({
        radius: 40 + Math.random() * 85,
        speed: (0.008 + Math.random() * 0.015) * (Math.random() > 0.5 ? 1 : -1),
        angle: Math.random() * Math.PI * 2,
        size: 1 + Math.random() * 2.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 0.3 + Math.random() * 0.7,
      });
    }

    function render() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      time += 0.016;

      // Draw interactive orbital particles
      particles.forEach((p) => {
        p.angle += p.speed;
        const tiltX = mousePos.x * 20;
        const tiltY = mousePos.y * 20;

        const x = centerX + Math.cos(p.angle) * p.radius + tiltX;
        const y = centerY + Math.sin(p.angle) * (p.radius * 0.45) + tiltY;

        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.globalAlpha = p.alpha * (0.6 + Math.sin(time * 3 + p.angle) * 0.4);
        ctx.fill();
        ctx.restore();
      });

      animId = requestAnimationFrame(render);
    }

    render();
    return () => cancelAnimationFrame(animId);
  }, [mousePos]);

  // Dynamic 3D transform based on mouse position
  const rotateX = -mousePos.y * 18;
  const rotateY = mousePos.x * 24;

  return (
    <div
      ref={containerRef}
      className="lynn-core-container"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: "relative",
        width: "280px",
        height: "280px",
        margin: "0 auto 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        perspective: "1000px",
        userSelect: "none",
      }}
    >
      {/* 1. Background Ambient Glow */}
      <div
        style={{
          position: "absolute",
          width: "240px",
          height: "240px",
          borderRadius: "50%",
          background: isHovered
            ? "radial-gradient(circle, rgba(0, 240, 255, 0.35) 0%, rgba(112, 0, 255, 0.25) 45%, transparent 75%)"
            : "radial-gradient(circle, rgba(41, 151, 255, 0.28) 0%, rgba(112, 0, 255, 0.15) 50%, transparent 75%)",
          filter: "blur(40px)",
          transition: "all 0.5s ease",
          pointerEvents: "none",
        }}
      />

      {/* 2. Interactive Canvas for Orbiting Micro-particles */}
      <canvas
        ref={canvasRef}
        width={280}
        height={280}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex: 3,
        }}
      />

      {/* 3. 3D Tilt Wrapper */}
      <div
        style={{
          position: "relative",
          width: "220px",
          height: "220px",
          transformStyle: "preserve-3d",
          transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
          transition: "transform 0.12s ease-out",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Outer Ring 1 - Constant Counter-Clockwise Spin */}
        <div
          className="core-orbital-ring-1"
          style={{
            position: "absolute",
            width: "200px",
            height: "200px",
            borderRadius: "50%",
            border: "1.5px dashed rgba(0, 240, 255, 0.45)",
            boxShadow: "0 0 15px rgba(0, 240, 255, 0.2), inset 0 0 15px rgba(0, 240, 255, 0.2)",
            transform: "rotateX(68deg) rotateY(15deg)",
          }}
        />

        {/* Outer Ring 2 - Clockwise High-Tech Ring */}
        <div
          className="core-orbital-ring-2"
          style={{
            position: "absolute",
            width: "180px",
            height: "180px",
            borderRadius: "50%",
            border: "1.5px solid rgba(168, 85, 247, 0.5)",
            borderTopColor: "transparent",
            borderBottomColor: "#00F0FF",
            boxShadow: "0 0 20px rgba(168, 85, 247, 0.3)",
            transform: "rotateX(-58deg) rotateY(32deg)",
          }}
        />

        {/* Inner Ring 3 - Rapid Plasma Loop */}
        <div
          className="core-orbital-ring-3"
          style={{
            position: "absolute",
            width: "140px",
            height: "140px",
            borderRadius: "50%",
            border: "2px dotted rgba(48, 209, 88, 0.6)",
            transform: "rotateX(25deg) rotateY(70deg)",
          }}
        />

        {/* The Central Glowing Plasma Core Sphere */}
        <div
          className="core-plasma-sphere"
          style={{
            position: "relative",
            width: "90px",
            height: "90px",
            borderRadius: "50%",
            background: "radial-gradient(circle at 35% 35%, #ffffff 0%, #00F0FF 30%, #2997FF 60%, #7000FF 85%, #050510 100%)",
            boxShadow: isHovered
              ? "0 0 50px rgba(0, 240, 255, 0.8), 0 0 100px rgba(112, 0, 255, 0.6), inset 0 0 20px rgba(255, 255, 255, 0.8)"
              : "0 0 35px rgba(0, 240, 255, 0.6), 0 0 70px rgba(112, 0, 255, 0.4), inset 0 0 15px rgba(255, 255, 255, 0.6)",
            transform: "translateZ(30px)",
            transition: "box-shadow 0.3s ease",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          {/* Internal Lynn Logo Symbol */}
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "50%",
              overflow: "hidden",
              border: "1.5px solid rgba(255, 255, 255, 0.8)",
              boxShadow: "0 0 12px rgba(255, 255, 255, 0.9)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(0, 0, 0, 0.5)",
            }}
          >
            <img
              src="/logo.png"
              alt="LynnCore"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
        </div>

        {/* Sci-Fi Target HUD Overlay Brackets */}
        <div
          style={{
            position: "absolute",
            width: "210px",
            height: "210px",
            pointerEvents: "none",
            transform: "translateZ(10px)",
          }}
        >
          <div className="hud-corner top-left" />
          <div className="hud-corner top-right" />
          <div className="hud-corner bottom-left" />
          <div className="hud-corner bottom-right" />
        </div>
      </div>

      {/* Floating Status Pill Underneath Orb */}
      <div
        style={{
          position: "absolute",
          bottom: "-4px",
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          padding: "4px 14px",
          borderRadius: "9999px",
          background: "rgba(10, 10, 16, 0.85)",
          border: "1px solid rgba(0, 240, 255, 0.3)",
          backdropFilter: "blur(16px)",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.6), 0 0 10px rgba(0, 240, 255, 0.2)",
          fontSize: "10.5px",
          fontWeight: 600,
          color: "#00F0FF",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          fontFamily: "var(--font-mono, monospace)",
          zIndex: 4,
        }}
      >
        <span
          style={{
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            background: "#00F0FF",
            boxShadow: "0 0 8px #00F0FF",
            animation: "pulseGlow 1.5s infinite",
          }}
        />
        <span>Lynn Quantum Core // Active</span>
      </div>
    </div>
  );
}
