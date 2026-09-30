"use client";

import React, { useRef, useState } from "react";

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  enableBorderBeam?: boolean;
  beamColor?: string;
  maxTilt?: number;
}

export default function TiltCard({
  children,
  className = "",
  style = {},
  enableBorderBeam = true,
  beamColor = "#00F0FF",
  maxTilt = 10,
}: TiltCardProps) {
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

    // Calculate tilt angles
    const tiltX = ((y / rect.height) - 0.5) * -maxTilt;
    const tiltY = ((x / rect.width) - 0.5) * maxTilt;

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
      className={`cyber-tilt-card ${className}`}
      style={{
        position: "relative",
        minWidth: 0,
        maxWidth: "100%",
        transformStyle: "preserve-3d",
        transform: isHovered
          ? `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale3d(1.025, 1.025, 1.025)`
          : "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)",
        transition: isHovered
          ? "transform 0.08s ease-out, box-shadow 0.2s ease"
          : "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s ease",
        ...style,
      }}
    >
      {/* 1. Specular Spotlight that follows cursor */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "inherit",
          background: `radial-gradient(400px circle at ${coords.x}% ${coords.y}%, rgba(255, 255, 255, 0.08), transparent 75%)`,
          opacity: isHovered ? 1 : 0,
          transition: "opacity 0.25s ease",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      {/* 2. Laser Border Beam (Perimeter Glow) */}
      {enableBorderBeam && (
        <div
          className="border-beam-tracer"
          style={{
            position: "absolute",
            inset: "-1px",
            borderRadius: "inherit",
            background: `conic-gradient(from 0deg, transparent 0deg, ${beamColor} 60deg, transparent 120deg)`,
            opacity: isHovered ? 0.9 : 0.25,
            transition: "opacity 0.3s ease",
            mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            maskComposite: "exclude",
            WebkitMaskComposite: "xor",
            padding: "1px",
            pointerEvents: "none",
            zIndex: 2,
          }}
        />
      )}

      {/* 3. Card Inner Content */}
      <div style={{ position: "relative", zIndex: 3, width: "100%", height: "100%" }}>
        {children}
      </div>
    </div>
  );
}
