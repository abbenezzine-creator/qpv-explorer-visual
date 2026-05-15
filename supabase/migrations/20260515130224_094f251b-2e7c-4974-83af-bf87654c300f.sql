DROP POLICY IF EXISTS documents_select ON public.documents;
CREATE POLICY documents_select ON public.documents
FOR SELECT TO authenticated
USING (
  private.has_role(auth.uid(), 'superadmin'::app_role)
  OR private.has_role(auth.uid(), 'partenaire'::app_role)
  OR (visible_all = true)
  OR (assoc_id = private.user_assoc_id(auth.uid()))
  OR (private.user_assoc_id(auth.uid()) = ANY (visible_assoc_ids))
);