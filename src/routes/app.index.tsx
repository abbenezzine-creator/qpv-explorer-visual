import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getUser, refreshFromSession, type AbUser } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { fetchDashboardData, buildDashboardPayload, type DashboardFilters } from "@/lib/dashboard-bridge";
import { EvalBeneficiaireModal } from "@/components/dashboard/EvalBeneficiaireModal";

export const Route = createFileRoute("/app/")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/login" });
    }
  },
  component: AppIndexPage,
  validateSearch: (s: Record<string, unknown>) => ({
    page: typeof s.page === "string" ? s.page : "dashboard",
    year: typeof s.year === "string" && /^\d{4}$/.test(s.year) ? Number(s.year) : (typeof s.year === "number" ? s.year : undefined),
    assoc: typeof s.assoc === "string" && s.assoc ? s.assoc : undefined,
    theme: typeof s.theme === "string" && s.theme ? s.theme : undefined,
    qualiteAction: typeof s.qualiteAction === "string" && s.qualiteAction ? s.qualiteAction : undefined,
  }),
});

type IframeWin = Window & {
  nav?: (id: string) => void;
  autoLogin?: (login: string, opts?: { role?: string; nom?: string; assocId?: string | null }) => boolean;
  openActionQualite?: (actionId: string) => void;
};

function AppIndexPage() {
  const { page, year, assoc, theme, qualiteAction } = Route.useSearch();
  const navigate = useNavigate({ from: "/app/" });
  const ref = useRef<HTMLIFrameElement>(null);
  const [u, setUser] = useState<AbUser | null>(() => getUser());
  const [iframeReady, setIframeReady] = useState(false);
  const filters = useMemo<DashboardFilters>(() => ({
    year: year ?? new Date().getFullYear(),
    assocId: assoc ?? null,
    thematique: theme ?? null,
  }), [year, assoc, theme]);
  const [evalActionId, setEvalActionId] = useState<string | null>(null);
  const qc = useQueryClient();

  // Auth sync
  useEffect(() => {
    const sync = () => setUser(getUser());
    window.addEventListener("ab-auth-change", sync);
    void refreshFromSession().then(setUser);
    return () => window.removeEventListener("ab-auth-change", sync);
  }, []);

  // Iframe load + autoLogin + nav forwarding
  useEffect(() => {
    const f = ref.current;
    if (!f || !u) return;
    const onLoad = () => {
      try {
        const win = f.contentWindow as IframeWin | null;
        if (win?.autoLogin) win.autoLogin(u.login, { role: u.role, nom: u.nom, assocId: u.assocId });
        if (win?.nav) win.nav(page);
      } catch { /* noop */ }
    };
    f.addEventListener("load", onLoad);
    onLoad();
    return () => f.removeEventListener("load", onLoad);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [u?.login, u?.role, u?.nom, u?.assocId, page]);

  useEffect(() => {
    const f = ref.current;
    if (!f) return;
    try {
      const win = f.contentWindow as IframeWin | null;
      if (win?.nav) win.nav(page);
    } catch { /* noop */ }
    // Auto-refresh data when navigating to a page
    qc.invalidateQueries({ queryKey: ["dashboard-data"] });
    if (page === "impacts-beneficiaires") qc.invalidateQueries({ queryKey: ["impacts-evaluations"] });
    if (page === "evaluations") qc.invalidateQueries({ queryKey: ["evaluations-list"] });
  }, [page, qc]);

  // ===== Dashboard data bridge (React Query → iframe via postMessage) =====
  const dashQ = useQuery({
    queryKey: ["dashboard-data"],
    queryFn: fetchDashboardData,
    staleTime: 30_000,
  });

  // Listen for messages FROM the iframe
  useEffect(() => {
    const onMsg = (ev: MessageEvent) => {
      const d = ev.data as { type?: string; year?: number; assocId?: string | null; thematique?: string | null; actionId?: string } | undefined;
      if (!d || typeof d.type !== "string") return;
      if (d.type === "ab-iframe-ready") {
        setIframeReady(true);
      } else if (d.type === "ab-filters-changed") {
        navigate({
          search: (prev: { page?: string; year?: number; assoc?: string; theme?: string }) => ({
            ...prev,
            year: typeof d.year === "number" ? d.year : prev.year,
            assoc: d.assocId !== undefined ? (d.assocId || undefined) : prev.assoc,
            theme: d.thematique !== undefined ? (d.thematique || undefined) : prev.theme,
          }),
          replace: true,
        });
      } else if (d.type === "ab-refresh-dashboard") {
        qc.invalidateQueries({ queryKey: ["dashboard-data"] });
      } else if (d.type === "ab-open-eval-modal" && typeof d.actionId === "string") {
        setEvalActionId(d.actionId);
      } else if (d.type === "ab-open-qualite" && typeof d.actionId === "string") {
        navigate({ search: (prev: { page?: string; qualiteAction?: string }) => ({ ...prev, page: "qualite", qualiteAction: d.actionId }) });
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [qc, navigate]);

  // ===== Realtime → invalidate dashboard cache on any backend change =====
  useEffect(() => {
    const channel = supabase
      .channel("dashboard-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "actions" },
        () => qc.invalidateQueries({ queryKey: ["dashboard-data"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "evaluations_beneficiaires" },
        () => { qc.invalidateQueries({ queryKey: ["dashboard-data"] }); qc.invalidateQueries({ queryKey: ["impacts-evaluations"] }); qc.invalidateQueries({ queryKey: ["evaluations-list"] }); })
      .on("postgres_changes", { event: "*", schema: "public", table: "referentiel_qualite" },
        () => qc.invalidateQueries({ queryKey: ["dashboard-data"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "associations" },
        () => qc.invalidateQueries({ queryKey: ["dashboard-data"] }))
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [qc]);

  // Push payload to iframe whenever data, filters, readiness or page change
  useEffect(() => {
    if (!iframeReady || !dashQ.data) return;
    if (page !== "dashboard") return;
    const f = ref.current;
    if (!f?.contentWindow) return;
    const payload = buildDashboardPayload(dashQ.data, filters);
    try { f.contentWindow.postMessage(payload, "*"); } catch { /* noop */ }
  }, [iframeReady, dashQ.data, filters, page]);

  // When ?page=qualite&qualiteAction=<id> → push Supabase assoc/action lists into the iframe selectors
  useEffect(() => {
    if (page !== "qualite" || !qualiteAction || !iframeReady || !dashQ.data) return;
    const f = ref.current;
    if (!f?.contentWindow) return;
    const win = f.contentWindow;
    const t = setTimeout(() => {
      try {
        win.postMessage({
          type: "ab-load-qualite",
          actionId: qualiteAction,
          associations: dashQ.data!.associations,
          actions: dashQ.data!.actions.map(a => ({ id: a.id, titre: a.titre, assoc_id: a.assoc_id })),
        }, "*");
      } catch { /* noop */ }
    }, 120);
    return () => clearTimeout(t);
  }, [page, qualiteAction, iframeReady, dashQ.data]);

  // Push Supabase evaluations to iframe Impacts page
  const impactsQ = useQuery({
    queryKey: ["impacts-evaluations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("evaluations_beneficiaires")
        .select("id, action_id, reponses, created_at");
      if (error) throw error;
      return data ?? [];
    },
    enabled: page === "impacts-beneficiaires",
    staleTime: 30_000,
  });

  useEffect(() => {
    if (page !== "impacts-beneficiaires" || !iframeReady || !dashQ.data || !impactsQ.data) return;
    const f = ref.current;
    if (!f?.contentWindow) return;
    const assocMap = new Map(dashQ.data.associations.map(a => [a.id, a.nom]));
    const actMap = new Map(dashQ.data.actions.map(a => [a.id, a]));
    const evaluations = impactsQ.data.map(e => {
      const a = actMap.get(e.action_id);
      const payload = (e.reponses ?? {}) as Record<string, unknown>;
      const yr = a?.annee ?? (a?.date_debut ? Number(a.date_debut.slice(0, 4)) : null);
      return {
        actionId: e.action_id,
        assocId: a?.assoc_id ?? null,
        titre: a?.titre ?? "",
        assocName: a ? (assocMap.get(a.assoc_id) ?? "") : "",
        theme: a?.thematique ?? "",
        sousTheme: "",
        annee: yr,
        payload,
      };
    });
    const win = f.contentWindow;
    const t = setTimeout(() => {
      try { win.postMessage({ type: "ab-load-impacts", evaluations }, "*"); } catch { /* noop */ }
    }, 120);
    return () => clearTimeout(t);
  }, [page, iframeReady, dashQ.data, impactsQ.data]);

  return (
    <>
      <iframe
        ref={ref}
        title="AssocioBoard"
        src={`/associoboard.html#page=${encodeURIComponent(page)}`}
        className="h-[calc(100vh-3rem)] w-full border-0"
      />
      <EvalBeneficiaireModal
        actionId={evalActionId}
        onClose={() => setEvalActionId(null)}
        prefill={(() => {
          if (!evalActionId || !dashQ.data) return undefined;
          const a = dashQ.data.actions.find((x) => x.id === evalActionId);
          if (!a) return undefined;
          const assocName = dashQ.data.associations.find((s) => s.id === a.assoc_id)?.nom ?? "";
          const yr = a.annee ?? (a.date_debut ? Number(a.date_debut.slice(0, 4)) : undefined);
          return { title: a.titre ?? "", asso: assocName, year: yr ? String(yr) : "" };
        })()}
      />
    </>
  );
}
