-- Restrict SELECT so association users only see their own assoc data.
-- Superadmin and partenaire keep full read access.

-- ACTIONS
DROP POLICY IF EXISTS actions_select_authenticated ON public.actions;
CREATE POLICY actions_select_scoped ON public.actions
FOR SELECT TO authenticated
USING (
  private.has_role(auth.uid(), 'superadmin'::app_role)
  OR private.has_role(auth.uid(), 'partenaire'::app_role)
  OR (assoc_id = private.user_assoc_id(auth.uid()))
);

-- EVALUATIONS
DROP POLICY IF EXISTS evaluations_select_authenticated ON public.evaluations;
CREATE POLICY evaluations_select_scoped ON public.evaluations
FOR SELECT TO authenticated
USING (
  private.has_role(auth.uid(), 'superadmin'::app_role)
  OR private.has_role(auth.uid(), 'partenaire'::app_role)
  OR (private.action_assoc_id(action_id) = private.user_assoc_id(auth.uid()))
);

-- EVALUATIONS BENEFICIAIRES
DROP POLICY IF EXISTS eb_select_authenticated ON public.evaluations_beneficiaires;
CREATE POLICY eb_select_scoped ON public.evaluations_beneficiaires
FOR SELECT TO authenticated
USING (
  private.has_role(auth.uid(), 'superadmin'::app_role)
  OR private.has_role(auth.uid(), 'partenaire'::app_role)
  OR (private.action_assoc_id(action_id) = private.user_assoc_id(auth.uid()))
);

-- REFERENTIEL QUALITE
DROP POLICY IF EXISTS rq_select_authenticated ON public.referentiel_qualite;
CREATE POLICY rq_select_scoped ON public.referentiel_qualite
FOR SELECT TO authenticated
USING (
  private.has_role(auth.uid(), 'superadmin'::app_role)
  OR private.has_role(auth.uid(), 'partenaire'::app_role)
  OR (assoc_id = private.user_assoc_id(auth.uid()))
);

-- ASSOCIATIONS: an assoc user only sees its own association row; superadmin/partenaire see all.
DROP POLICY IF EXISTS "Authenticated can view associations" ON public.associations;
CREATE POLICY associations_select_scoped ON public.associations
FOR SELECT TO authenticated
USING (
  private.has_role(auth.uid(), 'superadmin'::app_role)
  OR private.has_role(auth.uid(), 'partenaire'::app_role)
  OR (id = private.user_assoc_id(auth.uid()))
);
