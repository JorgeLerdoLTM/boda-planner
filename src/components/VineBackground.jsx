import { useEffect, useState, useRef } from "react";

const STYLE_ID = "lemon-float-styles";

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes lemon-float-a {
      0%, 100% { transform: var(--scroll) translate(0, 0) rotate(var(--rot)); }
      25% { transform: var(--scroll) translate(3px, -5px) rotate(calc(var(--rot) + 3deg)); }
      50% { transform: var(--scroll) translate(-2px, -3px) rotate(calc(var(--rot) - 2deg)); }
      75% { transform: var(--scroll) translate(4px, -6px) rotate(calc(var(--rot) + 4deg)); }
    }
    @keyframes lemon-float-b {
      0%, 100% { transform: var(--scroll) translate(0, 0) rotate(var(--rot)); }
      33% { transform: var(--scroll) translate(-4px, -4px) rotate(calc(var(--rot) - 3deg)); }
      66% { transform: var(--scroll) translate(2px, -7px) rotate(calc(var(--rot) + 2deg)); }
    }
    @keyframes lemon-float-c {
      0%, 100% { transform: var(--scroll) translate(0, 0) rotate(var(--rot)); }
      20% { transform: var(--scroll) translate(5px, -3px) rotate(calc(var(--rot) + 5deg)); }
      40% { transform: var(--scroll) translate(-3px, -8px) rotate(calc(var(--rot) - 1deg)); }
      60% { transform: var(--scroll) translate(2px, -5px) rotate(calc(var(--rot) + 3deg)); }
      80% { transform: var(--scroll) translate(-4px, -2px) rotate(calc(var(--rot) - 4deg)); }
    }
  `;
  document.head.appendChild(style);
}

const ANIMATIONS = ["lemon-float-a", "lemon-float-b", "lemon-float-c"];

const LEMONS = [
  // Left side
  { x: 3, y: 5, size: 45, rotate: -15, speed: 0.15, opacity: 1, dur: 7 },
  { x: 8, y: 18, size: 30, rotate: 25, speed: 0.08, opacity: 1, dur: 9 },
  { x: 2, y: 35, size: 55, rotate: -30, speed: 0.12, opacity: 1, dur: 8 },
  { x: 10, y: 48, size: 35, rotate: 10, speed: 0.06, opacity: 1, dur: 11 },
  { x: 5, y: 62, size: 40, rotate: -20, speed: 0.14, opacity: 1, dur: 6 },
  { x: 12, y: 78, size: 28, rotate: 35, speed: 0.09, opacity: 1, dur: 10 },
  { x: 3, y: 90, size: 50, rotate: -5, speed: 0.11, opacity: 1, dur: 8 },
  // Right side
  { x: 88, y: 8, size: 40, rotate: 20, speed: 0.1, opacity: 1, dur: 9 },
  { x: 93, y: 22, size: 55, rotate: -25, speed: 0.13, opacity: 1, dur: 7 },
  { x: 85, y: 38, size: 30, rotate: 15, speed: 0.07, opacity: 1, dur: 12 },
  { x: 92, y: 52, size: 48, rotate: -10, speed: 0.15, opacity: 1, dur: 6 },
  { x: 87, y: 65, size: 35, rotate: 30, speed: 0.08, opacity: 1, dur: 10 },
  { x: 95, y: 80, size: 42, rotate: -20, speed: 0.12, opacity: 1, dur: 8 },
  { x: 90, y: 92, size: 32, rotate: 5, speed: 0.06, opacity: 1, dur: 11 },
  // Scattered middle
  { x: 25, y: 12, size: 22, rotate: -35, speed: 0.05, opacity: 0.85, dur: 13 },
  { x: 72, y: 30, size: 25, rotate: 20, speed: 0.04, opacity: 0.85, dur: 14 },
  { x: 35, y: 55, size: 20, rotate: -15, speed: 0.06, opacity: 0.85, dur: 12 },
  { x: 65, y: 75, size: 24, rotate: 30, speed: 0.03, opacity: 0.85, dur: 15 },
  { x: 50, y: 95, size: 22, rotate: -10, speed: 0.05, opacity: 0.85, dur: 13 },
];

export function VineBackground() {
  const [scrollY, setScrollY] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => { injectStyles(); }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        setScrollY(window.scrollY);
      });
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const basePath = import.meta.env.BASE_URL || "/";
  const lemonSrc = `${basePath}lemon.png`;

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
      {LEMONS.map((l, i) => {
        const parallaxY = scrollY * l.speed;
        const anim = ANIMATIONS[i % ANIMATIONS.length];
        const delay = (i * 1.3) % l.dur;
        return (
          <img
            key={i}
            src={lemonSrc}
            alt=""
            style={{
              position: "absolute",
              left: `${l.x}%`,
              top: `${l.y}%`,
              width: l.size,
              height: "auto",
              "--scroll": `translateY(${-parallaxY}px)`,
              "--rot": `${l.rotate}deg`,
              animation: `${anim} ${l.dur}s ease-in-out ${delay}s infinite`,
              opacity: l.opacity,
              willChange: "transform",
              userSelect: "none",
            }}
          />
        );
      })}
    </div>
  );
}
