-- 1. Table evaluations_beneficiaires
CREATE TABLE public.evaluations_beneficiaires (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action_id UUID NOT NULL REFERENCES public.actions(id) ON DELETE CASCADE,
  phase TEXT NOT NULL CHECK (phase IN ('avant','apres')),
  beneficiaire_nom TEXT,
  beneficiaire_age INTEGER,
  beneficiaire_genre TEXT,
  reponses JSONB NOT NULL DEFAULT '{}'::jsonb,
  satisfaction NUMERIC,
  commentaire TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_eval_benef_action ON public.evaluations_beneficiaires(action_id);

ALTER TABLE public.evaluations_beneficiaires ENABLE ROW LEVEL SECURITY;

CREATE POLICY "eb_select_authenticated" ON public.evaluations_beneficiaires
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "eb_insert" ON public.evaluations_beneficiaires
  FOR INSERT TO authenticated
  WITH CHECK (
    private.has_role(auth.uid(),'superadmin'::app_role)
    OR ((private.has_role(auth.uid(),'admin_asso'::app_role) OR private.has_role(auth.uid(),'agent'::app_role))
        AND private.action_assoc_id(action_id) = private.user_assoc_id(auth.uid()))
  );

CREATE POLICY "eb_update" ON public.evaluations_beneficiaires
  FOR UPDATE TO authenticated
  USING (
    private.has_role(auth.uid(),'superadmin'::app_role)
    OR ((private.has_role(auth.uid(),'admin_asso'::app_role) OR private.has_role(auth.uid(),'agent'::app_role))
        AND private.action_assoc_id(action_id) = private.user_assoc_id(auth.uid()))
  );

CREATE POLICY "eb_delete" ON public.evaluations_beneficiaires
  FOR DELETE TO authenticated
  USING (
    private.has_role(auth.uid(),'superadmin'::app_role)
    OR ((private.has_role(auth.uid(),'admin_asso'::app_role) OR private.has_role(auth.uid(),'agent'::app_role))
        AND private.action_assoc_id(action_id) = private.user_assoc_id(auth.uid()))
  );

CREATE TRIGGER trg_eb_updated_at BEFORE UPDATE ON public.evaluations_beneficiaires
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. Table referentiel_qualite
CREATE TABLE public.referentiel_qualite (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action_id UUID NOT NULL REFERENCES public.actions(id) ON DELETE CASCADE,
  assoc_id UUID NOT NULL REFERENCES public.associations(id) ON DELETE CASCADE,
  c1 NUMERIC, c2 NUMERIC, c3 NUMERIC, c4 NUMERIC, c5 NUMERIC,
  c6 NUMERIC, c7 NUMERIC, c8 NUMERIC, c9 NUMERIC, c10 NUMERIC,
  score_global NUMERIC,
  synthese TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_rq_action ON public.referentiel_qualite(action_id);
CREATE INDEX idx_rq_assoc ON public.referentiel_qualite(assoc_id);

ALTER TABLE public.referentiel_qualite ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rq_select_authenticated" ON public.referentiel_qualite
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "rq_insert" ON public.referentiel_qualite
  FOR INSERT TO authenticated
  WITH CHECK (
    private.has_role(auth.uid(),'superadmin'::app_role)
    OR ((private.has_role(auth.uid(),'admin_asso'::app_role) OR private.has_role(auth.uid(),'agent'::app_role))
        AND assoc_id = private.user_assoc_id(auth.uid()))
  );

CREATE POLICY "rq_update" ON public.referentiel_qualite
  FOR UPDATE TO authenticated
  USING (
    private.has_role(auth.uid(),'superadmin'::app_role)
    OR ((private.has_role(auth.uid(),'admin_asso'::app_role) OR private.has_role(auth.uid(),'agent'::app_role))
        AND assoc_id = private.user_assoc_id(auth.uid()))
  );

CREATE POLICY "rq_delete" ON public.referentiel_qualite
  FOR DELETE TO authenticated
  USING (
    private.has_role(auth.uid(),'superadmin'::app_role)
    OR ((private.has_role(auth.uid(),'admin_asso'::app_role) OR private.has_role(auth.uid(),'agent'::app_role))
        AND assoc_id = private.user_assoc_id(auth.uid()))
  );

CREATE TRIGGER trg_rq_updated_at BEFORE UPDATE ON public.referentiel_qualite
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();