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
    dashAction: typeof s.dashAction === "string" && s.dashAction ? s.dashAction : undefined,
    qualiteAction: typeof s.qualiteAction === "string" && s.qualiteAction ? s.qualiteAction : undefined,
  }),
});

type IframeWin = Window & {
  nav?: (id: string) => void;
  autoLogin?: (login: string, opts?: { role?: string; nom?: string; assocId?: string | null }) => boolean;
  openActionQualite?: (actionId: string) => void;
};

function AppIndexPage() {
  const { page, year, assoc, theme, dashAction, qualiteAction } = Route.useSearch();
  const navigate = useNavigate({ from: "/app/" });
  const ref = useRef<HTMLIFrameElement>(null);
  const [u, setUser] = useState<AbUser | null>(() => getUser());
  const [iframeReady, setIframeReady] = useState(false);
  const filters = useMemo<DashboardFilters>(() => ({
    year: year ?? null,
    assocId: assoc ?? null,
    thematique: theme ?? null,
    actionId: dashAction ?? null,
  }), [year, assoc, theme, dashAction]);
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
    const onMsg = async (ev: MessageEvent) => {
      const d = ev.data as { type?: string; year?: number | null; assocId?: string | null; thematique?: string | null; actionId?: string | null; scoreGlobal?: number; axisScores?: Record<string, number | null>; id?: string; titre?: string; docType?: string; url?: string | null; description?: string | null; fileName?: string; fileType?: string; fileSize?: number; fileBase64?: string; assocIds?: string[] | null; assocAll?: boolean } | undefined;
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
      } else if (d.type === "ab-dash-filters") {
        navigate({
          search: (prev: { page?: string; year?: number; assoc?: string; theme?: string; dashAction?: string }) => ({
            ...prev,
            year: typeof d.year === "number" ? d.year : (d.year === null ? undefined : prev.year),
            assoc: d.assocId ? d.assocId : undefined,
            theme: d.thematique ? d.thematique : undefined,
            dashAction: d.actionId ? d.actionId : undefined,
          }),
          replace: true,
        });
      } else if (d.type === "ab-refresh-dashboard") {
        qc.invalidateQueries({ queryKey: ["dashboard-data"] });
      } else if (d.type === "ab-open-eval-modal" && typeof d.actionId === "string") {
        setEvalActionId(d.actionId);
      } else if (d.type === "ab-open-qualite" && typeof d.actionId === "string") {
        navigate({ search: (prev: { page?: string; qualiteAction?: string }) => ({ ...prev, page: "qualite", qualiteAction: d.actionId as string }) });
      } else if (d.type === "ab-save-qualite" && typeof d.actionId === "string") {
        try {
          const { data: actRow } = await supabase.from("actions").select("assoc_id").eq("id", d.actionId).maybeSingle();
          const assocId = (d.assocId && d.assocId.length > 0) ? d.assocId : actRow?.assoc_id;
          if (!assocId) { console.error("ab-save-qualite: missing assoc_id"); return; }
          const axes = d.axisScores ?? {};
          const { data: userData } = await supabase.auth.getUser();
          const { error } = await supabase.from("referentiel_qualite").insert({
            action_id: d.actionId,
            assoc_id: assocId,
            score_global: typeof d.scoreGlobal === "number" ? d.scoreGlobal : null,
            c1: axes.c1 ?? null, c2: axes.c2 ?? null, c3: axes.c3 ?? null, c4: axes.c4 ?? null, c5: axes.c5 ?? null,
            c6: axes.c6 ?? null, c7: axes.c7 ?? null, c8: axes.c8 ?? null, c9: axes.c9 ?? null, c10: axes.c10 ?? null,
            created_by: userData.user?.id ?? null,
          });
          if (error) { console.error("referentiel_qualite insert", error); return; }
          qc.invalidateQueries({ queryKey: ["dashboard-data"] });
        } catch (err) {
          console.error("ab-save-qualite handler", err);
        }
      } else if (d.type === "ab-save-document") {
        const win = ref.current?.contentWindow;
        try {
          const { data: userData } = await supabase.auth.getUser();
          const userId = userData.user?.id;
          if (!userId) { win?.postMessage({ type: "ab-document-saved", success: false, error: "non authentifié" }, "*"); return; }
          const { data: prof } = await supabase.from("profiles").select("assoc_id").eq("id", userId).maybeSingle();
          const userAssocId = prof?.assoc_id ?? null;
          const { data: roleRows } = await supabase.from("user_roles").select("role").eq("user_id", userId);
          const isSuperadmin = (roleRows ?? []).some((r) => r.role === "superadmin");

          // Single-row visibility model
          let assocId: string | null;
          let visibleAll = false;
          let visibleAssocIds: string[] = [];
          if (isSuperadmin) {
            assocId = null;
            if (d.assocAll) {
              visibleAll = true;
            } else if (Array.isArray(d.assocIds) && d.assocIds.length > 0) {
              visibleAssocIds = d.assocIds.filter((x: unknown): x is string => typeof x === "string");
            } else {
              visibleAll = true;
            }
          } else {
            if (!userAssocId) { win?.postMessage({ type: "ab-document-saved", success: false, error: "association manquante" }, "*"); return; }
            assocId = userAssocId;
          }

          let filePath: string | null = null;
          let fileSize: number | null = null;
          let mimeType: string | null = null;
          if (d.fileBase64 && d.fileName) {
            const bin = atob(d.fileBase64);
            const arr = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
            const safeName = d.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
            const folder = assocId ?? "global";
            const path = `${folder}/${Date.now()}_${safeName}`;
            const { error: upErr } = await supabase.storage.from("documents").upload(path, arr, { contentType: d.fileType ?? "application/octet-stream", upsert: false });
            if (upErr) { win?.postMessage({ type: "ab-document-saved", success: false, error: upErr.message }, "*"); return; }
            filePath = path;
            fileSize = d.fileSize ?? arr.byteLength;
            mimeType = d.fileType ?? null;
          }

          const { error: insErr } = await supabase.from("documents").insert({
            assoc_id: assocId,
            titre: d.titre ?? "Document",
            type: d.docType ?? null,
            description: d.description ?? null,
            url: d.url ?? null,
            file_path: filePath,
            file_size: fileSize,
            mime_type: mimeType,
            visible_all: visibleAll,
            visible_assoc_ids: visibleAssocIds,
            created_by: userId,
          });
          if (insErr) { win?.postMessage({ type: "ab-document-saved", success: false, error: insErr.message }, "*"); return; }
          win?.postMessage({ type: "ab-document-saved", success: true }, "*");
          qc.invalidateQueries({ queryKey: ["documents-list"] });
        } catch (err) {
          console.error("ab-save-document", err);
          ref.current?.contentWindow?.postMessage({ type: "ab-document-saved", success: false, error: String(err) }, "*");
        }
      } else if (d.type === "ab-delete-document" && typeof d.id === "string") {
        try {
          const { data: row } = await supabase.from("documents").select("file_path").eq("id", d.id).maybeSingle();
          if (row?.file_path) await supabase.storage.from("documents").remove([row.file_path]);
          await supabase.from("documents").delete().eq("id", d.id);
          qc.invalidateQueries({ queryKey: ["documents-list"] });
        } catch (err) { console.error("ab-delete-document", err); }
      } else if (d.type === "ab-open-document" && typeof d.id === "string") {
        try {
          const { data: row } = await supabase.from("documents").select("file_path, url").eq("id", d.id).maybeSingle();
          let openUrl = row?.url ?? null;
          if (row?.file_path) {
            const { data: signed } = await supabase.storage.from("documents").createSignedUrl(row.file_path, 60 * 5);
            if (signed?.signedUrl) openUrl = signed.signedUrl;
          }
          if (openUrl) ref.current?.contentWindow?.postMessage({ type: "ab-document-url", url: openUrl }, "*");
        } catch (err) { console.error("ab-open-document", err); }
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [qc, navigate]);

  // Documents query — push to iframe when on documents page
  const docsQ = useQuery({
    queryKey: ["documents-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("id, assoc_id, titre, type, description, url, file_path, file_size, mime_type, visible_all, visible_assoc_ids, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: page === "documents",
    staleTime: 30_000,
  });
  useEffect(() => {
    if (page !== "documents" || !iframeReady || !docsQ.data) return;
    const win = ref.current?.contentWindow;
    if (!win) return;
    const t = setTimeout(() => {
      try { win.postMessage({ type: "ab-load-documents", documents: docsQ.data }, "*"); } catch { /* noop */ }
    }, 120);
    return () => clearTimeout(t);
  }, [page, iframeReady, docsQ.data]);

  // Push live associations list into the iframe (used by the document modal multi-select)
  const assocsQ = useQuery({
    queryKey: ["associations-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("associations").select("id, nom").order("nom");
      if (error) throw error;
      return data ?? [];
    },
    enabled: page === "documents",
    staleTime: 60_000,
  });
  useEffect(() => {
    if (page !== "documents" || !iframeReady || !assocsQ.data) return;
    const win = ref.current?.contentWindow;
    if (!win) return;
    const t = setTimeout(() => {
      try { win.postMessage({ type: "ab-load-assocs", associations: assocsQ.data }, "*"); } catch { /* noop */ }
    }, 120);
    return () => clearTimeout(t);
  }, [page, iframeReady, assocsQ.data]);
  // Realtime documents
  useEffect(() => {
    const ch = supabase
      .channel("documents-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "documents" },
        () => qc.invalidateQueries({ queryKey: ["documents-list"] }))
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [qc]);

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
