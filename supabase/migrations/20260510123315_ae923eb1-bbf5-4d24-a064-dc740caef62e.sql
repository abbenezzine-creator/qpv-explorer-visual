ALTER TABLE public.actions
  ADD COLUMN IF NOT EXISTS ref text,
  ADD COLUMN IF NOT EXISTS reference_administrative text,
  ADD COLUMN IF NOT EXISTS commune text,
  ADD COLUMN IF NOT EXISTS public_quartiers jsonb NOT NULL DEFAULT '[]'::jsonb;