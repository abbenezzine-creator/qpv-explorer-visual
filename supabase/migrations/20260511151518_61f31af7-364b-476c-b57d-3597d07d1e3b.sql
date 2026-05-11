
-- 1. Ajouts table associations
ALTER TABLE public.associations
  ADD COLUMN IF NOT EXISTS autorisation_modif boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_contact text,
  ADD COLUMN IF NOT EXISTS auth_email text UNIQUE;

CREATE INDEX IF NOT EXISTS associations_login_lower_idx ON public.associations (lower(login));

-- 2. Table access_alerts (alertes "accès oublié")
CREATE TABLE IF NOT EXISTS public.access_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assoc_id uuid REFERENCES public.associations(id) ON DELETE CASCADE,
  login_attempted text,
  type text NOT NULL DEFAULT 'forgot_password',
  message text,
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS access_alerts_unresolved_idx ON public.access_alerts (assoc_id) WHERE resolved = false;
CREATE INDEX IF NOT EXISTS access_alerts_created_idx ON public.access_alerts (created_at DESC);

ALTER TABLE public.access_alerts ENABLE ROW LEVEL SECURITY;

-- Lecture: superadmin uniquement
CREATE POLICY "alerts_select_superadmin" ON public.access_alerts
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'superadmin'::app_role));

-- Update (résolution): superadmin uniquement
CREATE POLICY "alerts_update_superadmin" ON public.access_alerts
  FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'superadmin'::app_role));

-- Delete: superadmin uniquement
CREATE POLICY "alerts_delete_superadmin" ON public.access_alerts
  FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'superadmin'::app_role));

-- Insert: les alertes sont créées par une edge function avec service role,
-- donc on n'autorise pas l'insert depuis le client.

-- 3. RPC pour résoudre un login → email auth (utilisable avant login, security definer)
CREATE OR REPLACE FUNCTION public.resolve_login_to_email(_login text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth_email
  FROM public.associations
  WHERE lower(login) = lower(trim(_login))
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.resolve_login_to_email(text) TO anon, authenticated;
