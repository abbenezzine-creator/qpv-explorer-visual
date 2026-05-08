import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { getUser } from "@/lib/auth";

export const Route = createFileRoute("/app")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && !getUser()) {
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
  autoLogin?: (login: string) => boolean;
};

function AppPage() {
  const { page } = Route.useSearch();
  const ref = useRef<HTMLIFrameElement>(null);
  const u = getUser();

  // Auto-login the iframe once it loads
  useEffect(() => {
    const f = ref.current;
    if (!f || !u) return;
    const onLoad = () => {
      try {
        const win = f.contentWindow as IframeWin | null;
        if (win?.autoLogin) win.autoLogin(u.login);
        if (win?.nav) win.nav(page);
      } catch { /* noop */ }
    };
    f.addEventListener("load", onLoad);
    // Try immediately too in case already loaded
    onLoad();
    return () => f.removeEventListener("load", onLoad);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [u?.login]);

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
