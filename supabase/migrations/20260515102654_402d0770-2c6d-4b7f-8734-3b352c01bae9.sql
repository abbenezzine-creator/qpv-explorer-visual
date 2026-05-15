
CREATE OR REPLACE FUNCTION public.get_storage_stats()
RETURNS TABLE (
  table_name text,
  row_count bigint,
  total_bytes bigint,
  table_bytes bigint,
  index_bytes bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF NOT private.has_role(auth.uid(), 'superadmin'::app_role) THEN
    RAISE EXCEPTION 'Access denied: superadmin role required';
  END IF;

  RETURN QUERY
  SELECT
    c.relname::text AS table_name,
    COALESCE(s.n_live_tup, 0)::bigint AS row_count,
    pg_total_relation_size(c.oid)::bigint AS total_bytes,
    pg_relation_size(c.oid)::bigint AS table_bytes,
    (pg_total_relation_size(c.oid) - pg_relation_size(c.oid))::bigint AS index_bytes
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  LEFT JOIN pg_stat_user_tables s ON s.relid = c.oid
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
  ORDER BY pg_total_relation_size(c.oid) DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_storage_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_storage_stats() TO authenticated;
