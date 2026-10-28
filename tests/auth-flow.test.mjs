import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeEmail,resendConfirmation,confirmationToken,confirmationError,signupAccount} from '../campaigns/src/auth-flow.js';

function signupClient(response,savedRole){return {auth:{signUp:async()=>response},from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:savedRole?{role:savedRole}:null,error:null})})})})};}
const signupUser={id:'test-user',identities:[{id:'email-identity'}]};
for(const role of ['brand','creator']){
  test(`${role} signup rejects confirmed duplicates instead of announcing confirmation`,async()=>{
    const sb=signupClient({data:{user:{...signupUser,identities:[]},session:null},error:null});
    await assert.rejects(signupAccount(sb,{email:'test@example.com',password:'test',role,name:'Test'},'https://nfluenceagency.com'),/This email already has an account.*brand or creator.*different email/);
  });
  test(`${role} signup rejects a pending account with the other saved role`,async()=>{
    const existing=role==='brand'?'creator':'brand';
    // Auth metadata is deliberately misleading: only the saved profile determines role.
    const sb=signupClient({data:{user:{...signupUser,user_metadata:{role}},session:null},error:null},existing);
    await assert.rejects(signupAccount(sb,{email:'test@example.com',password:'test',role,name:'Test'},'https://nfluenceagency.com'),new RegExp(`already has a ${existing} account.*different email.*${role} account`));
  });
  test(`${role} new signup and matching pending signup retain confirmation flow`,async()=>{
    const data={user:signupUser,session:null};
    assert.equal(await signupAccount(signupClient({data,error:null},role),{email:'test@example.com',password:'test',role,name:'Test'},'https://nfluenceagency.com'),data);
  });
}
test('known duplicate errors are translated; network and rate errors remain accurate',async()=>{
  for(const code of ['user_already_exists','email_exists','identity_already_exists'])await assert.rejects(signupAccount(signupClient({error:{code,message:'duplicate'}}),{role:'brand'},'https://nfluenceagency.com'),/This email already has an account/);
  const error={code:'over_email_send_rate_limit',message:'Wait 60 seconds'};
  await assert.rejects(signupAccount(signupClient({error}),{role:'brand'},'https://nfluenceagency.com'),e=>e===error);
});
test('missing profile fails safely instead of claiming successful signup',async()=>{
  await assert.rejects(signupAccount(signupClient({data:{user:signupUser},error:null},null),{role:'creator'},'https://nfluenceagency.com'),/could not verify your account setup/);
});

test('resend requests the signup flow with normalized address and correct return URL',async()=>{
  let sent;await resendConfirmation({auth:{resend:async args=>{sent=args;return {error:null};}}},' Person@Live.com ','https://nfluenceagency.com');
  assert.deepEqual(sent,{type:'signup',email:'person@live.com',options:{emailRedirectTo:'https://nfluenceagency.com/campaigns/'}});
});
test('resend propagates failures so the UI cannot announce false success',async()=>{
  const error={status:429,message:'Email rate limit exceeded'};
  await assert.rejects(resendConfirmation({auth:{resend:async()=>({error})}},'x@example.com','https://nfluenceagency.com'),e=>e===error);
  assert.match(confirmationError(error),/wait a minute/);
});
test('confirmation accepts only a token from the fragment, with no query token or redirect',()=>{
  const token='a'.repeat(56);
  assert.equal(confirmationToken('https://nfluenceagency.com/campaigns/confirm.html#token_hash='+token),token);
  assert.equal(confirmationToken('https://nfluenceagency.com/campaigns/confirm.html?token_hash='+token),null);
  assert.equal(confirmationToken('https://nfluenceagency.com/campaigns/confirm.html#token_hash=garbage'),null);
  assert.equal(normalizeEmail(' Test@Example.com '),'test@example.com');
});
