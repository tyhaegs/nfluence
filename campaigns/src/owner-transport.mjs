export function ownerError(message,status){const e=Error(message);e.status=status;return e;}
export function createOwnerRequest({auth,fetcher,url}){
 return async(action,payload={},session)=>{
  const latest=await auth.getSession();let current=latest.data?.session||session;
  if(!current?.access_token)throw ownerError('Please sign in to your owner account.',401);
  const body=JSON.stringify({action,...payload});
  async function send(){try{return await fetcher(url,{method:'POST',headers:{Authorization:'Bearer '+current.access_token,'Content-Type':'application/json'},body})}catch{throw ownerError(action==='read'||action==='access'?'Connection interrupted. Try refreshing.':'Connection interrupted. The change may have saved. Retry the same action to check it safely.',0)}}
  let res=await send();
  if(res.status===401){const fresh=await auth.refreshSession();current=fresh.data?.session;if(fresh.error||!current?.access_token)throw ownerError('Your session expired. Please sign in again.',401);res=await send();}
  let result;try{result=await res.json()}catch{throw ownerError('The dashboard returned an unreadable response. Please refresh.',res.status===401||res.status===403?res.status:0)}
  if(!res.ok)throw ownerError(result.error||'This owner action could not be completed.',res.status);
  return result;
 };
}
export function lastPage(total,size=50){return Math.max(0,Math.ceil(total/size)-1)}
export function fileUrl(value,origin){const url=new URL(value);if(url.protocol!=='https:'||url.origin!==origin)throw Error('The file link could not be verified.');return url.href;}
export async function openOwnerFile({open,request,id,origin,onFallback}){
 const popup=open();if(popup)popup.opener=null;
 try{const result=await request('file_url',{fileId:id});const url=fileUrl(result.url,origin);if(popup&&!popup.closed)popup.location.replace(url);else onFallback(url);}
 catch(e){if(popup&&!popup.closed)popup.close();throw e;}
}
