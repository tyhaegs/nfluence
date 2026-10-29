import {campaignCodeHash,normalizeCampaignCode} from './promotions.mjs';
export const OWNER_RESOURCES=['overview','campaigns','campaign_detail','people','brands','memberships','codes','code_redemptions','payments','activity'];
export const OWNER_ACTIONS=['create_code','revoke_code','grant_membership','extend_membership','end_membership','campaign_state','campaign_details'];
export function uuid(value){if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value||''))throw Error('Choose a valid record.');return value;}
export function futureDate(value){const d=new Date(value);if(!value||!Number.isFinite(+d)||d<=new Date())throw Error('Choose a future end date.');return d.toISOString();}
export const OWNER_FILTERS={campaigns:['all','active','draft','closed'],memberships:['all','active','inactive'],codes:['all','available','revoked','expired','used'],people:['all','brand','creator'],brands:['all','brand','creator'],payments:['all','succeeded','pending','failed','canceled']};
export function ownerFilter(resource,value='all'){if(!(OWNER_FILTERS[resource]||['all']).includes(value))throw Error('Choose a valid dashboard filter.');return value;}
export function ownerDeadline(value){
 const deadline=String(value||'').trim();
 if(/^\d{4}-\d{2}-\d{2}$/.test(deadline)){const date=new Date(deadline+'T23:59:59Z');if(!Number.isFinite(+date)||date.toISOString().slice(0,10)!==deadline)throw Error('Choose a valid calendar date.');return deadline;}
 const duration=/^(\d{1,3}) (day|days|week|weeks|month|months)$/.exec(deadline);
 if(!duration||Number(duration[1])<1||Number(duration[1])>365)throw Error('Enter a closing date or duration, such as 30 days (1–365 units).');return deadline;
}
export async function ownerChange(body){
 const action=body.action;if(!OWNER_ACTIONS.includes(action))throw Error('Unknown owner action.');
 const request=uuid(body.requestId),target=action==='create_code'||action==='grant_membership'?null:uuid(body.targetId);const d=body.data||{};let data={},code;
 if(action==='create_code'){
  code=normalizeCampaignCode(d.code);const email=String(d.email||'').trim().toLowerCase();if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw Error('Enter the brand’s account email.');
  const usage=d.usage||'single';if(!['single','reusable','per_brand'].includes(usage))throw Error('Choose single-use, one per brand, or reusable.');
  const label=String(d.label||'').trim();if(label.length>120)throw Error('Use a label under 120 characters.');
  data={code_hash:await campaignCodeHash(code),code_hint:code.slice(-4),label,assigned_email:email||null,assigned_brand_id:d.brandId?uuid(d.brandId):null,expires_at:d.expiresAt?futureDate(d.expiresAt):null,max_redemptions:usage==='single'?1:null,max_redemptions_per_brand:usage==='per_brand'?1:null};
 }else if(action==='grant_membership')data={brand_id:uuid(d.brandId),ends_at:futureDate(d.endsAt),note:String(d.note||'').trim()};
 else if(action==='extend_membership')data={ends_at:futureDate(d.endsAt),note:String(d.note||'').trim()};
 else if(action==='end_membership')data={note:String(d.note||'').trim()};
 else if(action==='campaign_state'){
  if(!['open','active','fulfillment','wrap_up'].includes(d.stage))throw Error('Choose a valid campaign stage.');data={stage:d.stage,note:String(d.note||'').trim()};
 }else if(action==='campaign_details'){
  const name=String(d.name||'').trim();if(name.length<2||name.length>180)throw Error('Campaign name must be 2–180 characters.');
  const deadline=ownerDeadline(d.deadline);
  data={name,description:String(d.description||'').slice(0,12000),deadline,note:String(d.note||'').trim()};
 }
 if(!['create_code','revoke_code'].includes(action)&&(data.note.length<3||data.note.length>1000))throw Error('Enter a short reason for this change.');
 return {action,target,request,data,code};
}
