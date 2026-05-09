import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { getUser } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/login" });
    }
  },
  component: AppPage,
  validateSearch: (s: Record<string, unknown>) => ({
    page: typeof s.page === "string" ? s.page : "dashboard",
  }),
});

type IframeWin = Window & {
  nav?: (id: string) => void;
  autoLogin?: (login: string, opts?: { role?: string; nom?: string; assocId?: string | null }) => boolean;
};

function AppPage() {
  const { page } = Route.useSearch();
  const ref = useRef<HTMLIFrameElement>(null);
  const u = getUser();

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
  }, [u?.login, u?.role]);

  useEffect(() => {
    const f = ref.current;
    if (!f) return;
    try {
      const win = f.contentWindow as IframeWin | null;
      if (win?.nav) win.nav(page);
    } catch { /* noop */ }
  }, [page]);

  return (
    <iframe
      ref={ref}
      title="AssocioBoard"
      src={`/associoboard.html#page=${encodeURIComponent(page)}`}
      className="h-[calc(100vh-3rem)] w-full border-0"
    />
  );
}
