import { QPVS, QPVKey } from "@/data/qpv";
import { cn } from "@/lib/utils";

interface Props {
  selected: QPVKey;
  onSelect: (k: QPVKey) => void;
}

export function QPVSelector({ selected, onSelect }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {QPVS.map((q) => {
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
            )}
          >
            {q.name}
          </button>
        );
      })}
    </div>
  );
}
