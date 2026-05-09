CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION private.user_assoc_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT assoc_id FROM public.profiles WHERE id = _user_id
$$;

CREATE OR REPLACE FUNCTION private.action_assoc_id(_action_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT assoc_id FROM public.actions WHERE id = _action_id
$$;

GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION private.user_assoc_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.action_assoc_id(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.user_assoc_id(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.action_assoc_id(uuid) FROM authenticated;

ALTER POLICY "Superadmins can view all profiles"
ON public.profiles
USING (private.has_role(auth.uid(), 'superadmin'::public.app_role));

ALTER POLICY "Superadmins can insert profiles"
ON public.profiles
WITH CHECK (private.has_role(auth.uid(), 'superadmin'::public.app_role));

ALTER POLICY "Superadmins can update any profile"
ON public.profiles
USING (private.has_role(auth.uid(), 'superadmin'::public.app_role));

ALTER POLICY "Superadmins can delete profiles"
ON public.profiles
USING (private.has_role(auth.uid(), 'superadmin'::public.app_role));

ALTER POLICY "Superadmins can view all roles"
ON public.user_roles
USING (private.has_role(auth.uid(), 'superadmin'::public.app_role));

ALTER POLICY "Superadmins can manage roles insert"
ON public.user_roles
WITH CHECK (private.has_role(auth.uid(), 'superadmin'::public.app_role));

ALTER POLICY "Superadmins can manage roles update"
ON public.user_roles
USING (private.has_role(auth.uid(), 'superadmin'::public.app_role));

ALTER POLICY "Superadmins can manage roles delete"
ON public.user_roles
USING (private.has_role(auth.uid(), 'superadmin'::public.app_role));

ALTER POLICY "Superadmins can insert associations"
ON public.associations
WITH CHECK (private.has_role(auth.uid(), 'superadmin'::public.app_role));

ALTER POLICY "Superadmins can update associations"
ON public.associations
USING (private.has_role(auth.uid(), 'superadmin'::public.app_role));

ALTER POLICY "Superadmins can delete associations"
ON public.associations
USING (private.has_role(auth.uid(), 'superadmin'::public.app_role));

ALTER POLICY actions_insert
ON public.actions
WITH CHECK (
  private.has_role(auth.uid(), 'superadmin'::public.app_role)
  OR (
    (private.has_role(auth.uid(), 'admin_asso'::public.app_role) OR private.has_role(auth.uid(), 'agent'::public.app_role))
    AND assoc_id = private.user_assoc_id(auth.uid())
  )
);

ALTER POLICY actions_update
ON public.actions
USING (
  private.has_role(auth.uid(), 'superadmin'::public.app_role)
  OR (
    (private.has_role(auth.uid(), 'admin_asso'::public.app_role) OR private.has_role(auth.uid(), 'agent'::public.app_role))
    AND assoc_id = private.user_assoc_id(auth.uid())
  )
);

ALTER POLICY actions_delete
ON public.actions
USING (
  private.has_role(auth.uid(), 'superadmin'::public.app_role)
  OR (
    (private.has_role(auth.uid(), 'admin_asso'::public.app_role) OR private.has_role(auth.uid(), 'agent'::public.app_role))
    AND assoc_id = private.user_assoc_id(auth.uid())
  )
);

ALTER POLICY evaluations_insert
ON public.evaluations
WITH CHECK (
  private.has_role(auth.uid(), 'superadmin'::public.app_role)
  OR (
    (private.has_role(auth.uid(), 'admin_asso'::public.app_role) OR private.has_role(auth.uid(), 'agent'::public.app_role))
    AND private.action_assoc_id(action_id) = private.user_assoc_id(auth.uid())
  )
);

ALTER POLICY evaluations_update
ON public.evaluations
USING (
  private.has_role(auth.uid(), 'superadmin'::public.app_role)
  OR (
    (private.has_role(auth.uid(), 'admin_asso'::public.app_role) OR private.has_role(auth.uid(), 'agent'::public.app_role))
    AND private.action_assoc_id(action_id) = private.user_assoc_id(auth.uid())
  )
);

ALTER POLICY evaluations_delete
ON public.evaluations
USING (
  private.has_role(auth.uid(), 'superadmin'::public.app_role)
  OR (
    (private.has_role(auth.uid(), 'admin_asso'::public.app_role) OR private.has_role(auth.uid(), 'agent'::public.app_role))
    AND private.action_assoc_id(action_id) = private.user_assoc_id(auth.uid())
  )
);