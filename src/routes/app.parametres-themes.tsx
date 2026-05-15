import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Palette, Save, Plus, Trash2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { getUser } from "@/lib/auth";
import { ICON_NAMES, THEME_ICON_REGISTRY, loadThemeOverrides } from "@/lib/theme-overrides";
import { ThemeBadge } from "@/components/ThemeBadge";
import { THEMATIQUE_OPTIONS } from "@/lib/actions-data";

export const Route = createFileRoute("/app/parametres-themes")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login" });
  },
  component: ParametresThemesPage,
});

type Row = { id: string; thematique: string; color_hex: string; icon_name: string };

function ParametresThemesPage() {
  const user = getUser();
  const isSuperAdmin = user?.role === "superadmin";

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["theme-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("theme_settings" as never)
        .select("id, thematique, color_hex, icon_name")
        .order("thematique");
      if (error) throw error;
      return (data ?? []) as Row[];
    },
    enabled: isSuperAdmin,
  });

  const [draft, setDraft] = useState<Record<string, { color_hex: string; icon_name: string }>>({});
  const [newTheme, setNewTheme] = useState({ thematique: "", color_hex: "#3b82f6", icon_name: "Tag" });

  useEffect(() => {
    if (data) {
      const d: typeof draft = {};
      for (const r of data) d[r.id] = { color_hex: r.color_hex, icon_name: r.icon_name };
      setDraft(d);
    }
  }, [data]);

  const existingNames = useMemo(() => new Set((data ?? []).map((r) => r.thematique)), [data]);
  const availableThematiques = THEMATIQUE_OPTIONS.filter((t) => !existingNames.has(t));

  if (!isSuperAdmin) {
    return (
      <div className="p-6">
        <div className="mx-auto max-w-2xl rounded-lg border bg-card p-6 text-center">
          <p className="text-muted-foreground">Accès réservé aux superadmins.</p>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/app"><ArrowLeft className="h-4 w-4 mr-1" />Retour</Link>
          </Button>
        </div>
      </div>
    );
  }

  const save = async (id: string) => {
    const v = draft[id];
    if (!v) return;
    const { error } = await supabase
      .from("theme_settings" as never)
      .update({ color_hex: v.color_hex, icon_name: v.icon_name } as never)
      .eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Personnalisation enregistrée");
    await loadThemeOverrides(true);
    refetch();
  };

  const remove = async (id: string) => {
    if (!confirm("Supprimer cette personnalisation ?")) return;
    const { error } = await supabase.from("theme_settings" as never).delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Supprimée");
    await loadThemeOverrides(true);
    refetch();
  };

  const create = async () => {
    if (!newTheme.thematique) { toast.error("Choisis une thématique"); return; }
    const { error } = await supabase
      .from("theme_settings" as never)
      .insert({ thematique: newTheme.thematique, color_hex: newTheme.color_hex, icon_name: newTheme.icon_name } as never);
    if (error) { toast.error(error.message); return; }
    toast.success("Thématique ajoutée");
    setNewTheme({ thematique: "", color_hex: "#3b82f6", icon_name: "Tag" });
    await loadThemeOverrides(true);
    refetch();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2">
            <Link to="/app" search={{ page: "parametres" }}><ArrowLeft className="h-4 w-4 mr-1" />Administration</Link>
          </Button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Palette className="h-6 w-6" /> Personnalisation des thématiques
          </h1>
          <p className="text-sm text-muted-foreground">
            Couleur et icône appliquées partout (cards, pastilles, listes, dashboard).
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-1 ${isFetching ? "animate-spin" : ""}`} />Rafraîchir
        </Button>
      </div>

      {/* Add new */}
      <div className="rounded-lg border bg-card p-4">
        <h2 className="font-semibold mb-3 flex items-center gap-2"><Plus className="h-4 w-4" />Ajouter une thématique</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div className="md:col-span-2">
            <Label>Thématique</Label>
            <Select value={newTheme.thematique} onValueChange={(v) => setNewTheme((p) => ({ ...p, thematique: v }))}>
              <SelectTrigger><SelectValue placeholder="Choisir…" /></SelectTrigger>
              <SelectContent>
                {availableThematiques.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Couleur</Label>
            <div className="flex gap-2">
              <Input type="color" value={newTheme.color_hex} onChange={(e) => setNewTheme((p) => ({ ...p, color_hex: e.target.value }))} className="w-14 p-1 h-10" />
              <Input value={newTheme.color_hex} onChange={(e) => setNewTheme((p) => ({ ...p, color_hex: e.target.value }))} />
            </div>
          </div>
          <div>
            <Label>Icône</Label>
            <IconSelect value={newTheme.icon_name} onChange={(v) => setNewTheme((p) => ({ ...p, icon_name: v }))} />
          </div>
          <div className="md:col-span-4">
            <Button onClick={create}><Plus className="h-4 w-4 mr-1" />Ajouter</Button>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Thématique</TableHead>
              <TableHead>Couleur</TableHead>
              <TableHead>Icône</TableHead>
              <TableHead>Aperçu</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Chargement…</TableCell></TableRow>}
            {(data ?? []).map((r) => {
              const v = draft[r.id] ?? { color_hex: r.color_hex, icon_name: r.icon_name };
              return (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.thematique}</TableCell>
                  <TableCell>
                    <div className="flex gap-2 items-center">
                      <Input
                        type="color"
                        value={v.color_hex}
                        onChange={(e) => setDraft((p) => ({ ...p, [r.id]: { ...v, color_hex: e.target.value } }))}
                        className="w-12 p-1 h-9"
                      />
                      <Input
                        value={v.color_hex}
                        onChange={(e) => setDraft((p) => ({ ...p, [r.id]: { ...v, color_hex: e.target.value } }))}
                        className="w-28 font-mono text-xs"
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <IconSelect value={v.icon_name} onChange={(val) => setDraft((p) => ({ ...p, [r.id]: { ...v, icon_name: val } }))} />
                  </TableCell>
                  <TableCell><PreviewBadge thematique={r.thematique} color_hex={v.color_hex} icon_name={v.icon_name} /></TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" onClick={() => save(r.id)} className="mr-2"><Save className="h-3.5 w-3.5 mr-1" />Enregistrer</Button>
                    <Button size="sm" variant="outline" onClick={() => remove(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function IconSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const Cur = THEME_ICON_REGISTRY[value];
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <span className="inline-flex items-center gap-2">
          {Cur ? <Cur className="h-4 w-4" /> : null}
          <SelectValue />
        </span>
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {ICON_NAMES.map((n) => {
          const I = THEME_ICON_REGISTRY[n];
          return (
            <SelectItem key={n} value={n}>
              <span className="inline-flex items-center gap-2"><I className="h-4 w-4" />{n}</span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

function PreviewBadge({ thematique, color_hex, icon_name }: { thematique: string; color_hex: string; icon_name: string }) {
  const I = THEME_ICON_REGISTRY[icon_name];
  const bg = `${color_hex}24`;
  return (
    <span
      className="inline-flex items-center gap-1.5 self-start rounded-full font-semibold ring-1 px-2.5 py-1 text-[11px]"
      style={{ background: bg, color: color_hex, boxShadow: `inset 0 0 0 1px ${color_hex}59` }}
    >
      {I ? <I className="h-3.5 w-3.5" /> : null}
      {thematique}
    </span>
  );
}

// Avoid unused import lint
void ThemeBadge;
