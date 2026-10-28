import {serviceKey} from '../_shared/environment.mjs';
import Stripe from 'npm:stripe@14.25.0';
import {createClient} from 'npm:@supabase/supabase-js@2.108.2';
import {price,campaignRecord,checkoutEnabled} from '../_shared/pricing.mjs';
import {campaignCodeHash,validateCampaignGrant,freeCampaignQuote} from '../_shared/promotions.mjs';
const origins=['https://nfluenceagency.com','https://www.nfluenceagency.com'];
const checked=(r:any)=>{if(r.error)throw Error(r.error.message);return r.data;};
Deno.serve(async req=>{
 const origin=req.headers.get('origin');const cors={'Access-Control-Allow-Origin':origins.includes(origin||'')?origin!:origins[0],'Access-Control-Allow-Headers':'authorization,content-type,apikey','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin'};
 const json=(data:any,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(req.method!=='POST')return json({error:'Method not allowed'},405);
 if(origin&&!origins.includes(origin))return json({error:'Origin not allowed'},403);
 try{
  if(Number(req.headers.get('content-length')||0)>2000000)return json({error:'Request too large'},413);
  const admin=createClient(Deno.env.get('SUPABASE_URL')!,serviceKey(k=>Deno.env.get(k)),{auth:{persistSession:false}});
  const token=(req.headers.get('authorization')||'').replace(/^Bearer /,'');const auth=await admin.auth.getUser(token);
  if(auth.error||!auth.data.user)return json({error:'Please sign in again.'},401);const user=auth.data.user;
  const profile=checked(await admin.from('profiles').select('role').eq('id',user.id).single());if(profile.role!=='brand')return json({error:'A brand account is required.'},403);
  const body=await req.json(),action=body.action;
  if(!['quote','charge','cancel','unfeature','annual','reconcile','annual_reconcile'].includes(action))return json({error:'Invalid action'},400);
  const enabled=checkoutEnabled(k=>Deno.env.get(k));
  const stripe=new Stripe(Deno.env.get('STRIPE_SECRET_KEY')||'sk_unconfigured',{apiVersion:'2023-10-16'});
  if(action==='unfeature'){
   checked(await admin.from('campaigns').update({featured:false,featured_until:null,featured_weeks:0}).eq('id',body.campaignId).eq('brand_id',user.id).select().single());return json({ok:true});
  }
  if(action==='reconcile'||action==='annual_reconcile'){
   let q=admin.from('payments').select('*').eq('brand_id',user.id);q=action==='reconcile'?q.eq('stripe_payment_intent_id',body.paymentIntentId):q.eq('stripe_checkout_session_id',body.sessionId);const pay=checked(await q.single());
   let piId=pay.stripe_payment_intent_id;
   if(action==='annual_reconcile'){const checkout=await stripe.checkout.sessions.retrieve(pay.stripe_checkout_session_id);if(checkout.payment_status!=='paid')throw Error('Annual payment is still pending.');piId=String(checkout.payment_intent);checked(await admin.from('payments').update({stripe_payment_intent_id:piId}).eq('id',pay.id));}
   const pi=await stripe.paymentIntents.retrieve(piId);if(pi.status!=='succeeded')throw Error('Payment is still pending. Check your account before trying again.');
   const saved=checked(await admin.rpc('finalize_checkout',{p_payment:pay.id,p_provider:pi.id,p_amount:pi.amount_received,p_currency:pi.currency}));return json({ok:true,status:saved.status,campaignId:saved.campaign_id});
  }
  if(action==='cancel'){
   if(!body.paymentIntentId)return json({ok:true});
   const pay=checked(await admin.from('payments').select('*').eq('stripe_payment_intent_id',body.paymentIntentId).eq('brand_id',user.id).single());
   const pi=await stripe.paymentIntents.retrieve(pay.stripe_payment_intent_id);
   if(pi.status==='succeeded'){checked(await admin.rpc('finalize_checkout',{p_payment:pay.id,p_provider:pi.id,p_amount:pi.amount_received,p_currency:pi.currency}));return json({ok:true,status:'succeeded'});}
   if(pi.status!=='canceled')await stripe.paymentIntents.cancel(pi.id,{}, {idempotencyKey:'cancel:'+pay.request_id});
   checked(await admin.from('payments').update({status:'canceled',provider_status:'canceled'}).eq('id',pay.id).neq('status','succeeded'));
   return json({ok:true,status:'canceled'});
  }
  const type=action==='annual'?'annual':body.type;
  if(body.promoCode && type!=='campaign_new')throw Error('Free-campaign codes are for new campaigns only.');
  let rec:any=body.features||{};
  if(type==='campaign_new')rec=campaignRecord(rec,user.id);
  if(type==='campaign_edit'){
   const old=checked(await admin.from('campaigns').select('*').eq('id',body.campaignId).eq('brand_id',user.id).single());
   rec={comp:String(rec.comp??old.comp),comp_type:rec.compType??old.comp_type,spots_total:rec.spotsTotal??old.spots_total,featured:!!rec.featured,featured_weeks:Number(rec.featuredWeeks||0)};
   if(rec.featured&&old.featured&&new Date(old.featured_until)>new Date()){rec.featured=false;rec.featured_weeks=0;rec.keep_featured=true;}
  }
  if(type==='gig'){
   const f=rec;rec={title:String(f.title||'').trim(),description:f.description||null,comp:f.comp!=null?String(f.comp):null,pay_type:f.pay_type??f.payType??null,deadline:f.deadline||null,location:f.location||null,platforms:f.platforms||[],deliverables:f.deliverables||null,skills_required:f.skills_required??f.skills??[],requirements:f.requirements||null,equipment:f.equipment||null};if(rec.title.length<2)throw Error('Enter a gig title.');
  }
  if(body.promoCode){
   const giftQuote=freeCampaignQuote(type,rec);
   const codeHash=await campaignCodeHash(body.promoCode);
   if(action==='quote'){
    const grant=checked(await admin.from('campaign_sponsorship_codes').select('enabled,assigned_brand_id,expires_at,redeemed_payment_id').eq('code_hash',codeHash).maybeSingle());
    validateCampaignGrant(grant,user.id);
    return json(giftQuote);
   }
   if(!/^[0-9a-f-]{36}$/i.test(body.requestId||''))throw Error('A checkout request ID is required.');
   const pay=checked(await admin.rpc('redeem_campaign_sponsorship',{p_brand:user.id,p_request:body.requestId,p_code_hash:codeHash,p_record:rec}));
   return json({free:true,campaignId:pay.campaign_id,...giftQuote});
  }
  const sub=checked(await admin.from('subscriptions').select('*').eq('brand_id',user.id).eq('status','active').gt('current_period_end',new Date().toISOString()).order('current_period_end',{ascending:false}).limit(1))[0];
  let period:string|null=null,available=false;
  if(sub){const start=new Date(sub.current_period_start);const now=new Date();let month=(now.getUTCFullYear()-start.getUTCFullYear())*12+now.getUTCMonth()-start.getUTCMonth();let current=new Date(start);current.setUTCMonth(start.getUTCMonth()+month);if(current>now){month--;current=new Date(start);current.setUTCMonth(start.getUTCMonth()+month);}period=current.toISOString().slice(0,10);available=!checked(await admin.from('annual_feature_redemptions').select('id').eq('subscription_id',sub.id).eq('period_start',period)).length;}
  const quote=price(type,rec,!!sub,available);
  if(action==='quote')return json({...quote,checkout_available:enabled});
  if(!enabled)return json({error:'Online checkout is temporarily unavailable. Contact nfluence to discuss your campaign.'},503);
  if(!/^[0-9a-f-]{36}$/i.test(body.requestId||''))throw Error('A checkout request ID is required.');
  const changes={record:rec,annual_included:quote.annual_included,monthly_feature:quote.monthly_feature,feature_period:period};
  const pay=checked(await admin.rpc('prepare_checkout',{p_brand:user.id,p_request:body.requestId,p_type:type,p_amount:quote.amount_cents,p_changes:changes,p_campaign:body.campaignId||null}));
  if(pay.status==='canceled')throw Error('This checkout was canceled. Close and reopen checkout.');
  if(pay.status==='succeeded')return json({free:true,campaignId:pay.campaign_id,gigId:pay.gig_id,...quote});
  if(!quote.amount_cents){checked(await admin.rpc('finalize_checkout',{p_payment:pay.id,p_provider:null,p_amount:0,p_currency:'usd'}));return json({free:true,campaignId:pay.campaign_id,gigId:pay.gig_id,...quote});}
  if(type==='annual'){
   const checkout=await stripe.checkout.sessions.create({mode:'payment',client_reference_id:pay.id,customer_email:user.email,line_items:[{price_data:{currency:'usd',unit_amount:199900,product_data:{name:'nfluence annual access — 12 months, no automatic renewal'}},quantity:1}],payment_intent_data:{metadata:{payment_id:pay.id,user_id:user.id}},success_url:origins[0]+'/campaigns/?annual_session={CHECKOUT_SESSION_ID}',cancel_url:origins[0]+'/campaigns/#plans',metadata:{payment_id:pay.id,user_id:user.id}},{idempotencyKey:'annual:'+pay.request_id});
   checked(await admin.from('payments').update({stripe_checkout_session_id:checkout.id}).eq('id',pay.id));return json({url:checkout.url});
  }
  const pi=pay.stripe_payment_intent_id?await stripe.paymentIntents.retrieve(pay.stripe_payment_intent_id):await stripe.paymentIntents.create({amount:pay.amount_cents,currency:'usd',payment_method_types:['card'],metadata:{payment_id:pay.id,user_id:user.id,type}},{idempotencyKey:'payment:'+pay.request_id});
  checked(await admin.from('payments').update({stripe_payment_intent_id:pi.id,provider_status:pi.status}).eq('id',pay.id));
  return json({client_secret:pi.client_secret,payment_intent_id:pi.id,campaignId:pay.campaign_id,gigId:pay.gig_id,...quote});
 }catch(error){console.error('billing_request_failed');return json({error:error instanceof Error?error.message:'Checkout could not be completed.'},400);}
});
