begin;
create temp table per_brand_fixture as select gen_random_uuid() brand,gen_random_uuid() other,gen_random_uuid() owner_id,gen_random_uuid() request_id;
grant select on per_brand_fixture to service_role,authenticated;
insert into auth.users(id,email,raw_user_meta_data) select brand,'trial-'||brand||'@example.invalid','{"role":"brand"}'::jsonb from per_brand_fixture union all select other,'trial-'||other||'@example.invalid','{"role":"brand"}'::jsonb from per_brand_fixture union all select owner_id,'trial-owner-'||owner_id||'@example.invalid','{"role":"brand"}'::jsonb from per_brand_fixture;
insert into public.platform_owners(user_id) select owner_id from per_brand_fixture;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
set local role service_role;
do $$declare b uuid;o uuid;actor uuid;r uuid;code jsonb;rec jsonb;first_pay jsonb;again jsonb;other_pay jsonb;failed boolean:=false;cid uuid;
begin
 select brand,other,owner_id,request_id into b,o,actor,r from per_brand_fixture;
 code:=public.owner_manage(actor,'create_code',null,jsonb_build_object('code_hash',repeat('d',64),'code_hint','TRAL','label','One-per-brand fixture','max_redemptions',null,'max_redemptions_per_brand',1),gen_random_uuid());cid:=(code->>'id')::uuid;
 if (code->>'max_redemptions_per_brand')::int<>1 or code->>'max_redemptions' is not null then raise exception 'TEST FAILED: owner issued wrong scope';end if;
 again:=public.owner_read(actor,'codes','One-per-brand fixture');
 if (again->'rows'->0->>'max_redemptions_per_brand')::int<>1 then raise exception 'TEST FAILED: dashboard quota missing';end if;
 rec:=jsonb_build_object('brand_id',b,'name','One-per-brand fixture','brand_name','Fixture','deadline','0 days','comp_type','product','comp','','platforms','[]'::jsonb,'deliverables','{}'::jsonb,'featured',false,'featured_weeks',0);
 begin perform public.redeem_campaign_sponsorship(b,r,repeat('d',64),rec);raise exception 'TEST FAILED: invalid campaign published';exception when others then if sqlerrm like 'TEST FAILED%' then raise;end if;end;
 if exists(select 1 from public.campaign_sponsorship_brand_usage where code_id=cid) then raise exception 'TEST FAILED: failure consumed allowance';end if;
 rec:=rec||'{"deadline":"30 days"}'::jsonb;
 first_pay:=public.redeem_campaign_sponsorship(b,r,repeat('d',64),rec);
 again:=public.redeem_campaign_sponsorship(b,r,repeat('d',64),rec);
 if first_pay->>'id'<>again->>'id' or (select redemption_count from public.campaign_sponsorship_brand_usage where code_id=cid and brand_id=b)<>1 then raise exception 'TEST FAILED: retry duplicated campaign or consumed extra use';end if;
 begin perform public.redeem_campaign_sponsorship(b,gen_random_uuid(),repeat('d',64),rec);raise exception 'TEST FAILED: brand reused trial';exception when others then if sqlerrm not like 'This code covers one free campaign per brand%' then raise;end if;end;
 -- A different request with changed campaign details must still require payment.
 begin perform public.redeem_campaign_sponsorship(b,gen_random_uuid(),repeat('d',64),rec||'{"name":"Another campaign"}'::jsonb);raise exception 'TEST FAILED: changed brief bypassed trial';exception when others then if sqlerrm not like 'This code covers one free campaign per brand%' then raise;end if;end;
 other_pay:=public.redeem_campaign_sponsorship(o,gen_random_uuid(),repeat('d',64),rec||jsonb_build_object('brand_id',o));
 if first_pay->>'campaign_id'=other_pay->>'campaign_id' or (select count(*) from public.campaign_sponsorship_brand_usage where code_id=cid and redemption_count=1)<>2 then raise exception 'TEST FAILED: other brand could not receive own trial';end if;
 -- Deleting an older campaign preserves its receipt/history and must not reset the allowance.
 delete from public.campaigns where id=(first_pay->>'campaign_id')::uuid;
 if (select redemption_count from public.campaign_sponsorship_brand_usage where code_id=cid and brand_id=b)<>1 then raise exception 'TEST FAILED: deleting campaign reset trial';end if;
 begin perform public.redeem_campaign_sponsorship(b,gen_random_uuid(),repeat('d',64),rec);raise exception 'TEST FAILED: deletion bypassed trial';exception when others then if sqlerrm not like 'This code covers one free campaign per brand%' then raise;end if;end;
 if (select redemption_count from public.campaign_sponsorship_codes where id=cid)<>2 then raise exception 'TEST FAILED: failed retries changed global count';end if;
end;$$;
reset role;
set local role authenticated;
do $$begin
 begin perform count(*) from public.campaign_sponsorship_brand_usage;raise exception 'TEST FAILED: client read allowances';exception when insufficient_privilege then null;end;
 begin insert into public.campaign_sponsorship_brand_usage(code_id,brand_id,redemption_count) values(gen_random_uuid(),gen_random_uuid(),1);raise exception 'TEST FAILED: client changed allowance';exception when insufficient_privilege then null;end;
end;$$;
reset role;
rollback;
select 'One free campaign per brand: first publication, idempotent retry, repeat/changed-brief rejection, independent second-brand trial, failed-publication rollback, campaign deletion resistance, owner labels, and direct-client denial passed. All fixtures rolled back.' result;
