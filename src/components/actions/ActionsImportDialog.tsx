import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { STATUT_OPTIONS, QPV_OPTIONS, AXIS_OPTIONS, type Association } from "@/lib/actions-data";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  associations: Association[];
  onImported: () => void;
};

const NONE = "__none__";

// Action target fields available for mapping
const TARGET_FIELDS: { key: string; label: string; required?: boolean }[] = [
  { key: "titre", label: "Titre", required: true },
  { key: "association_nom", label: "Association (par nom)", required: true },
  { key: "description", label: "Description" },
  { key: "type_action", label: "Type d'action" },
  { key: "thematique", label: "Thématique" },
  { key: "statut", label: "Statut" },
  { key: "qpv_key", label: "QPV" },
  { key: "axis_key", label: "Axe" },
  { key: "date_debut", label: "Date début" },
  { key: "date_fin", label: "Date fin" },
  { key: "annee", label: "Année / Exercice" },
  { key: "budget", label: "Budget total" },
  { key: "nb_beneficiaires_prevu", label: "Bénéficiaires prévus" },
  { key: "nb_beneficiaires_reel", label: "Bénéficiaires réels" },
  { key: "lieu_principal", label: "Lieu principal" },
  { key: "recurrence", label: "Récurrence / Fréquence" },
];

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");

function autoMap(headers: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  const lookups: Record<string, string[]> = {
    titre: ["intitule", "intitulededemande", "libelledemande", "titre", "nom"],
    association_nom: ["libelledemandeur", "demandeur", "association", "asso"],
    description: ["description", "resume", "resumeaajouter"],
    type_action: ["typeaction", "type"],
    thematique: ["thematique", "thematiquedispositif", "dispositif"],
    statut: ["statut", "statutasso"],
    qpv_key: ["qpv", "quartier"],
    axis_key: ["axe"],
    date_debut: ["datedebut", "debut"],
    date_fin: ["datefin", "fin"],
    annee: ["annee", "exercice", "exercicedemande"],
    budget: ["budget", "budgettotal"],
    nb_beneficiaires_prevu: ["totalbeneficiaires", "beneficiairesprevu", "beneficiaires"],
    nb_beneficiaires_reel: ["beneficiairesreel"],
    lieu_principal: ["lieu", "lieuprincipal", "communesconcernees"],
    recurrence: ["frequence", "recurrence"],
  };
  const normedHeaders = headers.map((h) => ({ raw: h, n: norm(h) }));
  for (const f of TARGET_FIELDS) {
    const cands = lookups[f.key] ?? [];
    const found = normedHeaders.find((h) => cands.some((c) => h.n.includes(c)));
    if (found) map[f.key] = found.raw;
  }
  return map;
}

function parseDate(v: any): string | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") {
    // Excel serial date
    const d = new Date(Math.round((v - 25569) * 86400 * 1000));
    return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }
  const s = String(v).trim();
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m) {
    const [_, d, mo, y] = m;
    const yr = y.length === 2 ? "20" + y : y;
    return `${yr}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function toNumber(v: any): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/[^\d.,-]/g, "").replace(",", "."));
  return isNaN(n) ? null : n;
}

function matchOption<T extends { key: string; label: string }>(opts: readonly T[], v: any): string | null {
  if (!v) return null;
  const n = norm(String(v));
  const f = opts.find((o) => norm(o.label) === n || norm(o.key) === n || n.includes(norm(o.key)));
  return f?.key ?? null;
}

export function ActionsImportDialog({ open, onOpenChange, associations, onImported }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetName, setSheetName] = useState<string>("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);

  const reset = () => {
    setWorkbook(null); setSheetName(""); setHeaders([]); setRows([]); setMapping({});
    if (fileRef.current) fileRef.current.value = "";
  };

  const onFile = async (f: File) => {
    const buf = await f.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    setWorkbook(wb);
    const first = wb.SheetNames[0];
    setSheetName(first);
    loadSheet(wb, first);
  };

  const loadSheet = (wb: XLSX.WorkBook, name: string) => {
    const ws = wb.Sheets[name];
    const json = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: null });
    const hdrs = json.length ? Object.keys(json[0]) : [];
    setHeaders(hdrs);
    setRows(json);
    setMapping(autoMap(hdrs));
  };

  const assocByName = useMemo(() => {
    const m = new Map<string, string>();
    associations.forEach((a) => m.set(norm(a.nom), a.id));
    return m;
  }, [associations]);

  const previewCount = useMemo(() => {
    if (!mapping.titre || !mapping.association_nom) return { valid: 0, missing: 0 };
    let valid = 0, missing = 0;
    for (const r of rows) {
      const t = r[mapping.titre];
      const a = r[mapping.association_nom];
      if (!t || !a) continue;
      if (assocByName.has(norm(String(a)))) valid++; else missing++;
    }
    return { valid, missing };
  }, [rows, mapping, assocByName]);

  const runImport = async () => {
    if (!mapping.titre || !mapping.association_nom) {
      toast.error("Mappez au moins Titre et Association");
      return;
    }
    setImporting(true);
    try {
      const payload: any[] = [];
      const skipped: string[] = [];
      for (const r of rows) {
        const titre = r[mapping.titre];
        const assocName = r[mapping.association_nom];
        if (!titre || !assocName) continue;
        const assoc_id = assocByName.get(norm(String(assocName)));
        if (!assoc_id) { skipped.push(String(assocName)); continue; }

        const get = (k: string) => mapping[k] ? r[mapping[k]] : null;
        payload.push({
          titre: String(titre).slice(0, 500),
          assoc_id,
          description: get("description") ? String(get("description")) : null,
          type_action: get("type_action") ? String(get("type_action")) : null,
          thematique: get("thematique") ? String(get("thematique")) : null,
          statut: matchOption(STATUT_OPTIONS, get("statut")) ?? "planifiee",
          qpv_key: matchOption(QPV_OPTIONS, get("qpv_key")),
          axis_key: matchOption(AXIS_OPTIONS, get("axis_key")),
          date_debut: parseDate(get("date_debut")),
          date_fin: parseDate(get("date_fin")),
          annee: toNumber(get("annee")),
          budget: toNumber(get("budget")),
          nb_beneficiaires_prevu: toNumber(get("nb_beneficiaires_prevu")),
          nb_beneficiaires_reel: toNumber(get("nb_beneficiaires_reel")),
          lieu_principal: get("lieu_principal") ? String(get("lieu_principal")) : null,
          recurrence: get("recurrence") ? String(get("recurrence")) : null,
        });
      }

      if (!payload.length) { toast.error("Aucune ligne valide à importer"); setImporting(false); return; }

      // batch insert
      const chunkSize = 200;
      for (let i = 0; i < payload.length; i += chunkSize) {
        const { error } = await supabase.from("actions").insert(payload.slice(i, i + chunkSize));
        if (error) throw error;
      }

      toast.success(`${payload.length} action(s) importée(s)${skipped.length ? `, ${skipped.length} ignorée(s) (association introuvable)` : ""}`);
      onImported();
      reset();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Échec de l'import");
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importer des actions (Excel)</DialogTitle>
          <DialogDescription>
            Choisissez un fichier Excel, sélectionnez l'onglet, puis associez les colonnes aux champs des actions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Fichier Excel (.xlsx, .xls, .csv)</Label>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
              className="mt-1 block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-primary-foreground"
            />
          </div>

          {workbook && (
            <div>
              <Label>Onglet</Label>
              <Select value={sheetName} onValueChange={(v) => { setSheetName(v); loadSheet(workbook, v); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {workbook.SheetNames.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="mt-1 text-xs text-muted-foreground">{rows.length} ligne(s) détectée(s)</p>
            </div>
          )}

          {headers.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Mapping des colonnes</h3>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {TARGET_FIELDS.map((f) => (
                  <div key={f.key} className="flex flex-col gap-1">
                    <Label className="text-xs">
                      {f.label}{f.required && <span className="text-destructive"> *</span>}
                    </Label>
                    <Select
                      value={mapping[f.key] ?? NONE}
                      onValueChange={(v) => setMapping((m) => ({ ...m, [f.key]: v === NONE ? "" : v }))}
                    >
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>—</SelectItem>
                        {headers.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              <div className="rounded-md border bg-muted/30 p-3 text-sm">
                <p><strong>{previewCount.valid}</strong> ligne(s) prête(s) à être importée(s)</p>
                {previewCount.missing > 0 && (
                  <p className="text-amber-700">⚠ {previewCount.missing} ligne(s) avec association introuvable seront ignorées</p>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={importing}>Annuler</Button>
          <Button onClick={runImport} disabled={importing || !rows.length || !mapping.titre || !mapping.association_nom}>
            {importing ? "Import…" : "Importer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
