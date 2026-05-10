-- Table documents
CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assoc_id uuid NOT NULL,
  titre text NOT NULL,
  type text,
  description text,
  url text,
  file_path text,
  file_size bigint,
  mime_type text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "documents_select" ON public.documents
  FOR SELECT TO authenticated
  USING (
    private.has_role(auth.uid(), 'superadmin'::app_role)
    OR assoc_id = private.user_assoc_id(auth.uid())
  );

CREATE POLICY "documents_insert" ON public.documents
  FOR INSERT TO authenticated
  WITH CHECK (
    private.has_role(auth.uid(), 'superadmin'::app_role)
    OR (
      (private.has_role(auth.uid(), 'admin_asso'::app_role) OR private.has_role(auth.uid(), 'agent'::app_role))
      AND assoc_id = private.user_assoc_id(auth.uid())
    )
  );

CREATE POLICY "documents_update" ON public.documents
  FOR UPDATE TO authenticated
  USING (
    private.has_role(auth.uid(), 'superadmin'::app_role)
    OR (
      (private.has_role(auth.uid(), 'admin_asso'::app_role) OR private.has_role(auth.uid(), 'agent'::app_role))
      AND assoc_id = private.user_assoc_id(auth.uid())
    )
  );

CREATE POLICY "documents_delete" ON public.documents
  FOR DELETE TO authenticated
  USING (
    private.has_role(auth.uid(), 'superadmin'::app_role)
    OR (
      (private.has_role(auth.uid(), 'admin_asso'::app_role) OR private.has_role(auth.uid(), 'agent'::app_role))
      AND assoc_id = private.user_assoc_id(auth.uid())
    )
  );

CREATE TRIGGER set_documents_updated_at BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Bucket privé pour les fichiers
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies : chemin = {assoc_id}/...
CREATE POLICY "docs_storage_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'documents' AND (
      private.has_role(auth.uid(), 'superadmin'::app_role)
      OR (storage.foldername(name))[1] = private.user_assoc_id(auth.uid())::text
    )
  );

CREATE POLICY "docs_storage_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documents' AND (
      private.has_role(auth.uid(), 'superadmin'::app_role)
      OR (
        (private.has_role(auth.uid(), 'admin_asso'::app_role) OR private.has_role(auth.uid(), 'agent'::app_role))
        AND (storage.foldername(name))[1] = private.user_assoc_id(auth.uid())::text
      )
    )
  );

CREATE POLICY "docs_storage_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'documents' AND (
      private.has_role(auth.uid(), 'superadmin'::app_role)
      OR (
        (private.has_role(auth.uid(), 'admin_asso'::app_role) OR private.has_role(auth.uid(), 'agent'::app_role))
        AND (storage.foldername(name))[1] = private.user_assoc_id(auth.uid())::text
      )
    )
  );