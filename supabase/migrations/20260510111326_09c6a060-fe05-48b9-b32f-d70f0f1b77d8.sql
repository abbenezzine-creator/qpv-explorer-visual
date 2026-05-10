ALTER TABLE public.associations
  ADD COLUMN IF NOT EXISTS statut_contact text,
  ADD COLUMN IF NOT EXISTS contact_nom text,
  ADD COLUMN IF NOT EXISTS adresse text,
  ADD COLUMN IF NOT EXISTS code_postal text,
  ADD COLUMN IF NOT EXISTS ville text;