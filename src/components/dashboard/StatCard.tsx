import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: ReactNode;
  delta?: { value: number; suffix?: string; positiveIsGood?: boolean };
  hint?: string;
  category?: "cold" | "hot" | "citizen";
  icon?: ReactNode;
}

export function StatCard({ label, value, delta, hint, category = "cold", icon }: StatCardProps) {
  const catClass =
    category === "cold" ? "bg-cold" : category === "hot" ? "bg-hot" : "bg-citizen";
  const catLabel =
    category === "cold" ? "Donnée froide" : category === "hot" ? "Donnée chaude" : "Donnée citoyenne";

  let deltaEl: ReactNode = null;
  if (delta) {
    const positiveIsGood = delta.positiveIsGood ?? true;
    const isPositive = delta.value > 0;
    const good = positiveIsGood ? isPositive : !isPositive;
    deltaEl = (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
          good ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive",
        )}
      >
        {isPositive ? "▲" : "▼"} {Math.abs(delta.value).toLocaleString("fr-FR")}
        {delta.suffix ?? ""}
      </span>
    );
  }

  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-sm transition hover:shadow-md">
      <div className={cn("absolute inset-x-0 top-0 h-1", catClass)} />
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {catLabel}
        </span>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>
      <div className="mt-3 text-sm text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <div className="text-3xl font-bold text-foreground">{value}</div>
        {deltaEl}
      </div>
      {hint && <div className="mt-2 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
