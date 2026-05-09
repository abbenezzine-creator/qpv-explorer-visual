GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_assoc_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.action_assoc_id(uuid) TO authenticated;