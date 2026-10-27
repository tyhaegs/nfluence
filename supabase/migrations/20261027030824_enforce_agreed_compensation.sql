begin;
alter table public.applications alter column status set not null;
alter table public.applications alter column stage set not null;
create or replace function private.guard_campaign() returns trigger language plpgsql security definer set search_path='' as $$
declare accepted integer;actor uuid:=(select auth.uid());privileged boolean:=coalesce((select auth.role())='service_role',false);
begin
 if new.name is null or length(trim(new.name))<2 or length(new.name)>180 then raise exception 'Campaign name must be 2-180 characters';end if;
 if new.spots_total is not null and (new.spots_total<1 or new.spots_total>10000) then raise exception 'Invalid creator cap';end if;
 if tg_op='INSERT' or new.deadline is distinct from old.deadline then new.closes_at:=private.resolve_deadline(new.deadline);elsif not privileged then new.closes_at:=old.closes_at;end if;
 if new.closes_at is null then raise exception 'A campaign deadline is required';end if;
 if new.featured and new.featured_weeks not in(1,7,30) then raise exception 'Choose 1, 7 or 30 days of featured placement';end if;
 if new.comp_type in('paid','product+paid') and (new.comp is null or new.comp!~'^\$?[0-9]+(\.[0-9]{1,2})?$' or coalesce(nullif(regexp_replace(new.comp,'[^0-9.]','','g'),''),'0')::numeric<=0 or new.spots_total is null) then raise exception 'Paid campaigns require a positive USD amount and creator cap';end if;
 if tg_op='INSERT' then
  if not privileged and (new.brand_id<>actor or new.stage<>'draft' or new.featured) then raise exception 'Campaigns must be published through checkout';end if;
 else
  if not privileged and new.brand_id<>old.brand_id then raise exception 'Campaign ownership cannot change';end if;
  if not privileged and pg_trigger_depth()<2 and not exists(select 1 from public.profiles where id=actor and role='brand') then raise exception 'A brand account is required';end if;
  select count(*) into accepted from public.applications where campaign_id=old.id and status='accepted';
  if new.spots_total is not null and new.spots_total<accepted then raise exception 'The cap cannot be less than accepted creators';end if;
  if accepted>0 and old.comp_type in('paid','product+paid') and coalesce(nullif(regexp_replace(new.comp,'[^0-9.]','','g'),''),'0')::numeric<coalesce(nullif(regexp_replace(old.comp,'[^0-9.]','','g'),''),'0')::numeric then raise exception 'Agreed creator compensation cannot be reduced after acceptance';end if;
  if accepted>0 and (new.platforms is distinct from old.platforms or new.deliverables is distinct from old.deliverables or new.comp_type is distinct from old.comp_type) then raise exception 'Agreed platforms, deliverables and compensation type are locked after acceptance';end if;
  if not privileged and old.stage<>'draft' and (new.comp is distinct from old.comp or new.comp_type is distinct from old.comp_type or new.spots_total is distinct from old.spots_total) then raise exception 'Financial changes must be verified by checkout';end if;
  if not privileged and new.spots_filled is distinct from old.spots_filled and pg_trigger_depth()<2 then raise exception 'Capacity is maintained by the application workflow';end if;
 end if;
 return new;
end;$$;
create or replace function private.guard_review() returns trigger language plpgsql security definer set search_path='' as $$
declare owner_id uuid;
begin
 select brand_id into owner_id from public.campaigns where id=new.campaign_id;
 if new.rating is null or new.rating not between 1 and 5 or length(trim(coalesce(new.text,''))) not between 5 and 4000 or length(coalesce(new.brand_response,''))>4000 then raise exception 'Reviews need 1-5 stars and 5-4000 characters';end if;
 if tg_op='INSERT' then
  if new.creator_id is distinct from (select auth.uid()) or not exists(select 1 from public.applications where campaign_id=new.campaign_id and creator_id=new.creator_id and status='accepted' and stage in('approved','paid')) then raise exception 'Only a participating creator with approved work may review';end if;
  new.brand_id:=owner_id;new.brand_response:=null;new.submitted_at:=now();
 else
  if (select auth.uid()) is distinct from old.brand_id or (to_jsonb(new)-'brand_response') is distinct from (to_jsonb(old)-'brand_response') then raise exception 'Brands may only respond to a review, not rewrite it';end if;
 end if;
 return new;
end;$$;

commit;
