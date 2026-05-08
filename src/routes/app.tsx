import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

export const Route = createFileRoute("/app")({
  component: AppPage,
  validateSearch: (s: Record<string, unknown>) => ({
    page: typeof s.page === "string" ? s.page : "dashboard",
  }),
});

function AppPage() {
  const { page } = Route.useSearch();
  const ref = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const f = ref.current;
    if (!f) return;
    try {
      const win = f.contentWindow as (Window & { nav?: (id: string) => void }) | null;
      if (win && typeof win.nav === "function") {
        win.nav(page);
        return;
      }
    } catch {
      /* cross-origin not expected */
    }
    // Fallback: update src hash
    const url = `/associoboard.html#page=${encodeURIComponent(page)}`;
    if (f.src.indexOf("/associoboard.html") === -1) {
      f.src = url;
    } else {
      f.contentWindow?.location.replace(url);
    }
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
