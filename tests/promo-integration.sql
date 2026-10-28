-- Transactional production verification: every fixture and publication is rolled back.
begin;
create temp table promo_fixture as select gen_random_uuid() brand,gen_random_uuid() other,gen_random_uuid() request_id;
grant select on promo_fixture to authenticated,service_role;
insert into auth.users(id,email,raw_user_meta_data) select brand,'promo-test-'||brand||'@example.invalid','{"role":"brand"}'::jsonb from promo_fixture union all select other,'promo-test-'||other||'@example.invalid','{"role":"brand"}'::jsonb from promo_fixture;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
insert into public.campaign_sponsorship_codes(code_hash,code_hint,assigned_brand_id) select repeat('1',64),'FIXTURE',brand from promo_fixture;
insert into public.campaign_sponsorship_codes(code_hash,code_hint,enabled,expires_at) values(repeat('2',64),'DISABLED',false,null),(repeat('3',64),'EXPIRED',true,now()-interval '1 hour'),(repeat('4',64),'ROLLBACK',true,null);
set local role service_role;
do $$
declare b uuid;o uuid;r uuid;rec jsonb;receipt jsonb;again jsonb;h text;
begin
 select brand,other,request_id into b,o,r from promo_fixture;
 rec:=jsonb_build_object('brand_id',b,'name','Sponsored transaction fixture','brand_name','Test','deadline','30 days','comp_type','product','comp','','platforms','[]'::jsonb,'deliverables','{}'::jsonb,'featured',false,'featured_weeks',0);
 foreach h in array array[repeat('2',64),repeat('3',64),repeat('9',64)] loop
  begin perform public.redeem_campaign_sponsorship(b,gen_random_uuid(),h,rec);raise exception 'TEST FAILED: invalid code accepted';exception when others then if sqlerrm like 'TEST FAILED%' then raise;end if;end;
 end loop;
 begin perform public.redeem_campaign_sponsorship(o,gen_random_uuid(),repeat('1',64),rec||jsonb_build_object('brand_id',o));raise exception 'TEST FAILED: assignment ignored';exception when others then if sqlerrm like 'TEST FAILED%' then raise;end if;end;
 begin perform public.redeem_campaign_sponsorship(b,r,repeat('1',64),rec||'{"featured":true,"featured_weeks":7}'::jsonb);raise exception 'TEST FAILED: free paid extras';exception when others then if sqlerrm like 'TEST FAILED%' then raise;end if;end;
 -- Failure after validation must not consume the invite or persist a draft/payment.
 begin perform public.redeem_campaign_sponsorship(b,gen_random_uuid(),repeat('4',64),rec||'{"comp_type":"invalid"}'::jsonb);raise exception 'TEST FAILED: invalid publication accepted';exception when others then if sqlerrm like 'TEST FAILED%' then raise;end if;end;
 if exists(select 1 from public.campaign_sponsorship_codes where code_hash=repeat('4',64) and redeemed_payment_id is not null) then raise exception 'TEST FAILED: failed publish consumed code';end if;
 receipt:=public.redeem_campaign_sponsorship(b,r,repeat('1',64),rec);
 if receipt->>'status'<>'succeeded' or (receipt->>'amount_cents')::int<>0 then raise exception 'TEST FAILED: no zero-dollar receipt';end if;
 if not exists(select 1 from public.campaigns where id=(receipt->>'campaign_id')::uuid and brand_id=b and stage='open' and closes_at>now() and not featured) then raise exception 'TEST FAILED: campaign not published';end if;
 if not exists(select 1 from public.campaign_sponsorship_codes where code_hash=repeat('1',64) and redeemed_by=b and redeemed_payment_id=(receipt->>'id')::uuid) then raise exception 'TEST FAILED: redemption missing';end if;
 again:=public.redeem_campaign_sponsorship(b,r,repeat('1',64),rec);
 if receipt->>'id' is distinct from again->>'id' or (select count(*) from public.payments where brand_id=b)<>1 then raise exception 'TEST FAILED: retry created another payment';end if;
 begin perform public.redeem_campaign_sponsorship(b,gen_random_uuid(),repeat('1',64),rec);raise exception 'TEST FAILED: code reused';exception when others then if sqlerrm like 'TEST FAILED%' then raise;end if;end;
 begin perform public.redeem_campaign_sponsorship(o,gen_random_uuid(),repeat('1',64),rec||jsonb_build_object('brand_id',o));raise exception 'TEST FAILED: other brand reused code';exception when others then if sqlerrm like 'TEST FAILED%' then raise;end if;end;
 begin perform public.redeem_campaign_sponsorship(b,r,repeat('1',64),rec||'{"name":"changed"}'::jsonb);raise exception 'TEST FAILED: replay changed details';exception when others then if sqlerrm like 'TEST FAILED%' then raise;end if;end;
end;$$;
reset role;
set local role anon;
do $$begin
 begin perform count(*) from public.campaign_sponsorship_codes;raise exception 'TEST FAILED: anonymous inventory access';exception when insufficient_privilege then null;end;
 begin perform public.redeem_campaign_sponsorship(null,null,null,null);raise exception 'TEST FAILED: anonymous redemption access';exception when insufficient_privilege then null;end;
end;$$;
reset role;
set local role authenticated;
do $$begin
 begin perform count(*) from public.campaign_sponsorship_codes;raise exception 'TEST FAILED: client inventory access';exception when insufficient_privilege then null;end;
 begin perform public.redeem_campaign_sponsorship(null,null,null,null);raise exception 'TEST FAILED: client can choose its discount';exception when insufficient_privilege then null;end;
end;$$;
reset role;
rollback;
select 'Passed: publication, receipt, replay, failed-publish rollback, expiry, disabled code, assigned brand, extra fees, reuse and client access checks; all fixtures rolled back.' result;
