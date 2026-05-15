import {
  GraduationCap, Briefcase, HeartPulse, Users, Scale, Leaf,
  ShieldCheck, Palette, Tag, Layers, BookOpen, Plane, Heart, Sprout,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getThemeOverride, THEME_ICON_REGISTRY, hexToRgba, iconInnerSvg } from "@/lib/theme-overrides";

export type ThemeStyle = { icon: LucideIcon; bg: string; fg: string; ring: string };

export const THEME_STYLES: Record<string, ThemeStyle> = {
  // New thematique mapping
  "Education - Sport - Jeunesse":                       { icon: GraduationCap, bg: "bg-sky-100",     fg: "text-sky-700",     ring: "ring-sky-200" },
  "Cité éducative":                                     { icon: BookOpen,      bg: "bg-pink-100",    fg: "text-pink-700",    ring: "ring-pink-200" },
  "Cadre de vie - Tranquillité et sûreté publique":     { icon: ShieldCheck,   bg: "bg-violet-100",  fg: "text-violet-700",  ring: "ring-violet-200" },
  "Quartier d'été - VVV":                               { icon: Plane,         bg: "bg-fuchsia-100", fg: "text-fuchsia-700", ring: "ring-fuchsia-200" },
  "Accès aux droit - Lutte contre les discrimination":  { icon: Scale,         bg: "bg-blue-100",    fg: "text-blue-700",    ring: "ring-blue-200" },
  "Emploi - Développement économique":                  { icon: Briefcase,     bg: "bg-orange-100",  fg: "text-orange-700",  ring: "ring-orange-200" },
  "Solidarité - égalité des chances":                   { icon: Heart,         bg: "bg-emerald-100", fg: "text-emerald-700", ring: "ring-emerald-200" },
  "Transition":                                         { icon: Sprout,        bg: "bg-green-100",   fg: "text-green-700",   ring: "ring-green-200" },

  // Legacy keys (kept for existing data)
  "Education / Parentalité": { icon: GraduationCap, bg: "bg-sky-100",     fg: "text-sky-700",     ring: "ring-sky-200" },
  "Emploi & Développement":  { icon: Briefcase,     bg: "bg-orange-100",  fg: "text-orange-700",  ring: "ring-orange-200" },
  "Santé":                   { icon: HeartPulse,    bg: "bg-rose-100",    fg: "text-rose-700",    ring: "ring-rose-200" },
  "Cohésion sociale":        { icon: Users,         bg: "bg-sky-100",     fg: "text-sky-700",     ring: "ring-sky-200" },
  "Citoyenneté":             { icon: Scale,         bg: "bg-indigo-100",  fg: "text-indigo-700",  ring: "ring-indigo-200" },
  "Transition écologique":   { icon: Leaf,          bg: "bg-emerald-100", fg: "text-emerald-700", ring: "ring-emerald-200" },
  "Accès aux droits":        { icon: Scale,         bg: "bg-blue-100",    fg: "text-blue-700",    ring: "ring-blue-200" },
  "Prévention":              { icon: ShieldCheck,   bg: "bg-teal-100",    fg: "text-teal-700",    ring: "ring-teal-200" },
  "Culture":                 { icon: Palette,       bg: "bg-fuchsia-100", fg: "text-fuchsia-700", ring: "ring-fuchsia-200" },
};

export const DEFAULT_STYLE: ThemeStyle = { icon: Tag, bg: "bg-muted", fg: "text-foreground", ring: "ring-border" };

export const ALL_STYLE: ThemeStyle = {
  icon: Layers,
  bg: "bg-gradient-to-r from-primary/15 via-fuchsia-100 to-violet-100",
  fg: "text-primary",
  ring: "ring-primary/30",
};

export const themeStyle = (t: string | null | undefined): ThemeStyle => {
  if (!t) return DEFAULT_STYLE;
  const ov = getThemeOverride(t);
  if (ov) {
    const Icon = THEME_ICON_REGISTRY[ov.icon_name] ?? Tag;
    return {
      icon: Icon,
      bg: "",
      fg: "",
      ring: "",
      // Inline-styled below in <ThemeBadge/> when override exists
    } as ThemeStyle;
  }
  return THEME_STYLES[t] || DEFAULT_STYLE;
};

/** Hex equivalents (Tailwind ~500) of each ThemeBadge color, for use outside React (CSS borders, iframe HTML, gradients). */
export const THEME_HEX: Record<string, string> = {
  // New
  "Education - Sport - Jeunesse":                       "#0ea5e9", // sky-500
  "Cité éducative":                                     "#ec4899", // pink-500
  "Cadre de vie - Tranquillité et sûreté publique":     "#8b5cf6", // violet-500
  "Quartier d'été - VVV":                               "#d946ef", // fuchsia-500
  "Accès aux droit - Lutte contre les discrimination":  "#3b82f6", // blue-500
  "Emploi - Développement économique":                  "#f97316", // orange-500
  "Solidarité - égalité des chances":                   "#10b981", // emerald-500
  "Transition":                                         "#22c55e", // green-500
  // Legacy
  "Education / Parentalité": "#0ea5e9",
  "Emploi & Développement":  "#f97316",
  "Santé":                   "#f43f5e",
  "Cohésion sociale":        "#0ea5e9",
  "Citoyenneté":             "#6366f1",
  "Transition écologique":   "#10b981",
  "Accès aux droits":        "#3b82f6",
  "Prévention":              "#14b8a6",
  "Culture":                 "#d946ef",
};

const DEFAULT_HEX = "#94a3b8"; // slate-400

export function themeHex(t: string | null | undefined): string {
  if (!t) return DEFAULT_HEX;
  const ov = getThemeOverride(t);
  if (ov) return ov.color_hex;
  return THEME_HEX[t] ?? DEFAULT_HEX;
}

/** Soft tints (~bg-100 / text-700) for HTML pill rendering outside React. */
const THEME_TINTS: Record<string, { bg: string; fg: string; ring: string }> = {
  // New
  "Education - Sport - Jeunesse":                       { bg: "#e0f2fe", fg: "#0369a1", ring: "#bae6fd" },
  "Cité éducative":                                     { bg: "#fce7f3", fg: "#be185d", ring: "#fbcfe8" },
  "Cadre de vie - Tranquillité et sûreté publique":     { bg: "#ede9fe", fg: "#6d28d9", ring: "#ddd6fe" },
  "Quartier d'été - VVV":                               { bg: "#fae8ff", fg: "#a21caf", ring: "#f5d0fe" },
  "Accès aux droit - Lutte contre les discrimination":  { bg: "#dbeafe", fg: "#1d4ed8", ring: "#bfdbfe" },
  "Emploi - Développement économique":                  { bg: "#ffedd5", fg: "#c2410c", ring: "#fed7aa" },
  "Solidarité - égalité des chances":                   { bg: "#d1fae5", fg: "#047857", ring: "#a7f3d0" },
  "Transition":                                         { bg: "#dcfce7", fg: "#15803d", ring: "#bbf7d0" },
  // Legacy
  "Education / Parentalité": { bg: "#e0f2fe", fg: "#0369a1", ring: "#bae6fd" },
  "Emploi & Développement":  { bg: "#ffedd5", fg: "#c2410c", ring: "#fed7aa" },
  "Santé":                   { bg: "#ffe4e6", fg: "#be123c", ring: "#fecdd3" },
  "Cohésion sociale":        { bg: "#e0f2fe", fg: "#0369a1", ring: "#bae6fd" },
  "Citoyenneté":             { bg: "#e0e7ff", fg: "#4338ca", ring: "#c7d2fe" },
  "Transition écologique":   { bg: "#d1fae5", fg: "#047857", ring: "#a7f3d0" },
  "Accès aux droits":        { bg: "#dbeafe", fg: "#1d4ed8", ring: "#bfdbfe" },
  "Prévention":              { bg: "#ccfbf1", fg: "#0f766e", ring: "#99f6e4" },
  "Culture":                 { bg: "#fae8ff", fg: "#a21caf", ring: "#f5d0fe" },
};
const DEFAULT_TINT = { bg: "#f1f5f9", fg: "#334155", ring: "#e2e8f0" };

/** SVG path data for the lucide icon used per theme. */
const GRADUATION_CAP = '<path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/><path d="M2 10 12 5l10 5-10 5z"/>';
const BRIEFCASE = '<rect width="20" height="14" x="2" y="7" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>';
const SCALE = '<path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>';
const SHIELD_CHECK = '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>';
const BOOK_OPEN = '<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>';
const PLANE = '<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>';
const HEART = '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z"/>';
const SPROUT = '<path d="M7 20h10"/><path d="M10 20c5.5-2.5.8-6.4 3-10"/><path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"/><path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"/>';

const THEME_ICON_SVG: Record<string, string> = {
  // New
  "Education - Sport - Jeunesse":                       GRADUATION_CAP,
  "Cité éducative":                                     BOOK_OPEN,
  "Cadre de vie - Tranquillité et sûreté publique":     SHIELD_CHECK,
  "Quartier d'été - VVV":                               PLANE,
  "Accès aux droit - Lutte contre les discrimination":  SCALE,
  "Emploi - Développement économique":                  BRIEFCASE,
  "Solidarité - égalité des chances":                   HEART,
  "Transition":                                         SPROUT,
  // GraduationCap
  "Education / Parentalité": '<path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/><path d="M2 10 12 5l10 5-10 5z"/>',
  // Briefcase
  "Emploi & Développement":  '<rect width="20" height="14" x="2" y="7" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
  // HeartPulse
  "Santé":                   '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z"/><path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"/>',
  // Users
  "Cohésion sociale":        '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  // Scale
  "Citoyenneté":             '<path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>',
  // Leaf
  "Transition écologique":   '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19.2 2.96c1 1.51.5 6.55-2.99 9.6-3 3-7 3.5-9 3.5l1-2"/><path d="M2 21c0-3 1.85-5.36 5.08-6"/>',
  // Scale (Accès aux droits)
  "Accès aux droits":        '<path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>',
  // ShieldCheck
  "Prévention":              '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
  // Palette
  "Culture":                 '<circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>',
};
// Tag (default)
const DEFAULT_ICON_SVG = '<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/>';

/** Renders a small themed badge as raw HTML — for use inside the dashboard iframe. */
export function themeBadgeHtml(t: string | null | undefined): string {
  if (!t) return "";
  const ov = getThemeOverride(t);
  let tint: { bg: string; fg: string; ring: string };
  let icon: string;
  if (ov) {
    tint = { bg: hexToRgba(ov.color_hex, 0.14), fg: ov.color_hex, ring: hexToRgba(ov.color_hex, 0.35) };
    icon = iconInnerSvg(ov.icon_name) || DEFAULT_ICON_SVG;
  } else {
    tint = THEME_TINTS[t] ?? DEFAULT_TINT;
    icon = THEME_ICON_SVG[t] ?? DEFAULT_ICON_SVG;
  }
  const safe = String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
  return `<span style="display:inline-flex;align-items:center;gap:5px;padding:2px 8px;border-radius:999px;background:${tint.bg};color:${tint.fg};box-shadow:inset 0 0 0 1px ${tint.ring};font-size:11px;font-weight:600;line-height:1.4">`
    + `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icon}</svg>`
    + safe
    + `</span>`;
}

export function ThemeBadge({
  thematique,
  size = "sm",
  className = "",
}: {
  thematique: string | null | undefined;
  size?: "sm" | "md";
  className?: string;
}) {
  const isAll = thematique === "__all" || thematique === null || thematique === undefined || thematique === "";
  const label = isAll ? "Toutes les thématiques" : thematique!;
  const ov = !isAll ? getThemeOverride(thematique ?? "") : null;
  const s = isAll ? ALL_STYLE : themeStyle(thematique);
  const Icon = s.icon;
  const sizing = size === "md" ? "px-3 py-1.5 text-xs" : "px-2.5 py-1 text-[11px]";
  const iconSize = size === "md" ? "h-4 w-4" : "h-3.5 w-3.5";
  if (ov) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 self-start rounded-full font-semibold ring-1 ${sizing} ${className}`}
        style={{
          background: hexToRgba(ov.color_hex, 0.14),
          color: ov.color_hex,
          boxShadow: `inset 0 0 0 1px ${hexToRgba(ov.color_hex, 0.35)}`,
        }}
      >
        <Icon className={iconSize} />
        {label}
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1.5 self-start rounded-full font-semibold ring-1 ${sizing} ${s.bg} ${s.fg} ${s.ring} ${className}`}>
      <Icon className={iconSize} />
      {label}
    </span>
  );
}
