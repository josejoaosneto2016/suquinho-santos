begin;
do $$ declare test_name text := 'rls_smoke_' || replace(gen_random_uuid()::text, '-', ''); is_protected boolean; begin
  if has_function_privilege('anon', 'public.rls_auto_enable()', 'EXECUTE') or has_function_privilege('authenticated', 'public.rls_auto_enable()', 'EXECUTE') then raise exception 'Função de RLS exposta'; end if;
  execute format('create table public.%I (id integer)', test_name);
  select relrowsecurity into is_protected from pg_class where oid = format('public.%I', test_name)::regclass;
  if not is_protected then raise exception 'RLS automático não protegeu a tabela de teste'; end if;
end $$;
rollback;
select 'RLS automático continua ativo e a função não pode ser chamada pela API.' as result;
