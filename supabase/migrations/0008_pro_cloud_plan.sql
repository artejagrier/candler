-- Additive: allow Pro's 50 GB cloud_plan. Do not rewrite 0004.
do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'subscriptions'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) like '%cloud_plan%'
  loop
    execute format('alter table public.subscriptions drop constraint %I', constraint_name);
  end loop;
end $$;

alter table public.subscriptions
  add constraint subscriptions_cloud_plan_check
  check (cloud_plan in ('free', 'pro', 'cloud500', 'cloud1tb'));
