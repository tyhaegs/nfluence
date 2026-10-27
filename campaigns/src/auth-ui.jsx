import React, {useState} from 'react';

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
  const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  async function submit(event){event.preventDefault();if(busy)return;setBusy(true);setError('');try{const result=await onSignIn(email,null,password);if(result)setError(result);}catch(failure){setError(failure.message||'We could not sign you in. Please try again.');}finally{setBusy(false);}}
  return <AuthLayout navigation={navigation} disabled={busy} onLogIn={()=>{}} onCreate={onSignUp} description={role==='creator'?'Connect with brands. Manage your campaigns.':'Connect with creators. Manage your campaigns.'}>
    <form onSubmit={submit} className="nf-auth-form"><fieldset disabled={busy}><legend className="sr-only">Log in to nfluence</legend>
      <label className="nf-auth-field" htmlFor={'nf-'+role+'-email'}><span>Email address</span><input id={'nf-'+role+'-email'} type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} value={email} onChange={e=>setEmail(e.target.value)} required/></label>
      <PasswordField id={'nf-'+role+'-password'} value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password"/>
      {error&&<p className="nf-auth-error" role="alert">{error}</p>}
      <div className="nf-auth-actions"><button className="nf-auth-secondary" type="button" onClick={onBack}>Back</button><button className="nf-auth-primary" type="submit" disabled={busy||!email.includes('@')||password.length<8}>{busy?'Logging in…':'Log in'}</button></div>
    </fieldset></form>
    <button className="nf-auth-text-button" type="button" disabled={busy} onClick={()=>{location.hash='forgotpassword'}}>Forgot your password?</button>
  </AuthLayout>;
}
