import { useEffect, useState, useRef } from "react";

// Lemon positions — scattered across the viewport at varying sizes, rotations, opacity
const LEMONS = [
  // Left side
  { x: 3, y: 5, size: 45, rotate: -15, speed: 0.15, opacity: 0.12 },
  { x: 8, y: 18, size: 30, rotate: 25, speed: 0.08, opacity: 0.09 },
  { x: 2, y: 35, size: 55, rotate: -30, speed: 0.12, opacity: 0.1 },
  { x: 10, y: 48, size: 35, rotate: 10, speed: 0.06, opacity: 0.08 },
  { x: 5, y: 62, size: 40, rotate: -20, speed: 0.14, opacity: 0.11 },
  { x: 12, y: 78, size: 28, rotate: 35, speed: 0.09, opacity: 0.07 },
  { x: 3, y: 90, size: 50, rotate: -5, speed: 0.11, opacity: 0.1 },
  // Right side
  { x: 88, y: 8, size: 40, rotate: 20, speed: 0.1, opacity: 0.1 },
  { x: 93, y: 22, size: 55, rotate: -25, speed: 0.13, opacity: 0.12 },
  { x: 85, y: 38, size: 30, rotate: 15, speed: 0.07, opacity: 0.08 },
  { x: 92, y: 52, size: 48, rotate: -10, speed: 0.15, opacity: 0.11 },
  { x: 87, y: 65, size: 35, rotate: 30, speed: 0.08, opacity: 0.09 },
  { x: 95, y: 80, size: 42, rotate: -20, speed: 0.12, opacity: 0.1 },
  { x: 90, y: 92, size: 32, rotate: 5, speed: 0.06, opacity: 0.07 },
  // Scattered middle (very subtle)
  { x: 25, y: 12, size: 22, rotate: -35, speed: 0.05, opacity: 0.05 },
  { x: 72, y: 30, size: 25, rotate: 20, speed: 0.04, opacity: 0.04 },
  { x: 35, y: 55, size: 20, rotate: -15, speed: 0.06, opacity: 0.05 },
  { x: 65, y: 75, size: 24, rotate: 30, speed: 0.03, opacity: 0.04 },
  { x: 50, y: 95, size: 22, rotate: -10, speed: 0.05, opacity: 0.04 },
];

export function VineBackground() {
  const [scrollY, setScrollY] = useState(0);
  const rafRef = useRef(null);

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

  // Use base path for GitHub Pages compatibility
  const basePath = import.meta.env.BASE_URL || "/";
  const lemonSrc = `${basePath}lemon.png`;

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
      {LEMONS.map((l, i) => {
        const parallaxY = scrollY * l.speed;
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
              transform: `translateY(${-parallaxY}px) rotate(${l.rotate}deg)`,
              opacity: l.opacity,
              mixBlendMode: "multiply",
              willChange: "transform",
              userSelect: "none",
              draggable: false,
            }}
          />
        );
      })}
    </div>
  );
}
