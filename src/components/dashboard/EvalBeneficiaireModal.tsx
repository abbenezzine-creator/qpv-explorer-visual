import { useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Props = {
  actionId: string | null;
  onClose: () => void;
  prefill?: { title?: string; asso?: string; year?: string };
};

type SurveyPayload = {
  actionId?: string | null;
  beneficiaire?: {
    age?: string;
    genre?: string;
    quartier?: string;
    asso?: string;
    action?: string;
  };
  pct_avant?: number;
  pct_apres?: number;
  [k: string]: unknown;
};

export function EvalBeneficiaireModal({ actionId, onClose, prefill }: Props) {
  const open = !!actionId;
  const qc = useQueryClient();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const mut = useMutation({
    mutationFn: async (payload: SurveyPayload) => {
      if (!actionId) throw new Error("actionId manquant");
      const b = payload.beneficiaire || {};
      const ageNum = b.age ? Number(String(b.age).replace(/\D/g, "")) : null;
      const sat =
        typeof payload.pct_apres === "number"
          ? Math.round((payload.pct_apres / 100) * 5 * 10) / 10
          : null;
      const { error } = await supabase.from("evaluations_beneficiaires").insert({
        action_id: actionId,
        phase: "apres",
        beneficiaire_nom: null,
        beneficiaire_age: ageNum && !Number.isNaN(ageNum) ? ageNum : null,
        beneficiaire_genre: b.genre || null,
        satisfaction: sat,
        commentaire: null,
        reponses: JSON.parse(JSON.stringify(payload)),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Évaluation enregistrée");
      qc.invalidateQueries({ queryKey: ["dashboard-data"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  useEffect(() => {
    if (!open) return;
    const handler = (ev: MessageEvent) => {
      const data = ev.data as { type?: string; payload?: SurveyPayload } | undefined;
      if (!data || data.type !== "survey-complete" || !data.payload) return;
      if (iframeRef.current && ev.source !== iframeRef.current.contentWindow) return;
      mut.mutate(data.payload);
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [open, mut]);

  const src = actionId
    ? `/questionnaire.html?embed=1&action=${encodeURIComponent(actionId)}`
    : "";

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-5xl w-[95vw] h-[90vh] p-0 gap-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-4 py-3 border-b shrink-0">
          <DialogTitle>Évaluer un bénéficiaire</DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0 bg-muted">
          {open && (
            <iframe
              ref={iframeRef}
              src={src}
              title="Questionnaire bénéficiaire"
              className="w-full h-full border-0"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
