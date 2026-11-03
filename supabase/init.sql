-- PokéWishlist : schéma de la base Supabase (PostgreSQL).
--
-- À exécuter une fois dans le projet Supabase (SQL Editor → coller → Run).
-- Le script est rejouable : le relancer ne casse rien et ne supprime aucune donnée.
--
-- Il reprend les règles métier de l'API (api/src/wishlist-store.ts), mais cette fois
-- garanties par la base elle-même, quel que soit le programme qui écrit dedans :
--   · 5e génération uniquement (n° 494 à 649)
--   · pas de doublon            (clé primaire sur le numéro)
--   · 6 Pokémon au maximum      (déclencheur)

-- 1. La table ---------------------------------------------------------------

create table if not exists public.wishlist (
  -- Numéro du Pokédex national : clé primaire → un même Pokémon ne peut pas être ajouté deux fois.
  id         smallint    primary key
             constraint wishlist_id_gen5 check (id between 494 and 649),
  -- Nom anglais (PokéAPI), ex. « snivy ».
  name       text        not null
             constraint wishlist_name_length check (char_length(btrim(name)) between 1 and 50),
  -- Nom français, ex. « Vipélierre ».
  fr_name    text        not null
             constraint wishlist_fr_name_length check (char_length(btrim(fr_name)) between 1 and 50),
  -- Adresses des images (facultatives).
  sprite     text        constraint wishlist_sprite_url check (sprite ~ '^https?://'),
  icon       text        constraint wishlist_icon_url   check (icon   ~ '^https?://'),
  -- Types élémentaires : 2 au plus, parmi les 18 types officiels.
  types      text[]      not null default '{}'
             constraint wishlist_types_count check (cardinality(types) <= 2)
             constraint wishlist_types_known check (types <@ array[
               'normal', 'fire', 'water', 'grass', 'electric', 'ice',
               'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug',
               'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy'
             ]::text[]),
  captured   boolean     not null default false,
  added_at   timestamptz not null default now()
);

comment on table  public.wishlist          is 'Pokémon de 5e génération à capturer (6 au maximum).';
comment on column public.wishlist.id       is 'Numéro du Pokédex national (494 à 649).';
comment on column public.wishlist.fr_name  is 'Nom français affiché dans l''interface.';
comment on column public.wishlist.captured is 'true une fois le Pokémon capturé.';

-- Ordre d'affichage de l'appli : par date d'ajout.
create index if not exists wishlist_added_at_idx on public.wishlist (added_at);

-- 2. La limite de 6 ------------------------------------------------------------
-- Une contrainte CHECK ne voit qu'une ligne à la fois : pour compter les lignes, il faut un déclencheur.

create or replace function public.wishlist_enforce_max()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Verrou de transaction : deux ajouts simultanés ne peuvent pas compter « 5 » en même temps.
  perform pg_advisory_xact_lock(hashtext('public.wishlist'));
  if (select count(*) from public.wishlist) >= 6 then
    raise exception 'La wishlist est pleine (6 Pokémon maximum)'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists wishlist_max_6 on public.wishlist;
create trigger wishlist_max_6
  before insert on public.wishlist
  for each row execute function public.wishlist_enforce_max();

-- 3. Sécurité --------------------------------------------------------------------
-- Supabase expose automatiquement chaque table en API REST avec la clé publique « anon ».
-- RLS activé SANS politique = cette porte est fermée : seule notre API Hono (clé serveur)
-- et le tableau de bord Supabase pourront lire ou écrire.

alter table public.wishlist enable row level security;
