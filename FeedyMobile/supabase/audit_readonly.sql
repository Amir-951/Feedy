-- ============================================================
-- Feedy - Audit en lecture seule (ne modifie rien).
-- Donne une vue complete des tables, de leurs droits et de
-- leurs policies RLS, pour verifier qu'il n'y a pas d'autre
-- faille que celles deja corrigees (profiles/donations/storage).
-- ============================================================

-- 1) Toutes les tables du schema public + RLS active ou non
select schemaname, tablename, rowsecurity as rls_active
from pg_tables
where schemaname = 'public'
order by tablename;

-- 2) Droits accordes a anon/authenticated, table par table et colonne par colonne
select table_name, grantee, privilege_type, column_name
from information_schema.column_privileges
where table_schema = 'public'
  and grantee in ('anon', 'authenticated')
order by table_name, grantee, privilege_type, column_name;

-- 3) Toutes les policies RLS du schema public
select tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
order by tablename, cmd;

-- 4) Fonctions "security definer" exposees (verifie qu'il n'y en a pas
--    d'autres que get_my_profile / get_donation_address, et qu'aucune
--    n'est trop permissive)
select p.proname, p.prosecdef as is_security_definer,
       pg_get_function_identity_arguments(p.oid) as args
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public';
