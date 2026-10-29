import test from 'node:test';import assert from 'node:assert/strict';
import {ownerChange,uuid,futureDate} from '../supabase/functions/_shared/owner.mjs';
import {validateCampaignGrant} from '../supabase/functions/_shared/promotions.mjs';
const requestId='22e23d24-fcf4-48cd-89ef-ea8411d08e36',targetId='550e8400-e29b-41d4-a716-446655440000';
test('owner code creation normalizes and binds email without persisting the plain code',async()=>{
 const c=await ownerChange({action:'create_code',requestId,data:{code:'supervibe',email:' Chosen@Example.com ',label:'Chosen brand',amount:0,unlimited:true}});
 assert.equal(c.code,'SUPERVIBE');assert.equal(c.data.code_hint,'VIBE');assert.equal(c.data.assigned_email,'chosen@example.com');assert.match(c.data.code_hash,/^[a-f0-9]{64}$/);assert.ok(!JSON.stringify(c.data).includes('SUPERVIBE'));assert.equal(c.data.unlimited,undefined);
});
test('owner actions accept only explicit operations, record IDs and required reasons',async()=>{
 await assert.rejects(()=>ownerChange({action:'grant_owner',requestId,data:{}}));
 await assert.rejects(()=>ownerChange({action:'campaign_state',requestId,targetId,data:{stage:'draft',note:'reset'}}));
 await assert.rejects(()=>ownerChange({action:'end_membership',requestId,targetId,data:{note:''}}));
 await assert.rejects(()=>ownerChange({action:'grant_membership',requestId,data:{brandId:targetId,endsAt:'2000-01-01',note:'gift'}}));
 assert.throws(()=>uuid('not-a-record'));assert.throws(()=>futureDate('bad-date'));
 const valid=await ownerChange({action:'campaign_state',requestId,targetId,data:{stage:'wrap_up',note:'Campaign complete',brand_id:'forged'}});assert.deepEqual(valid.data,{stage:'wrap_up',note:'Campaign complete'});
});
test('email-bound invitations authorize the verified recipient, including after signup',()=>{
 const grant={enabled:true,assigned_email:'chosen@example.com'};
 assert.ok(validateCampaignGrant(grant,'brand',new Date(),'CHOSEN@example.com'));
 assert.throws(()=>validateCampaignGrant(grant,'brand',new Date(),'other@example.com'));
 assert.throws(()=>validateCampaignGrant(grant,'brand'));
});
test('owner selects reusable or single-use behavior explicitly',async()=>{
 const reusable=await ownerChange({action:'create_code',requestId,data:{code:'demo',usage:'reusable'}});assert.equal(reusable.data.max_redemptions,null);
 const single=await ownerChange({action:'create_code',requestId,data:{code:'a-gift',usage:'single'}});assert.equal(single.data.max_redemptions,1);
 await assert.rejects(()=>ownerChange({action:'create_code',requestId,data:{code:'demo',usage:'unrecognized'}}));
});

test('campaign edits reject impossible dates and zero or excessive durations',async()=>{
 for(const deadline of ['2027-02-30','2027-13-01','0 days','366 days','-1 month','tomorrow'])await assert.rejects(()=>ownerChange({action:'campaign_details',requestId,targetId,data:{name:'Campaign',deadline,note:'Correct brief'}}));
 const result=await ownerChange({action:'campaign_details',requestId,targetId,data:{name:'Campaign',deadline:'2028-02-29',note:'Correct brief'}});assert.equal(result.data.deadline,'2028-02-29');
});

test('owner can issue one-per-brand invitations without a global redemption limit',async()=>{
 const limited=await ownerChange({action:'create_code',requestId,data:{code:'demo-gift',usage:'per_brand',max_redemptions_per_brand:50}});
 assert.equal(limited.data.max_redemptions,null);assert.equal(limited.data.max_redemptions_per_brand,1);
 const unlimited=await ownerChange({action:'create_code',requestId,data:{code:'unlimited-gift',usage:'reusable'}});assert.equal(unlimited.data.max_redemptions_per_brand,null);
});
