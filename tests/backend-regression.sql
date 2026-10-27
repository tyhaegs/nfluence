-- Executed within the migration transaction and always rolled back. No messages or emails are sent.
create temp table audit_fixture as select gen_random_uuid() b,gen_random_uuid() c,gen_random_uuid() other,gen_random_uuid() campaign,gen_random_uuid() app;
grant select on audit_fixture to authenticated,service_role;
insert into auth.users(id,email,raw_user_meta_data) select b,'audit-brand@example.invalid','{"role":"brand"}'::jsonb from audit_fixture union all select c,'audit-creator@example.invalid','{"role":"creator"}'::jsonb from audit_fixture union all select other,'audit-other@example.invalid','{"role":"creator"}'::jsonb from audit_fixture;
select set_config('request.jwt.claims',jsonb_build_object('role','service_role')::text,true);
insert into public.campaigns(id,brand_id,name,brand_name,deadline,stage,comp_type,comp,spots_total) select campaign,b,'Audit transaction fixture','Fixture','30 days','open','paid','100',1 from audit_fixture;
select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',c)::text,true) from audit_fixture;
set local role authenticated;
insert into public.applications(id,campaign_id,creator_id,brand_id,status,stage,name) select app,campaign,c,b,'applied','applied','Test Creator' from audit_fixture;
do $$begin
 begin update public.applications set status='accepted',stage='accepted' where id=(select app from audit_fixture);raise exception 'TEST FAILED: self approval allowed';exception when raise_exception then if sqlerrm like 'TEST FAILED%' then raise;end if;end;
 begin insert into public.applications(campaign_id,creator_id,brand_id,status,stage) select campaign,other,b,null,null from audit_fixture;raise exception 'TEST FAILED: nullable app accepted';exception when others then if sqlerrm like 'TEST FAILED%' then raise;end if;end;
end;$$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',b)::text,true) from audit_fixture;
set local role authenticated;
update public.applications set status='accepted',stage='accepted' where id=(select app from audit_fixture);
do $$begin
 if (select spots_filled from public.campaigns where id=(select campaign from audit_fixture))<>1 then raise exception 'TEST FAILED: capacity not updated';end if;
 begin update public.applications set status='applied' where id=(select app from audit_fixture);raise exception 'TEST FAILED: accepted app demoted';exception when raise_exception then if sqlerrm like 'TEST FAILED%' then raise;end if;end;
 begin update public.applications set stage='paid' where id=(select app from audit_fixture);raise exception 'TEST FAILED: premature payment';exception when raise_exception then if sqlerrm like 'TEST FAILED%' then raise;end if;end;
 begin update public.campaigns set deliverables='{"Instagram":"changed"}' where id=(select campaign from audit_fixture);raise exception 'TEST FAILED: agreed deliverables changed';exception when raise_exception then if sqlerrm like 'TEST FAILED%' then raise;end if;end;
end;$$;
insert into public.messages(campaign_id,sender_id,recipient_id,from_role,text) select campaign,b,c,'brand','Audit fixture message' from audit_fixture;
insert into public.scheduled_calls(campaign_id,brand_id,creator_id,datetime,timezone,meet_link) select campaign,b,c,now()+interval '1 day','America/Los_Angeles','https://meet.example.invalid' from audit_fixture;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',c)::text,true) from audit_fixture;
set local role authenticated;
update public.messages set read=true where recipient_id=(select c from audit_fixture);
update public.scheduled_calls set confirmed=true where creator_id=(select c from audit_fixture);
do $$begin
 if private.can_access_content('------------------------------------/------------------------------------/x/file.pdf',false) then raise exception 'TEST FAILED: malformed path access';end if;
 begin insert into public.reviews(campaign_id,creator_id,brand_id,rating,text) select campaign,c,b,5,'Before approval' from audit_fixture;raise exception 'TEST FAILED: premature review';exception when raise_exception then if sqlerrm like 'TEST FAILED%' then raise;end if;end;
end;$$;
reset role;
-- Exercise atomic billing and replay without creating an external Stripe payment.
select set_config('request.jwt.claims','{"role":"service_role"}',true);
create temp table audit_checkout as select public.prepare_checkout(b,gen_random_uuid(),'campaign_new',29900,jsonb_build_object('record',jsonb_build_object('name','Billing fixture','brand_name','Fixture','deadline','30 days','comp_type','product','platforms','[]'::jsonb,'deliverables','{}'::jsonb,'featured',false,'featured_weeks',0),'annual_included',false,'monthly_feature',false),null) pay from audit_fixture;
update public.payments set stripe_payment_intent_id='pi_fixture_rollback' where id=(select (pay->>'id')::uuid from audit_checkout);
select public.finalize_checkout((pay->>'id')::uuid,'pi_fixture_rollback',29900,'usd','evt_fixture_rollback','payment_intent.succeeded') from audit_checkout;
select public.finalize_checkout((pay->>'id')::uuid,'pi_fixture_rollback',29900,'usd','evt_fixture_rollback','payment_intent.succeeded') from audit_checkout;
do $$begin
 if (select count(*) from public.billing_events where event_id='evt_fixture_rollback')<>1 then raise exception 'TEST FAILED: duplicate event';end if;
 begin perform public.finalize_checkout((select (pay->>'id')::uuid from audit_checkout),'pi_fixture_rollback',1,'usd');raise exception 'TEST FAILED: wrong amount accepted';exception when raise_exception then if sqlerrm like 'TEST FAILED%' then raise;end if;end;
end;$$;
select 'All transactional permission and billing checks passed' result;
-- Continue the creator workflow using temporary storage metadata; no binary is uploaded.
select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',c)::text,true) from audit_fixture;
insert into storage.objects(bucket_id,name) select 'content',c::text||'/'||app::text||'/fixture/file.pdf' from audit_fixture;
set local role authenticated;
select public.submit_content(app,c::text||'/'||app::text||'/fixture/file.pdf','file.pdf','application/pdf',100) from audit_fixture;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',b)::text,true) from audit_fixture;
set local role authenticated;
update public.applications set stage='approved' where id=(select app from audit_fixture);
do $$begin
 begin update public.applications set stage='paid' where id=(select app from audit_fixture);raise exception 'TEST FAILED: unrecorded payment accepted';exception when raise_exception then if sqlerrm like 'TEST FAILED%' then raise;end if;end;
end;$$;
select public.record_manual_payout(app,10000,'fixture transfer - rolled back',now()) from audit_fixture;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',c)::text,true) from audit_fixture;
set local role authenticated;
insert into public.reviews(campaign_id,creator_id,brand_id,rating,text) select campaign,c,b,5,'Approved fixture work' from audit_fixture;
update public.applications set paid_at='2000-01-01' where id=(select app from audit_fixture);
do $$begin
 if (select paid_at from public.applications where id=(select app from audit_fixture))<'2026-01-01' then raise exception 'TEST FAILED: timestamp forged';end if;
 begin update public.profiles set role='brand' where id=(select c from audit_fixture);raise exception 'TEST FAILED: role tampered';exception when raise_exception then if sqlerrm like 'TEST FAILED%' then raise;end if;end;
end;$$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',b)::text,true) from audit_fixture;
set local role authenticated;
update public.reviews set brand_response='Thank you' where campaign_id=(select campaign from audit_fixture);
do $$begin
 begin update public.reviews set rating=1 where campaign_id=(select campaign from audit_fixture);raise exception 'TEST FAILED: review rating changed by brand';exception when raise_exception then if sqlerrm like 'TEST FAILED%' then raise;end if;end;
end;$$;
reset role;
select 'All workflow, private storage, payout and review checks passed' result;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
create temp table audit_annual as select public.prepare_checkout(b,gen_random_uuid(),'annual',199900,'{"record":{},"annual_included":false,"monthly_feature":false}',null) pay from audit_fixture;
update public.payments set stripe_payment_intent_id='pi_annual_fixture' where id=(select (pay->>'id')::uuid from audit_annual);
select public.finalize_checkout((pay->>'id')::uuid,'pi_annual_fixture',199900,'usd') from audit_annual;
do $$declare f record;r jsonb;begin
 select * into f from audit_fixture;
 if (select count(*) from public.subscriptions where brand_id=f.b and status='active' and current_period_end>now()+interval '11 months')<>1 then raise exception 'TEST FAILED: annual access missing';end if;
 -- Two existing open campaigns count toward the three-campaign limit.
 r:=public.prepare_checkout(f.b,gen_random_uuid(),'campaign_new',0,'{"record":{"name":"Annual included fixture","brand_name":"Fixture","deadline":"30 days","comp_type":"product","featured":false,"featured_weeks":0},"annual_included":true,"monthly_feature":false}',null);
 perform public.finalize_checkout((r->>'id')::uuid,null,0,'usd');
 begin perform public.prepare_checkout(f.b,gen_random_uuid(),'campaign_new',0,'{"record":{"name":"Over cap fixture","brand_name":"Fixture","deadline":"30 days","comp_type":"product","featured":false,"featured_weeks":0},"annual_included":true,"monthly_feature":false}',null);raise exception 'TEST FAILED: annual cap bypassed';exception when raise_exception then if sqlerrm like 'TEST FAILED%' then raise;end if;end;
end;$$;
select 'All backend regression checks passed; fixtures rolled back' result;
