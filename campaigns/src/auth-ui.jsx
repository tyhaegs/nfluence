import React, {useState,useEffect,useRef} from 'react';
import {getClient} from './data.js';
import {normalizeEmail,resendConfirmation,confirmationError} from './auth-flow.js';

export function ConfirmationHelp({initialEmail='',onSignIn}) {
  const [email,setEmail]=useState(initialEmail),[emailValid,setEmailValid]=useState(false),[busy,setBusy]=useState(false),[remaining,setRemaining]=useState(0),[message,setMessage]=useState(''),[error,setError]=useState('');
  const sending=useRef(false),helpDialog=useRef(null),emailInput=useRef(null);
  useEffect(()=>{setEmailValid(emailInput.current?.validity.valid??false);},[]);
  useEffect(()=>{if(!remaining)return;const timer=setTimeout(()=>setRemaining(n=>Math.max(0,n-1)),1000);return()=>clearTimeout(timer);},[remaining]);
  async function submit(event){event.preventDefault();if(sending.current||remaining||!emailInput.current?.checkValidity())return;sending.current=true;setBusy(true);setError('');setMessage('');try{await resendConfirmation(getClient(),email,location.origin);setRemaining(60);setMessage('If confirmation is needed, check your inbox for a new link.');}catch(error){setError(confirmationError(error));if(error.status===429)setRemaining(60);}finally{sending.current=false;setBusy(false);}}
  return <>
    <form onSubmit={submit} className="nf-auth-form"><fieldset disabled={busy}><legend className="sr-only">Request confirmation email</legend><label className="nf-auth-field"><span>Email address</span><input ref={emailInput} type="email" pattern={"[^\\s@]+@[^\\s@]+\\.[^\\s@]+"} autoComplete="email" autoCapitalize="none" spellCheck={false} value={email} onChange={e=>{setEmail(e.target.value);setEmailValid(e.target.validity.valid);}} required/></label><button className="nf-auth-primary" type="submit" disabled={busy||remaining>0||!emailValid}>{busy?'Requesting…':remaining?`Resend in ${remaining}s`:'Resend email'}</button></fieldset>{message&&<p className="nf-auth-notice nf-auth-feedback" role="status">{message}</p>}{error&&<p className="nf-auth-error nf-auth-feedback" role="alert">{error}</p>}</form>
    <div className="nf-auth-support-actions">{onSignIn&&<button type="button" className="nf-auth-text-button" onClick={onSignIn}>Back to log in</button>}<button type="button" className="nf-auth-text-button" aria-haspopup="dialog" onClick={()=>helpDialog.current?.showModal()}>Need help?</button></div>
    <dialog ref={helpDialog} className="nf-auth-help" aria-labelledby="nf-confirm-help-title" onClick={event=>{if(event.target===helpDialog.current)helpDialog.current.close();}}>
      <div className="nf-auth-help-content"><h2 id="nf-confirm-help-title">Can't find the email?</h2><p>Check Junk, Spam, and Outlook’s Other tab for a message from Nfluence. Use the newest link.</p><h3>Already have an account?</h3><p>Log in instead. You can <a href="#forgotpassword" onClick={()=>helpDialog.current.close()}>reset your password</a> if needed.</p><h3>Still stuck?</h3><p>Request another email if your link expires, or <a href="/contact.html">contact support</a>.</p><button type="button" className="nf-auth-primary" autoFocus onClick={()=>helpDialog.current.close()}>Got it</button></div>
    </dialog>
  </>;
}

export function AuthLayout({navigation,mode='signin',onLogIn,onCreate,title='Account access',description='Your next campaign starts here.',children,onboarding=false,pageRef,disabled=false,headline=false}) {
  return <div ref={pageRef} className={'nf-auth-page'+(!navigation?' nf-auth-standalone':'')}>
    {navigation}
    <main id="main-content" className={'nf-auth-stage'+(onboarding?' nf-auth-onboarding':'')}>
      <div className="nf-auth-content">
        <div className="nf-auth-identity"><a href="/" aria-label="nfluence home"><svg viewBox="318 449 2267 495" width="2267" height="495" role="img" aria-label="nfluence"><image href="/assets/brand-logos/nfluence.png" width="2903" height="1393" /></svg></a></div>
        <section className="nf-auth-panel" aria-label="nfluence account access">
          <div className="nf-auth-intro"><h1 className={headline?'nf-auth-headline':undefined}>{title}</h1>{description&&<p>{description}</p>}</div>
          {(onLogIn||onCreate)&&<div className="nf-auth-tabs" aria-label="Account access"><button type="button" aria-pressed={mode==='signin'} disabled={disabled} onClick={onLogIn}>Log in</button><button type="button" aria-pressed={mode==='signup'} disabled={disabled} onClick={onCreate}>Create account</button></div>}
          {children}
        </section>
        <footer className="nf-auth-footer"><nav aria-label="Account policies"><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a><a href="/contact.html">Support</a></nav></footer>
      </div>
    </main>
  </div>;
}

export function AuthSteps({steps,current}) {
  return <ol className="nf-auth-steps" aria-label="Account setup steps">{steps.map((label,i)=><li key={label} aria-current={current===i?'step':undefined}><span aria-hidden="true">{String(i+1).padStart(2,'0')}</span>{label}</li>)}</ol>;
}

export function PasswordField({id,label='Password',value,onChange,autoComplete='new-password',minLength=8}) {
  const [visible,setVisible]=useState(false);
  return <label className="nf-auth-field" htmlFor={id}><span>{label}</span><span className="nf-auth-password"><input id={id} type={visible?'text':'password'} value={value} onChange={onChange} autoComplete={autoComplete} minLength={minLength} required/><button type="button" aria-label={visible?'Hide password':'Show password'} aria-pressed={visible} onClick={()=>setVisible(v=>!v)}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>{visible&&<path d="m3 3 18 18"/>}</svg></button></span></label>;
}

export function AccountSignIn({navigation,onSignIn,onBack,onSignUp,role='brand'}) {
  const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[needsConfirmation,setNeedsConfirmation]=useState(false);
  async function submit(event){event.preventDefault();if(busy)return;setBusy(true);setError('');setNeedsConfirmation(false);try{const result=await onSignIn(normalizeEmail(email),null,password);if(result?.confirmationRequired){setNeedsConfirmation(true);setError('Confirm your email before logging in. You can request a new link below.');}else if(result)setError(result);}catch(failure){setError(failure.message||'We could not sign you in. Please try again.');}finally{setBusy(false);}}
  return <AuthLayout navigation={navigation} disabled={busy} onLogIn={()=>{}} onCreate={onSignUp} description="">
    <form onSubmit={submit} className="nf-auth-form"><fieldset disabled={busy}><legend className="sr-only">Log in to nfluence</legend>
      <label className="nf-auth-field" htmlFor={'nf-'+role+'-email'}><span>Email address</span><input id={'nf-'+role+'-email'} type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} value={email} onChange={e=>setEmail(e.target.value)} required/></label>
      <PasswordField id={'nf-'+role+'-password'} value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password"/>
      {error&&<p className="nf-auth-error" role="alert">{error}</p>}
      <div className="nf-auth-actions"><button className="nf-auth-secondary" type="button" onClick={onBack}>Back</button><button className="nf-auth-primary" type="submit" disabled={busy||!email.includes('@')||password.length<8}>{busy?'Logging in…':'Log in'}</button></div>
    </fieldset></form>
    {needsConfirmation&&<ConfirmationHelp key={normalizeEmail(email)} initialEmail={normalizeEmail(email)}/>}
    <div className="nf-auth-recovery-links">
      {!needsConfirmation&&<a className="nf-auth-text-button" href="#confirmemail" aria-disabled={busy} onClick={event=>{if(busy)event.preventDefault();}}>Missing your confirmation email?</a>}
      <a className="nf-auth-text-button" href="#forgotpassword" aria-disabled={busy} onClick={event=>{if(busy)event.preventDefault();}}>Forgot your password?</a>
    </div>
  </AuthLayout>;
}
