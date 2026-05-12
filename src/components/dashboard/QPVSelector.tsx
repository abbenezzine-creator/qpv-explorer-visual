import { QPVS, QPVKey } from "@/data/qpv";
import { cn } from "@/lib/utils";

export type QPVScope = QPVKey | "all";

interface Props {
  selected: QPVScope;
  onSelect: (k: QPVScope) => void;
}

export function QPVSelector({ selected, onSelect }: Props) {
  const items: { key: QPVScope; name: string }[] = [
    ...QPVS.map((q) => ({ key: q.key as QPVScope, name: q.name })),
    { key: "all", name: "Les QPV d'Orléans" },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((q) => {
        const active = q.key === selected;
        return (
          <button
            key={q.key}
            onClick={() => onSelect(q.key)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-medium transition",
              active
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-accent",
              q.key === "all" && !active && "border-primary/40 bg-primary/5 font-semibold",
            )}
          >
            {q.name}
          </button>
        );
      })}
    </div>
  );
}
