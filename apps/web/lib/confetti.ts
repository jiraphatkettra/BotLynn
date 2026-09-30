// Ultra-lightweight 60fps Canvas Confetti & Particle Explosion Engine
export interface ConfettiOptions {
  particleCount?: number;
  origin?: { x: number; y: number };
  spread?: number;
  colors?: string[];
}

export function triggerCelebration(options: ConfettiOptions = {}) {
  if (typeof window === "undefined") return;

  const count = options.particleCount || 100;
  const originX = options.origin?.x ?? window.innerWidth / 2;
  const originY = options.origin?.y ?? window.innerHeight / 2;
  const spread = options.spread || 75;
  const colors = options.colors || [
    "#FFD700", // Gold
    "#00F0FF", // Electric Cyan
    "#FF007F", // Hot Magenta
    "#00FF88", // Emerald
    "#B026FF", // Neon Violet
    "#FFFFFF", // Pure White Sparkle
  ];

  const canvas = document.createElement("canvas");
  canvas.style.position = "fixed";
  canvas.style.top = "0";
  canvas.style.left = "0";
  canvas.style.width = "100vw";
  canvas.style.height = "100vh";
  canvas.style.pointerEvents = "none";
  canvas.style.zIndex = "999999";
  document.body.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    document.body.removeChild(canvas);
    return;
  }

  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  ctx.scale(dpr, dpr);

  interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    color: string;
    rotation: number;
    rotationSpeed: number;
    shape: "circle" | "rect" | "star";
    alpha: number;
    decay: number;
  }

  const particles: Particle[] = [];
  const shapes: Array<"circle" | "rect" | "star"> = ["circle", "rect", "star"];

  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * Math.random()) - Math.PI / 2;
    const velocity = 8 + Math.random() * 16;
    const spreadRad = ((Math.random() - 0.5) * spread * Math.PI) / 180;

    particles.push({
      x: originX,
      y: originY,
      vx: Math.cos(angle + spreadRad) * velocity,
      vy: Math.sin(angle + spreadRad) * velocity - 4,
      size: 4 + Math.random() * 7,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.25,
      shape: shapes[Math.floor(Math.random() * shapes.length)],
      alpha: 1,
      decay: 0.01 + Math.random() * 0.015,
    });
  }

  let animationFrameId: number;

  function render() {
    if (!ctx) return;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    let activeParticles = 0;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      if (p.alpha <= 0) continue;

      activeParticles++;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.38; // gravity
      p.vx *= 0.98; // drag
      p.vy *= 0.98;
      p.rotation += p.rotationSpeed;
      p.alpha -= p.decay;

      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;

      if (p.shape === "circle") {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === "rect") {
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      } else {
        // 4-pointed star sparkle
        ctx.beginPath();
        const r = p.size;
        ctx.moveTo(0, -r);
        ctx.quadraticCurveTo(0, 0, r, 0);
        ctx.quadraticCurveTo(0, 0, 0, r);
        ctx.quadraticCurveTo(0, 0, -r, 0);
        ctx.quadraticCurveTo(0, 0, 0, -r);
        ctx.fill();
      }

      ctx.restore();
    }

    if (activeParticles > 0) {
      animationFrameId = requestAnimationFrame(render);
    } else {
      cancelAnimationFrame(animationFrameId);
      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
    }
  }

  render();
}
