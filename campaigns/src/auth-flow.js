export const normalizeEmail = value => String(value || '').trim().toLowerCase();

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
