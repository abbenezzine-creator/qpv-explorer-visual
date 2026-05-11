import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { getUser } from "@/lib/auth";
import { QPV_OPTIONS, type Association } from "@/lib/actions-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Eye, EyeOff, Copy, Upload } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/associations")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login" });
  },
  component: AssociationsPage,
});

type Row = Association;

function AssociationsPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const user = mounted ? getUser() : null;
  const isSuper = user?.role === "superadmin";
  const qc = useQueryClient();
  const [showAllPwd, setShowAllPwd] = useState(false);
  const [shown, setShown] = useState<Record<string, boolean>>({});

  const q = useQuery({ queryKey: ["associations-full"], queryFn: async () => {
    const { data, error } = await supabase.from("associations").select("*").order("nom");
    if (error) throw error;
    return (data ?? []) as Row[];
  }});

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);

  const remove = async (id: string) => {
    if (!confirm("Supprimer cette association ?")) return;
    const { error } = await supabase.from("associations").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Supprimée");
    qc.invalidateQueries({ queryKey: ["associations-full"] });
    qc.invalidateQueries({ queryKey: ["associations"] });
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success("Copié"));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Associations</h1>
          <p className="text-sm text-muted-foreground">Gestion des associations partenaires</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {mounted && isSuper && (
            <Button variant="outline" size="sm" onClick={() => setShowAllPwd(v => !v)}>
              {showAllPwd ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
              {showAllPwd ? "Masquer mots de passe" : "Afficher mots de passe"}
            </Button>
          )}
          {mounted && isSuper && (
            <ImportButton existing={q.data ?? []} onDone={() => {
              qc.invalidateQueries({ queryKey: ["associations-full"] });
              qc.invalidateQueries({ queryKey: ["associations"] });
            }} />
          )}
          {mounted && isSuper && (
            <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Ajouter
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-md border bg-card overflow-x-auto">
        {q.isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">Chargement…</div>
        ) : (q.data ?? []).length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">Aucune association.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Nom</th>
                <th className="px-3 py-2">Contact</th>
                <th className="px-3 py-2">Adresse</th>
                <th className="px-3 py-2">CP / Ville</th>
                <th className="px-3 py-2">QPV</th>
                {isSuper && <th className="px-3 py-2">Identifiant</th>}
                {isSuper && <th className="px-3 py-2">Mot de passe</th>}
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isSuper && (() => {
                const visible = showAllPwd || shown["__super__"];
                const pwd = "Superadmin45";
                return (
                  <tr className="border-t bg-amber-50/40 dark:bg-amber-950/20">
                    <td className="px-3 py-2 font-medium">Super Administrateur</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground" colSpan={4}>Compte global</td>
                    <td className="px-3 py-2 font-mono text-xs">
                      <span className="inline-flex items-center gap-1">
                        Abdelhak
                        <button onClick={() => copy("Abdelhak")} title="Copier"><Copy className="h-3 w-3 text-muted-foreground hover:text-foreground" /></button>
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      <span className="inline-flex items-center gap-1">
                        {visible ? pwd : "••••••••"}
                        <button onClick={() => setShown(s => ({ ...s, __super__: !s.__super__ }))} title={visible ? "Masquer" : "Afficher"}>
                          {visible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </button>
                        <button onClick={() => copy(pwd)} title="Copier"><Copy className="h-3 w-3 text-muted-foreground hover:text-foreground" /></button>
                      </span>
                    </td>
                    <td className="px-3 py-2"></td>
                  </tr>
                );
              })()}
              {isSuper && (
                <PartenaireRow
                  visible={showAllPwd || !!shown["__partenaire__"]}
                  onToggle={() => setShown(s => ({ ...s, __partenaire__: !s.__partenaire__ }))}
                  onCopy={copy}
                />
              )}
              {(q.data ?? []).map((a) => {
                const visible = showAllPwd || shown[a.id];
                return (
                  <tr key={a.id} className="border-t">
                    <td className="px-3 py-2 font-medium">{a.nom}</td>
                    <td className="px-3 py-2 text-xs">
                      {a.contact_nom ? (
                        <div>
                          <div>{a.contact_nom}</div>
                          {a.statut_contact && <div className="text-muted-foreground">{a.statut_contact}</div>}
                        </div>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-3 py-2 text-xs whitespace-pre-line">{a.adresse || <span className="text-muted-foreground">—</span>}</td>
                    <td className="px-3 py-2 text-xs">
                      {[a.code_postal, a.ville].filter(Boolean).join(" ") || <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {[a.commune, a.qpv_key].filter(Boolean).join(" · ") || "—"}
                    </td>
                    {isSuper && (
                      <td className="px-3 py-2 font-mono text-xs">
                        {a.login ? (
                          <span className="inline-flex items-center gap-1">
                            {a.login}
                            <button onClick={() => copy(a.login!)} title="Copier"><Copy className="h-3 w-3 text-muted-foreground hover:text-foreground" /></button>
                          </span>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                    )}
                    {isSuper && (
                      <td className="px-3 py-2 font-mono text-xs">
                        {a.password ? (
                          <span className="inline-flex items-center gap-1">
                            {visible ? a.password : "••••••••"}
                            <button onClick={() => setShown(s => ({ ...s, [a.id]: !s[a.id] }))} title={visible ? "Masquer" : "Afficher"}>
                              {visible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                            </button>
                            <button onClick={() => copy(a.password!)} title="Copier"><Copy className="h-3 w-3 text-muted-foreground hover:text-foreground" /></button>
                          </span>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                    )}
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-1">
                        {isSuper && (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => { setEditing(a); setOpen(true); }}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => remove(a.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <AssocDialog
        open={open}
        onOpenChange={setOpen}
        initial={editing}
        isSuper={isSuper}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["associations-full"] });
          qc.invalidateQueries({ queryKey: ["associations"] });
        }}
      />
    </div>
  );
}

function AssocDialog({
  open, onOpenChange, initial, isSuper, onSaved,
}: {
  open: boolean; onOpenChange: (v: boolean) => void; initial: Row | null; isSuper: boolean; onSaved: () => void;
}) {
  const [nom, setNom] = useState("");
  const [commune, setCommune] = useState("");
  const [qpv, setQpv] = useState("");
  const [desc, setDesc] = useState("");
  const [statutContact, setStatutContact] = useState("");
  const [contactNom, setContactNom] = useState("");
  const [adresse, setAdresse] = useState("");
  const [codePostal, setCodePostal] = useState("");
  const [ville, setVille] = useState("");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNom(initial?.nom ?? "");
    setCommune(initial?.commune ?? "");
    setQpv(initial?.qpv_key ?? "");
    setDesc(initial?.description ?? "");
    setStatutContact(initial?.statut_contact ?? "");
    setContactNom(initial?.contact_nom ?? "");
    setAdresse(initial?.adresse ?? "");
    setCodePostal(initial?.code_postal ?? "");
    setVille(initial?.ville ?? "");
    setLogin(initial?.login ?? "");
    setPassword(initial?.password ?? "");
    setShowPwd(false);
  }, [open, initial]);

  const save = async () => {
    if (!nom.trim()) return toast.error("Nom requis");
    setSaving(true);
    const base = {
      nom: nom.trim(),
      commune: commune || null,
      qpv_key: qpv || null,
      description: desc || null,
      statut_contact: statutContact || null,
      contact_nom: contactNom || null,
      adresse: adresse || null,
      code_postal: codePostal || null,
      ville: ville || null,
    };
    const finalLogin = (login.trim() || nom.trim());
    const finalPwd = (password || `${nom.trim()}2025`);
    const payload = isSuper
      ? { ...base, login: finalLogin, password: finalPwd }
      : base;
    const res = initial
      ? await supabase.from("associations").update(payload).eq("id", initial.id)
      : await supabase.from("associations").insert(payload);
    setSaving(false);
    if (res.error) return toast.error(res.error.message);
    toast.success(initial ? "Mise à jour" : "Créée");
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Modifier l'association" : "Nouvelle association"}</DialogTitle>
          <DialogDescription>Informations générales, contact et identifiants</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nom *</Label>
            <Input value={nom} onChange={(e) => setNom(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Statut / civilité du contact</Label>
              <Input value={statutContact} onChange={(e) => setStatutContact(e.target.value)} placeholder="Madame la Présidente" />
            </div>
            <div>
              <Label>Nom et prénom du contact</Label>
              <Input value={contactNom} onChange={(e) => setContactNom(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Adresse</Label>
            <Textarea rows={2} value={adresse} onChange={(e) => setAdresse(e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Code postal</Label>
              <Input value={codePostal} onChange={(e) => setCodePostal(e.target.value)} />
            </div>
            <div className="col-span-2">
              <Label>Ville</Label>
              <Input value={ville} onChange={(e) => setVille(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Commune</Label>
              <Input value={commune} onChange={(e) => setCommune(e.target.value)} />
            </div>
            <div>
              <Label>QPV</Label>
              <Select value={qpv} onValueChange={setQpv}>
                <SelectTrigger><SelectValue placeholder="Aucun" /></SelectTrigger>
                <SelectContent>
                  {QPV_OPTIONS.map((o) => <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} />
          </div>
          {isSuper && (
            <>
              <div className="border-t pt-3">
                <Label>Identifiant de connexion</Label>
                <Input value={login} onChange={(e) => setLogin(e.target.value)} placeholder="ex : asso-orleans" />
              </div>
              <div>
                <Label>Mot de passe</Label>
                <div className="flex gap-2">
                  <Input
                    type={showPwd ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mot de passe"
                  />
                  <Button type="button" variant="outline" size="icon" onClick={() => setShowPwd(v => !v)}>
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============== IMPORT ==============

type ImportRow = {
  nom: string;
  statut_contact: string | null;
  contact_nom: string | null;
  adresse: string | null;
  code_postal: string | null;
  ville: string | null;
};

function normalizeKey(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
}

const COLUMN_MAP: Record<string, keyof ImportRow> = {
  demandeur: "nom", nom: "nom", association: "nom", nomassociation: "nom",
  statut: "statut_contact", civilite: "statut_contact",
  nometprenom: "contact_nom", contact: "contact_nom", nomprenom: "contact_nom",
  adresse: "adresse",
  codepostal: "code_postal", cp: "code_postal",
  ville: "ville",
};

function parseFile(file: File): Promise<ImportRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const wb = XLSX.read(data, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
        const rows: ImportRow[] = [];
        for (const r of json) {
          const norm: Partial<ImportRow> = {};
          for (const [k, v] of Object.entries(r)) {
            const target = COLUMN_MAP[normalizeKey(k)];
            if (target) {
              const val = String(v ?? "").trim();
              (norm as Record<string, string | null>)[target] = val || null;
            }
          }
          if (norm.nom && String(norm.nom).trim()) {
            rows.push({
              nom: String(norm.nom).trim(),
              statut_contact: norm.statut_contact ?? null,
              contact_nom: norm.contact_nom ?? null,
              adresse: norm.adresse ?? null,
              code_postal: norm.code_postal ?? null,
              ville: norm.ville ?? null,
            });
          }
        }
        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsBinaryString(file);
  });
}

function ImportButton({ existing, onDone }: { existing: Row[]; onDone: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<{ rows: ImportRow[]; dups: ImportRow[]; news: ImportRow[] } | null>(null);
  const [busy, setBusy] = useState(false);

  const handleFile = async (file: File) => {
    try {
      const rows = await parseFile(file);
      if (rows.length === 0) {
        toast.error("Aucune ligne valide trouvée. Vérifiez la colonne 'Demandeur' ou 'Nom'.");
        return;
      }
      // dédoublonnage interne sur le fichier (garde la dernière)
      const map = new Map<string, ImportRow>();
      for (const r of rows) map.set(normalizeKey(r.nom), r);
      const unique = [...map.values()];
      const existingKeys = new Set(existing.map(a => normalizeKey(a.nom)));
      const dups = unique.filter(r => existingKeys.has(normalizeKey(r.nom)));
      const news = unique.filter(r => !existingKeys.has(normalizeKey(r.nom)));
      setPreview({ rows: unique, dups, news });
    } catch (err) {
      toast.error("Lecture impossible : " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const apply = async (replaceDups: boolean) => {
    if (!preview) return;
    setBusy(true);
    let inserted = 0, updated = 0, skipped = 0;
    try {
      // Inserts
      if (preview.news.length > 0) {
        const payload = preview.news.map(r => ({
          nom: r.nom,
          statut_contact: r.statut_contact,
          contact_nom: r.contact_nom,
          adresse: r.adresse,
          code_postal: r.code_postal,
          ville: r.ville,
          login: r.nom,
          password: `${r.nom}2025`,
        }));
        const { error } = await supabase.from("associations").insert(payload);
        if (error) throw error;
        inserted = payload.length;
      }
      // Updates
      if (replaceDups && preview.dups.length > 0) {
        const byKey = new Map(existing.map(a => [normalizeKey(a.nom), a]));
        for (const r of preview.dups) {
          const target = byKey.get(normalizeKey(r.nom));
          if (!target) continue;
          // Login/password JAMAIS écrasés
          const { error } = await supabase.from("associations").update({
            statut_contact: r.statut_contact,
            contact_nom: r.contact_nom,
            adresse: r.adresse,
            code_postal: r.code_postal,
            ville: r.ville,
          }).eq("id", target.id);
          if (error) throw error;
          updated++;
        }
      } else {
        skipped = preview.dups.length;
      }
      toast.success(`Import OK — ${inserted} ajoutée(s), ${updated} mise(s) à jour, ${skipped} ignorée(s)`);
      setPreview(null);
      onDone();
    } catch (err) {
      toast.error("Erreur : " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
      <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
        <Upload className="h-4 w-4 mr-1" /> Importer
      </Button>

      <Dialog open={!!preview} onOpenChange={(v) => { if (!v) setPreview(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aperçu de l'import</DialogTitle>
            <DialogDescription>
              {preview && (
                <>
                  <strong>{preview.rows.length}</strong> ligne(s) lue(s) — <strong>{preview.news.length}</strong> nouvelle(s), <strong>{preview.dups.length}</strong> doublon(s) détecté(s) sur le nom.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {preview && preview.dups.length > 0 && (
            <div className="text-sm bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded p-3 space-y-1 max-h-40 overflow-y-auto">
              <div className="font-medium">Doublons :</div>
              {preview.dups.slice(0, 10).map((r, i) => <div key={i}>• {r.nom}</div>)}
              {preview.dups.length > 10 && <div className="text-xs text-muted-foreground">… et {preview.dups.length - 10} de plus</div>}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            ℹ️ Les identifiants et mots de passe existants ne seront jamais écrasés par l'import.
          </p>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setPreview(null)} disabled={busy}>Annuler</Button>
            {preview && preview.dups.length > 0 && (
              <Button variant="secondary" onClick={() => apply(false)} disabled={busy}>
                Ignorer les doublons ({preview.news.length} ajout)
              </Button>
            )}
            <Button onClick={() => apply(true)} disabled={busy}>
              {busy ? "Import…" : preview && preview.dups.length > 0 ? `Remplacer doublons + ajouter (${preview.rows.length})` : `Importer (${preview?.news.length ?? 0})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function PartenaireRow({ visible, onToggle, onCopy }: { visible: boolean; onToggle: () => void; onCopy: (s: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<{ email: string; password: string } | null>(null);

  const provision = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("setup-partenaire");
      if (error) throw error;
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
      const d = data as { email: string; password: string; created: boolean };
      setInfo({ email: d.email, password: d.password });
      toast.success(d.created ? "Compte Partenaire créé" : "Compte Partenaire actualisé");
    } catch (e) {
      toast.error("Erreur : " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setBusy(false);
    }
  };

  const email = info?.email ?? "partenaire@associoboard.app";
  const pwd = info?.password ?? "Partenaire2025";

  return (
    <tr className="border-t bg-sky-50/40 dark:bg-sky-950/20">
      <td className="px-3 py-2 font-medium">Partenaire</td>
      <td className="px-3 py-2 text-xs text-muted-foreground" colSpan={4}>Compte global · lecture seule</td>
      <td className="px-3 py-2 font-mono text-xs">
        <span className="inline-flex items-center gap-1">
          {email}
          <button onClick={() => onCopy(email)} title="Copier"><Copy className="h-3 w-3 text-muted-foreground hover:text-foreground" /></button>
        </span>
      </td>
      <td className="px-3 py-2 font-mono text-xs">
        <span className="inline-flex items-center gap-1">
          {visible ? pwd : "••••••••"}
          <button onClick={onToggle} title={visible ? "Masquer" : "Afficher"}>
            {visible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          </button>
          <button onClick={() => onCopy(pwd)} title="Copier"><Copy className="h-3 w-3 text-muted-foreground hover:text-foreground" /></button>
        </span>
      </td>
      <td className="px-3 py-2 text-right">
        <Button size="sm" variant="outline" onClick={provision} disabled={busy}>
          {busy ? "…" : info ? "Réinitialiser" : "Activer"}
        </Button>
      </td>
    </tr>
  );
}
