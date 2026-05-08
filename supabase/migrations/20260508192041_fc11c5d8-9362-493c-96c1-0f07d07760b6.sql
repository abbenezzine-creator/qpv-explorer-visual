
CREATE TABLE public.thematic_themes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  questions_before JSONB NOT NULL DEFAULT '[]'::jsonb,
  questions_after JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.thematic_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  theme_id UUID REFERENCES public.thematic_themes(id) ON DELETE CASCADE,
  theme_name TEXT NOT NULL,
  phase TEXT NOT NULL CHECK (phase IN ('avant','apres')),
  common JSONB NOT NULL DEFAULT '{}'::jsonb,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_thematic_responses_theme ON public.thematic_responses(theme_id);
CREATE INDEX idx_thematic_responses_phase ON public.thematic_responses(phase);

ALTER TABLE public.thematic_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thematic_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "themes_select_all" ON public.thematic_themes FOR SELECT USING (true);
CREATE POLICY "themes_insert_all" ON public.thematic_themes FOR INSERT WITH CHECK (true);
CREATE POLICY "themes_update_all" ON public.thematic_themes FOR UPDATE USING (true);
CREATE POLICY "themes_delete_all" ON public.thematic_themes FOR DELETE USING (true);

CREATE POLICY "responses_select_all" ON public.thematic_responses FOR SELECT USING (true);
CREATE POLICY "responses_insert_all" ON public.thematic_responses FOR INSERT WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_themes_updated BEFORE UPDATE ON public.thematic_themes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.thematic_themes (name, description, questions_before, questions_after) VALUES
('Emploi & insertion', 'Lever les freins à l''emploi et mobiliser les compétences',
 '[
   {"id":"freins","label":"Aviez-vous différents freins avant cette action ?","type":"multi","options":["Mobilité","Garde d''enfants","Maîtrise du français","Numérique","Logement","Santé","Aucun"]},
   {"id":"situation_pro","label":"Situation professionnelle actuelle","type":"single","options":["Sans emploi","En formation","En recherche active","Emploi précaire","Autre"]}
 ]'::jsonb,
 '[
   {"id":"freins_leves","label":"Cette action vous a-t-elle permis de lever des freins ?","type":"single","options":["Oui, totalement","Oui, partiellement","Non"]},
   {"id":"competences","label":"Avez-vous mobilisé / acquis des compétences ?","type":"single","options":["Oui","En partie","Non"]},
   {"id":"resultat","label":"Cette action vous a-t-elle permis d''accéder à…","type":"multi","options":["Un emploi","Une formation","Un stage","Un accompagnement","Autre"]},
   {"id":"besoins","label":"Quelles actions complémentaires vous seraient encore nécessaires ? (besoins identifiés)","type":"text"}
 ]'::jsonb),
('Parentalité', 'Soutien à la fonction parentale',
 '[{"id":"diff","label":"Quelles difficultés rencontrez-vous ?","type":"multi","options":["Communication enfants","Scolarité","Santé","Isolement","Aucune"]}]'::jsonb,
 '[{"id":"apport","label":"Cette action vous a apporté…","type":"multi","options":["Outils éducatifs","Lien avec d''autres parents","Confiance","Aucun apport"]},
   {"id":"besoins","label":"Besoins complémentaires","type":"text"}]'::jsonb),
('Lien social', 'Renforcer le lien social et lutter contre l''isolement',
 '[{"id":"isolement","label":"Vous sentez-vous isolé(e) ?","type":"single","options":["Beaucoup","Un peu","Pas du tout"]}]'::jsonb,
 '[{"id":"effet","label":"Avez-vous noué de nouveaux liens ?","type":"single","options":["Oui, beaucoup","Oui, un peu","Non"]},
   {"id":"besoins","label":"Besoins complémentaires","type":"text"}]'::jsonb);
