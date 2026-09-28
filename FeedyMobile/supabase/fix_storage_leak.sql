-- ============================================================
-- Feedy - Correctif : bucket de stockage "images" ouvert a tous
-- A executer dans Supabase > SQL Editor, sur le projet de prod.
--
-- Constat : n'importe qui (sans compte) peut aujourd'hui uploader,
-- ECRASER ou supprimer n'importe quel fichier du bucket "images"
-- (avatars/ et donations/). Verifie en conditions reelles :
-- un upload anonyme et un ecrasement de fichier existant ont
-- fonctionne sans aucune authentification.
--
-- ETAPE 0 (a faire AVANT le reste) : regarde les policies existantes
-- sur storage.objects pour reperer celle(s) trop permissive(s).
-- ============================================================

select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'storage' and tablename = 'objects';

-- ------------------------------------------------------------
-- Confirme : 4 policies "Autoriser tout 1ffg0oo_0/1/2/3" ouvrent
-- SELECT/INSERT/UPDATE/DELETE a "public" sans aucune restriction
-- (qual/with_check = juste bucket_id='images'). Ce sont elles la
-- cause de la faille. On les supprime avant de poser les nouvelles.
-- ------------------------------------------------------------
drop policy if exists "Autoriser tout 1ffg0oo_0" on storage.objects;
drop policy if exists "Autoriser tout 1ffg0oo_1" on storage.objects;
drop policy if exists "Autoriser tout 1ffg0oo_2" on storage.objects;
drop policy if exists "Autoriser tout 1ffg0oo_3" on storage.objects;


-- ETAPE 1 : lecture publique conservee (les photos doivent rester
-- visibles par tous, connectes ou non, comme aujourd'hui).
drop policy if exists "images_public_read" on storage.objects;
create policy "images_public_read"
on storage.objects for select
using ( bucket_id = 'images' );


-- ETAPE 2 : upload reserve aux utilisateurs connectes,
-- uniquement dans avatars/ ou donations/, et un avatar ne peut
-- etre depose que sous le propre user_id de celui qui upload
-- (le nom de fichier cote app est toujours "avatars/{user_id}_...").
drop policy if exists "images_authenticated_upload" on storage.objects;
create policy "images_authenticated_upload"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'images'
  and (
    (name like 'donations/%')
    or (
      name like 'avatars/%'
      and split_part(split_part(name, '/', 2), '_', 1) = auth.uid()::text
    )
  )
);


-- ETAPE 3 : un fichier ne peut etre modifie/ecrase que par celui
-- qui l'a uploade (colonne "owner", remplie automatiquement par
-- Supabase Storage a l'upload quand l'utilisateur est connecte).
drop policy if exists "images_owner_update" on storage.objects;
create policy "images_owner_update"
on storage.objects for update
to authenticated
using ( bucket_id = 'images' and owner = auth.uid() )
with check ( bucket_id = 'images' and owner = auth.uid() );


-- ETAPE 4 : idem pour la suppression.
drop policy if exists "images_owner_delete" on storage.objects;
create policy "images_owner_delete"
on storage.objects for delete
to authenticated
using ( bucket_id = 'images' and owner = auth.uid() );


-- ============================================================
-- Note : les fichiers deja presents AVANT ce correctif (uploades
-- de facon anonyme, donc avec owner = null, y compris le fichier
-- que j'ai accidentellement ecrase pendant le test) ne pourront
-- plus etre modifies/supprimes par personne via l'app une fois
-- ce correctif applique (owner ne correspondra a aucun auth.uid()).
-- Pour les nettoyer, passe par Dashboard > Storage (les actions du
-- dashboard utilisent la cle service_role et ne sont pas soumises
-- a ces policies).
--
-- Verification rapide APRES le script (sans etre connecte) :
--   upload : doit echouer (401/403)
--   ecraser un fichier existant : doit echouer (401/403)
--   lire une image existante : doit toujours marcher (200)
-- ============================================================
