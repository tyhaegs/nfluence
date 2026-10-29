import {PRICES} from './pricing.mjs';
export function normalizeCampaignCode(value){
 const code=String(value||'').trim().toUpperCase();
 if(!/^[A-Z0-9][A-Z0-9-]{3,79}$/.test(code))throw Error('Enter a valid free-campaign code.');
 return code;
}
export async function campaignCodeHash(value){
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(normalizeCampaignCode(value)));
 return [...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
export function validateCampaignGrant(grant,brandId,now=new Date(),email=''){
 const limit=grant?.max_redemptions===undefined?1:grant.max_redemptions;
 const used=grant?.redemption_count??(grant?.redeemed_payment_id?1:0);
 if(!grant||!grant.enabled||(limit!==null&&used>=limit)||(grant.expires_at&&new Date(grant.expires_at)<=now)||(grant.assigned_brand_id&&grant.assigned_brand_id!==brandId)||(grant.assigned_email&&grant.assigned_email!==String(email).trim().toLowerCase()))throw Error('This code is invalid, expired, or already used.');
 const perBrand=grant.max_redemptions_per_brand;
 if(perBrand!==null&&perBrand!==undefined){
  if(!Number.isInteger(grant.brand_redemption_count)||grant.brand_redemption_count<0)throw Error('Could not verify this code’s eligibility. Please try again.');
  if(grant.brand_redemption_count>=perBrand)throw Error('This code covers one free campaign per brand. Remove it to continue with regular pricing.');
 }
 return grant;
}
export function freeCampaignQuote(type,record){
 if(type!=='campaign_new')throw Error('This code is for one new campaign, not an annual plan, gig, or campaign edit.');
 if(record.featured||Number(record.featured_weeks??record.featuredWeeks??0)>0)throw Error('Turn off featured placement to use this free-campaign code. You can add featured placement separately later.');
 return {amount_cents:0,subtotal_cents:PRICES.campaign,discount_cents:PRICES.campaign,discount_pct:1,breakdown:{campaign:PRICES.campaign,featured:0,gig:0,annual:0,escrow:0},annual_included:false,monthly_feature:false,free_campaign:true,checkout_available:true};
}
