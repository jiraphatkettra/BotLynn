"use client";

import React, { useEffect, useRef } from "react";

export default function InteractiveDotGrid() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;
    let dpr = 1;

    const spacing = 24;
    const baseRadius = 0.8;
    const baseAlpha = 0.07;
    const maxHoverAlpha = 0.35;

    let cols = 0;
    let rows = 0;
    let dotEnergy: Float32Array;

    const mouse = {
      x: -1000,
      y: -1000,
      targetX: -1000,
      targetY: -1000,
      radius: 140,
      active: false,
    };

    let isRunning = false;
    let idleTimeout: NodeJS.Timeout | null = null;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.scale(dpr, dpr);

      cols = Math.ceil(width / spacing) + 1;
      rows = Math.ceil(height / spacing) + 1;
      dotEnergy = new Float32Array(cols * rows);

      drawStatic();
    };

    const drawStatic = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = `rgba(255, 255, 255, ${baseAlpha})`;
      ctx.beginPath();

      for (let c = 0; c < cols; c++) {
        const x = c * spacing;
        for (let r = 0; r < rows; r++) {
          const y = r * spacing;
          ctx.moveTo(x + baseRadius, y);
          ctx.arc(x, y, baseRadius, 0, Math.PI * 2);
        }
      }
      ctx.fill();
    };

    const render = () => {
      const dx = mouse.targetX - mouse.x;
      const dy = mouse.targetY - mouse.y;
      mouse.x += dx * 0.25;
      mouse.y += dy * 0.25;

      ctx.clearRect(0, 0, width, height);

      let maxEnergyRemaining = 0;

      for (let c = 0; c < cols; c++) {
        const x = c * spacing;
        for (let r = 0; r < rows; r++) {
          const y = r * spacing;
          const idx = c * rows + r;

          if (mouse.active && mouse.x > -400) {
            const distSq = (x - mouse.x) ** 2 + (y - mouse.y) ** 2;
            const rSq = mouse.radius ** 2;

            if (distSq < rSq) {
              const dist = Math.sqrt(distSq);
              const factor = 1 - dist / mouse.radius;
              const intensity = factor * factor;

              if (intensity > dotEnergy[idx]) {
                dotEnergy[idx] = intensity;
              }
            }
          }

          dotEnergy[idx] *= 0.92;
          if (dotEnergy[idx] < 0.005) {
            dotEnergy[idx] = 0;
          }

          if (dotEnergy[idx] > maxEnergyRemaining) {
            maxEnergyRemaining = dotEnergy[idx];
          }
        }
      }

      ctx.fillStyle = `rgba(255, 255, 255, ${baseAlpha})`;
      ctx.beginPath();

      const activeDots: { x: number; y: number; alpha: number }[] = [];

      for (let c = 0; c < cols; c++) {
        const x = c * spacing;
        for (let r = 0; r < rows; r++) {
          const y = r * spacing;
          const energy = dotEnergy[c * rows + r];

          if (energy > 0.01) {
            const dotAlpha = baseAlpha + energy * (maxHoverAlpha - baseAlpha);
            activeDots.push({ x, y, alpha: dotAlpha });
          } else {
            ctx.moveTo(x + baseRadius, y);
            ctx.arc(x, y, baseRadius, 0, Math.PI * 2);
          }
        }
      }
      ctx.fill();

      for (let i = 0; i < activeDots.length; i++) {
        const dot = activeDots[i];
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, baseRadius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${dot.alpha})`;
        ctx.fill();
      }

      const isMouseMoving = Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1;
      const hasTrail = maxEnergyRemaining > 0.01;

      if (mouse.active || isMouseMoving || hasTrail) {
        animationFrameId = requestAnimationFrame(render);
      } else {
        isRunning = false;
        drawStatic();
      }
    };

    const startAnimation = () => {
      if (!isRunning) {
        isRunning = true;
        animationFrameId = requestAnimationFrame(render);
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.targetX = e.clientX;
      mouse.targetY = e.clientY;
      mouse.active = true;
      startAnimation();

      if (idleTimeout) clearTimeout(idleTimeout);
      idleTimeout = setTimeout(() => {
        mouse.active = false;
      }, 1800);
    };

    const handleMouseLeave = () => {
      mouse.targetX = -1000;
      mouse.targetY = -1000;
      mouse.active = false;
    };

    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.addEventListener("mouseleave", handleMouseLeave);

    resize();

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      if (idleTimeout) clearTimeout(idleTimeout);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-[#070809]"
    >
      <canvas
        ref={canvasRef}
        className="block w-full h-full pointer-events-none"
      />
    </div>
  );
}
