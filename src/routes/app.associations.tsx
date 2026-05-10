import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Plus, Pencil, Trash2, Eye, EyeOff, Copy } from "lucide-react";
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
  const user = getUser();
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Associations</h1>
          <p className="text-sm text-muted-foreground">Gestion des associations partenaires</p>
        </div>
        <div className="flex gap-2">
          {isSuper && (
            <Button variant="outline" size="sm" onClick={() => setShowAllPwd(v => !v)}>
              {showAllPwd ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
              {showAllPwd ? "Masquer mots de passe" : "Afficher mots de passe"}
            </Button>
          )}
          {isSuper && (
            <Button onClick={() => { setEditing(null); setOpen(true); }}>
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
                <th className="px-3 py-2">Commune / QPV</th>
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
                    <td className="px-3 py-2 text-xs text-muted-foreground">Compte global</td>
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
              {(q.data ?? []).map((a) => {
                const visible = showAllPwd || shown[a.id];
                return (
                  <tr key={a.id} className="border-t">
                    <td className="px-3 py-2 font-medium">{a.nom}</td>
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Modifier l'association" : "Nouvelle association"}</DialogTitle>
          <DialogDescription>Informations générales et identifiants</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nom *</Label>
            <Input value={nom} onChange={(e) => setNom(e.target.value)} />
          </div>
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
