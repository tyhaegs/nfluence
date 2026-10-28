import {createClient} from 'npm:@supabase/supabase-js@2.108.2';
import {checkoutEnabled} from '../_shared/pricing.mjs';
import {serviceKey} from '../_shared/environment.mjs';
import {OWNER_RESOURCES,ownerChange,ownerFilter,uuid} from '../_shared/owner.mjs';
const origins=['https://nfluenceagency.com','https://www.nfluenceagency.com'];
const checked=(r:any)=>{if(r.error)throw Error(r.error.message);return r.data;};
Deno.serve(async req=>{
 const origin=req.headers.get('origin');const headers={'Access-Control-Allow-Origin':origins.includes(origin||'')?origin!:origins[0],'Access-Control-Allow-Headers':'authorization,content-type,apikey','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin','Content-Type':'application/json','Cache-Control':'no-store'};
 const json=(data:any,status=200)=>new Response(JSON.stringify(data),{status,headers});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return json({error:'Method not allowed'},405);
 if(origin&&!origins.includes(origin))return json({error:'Origin not allowed'},403);
 try{
  if(Number(req.headers.get('content-length'))>30000)return json({error:'Request too large'},413);
  const reader=req.body?.getReader();let size=0;const chunks=[];
  if(reader){while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>30000){await reader.cancel();return json({error:'Request too large'},413)}chunks.push(value)}}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength}
  let body;try{body=JSON.parse(new TextDecoder().decode(bytes))}catch{return json({error:'Send a valid dashboard request.'},400)}
  if(!body||typeof body!=='object'||Array.isArray(body))return json({error:'Send a valid dashboard request.'},400);
const token=(req.headers.get('authorization')||'').replace(/^Bearer /,'');
  const admin=createClient(Deno.env.get('SUPABASE_URL')!,serviceKey(k=>Deno.env.get(k)),{auth:{persistSession:false}});
  const auth=await admin.auth.getUser(token);if(auth.error||!auth.data.user)return json({error:'Please sign in to your owner account.'},401);
  if(!auth.data.user.email_confirmed_at)return json(body.action==='access'?{is_owner:false}:{error:'Confirm your owner email before opening this dashboard.'},body.action==='access'?200:403);
  let sessionId;try{sessionId=uuid(JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).session_id);}catch{return json({error:'Please sign in again.'},401);}
  const actor=auth.data.user.id;const allowed=checked(await admin.rpc('owner_session',{p_actor:actor,p_session:sessionId}));
  if(body.action==='access')return json({is_owner:allowed});
  if(!allowed)return json({error:'Owner access is required for this dashboard.'},403);
  if(body.action==='read'){
   if(!OWNER_RESOURCES.includes(body.resource))throw Error('Choose a valid dashboard section.');
   const query=['campaign_detail','code_redemptions'].includes(body.resource)?uuid(body.query):String(body.query||'').slice(0,100);
   const result=checked(await admin.rpc('owner_read',{p_actor:actor,p_resource:body.resource,p_query:query,p_page:Math.floor(Math.min(10000,Math.max(0,Number(body.page)||0))),p_limit:50,p_filter:ownerFilter(body.resource,body.filter??'all')}));
   if(body.resource==='campaign_detail'&&!result.campaign)return json({error:'This campaign no longer exists.'},404);
   return json(body.resource==='overview'?{...result,billing_available:checkoutEnabled(k=>Deno.env.get(k))}:result);
  }
  if(body.action==='file_url'){
   const file=checked(await admin.from('content_uploads').select('storage_path').eq('id',uuid(body.fileId)).single());
   const url=checked(await admin.storage.from('content').createSignedUrl(file.storage_path,300));return json({url:url.signedUrl});
  }
  const change=await ownerChange(body);
  const result=checked(await admin.rpc('owner_manage',{p_actor:actor,p_action:change.action,p_target:change.target,p_data:change.data,p_request:change.request}));
  return json({record:result,...(change.code?{code:change.code}:{})});
 }catch(error){console.error('owner_request_failed');return json({error:error instanceof Error?(error.message.includes('campaign_sponsorship_codes_code_hash_key')?'That code already exists. Choose a different code or manage the existing one.':error.message):'The owner action could not be completed.'},400);}
});
