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
  }, [page]);

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
        () => qc.invalidateQueries({ queryKey: ["dashboard-data"] }))
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

  return (
    <>
      <iframe
        ref={ref}
        title="AssocioBoard"
        src={`/associoboard.html#page=${encodeURIComponent(page)}`}
        className="h-[calc(100vh-3rem)] w-full border-0"
      />
      <EvalBeneficiaireModal actionId={evalActionId} onClose={() => setEvalActionId(null)} />
    </>
  );
}
