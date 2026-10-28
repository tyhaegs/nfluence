begin;
-- Private invite inventory: clients can neither discover codes nor grant themselves one.
create table public.campaign_sponsorship_codes (
 id uuid primary key default gen_random_uuid(),
 code_hash text not null unique check(code_hash ~ '^[0-9a-f]{64}$'),
 code_hint text not null,
 enabled boolean not null default true,
 assigned_brand_id uuid references public.profiles(id),
 expires_at timestamptz,
 redeemed_by uuid references public.profiles(id),
 redeemed_request_id uuid unique,
 redeemed_payment_id uuid unique references public.payments(id),
 redeemed_at timestamptz,
 created_at timestamptz not null default now(),
 check ((redeemed_by is null and redeemed_request_id is null and redeemed_payment_id is null and redeemed_at is null)
     or (redeemed_by is not null and redeemed_request_id is not null and redeemed_payment_id is not null and redeemed_at is not null))
);
alter table public.campaign_sponsorship_codes enable row level security;
revoke all on public.campaign_sponsorship_codes from public,anon,authenticated;
grant all on public.campaign_sponsorship_codes to service_role;
create policy campaign_sponsorship_codes_service_only on public.campaign_sponsorship_codes for all to service_role using(true) with check(true);
create index campaign_sponsorship_assigned_brand_idx on public.campaign_sponsorship_codes(assigned_brand_id) where assigned_brand_id is not null;
create index campaign_sponsorship_redeemed_by_idx on public.campaign_sponsorship_codes(redeemed_by) where redeemed_by is not null;

-- This invoker runs only as the billing service. Code consumption, publication, and the
-- zero-dollar payment receipt commit together; a failed publication leaves the code unused.
create function public.redeem_campaign_sponsorship(p_brand uuid,p_request uuid,p_code_hash text,p_record jsonb)
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
 if not invite.enabled or (invite.expires_at is not null and invite.expires_at<=now()) or (invite.assigned_brand_id is not null and invite.assigned_brand_id<>p_brand) then raise exception 'This code is invalid, expired, or already used';end if;
 pay:=public.prepare_checkout(p_brand,p_request,'campaign_new',0,changes,null);
 pay:=public.finalize_checkout((pay->>'id')::uuid,null,0,'usd');
 update public.payments set promo_code='SPONSORED-'||invite.code_hint where id=(pay->>'id')::uuid;
 update public.campaign_sponsorship_codes set redeemed_by=p_brand,redeemed_request_id=p_request,redeemed_payment_id=(pay->>'id')::uuid,redeemed_at=now() where id=invite.id;
 return pay;
end;$$;
revoke all on function public.redeem_campaign_sponsorship(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.redeem_campaign_sponsorship(uuid,uuid,text,jsonb) to service_role;
commit;
