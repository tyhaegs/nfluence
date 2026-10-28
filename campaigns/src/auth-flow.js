export const normalizeEmail = value => String(value || '').trim().toLowerCase();

export function existingAccountMessage(existingRole, requestedRole) {
  if(['brand','creator'].includes(existingRole) && existingRole!==requestedRole) return `This email already has a ${existingRole} account. Use a different email to create a ${requestedRole} account, or log in to your existing account.`;
  return 'This email already has an account. Each email can have one account type: brand or creator. Log in, reset your password, or use a different email for a second account.';
}

export async function signupAccount(sb, {email,password,role,name}, origin) {
  const {data,error}=await sb.auth.signUp({email:normalizeEmail(email),password,options:{emailRedirectTo:origin+'/campaigns/',data:{role,name}}});
  if(error){
    if(['user_already_exists','email_exists','identity_already_exists'].includes(error.code)) throw new Error(existingAccountMessage(null,role));
    throw error;
  }
  if(!data?.user) throw new Error('Your account could not be created. Please try again.');
  // Confirmed duplicates are deliberately returned by Auth as users with no identities.
  if(Array.isArray(data.user.identities) && data.user.identities.length===0) throw new Error(existingAccountMessage(null,role));
  // For pending confirmations, use the saved profile role, never editable auth metadata.
  const profile=await sb.from('profiles_public').select('role').eq('id',data.user.id).maybeSingle();
  if(profile.error || !profile.data?.role) throw new Error('We could not verify your account setup. Please log in or contact support before trying again.');
  if(profile.data.role!==role) throw new Error(existingAccountMessage(profile.data.role,role));
  return data;
}

export async function resendConfirmation(sb, email, origin) {
  const {error} = await sb.auth.resend({type:'signup',email:normalizeEmail(email),options:{emailRedirectTo:origin+'/campaigns/'}});
  if(error) throw error;
}

export function confirmationToken(href) {
  const url=new URL(href);
  const token=new URLSearchParams(url.hash.slice(1)).get('token_hash');
  return token && /^[a-f0-9]{40,128}$/i.test(token) ? token : null;
}

export function confirmationError(error) {
  if(error?.status===429 || /rate|seconds|frequency/i.test(error?.message||'')) return 'Please wait a minute before requesting another email.';
  return error?.message || 'We could not request the email. Please try again or contact support.';
}
