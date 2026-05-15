import {
  GraduationCap, Briefcase, HeartPulse, Users, Scale, Leaf,
  ShieldCheck, Palette, Tag, Layers,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type ThemeStyle = { icon: LucideIcon; bg: string; fg: string; ring: string };

export const THEME_STYLES: Record<string, ThemeStyle> = {
  "Education / Parentalité": { icon: GraduationCap, bg: "bg-violet-100",  fg: "text-violet-700",  ring: "ring-violet-200" },
  "Emploi & Développement":  { icon: Briefcase,     bg: "bg-amber-100",   fg: "text-amber-700",   ring: "ring-amber-200" },
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

export const themeStyle = (t: string | null | undefined): ThemeStyle =>
  (t && THEME_STYLES[t]) || DEFAULT_STYLE;

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
  const s = isAll ? ALL_STYLE : themeStyle(thematique);
  const Icon = s.icon;
  const sizing = size === "md"
    ? "px-3 py-1.5 text-xs"
    : "px-2.5 py-1 text-[11px]";
  const iconSize = size === "md" ? "h-4 w-4" : "h-3.5 w-3.5";
  return (
    <span className={`inline-flex items-center gap-1.5 self-start rounded-full font-semibold ring-1 ${sizing} ${s.bg} ${s.fg} ${s.ring} ${className}`}>
      <Icon className={iconSize} />
      {label}
    </span>
  );
}
