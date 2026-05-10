import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { STATUT_OPTIONS, QPV_OPTIONS, AXIS_OPTIONS, type Association } from "@/lib/actions-data";
import { IdCard, CalendarClock, Users, MapPin, Target, Wallet } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  associations: Association[];
  onImported: () => void;
};

const NONE = "__none__";

type FieldDef = { key: string; label: string; required?: boolean };
type Section = { id: string; label: string; icon: any; color: string; fields: FieldDef[] };

const SECTIONS: Section[] = [
  {
    id: "identification", label: "Identification", icon: IdCard, color: "text-blue-600",
    fields: [
      { key: "ref", label: "Réf. interne (clé budget)" },
      { key: "reference_administrative", label: "Réf. administrative" },
      { key: "titre", label: "Titre", required: true },
      { key: "association_nom", label: "Association (par nom)", required: true },
      { key: "type_action", label: "Type d'action" },
      { key: "annee", label: "Année / Exercice" },
    ],
  },
  {
    id: "deroule", label: "Déroulé", icon: CalendarClock, color: "text-amber-600",
    fields: [
      { key: "date_debut", label: "Date début" },
      { key: "date_fin", label: "Date fin" },
      { key: "recurrence", label: "Récurrence / Fréquence" },
    ],
  },
  {
    id: "public", label: "Public", icon: Users, color: "text-emerald-600",
    fields: [
      { key: "nb_beneficiaires_prevu", label: "Bénéficiaires prévus" },
      { key: "nb_beneficiaires_reel", label: "Bénéficiaires réels" },
    ],
  },
  {
    id: "localisation", label: "Localisation", icon: MapPin, color: "text-rose-600",
    fields: [
      { key: "commune", label: "Commune" },
      { key: "lieu_principal", label: "Lieu principal" },
      { key: "qpv_key", label: "QPV" },
    ],
  },
  {
    id: "qualification", label: "Qualification", icon: Target, color: "text-violet-600",
    fields: [
      { key: "thematique", label: "Thématique" },
      { key: "axis_key", label: "Axe" },
      { key: "description", label: "Description" },
      { key: "objectifs", label: "Objectifs" },
      { key: "statut", label: "Statut" },
    ],
  },
];

const ALL_FIELDS: FieldDef[] = SECTIONS.flatMap((s) => s.fields);

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");

function autoMap(headers: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  const lookups: Record<string, string[]> = {
    ref: ["ref", "refinterne", "reference", "codeaction"],
    reference_administrative: ["referenceadministrative", "refadmin", "refadministrative"],
    titre: ["intitule", "intitulededemande", "libelledemande", "titre", "nom"],
    association_nom: ["libelledemandeur", "demandeur", "association", "asso"],
    description: ["description", "resume"],
    objectifs: ["objectifs", "objectif"],
    type_action: ["typeaction", "type"],
    thematique: ["thematique", "thematiquedispositif", "dispositif"],
    statut: ["statut", "statutasso"],
    qpv_key: ["qpv", "quartier"],
    axis_key: ["axe"],
    date_debut: ["datedebut", "debut"],
    date_fin: ["datefin", "fin"],
    annee: ["annee", "exercice", "exercicedemande"],
    nb_beneficiaires_prevu: ["totalbeneficiaires", "beneficiairesprevu", "beneficiaires"],
    nb_beneficiaires_reel: ["beneficiairesreel"],
    lieu_principal: ["lieu", "lieuprincipal"],
    commune: ["commune", "communesconcernees", "ville"],
    recurrence: ["frequence", "recurrence"],
  };
  const normedHeaders = headers.map((h) => ({ raw: h, n: norm(h) }));
  for (const f of ALL_FIELDS) {
    const cands = lookups[f.key] ?? [];
    const found = normedHeaders.find((h) => cands.some((c) => h.n.includes(c)));
    if (found) map[f.key] = found.raw;
  }
  return map;
}

function autoMapBudget(headers: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  const lookups: Record<string, string[]> = {
    ref: ["ref", "refaction", "codeaction", "reference"],
    financeur: ["financeur", "cofinanceur", "partenaire"],
    type: ["type", "nature"],
    annee: ["annee", "exercice"],
    montant_sollicite: ["sollicite", "demande", "montantsollicite"],
    montant_favorable: ["favorable", "accorde", "attribue", "montantfavorable"],
  };
  const normedHeaders = headers.map((h) => ({ raw: h, n: norm(h) }));
  for (const k of Object.keys(lookups)) {
    const found = normedHeaders.find((h) => lookups[k].some((c) => h.n.includes(c)));
    if (found) map[k] = found.raw;
  }
  return map;
}

function parseDate(v: any): string | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") {
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

  // Actions sheet
  const [sheetName, setSheetName] = useState<string>("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});

  // Budget sheet (optional)
  const [budgetSheet, setBudgetSheet] = useState<string>("");
  const [budgetHeaders, setBudgetHeaders] = useState<string[]>([]);
  const [budgetRows, setBudgetRows] = useState<Record<string, any>[]>([]);
  const [budgetMap, setBudgetMap] = useState<Record<string, string>>({});

  const [importing, setImporting] = useState(false);

  const reset = () => {
    setWorkbook(null);
    setSheetName(""); setHeaders([]); setRows([]); setMapping({});
    setBudgetSheet(""); setBudgetHeaders([]); setBudgetRows([]); setBudgetMap({});
    if (fileRef.current) fileRef.current.value = "";
  };

  const onFile = async (f: File) => {
    const buf = await f.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    setWorkbook(wb);
    const first = wb.SheetNames[0];
    setSheetName(first);
    loadSheet(wb, first);
    setBudgetSheet(""); setBudgetHeaders([]); setBudgetRows([]); setBudgetMap({});
  };

  const loadSheet = (wb: XLSX.WorkBook, name: string) => {
    const ws = wb.Sheets[name];
    const json = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: null });
    const hdrs = json.length ? Object.keys(json[0]) : [];
    setHeaders(hdrs);
    setRows(json);
    setMapping(autoMap(hdrs));
  };

  const loadBudgetSheet = (wb: XLSX.WorkBook, name: string) => {
    if (!name) {
      setBudgetHeaders([]); setBudgetRows([]); setBudgetMap({});
      return;
    }
    const ws = wb.Sheets[name];
    const json = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: null });
    const hdrs = json.length ? Object.keys(json[0]) : [];
    setBudgetHeaders(hdrs);
    setBudgetRows(json);
    setBudgetMap(autoMapBudget(hdrs));
  };

  const assocByName = useMemo(() => {
    const m = new Map<string, string>();
    associations.forEach((a) => m.set(norm(a.nom), a.id));
    return m;
  }, [associations]);

  // Aggregate budget rows by ref
  const budgetByRef = useMemo(() => {
    const m = new Map<string, any[]>();
    if (!budgetMap.ref) return m;
    for (const r of budgetRows) {
      const refVal = r[budgetMap.ref];
      if (refVal == null || refVal === "") continue;
      const key = norm(String(refVal));
      const line = {
        annee: budgetMap.annee ? String(r[budgetMap.annee] ?? "") : "",
        financeur: budgetMap.financeur ? String(r[budgetMap.financeur] ?? "") : "",
        type: budgetMap.type ? String(r[budgetMap.type] ?? "") : "",
        montant_sollicite: budgetMap.montant_sollicite ? (toNumber(r[budgetMap.montant_sollicite]) ?? 0) : 0,
        montant_favorable: budgetMap.montant_favorable ? (toNumber(r[budgetMap.montant_favorable]) ?? 0) : 0,
        montant: 0,
      };
      line.montant = line.montant_favorable || line.montant_sollicite;
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(line);
    }
    return m;
  }, [budgetRows, budgetMap]);

  const previewCount = useMemo(() => {
    if (!mapping.titre || !mapping.association_nom) return { valid: 0, missing: 0, withBudget: 0 };
    let valid = 0, missing = 0, withBudget = 0;
    for (const r of rows) {
      const t = r[mapping.titre];
      const a = r[mapping.association_nom];
      if (!t || !a) continue;
      if (assocByName.has(norm(String(a)))) {
        valid++;
        const refVal = mapping.ref ? r[mapping.ref] : null;
        if (refVal && budgetByRef.has(norm(String(refVal)))) withBudget++;
      } else missing++;
    }
    return { valid, missing, withBudget };
  }, [rows, mapping, assocByName, budgetByRef]);

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
        const refVal = get("ref");
        const refStr = refVal != null && refVal !== "" ? String(refVal) : null;
        const budgetLines = refStr ? budgetByRef.get(norm(refStr)) ?? null : null;

        const totalFavorable = budgetLines?.reduce((s, l) => s + (Number(l.montant_favorable) || 0), 0) ?? 0;
        const totalSollicite = budgetLines?.reduce((s, l) => s + (Number(l.montant_sollicite) || 0), 0) ?? 0;

        payload.push({
          titre: String(titre).slice(0, 500),
          assoc_id,
          ref: refStr,
          reference_administrative: get("reference_administrative") ? String(get("reference_administrative")) : null,
          commune: get("commune") ? String(get("commune")) : null,
          description: get("description") ? String(get("description")) : null,
          objectifs: get("objectifs") ? String(get("objectifs")) : null,
          type_action: get("type_action") ? String(get("type_action")) : null,
          thematique: get("thematique") ? String(get("thematique")) : null,
          statut: matchOption(STATUT_OPTIONS, get("statut")) ?? "planifiee",
          qpv_key: matchOption(QPV_OPTIONS, get("qpv_key")),
          axis_key: matchOption(AXIS_OPTIONS, get("axis_key")),
          date_debut: parseDate(get("date_debut")),
          date_fin: parseDate(get("date_fin")),
          annee: toNumber(get("annee")),
          budget: totalFavorable || totalSollicite || toNumber(get("budget")) || null,
          nb_beneficiaires_prevu: toNumber(get("nb_beneficiaires_prevu")),
          nb_beneficiaires_reel: toNumber(get("nb_beneficiaires_reel")),
          lieu_principal: get("lieu_principal") ? String(get("lieu_principal")) : null,
          recurrence: get("recurrence") ? String(get("recurrence")) : null,
          budget_financeurs: budgetLines ?? [],
        });
      }

      if (!payload.length) { toast.error("Aucune ligne valide à importer"); setImporting(false); return; }

      const chunkSize = 200;
      for (let i = 0; i < payload.length; i += chunkSize) {
        const { error } = await supabase.from("actions").insert(payload.slice(i, i + chunkSize));
        if (error) throw error;
      }

      const linked = payload.filter((p) => p.budget_financeurs && p.budget_financeurs.length).length;
      toast.success(
        `${payload.length} action(s) importée(s)` +
        (linked ? `, ${linked} avec budget lié` : "") +
        (skipped.length ? `, ${skipped.length} ignorée(s)` : "")
      );
      onImported();
      reset();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Échec de l'import");
    } finally {
      setImporting(false);
    }
  };

  const BUDGET_FIELDS: FieldDef[] = [
    { key: "ref", label: "Réf. (lien avec action)", required: true },
    { key: "financeur", label: "Financeur" },
    { key: "type", label: "Type" },
    { key: "annee", label: "Année" },
    { key: "montant_sollicite", label: "Sollicité (€)" },
    { key: "montant_favorable", label: "Favorable (€)" },
  ];

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importer des actions (Excel)</DialogTitle>
          <DialogDescription>
            Choisissez un fichier, sélectionnez l'onglet des actions, mappez les champs, puis (optionnel) liez un onglet « Budget » via la réf.
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
            <Tabs defaultValue="actions" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="actions">Actions</TabsTrigger>
                <TabsTrigger value="budget">
                  <Wallet className="mr-1.5 h-3.5 w-3.5" /> Budget — Financeurs
                </TabsTrigger>
              </TabsList>

              <TabsContent value="actions" className="space-y-4 pt-4">
                <div>
                  <Label>Onglet des actions</Label>
                  <Select value={sheetName} onValueChange={(v) => { setSheetName(v); loadSheet(workbook, v); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {workbook.SheetNames.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <p className="mt-1 text-xs text-muted-foreground">{rows.length} ligne(s) détectée(s)</p>
                </div>

                {headers.length > 0 && SECTIONS.map((sec) => {
                  const Icon = sec.icon;
                  return (
                    <div key={sec.id} className="rounded-lg border bg-card p-3">
                      <div className={`mb-2 flex items-center gap-2 text-sm font-semibold ${sec.color}`}>
                        <Icon className="h-4 w-4" />
                        {sec.label}
                      </div>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {sec.fields.map((f) => (
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
                    </div>
                  );
                })}
              </TabsContent>

              <TabsContent value="budget" className="space-y-4 pt-4">
                <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
                  Liez les lignes de budget aux actions via la <strong>Réf.</strong> Chaque ligne du tableau budget doit comporter une réf. correspondant à la réf. d'une action ci-dessus.
                </div>
                <div>
                  <Label>Onglet du budget (optionnel)</Label>
                  <Select
                    value={budgetSheet || NONE}
                    onValueChange={(v) => {
                      const next = v === NONE ? "" : v;
                      setBudgetSheet(next);
                      loadBudgetSheet(workbook, next);
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="— Aucun —" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>— Aucun —</SelectItem>
                      {workbook.SheetNames.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {budgetSheet && (
                    <p className="mt-1 text-xs text-muted-foreground">{budgetRows.length} ligne(s) de budget</p>
                  )}
                </div>

                {budgetHeaders.length > 0 && (
                  <div className="rounded-lg border bg-card p-3">
                    <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary">
                      <Wallet className="h-4 w-4" />
                      Mapping des colonnes budget
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {BUDGET_FIELDS.map((f) => (
                        <div key={f.key} className="flex flex-col gap-1">
                          <Label className="text-xs">
                            {f.label}{f.required && <span className="text-destructive"> *</span>}
                          </Label>
                          <Select
                            value={budgetMap[f.key] ?? NONE}
                            onValueChange={(v) => setBudgetMap((m) => ({ ...m, [f.key]: v === NONE ? "" : v }))}
                          >
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value={NONE}>—</SelectItem>
                              {budgetHeaders.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {budgetByRef.size} réf(s) de budget agrégée(s)
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}

          {headers.length > 0 && (
            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              <p><strong>{previewCount.valid}</strong> action(s) prête(s) à être importée(s)</p>
              {previewCount.withBudget > 0 && (
                <p className="text-emerald-700">✓ {previewCount.withBudget} avec budget lié par réf.</p>
              )}
              {previewCount.missing > 0 && (
                <p className="text-amber-700">⚠ {previewCount.missing} ligne(s) avec association introuvable seront ignorées</p>
              )}
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
