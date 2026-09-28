-- ============================================================
-- Feedy - Corrige la concurrence sur l'acceptation de demandes
--
-- Constat verifie en conditions reelles : si deux demandes sur le
-- meme don sont acceptees en meme temps (ou tres rapprochees), le
-- code actuel (lire le stock -> calculer -> ecrire) permet aux
-- deux d'aboutir meme si leur somme depasse le stock disponible.
-- Aucune erreur n'est remontee au donateur : le compteur de
-- portions finit juste sur une valeur incoherente.
--
-- Cette fonction rend l'operation atomique : elle verrouille la
-- ligne du don (SELECT ... FOR UPDATE) le temps de verifier et
-- decrementer le stock. Un deuxieme appel concurrent sur le meme
-- don doit attendre que le premier ait fini, puis voit le stock
-- deja a jour et peut donc correctement refuser si insuffisant.
-- ============================================================

create or replace function public.accept_donation_request(p_conversation_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_donation_id uuid;
  v_owner_id uuid;
  v_requested integer;
  v_portions_raw text;
  v_current integer;
  v_new integer;
begin
  select c.donation_id, c.owner_id, c.requested_portions
    into v_donation_id, v_owner_id, v_requested
  from public.conversations c
  where c.id = p_conversation_id
  for update;

  if v_donation_id is null then
    return json_build_object('success', false, 'message', 'Conversation introuvable');
  end if;

  if auth.uid() is distinct from v_owner_id then
    return json_build_object('success', false, 'message', 'Non autorise');
  end if;

  -- Verrouille la ligne du don : un appel concurrent sur le meme
  -- don attend ici que cette transaction se termine.
  select portions into v_portions_raw
  from public.donations
  where id = v_donation_id
  for update;

  if v_portions_raw ~ '^[0-9]+$' then
    v_current := v_portions_raw::integer;
    v_requested := coalesce(v_requested, 0);

    if v_requested > v_current then
      return json_build_object('success', false, 'message', 'Stock insuffisant', 'available', v_current);
    end if;

    v_new := greatest(0, v_current - v_requested);
    update public.donations set portions = v_new::text where id = v_donation_id;
  end if;

  update public.conversations set status = 'accepted' where id = p_conversation_id;

  return json_build_object('success', true, 'message', 'OK');
end;
$$;

grant execute on function public.accept_donation_request(uuid) to authenticated;
