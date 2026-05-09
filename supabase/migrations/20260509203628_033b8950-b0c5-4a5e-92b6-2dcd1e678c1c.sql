
-- Helper pour l'association d'un utilisateur (profiles existe déjà)
CREATE OR REPLACE FUNCTION public.user_assoc_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT assoc_id FROM public.profiles WHERE id = _user_id
$$;
REVOKE EXECUTE ON FUNCTION public.user_assoc_id(uuid) FROM PUBLIC, anon, authenticated;

-- Table actions
CREATE TABLE public.actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assoc_id uuid NOT NULL REFERENCES public.associations(id) ON DELETE RESTRICT,
  qpv_key text CHECK (qpv_key IS NULL OR qpv_key IN ('argonne','lasource','dauphine','blossieres')),
  axis_key text CHECK (axis_key IS NULL OR axis_key IN ('emancipation','sante','emploi','transition','tranquillite')),
  titre text NOT NULL,
  description text,
  date_debut date,
  date_fin date,
  budget numeric,
  nb_beneficiaires_prevu integer,
  nb_beneficiaires_reel integer,
  statut text NOT NULL DEFAULT 'planifiee' CHECK (statut IN ('planifiee','en_cours','terminee','annulee')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_actions_assoc ON public.actions(assoc_id);
CREATE INDEX idx_actions_qpv ON public.actions(qpv_key);
CREATE INDEX idx_actions_axis ON public.actions(axis_key);

CREATE TRIGGER set_actions_updated_at
  BEFORE UPDATE ON public.actions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "actions_select_authenticated"
  ON public.actions FOR SELECT TO authenticated USING (true);

CREATE POLICY "actions_insert"
  ON public.actions FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(),'superadmin')
    OR ((public.has_role(auth.uid(),'admin_asso') OR public.has_role(auth.uid(),'agent'))
        AND assoc_id = public.user_assoc_id(auth.uid()))
  );

CREATE POLICY "actions_update"
  ON public.actions FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(),'superadmin')
    OR ((public.has_role(auth.uid(),'admin_asso') OR public.has_role(auth.uid(),'agent'))
        AND assoc_id = public.user_assoc_id(auth.uid()))
  );

CREATE POLICY "actions_delete"
  ON public.actions FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(),'superadmin')
    OR ((public.has_role(auth.uid(),'admin_asso') OR public.has_role(auth.uid(),'agent'))
        AND assoc_id = public.user_assoc_id(auth.uid()))
  );

-- Helper après création de actions
CREATE OR REPLACE FUNCTION public.action_assoc_id(_action_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT assoc_id FROM public.actions WHERE id = _action_id
$$;
REVOKE EXECUTE ON FUNCTION public.action_assoc_id(uuid) FROM PUBLIC, anon, authenticated;

-- Table evaluations
CREATE TABLE public.evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id uuid NOT NULL REFERENCES public.actions(id) ON DELETE CASCADE,
  phase text NOT NULL CHECK (phase IN ('avant','apres')),
  beneficiaire_nom text,
  beneficiaire_age integer,
  beneficiaire_genre text,
  reponses jsonb NOT NULL DEFAULT '{}'::jsonb,
  commentaire text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_evaluations_action ON public.evaluations(action_id);

ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "evaluations_select_authenticated"
  ON public.evaluations FOR SELECT TO authenticated USING (true);

CREATE POLICY "evaluations_insert"
  ON public.evaluations FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(),'superadmin')
    OR ((public.has_role(auth.uid(),'admin_asso') OR public.has_role(auth.uid(),'agent'))
        AND public.action_assoc_id(action_id) = public.user_assoc_id(auth.uid()))
  );

CREATE POLICY "evaluations_update"
  ON public.evaluations FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(),'superadmin')
    OR ((public.has_role(auth.uid(),'admin_asso') OR public.has_role(auth.uid(),'agent'))
        AND public.action_assoc_id(action_id) = public.user_assoc_id(auth.uid()))
  );

CREATE POLICY "evaluations_delete"
  ON public.evaluations FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(),'superadmin')
    OR ((public.has_role(auth.uid(),'admin_asso') OR public.has_role(auth.uid(),'agent'))
        AND public.action_assoc_id(action_id) = public.user_assoc_id(auth.uid()))
  );
