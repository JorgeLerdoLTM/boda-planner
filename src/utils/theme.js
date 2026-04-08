// Design tokens — Tuscan palette: neutral greens, blues, yellows
export const C = {
  // Primary accents
  green:     "#5B7F5E",
  greenDk:   "#3D5940",
  greenLt:   "#E8F0E8",
  blue:      "#5A7FA0",
  blueDk:    "#3D5F7A",
  blueLt:    "#E4EDF4",
  yellow:    "#D4A830",
  yellowDk:  "#A68420",
  yellowLt:  "#FBF5E4",

  // Neutrals
  ink:       "#3D4A3D",
  muted:     "#8A9488",
  cream:     "#F7F5F0",
  stone:     "#DDD9D0",
  white:     "#FFFFFF",
  success:   "#5B7F5E",
  danger:    "#C25B4E",

  // Vine background
  vineBg:    "#F2F0EA",

  shadow:    "none",
  radius:    0,
};

// Sharp card style
export const glassCard = {
  background: "rgba(255, 255, 255, 0.85)",
  border: `1px solid ${C.stone}`,
  borderRadius: 0,
};

export const TOUCH = {
  minTarget: 44,
  inputHeight: 44,
  cardGap: 12,
  mobilePad: 16,
};

export const STATUS_COLORS = {
  "Anticipo pagado": { bg: "#FBF5E4", color: "#8B6914", dot: "#D4A830" },
  "Cotizado":        { bg: "#E4EDF4", color: "#3D5F7A", dot: "#5A7FA0" },
  "Por Definir":     { bg: "#F0EFED", color: "#8A9488", dot: "#8A9488" },
  "Pagado completo": { bg: "#E8F0E8", color: "#3D5940", dot: "#5B7F5E" },
  "Cancelado":       { bg: "#FAE8E5", color: "#A0413A", dot: "#C25B4E" },
};

export const RSVP_COLORS = {
  Pending:   { bg: "#F0EFED", color: "#8A9488" },
  Confirmed: { bg: "#E8F0E8", color: "#3D5940" },
  Declined:  { bg: "#FAE8E5", color: "#A0413A" },
};

export const INV_COLORS = {
  "Not Sent":  { bg: "#F0EFED", color: "#8A9488" },
  "Sent":      { bg: "#FBF5E4", color: "#8B6914" },
  "Delivered": { bg: "#E8F0E8", color: "#3D5940" },
};

export const CAT_COLORS = [
  "#5B7F5E", "#5A7FA0", "#D4A830", "#C25B4E", "#7A8F6E",
  "#6B8FAA", "#BFA040", "#8B6E5E", "#4A7A6A", "#9AAA5A",
  "#7A6A9A", "#AA8A5A",
];
