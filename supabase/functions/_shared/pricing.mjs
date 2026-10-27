export const PRICES=Object.freeze({campaign:29900,annual:199900,gig:4999,featured:Object.freeze({1:299,7:1499,30:4999})});
export function price(type,features={},annual=false,monthlyFeature=false){
 if(!['campaign_new','campaign_edit','gig','annual'].includes(type))throw Error('Choose a valid checkout type.');
 const days=Number(features.featured_weeks??features.featuredWeeks??0);
 if(features.featured&&![1,7,30].includes(days))throw Error('Featured placement must be 1, 7 or 30 days.');
 const campaign=type==='campaign_new'&&!annual?PRICES.campaign:0;
 const featured=features.featured?(annual&&monthlyFeature&&days===30?0:PRICES.featured[days]):0;
 const breakdown={campaign,featured:featured||0,gig:type==='gig'?PRICES.gig:0,annual:type==='annual'?PRICES.annual:0,escrow:0};
 const amount=Object.values(breakdown).reduce((a,b)=>a+b,0);
 return {amount_cents:amount,subtotal_cents:amount,discount_pct:0,breakdown,annual_included:annual,monthly_feature:!!features.featured&&annual&&monthlyFeature&&days===30};
}
export function checkoutEnabled(env){return env('BILLING_ENABLED')==='true'&&/^sk_live_/.test(env('STRIPE_SECRET_KEY')||'')&&/^pk_live_/.test(env('STRIPE_PUBLISHABLE_KEY')||'')&&!!env('STRIPE_WEBHOOK_SECRET');}
export function campaignRecord(f,brand){
 const row={brand_id:brand,name:String(f.campaign??f.name??'').trim(),brand_name:String(f.brand??f.brandName??''),description:f.description||null,comp_type:f.compType??f.comp_type??'product',comp:String(f.comp??''),spots_total:f.spotsTotal??f.spots_total??null,platforms:f.platforms||[],deliverables:f.deliverables||{},deadline:f.deadline,location:f.location||null,requirements:f.requirements||null,products:f.products||[],following:f.following||null,featured:!!f.featured,featured_weeks:f.featured?Number(f.featuredWeeks??f.featured_weeks):0,has_style_guide:!!f.hasStyleGuide,style_guide_url:f.styleGuideUrl||null,approval_required:!!f.approvalRequired,per_applicant_approval:!!f.perApplicantApproval,age_min:f.ageMin||null,language:f.language||null,niches:Array.isArray(f.niches)?f.niches.join(", "):(f.niches||null),img_url:f.imgUrl||f.imgPreview||f.bannerPreview||null,logo_url:f.logoUrl||f.logoPreview||null,agreement_version:'2026-10-26'};
 if(row.name.length<2||row.name.length>180)throw Error('Campaign name must be 2–180 characters.');
 if(!['product','paid','product+paid','other'].includes(row.comp_type))throw Error('Choose a valid compensation type.');
 if(row.spots_total!==null&&(!Number.isInteger(Number(row.spots_total))||row.spots_total<1||row.spots_total>10000))throw Error('Choose a creator cap between 1 and 10,000.');
 if(!/^\d{4}-\d{2}-\d{2}$|^\d{1,3} (day|days|week|weeks|month|months)$/.test(row.deadline||''))throw Error('Choose a valid campaign closing date or duration.');
 if(/^\d{4}-\d{2}-\d{2}$/.test(row.deadline)&&Date.parse(row.deadline+'T23:59:59Z')<=Date.now())throw Error('Choose a future campaign closing date.');
 return row;
}
