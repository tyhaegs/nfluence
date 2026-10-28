import test from 'node:test';
import assert from 'node:assert/strict';
import {campaignCodeHash,normalizeCampaignCode,validateCampaignGrant,freeCampaignQuote} from '../supabase/functions/_shared/promotions.mjs';
import {price} from '../supabase/functions/_shared/pricing.mjs';
test('invite codes normalize identically and hash without exposing the code',async()=>{
 assert.equal(normalizeCampaignCode(' nfgift-test-1234 '),'NFGIFT-TEST-1234');
 assert.equal(await campaignCodeHash('nfgift-test-1234'),await campaignCodeHash(' NFGIFT-TEST-1234 '));
 assert.match(await campaignCodeHash('NFGIFT-TEST-1234'),/^[0-9a-f]{64}$/);
 for(const c of ['', 'short', 'a'.repeat(81),'<script>test</script>'])assert.throws(()=>normalizeCampaignCode(c));
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
