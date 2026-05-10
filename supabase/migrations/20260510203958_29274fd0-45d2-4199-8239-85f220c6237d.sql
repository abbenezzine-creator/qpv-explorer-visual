
-- Allow documents to be owned globally (superadmin uploads) and add visibility controls
ALTER TABLE public.documents ALTER COLUMN assoc_id DROP NOT NULL;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS visible_all boolean NOT NULL DEFAULT false;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS visible_assoc_ids uuid[] NOT NULL DEFAULT '{}';

-- Replace SELECT policy to honor visibility
DROP POLICY IF EXISTS documents_select ON public.documents;
CREATE POLICY documents_select ON public.documents
FOR SELECT TO authenticated
USING (
  private.has_role(auth.uid(), 'superadmin'::app_role)
  OR visible_all = true
  OR assoc_id = private.user_assoc_id(auth.uid())
  OR private.user_assoc_id(auth.uid()) = ANY(visible_assoc_ids)
);

-- Allow superadmins to insert with NULL assoc_id; keep assoc-scoped rule for others
DROP POLICY IF EXISTS documents_insert ON public.documents;
CREATE POLICY documents_insert ON public.documents
FOR INSERT TO authenticated
WITH CHECK (
  private.has_role(auth.uid(), 'superadmin'::app_role)
  OR (
    (private.has_role(auth.uid(), 'admin_asso'::app_role) OR private.has_role(auth.uid(), 'agent'::app_role))
    AND assoc_id = private.user_assoc_id(auth.uid())
  )
);

DROP POLICY IF EXISTS documents_update ON public.documents;
CREATE POLICY documents_update ON public.documents
FOR UPDATE TO authenticated
USING (
  private.has_role(auth.uid(), 'superadmin'::app_role)
  OR (
    (private.has_role(auth.uid(), 'admin_asso'::app_role) OR private.has_role(auth.uid(), 'agent'::app_role))
    AND assoc_id = private.user_assoc_id(auth.uid())
  )
);

DROP POLICY IF EXISTS documents_delete ON public.documents;
CREATE POLICY documents_delete ON public.documents
FOR DELETE TO authenticated
USING (
  private.has_role(auth.uid(), 'superadmin'::app_role)
  OR (
    (private.has_role(auth.uid(), 'admin_asso'::app_role) OR private.has_role(auth.uid(), 'agent'::app_role))
    AND assoc_id = private.user_assoc_id(auth.uid())
  )
);
