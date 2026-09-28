-- Lecture seule : montre vers quelle table/colonne pointe la contrainte
-- donations_user_id_fkey (et l'equivalent pour les autres FK utiles).
select
  tc.table_name,
  kcu.column_name,
  tc.constraint_name,
  ccu.table_schema as foreign_table_schema,
  ccu.table_name as foreign_table_name,
  ccu.column_name as foreign_column_name
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
join information_schema.constraint_column_usage ccu
  on ccu.constraint_name = tc.constraint_name and ccu.table_schema = tc.table_schema
where tc.constraint_type = 'FOREIGN KEY'
  and tc.table_schema = 'public'
  and tc.table_name in ('donations', 'conversations', 'messages', 'profiles')
order by tc.table_name;

-- Verifie aussi que ton utilisateur de test existe bien dans auth.users
select id, email from auth.users where id = '6764b8a9-98e1-492e-b0e7-27d3c9895109';
