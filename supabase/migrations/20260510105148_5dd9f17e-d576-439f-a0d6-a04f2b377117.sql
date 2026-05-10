
ALTER TABLE public.associations
  ADD COLUMN IF NOT EXISTS login text,
  ADD COLUMN IF NOT EXISTS password text;

ALTER TABLE public.actions
  ADD COLUMN IF NOT EXISTS type_action text,
  ADD COLUMN IF NOT EXISTS annee integer,
  ADD COLUMN IF NOT EXISTS heure_debut text,
  ADD COLUMN IF NOT EXISTS heure_fin text,
  ADD COLUMN IF NOT EXISTS duree text,
  ADD COLUMN IF NOT EXISTS jours text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS recurrence text,
  ADD COLUMN IF NOT EXISTS recurrence_detail text,
  ADD COLUMN IF NOT EXISTS recurrence_fin date,
  ADD COLUMN IF NOT EXISTS recurrence_nb integer,
  ADD COLUMN IF NOT EXISTS thematique text,
  ADD COLUMN IF NOT EXISTS quartiers text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS tranches_age text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS fonctions text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS lieux jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS lieu_principal text,
  ADD COLUMN IF NOT EXISTS budget_financeurs jsonb DEFAULT '[]'::jsonb;
