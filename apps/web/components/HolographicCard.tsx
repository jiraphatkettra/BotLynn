"use client";

import React, { useRef, useState } from "react";

interface HolographicCardProps {
  children: React.ReactNode;
  isOwner?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export default function HolographicCard({
  children,
  isOwner = false,
  className = "",
  style = {},
}: HolographicCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ x: 50, y: 50 });
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const xPercent = (x / rect.width) * 100;
    const yPercent = (y / rect.height) * 100;

    const tiltX = ((y / rect.height) - 0.5) * -12;
    const tiltY = ((x / rect.width) - 0.5) * 12;

    setCoords({ x: xPercent, y: yPercent });
    setTilt({ x: tiltX, y: tiltY });
  };

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => {
    setIsHovered(false);
    setTilt({ x: 0, y: 0 });
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`holographic-foil-card ${isOwner ? "owner-foil" : ""} ${className}`}
      style={{
        position: "relative",
        borderRadius: "20px",
        overflow: "hidden",
        transformStyle: "preserve-3d",
        transform: isHovered
          ? `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale3d(1.025, 1.025, 1.025)`
          : "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)",
        transition: isHovered
          ? "transform 0.08s ease-out, box-shadow 0.2s ease"
          : "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s ease",
        boxShadow: isHovered
          ? isOwner
            ? "0 20px 40px -10px rgba(251, 191, 36, 0.35), 0 0 25px rgba(251, 191, 36, 0.2)"
            : "0 20px 40px -10px rgba(0, 240, 255, 0.25), 0 0 20px rgba(112, 0, 255, 0.15)"
          : "0 8px 24px rgba(0, 0, 0, 0.4)",
        ...style,
      }}
    >
      {/* 1. Prismatic Holographic Foil Layer */}
      <div
        className="holographic-foil-layer"
        style={{
          position: "absolute",
          inset: 0,
          background: isOwner
            ? `linear-gradient(
                ${coords.x * 2 + coords.y * 1.5}deg,
                rgba(251, 191, 36, 0) 0%,
                rgba(251, 191, 36, 0.22) 25%,
                rgba(255, 255, 255, 0.35) 45%,
                rgba(245, 158, 11, 0.25) 60%,
                rgba(251, 191, 36, 0) 80%
              )`
            : `linear-gradient(
                ${coords.x * 2 + coords.y * 1.5}deg,
                rgba(255, 0, 128, 0) 0%,
                rgba(0, 240, 255, 0.18) 30%,
                rgba(255, 255, 255, 0.3) 50%,
                rgba(168, 85, 247, 0.2) 70%,
                rgba(0, 255, 136, 0) 90%
              )`,
          backgroundSize: "200% 200%",
          backgroundPosition: `${coords.x}% ${coords.y}%`,
          mixBlendMode: "color-dodge",
          opacity: isHovered ? 0.9 : 0.15,
          transition: "opacity 0.25s ease",
          pointerEvents: "none",
          zIndex: 2,
        }}
      />

      {/* 2. Specular Glare Flare */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at ${coords.x}% ${coords.y}%, rgba(255, 255, 255, 0.22) 0%, transparent 60%)`,
          opacity: isHovered ? 1 : 0,
          transition: "opacity 0.2s ease",
          pointerEvents: "none",
          zIndex: 3,
        }}
      />

      {/* 3. Subtle Cyber Diagonal Grid Mask */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.02) 0px, rgba(255, 255, 255, 0.02) 1px, transparent 1px, transparent 8px)",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      {/* 4. Card Content */}
      <div style={{ position: "relative", zIndex: 4, height: "100%" }}>
        {children}
      </div>
    </div>
  );
}
