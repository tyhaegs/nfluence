import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {price,campaignRecord,checkoutEnabled} from '../supabase/functions/_shared/pricing.mjs';
import {campaignFromRow,campaignToUpdate,eligibleCampaign,zonedDateTime,safeHttpUrl,unwrap,sanitizePendingProfile} from '../campaigns/src/data.js';
test('advertised campaign and annual fees, no creator money collected',()=>{assert.equal(price('campaign_new',{}).amount_cents,29900);assert.equal(price('annual',{}).amount_cents,199900);assert.equal(price('campaign_new',{comp:'500',compType:'paid',spotsTotal:20}).breakdown.escrow,0);});
test('featured terms cannot silently become free',()=>{for(const term of [0,2,15,999])assert.throws(()=>price('campaign_new',{featured:true,featuredWeeks:term}));assert.equal(price('campaign_new',{featured:true,featuredWeeks:7}).amount_cents,31399);});
test('annual entitlements include campaign fee and monthly 30 day placement',()=>{assert.equal(price('campaign_new',{},true).amount_cents,0);assert.equal(price('campaign_new',{featured:true,featuredWeeks:30},true,true).amount_cents,0);assert.equal(price('campaign_new',{featured:true,featuredWeeks:30},true,false).amount_cents,4999);});
test('test credentials and partial configuration never enable production charges',()=>{assert.equal(checkoutEnabled(k=>({BILLING_ENABLED:'true',STRIPE_SECRET_KEY:'sk_test_x',STRIPE_PUBLISHABLE_KEY:'pk_test_x',STRIPE_WEBHOOK_SECRET:'whsec_x'})[k]),false);assert.equal(checkoutEnabled(()=>undefined),false);assert.equal(checkoutEnabled(k=>({BILLING_ENABLED:'true',STRIPE_SECRET_KEY:'sk_live_x',STRIPE_PUBLISHABLE_KEY:'pk_live_x',STRIPE_WEBHOOK_SECRET:'whsec_x'})[k]),true);});
test('campaign state maps stable IDs, capacity, and expired featuring',()=>{const c=campaignFromRow({id:'c',brand_id:'b',name:'Brief',brand_name:'Brand',comp_type:'paid',spots_total:2,spots_filled:1,stage:'open',closes_at:'2099-01-01',featured:true,featured_until:'2020-01-01',applications:[{id:'a',creator_id:'u',name:'Same Name',status:'accepted'}]});assert.equal(c.creators.approved[0].applicationId,'a');assert.equal(c.creators.approved[0].creatorId,'u');assert.equal(c.featured,false);assert.equal(eligibleCampaign(c),true);assert.equal(eligibleCampaign({...c,spotsFilled:2}),false);assert.equal(eligibleCampaign({...c,stage:'draft'}),false);assert.equal(campaignToUpdate({...c,hasStyleGuide:true}).has_style_guide,true);});
test('timezone conversion handles different zones and rejects nonexistent DST time',()=>{assert.equal(zonedDateTime('2026-11-01','15:30','America/Los_Angeles'),'2026-11-01T23:30:00.000Z');assert.equal(zonedDateTime('2026-07-01','15:30','America/New_York'),'2026-07-01T19:30:00.000Z');assert.throws(()=>zonedDateTime('2026-03-08','02:30','America/Los_Angeles'));});
test('URLs and returned persistence errors are checked',()=>{assert.equal(safeHttpUrl('javascript:alert(1)'),null);assert.equal(safeHttpUrl('https://example.com'),'https://example.com/');assert.throws(()=>unwrap({error:{message:'Denied'}}),/Denied/);});
test('campaign checkout validates dates, cap and compensation',()=>{assert.throws(()=>campaignRecord({campaign:'x',deadline:'30 days'},'b'));assert.throws(()=>campaignRecord({campaign:'Brief',deadline:'tomorrow'},'b'));assert.throws(()=>campaignRecord({campaign:'Brief',deadline:'30 days',spotsTotal:-1},'b'));assert.equal(campaignRecord({campaign:'Brief',deadline:'30 days',compType:'paid'},'b').comp_type,'paid');});
test('service inquiry paths match all twelve services and privacy routes exist',()=>{const html=readFileSync('index.html','utf8');const links=[...html.matchAll(/contact\.html\?service=([a-z-]+)/g)].map(m=>m[1]);assert.equal(new Set(links).size,12);for(const slug of new Set(links)){assert.ok(existsSync('services/'+slug+'/index.html'),slug);}for(const file of ['privacy/index.html','terms/index.html','favicon.ico','assets/social-card.png'])assert.ok(existsSync(file));assert.doesNotMatch(readFileSync('campaigns/index.html','utf8'),/babel|react\.development/);});

test('pending signup profiles never store entered passwords',()=>{const clean=sanitizePendingProfile({email:'qa@example.invalid',role:'brand',password:'root-secret',data:{name:'Brand',password:'secret',confirmPassword:'secret',confirm_password:'secret'}});assert.deepEqual(clean.data,{name:'Brand'});assert.doesNotMatch(JSON.stringify(clean),/secret/);});

test('past campaign dates are rejected before checkout',()=>assert.throws(()=>campaignRecord({campaign:'Brief',deadline:'2020-01-01'},'b'),/future/));

import {serviceKey} from '../supabase/functions/_shared/environment.mjs';
test('server operations prefer current keys when legacy keys are disabled',()=>{assert.equal(serviceKey(k=>({SUPABASE_SECRET_KEYS:JSON.stringify({default:'sb_secret_fixture'}),SUPABASE_SERVICE_ROLE_KEY:'disabled-jwt'})[k]),'sb_secret_fixture');assert.throws(()=>serviceKey(()=>undefined));assert.throws(()=>serviceKey(k=>k==='SUPABASE_SECRET_KEYS'?'invalid':undefined));});

import {DEMO_CAMPAIGNS} from '../campaigns/src/demos.js';
test('public demos cannot become application targets when dates or capacity change',()=>{
 assert.equal(DEMO_CAMPAIGNS.length,4);
 assert.equal(new Set(DEMO_CAMPAIGNS.map(c=>c.id)).size,4);
 for(const c of DEMO_CAMPAIGNS){
  assert.ok(existsSync('.'+c.imgUrl));assert.ok(existsSync('.'+c.logoUrl));
  assert.equal(eligibleCampaign({...c,stage:'open',closes_at:'2099-01-01',spotsFilled:0}),false);
  assert.equal(eligibleCampaign({...c,isDemo:false,stage:'open',closes_at:'2099-01-01',spotsFilled:0}),false);
 }
 assert.equal(eligibleCampaign({id:'real-campaign',stage:'open',closes_at:'2099-01-01',spotsTotal:10,spotsFilled:0}),true);
});
