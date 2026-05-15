CREATE TABLE public.theme_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thematique text NOT NULL UNIQUE,
  color_hex text NOT NULL,
  icon_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.theme_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "theme_settings_select_all"
  ON public.theme_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "theme_settings_insert_superadmin"
  ON public.theme_settings FOR INSERT
  TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "theme_settings_update_superadmin"
  ON public.theme_settings FOR UPDATE
  TO authenticated
  USING (private.has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "theme_settings_delete_superadmin"
  ON public.theme_settings FOR DELETE
  TO authenticated
  USING (private.has_role(auth.uid(), 'superadmin'::app_role));

CREATE TRIGGER theme_settings_set_updated_at
  BEFORE UPDATE ON public.theme_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed with current defaults
INSERT INTO public.theme_settings (thematique, color_hex, icon_name) VALUES
  ('Education - Sport - Jeunesse', '#0ea5e9', 'GraduationCap'),
  ('Cité éducative', '#ec4899', 'BookOpen'),
  ('Cadre de vie - Tranquillité et sûreté publique', '#8b5cf6', 'ShieldCheck'),
  ('Quartier d''été - VVV', '#d946ef', 'Plane'),
  ('Accès aux droit - Lutte contre les discrimination', '#3b82f6', 'Scale'),
  ('Emploi - Développement économique', '#f97316', 'Briefcase'),
  ('Solidarité - égalité des chances', '#10b981', 'Heart'),
  ('Transition', '#22c55e', 'Sprout');