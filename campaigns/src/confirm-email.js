import {createClient} from '@supabase/supabase-js';
import {confirmationToken} from './auth-flow.js';

const token=confirmationToken(location.href);
// Keep the one-time token out of subsequent navigation, history and analytics.
history.replaceState(null,'',location.pathname);
const button=document.getElementById('confirm-button');
const status=document.getElementById('confirmation-status');
let busy=false;
if(!token){button.disabled=true;status.textContent='This confirmation link is incomplete. Request a new email below.';}
document.getElementById('confirm-form').addEventListener('submit',async event=>{
  event.preventDefault();if(busy||!token)return;busy=true;button.disabled=true;button.textContent='Confirming…';
  try{
    const sb=createClient(window.SUPABASE_URL,window.SUPABASE_ANON_KEY,{auth:{detectSessionInUrl:false}});
    const {data,error}=await sb.auth.verifyOtp({token_hash:token,type:'email'});
    if(error)throw error;
    if(!data.session)throw new Error('No session returned');
    status.textContent='Email confirmed. Opening your account…';
    location.replace('/campaigns/');
  }catch{
    status.textContent='This link has expired or has already been used. If you already confirmed, log in. Otherwise request a new confirmation email below.';
    button.textContent='Confirmation link unavailable';
  }
});
