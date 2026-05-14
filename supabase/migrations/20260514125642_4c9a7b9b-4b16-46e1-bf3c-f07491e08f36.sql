CREATE POLICY "docs_storage_select_visible" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'documents' AND EXISTS (
    SELECT 1 FROM public.documents d
    WHERE d.file_path = storage.objects.name
      AND (d.visible_all = true OR private.user_assoc_id(auth.uid()) = ANY(d.visible_assoc_ids))
  )
);