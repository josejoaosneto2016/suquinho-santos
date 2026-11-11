-- A função de evento não precisa ser exposta pela API.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
