import {serviceKey} from '../_shared/environment.mjs';
import Stripe from 'npm:stripe@14.25.0';
import {createClient} from 'npm:@supabase/supabase-js@2.108.2';
const checked=(r:any)=>{if(r.error)throw Error(r.error.message);return r.data;};
Deno.serve(async req=>{
 if(req.method!=='POST')return new Response('Method not allowed',{status:405});
 const sig=req.headers.get('stripe-signature');if(!sig)return new Response('Missing signature',{status:400});
 const secret=Deno.env.get('STRIPE_WEBHOOK_SECRET'),key=Deno.env.get('STRIPE_SECRET_KEY');if(!secret||!key)return new Response('Webhook not configured',{status:503});
 const stripe=new Stripe(key,{apiVersion:'2023-10-16'});let event:Stripe.Event;
 try{event=await stripe.webhooks.constructEventAsync(await req.text(),sig,secret,undefined,Stripe.createSubtleCryptoProvider());}catch{return new Response('Invalid signature',{status:400});}
 try{
  const admin=createClient(Deno.env.get('SUPABASE_URL')!,serviceKey(k=>Deno.env.get(k)),{auth:{persistSession:false}});
  if(checked(await admin.from('billing_events').select('event_id').eq('event_id',event.id)).length)return Response.json({received:true});
  if(event.type==='payment_intent.succeeded'){
   const pi=event.data.object as Stripe.PaymentIntent;const id=pi.metadata.payment_id;
   // Older attempts are reconciled by their immutable Stripe reference, never by client campaign metadata.
   let q=admin.from('payments').select('*');q=id?q.eq('id',id):q.eq('stripe_payment_intent_id',pi.id);const pay=checked(await q.maybeSingle());if(!pay)throw Error('Missing payment ledger');
   if(pay.stripe_payment_intent_id&&pay.stripe_payment_intent_id!==pi.id)throw Error('Provider reference mismatch');
   checked(await admin.from('payments').update({stripe_payment_intent_id:pi.id}).eq('id',pay.id));
   checked(await admin.rpc('finalize_checkout',{p_payment:pay.id,p_provider:pi.id,p_amount:pi.amount_received,p_currency:pi.currency,p_event:event.id,p_event_type:event.type}));
  }else if(['payment_intent.canceled','payment_intent.payment_failed'].includes(event.type)){
   const pi=event.data.object as Stripe.PaymentIntent;
   checked(await admin.from('payments').update({status:pi.status==='canceled'?'canceled':'pending',provider_status:pi.status}).eq('stripe_payment_intent_id',pi.id).neq('status','succeeded'));
  }
  checked(await admin.from('billing_events').upsert({event_id:event.id,event_type:event.type,provider_created_at:new Date(event.created*1000).toISOString()},{onConflict:'event_id',ignoreDuplicates:true}));
  return Response.json({received:true});
 }catch{console.error('billing_webhook_reconciliation_failed');return new Response('Reconciliation failed; retry required',{status:500});}
});
