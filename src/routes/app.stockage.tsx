import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Database, HardDrive, Table as TableIcon, RefreshCw, AlertCircle, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getUser } from "@/lib/auth";

export const Route = createFileRoute("/app/stockage")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login" });
  },
  component: StoragePage,
});

type StorageRow = {
  table_name: string;
  row_count: number;
  total_bytes: number;
  table_bytes: number;
  index_bytes: number;
};

const STORAGE_LIMIT_BYTES = 500 * 1024 * 1024; // 500 MB free tier

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} Mo`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} Go`;
}

function StoragePage() {
  const user = getUser();
  const isSuperAdmin = user?.role === "superadmin";

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["storage-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_storage_stats" as never);
      if (error) throw error;
      return (data ?? []) as StorageRow[];
    },
    enabled: isSuperAdmin,
  });

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center space-y-3">
          <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
          <h1 className="text-xl font-semibold">Accès restreint</h1>
          <p className="text-muted-foreground">Cette page est réservée aux super administrateurs.</p>
          <Button asChild variant="outline"><Link to="/app" search={{ page: "dashboard" }}>Retour</Link></Button>
        </div>
      </div>
    );
  }

  const rows = data ?? [];
  const totalBytes = rows.reduce((s, r) => s + Number(r.total_bytes), 0);
  const totalRows = rows.reduce((s, r) => s + Number(r.row_count), 0);
  const usagePct = Math.min(100, (totalBytes / STORAGE_LIMIT_BYTES) * 100);
  const usageColor = usagePct > 80 ? "bg-destructive" : usagePct > 60 ? "bg-amber-500" : "bg-primary";

  return (
    <div className="min-h-screen bg-background p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <HardDrive className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Stockage</h1>
              <p className="text-sm text-muted-foreground">État du stockage de la base de données</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/app" search={{ page: "parametres" }}><ArrowLeft className="h-4 w-4 mr-1" />Administration</Link>
            </Button>
            <Button onClick={() => refetch()} disabled={isFetching} size="sm">
              <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
              Actualiser
            </Button>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KpiCard
            icon={<Database className="h-5 w-5" />}
            label="Stockage total"
            value={formatBytes(totalBytes)}
            hint={`sur ${formatBytes(STORAGE_LIMIT_BYTES)} (tier gratuit)`}
          />
          <KpiCard
            icon={<TableIcon className="h-5 w-5" />}
            label="Tables"
            value={rows.length.toString()}
            hint="schéma public"
          />
          <KpiCard
            icon={<HardDrive className="h-5 w-5" />}
            label="Lignes (total)"
            value={totalRows.toLocaleString("fr-FR")}
            hint="enregistrements"
          />
        </div>

        {/* Global usage gauge */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Utilisation globale</h2>
              <p className="text-2xl font-bold mt-1">{usagePct.toFixed(2)}%</p>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <div>{formatBytes(totalBytes)}</div>
              <div className="text-xs">/ {formatBytes(STORAGE_LIMIT_BYTES)}</div>
            </div>
          </div>
          <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full transition-all ${usageColor}`}
              style={{ width: `${usagePct}%` }}
            />
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-base font-semibold">Statistiques par table</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Triées par taille décroissante</p>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-muted-foreground">Chargement…</div>
          ) : error ? (
            <div className="p-12 text-center text-destructive flex flex-col items-center gap-2">
              <AlertCircle className="h-8 w-8" />
              <div>Erreur : {(error as Error).message}</div>
            </div>
          ) : rows.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">Aucune table trouvée.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Table</TableHead>
                  <TableHead className="text-right">Lignes</TableHead>
                  <TableHead className="text-right">Données</TableHead>
                  <TableHead className="text-right">Index</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="w-[200px]">Part relative</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const pct = totalBytes > 0 ? (Number(r.total_bytes) / totalBytes) * 100 : 0;
                  return (
                    <TableRow key={r.table_name}>
                      <TableCell className="font-medium">{r.table_name}</TableCell>
                      <TableCell className="text-right tabular-nums">{Number(r.row_count).toLocaleString("fr-FR")}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">{formatBytes(Number(r.table_bytes))}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">{formatBytes(Number(r.index_bytes))}</TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">{formatBytes(Number(r.total_bytes))}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={pct} className="h-2 flex-1" />
                          <span className="text-xs text-muted-foreground w-12 text-right tabular-nums">{pct.toFixed(1)}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Métriques calculées via <code className="px-1 py-0.5 rounded bg-muted">pg_total_relation_size</code> sur le schéma <code className="px-1 py-0.5 rounded bg-muted">public</code>.
        </p>
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
    </div>
  );
}
