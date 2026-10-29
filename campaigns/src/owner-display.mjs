export function campaignStatus(c,now=new Date()){
 if(c.stage==='open'&&c.closes_at&&new Date(c.closes_at)<=now)return 'Applications closed';
 return {draft:'Unpublished draft',open:'Open for applications',active:'Content in production',fulfillment:'Approvals & payouts',wrap_up:'Closed / completed'}[c.stage]||String(c.stage||'Unknown').replaceAll('_',' ');
}
export function codeUsage(c){
 if(c.max_redemptions_per_brand!=null)return `${c.max_redemptions_per_brand===1?'One free campaign':c.max_redemptions_per_brand+' free campaigns'} per brand${c.max_redemptions!=null?' · '+c.max_redemptions+' total uses':''}`;
 return c.max_redemptions===null?'Reusable · no use limit':c.max_redemptions===1?'Single use':c.max_redemptions+'-use limit';
}
export function codeStatus(c,now=new Date()){
 return !c.enabled?'Revoked':c.expires_at&&new Date(c.expires_at)<=now?'Expired':c.max_redemptions!=null&&(c.redemption_count||0)>=c.max_redemptions?'Used':'Available';
}
export function paymentType(type){return {annual:'Annual membership',campaign_new:'Campaign',campaign_edit:'Campaign update',gig:'Gig listing'}[type]||String(type||'Payment').replaceAll('_',' ')}
