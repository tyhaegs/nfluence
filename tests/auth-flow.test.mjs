import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeEmail,resendConfirmation,confirmationToken,confirmationError} from '../campaigns/src/auth-flow.js';

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
