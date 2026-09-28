-- ============================================================
-- Feedy - Correctif : fuite des adresses (profiles + donations)
-- A executer dans Supabase > SQL Editor, sur le projet de prod.
--
-- Ce script ne touche PAS aux policies RLS existantes (insert/update
-- deja bien verrouillees). Il ajoute une restriction au niveau colonne :
-- meme si une policy RLS autorise la lecture d'une ligne, la colonne
-- "address" / "distance" (adresse exacte) ne sera plus jamais renvoyee
-- a "anon" ou "authenticated" par un simple select('*').
--
-- L'adresse exacte reste accessible uniquement via 2 fonctions
-- "security definer" qui verifient elles-memes le droit d'acces :
--   - get_my_profile()              -> l'utilisateur peut lire SA propre adresse
--   - get_donation_address(uuid)    -> le proprietaire du don, OU un
--                                      utilisateur dont la demande est "accepted"
-- ============================================================

-- 1) PROFILES : ne plus exposer "address" via select('*')
revoke select on public.profiles from anon, authenticated;
grant select (id, username, avatar_url) on public.profiles to anon, authenticated;

-- l'utilisateur doit pouvoir modifier son propre profil (username/adresse/avatar)
grant update (username, address, avatar_url) on public.profiles to authenticated;

create or replace function public.get_my_profile()
returns public.profiles
language sql
security definer
set search_path = public
stable
as $$
  select * from public.profiles where id = auth.uid();
$$;

grant execute on function public.get_my_profile() to authenticated;


-- 2) DONATIONS : ne plus exposer "distance"/"address" (adresse exacte)
--    via select('*') sur le fil public.
revoke select on public.donations from anon, authenticated;
grant select (
  id, title, type, description, portions, image, user_id,
  created_at, latitude, longitude, is_halal
) on public.donations to anon, authenticated;

create or replace function public.get_donation_address(donation_id uuid)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select d.distance
  from public.donations d
  where d.id = donation_id
    and (
      d.user_id = auth.uid()
      or exists (
        select 1 from public.conversations c
        where c.donation_id = d.id
          and c.requester_id = auth.uid()
          and c.status = 'accepted'
      )
    );
$$;

grant execute on function public.get_donation_address(uuid) to authenticated;

-- ============================================================
-- Verification rapide (a lancer APRES le script, dans le SQL editor,
-- en te reconnectant en tant qu'utilisateur anonyme "anon" via
-- "set role anon;" ou simplement en retestant depuis l'app) :
--
--   select * from public.profiles limit 1;      -- doit echouer / ne renvoyer que id,username,avatar_url
--   select * from public.donations limit 1;      -- ne doit plus contenir "distance"
--   select get_my_profile();                     -- doit marcher une fois connecte
--   select get_donation_address('<uuid>');        -- null si pas proprietaire / pas accepte
-- ============================================================
