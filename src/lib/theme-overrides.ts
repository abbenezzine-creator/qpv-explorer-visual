import { supabase } from "@/integrations/supabase/client";
import {
  GraduationCap, BookOpen, ShieldCheck, Plane, Scale, Briefcase, Heart, Sprout,
  Users, HeartPulse, Leaf, Palette, Tag, Building2, Map as MapIcon, Hammer, Bike,
  Music, Camera, Globe, Star, Sun, Trees, Bus, Car, Home, Utensils,
  Baby, Gamepad2, Trophy, Flame, Lightbulb, Rocket, HandHeart, Smile,
  Megaphone, MessagesSquare, Wrench, Calendar, Flag, Sparkles, Activity,
  type LucideIcon,
} from "lucide-react";

/** Curated registry of Lucide icons usable as theme icons. */
export const THEME_ICON_REGISTRY: Record<string, LucideIcon> = {
  GraduationCap, BookOpen, ShieldCheck, Plane, Scale, Briefcase, Heart, Sprout,
  Users, HeartPulse, Leaf, Palette, Tag, Building2, Map: MapIcon, Hammer, Bike,
  Music, Camera, Globe, Star, Sun, Trees, Bus, Car, Home, Utensils,
  Baby, Gamepad2, Trophy, Flame, Lightbulb, Rocket, HandHeart, Smile,
  Megaphone, MessagesSquare, Wrench, Calendar, Flag, Sparkles, Activity,
};

export const ICON_NAMES = Object.keys(THEME_ICON_REGISTRY).sort();

export type ThemeOverride = { color_hex: string; icon_name: string };

const cache = new Map<string, ThemeOverride>();
let loadedOnce = false;
let loadingPromise: Promise<void> | null = null;

export function getThemeOverride(name: string | null | undefined): ThemeOverride | null {
  if (!name) return null;
  return cache.get(name) ?? null;
}

export function getAllThemeOverrides(): Map<string, ThemeOverride> {
  return cache;
}

export async function loadThemeOverrides(force = false): Promise<void> {
  if (loadedOnce && !force) return;
  if (loadingPromise) return loadingPromise;
  loadingPromise = (async () => {
    try {
      const { data, error } = await supabase
        .from("theme_settings" as never)
        .select("thematique, color_hex, icon_name");
      if (error) throw error;
      cache.clear();
      for (const r of (data ?? []) as Array<{ thematique: string; color_hex: string; icon_name: string }>) {
        cache.set(r.thematique, { color_hex: r.color_hex, icon_name: r.icon_name });
      }
      loadedOnce = true;
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("ab-theme-overrides-changed"));
      }
    } finally {
      loadingPromise = null;
    }
  })();
  return loadingPromise;
}

/** Lightly tint a hex color for badge background (returns rgba string). */
export function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Serialize a Lucide icon's inner SVG (for use in raw HTML inside iframes). */
export function iconInnerSvg(iconName: string): string {
  const Comp = THEME_ICON_REGISTRY[iconName];
  if (!Comp) return "";
  // lucide-react attaches `iconNode` to each component
  const node = (Comp as unknown as { iconNode?: Array<[string, Record<string, string | number>]> }).iconNode;
  if (!Array.isArray(node)) return "";
  return node
    .map(([tag, attrs]) => {
      const a = Object.entries(attrs)
        .map(([k, v]) => `${k}="${String(v).replace(/"/g, "&quot;")}"`)
        .join(" ");
      return `<${tag} ${a}/>`;
    })
    .join("");
}
