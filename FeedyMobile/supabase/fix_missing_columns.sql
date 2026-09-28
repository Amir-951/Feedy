-- ============================================================
-- Feedy - Ajoute les colonnes manquantes que le code attend deja
-- mais qui n'ont jamais ete creees en base (a l'origine des
-- erreurs "Could not find the 'xxx' column ... in the schema cache").
-- ============================================================

-- Bloquait l'envoi de toute demande ("Erreur lors de l'envoi")
alter table public.conversations
  add column if not exists requested_portions integer;

-- Necessaire pour l'expiration automatique des dons (cf. compte a
-- rebours deja code, et cleanupExpiredDonations() qui les supprime)
alter table public.donations
  add column if not exists expires_at timestamptz;

-- Nouvelle colonne pour afficher le nom de la ville dans le fil
-- (a cote de la distance a vol d'oiseau), sans avoir a re-geocoder
-- chaque don a chaque affichage.
alter table public.donations
  add column if not exists city text;

-- Le correctif de securite precedent (fix_address_leak.sql) a
-- restreint la lecture de "donations" a une liste explicite de
-- colonnes. Il faut y ajouter ces 2 nouvelles colonnes (adresse
-- exacte "distance" toujours exclue, comme prevu).
grant select (expires_at, city) on public.donations to anon, authenticated;
