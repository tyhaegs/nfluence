begin;
create temp table qa_ids as select gen_random_uuid() c,gen_random_uuid() b,gen_random_uuid() cid,gen_random_uuid() aid;
insert into auth.users(id,email,raw_user_meta_data) select c,'qa-'||c||'@example.invalid','{"role":"creator"}'::jsonb from qa_ids union all select b,'qa-'||b||'@example.invalid','{"role":"brand"}'::jsonb from qa_ids;
grant select on qa_ids to authenticated;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
insert into public.campaigns(id,brand_id,name,brand_name,deadline,stage) select cid,b,'QA profile audit','QA','30 days','open' from qa_ids;
select set_config('request.jwt.claims',jsonb_build_object('sub',c,'role','authenticated')::text,true) from qa_ids;
set local role authenticated;
insert into public.creator_profiles(id,skills) select c,array['photographer'] from qa_ids;
update public.profiles set name='Updated creator' where id=(select c from qa_ids);
insert into public.applications(id,campaign_id,creator_id,name,handles) select aid,cid,c,'Updated creator','{"Instagram":"@auditcreator"}'::jsonb from qa_ids;
do $$begin
 if (select skills from public.creator_profiles where id=(select c from qa_ids))<>array['photographer'] then raise exception 'Skills lost';end if;
 if (select name from public.profiles where id=(select c from qa_ids))<>'Updated creator' then raise exception 'Name lost';end if;
end$$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',b,'role','authenticated')::text,true) from qa_ids;
set local role authenticated;
do $$begin
 if (select handles->>'Instagram' from public.applications where id=(select aid from qa_ids))<>'@auditcreator' then raise exception 'Handles lost';end if;
 begin update public.applications set handles='{}' where id=(select aid from qa_ids);raise exception 'TEST FAILED';exception when raise_exception then if sqlerrm='TEST FAILED' then raise;end if;end;
end$$;
update public.applications set status='accepted',stage='accepted' where id=(select aid from qa_ids);
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',c,'role','authenticated')::text,true) from qa_ids;
set local role authenticated;
do $$begin
 begin update public.applications set handles='{}' where id=(select aid from qa_ids);raise exception 'TEST FAILED';exception when raise_exception then if sqlerrm='TEST FAILED' then raise;end if;end;
end$$;
reset role;
rollback;
select 'Skills, name and handles persisted; brand tampering and accepted-handle changes denied; fixtures rolled back' result;
