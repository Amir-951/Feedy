-- ============================================================
-- Feedy - Pagination du fil de dons, trie du plus proche au
-- plus loin (calcul de distance a vol d'oiseau fait cote base
-- de donnees, comme la fonction JS calculateDistanceRaw deja
-- utilisee dans l'app, pour rester coherent).
-- ============================================================

create or replace function public.get_donations_nearby(
  user_lat double precision,
  user_lng double precision,
  page_size integer default 15,
  page_offset integer default 0
)
returns table (
  id uuid,
  title text,
  type text,
  description text,
  portions text,
  image text,
  user_id uuid,
  created_at timestamptz,
  latitude double precision,
  longitude double precision,
  is_halal boolean,
  city text,
  expires_at timestamptz,
  distance_km double precision,
  username text,
  avatar_url text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    d.id, d.title, d.type, d.description, d.portions, d.image,
    d.user_id, d.created_at, d.latitude, d.longitude, d.is_halal, d.city, d.expires_at,
    case
      when d.latitude is null or d.longitude is null or user_lat is null or user_lng is null then null
      else 6371 * acos(
        least(1, greatest(-1,
          cos(radians(user_lat)) * cos(radians(d.latitude)) * cos(radians(d.longitude) - radians(user_lng))
          + sin(radians(user_lat)) * sin(radians(d.latitude))
        ))
      )
    end as distance_km,
    p.username,
    p.avatar_url
  from public.donations d
  left join public.profiles p on p.id = d.user_id
  where (d.expires_at is null or d.expires_at > now())
  order by distance_km asc nulls last, d.created_at desc
  limit page_size offset page_offset;
$$;

grant execute on function public.get_donations_nearby(double precision, double precision, integer, integer)
  to anon, authenticated;

-- ============================================================
-- Note : si l'utilisateur ou un don n'a pas encore de coordonnees
-- GPS (latitude/longitude), distance_km ressort desormais a un
-- vrai NULL (avant : "greatest(-1, NULL)" de Postgres ignorait le
-- NULL au lieu de le propager, ce qui donnait un faux 20 015 km,
-- soit la demi-circonference terrestre). La ligne passe en fin de
-- liste (nulls last), triee alors par date recente.
-- ============================================================
