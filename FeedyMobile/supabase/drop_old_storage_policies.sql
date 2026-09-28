-- Supprime dynamiquement toutes les anciennes policies "Autoriser tout ..."
-- sur storage.objects, quel que soit leur nom exact (evite tout souci
-- d'encodage/espace invisible avec un DROP POLICY "nom en dur").
do $$
declare
  pol record;
begin
  for pol in
    select policyname
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname like 'Autoriser tout%'
  loop
    execute format('drop policy %I on storage.objects', pol.policyname);
    raise notice 'Policy supprimee : %', pol.policyname;
  end loop;
end $$;

-- Verification : ne doit plus renvoyer que les 4 policies
-- images_public_read / images_authenticated_upload / images_owner_update / images_owner_delete
select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'storage' and tablename = 'objects';
