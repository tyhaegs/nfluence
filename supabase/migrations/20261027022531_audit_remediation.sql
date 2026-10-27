-- Audited platform repairs. All privileged operations retain explicit actor checks.
begin;
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

alter table public.campaigns add column if not exists closes_at timestamptz;
alter table public.campaigns add column if not exists billing_request_id uuid;
alter table public.campaigns add column if not exists agreement_version text;
alter table public.profiles add column if not exists terms_version text;
alter table public.profiles add column if not exists terms_accepted_at timestamptz;
alter table public.content_uploads add column if not exists storage_path text;
alter table public.content_uploads add column if not exists content_type text;
alter table public.content_uploads add column if not exists size_bytes bigint;
alter table public.payments add column if not exists request_id uuid;
alter table public.payments add column if not exists currency text not null default 'usd';
alter table public.payments add column if not exists requested_changes jsonb not null default '{}'::jsonb;
alter table public.payments add column if not exists provider_status text;
alter table public.payments add column if not exists updated_at timestamptz not null default now();
create unique index if not exists payments_request_id_unique on public.payments(request_id) where request_id is not null;
create unique index if not exists payments_stripe_intent_unique on public.payments(stripe_payment_intent_id) where stripe_payment_intent_id is not null;
create unique index if not exists reviews_one_per_participation on public.reviews(campaign_id,creator_id);

create table if not exists public.profile_directory (
 id uuid primary key references public.profiles(id) on delete cascade,
 name text, role public.user_role not null, logo_url text, banner_url text,
 tagline text, bio text, website text, industry text, location text, social_links jsonb,
 active boolean not null default true
);
alter table public.profile_directory enable row level security;
create policy directory_public_read on public.profile_directory for select to anon,authenticated using(active);
grant select on public.profile_directory to anon,authenticated;
revoke insert,update,delete on public.profile_directory from anon,authenticated;
create or replace function private.sync_profile_directory() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.profile_directory(id,name,role,logo_url,banner_url,tagline,bio,website,industry,location,social_links,active)
 values(new.id,new.name,new.role,new.logo_url,new.banner_url,new.tagline,new.bio,new.website,new.industry,new.location,new.social_links,coalesce(new.active,true))
 on conflict(id) do update set name=excluded.name,role=excluded.role,logo_url=excluded.logo_url,banner_url=excluded.banner_url,tagline=excluded.tagline,bio=excluded.bio,website=excluded.website,industry=excluded.industry,location=excluded.location,social_links=excluded.social_links,active=excluded.active;
 return new;
end;$$;
drop trigger if exists profiles_directory_sync on public.profiles;
create trigger profiles_directory_sync after insert or update on public.profiles for each row execute function private.sync_profile_directory();
insert into public.profile_directory(id,name,role,logo_url,banner_url,tagline,bio,website,industry,location,social_links,active)
 select id,name,role,logo_url,banner_url,tagline,bio,website,industry,location,social_links,coalesce(active,true) from public.profiles on conflict(id) do nothing;
-- Preserve the existing first six view columns to avoid breaking consumers.
create or replace view public.profiles_public with(security_invoker=true) as
 select id,name,role,logo_url,banner_url,tagline,bio,website,industry,location,social_links from public.profile_directory where active;
grant select on public.profiles_public to anon,authenticated;

create table if not exists public.manual_payouts (
 id uuid primary key default gen_random_uuid(),application_id uuid not null unique references public.applications(id),
 brand_id uuid not null references public.profiles(id),creator_id uuid not null references public.profiles(id),
 amount_cents integer not null check(amount_cents>0),currency text not null default 'usd' check(currency='usd'),
 reference text not null check(length(trim(reference)) between 3 and 200),paid_at timestamptz not null,
 recorded_by uuid not null references public.profiles(id),created_at timestamptz not null default now()
);
alter table public.manual_payouts enable row level security;
create policy payouts_participant_read on public.manual_payouts for select to authenticated using((select auth.uid()) in(brand_id,creator_id));
create policy payouts_brand_record on public.manual_payouts for insert to authenticated with check((select auth.uid())=brand_id and recorded_by=(select auth.uid()));
grant select,insert on public.manual_payouts to authenticated;
revoke update,delete on public.manual_payouts from authenticated,anon;

create table if not exists public.billing_events (
 event_id text primary key,event_type text not null,provider_created_at timestamptz,processed_at timestamptz not null default now()
);
alter table public.billing_events enable row level security;
revoke all on public.billing_events from anon,authenticated;
create table if not exists public.annual_feature_redemptions (
 id uuid primary key default gen_random_uuid(),subscription_id uuid not null references public.subscriptions(id),
 period_start date not null,campaign_id uuid not null references public.campaigns(id),created_at timestamptz not null default now(),unique(subscription_id,period_start)
);
alter table public.annual_feature_redemptions enable row level security;
create policy annual_features_owner_read on public.annual_feature_redemptions for select to authenticated using(exists(select 1 from public.subscriptions s where s.id=subscription_id and s.brand_id=(select auth.uid())));
grant select on public.annual_feature_redemptions to authenticated;
revoke insert,update,delete on public.annual_feature_redemptions from anon,authenticated;
create table if not exists public.site_events (
 id bigint generated always as identity primary key,event text not null,route text not null,service text,created_at timestamptz not null default now()
);
alter table public.site_events enable row level security;
revoke all on public.site_events from anon,authenticated;
create index if not exists site_events_created_idx on public.site_events(created_at);

create or replace function private.resolve_deadline(value text) returns timestamptz language plpgsql stable set search_path='' as $$
declare amount integer; unit text;
begin
 if value ~ '^\d{4}-\d{2}-\d{2}$' then return (value::date+1)::timestamp at time zone 'UTC'; end if;
 if value ~ '^\d{1,3} (day|days|week|weeks|month|months)$' then
 amount:=split_part(value,' ',1)::integer;unit:=split_part(value,' ',2);
 if amount<1 or amount>365 then raise exception 'Invalid campaign duration';end if;
 return now()+make_interval(days=>case when unit like 'week%' then amount*7 when unit like 'month%' then amount*30 else amount end);
 end if;
 raise exception 'Use an ISO date or a valid campaign duration';
end;$$;
create or replace function private.guard_campaign() returns trigger language plpgsql security definer set search_path='' as $$
declare accepted integer;actor uuid:=(select auth.uid());privileged boolean:=coalesce((select auth.role())='service_role',false);
begin
 if new.name is null or length(trim(new.name))<2 or length(new.name)>180 then raise exception 'Campaign name must be 2-180 characters';end if;
 if new.spots_total is not null and (new.spots_total<1 or new.spots_total>10000) then raise exception 'Invalid creator cap';end if;
 if tg_op='INSERT' or new.deadline is distinct from old.deadline then new.closes_at:=private.resolve_deadline(new.deadline);elsif not privileged then new.closes_at:=old.closes_at;end if;
 if new.closes_at is null then raise exception 'A campaign deadline is required';end if;
 if new.featured and new.featured_weeks not in(1,7,30) then raise exception 'Choose 1, 7 or 30 days of featured placement';end if;
 if tg_op='INSERT' then
  if not privileged and (new.brand_id<>actor or new.stage<>'draft' or new.featured) then raise exception 'Campaigns must be published through checkout';end if;
 else
  if not privileged and new.brand_id<>old.brand_id then raise exception 'Campaign ownership cannot change';end if;
  select count(*) into accepted from public.applications where campaign_id=old.id and status='accepted';
  if new.spots_total is not null and new.spots_total<accepted then raise exception 'The cap cannot be less than accepted creators';end if;
  if accepted>0 and (new.platforms is distinct from old.platforms or new.deliverables is distinct from old.deliverables or new.comp_type is distinct from old.comp_type) then raise exception 'Agreed platforms, deliverables and compensation type are locked after acceptance';end if;
  if not privileged and old.stage<>'draft' and (new.comp is distinct from old.comp or new.comp_type is distinct from old.comp_type or new.spots_total is distinct from old.spots_total) then raise exception 'Financial changes must be verified by checkout';end if;
  if not privileged and new.spots_filled is distinct from old.spots_filled and pg_trigger_depth()<2 then raise exception 'Capacity is maintained by the application workflow';end if;
 end if;
 return new;
end;$$;
drop trigger if exists audit_campaign_guard on public.campaigns;
create trigger audit_campaign_guard before insert or update on public.campaigns for each row execute function private.guard_campaign();
-- Existing payment gate remains in place for publish/featured changes.
alter function public.enforce_campaign_payment_gate() set search_path='';
alter function public.enforce_gig_payment_gate() set search_path='';
alter function public.update_updated_at() set search_path='';
alter function public.validate_application_stage_transition() set search_path='';
create or replace function public.set_application_brand_id() returns trigger language plpgsql security definer set search_path='' as $$
begin select brand_id into new.brand_id from public.campaigns where id=new.campaign_id;if not found then raise exception 'Campaign not found';end if;return new;end;$$;
revoke execute on function public.set_application_brand_id() from public,anon,authenticated;
revoke execute on function public.handle_new_user() from public,anon,authenticated;

drop policy if exists campaigns_read_all on public.campaigns;
create policy campaigns_public_read on public.campaigns for select to anon,authenticated using(stage='open' and closes_at>now());
create policy campaigns_participant_read on public.campaigns for select to authenticated using(brand_id=(select auth.uid()) or exists(select 1 from public.applications a where a.campaign_id=campaigns.id and a.creator_id=(select auth.uid())));
-- Avoid a policy cycle between campaigns and applications by reading applications through a narrow private predicate.
create or replace function private.is_campaign_participant(cid uuid) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.applications where campaign_id=cid and creator_id=(select auth.uid()));$$;
grant execute on function private.is_campaign_participant(uuid) to authenticated;
alter policy campaigns_participant_read on public.campaigns using(brand_id=(select auth.uid()) or private.is_campaign_participant(id));

create or replace function private.guard_application() returns trigger language plpgsql security definer set search_path='' as $$
declare actor uuid:=(select auth.uid());c public.campaigns;role_name public.user_role; allowed boolean:=false;
begin
 select * into c from public.campaigns where id=new.campaign_id for update;
 if not found then raise exception 'Campaign not found';end if;
 select role into role_name from public.profiles where id=actor;
 new.brand_id:=c.brand_id;
 if tg_op='INSERT' then
  if role_name<>'creator' or actor<>new.creator_id then raise exception 'A creator account is required';end if;
  if new.status is distinct from 'applied' or new.stage is distinct from 'applied' then raise exception 'Applications must start as applied';end if;
  if c.stage<>'open' or c.closes_at<=now() or (c.spots_total is not null and c.spots_filled>=c.spots_total) then raise exception 'This campaign is no longer accepting applications';end if;
  if new.creator_id=c.brand_id then raise exception 'You cannot apply to your own campaign';end if;
  new.created_at:=now();new.accepted_at:=null;new.approved_at:=null;new.paid_at:=null;new.shipped_at:=null;new.content_submitted_at:=null;
 else
  if new.id<>old.id or new.campaign_id<>old.campaign_id or new.creator_id<>old.creator_id or new.brand_id<>old.brand_id then raise exception 'Application ownership cannot change';end if;
  new.created_at:=old.created_at;new.email:=old.email;
  new.accepted_at:=old.accepted_at;new.shipped_at:=old.shipped_at;new.content_submitted_at:=old.content_submitted_at;new.approved_at:=old.approved_at;new.paid_at:=old.paid_at;
  if new.status is distinct from old.status and not(old.status='applied' and new.status in('accepted','rejected')) then raise exception 'Only pending applications may be accepted or rejected';end if;
  if actor=old.creator_id then
   if new.status is distinct from old.status or new.tracking_number is distinct from old.tracking_number then raise exception 'Only the brand can approve or ship an application';end if;
   if new.stage is distinct from old.stage then
    allowed:=new.stage='content_submitted' and old.status='accepted' and (old.stage in('product_shipped','product_delivered') or (old.stage='accepted' and c.comp_type='paid')) and exists(select 1 from public.content_uploads where application_id=old.id);
    if not allowed then raise exception 'This workflow action belongs to the brand';end if;
    new.content_submitted_at:=now();
   end if;
   if old.status<>'applied' and (new.name is distinct from old.name or new.platforms is distinct from old.platforms or new.pitch is distinct from old.pitch or new.portfolio is distinct from old.portfolio) then raise exception 'An accepted application cannot be rewritten';end if;
  elsif actor=c.brand_id then
   if new.name is distinct from old.name or new.platforms is distinct from old.platforms or new.pitch is distinct from old.pitch or new.portfolio is distinct from old.portfolio then raise exception 'Only the creator can edit their application';end if;
   if new.status='accepted' and old.status='applied' then
    if c.closes_at<=now() or c.stage<>'open' or (c.spots_total is not null and c.spots_filled>=c.spots_total) then raise exception 'This campaign has no available creator places';end if;
    new.stage:='accepted';new.accepted_at:=now();
   elsif new.status='rejected' and old.status<>'applied' then raise exception 'Only pending applications may be rejected';end if;
   if new.stage is distinct from old.stage and not(new.status='accepted' and old.status='applied') then
    allowed:=(old.stage='accepted' and new.stage='product_shipped') or (old.stage='content_submitted' and new.stage='approved') or (old.stage='approved' and new.stage='paid');
    if not allowed then raise exception 'Invalid brand workflow transition';end if;
    if new.stage='product_shipped' then if length(trim(coalesce(new.tracking_number,'')))<3 then raise exception 'A tracking reference is required';end if;new.shipped_at:=now();end if;
    if new.stage='approved' then new.approved_at:=now();end if;
    if new.stage='paid' then
     if c.comp_type in('paid','product+paid') and not exists(select 1 from public.manual_payouts where application_id=old.id) then raise exception 'Record the completed creator payment before marking this application paid';end if;
     new.paid_at:=now();
    end if;
   end if;
  else raise exception 'You cannot change this application';end if;
  -- Client-supplied timestamps may not rewrite a previous event.
  if new.accepted_at is distinct from old.accepted_at and not(old.status='applied' and new.status='accepted') then new.accepted_at:=old.accepted_at;end if;
  if new.shipped_at is distinct from old.shipped_at and new.stage<>'product_shipped' then new.shipped_at:=old.shipped_at;end if;
  if new.approved_at is distinct from old.approved_at and new.stage<>'approved' then new.approved_at:=old.approved_at;end if;
  if new.paid_at is distinct from old.paid_at and new.stage<>'paid' then new.paid_at:=old.paid_at;end if;
 end if;
 return new;
end;$$;
drop trigger if exists trg_applications_validate_stage on public.applications;
create trigger applications_guard before insert or update on public.applications for each row execute function private.guard_application();
create or replace function private.refresh_capacity() returns trigger language plpgsql security definer set search_path='' as $$
declare cid uuid:=coalesce(new.campaign_id,old.campaign_id);
begin update public.campaigns set spots_filled=(select count(*) from public.applications where campaign_id=cid and status='accepted') where id=cid;return coalesce(new,old);end;$$;
create trigger applications_refresh_capacity after insert or update of status or delete on public.applications for each row execute function private.refresh_capacity();
create or replace function private.guard_manual_payout() returns trigger language plpgsql security definer set search_path='' as $$
declare a public.applications;c public.campaigns;expected integer;
begin
 select * into a from public.applications where id=new.application_id for update;select * into c from public.campaigns where id=a.campaign_id;
 if (select auth.uid()) is distinct from c.brand_id or a.stage<>'approved' or a.status<>'accepted' then raise exception 'Only the owning brand can record a completed payment for approved work';end if;
 expected:=round(coalesce(nullif(regexp_replace(c.comp,'[^0-9.]','','g'),''),'0')::numeric*100);
 if expected<=0 or new.amount_cents<expected then raise exception 'Record at least the agreed creator compensation';end if;
 if new.paid_at>now()+interval '5 minutes' then raise exception 'The payment date cannot be in the future';end if;
 new.brand_id:=c.brand_id;new.creator_id:=a.creator_id;new.recorded_by:=(select auth.uid());new.created_at:=now();return new;
end;$$;
create trigger manual_payouts_guard before insert on public.manual_payouts for each row execute function private.guard_manual_payout();
create or replace function public.record_manual_payout(p_application_id uuid,p_amount_cents integer,p_reference text,p_paid_at timestamptz default now()) returns uuid language plpgsql security invoker set search_path='' as $$
declare a public.applications;pid uuid;
begin
 select * into a from public.applications where id=p_application_id;
 if a.brand_id is distinct from (select auth.uid()) then raise exception 'Not authorized';end if;
 insert into public.manual_payouts(application_id,brand_id,creator_id,amount_cents,reference,paid_at,recorded_by) values(a.id,a.brand_id,a.creator_id,p_amount_cents,p_reference,p_paid_at,(select auth.uid())) returning id into pid;
 update public.applications set stage='paid' where id=a.id;return pid;
end;$$;
revoke all on function public.record_manual_payout(uuid,integer,text,timestamptz) from public,anon;
grant execute on function public.record_manual_payout(uuid,integer,text,timestamptz) to authenticated;

create or replace function private.guard_message() returns trigger language plpgsql security definer set search_path='' as $$
declare actor uuid:=(select auth.uid());owner_id uuid;participant_id uuid;
begin
 if tg_op='UPDATE' then
  if actor is distinct from old.recipient_id or (to_jsonb(new)-'read') is distinct from (to_jsonb(old)-'read') then raise exception 'Only the recipient may mark a message read';end if;return new;
 end if;
 select brand_id into owner_id from public.campaigns where id=new.campaign_id;
 if actor is null or new.sender_id<>actor or new.recipient_id=actor or length(trim(new.text)) not between 1 and 4000 then raise exception 'Invalid message';end if;
 participant_id:=case when actor=owner_id then new.recipient_id else actor end;
 if not ((actor=owner_id and new.recipient_id=participant_id) or (actor=participant_id and new.recipient_id=owner_id)) or not exists(select 1 from public.applications where campaign_id=new.campaign_id and applications.creator_id=participant_id and status<>'rejected') then raise exception 'Messages are limited to campaign participants';end if;
 select role into new.from_role from public.profiles where id=actor;new.created_at:=now();new.read:=false;return new;
end;$$;
create trigger messages_guard before insert or update on public.messages for each row execute function private.guard_message();

create or replace function private.guard_call() returns trigger language plpgsql security definer set search_path='' as $$
declare actor uuid:=(select auth.uid());owner_id uuid;
begin
 select brand_id into owner_id from public.campaigns where id=new.campaign_id;
 if tg_op='INSERT' then
  if actor is distinct from owner_id or new.brand_id<>owner_id or not exists(select 1 from public.applications where campaign_id=new.campaign_id and creator_id=new.creator_id and status='accepted') then raise exception 'Calls require an accepted campaign participant';end if;
  new.confirmed:=false;new.declined:=false;new.created_at:=now();
 else
  if new.id<>old.id or new.campaign_id<>old.campaign_id or new.brand_id<>old.brand_id or new.creator_id<>old.creator_id then raise exception 'Call participants cannot change';end if;
  if actor=old.creator_id then
   if (to_jsonb(new)-array['confirmed','declined']) is distinct from (to_jsonb(old)-array['confirmed','declined']) then raise exception 'Creators can only confirm or decline a call';end if;
  elsif actor=old.brand_id then
   if new.datetime is distinct from old.datetime or new.meet_link is distinct from old.meet_link then new.confirmed:=false;new.declined:=false;end if;
  else raise exception 'Not authorized';end if;
 end if;
 if new.confirmed and new.declined then raise exception 'A call cannot be confirmed and declined';end if;
 if (tg_op='INSERT' or new.datetime is distinct from old.datetime) and new.datetime<=now() then raise exception 'Choose a future call time';end if;
 if new.meet_link is not null and new.meet_link!~'^https?://' then raise exception 'Use an HTTP or HTTPS meeting link';end if;
 if not exists(select 1 from pg_catalog.pg_timezone_names where name=new.timezone) then raise exception 'Choose a valid time zone';end if;
 return new;
end;$$;
create trigger scheduled_calls_guard before insert or update on public.scheduled_calls for each row execute function private.guard_call();

create or replace function private.guard_review() returns trigger language plpgsql security definer set search_path='' as $$
declare owner_id uuid;
begin
 select brand_id into owner_id from public.campaigns where id=new.campaign_id;
 if tg_op='INSERT' then
  if new.creator_id is distinct from (select auth.uid()) or not exists(select 1 from public.applications where campaign_id=new.campaign_id and creator_id=new.creator_id and status='accepted' and stage in('approved','paid')) then raise exception 'Only a participating creator with approved work may review';end if;
  new.brand_id:=owner_id;new.brand_response:=null;new.submitted_at:=now();
 else
  if (select auth.uid()) is distinct from old.brand_id or (to_jsonb(new)-'brand_response') is distinct from (to_jsonb(old)-'brand_response') then raise exception 'Brands may only respond to a review, not rewrite it';end if;
 end if;
 return new;
end;$$;
create trigger reviews_guard before insert or update on public.reviews for each row execute function private.guard_review();

create or replace function private.guard_notification() returns trigger language plpgsql set search_path='' as $$
begin if (select auth.uid()) is distinct from old.user_id or (to_jsonb(new)-'read') is distinct from (to_jsonb(old)-'read') then raise exception 'Only read status may be changed';end if;return new;end;$$;
create trigger notifications_guard before update on public.notifications for each row execute function private.guard_notification();
create or replace function private.notify(target_id uuid,kind public.notification_type,heading text,detail text) returns void language plpgsql security definer set search_path='' as $$
begin insert into public.notifications(user_id,for_role,type,title,body) select id,role,kind,heading,detail from public.profiles where id=target_id;end;$$;
create or replace function private.workflow_notification() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_table_name='messages' then perform private.notify(new.recipient_id,'message_received','New campaign message','A campaign participant sent you a message.');
 elsif tg_table_name='applications' then
  if tg_op='INSERT' then perform private.notify(new.brand_id,'new_application','New campaign application','A creator applied to your campaign.');
  elsif new.status is distinct from old.status then perform private.notify(new.creator_id,case when new.status='accepted' then 'application_accepted'::public.notification_type else 'application_rejected'::public.notification_type end,'Application updated','Open your campaign workspace to see the update.');
  elsif new.stage is distinct from old.stage then perform private.notify(case when (select auth.uid())=new.brand_id then new.creator_id else new.brand_id end,case when new.stage='product_shipped' then 'product_shipped'::public.notification_type when new.stage='content_submitted' then 'content_submitted'::public.notification_type else 'content_approved'::public.notification_type end,'Campaign progress updated','Open the workspace for the latest delivery or payment record.');end if;
 elsif tg_table_name='scheduled_calls' then
  if tg_op='INSERT' then perform private.notify(new.creator_id,'call_scheduled','Campaign call scheduled','Review the time and respond in your workspace.');
  elsif new.confirmed is distinct from old.confirmed or new.declined is distinct from old.declined then perform private.notify(new.brand_id,case when new.confirmed then 'call_confirmed'::public.notification_type else 'call_declined'::public.notification_type end,'Call response received','A creator responded to your scheduled call.');end if;
 elsif tg_table_name='content_uploads' and tg_op='INSERT' then perform private.notify((select brand_id from public.campaigns where id=new.campaign_id),'content_submitted','Content submitted','A creator submitted a private deliverable for review.');
 end if;return new;
end;$$;
create trigger messages_notify after insert on public.messages for each row execute function private.workflow_notification();
create trigger applications_notify after insert or update on public.applications for each row execute function private.workflow_notification();
create trigger calls_notify after insert or update on public.scheduled_calls for each row execute function private.workflow_notification();
create trigger uploads_notify after insert on public.content_uploads for each row execute function private.workflow_notification();

create or replace function private.can_access_content(object_name text,write_access boolean default false) returns boolean language plpgsql stable security definer set search_path='' as $$
declare pieces text[]:=string_to_array(object_name,'/');actor uuid:=(select auth.uid());app public.applications;
begin
 if actor is null or cardinality(pieces)<4 or pieces[1]!~'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' or pieces[2]!~'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return false;end if;
 select * into app from public.applications where id=pieces[2]::uuid and creator_id=pieces[1]::uuid and status='accepted';
 if not found then return false;end if;
 if write_access then return actor=app.creator_id and app.stage in('accepted','product_shipped','product_delivered','content_submitted');end if;
 return actor in(app.creator_id,app.brand_id);
end;$$;
grant execute on function private.can_access_content(text,boolean) to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('content','content',false,104857600,array['image/jpeg','image/png','image/webp','video/mp4','video/webm','video/quicktime','application/pdf']) on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy content_private_read on storage.objects for select to authenticated using(bucket_id='content' and private.can_access_content(name,false));
create policy content_creator_upload on storage.objects for insert to authenticated with check(bucket_id='content' and private.can_access_content(name,true));
create policy content_creator_cleanup on storage.objects for delete to authenticated using(bucket_id='content' and private.can_access_content(name,true) and not exists(select 1 from public.content_uploads u where u.storage_path=objects.name));
create or replace function private.guard_upload() returns trigger language plpgsql security definer set search_path='' as $$
declare app public.applications;
begin
 if tg_op='INSERT' then
  select * into app from public.applications where id=new.application_id;
  if new.creator_id is distinct from (select auth.uid()) or app.creator_id<>new.creator_id or app.campaign_id<>new.campaign_id or app.status<>'accepted' then raise exception 'Invalid content submission';end if;
  if new.storage_path is null or split_part(new.storage_path,'/',1)<>new.creator_id::text or split_part(new.storage_path,'/',2)<>new.application_id::text then raise exception 'The file must belong to this application';end if;
  if not private.can_access_content(new.storage_path,true) or not exists(select 1 from storage.objects where bucket_id='content' and name=new.storage_path) then raise exception 'Upload the file before submitting it';end if;
  new.status:='pending review';new.revision_notes:=null;new.file_url:=null;new.uploaded_at:=now();
 else
  if (select auth.uid()) is distinct from (select brand_id from public.campaigns where id=old.campaign_id) or (to_jsonb(new)-array['status','revision_notes']) is distinct from (to_jsonb(old)-array['status','revision_notes']) then raise exception 'Brands may only review submitted content';end if;
  if new.status not in('pending review','approved','revision requested') then raise exception 'Invalid review status';end if;
 end if;return new;
end;$$;
create trigger content_uploads_guard before insert or update on public.content_uploads for each row execute function private.guard_upload();
create or replace function public.submit_content(p_application_id uuid,p_path text,p_file_name text,p_content_type text,p_size_bytes bigint) returns uuid language plpgsql security invoker set search_path='' as $$
declare app public.applications;upload_id uuid;
begin
 select * into app from public.applications where id=p_application_id;
 if app.creator_id is distinct from (select auth.uid()) then raise exception 'Not authorized';end if;
 insert into public.content_uploads(application_id,campaign_id,creator_id,storage_path,file_name,content_type,size_bytes) values(app.id,app.campaign_id,app.creator_id,p_path,p_file_name,p_content_type,p_size_bytes) returning id into upload_id;
 if app.stage<>'content_submitted' then update public.applications set stage='content_submitted' where id=app.id;end if;
 return upload_id;
end;$$;
revoke all on function public.submit_content(uuid,text,text,text,bigint) from public,anon;
grant execute on function public.submit_content(uuid,text,text,text,bigint) to authenticated;

-- Remove redundant legacy policies; retain only intended read and write predicates.
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
do $$declare t text;begin foreach t in array array['brand_profiles','creator_profiles'] loop
 execute format('drop policy if exists %I on public.%I',t||'_write_own',t);
 execute format('create policy %I on public.%I for insert to authenticated with check((select auth.uid())=id)',t||'_insert_own',t);
 execute format('create policy %I on public.%I for update to authenticated using((select auth.uid())=id) with check((select auth.uid())=id)',t||'_update_own',t);
 end loop;end;$$;
-- Auth identifiers are stable for a statement; avoid per-row calls in policy scans.
do $$declare p record;q text;w text;stmt text;begin
 for p in select * from pg_policies where schemaname in('public','storage') and (coalesce(qual,'')||coalesce(with_check,'')) like '%auth.uid()%' loop
 q:=replace(p.qual,'auth.uid()','(select auth.uid())');w:=replace(p.with_check,'auth.uid()','(select auth.uid())');
 stmt:=format('alter policy %I on %I.%I',p.policyname,p.schemaname,p.tablename);
 if q is not null then stmt:=stmt||' using ('||q||')';end if;if w is not null then stmt:=stmt||' with check ('||w||')';end if;execute stmt;
 end loop;end;$$;
-- Cover foreign-key lookups without removing indexes with an insufficient usage history.
do $$declare fk record;cols text;begin
 for fk in select c.oid,c.conrelid,c.conkey,n.nspname,t.relname from pg_constraint c join pg_class t on t.oid=c.conrelid join pg_namespace n on n.oid=t.relnamespace where c.contype='f' and n.nspname='public' loop
 if not exists(select 1 from pg_index i where i.indrelid=fk.conrelid and i.indisvalid and (i.indkey::smallint[])[0:array_length(fk.conkey,1)-1]=fk.conkey) then
 select string_agg(quote_ident(a.attname),',' order by k.ord) into cols from unnest(fk.conkey) with ordinality k(attnum,ord) join pg_attribute a on a.attrelid=fk.conrelid and a.attnum=k.attnum;
 execute format('create index if not exists %I on %I.%I (%s)','audit_fk_'||fk.oid,fk.nspname,fk.relname,cols);
 end if;end loop;end;$$;
revoke all on all functions in schema private from public,anon;
grant execute on function private.is_campaign_participant(uuid),private.can_access_content(text,boolean) to authenticated;
alter table public.payments add column if not exists stripe_checkout_session_id text unique;
alter table public.subscriptions add column if not exists source_payment_id uuid unique references public.payments(id);
-- Only the authenticated billing functions use these RPCs. End users cannot choose their own prices or entitlements.
create or replace function public.prepare_checkout(p_brand uuid,p_request uuid,p_type text,p_amount integer,p_changes jsonb,p_campaign uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare pay public.payments;cid uuid;gid uuid;active_plan public.subscriptions;count_active integer;
begin
 if (select auth.role())<>'service_role' then raise exception 'Billing service required';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_brand::text,0));
 select * into pay from public.payments where request_id=p_request;
 if found then
  if pay.brand_id<>p_brand or pay.type<>p_type or pay.amount_cents<>p_amount or pay.requested_changes<>p_changes then raise exception 'This checkout request has already been used for different details';end if;
  return to_jsonb(pay);
 end if;
 if not exists(select 1 from public.profiles where id=p_brand and role='brand') then raise exception 'A brand account is required';end if;
 if p_amount<0 or p_amount>10000000 or p_type not in('campaign_new','campaign_edit','gig','annual') then raise exception 'Invalid checkout';end if;
 select * into active_plan from public.subscriptions where brand_id=p_brand and status='active' and current_period_end>now() order by current_period_end desc limit 1;
 if p_type='annual' and exists(select 1 from public.payments where brand_id=p_brand and type='annual' and status='pending') then raise exception 'An annual checkout is already pending. Resume it or contact support';end if;
 if p_type='annual' and active_plan.id is not null then raise exception 'Annual access is already active';end if;
 if coalesce((p_changes->>'annual_included')::boolean,false) then
  if active_plan.id is null then raise exception 'Annual access has expired. Refresh checkout';end if;
  select count(*) into count_active from public.campaigns c where c.brand_id=p_brand and ((c.stage in('open','active','fulfillment') and (c.stage<>'open' or c.closes_at>now())) or(c.stage='draft' and exists(select 1 from public.payments p where p.campaign_id=c.id and p.status='pending')));
  if p_type='campaign_new' and count_active>=3 then raise exception 'Annual access allows three active campaigns at once';end if;
 end if;
 if p_type='campaign_new' then
  cid:=gen_random_uuid();
  insert into public.campaigns select (jsonb_populate_record(null::public.campaigns,(p_changes->'record')||jsonb_build_object('id',cid,'brand_id',p_brand,'stage','draft','spots_filled',0,'billing_request_id',p_request,'created_at',now(),'updated_at',now(),'featured',false,'featured_until',null))).*;
 elsif p_type='campaign_edit' then
  select id into cid from public.campaigns where id=p_campaign and brand_id=p_brand for update;
  if cid is null then raise exception 'Campaign not found';end if;
 elsif p_type='gig' then
  gid:=gen_random_uuid();
  insert into public.gig_listings select (jsonb_populate_record(null::public.gig_listings,(p_changes->'record')||jsonb_build_object('id',gid,'brand_id',p_brand,'stage','draft','created_at',now(),'updated_at',now()))).*;
 end if;
 if coalesce((p_changes->>'monthly_feature')::boolean,false) then
  insert into public.annual_feature_redemptions(subscription_id,period_start,campaign_id) values(active_plan.id,(p_changes->>'feature_period')::date,cid);
 end if;
 insert into public.payments(brand_id,campaign_id,gig_id,request_id,amount_cents,type,status,currency,requested_changes) values(p_brand,cid,gid,p_request,p_amount,p_type,'pending','usd',p_changes) returning * into pay;
 return to_jsonb(pay);
end;$$;
create or replace function public.finalize_checkout(p_payment uuid,p_provider text,p_amount integer,p_currency text,p_event text default null,p_event_type text default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare pay public.payments;rec jsonb;days integer;
begin
 if (select auth.role())<>'service_role' then raise exception 'Billing service required';end if;
 select * into pay from public.payments where id=p_payment for update;
 if not found then raise exception 'Payment record not found';end if;
 if pay.amount_cents<>p_amount or pay.currency<>p_currency then raise exception 'Payment amount or currency does not match';end if;
 if pay.amount_cents>0 and pay.stripe_payment_intent_id is distinct from p_provider then raise exception 'Payment provider reference does not match';end if;
 if pay.status='succeeded' then return to_jsonb(pay);end if;
 if pay.status='canceled' then raise exception 'Checkout was canceled';end if;
 rec:=pay.requested_changes->'record';days:=coalesce((rec->>'featured_weeks')::integer,0);
 if pay.type='annual' then
  insert into public.subscriptions(brand_id,status,plan,current_period_start,current_period_end,cancel_at_period_end,source_payment_id) values(pay.brand_id,'active','annual',now(),now()+interval '1 year',true,pay.id) on conflict(source_payment_id) do nothing;
 elsif pay.type in('campaign_new','campaign_edit') then
  -- Financial changes are written together with the verified payment. UI saves cannot race the webhook.
  update public.campaigns c set
   comp=coalesce(rec->>'comp',c.comp),comp_type=coalesce((rec->>'comp_type')::public.comp_type,c.comp_type),spots_total=case when rec?'spots_total' then (rec->>'spots_total')::integer else c.spots_total end,
   featured=case when (rec->>'keep_featured')::boolean then c.featured else coalesce((rec->>'featured')::boolean,false) end,featured_weeks=case when (rec->>'keep_featured')::boolean then c.featured_weeks else days end,featured_until=case when (rec->>'keep_featured')::boolean then c.featured_until when coalesce((rec->>'featured')::boolean,false) then now()+make_interval(days=>days) else null end,
   stage=case when pay.type='campaign_new' then 'open'::public.campaign_stage else c.stage end
  where id=pay.campaign_id and brand_id=pay.brand_id;
  if not found then raise exception 'Campaign not found';end if;
 elsif pay.type='gig' then
  update public.gig_listings set stage='open' where id=pay.gig_id and brand_id=pay.brand_id;
  if not found then raise exception 'Gig not found';end if;
 end if;
 update public.payments set status='succeeded',provider_status='succeeded',updated_at=now() where id=pay.id returning * into pay;
 if p_event is not null then insert into public.billing_events(event_id,event_type) values(p_event,coalesce(p_event_type,'payment_intent.succeeded')) on conflict do nothing;end if;
 return to_jsonb(pay);
end;$$;
revoke all on function public.prepare_checkout(uuid,uuid,text,integer,jsonb,uuid),public.finalize_checkout(uuid,text,integer,text,text,text) from public,anon,authenticated;
grant execute on function public.prepare_checkout(uuid,uuid,text,integer,jsonb,uuid),public.finalize_checkout(uuid,text,integer,text,text,text) to service_role;

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.profiles(id,email,role) values(new.id,new.email,coalesce((new.raw_user_meta_data->>'role')::public.user_role,'creator'::public.user_role));return new;
end;$$;
create or replace function private.guard_profile_role() returns trigger language plpgsql set search_path='' as $$
begin
 if new.id is distinct from old.id then raise exception 'Profile identity cannot change';end if;
 if new.role is distinct from old.role and coalesce((select auth.role()),'')<>'service_role' then raise exception 'Contact support to change account type';end if;
 return new;
end;$$;
create trigger profiles_guard_role before update on public.profiles for each row execute function private.guard_profile_role();
-- Keep billing and membership records service-owned even if default table grants change.
revoke insert,update,delete on public.payments,public.subscriptions,public.billing_events,public.annual_feature_redemptions,public.site_events from authenticated,anon;

commit;
