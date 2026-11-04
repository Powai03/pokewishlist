create table public.pokemon_likes (
  pokemon_id smallint primary key
    constraint pokemon_likes_id_gen5 check (pokemon_id between 494 and 649),
  likes      integer not null default 0
    constraint pokemon_likes_positive check (likes >= 0),
  updated_at timestamptz not null default now()
);

comment on table public.pokemon_likes is 'Nombre de likes de chaque fiche Pokémon (5e génération).';
comment on column public.pokemon_likes.likes is 'Total des likes, incrémenté de façon atomique par l''API.';

alter table public.pokemon_likes enable row level security;
