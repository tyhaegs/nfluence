import { createClient } from '@supabase/supabase-js';
export const TERMS_VERSION='2026-10-26';
let client;
export function getClient(){if(!client)client=createClient(window.SUPABASE_URL,window.SUPABASE_ANON_KEY);return client;}
export function unwrap(result){if(result.error)throw new Error(result.error.message||'This change could not be saved. Please try again.');return result.data;}
export function campaignFromRow(row){
  const profile=row.profile||row.profiles||{};
  const creator=a=>({applicationId:a.id,userId:a.creator_id,creatorId:a.creator_id,name:a.name||'Creator',avatar:(a.name||'C').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase(),platforms:a.platforms||{},pitch:a.pitch||'',portfolio:a.portfolio||'',stage:a.stage,trackingNumber:a.tracking_number,acceptedAt:a.accepted_at,status:a.status});
  return {...row,brand:row.brand_name||profile.name||'',brandId:row.brand_id,campaign:row.name||'',compType:row.comp_type,spotsTotal:row.spots_total,spotsFilled:row.spots_filled||0,logoUrl:row.logo_url||profile.logo_url||null,imgUrl:row.img_url||profile.banner_url||null,bannerUrl:profile.banner_url||null,socialLinks:profile.social_links||{},bio:profile.bio||'',tagline:profile.tagline||'',website:profile.website||'',featured:!!row.featured&&!!row.featured_until&&new Date(row.featured_until)>new Date(),featuredWeeks:row.featured_weeks||0,hasStyleGuide:row.has_style_guide,styleGuideUrl:row.style_guide_url,approvalRequired:row.approval_required,perApplicantApproval:row.per_applicant_approval,ageMin:row.age_min,language:row.language,creators:{pending:(row.applications||[]).filter(a=>a.status==='applied').map(creator),approved:(row.applications||[]).filter(a=>a.status==='accepted').map(creator)},reviews:(row.reviews||[]).map(r=>({...r,creator:r.creator_name||'Creator',brandResponse:r.brand_response,submittedAt:r.submitted_at}))};
}
export function campaignToUpdate(c){return {name:c.campaign,brand_name:c.brand,description:c.description,comp_type:c.compType,comp:c.comp,platforms:c.platforms,deliverables:c.deliverables,requirements:c.requirements,deadline:c.deadline,following:c.following,spots_total:c.spotsTotal,location:c.location,niches:c.niches,products:c.products,has_style_guide:!!c.hasStyleGuide,style_guide_url:c.styleGuideUrl||null,approval_required:!!c.approvalRequired,per_applicant_approval:!!c.perApplicantApproval,age_min:c.ageMin||null,language:c.language||null,img_url:c.imgUrl||null,logo_url:c.logoUrl||null};}
export function eligibleCampaign(c,now=new Date()){return c.stage==='open'&&!!c.closes_at&&new Date(c.closes_at)>now&&(c.spotsTotal==null||c.spotsFilled<c.spotsTotal);}
export async function loadPublicCampaigns(sb=getClient()){
 const rows=unwrap(await sb.from('campaigns').select('*').eq('stage','open').gt('closes_at',new Date().toISOString()).order('created_at',{ascending:false}));
 const ids=[...new Set(rows.map(c=>c.brand_id))];const profiles=ids.length?unwrap(await sb.from('profiles_public').select('*').in('id',ids)):[];const map=new Map(profiles.map(p=>[p.id,p]));
 return rows.map(c=>campaignFromRow({...c,profile:map.get(c.brand_id)})).filter(c=>eligibleCampaign(c)).sort((a,b)=>Number(b.featured)-Number(a.featured));
}
export async function rpc(name,args){return unwrap(await getClient().rpc(name,args));}
export async function fetchOwnedCampaigns(sb,userId){
 const rows=unwrap(await sb.from('campaigns').select('*, applications(*), reviews(*)').eq('brand_id',userId).order('created_at',{ascending:false}));
 const own=unwrap(await sb.from('profiles').select('*').eq('id',userId).single());return rows.map(c=>campaignFromRow({...c,profile:own}));
}
export function callFromRow(row){return {...row,status:row.declined?'declined':row.confirmed?'confirmed':'pending',meetLink:row.meet_link,brandName:row.campaigns?.brand_name,campaignName:row.campaigns?.name,confirmed:row.confirmed,declined:row.declined};}
export function applicationFromRow(a){const c=campaignFromRow(a.campaigns||{});return {...c,campaignId:a.campaign_id,applicationId:a.id,brandId:a.brand_id,myStage:a.stage,status:a.status,creatorId:a.creator_id};}
export function safeHttpUrl(input){try{const url=new URL(input);return ['https:','http:'].includes(url.protocol)?url.href:null;}catch{return null;}}
export async function billingInfo(){const res=await fetch(window.SUPABASE_URL+'/functions/v1/billing-info');if(!res.ok)throw new Error('Online checkout is unavailable. Please contact support.');return res.json();}
export function track(event,service){window.nfluenceTrack?.(event,{service});}
export function zonedDateTime(date,time,zone){
 const wanted=new Date(date+'T'+time+':00Z');if(!Number.isFinite(+wanted))throw Error('Choose a valid date and time.');
 const fmt=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
 let result=+wanted;
 for(let i=0;i<4;i++){const p=Object.fromEntries(fmt.formatToParts(new Date(result)).map(x=>[x.type,x.value]));const local=Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute);const delta=+wanted-local;if(!delta)return new Date(result).toISOString();result+=delta;}
 throw Error('That local time does not exist because the clocks change. Choose another time.');
}

export function sanitizePendingProfile(payload){const {password,confirmPassword,confirm_password,...data}=payload.data||{};return {email:payload.email,role:payload.role,data};}
