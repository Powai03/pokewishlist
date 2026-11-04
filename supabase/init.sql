create table if not exists public.wishlist (
  id         smallint    primary key
             constraint wishlist_id_gen5 check (id between 494 and 649),
  name       text        not null
             constraint wishlist_name_length check (char_length(btrim(name)) between 1 and 50),
  fr_name    text        not null
             constraint wishlist_fr_name_length check (char_length(btrim(fr_name)) between 1 and 50),
  sprite     text        constraint wishlist_sprite_url check (sprite ~ '^https?://'),
  icon       text        constraint wishlist_icon_url   check (icon   ~ '^https?://'),
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

create index if not exists wishlist_added_at_idx on public.wishlist (added_at);

create or replace function public.wishlist_enforce_max()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
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

alter table public.wishlist enable row level security;
