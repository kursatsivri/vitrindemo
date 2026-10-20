-- Faz 7c: is_blocked herkese "kim kimi engelledi" sorusunu cevaplamasın.
-- Sadece iki taraftan biri (politikalar, tetikleyiciler) ya da sistem (cron: auth.uid() boş) cevap alır.
create or replace function public.is_blocked(p_blocker uuid, p_blocked uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (auth.uid() is null or auth.uid() in (p_blocker, p_blocked))
     and exists (select 1 from public.blocks where blocker_id = p_blocker and blocked_id = p_blocked);
$$;
revoke execute on function public.is_blocked(uuid, uuid) from public, anon;
grant execute on function public.is_blocked(uuid, uuid) to authenticated;
