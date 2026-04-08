import { useState, useMemo, useCallback } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

// ── Design tokens ──────────────────────────────────────────────
const C = {
  blue:     "#1B4F8A",
  blueLt:   "#2E6DB4",
  blueXlt:  "#D6E4F5",
  yellow:   "#F5C518",
  yellowLt: "#FFF8D6",
  cream:    "#FFFDF5",
  stone:    "#E8E0D0",
  ink:      "#1A1A2E",
  muted:    "#6B6B7B",
  success:  "#4A7C59",
  danger:   "#C0392B",
  white:    "#FFFFFF",
};

// ── Seed data (from Excel) ─────────────────────────────────────
const SEED_FIXED = [
  { id:"f1",  category:"Salon",               name:"Mayita",                        amount:383902, paid:100000,  due:"2026-09-15", status:"Anticipo pagado", notes:"" },
  { id:"f2",  category:"Iglesia",             name:"Universidad Anahuac",           amount:13000,  paid:6500,    due:"2026-09-01", status:"Anticipo pagado", notes:"" },
  { id:"f3",  category:"DJ",                  name:"Rux Productions",               amount:94000,  paid:10000,   due:"2026-09-01", status:"Anticipo pagado", notes:"" },
  { id:"f4",  category:"Foto y Video",        name:"Diego Dingo Cinema",            amount:74000,  paid:0,       due:"2026-09-01", status:"Cotizado",        notes:"" },
  { id:"f5",  category:"Wedding Planner",     name:"Sparkle Wedding Planner",       amount:35000,  paid:7874.75, due:"2026-09-01", status:"Anticipo pagado", notes:"" },
  { id:"f6",  category:"Coro Misa",           name:"Renacimiento Coros y Orquesta", amount:19062,  paid:0,       due:"2026-09-01", status:"Cotizado",        notes:"" },
  { id:"f7",  category:"Dulces y Quesos",     name:"The Candy Station",             amount:50150,  paid:5000,    due:"2026-09-01", status:"Anticipo pagado", notes:"Pago Lorel 5k" },
  { id:"f8",  category:"Argollas",            name:"TBD",                           amount:15000,  paid:0,       due:"2026-09-01", status:"Por Definir",     notes:"Estimado ~8-9k por argolla" },
  { id:"f9",  category:"Detalles",            name:"Termos y Pantuflas",            amount:5169,   paid:0,       due:"2026-09-01", status:"Por Definir",     notes:"275 cilindros + 135 pantuflas" },
  { id:"f10", category:"Papelería",           name:"Diseño Invitaciones (Blanca)",  amount:5500,   paid:0,       due:"2026-09-01", status:"Por Definir",     notes:"Estimado basado en Andrea e Iñigo" },
  { id:"f11", category:"Vestuario",           name:"Fraq Hombres (TBD)",            amount:35000,  paid:0,       due:"2026-09-01", status:"Por Definir",     notes:"7 personas, estimado Moni Avila" },
  { id:"f12", category:"Flores",              name:"Flores Iglesia (TBD)",          amount:20000,  paid:0,       due:"2026-09-01", status:"Por Definir",     notes:"Estimado -30% vs Iñigo (Valentine's)" },
  { id:"f13", category:"Mobiliario",          name:"Fundas sillas (Mayita/Eterum)", amount:27000,  paid:0,       due:"2026-09-01", status:"Cotizado",        notes:"200 fundas Tiffany Santorini beige" },
  { id:"f14", category:"Mobiliario",          name:"Copa verde + Plato azul",       amount:18000,  paid:0,       due:"2026-09-01", status:"Cotizado",        notes:"Copa verde $40 + Plato azul $50 × 200" },
  { id:"f15", category:"Flores",              name:"Decoración (Mattiola)",         amount:161533, paid:0,       due:"2026-09-01", status:"Cotizado",        notes:"TBD precio final" },
  { id:"f16", category:"Entretenimiento",     name:"Violin Banquete",               amount:25000,  paid:2000,    due:"2026-09-01", status:"Anticipo pagado", notes:"Pago Lorel 5k" },
];

const SEED_VARIABLE = [
  { id:"v1", category:"Banquete", name:"Menús Mayita (costo promedio)",    applies_to:"attendees", unit_cost:1393, min_guests:0, notes:"Incluye tornafiestas, cocteles entrada, aguas aperol/gin/margaritas" },
  { id:"v2", category:"Banquete", name:"Refrescos, jugos, hielos (Mayita)",applies_to:"attendees", unit_cost:108,  min_guests:0, notes:"4 opciones de bebida sin alcohol" },
  { id:"v3", category:"Alcohol",  name:"Barra libre Europea (benchmark)",  applies_to:"attendees", unit_cost:365,  min_guests:0, notes:"Promedio de 6 cotizaciones" },
];

const SEED_GUESTS = [
  {id:"g1",  side:"Coke",  group:"Novio",         first:"LOREL",      last:"MENDIOLEA HARO",     plus_one:1, phone:"5555041074",  rsvp:"Pending", inv_sent:"Not Sent", dietary:"", notes:""},
  {id:"g2",  side:"Lorel", group:"Novia",          first:"Jorge",      last:"Lerdo de Tejada",    plus_one:1, phone:"17134782315", rsvp:"Pending", inv_sent:"Not Sent", dietary:"", notes:""},
  {id:"g3",  side:"Lorel", group:"Fam Haro",       first:"Adriana",    last:"Haro Villegas",      plus_one:2, phone:"5555099965",  rsvp:"Pending", inv_sent:"Not Sent", dietary:"", notes:""},
  {id:"g4",  side:"Lorel", group:"Amiga Regis",    first:"Adriana",    last:"Nuñez",              plus_one:2, phone:"5522993373",  rsvp:"Pending", inv_sent:"Not Sent", dietary:"", notes:""},
  {id:"g5",  side:"Lorel", group:"Fam Haro",       first:"Alejandra",  last:"Vilchis",            plus_one:2, phone:"5532238329",  rsvp:"Pending", inv_sent:"Not Sent", dietary:"", notes:""},
  {id:"g6",  side:"Lorel", group:"Fam Haro",       first:"Ana Luisa",  last:"Haro",               plus_one:2, phone:"8116113313",  rsvp:"Pending", inv_sent:"Not Sent", dietary:"", notes:""},
  {id:"g7",  side:"Lorel", group:"Amiga Regis",    first:"Ana Maria",  last:"Delgado",            plus_one:2, phone:"5543394187",  rsvp:"Pending", inv_sent:"Not Sent", dietary:"", notes:""},
  {id:"g8",  side:"Lorel", group:"Fam Haro",       first:"Ana Paola",  last:"Montiel",            plus_one:2, phone:"5573522098",  rsvp:"Pending", inv_sent:"Not Sent", dietary:"", notes:""},
  {id:"g9",  side:"Lorel", group:"Fam Mendiolea",  first:"Armando",    last:"Mendiolea",          plus_one:2, phone:"5517611153",  rsvp:"Pending", inv_sent:"Not Sent", dietary:"", notes:""},
  {id:"g10", side:"Lorel", group:"Fam Haro",       first:"Carlos",     last:"Haro",               plus_one:2, phone:"5559679779",  rsvp:"Pending", inv_sent:"Not Sent", dietary:"", notes:""},
  {id:"g11", side:"Lorel", group:"Fam Haro",       first:"Cecilia",    last:"Haro Villegas",      plus_one:2, phone:"5554037194",  rsvp:"Pending", inv_sent:"Not Sent", dietary:"", notes:""},
  {id:"g12", side:"Lorel", group:"Fam Haro",       first:"Cecilia",    last:"Lopez de Haro",      plus_one:2, phone:"5554018213",  rsvp:"Pending", inv_sent:"Not Sent", dietary:"", notes:""},
  {id:"g13", side:"Lorel", group:"Amiga Lorena",   first:"Claudia",    last:"Cruz",               plus_one:2, phone:"5541405013",  rsvp:"Pending", inv_sent:"Not Sent", dietary:"", notes:""},
  {id:"g14", side:"Lorel", group:"Fam Haro",       first:"Claudia",    last:"Villafuerte",        plus_one:2, phone:"5579741604",  rsvp:"Pending", inv_sent:"Not Sent", dietary:"", notes:""},
  {id:"g15", side:"Lorel", group:"Fam Mendiolea",  first:"Daniel",     last:"Espinoza",           plus_one:1, phone:"5551018104",  rsvp:"Pending", inv_sent:"Not Sent", dietary:"", notes:""},
  {id:"g16", side:"Lorel", group:"Amiga Lorel",    first:"Daniela",    last:"Ortes",              plus_one:2, phone:"5563190062",  rsvp:"Pending", inv_sent:"Not Sent", dietary:"", notes:""},
  {id:"g17", side:"Lorel", group:"Fam Mendiolea",  first:"Diego",      last:"Mendiolea",          plus_one:1, phone:"7146051557",  rsvp:"Pending", inv_sent:"Not Sent", dietary:"", notes:""},
  {id:"g18", side:"Lorel", group:"Amigo Lorel",    first:"Diego",      last:"Pulido",             plus_one:1, phone:"7771418531",  rsvp:"Pending", inv_sent:"Not Sent", dietary:"", notes:""},
  {id:"g19", side:"Lorel", group:"Fam Haro",       first:"Elsa",       last:"Villegas Gonzalez",  plus_one:1, phone:"5521702405",  rsvp:"Pending", inv_sent:"Not Sent", dietary:"", notes:""},
  {id:"g20", side:"Lorel", group:"Fam Haro",       first:"Elsa",       last:"Haro Villegas",      plus_one:1, phone:"5539432071",  rsvp:"Pending", inv_sent:"Not Sent", dietary:"", notes:""},
  {id:"g21", side:"Lorel", group:"Fam Haro",       first:"Elsa (mamá)","last":"Montalvo",         plus_one:1, phone:"5554084292",  rsvp:"Pending", inv_sent:"Not Sent", dietary:"", notes:""},
  {id:"g22", side:"Lorel", group:"Fam Haro",       first:"Elsa (hija)","last":"Montalvo",         plus_one:2, phone:"5554511937",  rsvp:"Pending", inv_sent:"Not Sent", dietary:"", notes:""},
  {id:"g23", side:"Lorel", group:"Fam Haro",       first:"Enrique",    last:"Sobrado",            plus_one:2, phone:"5555095280",  rsvp:"Pending", inv_sent:"Not Sent", dietary:"", notes:""},
  {id:"g24", side:"Lorel", group:"Fam Mendiolea",  first:"Enrique",    last:"Espinoza",           plus_one:2, phone:"7771510273",  rsvp:"Pending", inv_sent:"Not Sent", dietary:"", notes:""},
  {id:"g25", side:"Lorel", group:"Fam Haro",       first:"Ernesto",    last:"Montiel",            plus_one:2, phone:"5551051328",  rsvp:"Pending", inv_sent:"Not Sent", dietary:"", notes:""},
  {id:"g26", side:"Lorel", group:"Fam Mendiolea",  first:"Ernesto (papá)","last":"Mendiolea",     plus_one:2, phone:"7773701970",  rsvp:"Pending", inv_sent:"Not Sent", dietary:"", notes:""},
  {id:"g27", side:"Lorel", group:"Fam Mendiolea",  first:"Ernesto hijo","last":"Mendiolea",       plus_one:2, phone:"5555025083",  rsvp:"Pending", inv_sent:"Not Sent", dietary:"", notes:""},
  {id:"g28", side:"Lorel", group:"Fam Haro",       first:"Gerardo",    last:"Sobrado",            plus_one:2, phone:"5552175966",  rsvp:"Pending", inv_sent:"Not Sent", dietary:"", notes:""},
  {id:"g29", side:"Lorel", group:"Fam Haro",       first:"Gonzalo",    last:"Unda",               plus_one:2, phone:"5528994671",  rsvp:"Pending", inv_sent:"Not Sent", dietary:"", notes:""},
  {id:"g30", side:"Lorel", group:"Amiga Lorena",   first:"Karla",      last:"Acosta",             plus_one:2, phone:"5527519828",  rsvp:"Pending", inv_sent:"Not Sent", dietary:"", notes:""},
  {id:"g31", side:"Lorel", group:"Amiga Lorena",   first:"Guadalupe",  last:"Acosta",             plus_one:1, phone:"5519483188",  rsvp:"Pending", inv_sent:"Not Sent", dietary:"", notes:""},
  {id:"g32", side:"Lorel", group:"Padre",          first:"Ignacio",    last:"Camarena",           plus_one:1, phone:"5543690660",  rsvp:"Pending", inv_sent:"Not Sent", dietary:"", notes:""},
  {id:"g33", side:"Lorel", group:"Fam Mendiolea",  first:"Iker",       last:"Mendiolea",          plus_one:2, phone:"5528555351",  rsvp:"Pending", inv_sent:"Not Sent", dietary:"", notes:""},
  {id:"g34", side:"Lorel", group:"Fam Mendiolea",  first:"Iñigo",      last:"Mendiolea",          plus_one:2, phone:"7775640864",  rsvp:"Pending", inv_sent:"Not Sent", dietary:"", notes:""},
  {id:"g35", side:"Lorel", group:"Regina",         first:"Jimena",     last:"Gorostizaga",        plus_one:2, phone:"5512907137",  rsvp:"Pending", inv_sent:"Not Sent", dietary:"", notes:""},
  {id:"g36", side:"Lorel", group:"Fam Haro",       first:"Jose Pablo", last:"Unda",               plus_one:2, phone:"5541814277",  rsvp:"Pending", inv_sent:"Not Sent", dietary:"", notes:""},
  {id:"g37", side:"Lorel", group:"Amiga Lorena",   first:"Laura",      last:"Gallegos",           plus_one:2, phone:"5536777772",  rsvp:"Pending", inv_sent:"Not Sent", dietary:"", notes:""},
  {id:"g38", side:"Lorel", group:"Amiga Lorena",   first:"Laura",      last:"Poncanelli",         plus_one:2, phone:"5519734029",  rsvp:"Pending", inv_sent:"Not Sent", dietary:"", notes:""},
  {id:"g39", side:"Lorel", group:"Fam Mendiolea",  first:"Andrea",     last:"Mendiolea Haro",     plus_one:2, phone:"5555041074",  rsvp:"Pending", inv_sent:"Not Sent", dietary:"", notes:""},
  {id:"g40", side:"Lorel", group:"Fam Haro",       first:"Lorena",     last:"Haro Villegas",      plus_one:1, phone:"5568031342",  rsvp:"Pending", inv_sent:"Not Sent", dietary:"", notes:""},
  {id:"g41", side:"Lorel", group:"Fam Mendiolea",  first:"Luis",       last:"Escarsega",          plus_one:2, phone:"5554033867",  rsvp:"Pending", inv_sent:"Not Sent", dietary:"", notes:""},
  {id:"g42", side:"Lorel", group:"Amigo Lorel",    first:"Luis Miguel","last":"Diaz Morlet",      plus_one:1, phone:"5541331786",  rsvp:"Pending", inv_sent:"Not Sent", dietary:"", notes:""},
  {id:"g43", side:"Lorel", group:"Fam Mendiolea",  first:"Ma.Fernanda","last":"Velazquez",        plus_one:4, phone:"8114147388",  rsvp:"Pending", inv_sent:"Not Sent", dietary:"", notes:"Familia"},
  {id:"g44", side:"Lorel", group:"Fam Mendiolea",  first:"Maria Sofia","last":"Espinoza",         plus_one:2, phone:"7771197457",  rsvp:"Pending", inv_sent:"Not Sent", dietary:"", notes:""},
  {id:"g45", side:"Lorel", group:"Amiga Lorel",    first:"Mariana",    last:"Rodriguez",          plus_one:1, phone:"5528990645",  rsvp:"Pending", inv_sent:"Not Sent", dietary:"", notes:""},
  {id:"g46", side:"Lorel", group:"Fam Mendiolea",  first:"Mauricio",   last:"Mendiolea",          plus_one:1, phone:"5554022212",  rsvp:"Pending", inv_sent:"Not Sent", dietary:"", notes:""},
  {id:"g47", side:"Lorel", group:"Amiga Lorel",    first:"Valerie",    last:"Aguilar Garcia",     plus_one:2, phone:"5514754034",  rsvp:"Pending", inv_sent:"Not Sent", dietary:"", notes:""},
  {id:"g48", side:"Lorel", group:"Amiga Lorena",   first:"Monica",     last:"Valenzuela",         plus_one:1, phone:"5550689916",  rsvp:"Pending", inv_sent:"Not Sent", dietary:"", notes:""},
  {id:"g49", side:"Lorel", group:"Amiga Regis",    first:"Montserrat", last:"Garcia",             plus_one:2, phone:"5540996308",  rsvp:"Pending", inv_sent:"Not Sent", dietary:"", notes:""},
  {id:"g50", side:"Lorel", group:"Amiga Regis",    first:"Norma",      last:"García",             plus_one:2, phone:"5534004213",  rsvp:"Pending", inv_sent:"Not Sent", dietary:"", notes:""},
  {id:"g51", side:"Lorel", group:"Fam Haro",       first:"Oscar",      last:"Vilchis",            plus_one:2, phone:"5591982324",  rsvp:"Pending", inv_sent:"Not Sent", dietary:"", notes:""},
  {id:"g52", side:"Lorel", group:"Fam Mendiolea",  first:"Pablo",      last:"Mendiolea",          plus_one:2, phone:"5537076839",  rsvp:"Pending", inv_sent:"Not Sent", dietary:"", notes:""},
  {id:"g53", side:"Lorel", group:"Fam Haro",       first:"Paola",      last:"Ramirez",            plus_one:1, phone:"5545230345",  rsvp:"Pending", inv_sent:"Not Sent", dietary:"", notes:""},
  {id:"g54", side:"Lorel", group:"Fam Mendiolea",  first:"Patricia",   last:"Mendiolea",          plus_one:1, phone:"5530384733",  rsvp:"Pending", inv_sent:"Not Sent", dietary:"", notes:""},
  {id:"g55", side:"Lorel", group:"Amiga Lorena",   first:"Patricia",   last:"Rodriguez",          plus_one:2, phone:"5521234822",  rsvp:"Pending", inv_sent:"Not Sent", dietary:"", notes:""},
  {id:"g56", side:"Lorel", group:"Amiga Lorena",   first:"Patricia",   last:"Hanono",             plus_one:2, phone:"5545250543",  rsvp:"Pending", inv_sent:"Not Sent", dietary:"", notes:""},
  {id:"g57", side:"Lorel", group:"Amiga Lorel",    first:"Paulina",    last:"Peña",               plus_one:2, phone:"5543441890",  rsvp:"Pending", inv_sent:"Not Sent", dietary:"", notes:""},
  {id:"g58", side:"Lorel", group:"Amiga Regis",    first:"Regina",     last:"Castellano",         plus_one:2, phone:"5538849088",  rsvp:"Pending", inv_sent:"Not Sent", dietary:"", notes:""},
  {id:"g59", side:"Lorel", group:"Amiga Lorel",    first:"Stella",     last:"Abadi",              plus_one:1, phone:"5530183950",  rsvp:"Pending", inv_sent:"Not Sent", dietary:"", notes:""},
];

// ── Helpers ────────────────────────────────────────────────────
const fmt = (n) => new Intl.NumberFormat("es-MX", { style:"currency", currency:"MXN", maximumFractionDigits:0 }).format(n||0);
const fmtShort = (n) => n >= 1000000 ? `$${(n/1000000).toFixed(1)}M` : n >= 1000 ? `$${Math.round(n/1000)}K` : fmt(n);
const uid = () => Math.random().toString(36).slice(2,9);

const STATUS_COLORS = {
  "Anticipo pagado": { bg:"#FFF8D6", color:"#8B6914", dot:"#F5C518" },
  "Cotizado":        { bg:"#D6E4F5", color:"#1B4F8A", dot:"#1B4F8A" },
  "Por Definir":     { bg:"#F0EFEF", color:"#6B6B7B", dot:"#9E9E9E" },
  "Pagado completo": { bg:"#D8F0E0", color:"#2D6A4F", dot:"#4A7C59" },
  "Cancelado":       { bg:"#FDECEA", color:"#C0392B", dot:"#E74C3C" },
};

const RSVP_COLORS = {
  "Pending":   { bg:"#F0EFEF", color:"#6B6B7B" },
  "Confirmed": { bg:"#D8F0E0", color:"#2D6A4F" },
  "Declined":  { bg:"#FDECEA", color:"#C0392B" },
};

const INV_COLORS = {
  "Not Sent":  { bg:"#F0EFEF", color:"#6B6B7B" },
  "Sent":      { bg:"#FFF8D6", color:"#8B6914" },
  "Delivered": { bg:"#D8F0E0", color:"#2D6A4F" },
};

const CAT_COLORS = ["#1B4F8A","#F5C518","#4A7C59","#C0392B","#8B4513","#2E86AB","#A23B72","#F18F01","#6B4226","#44CF6C","#E84855","#7B2D8B"];

// ── Reusable UI ────────────────────────────────────────────────
const Pill = ({ label, bg, color, dot, onClick, style }) => (
  <span onClick={onClick} style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"3px 10px", borderRadius:20, background:bg, color, fontSize:11, fontWeight:600, letterSpacing:"0.04em", cursor:onClick?"pointer":"default", ...style }}>
    {dot && <span style={{width:6,height:6,borderRadius:"50%",background:dot,flexShrink:0}}/>}{label}
  </span>
);

const KpiCard = ({ label, value, sub, highlight, icon }) => (
  <div style={{ background: highlight ? C.blue : C.white, border: `1px solid ${highlight ? C.blue : C.stone}`, borderRadius:14, padding:"18px 22px", flex:1, minWidth:130 }}>
    <div style={{ fontSize:10, letterSpacing:"0.14em", textTransform:"uppercase", color: highlight ? C.blueXlt : C.muted, marginBottom:6, fontFamily:"'Cormorant Garamond',serif" }}>{icon && <span style={{marginRight:5}}>{icon}</span>}{label}</div>
    <div style={{ fontSize: highlight ? 28 : 22, fontWeight:700, color: highlight ? C.yellow : C.ink, fontFamily:"'Cormorant Garamond',serif", lineHeight:1.1 }}>{value}</div>
    {sub && <div style={{ fontSize:11, color: highlight ? C.blueXlt : C.muted, marginTop:4 }}>{sub}</div>}
  </div>
);

const SliderInput = ({ label, value, min, max, step=1, onChange, format, accent=C.blue }) => {
  const pct = ((value-min)/(max-min))*100;
  return (
    <div style={{marginBottom:22}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:8}}>
        <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:12,letterSpacing:"0.1em",textTransform:"uppercase",color:C.muted}}>{label}</span>
        <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:26,fontWeight:600,color:accent}}>{format?format(value):value}</span>
      </div>
      <div style={{position:"relative",height:5,background:C.stone,borderRadius:3}}>
        <div style={{position:"absolute",left:0,top:0,height:"100%",width:`${pct}%`,background:accent,borderRadius:3,transition:"width 0.1s"}}/>
        <input type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(Number(e.target.value))} style={{position:"absolute",top:-8,left:0,width:"100%",opacity:0,cursor:"pointer",height:22}}/>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",marginTop:3}}>
        <span style={{fontSize:10,color:C.muted}}>{format?format(min):min}</span>
        <span style={{fontSize:10,color:C.muted}}>{format?format(max):max}</span>
      </div>
    </div>
  );
};

const InlineSelect = ({ value, options, onChange, colors }) => {
  const col = colors?.[value] || {};
  return (
    <select value={value} onChange={e=>onChange(e.target.value)}
      style={{ background:col.bg||"#f5f5f5", color:col.color||C.ink, border:"none", borderRadius:12, padding:"3px 8px", fontSize:11, fontWeight:600, cursor:"pointer", outline:"none", appearance:"none", WebkitAppearance:"none" }}>
      {options.map(o=><option key={o} value={o}>{o}</option>)}
    </select>
  );
};

const EditableCell = ({ value, onChange, type="text", placeholder="" }) => {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  const commit = () => { setEditing(false); if(val!==value) onChange(val); };
  if(editing) return <input autoFocus value={val} onChange={e=>setVal(e.target.value)} onBlur={commit} onKeyDown={e=>{if(e.key==="Enter")commit();if(e.key==="Escape"){setVal(value);setEditing(false);}}} type={type} style={{width:"100%",border:"1px solid "+C.blue,borderRadius:4,padding:"2px 6px",fontSize:12,background:C.yellowLt,outline:"none"}}/>;
  return <span onClick={()=>{setVal(value);setEditing(true);}} style={{cursor:"text",display:"block",minWidth:40,color:value?C.ink:C.muted,fontSize:12}}>{value||<span style={{color:C.stone,fontSize:11}}>{placeholder||"—"}</span>}</span>;
};

// ── Tab nav ────────────────────────────────────────────────────
const tabs = [
  { id:"dashboard", label:"Dashboard" },
  { id:"fixed",     label:"Costos Fijos" },
  { id:"variable",  label:"Costos Variables" },
  { id:"guests",    label:"Invitados" },
  { id:"forecast",  label:"Pronóstico" },
];

// ══════════════════════════════════════════════════════════════
export default function WeddingForecast() {
  const [activeTab, setActiveTab]   = useState("dashboard");
  const [fixedCosts, setFixed]      = useState(SEED_FIXED);
  const [varCosts, setVar]          = useState(SEED_VARIABLE);
  const [guests, setGuests]         = useState(SEED_GUESTS);
  const [invitees, setInvitees]     = useState(450);
  const [cancelRate, setCancelRate] = useState(11);
  const [contingency, setContingency] = useState(5);

  const attendees = Math.round(invitees * (1 - cancelRate/100));

  const fixedTotal   = useMemo(()=>fixedCosts.reduce((s,c)=>s+(Number(c.amount)||0),0),[fixedCosts]);
  const paidTotal    = useMemo(()=>fixedCosts.reduce((s,c)=>s+(Number(c.paid)||0),0),[fixedCosts]);
  const varTotal     = useMemo(()=>varCosts.reduce((s,c)=>s+(Number(c.unit_cost)||0)*(c.applies_to==="attendees"?attendees:invitees),0),[varCosts,attendees,invitees]);
  const subtotal     = fixedTotal + varTotal;
  const contBuffer   = subtotal * (contingency/100);
  const grandTotal   = subtotal + contBuffer;
  const balance      = grandTotal - paidTotal;
  const perAttendee  = attendees > 0 ? grandTotal / attendees : 0;

  // Category breakdown
  const catBreakdown = useMemo(()=>{
    const map = {};
    fixedCosts.forEach(c=>{map[c.category]=(map[c.category]||0)+Number(c.amount||0);});
    varCosts.forEach(c=>{const b=c.applies_to==="attendees"?attendees:invitees;map[c.category]=(map[c.category]||0)+Number(c.unit_cost||0)*b;});
    return Object.entries(map).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value);
  },[fixedCosts,varCosts,attendees,invitees]);

  // RSVP counts
  const confirmed = guests.filter(g=>g.rsvp==="Confirmed").length;
  const declined  = guests.filter(g=>g.rsvp==="Declined").length;
  const pending   = guests.filter(g=>g.rsvp==="Pending").length;
  const plusOnes  = guests.filter(g=>g.plus_one>=2).length;

  // Mutations
  const updateFixed  = useCallback((id,key,val)=>setFixed(p=>p.map(r=>r.id===id?{...r,[key]:val}:r)),[]);
  const deleteFixed  = useCallback((id)=>setFixed(p=>p.filter(r=>r.id!==id)),[]);
  const addFixed     = ()=>setFixed(p=>[...p,{id:"f"+uid(),category:"",name:"",amount:0,paid:0,due:"",status:"Por Definir",notes:""}]);
  const updateVar    = useCallback((id,key,val)=>setVar(p=>p.map(r=>r.id===id?{...r,[key]:val}:r)),[]);
  const deleteVar    = useCallback((id)=>setVar(p=>p.filter(r=>r.id!==id)),[]);
  const addVar       = ()=>setVar(p=>[...p,{id:"v"+uid(),category:"",name:"",applies_to:"attendees",unit_cost:0,min_guests:0,notes:""}]);
  const updateGuest  = useCallback((id,key,val)=>setGuests(p=>p.map(r=>r.id===id?{...r,[key]:val}:r)),[]);
  const deleteGuest  = useCallback((id)=>setGuests(p=>p.filter(r=>r.id!==id)),[]);
  const addGuest     = ()=>setGuests(p=>[...p,{id:"g"+uid(),side:"Lorel",group:"",first:"",last:"",plus_one:1,phone:"",rsvp:"Pending",inv_sent:"Not Sent",dietary:"",notes:""}]);

  const upcoming = fixedCosts.filter(c=>c.due&&c.due!=="Pagado"&&!isNaN(new Date(c.due))).sort((a,b)=>new Date(a.due)-new Date(b.due)).slice(0,5);

  return (
    <div style={{minHeight:"100vh",background:C.cream,fontFamily:"'DM Sans',sans-serif",color:C.ink}}>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600;700&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet"/>

      {/* Header */}
      <div style={{background:C.blue,padding:"20px 32px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,fontWeight:600,color:C.yellow,letterSpacing:"0.03em"}}>Lorel & Coke</div>
          <div style={{fontSize:11,color:C.blueXlt,letterSpacing:"0.12em",textTransform:"uppercase",marginTop:2}}>Wedding Budget · Septiembre 2026</div>
        </div>
        <div style={{display:"flex",gap:10,alignItems:"center"}}>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:11,color:C.blueXlt}}>Presupuesto total</div>
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:24,fontWeight:700,color:C.yellow}}>{fmtShort(grandTotal)}</div>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{background:C.white,borderBottom:`1px solid ${C.stone}`,display:"flex",gap:0,padding:"0 32px",overflowX:"auto"}}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setActiveTab(t.id)} style={{
            padding:"14px 20px",border:"none",background:"transparent",
            color: activeTab===t.id ? C.blue : C.muted,
            borderBottom: activeTab===t.id ? `2px solid ${C.blue}` : "2px solid transparent",
            fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:activeTab===t.id?600:400,
            cursor:"pointer",whiteSpace:"nowrap",letterSpacing:"0.02em",
          }}>{t.label}</button>
        ))}
      </div>

      <div style={{maxWidth:1200,margin:"0 auto",padding:"28px 24px 60px"}}>

        {/* ── DASHBOARD ── */}
        {activeTab==="dashboard" && (
          <div>
            {/* Hero KPIs */}
            <div style={{display:"flex",gap:14,marginBottom:24,flexWrap:"wrap"}}>
              <KpiCard label="Total Estimado" value={fmt(grandTotal)} sub={`incl. ${contingency}% contingencia`} highlight icon="💰"/>
              <KpiCard label="Pagado" value={fmt(paidTotal)} sub={`${Math.round(paidTotal/grandTotal*100)}% del total`}/>
              <KpiCard label="Balance Pendiente" value={fmt(balance)} sub="por pagar"/>
              <KpiCard label="Por Asistente" value={fmt(perAttendee)} sub={`${attendees} esperados`}/>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:20}}>
              {/* Sliders */}
              <div style={{background:C.white,border:`1px solid ${C.stone}`,borderRadius:14,padding:24}}>
                <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:13,letterSpacing:"0.15em",textTransform:"uppercase",color:C.muted,marginBottom:18}}>Parámetros</div>
                <SliderInput label="Total invitados" value={invitees} min={100} max={600} step={5} onChange={setInvitees} accent={C.blue}/>
                <SliderInput label="Tasa de cancelación" value={cancelRate} min={0} max={40} onChange={setCancelRate} format={v=>`${v}%`} accent={C.yellow}/>
                <SliderInput label="Contingencia" value={contingency} min={0} max={30} onChange={setContingency} format={v=>`${v}%`} accent={C.success}/>
                <div style={{background:C.blueXlt,borderRadius:10,padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:4}}>
                  <span style={{fontSize:12,color:C.blue,fontWeight:600}}>Asistentes esperados</span>
                  <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:28,fontWeight:700,color:C.blue}}>{attendees}</span>
                </div>
              </div>

              {/* Fixed vs Variable donut */}
              <div style={{background:C.white,border:`1px solid ${C.stone}`,borderRadius:14,padding:24}}>
                <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:13,letterSpacing:"0.15em",textTransform:"uppercase",color:C.muted,marginBottom:8}}>Fijo vs Variable</div>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                  <Pill label={`Fijo ${fmt(fixedTotal)}`} bg={C.blueXlt} color={C.blue} dot={C.blue}/>
                  <Pill label={`Variable ${fmt(varTotal)}`} bg={C.yellowLt} color="#8B6914" dot={C.yellow}/>
                </div>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart><Pie data={[{name:"Fijo",value:fixedTotal},{name:"Variable",value:varTotal}]} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                    <Cell fill={C.blue}/><Cell fill={C.yellow}/>
                  </Pie><Tooltip formatter={v=>fmt(v)}/></PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Category breakdown */}
            <div style={{background:C.white,border:`1px solid ${C.stone}`,borderRadius:14,padding:24,marginBottom:20}}>
              <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:13,letterSpacing:"0.15em",textTransform:"uppercase",color:C.muted,marginBottom:16}}>Desglose por Categoría</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={catBreakdown} layout="vertical" margin={{left:20,right:40}}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.stone}/>
                  <XAxis type="number" tickFormatter={v=>fmtShort(v)} style={{fontSize:10}}/>
                  <YAxis type="category" dataKey="name" width={130} style={{fontSize:11}}/>
                  <Tooltip formatter={v=>fmt(v)}/>
                  <Bar dataKey="value" radius={[0,4,4,0]}>
                    {catBreakdown.map((_,i)=><Cell key={i} fill={CAT_COLORS[i%CAT_COLORS.length]}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
              {/* RSVP summary */}
              <div style={{background:C.white,border:`1px solid ${C.stone}`,borderRadius:14,padding:24}}>
                <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:13,letterSpacing:"0.15em",textTransform:"uppercase",color:C.muted,marginBottom:16}}>Estado Invitados</div>
                <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:16}}>
                  <div style={{flex:1,background:C.blueXlt,borderRadius:10,padding:"14px 16px",textAlign:"center"}}>
                    <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:32,fontWeight:700,color:C.blue}}>{guests.length}</div>
                    <div style={{fontSize:11,color:C.muted}}>Total invitados</div>
                  </div>
                  <div style={{flex:1,background:"#D8F0E0",borderRadius:10,padding:"14px 16px",textAlign:"center"}}>
                    <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:32,fontWeight:700,color:C.success}}>{confirmed}</div>
                    <div style={{fontSize:11,color:C.muted}}>Confirmados</div>
                  </div>
                  <div style={{flex:1,background:"#F0EFEF",borderRadius:10,padding:"14px 16px",textAlign:"center"}}>
                    <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:32,fontWeight:700,color:C.muted}}>{pending}</div>
                    <div style={{fontSize:11,color:C.muted}}>Pendientes</div>
                  </div>
                  <div style={{flex:1,background:"#FDECEA",borderRadius:10,padding:"14px 16px",textAlign:"center"}}>
                    <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:32,fontWeight:700,color:C.danger}}>{declined}</div>
                    <div style={{fontSize:11,color:C.muted}}>Declinados</div>
                  </div>
                </div>
                <div style={{display:"flex",justifyContent:"center"}}>
                  <Pill label={`${plusOnes} con +1`} bg={C.yellowLt} color="#8B6914" dot={C.yellow}/>
                </div>
              </div>

              {/* Upcoming payments */}
              <div style={{background:C.white,border:`1px solid ${C.stone}`,borderRadius:14,padding:24}}>
                <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:13,letterSpacing:"0.15em",textTransform:"uppercase",color:C.muted,marginBottom:16}}>Próximos Pagos</div>
                {upcoming.length===0 && <div style={{color:C.muted,fontSize:13}}>Sin fechas próximas.</div>}
                {upcoming.map(c=>(
                  <div key={c.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:`1px solid ${C.stone}`}}>
                    <div style={{background:C.blueXlt,borderRadius:8,padding:"6px 10px",fontSize:10,color:C.blue,fontWeight:600,minWidth:72,textAlign:"center"}}>{c.due}</div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:12,fontWeight:600,color:C.ink}}>{c.name||c.category}</div>
                      <div style={{fontSize:11,color:C.muted}}>{c.category}</div>
                    </div>
                    <div style={{fontSize:13,fontWeight:700,color:C.blue}}>{fmt(Number(c.amount)-Number(c.paid||0))}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── FIXED COSTS ── */}
        {activeTab==="fixed" && (
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <div>
                <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:26,fontWeight:600,color:C.ink}}>Costos Fijos</div>
                <div style={{fontSize:12,color:C.muted}}>Total: {fmt(fixedTotal)} · Pagado: {fmt(paidTotal)} · Balance: {fmt(fixedTotal-paidTotal)}</div>
              </div>
              <button onClick={addFixed} style={{background:C.blue,color:C.white,border:"none",borderRadius:8,padding:"8px 18px",fontSize:13,fontWeight:600,cursor:"pointer"}}>+ Agregar</button>
            </div>
            <div style={{background:C.white,border:`1px solid ${C.stone}`,borderRadius:14,overflow:"hidden"}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead>
                  <tr style={{background:C.blue}}>
                    {["Categoría","Proveedor / Concepto","Monto","Pagado","Balance","Fecha Pago","Estado","Notas",""].map(h=>(
                      <th key={h} style={{padding:"10px 12px",textAlign:"left",fontSize:10,letterSpacing:"0.1em",textTransform:"uppercase",color:C.blueXlt,fontWeight:600,whiteSpace:"nowrap"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {fixedCosts.map((c,i)=>{
                    const bal = (Number(c.amount)||0)-(Number(c.paid)||0);
                    const sc = STATUS_COLORS[c.status]||STATUS_COLORS["Por Definir"];
                    return (
                      <tr key={c.id} style={{borderBottom:`1px solid ${C.stone}`,background:i%2===0?C.white:C.cream}}>
                        <td style={{padding:"9px 12px"}}><EditableCell value={c.category} onChange={v=>updateFixed(c.id,"category",v)} placeholder="Categoría"/></td>
                        <td style={{padding:"9px 12px"}}><EditableCell value={c.name} onChange={v=>updateFixed(c.id,"name",v)} placeholder="Nombre"/></td>
                        <td style={{padding:"9px 12px",textAlign:"right"}}><EditableCell value={c.amount} onChange={v=>updateFixed(c.id,"amount",Number(v))} type="number"/></td>
                        <td style={{padding:"9px 12px",textAlign:"right"}}><EditableCell value={c.paid} onChange={v=>updateFixed(c.id,"paid",Number(v))} type="number"/></td>
                        <td style={{padding:"9px 12px",textAlign:"right",fontWeight:600,color:bal>0?C.danger:C.success}}>{fmt(bal)}</td>
                        <td style={{padding:"9px 12px"}}><EditableCell value={c.due} onChange={v=>updateFixed(c.id,"due",v)} placeholder="YYYY-MM-DD"/></td>
                        <td style={{padding:"9px 12px"}}>
                          <InlineSelect value={c.status} options={Object.keys(STATUS_COLORS)} onChange={v=>updateFixed(c.id,"status",v)} colors={STATUS_COLORS}/>
                        </td>
                        <td style={{padding:"9px 12px",maxWidth:180}}><EditableCell value={c.notes} onChange={v=>updateFixed(c.id,"notes",v)} placeholder="Notas"/></td>
                        <td style={{padding:"9px 8px",textAlign:"center"}}>
                          <button onClick={()=>deleteFixed(c.id)} style={{background:"none",border:"none",color:C.stone,cursor:"pointer",fontSize:15,padding:"0 4px"}} title="Eliminar">×</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{background:C.blueXlt,borderTop:`2px solid ${C.blue}`}}>
                    <td colSpan={2} style={{padding:"10px 12px",fontWeight:700,color:C.blue,fontSize:12}}>TOTAL</td>
                    <td style={{padding:"10px 12px",textAlign:"right",fontWeight:700,color:C.blue}}>{fmt(fixedTotal)}</td>
                    <td style={{padding:"10px 12px",textAlign:"right",fontWeight:700,color:C.success}}>{fmt(paidTotal)}</td>
                    <td style={{padding:"10px 12px",textAlign:"right",fontWeight:700,color:C.danger}}>{fmt(fixedTotal-paidTotal)}</td>
                    <td colSpan={4}/>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* ── VARIABLE COSTS ── */}
        {activeTab==="variable" && (
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <div>
                <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:26,fontWeight:600,color:C.ink}}>Costos Variables</div>
                <div style={{fontSize:12,color:C.muted}}>Basado en {attendees} asistentes · Total: {fmt(varTotal)}</div>
              </div>
              <button onClick={addVar} style={{background:C.blue,color:C.white,border:"none",borderRadius:8,padding:"8px 18px",fontSize:13,fontWeight:600,cursor:"pointer"}}>+ Agregar</button>
            </div>
            <div style={{background:C.yellowLt,border:`1px solid ${C.yellow}`,borderRadius:10,padding:"10px 16px",marginBottom:16,display:"flex",gap:20,alignItems:"center",fontSize:12,color:"#8B6914"}}>
              <span>👥 Asistentes: <strong>{attendees}</strong></span>
              <span>📨 Invitados: <strong>{invitees}</strong></span>
              <span style={{color:C.muted,fontSize:11}}>Ajusta los sliders en Pronóstico o Dashboard para cambiar estos valores</span>
            </div>
            <div style={{background:C.white,border:`1px solid ${C.stone}`,borderRadius:14,overflow:"hidden"}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead>
                  <tr style={{background:C.blue}}>
                    {["Categoría","Concepto","Aplica a","Costo/persona","Mín. personas","Total estimado","Notas",""].map(h=>(
                      <th key={h} style={{padding:"10px 12px",textAlign:"left",fontSize:10,letterSpacing:"0.1em",textTransform:"uppercase",color:C.blueXlt,fontWeight:600}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {varCosts.map((c,i)=>{
                    const base = c.applies_to==="attendees" ? attendees : invitees;
                    const est = (Number(c.unit_cost)||0)*base;
                    return (
                      <tr key={c.id} style={{borderBottom:`1px solid ${C.stone}`,background:i%2===0?C.white:C.cream}}>
                        <td style={{padding:"9px 12px"}}><EditableCell value={c.category} onChange={v=>updateVar(c.id,"category",v)} placeholder="Categoría"/></td>
                        <td style={{padding:"9px 12px"}}><EditableCell value={c.name} onChange={v=>updateVar(c.id,"name",v)} placeholder="Concepto"/></td>
                        <td style={{padding:"9px 12px"}}>
                          <InlineSelect value={c.applies_to} options={["attendees","invitees"]} onChange={v=>updateVar(c.id,"applies_to",v)} colors={{attendees:{bg:C.blueXlt,color:C.blue},invitees:{bg:C.yellowLt,color:"#8B6914"}}}/>
                        </td>
                        <td style={{padding:"9px 12px",textAlign:"right"}}><EditableCell value={c.unit_cost} onChange={v=>updateVar(c.id,"unit_cost",Number(v))} type="number"/></td>
                        <td style={{padding:"9px 12px",textAlign:"center"}}><EditableCell value={c.min_guests} onChange={v=>updateVar(c.id,"min_guests",Number(v))} type="number"/></td>
                        <td style={{padding:"9px 12px",textAlign:"right",fontWeight:600,color:C.blue}}>{fmt(est)}</td>
                        <td style={{padding:"9px 12px",maxWidth:200}}><EditableCell value={c.notes} onChange={v=>updateVar(c.id,"notes",v)} placeholder="Notas"/></td>
                        <td style={{padding:"9px 8px",textAlign:"center"}}>
                          <button onClick={()=>deleteVar(c.id)} style={{background:"none",border:"none",color:C.stone,cursor:"pointer",fontSize:15,padding:"0 4px"}}>×</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{background:C.blueXlt,borderTop:`2px solid ${C.blue}`}}>
                    <td colSpan={5} style={{padding:"10px 12px",fontWeight:700,color:C.blue,fontSize:12}}>TOTAL ESTIMADO</td>
                    <td style={{padding:"10px 12px",textAlign:"right",fontWeight:700,color:C.blue}}>{fmt(varTotal)}</td>
                    <td colSpan={2}/>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* ── GUEST LIST ── */}
        {activeTab==="guests" && <GuestListView guests={guests} updateGuest={updateGuest} deleteGuest={deleteGuest} addGuest={addGuest} confirmed={confirmed} pending={pending} declined={declined} plusOnes={plusOnes}/>}

        {/* ── FORECAST ── */}
        {activeTab==="forecast" && (
          <div>
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:26,fontWeight:600,color:C.ink,marginBottom:24}}>Pronóstico de Costos</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:24,marginBottom:24}}>
              <div style={{background:C.white,border:`1px solid ${C.stone}`,borderRadius:14,padding:28}}>
                <SliderInput label="Total invitados" value={invitees} min={100} max={600} step={5} onChange={setInvitees} accent={C.blue}/>
                <SliderInput label="Cancelaciones" value={cancelRate} min={0} max={40} onChange={setCancelRate} format={v=>`${v}%`} accent={C.yellow}/>
                <SliderInput label="Contingencia" value={contingency} min={0} max={30} onChange={setContingency} format={v=>`${v}%`} accent={C.success}/>
                <div style={{background:C.blueXlt,borderRadius:10,padding:"12px 18px",marginTop:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:12,color:C.blue,fontWeight:600}}>Asistentes esperados</span>
                  <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:32,fontWeight:700,color:C.blue}}>{attendees}</span>
                </div>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                <KpiCard label="Costo Total" value={fmt(grandTotal)} sub={`con ${contingency}% contingencia`} highlight/>
                <div style={{display:"flex",gap:12}}>
                  <KpiCard label="Por asistente" value={fmt(perAttendee)}/>
                  <KpiCard label="Por invitado" value={fmt(grandTotal/invitees)}/>
                </div>
                <div style={{display:"flex",gap:12}}>
                  <KpiCard label="Costos fijos" value={fmt(fixedTotal)} sub={`${Math.round(fixedTotal/grandTotal*100)}%`}/>
                  <KpiCard label="Costos variables" value={fmt(varTotal)} sub={`${Math.round(varTotal/grandTotal*100)}%`}/>
                </div>
              </div>
            </div>
            {/* Scenarios */}
            <div style={{background:C.white,border:`1px solid ${C.stone}`,borderRadius:14,padding:24}}>
              <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:13,letterSpacing:"0.15em",textTransform:"uppercase",color:C.muted,marginBottom:16}}>Escenarios</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14}}>
                {[{label:"Íntimo",pct:0.7},{label:"Actual",pct:1},{label:"Ampliado",pct:1.3}].map(({label,pct})=>{
                  const inv = Math.round(invitees*pct);
                  const att = Math.round(inv*(1-cancelRate/100));
                  const vt  = varCosts.reduce((s,c)=>s+(Number(c.unit_cost)||0)*(c.applies_to==="attendees"?att:inv),0);
                  const tot = (fixedTotal+vt)*(1+contingency/100);
                  const isCurrent = pct===1;
                  return (
                    <div key={label} style={{background:isCurrent?C.blue:C.cream,borderRadius:12,padding:"18px 20px",border:`1px solid ${isCurrent?C.blue:C.stone}`}}>
                      <div style={{fontSize:10,letterSpacing:"0.15em",textTransform:"uppercase",color:isCurrent?C.yellow:C.muted,marginBottom:6}}>{label}</div>
                      <div style={{fontSize:11,color:isCurrent?C.blueXlt:C.muted,marginBottom:4}}>{inv} invitados · {att} asistentes</div>
                      <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:24,fontWeight:700,color:isCurrent?C.yellow:C.ink}}>{fmt(tot)}</div>
                      <div style={{fontSize:11,color:isCurrent?C.blueXlt:C.muted,marginTop:2}}>{fmt(att>0?tot/att:0)}/persona</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Guest List View ────────────────────────────────────────────
function GuestListView({ guests, updateGuest, deleteGuest, addGuest, confirmed, pending, declined, plusOnes }) {
  const [sideFilter, setSideFilter]   = useState("All");
  const [rsvpFilter, setRsvpFilter]   = useState("All");
  const [groupFilter, setGroupFilter] = useState("All");
  const [search, setSearch]           = useState("");

  const groups = useMemo(()=>["All",...new Set(guests.map(g=>g.group).filter(Boolean))],[guests]);

  const filtered = useMemo(()=>guests.filter(g=>{
    if(sideFilter!=="All" && g.side!==sideFilter) return false;
    if(rsvpFilter!=="All" && g.rsvp!==rsvpFilter) return false;
    if(groupFilter!=="All" && g.group!==groupFilter) return false;
    if(search && !`${g.first} ${g.last}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }),[guests,sideFilter,rsvpFilter,groupFilter,search]);

  const plusLabel = {1:"No",2:"+1",4:"Familia"};

  return (
    <div>
      {/* RSVP pills */}
      <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
        <Pill label={`${guests.length} Total`} bg={C.blueXlt} color={C.blue} dot={C.blue}/>
        <Pill label={`${confirmed} Confirmados`} bg="#D8F0E0" color={C.success} dot={C.success}/>
        <Pill label={`${pending} Pendientes`} bg="#F0EFEF" color={C.muted} dot="#9E9E9E"/>
        <Pill label={`${declined} Declinados`} bg="#FDECEA" color={C.danger} dot={C.danger}/>
        <Pill label={`${plusOnes} con +1`} bg={C.yellowLt} color="#8B6914" dot={C.yellow}/>
        <button onClick={addGuest} style={{marginLeft:"auto",background:C.blue,color:C.white,border:"none",borderRadius:8,padding:"7px 16px",fontSize:12,fontWeight:600,cursor:"pointer"}}>+ Invitado</button>
      </div>

      {/* Filters */}
      <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar nombre..." style={{border:`1px solid ${C.stone}`,borderRadius:8,padding:"7px 12px",fontSize:12,outline:"none",flex:1,minWidth:160,background:C.white}}/>
        {[["Side",sideFilter,setSideFilter,["All","Lorel","Coke"]],["RSVP",rsvpFilter,setRsvpFilter,["All","Pending","Confirmed","Declined"]],["Grupo",groupFilter,setGroupFilter,groups]].map(([label,val,setter,opts])=>(
          <select key={label} value={val} onChange={e=>setter(e.target.value)} style={{border:`1px solid ${C.stone}`,borderRadius:8,padding:"7px 12px",fontSize:12,background:C.white,outline:"none",cursor:"pointer"}}>
            {opts.map(o=><option key={o} value={o}>{o==="All"?`Todos (${label})`:o}</option>)}
          </select>
        ))}
      </div>

      {/* Table */}
      <div style={{background:C.white,border:`1px solid ${C.stone}`,borderRadius:14,overflow:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:900}}>
          <thead>
            <tr style={{background:C.blue}}>
              {["Side","Grupo","Nombre","Apellido","+1","Teléfono","RSVP","Invitación","Dieta","Notas",""].map(h=>(
                <th key={h} style={{padding:"10px 12px",textAlign:"left",fontSize:10,letterSpacing:"0.1em",textTransform:"uppercase",color:C.blueXlt,fontWeight:600,whiteSpace:"nowrap"}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((g,i)=>{
              const rowBg = g.side==="Lorel" ? (i%2===0?C.white:"#FFFBF0") : (i%2===0?"#F5F9FF":"#EEF4FF");
              return (
                <tr key={g.id} style={{borderBottom:`1px solid ${C.stone}`,background:rowBg}}>
                  <td style={{padding:"8px 12px"}}>
                    <span style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:10,background:g.side==="Lorel"?C.yellowLt:C.blueXlt,color:g.side==="Lorel"?"#8B6914":C.blue}}>{g.side}</span>
                  </td>
                  <td style={{padding:"8px 12px",fontSize:11,color:C.muted}}>{g.group}</td>
                  <td style={{padding:"8px 12px"}}><EditableCell value={g.first} onChange={v=>updateGuest(g.id,"first",v)}/></td>
                  <td style={{padding:"8px 12px"}}><EditableCell value={g.last} onChange={v=>updateGuest(g.id,"last",v)}/></td>
                  <td style={{padding:"8px 12px",textAlign:"center"}}>
                    <InlineSelect value={String(g.plus_one)} options={["1","2","4"]} onChange={v=>updateGuest(g.id,"plus_one",Number(v))}
                      colors={{"1":{bg:"#F0EFEF",color:C.muted},"2":{bg:C.yellowLt,color:"#8B6914"},"4":{bg:C.blueXlt,color:C.blue}}}/>
                  </td>
                  <td style={{padding:"8px 12px",fontSize:11,color:C.muted}}>{g.phone}</td>
                  <td style={{padding:"8px 12px"}}>
                    <InlineSelect value={g.rsvp} options={["Pending","Confirmed","Declined"]} onChange={v=>updateGuest(g.id,"rsvp",v)} colors={RSVP_COLORS}/>
                  </td>
                  <td style={{padding:"8px 12px"}}>
                    <InlineSelect value={g.inv_sent} options={["Not Sent","Sent","Delivered"]} onChange={v=>updateGuest(g.id,"inv_sent",v)} colors={INV_COLORS}/>
                  </td>
                  <td style={{padding:"8px 12px",fontSize:11,color:g.dietary?C.danger:C.stone}}>{g.dietary||"—"}</td>
                  <td style={{padding:"8px 12px"}}><EditableCell value={g.notes} onChange={v=>updateGuest(g.id,"notes",v)} placeholder="Notas"/></td>
                  <td style={{padding:"8px 6px",textAlign:"center"}}>
                    <button onClick={()=>deleteGuest(g.id)} style={{background:"none",border:"none",color:C.stone,cursor:"pointer",fontSize:15}}>×</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div style={{padding:"10px 16px",fontSize:11,color:C.muted,borderTop:`1px solid ${C.stone}`}}>
          Mostrando {filtered.length} de {guests.length} invitados
        </div>
      </div>
    </div>
  );
}
