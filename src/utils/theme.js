// Design tokens — Minimal, sharp, light
export const C = {
  blue:      "#1B4F8A",
  blueLt:    "#2E6DB4",
  blueXlt:   "#EDF2F7",
  yellow:    "#D4A017",
  yellowLt:  "#FBF5E4",
  cream:     "#FAFAFA",
  stone:     "#E5E5E5",
  ink:       "#111111",
  muted:     "#999999",
  success:   "#2D8A4E",
  danger:    "#D32F2F",
  white:     "#FFFFFF",

  shadow:    "none",
  shadowLg:  "none",
  radius:    0,
};

// Sharp card style
export const glassCard = {
  background: C.white,
  border: `1px solid ${C.stone}`,
  borderRadius: 0,
};

export const STATUS_COLORS = {
  "Anticipo pagado": { bg: "#FBF5E4", color: "#8B6914", dot: "#D4A017" },
  "Cotizado":        { bg: "#EDF2F7", color: "#1B4F8A", dot: "#1B4F8A" },
  "Por Definir":     { bg: "#F5F5F5", color: "#999999", dot: "#999999" },
  "Pagado completo": { bg: "#EBF5EE", color: "#2D6A4F", dot: "#2D8A4E" },
  "Cancelado":       { bg: "#FDECEA", color: "#D32F2F", dot: "#D32F2F" },
};

export const RSVP_COLORS = {
  Pending:   { bg: "#F5F5F5", color: "#999999" },
  Confirmed: { bg: "#EBF5EE", color: "#2D6A4F" },
  Declined:  { bg: "#FDECEA", color: "#D32F2F" },
};

export const INV_COLORS = {
  "Not Sent":  { bg: "#F5F5F5", color: "#999999" },
  "Sent":      { bg: "#FBF5E4", color: "#8B6914" },
  "Delivered": { bg: "#EBF5EE", color: "#2D6A4F" },
};

export const CAT_COLORS = [
  "#111111", "#1B4F8A", "#D4A017", "#2D8A4E", "#D32F2F",
  "#6B7280", "#9333EA", "#EA580C", "#0891B2", "#4F46E5",
  "#BE185D", "#059669",
];
