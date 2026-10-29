-- Retain fields already collected by the creator forms, under existing row policies.
alter table public.creator_profiles add column if not exists skills text[] not null default '{}';
alter table public.creator_profiles add constraint creator_skills_valid check (skills <@ array['photographer','videographer']::text[]);
alter table public.applications add column if not exists handles jsonb not null default '{}';
alter table public.applications add constraint application_handles_object check (jsonb_typeof(handles)='object' and octet_length(handles::text)<=10000);
create or replace function private.guard_application_handles() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if tg_op='UPDATE' and new.handles is distinct from old.handles then
  if (select auth.uid()) is distinct from old.creator_id or old.status <> 'applied' then
   raise exception 'Only the creator can edit social handles before acceptance';
  end if;
 end if;
 return new;
end;$$;
revoke all on function private.guard_application_handles() from public,anon,authenticated;
create trigger applications_handles_guard before update on public.applications for each row execute function private.guard_application_handles();
