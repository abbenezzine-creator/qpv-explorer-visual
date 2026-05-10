ALTER TABLE public.actions
DROP CONSTRAINT IF EXISTS actions_statut_check;

ALTER TABLE public.actions
ADD CONSTRAINT actions_statut_check
CHECK (statut = ANY (ARRAY[
  'planifiee'::text,
  'en_cours'::text,
  'recurrent'::text,
  'terminee'::text,
  'favorable'::text,
  'non_retenu'::text,
  'ajournee'::text,
  'oriente'::text,
  'annulee'::text
]));