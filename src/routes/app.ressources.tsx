import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getUser } from "@/lib/auth";
import { THEMATIQUE_OPTIONS } from "@/lib/actions-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText, Link2, Plus, Trash2, ExternalLink, Search, FileImage, FileType2, File as FileIcon,
  GraduationCap, Briefcase, HeartPulse, Users, Scale, Leaf, ShieldCheck, Palette, Tag, Pencil, Layers,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/ressources")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login" });
  },
  component: RessourcesPage,
});

/* Thematiques alignées sur les actions */
const THEMATIQUES = THEMATIQUE_OPTIONS;

type ThemeStyle = { icon: LucideIcon; bg: string; fg: string; ring: string };
const THEME_STYLES: Record<string, ThemeStyle> = {
  "Education / Parentalité": { icon: GraduationCap, bg: "bg-violet-100", fg: "text-violet-700", ring: "ring-violet-200" },
  "Emploi & Développement":  { icon: Briefcase,     bg: "bg-amber-100",  fg: "text-amber-700",  ring: "ring-amber-200" },
  "Santé":                   { icon: HeartPulse,    bg: "bg-rose-100",   fg: "text-rose-700",   ring: "ring-rose-200" },
  "Cohésion sociale":        { icon: Users,         bg: "bg-sky-100",    fg: "text-sky-700",    ring: "ring-sky-200" },
  "Citoyenneté":             { icon: Scale,         bg: "bg-indigo-100", fg: "text-indigo-700", ring: "ring-indigo-200" },
  "Transition écologique":   { icon: Leaf,          bg: "bg-emerald-100",fg: "text-emerald-700",ring: "ring-emerald-200" },
  "Accès aux droits":        { icon: Scale,         bg: "bg-blue-100",   fg: "text-blue-700",   ring: "ring-blue-200" },
  "Prévention":              { icon: ShieldCheck,   bg: "bg-teal-100",   fg: "text-teal-700",   ring: "ring-teal-200" },
  "Culture":                 { icon: Palette,       bg: "bg-fuchsia-100",fg: "text-fuchsia-700",ring: "ring-fuchsia-200" },
};
const DEFAULT_STYLE: ThemeStyle = { icon: Tag, bg: "bg-muted", fg: "text-foreground", ring: "ring-border" };
const ALL_STYLE: ThemeStyle = {
  icon: Layers,
  bg: "bg-gradient-to-r from-primary/15 via-fuchsia-100 to-violet-100",
  fg: "text-primary",
  ring: "ring-primary/30",
};
const themeStyle = (t: string | null): ThemeStyle => (t && THEME_STYLES[t]) || DEFAULT_STYLE;

function ThemeBadge({ thematique }: { thematique: string | null }) {
  const isAll = thematique === "__all" || thematique === null || thematique === "";
  const label = isAll ? "Toutes les thématiques" : thematique!;
  const s = isAll ? ALL_STYLE : themeStyle(thematique);
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 self-start rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${s.bg} ${s.fg} ${s.ring}`}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

type DocRow = {
  id: string;
  titre: string;
  description: string | null;
  url: string | null;
  file_path: string | null;
  mime_type: string | null;
  file_size: number | null;
  thematique: string | null;
  type: string | null;
  visible_all: boolean;
  created_at: string;
};

function RessourcesPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const user = getUser();
  // "Modifier/supprimer" réservé au superadmin ; ajout autorisé pour admin_asso/agent.
  const canDelete = mounted && user?.role === "superadmin";
  const canEdit = mounted && user?.role === "superadmin";
  const canCreate = mounted && (user?.role === "superadmin" || user?.role === "admin_asso" || user?.role === "agent");
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [filterTheme, setFilterTheme] = useState<string>("__all");
  const [filterKind, setFilterKind] = useState<"all" | "file" | "link">("all");
  const [openCreate, setOpenCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<DocRow | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<DocRow | null>(null);

  const docsQ = useQuery({
    queryKey: ["ressources"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("id, titre, description, url, file_path, mime_type, file_size, thematique, type, visible_all, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DocRow[];
    },
  });

  const all = docsQ.data ?? [];
  const totalDocs = useMemo(() => all.filter((d) => !!d.file_path).length, [all]);
  const totalLinks = useMemo(() => all.filter((d) => !!d.url && !d.file_path).length, [all]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter((d) => {
      if (filterTheme !== "__all" && (d.thematique ?? "") !== filterTheme) return false;
      const isLink = !!d.url && !d.file_path;
      if (filterKind === "file" && isLink) return false;
      if (filterKind === "link" && !isLink) return false;
      if (q && !`${d.titre} ${d.description ?? ""} ${d.thematique ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [all, search, filterTheme, filterKind]);

  const delMut = useMutation({
    mutationFn: async (row: DocRow) => {
      if (row.file_path) {
        await supabase.storage.from("documents").remove([row.file_path]);
      }
      const { error } = await supabase.from("documents").delete().eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ressource supprimée");
      qc.invalidateQueries({ queryKey: ["ressources"] });
    },
    onError: (e: unknown) => toast.error("Suppression impossible : " + (e instanceof Error ? e.message : String(e))),
  });

  return (
    <div className="h-full overflow-y-auto p-6 pb-20">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Centre de Ressources</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Documents, guides et liens utiles pour piloter le Contrat de Ville.
            </p>
          </div>
          {canCreate && (
            <Button onClick={() => setOpenCreate(true)} size="lg" className="shadow-md">
              <Plus className="mr-2 h-4 w-4" /> Ajouter une ressource
            </Button>
          )}
        </div>

        {/* Counters */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <CounterCard icon={<FileText className="h-5 w-5" />} label="Documents" value={totalDocs} tone="from-primary/15 to-primary/0 text-primary" />
          <CounterCard icon={<Link2 className="h-5 w-5" />} label="Liens" value={totalLinks} tone="from-emerald-500/15 to-transparent text-emerald-600" />
          <CounterCard icon={<Tag className="h-5 w-5" />} label="Total" value={all.length} tone="from-fuchsia-500/15 to-transparent text-fuchsia-600" />
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher une ressource…"
              className="pl-9"
            />
          </div>
          <Select value={filterTheme} onValueChange={setFilterTheme}>
            <SelectTrigger className="w-[220px]"><SelectValue placeholder="Thématique" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">Toutes les thématiques</SelectItem>
              {THEMATIQUES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Tabs value={filterKind} onValueChange={(v) => setFilterKind(v as typeof filterKind)}>
            <TabsList>
              <TabsTrigger value="all">Tous</TabsTrigger>
              <TabsTrigger value="file"><FileText className="mr-1 h-3.5 w-3.5" /> Documents</TabsTrigger>
              <TabsTrigger value="link"><Link2 className="mr-1 h-3.5 w-3.5" /> Liens</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Grid */}
        {docsQ.isLoading ? (
          <p className="text-muted-foreground">Chargement…</p>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
            <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Aucune ressource pour le moment.</p>
            {canCreate && (
              <Button variant="outline" className="mt-4" onClick={() => setOpenCreate(true)}>
                <Plus className="mr-2 h-4 w-4" /> Ajouter la première ressource
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((d) => (
              <ResourceCard
                key={d.id}
                doc={d}
                canDelete={canDelete}
                canEdit={canEdit}
                onDelete={() => setConfirmDelete(d)}
                onEdit={() => setEditTarget(d)}
              />
            ))}
          </div>
        )}
      </div>

      <CreateResourceDialog
        open={openCreate}
        onOpenChange={setOpenCreate}
        onCreated={() => qc.invalidateQueries({ queryKey: ["ressources"] })}
      />

      <EditResourceDialog
        target={editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={() => qc.invalidateQueries({ queryKey: ["ressources"] })}
      />

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette ressource ?</AlertDialogTitle>
            <AlertDialogDescription>
              « {confirmDelete?.titre} » sera retirée définitivement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (confirmDelete) delMut.mutate(confirmDelete); setConfirmDelete(null); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CounterCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: string }) {
  return (
    <div className={`relative overflow-hidden rounded-xl border border-border bg-card p-4 shadow-sm`}>
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${tone} opacity-60`} />
      <div className="relative flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-background/80 shadow-sm">
          {icon}
        </div>
        <div>
          <div className="text-2xl font-bold leading-none">{value}</div>
          <div className="mt-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Card ---------------- */

function ResourceCard({ doc, canDelete, canEdit, onDelete, onEdit }: { doc: DocRow; canDelete: boolean; canEdit: boolean; onDelete: () => void; onEdit: () => void }) {
  const isLink = !!doc.url && !doc.file_path;
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  const open = async () => {
    if (isLink) {
      if (doc.url) window.open(doc.url, "_blank", "noopener,noreferrer");
      return;
    }
    if (signedUrl) {
      window.open(signedUrl, "_blank", "noopener,noreferrer");
      return;
    }
    if (!doc.file_path) { toast.error("Fichier indisponible"); return; }
    const { data, error } = await supabase.storage.from("documents").createSignedUrl(doc.file_path, 3600);
    if (error || !data) { toast.error("Lien indisponible"); return; }
    setSignedUrl(data.signedUrl);
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const mime = doc.mime_type ?? "";
  const isPdf = mime.includes("pdf");
  const isImg = mime.startsWith("image/");
  const sizeKb = doc.file_size ? Math.round(doc.file_size / 1024) : null;
  const host = isLink && doc.url ? safeHost(doc.url) : null;

  return (
    <article
      onClick={open}
      className="group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-xl"
    >
      {/* Preview */}
      <div className="relative h-40 overflow-hidden bg-gradient-to-br from-muted to-muted/40">
        {isLink ? (
          <LinkPreview host={host ?? ""} />
        ) : isImg && doc.file_path ? (
          <SignedImage path={doc.file_path} alt={doc.titre} />
        ) : isPdf ? (
          <div className="flex h-full items-center justify-center">
            <div className="rounded-xl bg-background/70 p-4 shadow-sm backdrop-blur">
              <FileType2 className="h-12 w-12 text-rose-500" />
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <FileIcon className="h-12 w-12 text-muted-foreground/60" />
          </div>
        )}

        {/* Kind badge */}
        <div className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-background/90 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-foreground shadow-sm backdrop-blur">
          {isLink ? <><Link2 className="h-3 w-3" /> Lien</>
            : isPdf ? <><FileType2 className="h-3 w-3 text-rose-500" /> PDF</>
            : isImg ? <><FileImage className="h-3 w-3 text-violet-500" /> Image</>
            : <><FileText className="h-3 w-3" /> Fichier</>}
        </div>

        {/* Theme badge — always visible overlay */}
        {doc.thematique && (
          <div className="absolute bottom-3 left-3">
            <ThemeBadge thematique={doc.thematique} />
          </div>
        )}

        {(canEdit || canDelete) && (
          <div className="absolute right-3 top-3 flex gap-1.5 opacity-0 transition group-hover:opacity-100">
            {canEdit && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                className="inline-flex items-center justify-center rounded-full bg-background/90 p-1.5 text-muted-foreground shadow-sm backdrop-blur transition hover:text-primary"
                aria-label="Modifier"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="inline-flex items-center justify-center rounded-full bg-background/90 p-1.5 text-muted-foreground shadow-sm backdrop-blur transition hover:text-destructive"
                aria-label="Supprimer"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 text-base font-semibold leading-tight">{doc.titre}</h3>
        {doc.description && (
          <p className="line-clamp-2 text-sm text-muted-foreground">{doc.description}</p>
        )}
        <div className="mt-auto flex items-center justify-between pt-2 text-xs text-muted-foreground">
          <span className="truncate">
            {isLink ? host : sizeKb ? `${sizeKb} Ko` : ""}
          </span>
          <span className="inline-flex items-center gap-1 font-medium text-primary opacity-0 transition group-hover:opacity-100">
            Ouvrir <ExternalLink className="h-3 w-3" />
          </span>
        </div>
      </div>
    </article>
  );
}

function safeHost(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
}

function LinkPreview({ host }: { host: string }) {
  const initial = (host?.[0] ?? "?").toUpperCase();
  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/15 via-primary/5 to-transparent">
      <div className="flex flex-col items-center gap-2">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-background text-2xl font-bold text-primary shadow-md">
          {initial}
        </div>
        <span className="text-xs font-medium text-muted-foreground">{host}</span>
      </div>
    </div>
  );
}

function SignedImage({ path, alt }: { path: string; alt: string }) {
  const q = useQuery({
    queryKey: ["signed-img", path],
    queryFn: async () => {
      const { data } = await supabase.storage.from("documents").createSignedUrl(path, 3600);
      return data?.signedUrl ?? null;
    },
    staleTime: 50 * 60 * 1000,
  });
  if (!q.data) return <div className="flex h-full items-center justify-center"><FileImage className="h-10 w-10 text-muted-foreground/50" /></div>;
  return <img src={q.data} alt={alt} className="h-full w-full object-cover" loading="lazy" />;
}

/* ---------------- Create dialog ---------------- */

function CreateResourceDialog({
  open, onOpenChange, onCreated,
}: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: () => void }) {
  const user = getUser();
  const [kind, setKind] = useState<"file" | "link">("file");
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [thematique, setThematique] = useState<string>(THEMATIQUES[0]);
  const [url, setUrl] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const reset = () => {
    setKind("file"); setTitre(""); setDescription(""); setThematique(THEMATIQUES[0]);
    setUrl(""); setFiles([]); setProgress(null);
  };

  const submit = async () => {
    if (kind === "link") {
      if (!titre.trim()) { toast.error("Le titre est requis"); return; }
      if (!url.trim()) { toast.error("L'URL est requise"); return; }
    } else {
      if (files.length === 0) { toast.error("Sélectionnez au moins un fichier"); return; }
      if (files.length === 1 && !titre.trim()) { toast.error("Le titre est requis"); return; }
    }

    setSaving(true);
    try {
      const folder = user?.assocId ?? "shared";
      const themaToSave = thematique === "__all" ? null : thematique;

      if (kind === "link") {
        const { error } = await supabase.from("documents").insert({
          titre: titre.trim(),
          description: description.trim() || null,
          thematique: themaToSave,
          type: "link",
          url: url.trim(),
          file_path: null,
          mime_type: null,
          file_size: null,
          assoc_id: user?.assocId ?? null,
          visible_all: true,
        });
        if (error) throw error;
        toast.success("Lien ajouté");
      } else {
        setProgress({ done: 0, total: files.length });
        let i = 0;
        for (const file of files) {
          const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "_");
          const file_path = `${folder}/${Date.now()}_${i}_${safeName}`;
          const { error: upErr } = await supabase.storage.from("documents").upload(file_path, file, { upsert: false });
          if (upErr) throw upErr;
          const baseTitle = files.length === 1 ? titre.trim() : (titre.trim() || file.name.replace(/\.[^.]+$/, ""));
          const { error } = await supabase.from("documents").insert({
            titre: baseTitle,
            description: description.trim() || null,
            thematique: themaToSave,
            type: "file",
            url: null,
            file_path,
            mime_type: file.type || null,
            file_size: file.size,
            assoc_id: user?.assocId ?? null,
            visible_all: true,
          });
          if (error) throw error;
          i++;
          setProgress({ done: i, total: files.length });
        }
        toast.success(`${files.length} ressource(s) ajoutée(s)`);
      }
      reset();
      onOpenChange(false);
      onCreated();
    } catch (e) {
      toast.error("Échec : " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSaving(false);
      setProgress(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ajouter une ressource</DialogTitle>
          <DialogDescription>Document(s) (PDF, image…) ou lien externe.</DialogDescription>
        </DialogHeader>

        <Tabs value={kind} onValueChange={(v) => setKind(v as "file" | "link")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="file"><FileText className="mr-2 h-4 w-4" /> Document(s)</TabsTrigger>
            <TabsTrigger value="link"><Link2 className="mr-2 h-4 w-4" /> Lien</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="space-y-3">
          <div>
            <Label htmlFor="r-titre">Titre {kind === "link" || files.length <= 1 ? "*" : "(optionnel — nom du fichier sinon)"}</Label>
            <Input id="r-titre" value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Ex. Guide du Référentiel Qualité" />
          </div>
          <div>
            <Label htmlFor="r-desc">Description</Label>
            <Textarea id="r-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <Label>Thématique</Label>
            <Select value={thematique} onValueChange={setThematique}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">Toutes les thématiques</SelectItem>
                {THEMATIQUES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="mt-2"><ThemeBadge thematique={thematique === "__all" ? null : thematique} /></div>
          </div>
          {kind === "link" ? (
            <div>
              <Label htmlFor="r-url">URL *</Label>
              <Input id="r-url" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
            </div>
          ) : (
            <div>
              <Label htmlFor="r-file">Fichier(s) * — sélection multiple possible</Label>
              <Input
                id="r-file"
                type="file"
                multiple
                accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
                onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
              />
              {files.length > 0 && (
                <ul className="mt-2 max-h-32 overflow-y-auto rounded-md border border-border bg-muted/30 p-2 text-xs">
                  {files.map((f, idx) => (
                    <li key={idx} className="flex items-center justify-between gap-2 py-0.5">
                      <span className="truncate">{f.name}</span>
                      <span className="shrink-0 text-muted-foreground">{Math.round(f.size / 1024)} Ko</span>
                    </li>
                  ))}
                </ul>
              )}
              {progress && (
                <p className="mt-2 text-xs text-muted-foreground">Envoi {progress.done}/{progress.total}…</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Annuler</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Enregistrement…" : "Ajouter"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Edit dialog (superadmin) ---------------- */

function EditResourceDialog({
  target, onClose, onSaved,
}: { target: DocRow | null; onClose: () => void; onSaved: () => void }) {
  const open = !!target;
  const isLink = !!target?.url && !target?.file_path;
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [thematique, setThematique] = useState<string>(THEMATIQUES[0]);
  const [url, setUrl] = useState("");
  const [replaceFile, setReplaceFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (target) {
      setTitre(target.titre ?? "");
      setDescription(target.description ?? "");
      setThematique(target.thematique && THEMATIQUES.includes(target.thematique as typeof THEMATIQUES[number]) ? target.thematique : "__all");
      setUrl(target.url ?? "");
      setReplaceFile(null);
    }
  }, [target]);

  const submit = async () => {
    if (!target) return;
    if (!titre.trim()) { toast.error("Le titre est requis"); return; }
    if (isLink && !url.trim()) { toast.error("L'URL est requise"); return; }
    setSaving(true);
    try {
      let file_path = target.file_path;
      let mime_type = target.mime_type;
      let file_size = target.file_size;
      if (!isLink && replaceFile) {
        const safeName = replaceFile.name.replace(/[^a-zA-Z0-9._-]+/g, "_");
        const folder = target.file_path?.split("/")[0] ?? "shared";
        const newPath = `${folder}/${Date.now()}_${safeName}`;
        const { error: upErr } = await supabase.storage.from("documents").upload(newPath, replaceFile, { upsert: false });
        if (upErr) throw upErr;
        if (target.file_path) {
          await supabase.storage.from("documents").remove([target.file_path]);
        }
        file_path = newPath;
        mime_type = replaceFile.type || null;
        file_size = replaceFile.size;
      }
      const { error } = await supabase.from("documents").update({
        titre: titre.trim(),
        description: description.trim() || null,
        thematique: thematique === "__all" ? null : thematique,
        url: isLink ? url.trim() : null,
        file_path,
        mime_type,
        file_size,
      }).eq("id", target.id);
      if (error) throw error;
      toast.success("Ressource mise à jour");
      onClose();
      onSaved();
    } catch (e) {
      toast.error("Échec : " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Modifier la ressource</DialogTitle>
          <DialogDescription>Édition réservée au super administrateur.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="e-titre">Titre *</Label>
            <Input id="e-titre" value={titre} onChange={(e) => setTitre(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="e-desc">Description</Label>
            <Textarea id="e-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <Label>Thématique</Label>
            <Select value={thematique} onValueChange={setThematique}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">Toutes les thématiques</SelectItem>
                {THEMATIQUES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="mt-2"><ThemeBadge thematique={thematique === "__all" ? null : thematique} /></div>
          </div>
          {isLink ? (
            <div>
              <Label htmlFor="e-url">URL *</Label>
              <Input id="e-url" type="url" value={url} onChange={(e) => setUrl(e.target.value)} />
            </div>
          ) : (
            <div>
              <Label htmlFor="e-file">Remplacer le fichier (optionnel)</Label>
              <Input
                id="e-file"
                type="file"
                accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
                onChange={(e) => setReplaceFile(e.target.files?.[0] ?? null)}
              />
              {replaceFile && (
                <p className="mt-1 text-xs text-muted-foreground">{replaceFile.name} · {Math.round(replaceFile.size / 1024)} Ko</p>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Annuler</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
