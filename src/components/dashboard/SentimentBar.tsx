interface Props {
  improvement: number;
  stable: number;
  degradation: number;
}

export function SentimentBar({ improvement, stable, degradation }: Props) {
  return (
    <div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
        <div className="bg-success" style={{ width: `${improvement}%` }} />
        <div className="bg-muted-foreground/40" style={{ width: `${stable}%` }} />
        <div className="bg-destructive" style={{ width: `${degradation}%` }} />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
        <div>
          <div className="font-semibold text-success">{improvement}%</div>
          <div className="text-muted-foreground">Amélioration</div>
        </div>
        <div>
          <div className="font-semibold text-muted-foreground">{stable}%</div>
          <div className="text-muted-foreground">Stable</div>
        </div>
        <div>
          <div className="font-semibold text-destructive">{degradation}%</div>
          <div className="text-muted-foreground">Dégradation</div>
        </div>
      </div>
    </div>
  );
}
