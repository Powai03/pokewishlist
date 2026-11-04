-- Migration 002 : classer les fiches par nombre de likes (les plus aimées d'abord).
-- Appliquée par le pipeline (job « Migrate DB ») après le merge, une seule fois.
create index pokemon_likes_ranking_idx on public.pokemon_likes (likes desc);
