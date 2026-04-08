import { useEffect } from "react";

const STYLE_ID = "vine-bg-styles";

function injectVineStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes vine-sway {
      0%, 100% { transform: rotate(0deg) translateX(0); }
      25% { transform: rotate(0.3deg) translateX(1px); }
      75% { transform: rotate(-0.3deg) translateX(-1px); }
    }
    @keyframes vine-sway-alt {
      0%, 100% { transform: rotate(0deg) translateX(0); }
      33% { transform: rotate(-0.4deg) translateX(-1.5px); }
      66% { transform: rotate(0.2deg) translateX(0.5px); }
    }
    @keyframes lemon-bob {
      0%, 100% { transform: translateY(0) rotate(0deg); }
      50% { transform: translateY(-2px) rotate(2deg); }
    }
    .vine-group { animation: vine-sway 8s ease-in-out infinite; transform-origin: top center; }
    .vine-group-alt { animation: vine-sway-alt 10s ease-in-out infinite; transform-origin: top center; }
    .lemon-a { animation: lemon-bob 4s ease-in-out infinite; }
    .lemon-b { animation: lemon-bob 5s ease-in-out 1s infinite; }
    .lemon-c { animation: lemon-bob 6s ease-in-out 2s infinite; }
  `;
  document.head.appendChild(style);
}

// Realistic lemon shape with texture
function Lemon({ cx, cy, size = 1, rotate = 0, className = "lemon-a" }) {
  const s = size;
  return (
    <g className={className} transform={`rotate(${rotate}, ${cx}, ${cy})`}>
      {/* Lemon body — pointed oval shape using a path */}
      <path
        d={`M${cx},${cy - 8 * s} C${cx + 5.5 * s},${cy - 8 * s} ${cx + 6.5 * s},${cy - 4 * s} ${cx + 6.5 * s},${cy}
            C${cx + 6.5 * s},${cy + 4 * s} ${cx + 5 * s},${cy + 7 * s} ${cx + 2 * s},${cy + 9 * s}
            L${cx},${cy + 10 * s}
            L${cx - 2 * s},${cy + 9 * s}
            C${cx - 5 * s},${cy + 7 * s} ${cx - 6.5 * s},${cy + 4 * s} ${cx - 6.5 * s},${cy}
            C${cx - 6.5 * s},${cy - 4 * s} ${cx - 5.5 * s},${cy - 8 * s} ${cx},${cy - 8 * s} Z`}
        fill="#EDCC3A"
      />
      {/* Inner highlight — lighter center */}
      <ellipse cx={cx - 1 * s} cy={cy - 1 * s} rx={3.5 * s} ry={5 * s} fill="#F5DD52" opacity="0.5" />
      {/* Dimple texture — tiny dots */}
      <circle cx={cx - 2 * s} cy={cy - 3 * s} r={0.5 * s} fill="#D4B830" opacity="0.4" />
      <circle cx={cx + 2 * s} cy={cy - 1 * s} r={0.4 * s} fill="#D4B830" opacity="0.35" />
      <circle cx={cx - 1 * s} cy={cy + 2 * s} r={0.5 * s} fill="#D4B830" opacity="0.4" />
      <circle cx={cx + 3 * s} cy={cy + 1 * s} r={0.3 * s} fill="#D4B830" opacity="0.3" />
      <circle cx={cx - 3 * s} cy={cy + 0 * s} r={0.4 * s} fill="#D4B830" opacity="0.35" />
      <circle cx={cx + 1 * s} cy={cy + 4 * s} r={0.4 * s} fill="#D4B830" opacity="0.3" />
      <circle cx={cx - 2 * s} cy={cy + 5 * s} r={0.3 * s} fill="#D4B830" opacity="0.3" />
      <circle cx={cx + 2 * s} cy={cy - 5 * s} r={0.3 * s} fill="#D4B830" opacity="0.35" />
      {/* Nub at top */}
      <ellipse cx={cx} cy={cy - 9 * s} rx={1.2 * s} ry={1.8 * s} fill="#8AAF7A" />
      {/* Tiny stem */}
      <line x1={cx} y1={cy - 10.5 * s} x2={cx + 0.5 * s} y2={cy - 12 * s} stroke="#6B8F5E" strokeWidth={0.8 * s} strokeLinecap="round" />
      {/* Shadow on bottom edge */}
      <path
        d={`M${cx - 4 * s},${cy + 5 * s} Q${cx},${cy + 10 * s} ${cx + 4 * s},${cy + 5 * s}`}
        fill="#C4A820"
        opacity="0.25"
      />
    </g>
  );
}

function VineBranch({ x, height, flip, className }) {
  const dir = flip ? -1 : 1;
  const vineColor = "#7A9E6E";
  const vineColorDk = "#5B7F5E";
  const leafColor = "#8AAF7A";

  return (
    <g className={className} opacity="0.16">
      {/* Main vine stem */}
      <path
        d={`M${x},0 Q${x + 30 * dir},${height * 0.15} ${x - 10 * dir},${height * 0.25} Q${x + 40 * dir},${height * 0.4} ${x - 5 * dir},${height * 0.55} Q${x + 25 * dir},${height * 0.7} ${x + 5 * dir},${height * 0.85} Q${x - 15 * dir},${height * 0.95} ${x + 10 * dir},${height}`}
        fill="none" stroke={vineColor} strokeWidth="1.5"
      />
      {/* Tendrils — thin curling branches */}
      <path d={`M${x + 10 * dir},${height * 0.18} q${15 * dir},-8 ${20 * dir},2`} fill="none" stroke={vineColor} strokeWidth="0.8" />
      <path d={`M${x - 5 * dir},${height * 0.42} q${-12 * dir},-6 ${-18 * dir},4`} fill="none" stroke={vineColor} strokeWidth="0.8" />
      <path d={`M${x + 15 * dir},${height * 0.65} q${12 * dir},-10 ${18 * dir},-2`} fill="none" stroke={vineColor} strokeWidth="0.8" />
      <path d={`M${x},${height * 0.82} q${-10 * dir},-5 ${-14 * dir},6`} fill="none" stroke={vineColor} strokeWidth="0.8" />
      {/* Curling tendrils */}
      <path d={`M${x + 25 * dir},${height * 0.2} q${5 * dir},-3 ${3 * dir},-8 q${-1 * dir},-3 ${-4 * dir},-2`} fill="none" stroke={vineColor} strokeWidth="0.5" opacity="0.7" />
      <path d={`M${x - 15 * dir},${height * 0.5} q${-4 * dir},-4 ${-2 * dir},-9 q${1 * dir},-3 ${4 * dir},-1`} fill="none" stroke={vineColor} strokeWidth="0.5" opacity="0.7" />

      {/* Leaves — pointed with midrib */}
      {[
        { cx: x + 22 * dir, cy: height * 0.12, r: 30 * dir },
        { cx: x - 15 * dir, cy: height * 0.3, r: -20 * dir },
        { cx: x + 30 * dir, cy: height * 0.38, r: 25 * dir },
        { cx: x + 5 * dir, cy: height * 0.52, r: -15 * dir },
        { cx: x + 20 * dir, cy: height * 0.68, r: 35 * dir },
        { cx: x - 10 * dir, cy: height * 0.78, r: -25 * dir },
        { cx: x + 12 * dir, cy: height * 0.9, r: 20 * dir },
      ].map((l, i) => (
        <g key={i} transform={`rotate(${l.r}, ${l.cx}, ${l.cy})`}>
          <path d={`M${l.cx - 7},${l.cy} Q${l.cx},${l.cy - 4} ${l.cx + 7},${l.cy} Q${l.cx},${l.cy + 3} ${l.cx - 7},${l.cy} Z`}
            fill={i % 2 === 0 ? leafColor : vineColorDk} />
          <line x1={l.cx - 5} y1={l.cy} x2={l.cx + 5} y2={l.cy} stroke={vineColorDk} strokeWidth="0.3" opacity="0.5" />
        </g>
      ))}

      {/* Lemons — realistic */}
      <Lemon cx={x + 28 * dir} cy={height * 0.22} size={0.9} rotate={15 * dir} className="lemon-a" />
      <Lemon cx={x - 18 * dir} cy={height * 0.48} size={0.8} rotate={-10 * dir} className="lemon-b" />
      <Lemon cx={x + 18 * dir} cy={height * 0.75} size={0.95} rotate={20 * dir} className="lemon-c" />
    </g>
  );
}

export function VineBackground() {
  useEffect(() => { injectVineStyles(); }, []);

  const h = 2000;

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
      <svg width="100%" height="100%" viewBox={`0 0 400 ${h}`} preserveAspectRatio="xMidYMid slice" style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}>
        <VineBranch x={15} height={h} flip={false} className="vine-group" />
        <VineBranch x={45} height={h} flip={true} className="vine-group-alt" />
        <VineBranch x={355} height={h} flip={true} className="vine-group" />
        <VineBranch x={385} height={h} flip={false} className="vine-group-alt" />
      </svg>
    </div>
  );
}
