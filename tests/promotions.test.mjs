import test from 'node:test';
import assert from 'node:assert/strict';
import {campaignCodeHash,normalizeCampaignCode,validateCampaignGrant,freeCampaignQuote} from '../supabase/functions/_shared/promotions.mjs';
import {price} from '../supabase/functions/_shared/pricing.mjs';
test('invite codes normalize identically and hash without exposing the code',async()=>{
 assert.equal(normalizeCampaignCode(' nfgift-test-1234 '),'NFGIFT-TEST-1234');
 assert.equal(await campaignCodeHash('nfgift-test-1234'),await campaignCodeHash(' NFGIFT-TEST-1234 '));
 assert.match(await campaignCodeHash('NFGIFT-TEST-1234'),/^[0-9a-f]{64}$/);
 for(const c of ['', 'abc', 'a'.repeat(81),'<script>test</script>'])assert.throws(()=>normalizeCampaignCode(c));
});
test('unknown, disabled, expired, used, and other-brand invitations cannot quote free',()=>{
 const active={enabled:true};assert.equal(validateCampaignGrant(active,'brand'),active);
 for(const g of [null,{enabled:false},{enabled:true,expires_at:'2000-01-01'},{enabled:true,redeemed_payment_id:'payment'},{enabled:true,assigned_brand_id:'other'}])assert.throws(()=>validateCampaignGrant(g,'brand'));
 assert.ok(validateCampaignGrant({enabled:true,assigned_brand_id:'brand'},'brand'));
});
test('invitations waive only a standard new campaign, never paid extras or annual access',()=>{
 const quote=freeCampaignQuote('campaign_new',{featured:false,featured_weeks:0});
 assert.equal(quote.amount_cents,0);assert.equal(quote.discount_cents,29900);assert.equal(quote.checkout_available,true);assert.equal(quote.annual_included,false);
 for(const type of ['campaign_edit','annual','gig'])assert.throws(()=>freeCampaignQuote(type,{}));
 assert.throws(()=>freeCampaignQuote('campaign_new',{featured:true,featured_weeks:7}));
 assert.throws(()=>freeCampaignQuote('campaign_new',{featured:false,featured_weeks:30}));
 assert.equal(price('campaign_new',{}).amount_cents,29900);
});
test('reusable codes remain valid after any number of redemptions, but capped codes stop',()=>{
 assert.equal(normalizeCampaignCode('demo'),'DEMO');
 const reusable={enabled:true,max_redemptions:null,redemption_count:500,redeemed_payment_id:'prior'};
 assert.ok(validateCampaignGrant(reusable,'brand'));
 assert.throws(()=>validateCampaignGrant({...reusable,enabled:false},'brand'));
 assert.throws(()=>validateCampaignGrant({...reusable,max_redemptions:500},'brand'));
 assert.ok(validateCampaignGrant({...reusable,max_redemptions:501},'brand'));
});

test('one-per-brand codes allow other brands but require a verified unused allowance',()=>{
 const trial={enabled:true,max_redemptions:null,redemption_count:500,max_redemptions_per_brand:1,brand_redemption_count:0};
 assert.ok(validateCampaignGrant(trial,'new-brand'));
 assert.throws(()=>validateCampaignGrant({...trial,brand_redemption_count:1},'used-brand'),/one free campaign per brand/);
 assert.throws(()=>validateCampaignGrant({...trial,brand_redemption_count:2},'used-brand'),/regular pricing/);
 for(const count of [undefined,null,-1,'0',NaN])assert.throws(()=>validateCampaignGrant({...trial,brand_redemption_count:count},'brand'),/verify/);
 // Regular pricing remains authoritative when the used code is removed.
 assert.equal(price('campaign_new',{}).amount_cents,29900);
});
