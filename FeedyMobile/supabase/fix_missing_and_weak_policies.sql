-- ============================================================
-- Feedy - Correctif : policies manquantes + policies trop faibles
-- A executer dans Supabase > SQL Editor.
--
-- L'audit en lecture seule a montre que seules des policies
-- INSERT et SELECT existent sur donations/conversations/messages/
-- profiles. Sans policy UPDATE/DELETE, ces actions sont bloquees
-- pour TOUT LE MONDE (RLS activee + aucune policy = refus par
-- defaut) -- meme le proprietaire legitime. Concretement, avant ce
-- correctif : modifier un don, accepter/refuser une demande,
-- supprimer une conversation, modifier son profil... ne marchent
-- pour PERSONNE.
--
-- Deux policies INSERT existantes sont aussi trop permissives :
--  - "Créer un don" verifie juste que tu es connecte, pas que le
--    don t'appartient -> un utilisateur connecte pouvait creer un
--    don au nom de n'importe qui (user_id arbitraire).
--  - "Créer un message" verifie juste que tu es l'expediteur, pas
--    que tu fais partie de la conversation -> un utilisateur
--    connecte pouvait injecter un message dans une conversation
--    privee d'autres personnes.
-- ============================================================

-- 1) DONATIONS -------------------------------------------------

drop policy if exists "Créer un don" on public.donations;
create policy "Créer un don"
on public.donations for insert
to public
with check ( auth.uid() = user_id );

drop policy if exists "Modifier son propre don" on public.donations;
create policy "Modifier son propre don"
on public.donations for update
to public
using ( auth.uid() = user_id )
with check ( auth.uid() = user_id );

drop policy if exists "Supprimer son propre don" on public.donations;
create policy "Supprimer son propre don"
on public.donations for delete
to public
using ( auth.uid() = user_id );


-- 2) PROFILES ----------------------------------------------------

drop policy if exists "Modifier son propre profil" on public.profiles;
create policy "Modifier son propre profil"
on public.profiles for update
to public
using ( auth.uid() = id )
with check ( auth.uid() = id );


-- 3) CONVERSATIONS -------------------------------------------------

-- renforce : owner_id doit correspondre au vrai proprietaire du don
-- (evite qu'un utilisateur adresse sa demande a n'importe qui)
drop policy if exists "Créer une conversation" on public.conversations;
create policy "Créer une conversation"
on public.conversations for insert
to public
with check (
  auth.uid() = requester_id
  and exists (
    select 1 from public.donations d
    where d.id = donation_id
      and d.user_id = owner_id
  )
);

-- seul le proprietaire du don peut accepter/refuser (correspond
-- au bouton Accepter/Refuser, deja reserve a owner_id cote app)
drop policy if exists "Repondre a une demande" on public.conversations;
create policy "Repondre a une demande"
on public.conversations for update
to public
using ( auth.uid() = owner_id )
with check ( auth.uid() = owner_id );

-- les deux participants peuvent supprimer la conversation
drop policy if exists "Supprimer sa conversation" on public.conversations;
create policy "Supprimer sa conversation"
on public.conversations for delete
to public
using ( auth.uid() = requester_id or auth.uid() = owner_id );


-- 4) MESSAGES ------------------------------------------------------

-- renforce : il faut aussi faire partie de la conversation ciblee
drop policy if exists "Créer un message" on public.messages;
create policy "Créer un message"
on public.messages for insert
to public
with check (
  auth.uid() = sender_id
  and exists (
    select 1 from public.conversations c
    where c.id = conversation_id
      and (c.requester_id = auth.uid() or c.owner_id = auth.uid())
  )
);

-- ============================================================
-- Verification rapide APRES le script, une fois connecte dans l'app :
--   - modifier un don qui t'appartient -> doit marcher
--   - modifier le don de quelqu'un d'autre -> doit echouer
--   - accepter/refuser une demande recue -> doit marcher
--   - envoyer un message dans une conversation dont tu fais partie -> ok
--   - (impossible a tester depuis l'app, mais desormais bloque) :
--     injecter un message dans la conversation privee d'autrui,
--     creer un don au nom d'un autre utilisateur
-- ============================================================
