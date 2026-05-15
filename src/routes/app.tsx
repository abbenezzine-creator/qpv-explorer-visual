import { createFileRoute, redirect, useNavigate, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { loadThemeOverrides } from "@/lib/theme-overrides";

export const Route = createFileRoute("/app")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/login" });
    }
  },
  component: AppLayout,
});

function AppLayout() {
  const navigate = useNavigate();

  useEffect(() => {
    loadThemeOverrides().catch(() => {});
    const onMsg = (e: MessageEvent) => {
      const d = e.data as { type?: string; to?: string } | undefined;
      if (d?.type === "ab-navigate" && typeof d.to === "string" && d.to.startsWith("/")) {
        navigate({ to: d.to });
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [navigate]);

  return <Outlet />;
}
