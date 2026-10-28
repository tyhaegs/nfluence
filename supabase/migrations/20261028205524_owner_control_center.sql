begin;
create table public.platform_owners(user_id uuid primary key references auth.users(id) on delete cascade,created_at timestamptz not null default now());
alter table public.platform_owners enable row level security;
revoke all on public.platform_owners from public,anon,authenticated;
grant all on public.platform_owners to service_role;
create policy platform_owners_service on public.platform_owners for all to service_role using(true) with check(true);
-- Bind the existing verified owner identity, never a client-editable profile or JWT metadata flag.
insert into public.platform_owners(user_id) select id from auth.users where lower(email)='tyhaegs@icloud.com' and email_confirmed_at is not null;
alter table public.campaign_sponsorship_codes add column label text not null default '' check(length(label)<=120);
alter table public.campaign_sponsorship_codes add column assigned_email text check(assigned_email=lower(trim(assigned_email)));
alter table public.subscriptions add column grant_source text not null default 'stripe' check(grant_source in('stripe','owner'));
alter table public.subscriptions add column owner_note text;
create table public.owner_events(id uuid primary key default gen_random_uuid(),actor_id uuid references auth.users(id) on delete set null,action text not null,target_id uuid,request_id uuid not null unique,input jsonb not null,before_data jsonb,after_data jsonb,created_at timestamptz not null default now());
alter table public.owner_events enable row level security;
revoke all on public.owner_events from public,anon,authenticated;
grant all on public.owner_events to service_role;
create policy owner_events_service on public.owner_events for all to service_role using(true) with check(true);
create index owner_events_actor_idx on public.owner_events(actor_id);
create index owner_events_created_idx on public.owner_events(created_at desc);

-- Definer is needed solely to join canonical verified Auth emails. Execution is service-only;
-- the service must also supply a current allowlisted owner identity on every request.
create function public.owner_read(p_actor uuid,p_resource text,p_query text default '',p_page integer default 0,p_limit integer default 50) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;total bigint;take integer:=least(100,greatest(1,p_limit));skip integer:=greatest(0,p_page)*least(100,greatest(1,p_limit));q text:='%'||left(coalesce(p_query,''),100)||'%';
begin
 if coalesce((select auth.role()),'')<>'service_role' or not exists(select 1 from public.platform_owners where user_id=p_actor) then raise exception 'Owner access required';end if;
 if p_resource='overview' then return jsonb_build_object(
 'brands',(select count(*) from public.profiles where role='brand'),'creators',(select count(*) from public.profiles where role='creator'),
 'campaigns',(select count(*) from public.campaigns),'active_campaigns',(select count(*) from public.campaigns where stage in('open','active','fulfillment') and (stage<>'open' or closes_at>now())),
 'memberships',(select count(*) from public.subscriptions where status='active' and current_period_end>now()),
 'available_codes',(select count(*) from public.campaign_sponsorship_codes where enabled and redeemed_at is null and (expires_at is null or expires_at>now())),
 'revenue_cents',(select coalesce(sum(amount_cents),0) from public.payments where status='succeeded' and amount_cents>0),
 'sponsored_campaigns',(select count(*) from public.campaign_sponsorship_codes where redeemed_at is not null));end if;
 if p_resource in('people','brands') then
  select count(*) into total from public.profiles p join auth.users u on u.id=p.id where (p_resource='people' or p.role='brand') and (coalesce(p.name,'') ilike q or u.email ilike q or p.role::text ilike q);
  select coalesce(jsonb_agg(to_jsonb(t)),'[]') into result from(select p.id,p.name,p.role,u.email,u.email_confirmed_at,p.created_at from public.profiles p join auth.users u on u.id=p.id where (p_resource='people' or p.role='brand') and (coalesce(p.name,'') ilike q or u.email ilike q or p.role::text ilike q) order by p.created_at desc,p.id limit take offset skip)t;
 elsif p_resource='campaigns' then
  select count(*) into total from public.campaigns c join auth.users u on u.id=c.brand_id where c.name ilike q or c.brand_name ilike q or u.email ilike q or c.stage::text ilike q;
  select coalesce(jsonb_agg(to_jsonb(t)),'[]') into result from(select c.id,c.name,c.brand_name,c.brand_id,u.email,c.stage,c.deadline,c.closes_at,c.spots_total,c.spots_filled,c.featured,c.created_at from public.campaigns c join auth.users u on u.id=c.brand_id where c.name ilike q or c.brand_name ilike q or u.email ilike q or c.stage::text ilike q order by c.created_at desc,c.id limit take offset skip)t;
 elsif p_resource='memberships' then
  select count(*) into total from public.subscriptions s join auth.users u on u.id=s.brand_id left join public.profiles p on p.id=s.brand_id where u.email ilike q or coalesce(p.name,'') ilike q or s.status ilike q;
  select coalesce(jsonb_agg(to_jsonb(t)),'[]') into result from(select s.id,s.brand_id,p.name,u.email,s.status,s.plan,s.current_period_start,s.current_period_end,s.grant_source,s.owner_note,s.source_payment_id,s.created_at from public.subscriptions s join auth.users u on u.id=s.brand_id left join public.profiles p on p.id=s.brand_id where u.email ilike q or coalesce(p.name,'') ilike q or s.status ilike q order by s.created_at desc,s.id limit take offset skip)t;
 elsif p_resource='codes' then
  select count(*) into total from public.campaign_sponsorship_codes c left join auth.users u on u.id=c.redeemed_by where c.label ilike q or c.code_hint ilike q or coalesce(c.assigned_email,'') ilike q or coalesce(u.email,'') ilike q;
  select coalesce(jsonb_agg(to_jsonb(t)),'[]') into result from(select c.id,c.label,c.code_hint,c.enabled,c.assigned_brand_id,c.assigned_email,c.expires_at,c.redeemed_at,c.redeemed_by,c.redeemed_payment_id,u.email redeemed_email,c.created_at from public.campaign_sponsorship_codes c left join auth.users u on u.id=c.redeemed_by where c.label ilike q or c.code_hint ilike q or coalesce(c.assigned_email,'') ilike q or coalesce(u.email,'') ilike q order by c.created_at desc,c.id limit take offset skip)t;
 elsif p_resource='payments' then
  select count(*) into total from public.payments p join auth.users u on u.id=p.brand_id where u.email ilike q or p.type ilike q or p.status ilike q;
  select coalesce(jsonb_agg(to_jsonb(t)),'[]') into result from(select p.id,p.brand_id,u.email,p.campaign_id,c.name campaign,p.amount_cents,p.currency,p.type,p.status,p.promo_code,p.stripe_payment_intent_id,p.created_at from public.payments p join auth.users u on u.id=p.brand_id left join public.campaigns c on c.id=p.campaign_id where u.email ilike q or p.type ilike q or p.status ilike q order by p.created_at desc,p.id limit take offset skip)t;
 elsif p_resource='activity' then
  select count(*) into total from public.owner_events;
  select coalesce(jsonb_agg(to_jsonb(t)),'[]') into result from(select e.id,e.actor_id,u.email actor_email,e.action,e.target_id,e.before_data,e.after_data,e.created_at from public.owner_events e left join auth.users u on u.id=e.actor_id order by e.created_at desc,e.id limit take offset skip)t;
 elsif p_resource='campaign_detail' then
  return jsonb_build_object('campaign',(select to_jsonb(c) from public.campaigns c where id=p_query::uuid),'applications',(select coalesce(jsonb_agg(to_jsonb(a)),'[]') from public.applications a where campaign_id=p_query::uuid),'files',(select coalesce(jsonb_agg(to_jsonb(f)),'[]') from public.content_uploads f where campaign_id=p_query::uuid),'payouts',(select coalesce(jsonb_agg(to_jsonb(p)),'[]') from public.manual_payouts p where p.application_id in(select id from public.applications where campaign_id=p_query::uuid)));
 else raise exception 'Unknown owner view';end if;
 return jsonb_build_object('rows',result,'total',total,'page',greatest(0,p_page),'limit',take);
end;$$;
revoke all on function public.owner_read(uuid,text,text,integer,integer) from public,anon,authenticated;
grant execute on function public.owner_read(uuid,text,text,integer,integer) to service_role;

create function public.owner_manage(p_actor uuid,p_action text,p_target uuid,p_data jsonb,p_request uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
declare prior public.owner_events;before_row jsonb;after_row jsonb;target uuid:=p_target;member public.subscriptions;invite public.campaign_sponsorship_codes;camp public.campaigns;ends timestamptz;brand uuid;note text:=trim(coalesce(p_data->>'note',''));
begin
 if coalesce((select auth.role()),'')<>'service_role' or not exists(select 1 from public.platform_owners where user_id=p_actor) then raise exception 'Owner access required';end if;
 if p_request is null then raise exception 'A request ID is required';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_request::text,7));
 select * into prior from public.owner_events where request_id=p_request;
 if found then
  if prior.actor_id is distinct from p_actor or prior.action is distinct from p_action or prior.input is distinct from jsonb_build_object('target',p_target,'data',p_data) then raise exception 'This request was used for different details';end if;
  return prior.after_data;
 end if;
 if p_action='create_code' then
  if p_data->>'code_hash' !~ '^[0-9a-f]{64}$' or length(coalesce(p_data->>'code_hint',''))<>4 or length(coalesce(p_data->>'label',''))>120 then raise exception 'Invalid invitation details';end if;
  brand:=nullif(p_data->>'assigned_brand_id','')::uuid;
  if brand is not null and not exists(select 1 from public.profiles where id=brand and role='brand') then raise exception 'Choose a brand account';end if;
  ends:=nullif(p_data->>'expires_at','')::timestamptz;
  if ends is not null and ends<=now() then raise exception 'Choose a future expiration';end if;
  insert into public.campaign_sponsorship_codes(code_hash,code_hint,label,assigned_brand_id,assigned_email,expires_at) values(p_data->>'code_hash',p_data->>'code_hint',trim(coalesce(p_data->>'label','')),brand,nullif(lower(trim(p_data->>'assigned_email')),''),ends) returning * into invite;
  target:=invite.id;after_row:=to_jsonb(invite)-'code_hash';
 elsif p_action='revoke_code' then
  select * into invite from public.campaign_sponsorship_codes where id=target for update;if not found then raise exception 'Code not found';end if;
  if invite.redeemed_at is not null then raise exception 'This code was already redeemed; its campaign remains active';end if;
  before_row:=to_jsonb(invite)-'code_hash';update public.campaign_sponsorship_codes set enabled=false where id=target returning to_jsonb(campaign_sponsorship_codes)-'code_hash' into after_row;
 elsif p_action='grant_membership' then
  brand:=nullif(p_data->>'brand_id','')::uuid;ends:=(p_data->>'ends_at')::timestamptz;
  if not exists(select 1 from public.profiles where id=brand and role='brand') then raise exception 'Choose a brand account';end if;
  if ends is null or ends<=now() or length(note)<3 or length(note)>1000 then raise exception 'Choose a future end date and enter a reason';end if;
  perform pg_advisory_xact_lock(hashtextextended(brand::text,0));
  if exists(select 1 from public.payments where brand_id=brand and type='annual' and status='pending') then raise exception 'An annual checkout is pending for this brand';end if;
  if exists(select 1 from public.subscriptions where brand_id=brand and status='active' and current_period_end>now()) then raise exception 'This brand has active access; extend its existing membership instead';end if;
  insert into public.subscriptions(brand_id,status,plan,current_period_start,current_period_end,cancel_at_period_end,grant_source,owner_note) values(brand,'active','annual',now(),ends,true,'owner',note) returning to_jsonb(subscriptions) into after_row;target:=(after_row->>'id')::uuid;
 elsif p_action in('extend_membership','end_membership') then
  select * into member from public.subscriptions where id=target for update;if not found then raise exception 'Membership not found';end if;before_row:=to_jsonb(member);
  if length(note)<3 or length(note)>1000 then raise exception 'Enter a reason for this change';end if;
  if p_action='extend_membership' then
   ends:=(p_data->>'ends_at')::timestamptz;if ends is null or ends<=greatest(now(),member.current_period_end) then raise exception 'Choose an end date after the existing access period';end if;
   update public.subscriptions set status='active',current_period_end=ends,owner_note=note,updated_at=now() where id=target returning to_jsonb(subscriptions) into after_row;
  else update public.subscriptions set status='canceled',current_period_end=least(now(),current_period_end),owner_note=note,updated_at=now() where id=target returning to_jsonb(subscriptions) into after_row;end if;
 elsif p_action='campaign_state' then
  select * into camp from public.campaigns where id=target for update;if not found then raise exception 'Campaign not found';end if;
  if camp.stage='draft' then raise exception 'Drafts must be published through checkout or a free-campaign code';end if;
  if coalesce(p_data->>'stage','') not in('open','active','fulfillment','wrap_up') or length(note)<3 or length(note)>1000 then raise exception 'Choose a valid stage and enter a reason';end if;
  if p_data->>'stage'='open' and camp.closes_at<=now() then raise exception 'Update the deadline before reopening this campaign';end if;
  before_row:=to_jsonb(camp);update public.campaigns set stage=(p_data->>'stage')::public.campaign_stage where id=target returning to_jsonb(campaigns) into after_row;
 elsif p_action='campaign_details' then
  select * into camp from public.campaigns where id=target for update;if not found then raise exception 'Campaign not found';end if;
  if length(note)<3 or length(note)>1000 then raise exception 'Enter a reason for this change';end if;
  before_row:=to_jsonb(camp);update public.campaigns set name=trim(p_data->>'name'),description=left(p_data->>'description',12000),deadline=p_data->>'deadline' where id=target returning to_jsonb(campaigns) into after_row;
 else raise exception 'Unknown owner action';end if;
 insert into public.owner_events(actor_id,action,target_id,request_id,input,before_data,after_data) values(p_actor,p_action,target,p_request,jsonb_build_object('target',p_target,'data',p_data),before_row,after_row);
 return after_row;
end;$$;
revoke all on function public.owner_manage(uuid,text,uuid,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.owner_manage(uuid,text,uuid,jsonb,uuid) to service_role;

create function public.owner_session(p_actor uuid,p_session uuid) returns boolean language sql security definer set search_path='' as $$
 select coalesce((select auth.role()),'')='service_role' and exists(select 1 from public.platform_owners o join auth.sessions s on s.user_id=o.user_id where o.user_id=p_actor and s.id=p_session);
$$;
revoke all on function public.owner_session(uuid,uuid) from public,anon,authenticated;
grant execute on function public.owner_session(uuid,uuid) to service_role;
drop function public.redeem_campaign_sponsorship(uuid,uuid,text,jsonb);
create function public.redeem_campaign_sponsorship(p_brand uuid,p_request uuid,p_code_hash text,p_record jsonb,p_email text default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare invite public.campaign_sponsorship_codes; pay jsonb; changes jsonb;
begin
 if coalesce((select auth.role()),'')<>'service_role' then raise exception 'Billing service required';end if;
 if p_brand is null or p_request is null or p_code_hash is null or jsonb_typeof(p_record) is distinct from 'object' then raise exception 'Invalid campaign checkout';end if;
 if not exists(select 1 from public.profiles where id=p_brand and role='brand') then raise exception 'A brand account is required';end if;
 if coalesce((p_record->>'featured')::boolean,false) or coalesce((p_record->>'featured_weeks')::integer,0)>0 then raise exception 'Turn off featured placement to use this free-campaign code';end if;
 if (p_record->>'brand_id')::uuid is distinct from p_brand then raise exception 'Campaign owner does not match';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_brand::text,0));
 select * into invite from public.campaign_sponsorship_codes where code_hash=p_code_hash for update;
 if not found then raise exception 'This code is invalid, expired, or already used';end if;
 changes:=jsonb_build_object('record',p_record,'annual_included',false,'monthly_feature',false,'sponsorship_id',invite.id);
 if invite.redeemed_payment_id is not null then
  if invite.redeemed_by=p_brand and invite.redeemed_request_id=p_request then
   select to_jsonb(p) into pay from public.payments p where id=invite.redeemed_payment_id;
   if pay->'requested_changes' is distinct from changes or pay->>'status'<>'succeeded' then raise exception 'This checkout request has already been used for different details';end if;
   return pay;
  end if;
  raise exception 'This code is invalid, expired, or already used';
 end if;
 if invite.assigned_email is not null and invite.assigned_email is distinct from lower(trim(p_email)) then raise exception 'This code is assigned to a different brand email';end if;
 if not invite.enabled or (invite.expires_at is not null and invite.expires_at<=now()) or (invite.assigned_brand_id is not null and invite.assigned_brand_id<>p_brand) then raise exception 'This code is invalid, expired, or already used';end if;
 pay:=public.prepare_checkout(p_brand,p_request,'campaign_new',0,changes,null);
 pay:=public.finalize_checkout((pay->>'id')::uuid,null,0,'usd');
 update public.payments set promo_code='SPONSORED-'||invite.code_hint where id=(pay->>'id')::uuid;
 update public.campaign_sponsorship_codes set redeemed_by=p_brand,redeemed_request_id=p_request,redeemed_payment_id=(pay->>'id')::uuid,redeemed_at=now() where id=invite.id;
 return pay;
end;$$;
revoke all on function public.redeem_campaign_sponsorship(uuid,uuid,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.redeem_campaign_sponsorship(uuid,uuid,text,jsonb,text) to service_role;
commit;
