
import React, { useState, useEffect, useRef, useCallback, useMemo, useLayoutEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import Cropper from 'cropperjs';
import { campaignFromRow, campaignToUpdate, eligibleCampaign, loadPublicCampaigns, unwrap, getClient, TERMS_VERSION, fetchOwnedCampaigns, applicationFromRow, callFromRow, billingInfo, zonedDateTime, sanitizePendingProfile } from './data.js';
import { ConversationHub, RecoveryScreen, UploadLibrary, AnnualPlanPanel, AppBoundary, ManualPaymentForm, CreatorReviewWorkspace } from './features.jsx';
import './accessibility.js';
import './app.css';
import './auth.css';
import {DEMO_CAMPAIGNS, DEMO_BRAND_META} from './demos.js';
import {AuthLayout, AuthSteps, PasswordField, AccountSignIn, ConfirmationHelp} from './auth-ui.jsx';
window.supabase = { createClient };
window.Cropper = Cropper;
import {normalizeEmail} from './auth-flow.js';

// ═══════════════════════════════════════════════
// ── Data ──

const PLATFORM_LIST = ["Instagram", "TikTok", "YouTube", "X", "Facebook"];
const FOLLOWER_TIERS = ["all", "25k", "50k", "100k", "250k", "500k", "1M+"];
const PLATFORM_EXAMPLES = {
  Instagram: "(1) reel + (1) story",
  TikTok: "(1) tiktok video",
  YouTube: "(1) short + (1) review",
  X: "(1) thread + cta",
  Facebook: "(1) post + (1) carousel",
};
const LANGUAGES = ["English", "Spanish", "French", "German", "Portuguese", "Italian", "Japanese", "Korean", "Chinese", "Arabic", "Hindi"];
const INDUSTRIES = [
  "fitness & training", "wellness & supplements", "beauty & skincare", "fashion & apparel",
  "outdoors & adventure", "health & nutrition", "tech & gadgets", "gaming",
  "lifestyle & home", "food & beverage", "coffee & energy", "sports equipment",
  "travel", "pets", "automotive", "finance & investing", "education & coaching",
];
// Brands can work across several industries. There is no `industries` array column
// on profiles (and we avoid a migration), so multiple industries are persisted in the
// existing `profiles.industry` text column as a comma-separated list. The UI keeps them
// as an array via these helpers.
function serializeIndustries(arr) {
  return (Array.isArray(arr) ? arr : []).map(s => String(s).trim()).filter(Boolean).join(", ");
}
function parseIndustries(val) {
  if (Array.isArray(val)) return val.map(s => String(s).trim()).filter(Boolean);
  if (!val || typeof val !== "string") return [];
  return val.split(",").map(s => s.trim()).filter(Boolean);
}
const COMP_OPTIONS = [
  { value: "product", label: "product only" },
  { value: "paid", label: "paid" },
  { value: "product+paid", label: "product + paid" },
];
const STEPS = ["brand", "campaign", "platforms", "terms", "preview"];
const VIBES = ["bold", "playful", "minimal", "luxury", "edgy", "warm", "professional", "raw", "inspirational", "witty", "clean", "authentic"];
const SOCIAL_OPTIONS = ["Instagram", "TikTok", "YouTube", "X", "Facebook", "Website"];

const REGION_NAMES = {
  US: "United States", CA: "Canada", MX: "Mexico", GB: "United Kingdom", IE: "Ireland",
  FR: "France", DE: "Germany", ES: "Spain", PT: "Portugal", IT: "Italy",
  CH: "Switzerland", AT: "Austria", NL: "Netherlands", BE: "Belgium", DK: "Denmark",
  NO: "Norway", SE: "Sweden", FI: "Finland", PL: "Poland", CZ: "Czech Republic",
  HU: "Hungary", RO: "Romania", GR: "Greece", TR: "Turkey", IL: "Israel",
  AE: "United Arab Emirates", SA: "Saudi Arabia", EG: "Egypt", ZA: "South Africa",
  IN: "India", CN: "China", JP: "Japan", KR: "South Korea", TH: "Thailand",
  SG: "Singapore", AU: "Australia", NZ: "New Zealand", BR: "Brazil", AR: "Argentina",
  CL: "Chile", CO: "Colombia",
};
const REGION_CODES = ["US","CA","MX","GB","IE","FR","DE","ES","PT","IT","CH","AT","NL","BE","DK","NO","SE","FI","PL","CZ","HU","RO","GR","TR","IL","AE","SA","EG","ZA","IN","CN","JP","KR","TH","SG","AU","NZ","BR","AR","CL","CO"];
const US_STATES = ["Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia","Wisconsin","Wyoming"];

// ── Gig Listing Constants ──

const GIG_CONTENT_TYPES = [
  "product photography",
  "lifestyle photography",
  "video / reels",
  "flat lay",
  "model / on-person",
  "food & beverage",
  "unboxing",
  "mixed (photo + video)",
];

const GIG_EQUIPMENT = [
  "bring your own",
  "brand provides camera",
  "brand provides lighting",
  "brand provides full kit",
  "studio provided",
];

const GIG_SKILLS = ["photographer", "videographer"];

const GIG_STEPS = ["brand", "details", "inspo", "pay", "preview"];

const DEMO_GIG_LISTINGS = [];

// Demo campaigns are illustrative, read-only examples kept alongside live listings.

const PLAT_SVGS_SMALL = {
  Instagram: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="1.5" fill="#fff" stroke="none"/></svg>,
  TikTok: <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V9.05a8.27 8.27 0 004.76 1.5V7.1a4.83 4.83 0 01-1-.41z"/></svg>,
  YouTube: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="4"/><polygon points="10,8 16,12 10,16" fill="#fff" stroke="none"/></svg>,
  X: <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>,
  Facebook: <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
};

const DEMO_MESSAGES = {};


// ── Messages ──


// Promo invitations live only in the server-side sponsorship inventory. The client never
// validates or applies discounts — it shows the server quote. (Phase 2+3 payment refactor.)

function businessDaysSince(dateStr) {
  if (!dateStr) return 0;
  const start = new Date(dateStr);
  const now = new Date();
  let count = 0;
  const cur = new Date(start);
  while (cur < now) {
    cur.setDate(cur.getDate() + 1);
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count++;
  }
  return count;
}

const DEMO_SCHEDULED_CALLS = {};

// ═══════════════════════════════════════════════
// ── ImageEditor (cropperjs v1 wrapper) ──

function ImageEditor({ src, shape, onSave, onCancel, initialScale, initialPos }) {
  const imgRef = useRef(null);
  const cropperRef = useRef(null);
  const readyRatioRef = useRef(1);
  const [zoom, setZoom] = useState(1);
  const [cropperReady, setCropperReady] = useState(false);

  const isCircle = shape === "circle";
  const isSquare = shape === "square";
  const outputW = (isCircle || isSquare) ? 512 : 1400;
  const outputH = (isCircle || isSquare) ? 512 : 504;
  const boxW = (isCircle || isSquare) ? 280 : 560;
  const boxH = (isCircle || isSquare) ? 280 : 202;

  useEffect(() => {
    const el = imgRef.current;
    if (!el) return;
    setCropperReady(false);
    const cropper = new window.Cropper(el, {
      aspectRatio: outputW / outputH,
      viewMode: 3,
      dragMode: "move",
      cropBoxResizable: false,
      cropBoxMovable: false,
      background: false,
      autoCropArea: 1,
      ready() {
        const d = cropper.getCanvasData();
        readyRatioRef.current = d.width / d.naturalWidth;
        setCropperReady(true);
        if (initialScale && initialScale > 1) {
          cropper.zoomTo(readyRatioRef.current * initialScale);
          setZoom(initialScale);
        }
      },
    });
    cropperRef.current = cropper;
    const onZoom = (e) => setZoom(+(e.detail.ratio / readyRatioRef.current).toFixed(2));
    el.addEventListener("zoom", onZoom);
    return () => { el.removeEventListener("zoom", onZoom); cropper.destroy(); };
  }, [src]);

  const handleDone = () => {
    const canvas = cropperRef.current?.getCroppedCanvas({ width: outputW, height: outputH });
    if (!canvas) return;
    onSave({ croppedDataUrl: canvas.toDataURL("image/jpeg", 0.92), scale: zoom, pos: { x: 0, y: 0 } });
  };

  const handleZoom = (e) => {
    const v = parseFloat(e.target.value);
    setZoom(v);
    cropperRef.current?.zoomTo(readyRatioRef.current * v);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: 8 }}>
      <div style={{ fontSize: ".75rem", opacity: .4, marginBottom: 4 }}>drag to reposition · use slider to zoom</div>
      <div className={isCircle || isSquare ? "crop-rounded" : undefined}
        style={isCircle || isSquare
          ? { width: boxW, height: boxH, background: "#000", overflow: "hidden" }
          : { width: "100%", maxWidth: boxW, aspectRatio: `${outputW}/${outputH}`, background: "#000", overflow: "hidden", borderRadius: 16 }}>
        <img ref={imgRef} src={src} alt="edit" crossOrigin="anonymous"
          style={{ display: "block", width: "100%", height: "100%" }} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, ...(isCircle || isSquare ? { width: boxW } : { width: "100%", maxWidth: boxW }) }}>
        <span style={{ fontSize: ".7rem", opacity: .4 }}>-</span>
        <input type="range" min="1" max="3" step="0.05" value={zoom} onChange={handleZoom}
          style={{ flex: 1, accentColor: "rgba(255,255,255,.5)" }} />
        <span style={{ fontSize: ".7rem", opacity: .4 }}>+</span>
        <span style={{ fontSize: ".7rem", opacity: .5, minWidth: 34, textAlign: "right" }}>{zoom.toFixed(1)}x</span>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <div onClick={cropperReady ? handleDone : undefined}
          style={{ padding: "8px 20px", borderRadius: 10, border: "1px solid rgba(255,255,255,.3)", fontSize: ".82rem", color: "#fff", cursor: cropperReady ? "pointer" : "default", opacity: cropperReady ? 1 : 0.35 }}>
          done
        </div>
        <div onClick={onCancel}
          style={{ padding: "8px 20px", borderRadius: 10, border: "1px solid rgba(255,255,255,.15)", fontSize: ".82rem", color: "rgba(255,255,255,.5)", cursor: "pointer" }}>
          change image
        </div>
      </div>
    </div>
  );
}
// ═══════════════════════════════════════════════

let _stripe = null;
function getStripe() {
  if (!_stripe && window.Stripe && window.STRIPE_PUBLISHABLE_KEY) {
    _stripe = window.Stripe(window.STRIPE_PUBLISHABLE_KEY);
  }
  return _stripe;
}

const XIcon = ({ size = 16 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" style={{ display: "inline-block", verticalAlign: "middle" }}><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>;

// ── Server-authoritative payment (V2) ──
// The Edge Function computes ALL prices and validates promos; the client never sends an amount.
// Interface: { action:'quote'|'charge'|'cancel', type:'campaign_new'|'campaign_edit'|'gig', campaignId?, features?, promoCode? }
async function callStripePaymentV2(payload, token) {
  const fingerprint=JSON.stringify({...payload,requestId:undefined});const key='nfluence.checkout.'+fingerprint;
  if(payload.action==='charge'){
    let id=sessionStorage.getItem(key);if(!id){id=crypto.randomUUID();sessionStorage.setItem(key,id);}payload={...payload,requestId:id};
  }
  const res=await fetch(window.SUPABASE_URL+'/functions/v1/stripe-payment',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+(token||'')},body:JSON.stringify(payload)});
  const data=await res.json();if(!res.ok)throw Error(data.error||'Checkout is unavailable. Please try again or contact support.');
  if(payload.action==='charge'&&data.payment_intent_id)sessionStorage.setItem('nfluence.intent.'+data.payment_intent_id,key);
  if(payload.action==='cancel'&&data.status==='canceled'){const original=sessionStorage.getItem('nfluence.intent.'+payload.paymentIntentId);if(original)sessionStorage.removeItem(original);sessionStorage.removeItem('nfluence.intent.'+payload.paymentIntentId);}
  return data;
}
async function confirmStripeCard(clientSecret,cardElement){
 const stripe=getStripe();if(!stripe||!cardElement)throw Error('Online checkout is unavailable. Please contact support.');
 const {error,paymentIntent}=await stripe.confirmCardPayment(clientSecret,{payment_method:{card:cardElement}});if(error)throw Error(error.message);
 if(paymentIntent?.status!=='succeeded')throw Error('Payment is pending. Check your account before trying again.');
 const session=unwrap(await getSB().auth.getSession()).session;
 await callStripePaymentV2({action:'reconcile',paymentIntentId:paymentIntent.id},session?.access_token);
}

function CampaignDetail({ campaign: initialCampaign, onStartCampaign, onBack, isOwner, user, onApply, onSignInRedirect, appliedCampaigns = [], onOpenMessage, onOpenInbox, messageCount = 0, autoApply = false, onAutoApplyConsumed, onEditCampaign, onScheduleCall, onViewCreatorProfile, onNotify }) {
  const [c, setC] = useState(JSON.parse(JSON.stringify(initialCampaign)));
  useLayoutEffect(() => { window.scrollTo(0, 0); }, []);
  const derivedSpotsFilled = Math.max(c.spotsFilled || 0, c.creators?.approved?.length || 0);
  const spotsLeft = c.spotsTotal != null ? Math.max(0, c.spotsTotal - derivedSpotsFilled) : null;
  const [showDemoGuide, setShowDemoGuide] = useState(false);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyStep, setApplyStep] = useState(0); // 0=info, 1=platforms, 2=pitch, 3=done
  const [hasApplied, setHasApplied] = useState(
    appliedCampaigns.includes(initialCampaign.id)
  );
  const [applyForm, setApplyForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    platforms: Object.fromEntries(PLATFORM_LIST.map(p => [p, false])),
    handles: Object.fromEntries(PLATFORM_LIST.map(p => [p, ""])),
    followers: Object.fromEntries(PLATFORM_LIST.map(p => [p, ""])),
    pitch: "",
    portfolio: "",
    agreeTerms: false,
  });

  const applyPlatformKeys = PLATFORM_LIST.filter(p => applyForm.platforms[p]);
  const applyHandlesComplete = applyPlatformKeys.length > 0 && applyPlatformKeys.every(p => applyForm.handles[p]?.trim());

  const handleApplyClick = () => {
    if (c.isDemo) return;
    if (!user) {
      onSignInRedirect?.();
      return;
    }
    if(user.role!=='creator'){setWorkflowError('Please use a creator account to apply.');return;}
    if(!eligibleCampaign(c)){setWorkflowError('This campaign is no longer accepting applications.');return;}
    setApplyForm(f => ({ ...f, name: user.name || "", email: user.email || "" }));
    setApplyStep(0);
    setShowApplyModal(true);
  };

  useEffect(() => {
    if (autoApply) { handleApplyClick(); onAutoApplyConsumed?.(); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoApply]);

  const [workflowError,setWorkflowError]=useState("");
  const [workflowBusy,setWorkflowBusy]=useState(false);
  const [paymentTarget,setPaymentTarget]=useState(null);
  const submitApplication = async () => {
    const platformData = {};
    applyPlatformKeys.forEach(p => {
      platformData[p] = applyForm.followers[p] || "—";
    });
    const applicationData = {
      name: applyForm.name,
      avatar: applyForm.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2),
      platforms: platformData,
      handles: Object.fromEntries(applyPlatformKeys.map(p => [p, applyForm.handles[p]])),
      pitch: applyForm.pitch,
      portfolio: applyForm.portfolio,
      stage: "applied",
    };
    setWorkflowBusy(true);setWorkflowError("");
    try { await onApply(initialCampaign,applicationData);setHasApplied(true);setApplyStep(3); }
    catch(error){setWorkflowError(error.message);}
    finally{setWorkflowBusy(false);}
  };

  const INFLUENCER_STAGES = ["accepted", "product_shipped", "content_submitted", "approved", "paid"];
  const STAGE_LABELS = {
    applied: "applied", accepted: "accepted", product_shipped: "product shipped",
    content_submitted: "content submitted", approved: "content approved", paid: "paid",
  };

  async function persistApplication(creator,changes){
    if(workflowBusy)return null;setWorkflowBusy(true);setWorkflowError("");
    try{const row=unwrap(await getSB().from('applications').update(changes).eq('id',creator.applicationId).select().single());
      setC(prev=>{const all=[...(prev.creators?.pending||[]),...(prev.creators?.approved||[])].map(cr=>cr.applicationId===row.id?{...cr,stage:row.stage,status:row.status,trackingNumber:row.tracking_number,acceptedAt:row.accepted_at}:cr);return {...prev,spotsFilled:all.filter(cr=>cr.status==='accepted').length,creators:{pending:all.filter(cr=>cr.status==='applied'||(!cr.status&&cr.stage==='applied')),approved:all.filter(cr=>cr.status==='accepted')}};});return row;
    }catch(error){setWorkflowError(error.message);return null;}finally{setWorkflowBusy(false);}
  }
  const approveCreator=creator=>persistApplication(creator,{status:'accepted',stage:'accepted'});
  const rejectCreator=creator=>persistApplication(creator,{status:'rejected'});
  const advanceCreator=creatorId=>{
    const creator=(c.creators?.approved||[]).find(cr=>cr.applicationId===creatorId);
    if(!creator)return;
    if(creator.stage==='content_submitted')return persistApplication(creator,{stage:'approved'});
    if(creator.stage==='approved'){
      if(['paid','product+paid'].includes(c.compType)){setPaymentTarget(creator);return;}
      return persistApplication(creator,{stage:'paid'});
    }
    setWorkflowError('The creator must submit their content before it can be approved.');
  };
  const shipCreator=(creatorId,trackingNumber)=>{
    const creator=(c.creators?.approved||[]).find(cr=>cr.applicationId===creatorId);
    if(creator)return persistApplication(creator,{stage:'product_shipped',tracking_number:trackingNumber.trim()});
  };
  // Schedule call modal state
  const [scheduleTarget, setScheduleTarget] = useState(null); // creator name
  const [scheduleForm, setScheduleForm] = useState({ date: "", time: "", timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, meetLink: "", notes: "" });

  const commonTimezones = [
    "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
    "America/Anchorage", "Pacific/Honolulu", "America/Toronto", "America/Vancouver",
    "Europe/London", "Europe/Paris", "Europe/Berlin", "Europe/Madrid", "Europe/Rome",
    "Europe/Amsterdam", "Europe/Stockholm", "Europe/Zurich", "Europe/Moscow",
    "Asia/Dubai", "Asia/Kolkata", "Asia/Bangkok", "Asia/Singapore", "Asia/Tokyo",
    "Asia/Seoul", "Asia/Shanghai", "Australia/Sydney", "Pacific/Auckland",
  ];
  const tzLabel = (tz) => tz.replace(/_/g, " ").replace(/\//g, " · ");

  const submitSchedule = async () => {
    if (!scheduleForm.date || !scheduleForm.time) return;
    let datetime;try{datetime = zonedDateTime(scheduleForm.date,scheduleForm.time,scheduleForm.timezone);}catch(error){setWorkflowError(error.message);return;}
    setWorkflowError("");
    try { await onScheduleCall?.({
      creator: scheduleTarget,
      creatorName: scheduleTarget.name,
      campaign: c,
      datetime,
      timezone: scheduleForm.timezone,
      meetLink: scheduleForm.meetLink.trim(),
      notes: scheduleForm.notes.trim(),
    }); } catch(error){setWorkflowError(error.message);return;}
    setScheduleTarget(null);
    setScheduleForm({ date: "", time: "", timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, meetLink: "", notes: "" });
  };

  const ScheduleCallModal = () => {
    if (!scheduleTarget) return null;
    const isValid = scheduleForm.date && scheduleForm.time;
    return (
      <div role="dialog" aria-modal="true" tabIndex={-1} ref={el => { if (el && !el.__f) { el.__f = true; el.focus(); } }} onKeyDown={e => { if (e.key === 'Escape') { setScheduleTarget(null); } }} onClick={() => setScheduleTarget(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, padding: 20 }}>
        <div onClick={e => e.stopPropagation()} style={{ background: "#0a1322", border: "1px solid rgba(255,255,255,.12)", borderRadius: 20, padding: "28px", maxWidth: 500, width: "100%", maxHeight: "90vh", overflowY: "auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
            <div>
              <div style={{ fontSize: "1.1rem", fontWeight: 700, fontFamily: "'Monda', system-ui, sans-serif" }}>schedule a call</div>
              <div style={{ fontSize: ".78rem", opacity: .4, marginTop: 3 }}>{scheduleTarget?.name}</div>
            </div>
            <div onClick={() => setScheduleTarget(null)} style={{ cursor: "pointer", width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", opacity: .7 }}><XIcon size={16} /></div>
          </div>

          {/* Date + Time row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: ".72rem", opacity: .4, marginBottom: 6, textTransform: "lowercase" }}>date</div>
              <input aria-label="date" type="date" value={scheduleForm.date} onChange={e => setScheduleForm(f => ({ ...f, date: e.target.value }))}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,.15)", background: "rgba(0,0,0,.3)", color: "#fff", fontSize: ".85rem", outline: "none", fontFamily: "system-ui, sans-serif", boxSizing: "border-box" }} />
            </div>
            <div>
              <div style={{ fontSize: ".72rem", opacity: .4, marginBottom: 6, textTransform: "lowercase" }}>time</div>
              <input aria-label="time" type="time" value={scheduleForm.time} onChange={e => setScheduleForm(f => ({ ...f, time: e.target.value }))}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,.15)", background: "rgba(0,0,0,.3)", color: "#fff", fontSize: ".85rem", outline: "none", fontFamily: "system-ui, sans-serif", boxSizing: "border-box" }} />
            </div>
          </div>

          {/* Timezone */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: ".72rem", opacity: .4, marginBottom: 6, textTransform: "lowercase" }}>timezone</div>
            <select aria-label="timezone" value={scheduleForm.timezone} onChange={e => setScheduleForm(f => ({ ...f, timezone: e.target.value }))}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,.15)", background: "#0a1322", color: "#fff", fontSize: ".85rem", outline: "none", fontFamily: "system-ui, sans-serif" }}>
              {commonTimezones.map(tz => (
                <option key={tz} value={tz}>{tzLabel(tz)}</option>
              ))}
            </select>
          </div>

          {/* Zoom / Meet link */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: ".72rem", opacity: .4, marginBottom: 6, textTransform: "lowercase" }}>zoom / meet link (optional)</div>
            <input type="url" value={scheduleForm.meetLink} onChange={e => setScheduleForm(f => ({ ...f, meetLink: e.target.value }))}
              aria-label="https://zoom.us/j/... or meet.google.com/..." placeholder="https://zoom.us/j/... or meet.google.com/..."
              style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,.15)", background: "rgba(0,0,0,.3)", color: "#fff", fontSize: ".85rem", outline: "none", fontFamily: "system-ui, sans-serif", boxSizing: "border-box" }} />
          </div>

          {/* Notes */}
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontSize: ".72rem", opacity: .4, marginBottom: 6, textTransform: "lowercase" }}>notes for creator (optional)</div>
            <textarea value={scheduleForm.notes} onChange={e => setScheduleForm(f => ({ ...f, notes: e.target.value }))}
              aria-label="e.g. we'll discuss content requirements and brand guidelines" placeholder="e.g. we'll discuss content requirements and brand guidelines"
              rows={3}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,.15)", background: "rgba(0,0,0,.3)", color: "#fff", fontSize: ".85rem", outline: "none", fontFamily: "system-ui, sans-serif", resize: "vertical", lineHeight: 1.5, boxSizing: "border-box" }} />
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <div onClick={() => setScheduleTarget(null)} style={{ flex: 1, padding: "12px", borderRadius: 12, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.03)", color: "rgba(255,255,255,.5)", fontSize: ".85rem", fontWeight: 600, cursor: "pointer", textAlign: "center", fontFamily: "system-ui, sans-serif" }}>cancel</div>
            <div onClick={isValid ? submitSchedule : undefined} style={{ flex: 2, padding: "12px", borderRadius: 12, border: `1px solid ${isValid ? "rgba(100,200,255,.4)" : "rgba(255,255,255,.08)"}`, background: isValid ? "rgba(100,200,255,.1)" : "rgba(255,255,255,.02)", color: isValid ? "rgba(100,200,255,.9)" : "rgba(255,255,255,.2)", fontSize: ".85rem", fontWeight: 600, cursor: isValid ? "pointer" : "not-allowed", textAlign: "center", fontFamily: "system-ui, sans-serif", transition: "all .12s" }}>
              send invite
            </div>
          </div>
        </div>
      </div>
    );
  };

  const sectionStyle = { marginBottom: 28 };
  const labelStyle = { fontSize: ".75rem", opacity: .4, textTransform: "lowercase", marginBottom: 6, fontFamily: "'Monda', system-ui, sans-serif" };
  const valueStyle = { fontSize: ".95rem", opacity: .85, lineHeight: 1.6 };
  const dividerStyle = { height: 1, background: "rgba(255,255,255,.08)", margin: "24px 0" };

  return (
    <div style={{ minHeight: "100vh", overflowX: "hidden", background: "radial-gradient(circle at calc(46% + 250px) calc(58% - 175px), rgba(255,255,255,.103) 0%, rgba(255,255,255,.0309) 38%, transparent 52%), linear-gradient(180deg, #040b15 0%, #070f1f 100%)", backgroundColor: "#040b15", color: "#fff", fontFamily: "system-ui, sans-serif" }}>
      <style>{`
        .nf-cta-btn { transition: transform .12s, border-color .2s, box-shadow .2s, background .2s !important; }
        .nf-cta-btn:hover { transform: translateY(-2px); border-color: rgba(255,255,255,.55) !important; box-shadow: 0 0 18px rgba(255,255,255,.12) !important; background: rgba(255,255,255,.12) !important; }
        .nf-apply-btn { transition: transform .12s, border-color .2s, box-shadow .2s, background .2s !important; cursor: pointer; }
        .nf-apply-btn:hover { border-color: rgba(255,255,255,.55) !important; box-shadow: 0 0 14px rgba(255,255,255,.15) !important; background: rgba(255,255,255,.08) !important; transform: translateY(-1px); }
        .nf-detail-card { transition: transform .2s, border-color .2s, box-shadow .2s; }
        .nf-detail-card:hover { transform: translateY(-2px); border-color: rgba(255,255,255,.2); box-shadow: 0 8px 30px rgba(0,0,0,.3); }
        .nf-creator-card { transition: transform .2s ease, border-color .2s, box-shadow .2s; }
        .nf-creator-card:hover { transform: translateY(-3px); border-color: rgba(255,255,255,.22) !important; box-shadow: 0 10px 30px rgba(0,0,0,.35); }
        .nf-back-link { transition: opacity .2s; }
        .nf-back-link:hover { opacity: 1 !important; }
        @keyframes nf-border-shimmer { 0%,100% { border-color: rgba(255,140,30,.25); box-shadow: 0 0 8px rgba(255,140,30,.08); } 50% { border-color: rgba(255,165,50,.85); box-shadow: 0 0 18px rgba(255,140,30,.3); } }
        .nf-awaiting-tile { border: 1px solid rgba(255,140,30,.25); animation: nf-border-shimmer 2.5s ease-in-out infinite; }
        @keyframes nf-shipping-pulse { 0%,100% { border-color: rgba(160,80,255,.35); box-shadow: 0 0 8px rgba(140,60,255,.12); } 50% { border-color: rgba(185,110,255,.9); box-shadow: 0 0 20px rgba(160,80,255,.35); } }
        .nf-shipping-overdue { animation: nf-shipping-pulse 2s ease-in-out infinite; }
      `}</style>

      {/* Back button */}
      <div className="nf-back-link" style={{ padding: "16px 24px", cursor: "pointer", opacity: .6, fontSize: ".85rem", display: "inline-flex", alignItems: "center", gap: 6 }} role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }} onClick={onBack}>
        <span style={{ fontSize: "1.1rem" }}>←</span> back to campaigns
      </div>

      {/* Banner */}
      <div style={{ width: "100%", maxWidth: 800, margin: "0 auto", position: "relative" }}>
        <div style={{ width: "100%", height: "clamp(160px, 35vw, 300px)", borderRadius: 16, overflow: "hidden", background: "#0c1424" }}>
          {c.imgUrl && <img src={c.imgUrl} alt={c.campaign} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
        </div>
        {/* Logo */}
        <div style={{ position: "absolute", bottom: -55, left: 28 }}>
          {c.logoUrl ? (
            <img src={c.logoUrl} alt={c.brand} style={{ width: 110, height: 110, borderRadius: "50%", border: "4px solid rgba(255,255,255,.15)", objectFit: "cover" }} />
          ) : (
            <div style={{ width: 110, height: 110, borderRadius: "50%", background: "#0c1424", border: "4px solid rgba(255,255,255,.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".75rem", opacity: .5 }}>logo</div>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "68px 16px 60px" }}>

        {c.isDemo && <aside className="nf-demo-notice"><strong>demo campaign</strong><p>Explore how a campaign can look. The brief, dates, creator activity, and reviews shown here are sample data.</p></aside>}
        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: "clamp(1.3rem, 4vw, 2rem)", fontWeight: 700, fontFamily: "'Monda', system-ui, sans-serif", textTransform: "lowercase", letterSpacing: "-.01em" }}>{c.brand}</div>
          <div style={{ fontSize: "1.2rem", opacity: .5, marginTop: 4, textTransform: "lowercase" }}>{c.campaign}</div>
        </div>

        {/* Info pills */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
          {[c.spotsTotal != null ? `${spotsLeft} spot${spotsLeft !== 1 ? "s" : ""} left` : "open", `deadline: ${c.deadline}`, c.location].filter(Boolean).map((t, i) => (
            <div key={i} style={{ padding: "8px 16px", borderRadius: 20, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.12)", fontSize: "1rem" }}>{t}</div>
          ))}
        </div>

        {/* Spots filled bar */}
        {c.spotsTotal != null && (
        <div style={{ padding: "20px 24px", borderRadius: 16, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)", marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
            <div style={{ fontSize: "1rem", opacity: .4, textTransform: "lowercase", fontFamily: "'Monda', system-ui, sans-serif" }}>spots filled</div>
            <div style={{ fontSize: "1.1rem", fontWeight: 600 }}>{derivedSpotsFilled} <span style={{ opacity: .35, fontWeight: 400 }}>/ {c.spotsTotal}</span></div>
          </div>
          <div style={{ width: "100%", height: 8, borderRadius: 4, background: "rgba(255,255,255,.08)", overflow: "hidden" }}>
            <div style={{ width: `${Math.min((derivedSpotsFilled / c.spotsTotal) * 100, 100)}%`, height: "100%", borderRadius: 4, background: "#fff", transition: "width .5s ease" }} />
          </div>
          <div style={{ fontSize: ".95rem", opacity: .35, marginTop: 6 }}>{spotsLeft} spot{spotsLeft !== 1 ? "s" : ""} remaining</div>
        </div>
        )}

        {/* Campaign stage tracker */}
        {(() => {
          // Influencer journey — each creator moves through these in order.
          // A campaign is just an aggregate of creators at various points.
          const INFLUENCER_LABELS = {
            applied: "applied",
            accepted: "accepted",
            product_shipped: "product shipped",
            content_submitted: "content submitted",
            approved: "content approved",
            paid: "paid",
          };
          // Campaign lifecycle — uses the human-set `c.stage` field. Intentional, not derived.
          const CAMPAIGN_STAGES = ["draft", "open", "active", "fulfillment", "wrap_up"];
          const CAMPAIGN_LABELS = {
            draft: "draft",
            open: "accepting creators",
            active: "content in production",
            fulfillment: "approvals & payouts",
            wrap_up: "completed",
          };
          const campaignIdx = Math.min(CAMPAIGN_STAGES.length - 1, Math.max(0,
            c.stage === "completed" || c.stage === "creator_paid" ? 4
            : c.stage === "approved" || c.stage === "under_review" ? 3
            : c.stage === "delivered" || c.stage === "shipped" ? 2
            : c.stage === "accepted" ? 1 : 1
          ));

          // Tally creators by stage. Pending list = "applied" regardless of any stored field.
          const counts = Object.fromEntries(INFLUENCER_STAGES.map(s => [s, 0]));
          (c.creators?.pending || []).forEach(() => { counts.applied += 1; });
          (c.creators?.approved || []).forEach(cr => {
            const s = INFLUENCER_STAGES.includes(cr.stage) ? cr.stage : "accepted";
            counts[s] += 1;
          });
          const totalCreators = INFLUENCER_STAGES.reduce((sum, s) => sum + counts[s], 0);

          const StageTracker = ({ stages, labels, currentIdx, label }) => (
            <div style={{ padding: "16px", borderRadius: 16, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)", marginBottom: 16 }}>
              <div style={{ fontSize: "1rem", opacity: .4, textTransform: "lowercase", fontFamily: "'Monda', system-ui, sans-serif", marginBottom: 18 }}>{label}</div>
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${stages.length}, 1fr)`, alignItems: "start" }}>
                {stages.map((s, i) => {
                  const isActive = i <= currentIdx;
                  const isCurrent = i === currentIdx;
                  const isLineFilled = i < currentIdx; // line to the RIGHT of this dot is filled if we've passed this step
                  return (
                    <div key={s} style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
                      {/* connector line to the NEXT dot — sits at same y as dot center */}
                      {i < stages.length - 1 && (
                        <div style={{
                          position: "absolute",
                          top: isCurrent ? 8 : 8, // dot center regardless of size
                          left: "calc(50% + 9px)",
                          right: "calc(-50% + 9px)",
                          height: 2,
                          background: isLineFilled ? "#fff" : "rgba(255,255,255,.08)",
                          transition: "background .3s",
                        }} />
                      )}
                      <div style={{
                        width: isCurrent ? 18 : 14, height: isCurrent ? 18 : 14, borderRadius: "50%",
                        background: isActive ? "#fff" : "rgba(255,255,255,.1)",
                        border: isCurrent ? "2px solid #fff" : "none",
                        boxShadow: isCurrent ? "0 0 12px rgba(255,255,255,.4)" : "none",
                        marginTop: isCurrent ? 0 : 2,
                        transition: "all .3s",
                        position: "relative",
                        zIndex: 1,
                      }} />
                      <div style={{
                        fontSize: "clamp(.5rem, 1.5vw, .75rem)", marginTop: 8, textAlign: "center",
                        opacity: isCurrent ? .9 : isActive ? .45 : .2,
                        fontWeight: isCurrent ? 600 : 400,
                        lineHeight: 1.2,
                        padding: "0 4px",
                      }}>
                        {labels[s]}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );

          return (<>
            <StageTracker stages={CAMPAIGN_STAGES} labels={CAMPAIGN_LABELS} currentIdx={campaignIdx} label="campaign lifecycle" />

            {totalCreators > 0 && (() => {
              const approvedTotal = (c.creators?.approved || []).length;
              // Stages where a fraction makes sense (X out of total approved have reached this stage)
              // "applied" and "accepted" don't need fractions — applied is pending, accepted is the baseline
              const FRACTION_STAGES = ["product_shipped", "content_submitted", "approved", "paid"];
              // For each fraction stage, count how many approved creators are AT OR PAST that stage
              const atOrPast = (stage) => {
                const stageIdx = INFLUENCER_STAGES.indexOf(stage);
                return (c.creators?.approved || []).filter(cr => {
                  const crIdx = INFLUENCER_STAGES.indexOf(cr.stage);
                  return crIdx >= stageIdx;
                }).length;
              };

              const shippingOverdue = approvedTotal > 0 && (c.creators?.approved || []).some(cr =>
                cr.stage === "accepted" && businessDaysSince(cr.acceptedAt) > 3
              );

              return (
                <div className="nf-detail-card" style={{ padding: "20px 24px", borderRadius: 16, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)", marginBottom: 24 }}>
                  <div style={{ fontSize: "1rem", opacity: .4, textTransform: "lowercase", fontFamily: "'Monda', system-ui, sans-serif", marginBottom: 16 }}>influencer breakdown</div>

                  {/* 3x2 grid: row1 = accepted, waiting for approval, product shipped | row2 = content submitted, content approved, paid */}
                  {/* Rule: accepted = approvedTotal (all creators in approved array regardless of sub-stage).
                      Fraction stages are only meaningful when approvedTotal > 0 — zeroed out otherwise. */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
                    {/* Tile: accepted — total approved creators */}
                    <div className="nf-apply-btn" style={{
                      padding: "10px 14px 14px", borderRadius: 12,
                      background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.3)",
                      opacity: approvedTotal === 0 ? 0.35 : 1,
                      display: "flex", flexDirection: "column", justifyContent: "space-between", alignItems: "center", minHeight: 90,
                    }}>
                      <div style={{ fontSize: ".92rem", opacity: .35, textTransform: "lowercase", alignSelf: "flex-start" }}>accepted</div>
                      <div style={{ fontSize: "clamp(1.6rem, 4vw, 2.8rem)", fontWeight: 700, fontFamily: "'Monda', system-ui, sans-serif", lineHeight: 1 }}>{approvedTotal}</div>
                    </div>
                    {/* Tile: awaiting review — clickable, gold shimmer border */}
                    <div onClick={() => setShowPendingModal(true)} className="nf-apply-btn nf-awaiting-tile" style={{
                      padding: "10px 14px 14px", borderRadius: 12,
                      background: "rgba(255,140,30,.06)",
                      cursor: "pointer", minHeight: 90,
                      display: "flex", flexDirection: "column", justifyContent: "space-between", alignItems: "center",
                      opacity: (c.creators.pending?.length || 0) === 0 ? 0.35 : 1,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, alignSelf: "flex-start" }}>
                        <div style={{ width: 5, height: 5, borderRadius: "50%", background: "rgba(255,150,40,.9)", flexShrink: 0 }} />
                        <span style={{ fontSize: ".92rem", opacity: .55, textTransform: "lowercase" }}>awaiting review →</span>
                      </div>
                      <span style={{ fontSize: "clamp(1.6rem, 4vw, 2.8rem)", fontWeight: 700, fontFamily: "'Monda', system-ui, sans-serif", lineHeight: 1 }}>{c.creators.pending?.length || 0}</span>
                    </div>
                    {/* Tile: product shipped — only meaningful if approvedTotal > 0. Glows red if any accepted creator > 3 business days unshipped */}
                    {(() => {
                      const s = "product_shipped";
                      const numerator = approvedTotal > 0 ? atOrPast(s) : 0;
                      return (
                        <div className={`nf-apply-btn${shippingOverdue ? " nf-shipping-overdue" : ""}`} style={{
                          padding: "10px 14px 14px", borderRadius: 12,
                          background: shippingOverdue ? "rgba(160,80,255,.07)" : "rgba(255,255,255,.03)",
                          border: shippingOverdue ? "1px solid rgba(160,80,255,.35)" : "1px solid rgba(255,255,255,.3)",
                          opacity: approvedTotal === 0 ? 0.35 : 1,
                          display: "flex", flexDirection: "column", justifyContent: "space-between", alignItems: "center", minHeight: 90,
                        }}>
                          <div style={{ fontSize: ".92rem", opacity: .35, textTransform: "lowercase", alignSelf: "flex-start" }}>{INFLUENCER_LABELS[s]}{shippingOverdue ? " ⚠" : ""}</div>
                          <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
                            <span style={{ fontSize: "clamp(1.6rem, 4vw, 2.8rem)", fontWeight: 700, fontFamily: "'Monda', system-ui, sans-serif", lineHeight: 1 }}>{numerator}</span>
                            <span style={{ fontSize: "clamp(1.6rem, 4vw, 2.8rem)", opacity: .25, fontWeight: 700, fontFamily: "'Monda', system-ui, sans-serif", lineHeight: 1 }}>/{approvedTotal}</span>
                          </div>
                        </div>
                      );
                    })()}
                    {/* Row 2: content submitted, content approved, paid — all zeroed if no approved creators */}
                    {["content_submitted", "approved", "paid"].map(s => {
                      const numerator = approvedTotal > 0 ? atOrPast(s) : 0;
                      return (
                        <div key={s} className="nf-apply-btn" style={{
                          padding: "10px 14px 14px", borderRadius: 12,
                          background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.3)",
                          opacity: approvedTotal === 0 ? 0.35 : 1,
                          display: "flex", flexDirection: "column", justifyContent: "space-between", alignItems: "center", minHeight: 90,
                        }}>
                          <div style={{ fontSize: ".92rem", opacity: .35, textTransform: "lowercase", alignSelf: "flex-start" }}>{INFLUENCER_LABELS[s]}</div>
                          <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
                            <span style={{ fontSize: "clamp(1.6rem, 4vw, 2.8rem)", fontWeight: 700, fontFamily: "'Monda', system-ui, sans-serif", lineHeight: 1 }}>{numerator}</span>
                            <span style={{ fontSize: "clamp(1.6rem, 4vw, 2.8rem)", opacity: .25, fontWeight: 700, fontFamily: "'Monda', system-ui, sans-serif", lineHeight: 1 }}>/{approvedTotal}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </>);
        })()}

        {/* Description */}
        <div style={{ fontSize: "1.1rem", opacity: .8, lineHeight: 1.7, marginBottom: 32 }}>
          {c.description || "No description provided."}
        </div>

        {/* Compensation + Platforms side-by-side */}
        <div className="nf-comp-deliverables" style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 12, marginBottom: 12 }}>
          {/* Compensation — compact */}
          <div style={{ padding: "16px 22px", borderRadius: 16, background: "linear-gradient(135deg, rgba(255,255,255,.08) 0%, rgba(255,255,255,.02) 100%)", border: "1px solid rgba(255,255,255,.15)", display: "flex", flexDirection: "column", justifyContent: "center", minWidth: 160 }}>
            <div style={{ fontSize: ".75rem", opacity: .4, textTransform: "lowercase", fontFamily: "'Monda', system-ui, sans-serif", marginBottom: 6 }}>creators get</div>
            <div style={{ fontSize: "clamp(1.3rem, 4vw, 1.8rem)", fontWeight: 700, fontFamily: "'Monda', system-ui, sans-serif", lineHeight: 1 }}>
              {c.comp}
            </div>
            {c.compType === "product+paid" && <div style={{ fontSize: ".8rem", fontWeight: 500, opacity: .5, marginTop: 4 }}>+ product</div>}
            <div style={{ fontSize: ".7rem", opacity: .3, marginTop: 6 }}>
              {c.compType === "product" ? "product seeding" : c.compType === "paid" ? "paid collaboration" : c.compType === "product+paid" ? "cash + product" : ""}
            </div>
          </div>

          {/* Platforms — horizontal wrap */}
          <div style={{ padding: "16px 22px", borderRadius: 16, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)" }}>
            <div style={{ fontSize: ".75rem", opacity: .4, textTransform: "lowercase", fontFamily: "'Monda', system-ui, sans-serif", marginBottom: 8 }}>platforms & deliverables</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {c.platforms.map((p) => (
                <div key={p} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 12, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.06)" }}>
                  <div style={{ width: 28, height: 28, borderRadius: 7, background: "rgba(255,255,255,.06)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {PLAT_SVGS_SMALL[p]}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: ".85rem", lineHeight: 1.2 }}>{p}</div>
                    <div style={{ fontSize: ".7rem", opacity: .5 }}>{c.deliverables?.[p] || "—"}</div>
                  </div>
                  <div style={{ fontSize: ".65rem", opacity: .3, marginLeft: 4 }}>{c.following || "any"}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Products — horizontal chips */}
        {c.products && c.products.length > 0 && (
          <div style={{ padding: "16px 22px", borderRadius: 16, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)", marginBottom: 12 }}>
            <div style={{ fontSize: ".75rem", opacity: .4, textTransform: "lowercase", fontFamily: "'Monda', system-ui, sans-serif", marginBottom: 8 }}>products included</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {c.products.map((p, i) => (
                <div key={i} style={{ padding: "8px 14px", borderRadius: 12, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.06)" }}>
                  <div style={{ fontWeight: 600, fontSize: ".85rem" }}>{p.name}</div>
                  {p.variant && <div style={{ fontSize: ".7rem", opacity: .4, marginTop: 1 }}>{p.variant}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Requirements — bullet list */}
        {(c.requirements || c.ageMin) && (() => {
          const reqs = [
            ...(c.ageMin ? [`Must be ${c.ageMin}`] : []),
            ...(c.requirements ? c.requirements.split(". ").filter(Boolean) : []),
          ].filter((r, i, arr) => arr.indexOf(r) === i); // dedupe in case ageMin also in requirements string
          return (
          <div style={{ padding: "16px 22px", borderRadius: 16, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)", marginBottom: 12 }}>
            <div style={{ fontSize: ".75rem", opacity: .4, textTransform: "lowercase", fontFamily: "'Monda', system-ui, sans-serif", marginBottom: 8 }}>requirements</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {reqs.map((req, i) => (
                <div key={i} style={{ display: "flex", gap: 8, fontSize: ".85rem", opacity: .65, lineHeight: 1.4 }}>
                  <span style={{ opacity: .4, flexShrink: 0 }}>•</span>
                  <span>{req.replace(/\.$/, "")}</span>
                </div>
              ))}
            </div>
          </div>
          );
        })()}

        {/* Style guide */}
        {c.hasStyleGuide && (
          <div style={{ padding: "14px 22px", borderRadius: 16, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)", display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(255,255,255,.06)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.5)" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: ".9rem", fontWeight: 500 }}>{c.brand} creator posting guide</div>
              <div style={{ fontSize: ".75rem", opacity: .35, marginTop: 1 }}>brand guidelines, content dos & don'ts</div>
            </div>
            {c.isDemo ? <button className="nf-demo-preview" aria-expanded={showDemoGuide} onClick={() => setShowDemoGuide(v => !v)}>{showDemoGuide ? "close" : "view example"}</button> : <div style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,.2)", fontSize: ".8rem", cursor: "pointer", flexShrink: 0 }}>view</div>}
          </div>
        )}

        {c.isDemo && showDemoGuide && <div className="nf-demo-guide"><strong>example creator posting guide</strong><p>Show the product in your usual setting and explain what you like about it in your own voice.</p><p>Follow the deliverables and platform requirements in the brief. Include a clear gifted or paid partnership disclosure, avoid unsupported claims, and share your draft for review before posting.</p></div>}
        {/* Creator Roster */}
        {c.creators && (c.creators.approved?.length > 0 || c.creators.pending?.length > 0) && (() => {
          // Deterministic pravatar index from creator name so each person keeps the same face
          const avatarIdx = (name) => {
            let h = 0;
            for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
            return (h % 70) + 1;
          };

          const nextStageLabel = (stage) => {
            const idx = INFLUENCER_STAGES.indexOf(stage);
            if (idx < 0 || idx >= INFLUENCER_STAGES.length - 1) return null;
            return STAGE_LABELS[INFLUENCER_STAGES[idx + 1]];
          };

          const CreatorCard = ({ creator, showStatus, showActions, showAdvance, showMessage }) => {
            const [trackingInput, setTrackingInput] = React.useState("");
            const clickable = !!onViewCreatorProfile;
            return (
            <div className="nf-apply-btn" onClick={clickable ? () => onViewCreatorProfile(creator) : undefined} style={{
              padding: "18px 20px", borderRadius: 16,
              background: "rgba(255,255,255,.03)",
              border: "1px solid rgba(255,255,255,.3)",
              display: "flex", alignItems: "center", gap: 14,
              position: "relative", overflow: "hidden",
              cursor: clickable ? "pointer" : "default",
            }}>
              <div style={{
                width: 50, height: 50, borderRadius: "50%", flexShrink: 0, overflow: "hidden",
                border: "1px solid rgba(255,255,255,.1)",
                background: "rgba(255,255,255,.05)",
              }}>
                <img
                  src={`https://i.pravatar.cc/100?img=${avatarIdx(creator.name)}`}
                  alt={creator.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                  <div style={{ fontWeight: 600, fontSize: ".95rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>
                    {creator.name}
                  </div>
                  {showStatus && creator.stage && (() => {
                    const PILL_COLORS = {
                      accepted:          { bg: "rgba(100,180,255,.13)", border: "rgba(100,180,255,.35)", color: "rgba(100,180,255,.95)" },
                      product_shipped:   { bg: "rgba(160,80,255,.13)",  border: "rgba(160,80,255,.4)",  color: "rgba(185,110,255,.95)" },
                      content_submitted: { bg: "rgba(255,140,30,.13)",  border: "rgba(255,140,30,.4)",  color: "rgba(255,160,50,.95)" },
                      approved:          { bg: "rgba(255,210,60,.12)",  border: "rgba(255,210,60,.4)",  color: "rgba(255,220,80,.95)" },
                      paid:              { bg: "rgba(100,255,150,.12)",  border: "rgba(100,255,150,.35)", color: "rgba(100,255,150,.95)" },
                    };
                    const pill = PILL_COLORS[creator.stage] || { bg: "rgba(255,255,255,.06)", border: "rgba(255,255,255,.1)", color: "rgba(255,255,255,.7)" };
                    return (
                      <div style={{
                        fontSize: ".65rem", fontWeight: 600,
                        padding: "3px 9px", borderRadius: 20,
                        background: pill.bg, border: `1px solid ${pill.border}`, color: pill.color,
                        textTransform: "lowercase", letterSpacing: ".02em",
                        whiteSpace: "nowrap", flexShrink: 0,
                      }}>
                        {STAGE_LABELS[creator.stage] || creator.stage}
                      </div>
                    );
                  })()}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: (showActions || showAdvance || showMessage) ? 10 : 0 }}>
                  {Object.entries(creator.platforms).map(([plat, count]) => (
                    <div key={plat} style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      padding: "3px 10px 3px 7px", borderRadius: 20,
                      background: "rgba(255,255,255,.06)",
                      border: "1px solid rgba(255,255,255,.1)",
                      color: "rgba(255,255,255,.75)",
                      fontSize: ".7rem", fontWeight: 600, letterSpacing: ".02em", whiteSpace: "nowrap",
                    }}>
                      <span style={{ display: "flex", alignItems: "center", opacity: .85 }}>{PLAT_SVGS_SMALL[plat] ? <span style={{ transform: "scale(.7)", display: "flex" }}>{PLAT_SVGS_SMALL[plat]}</span> : plat}</span>
                      <span>{count}</span>
                    </div>
                  ))}
                </div>
                {/* Tracking number chip — visible once shipped */}
                {creator.trackingNumber && (
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 8, padding: "4px 10px", borderRadius: 10, background: "rgba(160,80,255,.1)", border: "1px solid rgba(160,80,255,.3)" }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(185,110,255,.9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                    <span style={{ fontSize: ".68rem", color: "rgba(185,110,255,.9)", fontWeight: 600, letterSpacing: ".02em" }}>tracking: {creator.trackingNumber}</span>
                  </div>
                )}
                {/* Ship product row — shown to owner when stage is accepted */}
                {showAdvance && creator.stage === "accepted" && (
                  <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
                    <input
                      value={trackingInput}
                      onChange={e => setTrackingInput(e.target.value)}
                      onClick={e => e.stopPropagation()}
                      aria-label="tracking # (optional)" placeholder="tracking # (optional)"
                      style={{
                        flex: 1, minWidth: 120, padding: "5px 10px", borderRadius: 8,
                        background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.12)",
                        color: "#fff", fontSize: ".72rem", outline: "none",
                        fontFamily: "system-ui, sans-serif",
                      }}
                    />
                    <div
                      onClick={(e) => { e.stopPropagation(); shipCreator(creator.applicationId, trackingInput); }}
                      style={{
                        padding: "5px 12px", borderRadius: 8, fontSize: ".72rem", fontWeight: 600,
                        background: "rgba(160,80,255,.12)", border: "1px solid rgba(160,80,255,.35)",
                        color: "rgba(185,110,255,.95)", cursor: "pointer", whiteSpace: "nowrap",
                        transition: "all .12s",
                      }}
                    >
                      mark shipped
                    </div>
                  </div>
                )}
                {/* Approve / Reject buttons for pending creators */}
                {showActions && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <div onClick={(e) => { e.stopPropagation(); approveCreator(creator); }} style={{
                      padding: "6px 16px", borderRadius: 10, fontSize: ".78rem", fontWeight: 600,
                      background: "rgba(100,255,150,.1)", border: "1px solid rgba(100,255,150,.3)",
                      color: "rgba(180,255,80,.95)", cursor: "pointer", transition: "all .12s",
                    }}>approve</div>
                    <div onClick={(e) => { e.stopPropagation(); rejectCreator(creator); }} style={{
                      padding: "6px 16px", borderRadius: 10, fontSize: ".78rem", fontWeight: 600,
                      background: "rgba(255,100,100,.08)", border: "1px solid rgba(255,100,100,.2)",
                      color: "rgba(255,100,100,.7)", cursor: "pointer", transition: "all .12s",
                    }}>reject</div>
                  </div>
                )}
                {/* Advance + Message buttons row */}
                {(showAdvance || showMessage) && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {showAdvance && ["content_submitted","approved"].includes(creator.stage) && nextStageLabel(creator.stage) && (
                      <div onClick={(e) => { e.stopPropagation(); advanceCreator(creator.applicationId); }} style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        padding: "6px 14px", borderRadius: 10, fontSize: ".75rem", fontWeight: 600,
                        background: "rgba(100,200,255,.08)", border: "1px solid rgba(100,200,255,.25)",
                        color: "rgba(100,200,255,.9)", cursor: "pointer", transition: "all .12s",
                      }}>
                        {creator.stage === "approved" ? (["paid","product+paid"].includes(c.compType) ? "record completed payment" : "complete campaign") : "approve submitted content"}
                      </div>
                    )}
                    {showMessage && (
                      <div onClick={(e) => { e.stopPropagation(); onOpenMessage?.(creator); }} style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        padding: "6px 14px", borderRadius: 10, fontSize: ".75rem", fontWeight: 600,
                        background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.12)",
                        color: "rgba(255,255,255,.6)", cursor: "pointer", transition: "all .12s",
                      }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.6)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                        message
                      </div>
                    )}
                    {showAdvance && (
                      <div onClick={(e) => { e.stopPropagation(); setScheduleTarget(creator); }} style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        padding: "6px 14px", borderRadius: 10, fontSize: ".75rem", fontWeight: 600,
                        background: "rgba(100,200,255,.06)", border: "1px solid rgba(100,200,255,.18)",
                        color: "rgba(100,200,255,.7)", cursor: "pointer", transition: "all .12s",
                      }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                        schedule call
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            );
          };
          return (
            <div style={{ marginBottom: 32 }}>
              {/* Approved */}
              {c.creators.approved?.length > 0 && (
                <div className="nf-detail-card" style={{ padding: "20px 24px", borderRadius: 16, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)", marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                    <div style={{ fontSize: "1rem", opacity: .4, textTransform: "lowercase", fontFamily: "'Monda', system-ui, sans-serif", flex: 1 }}>approved influencers</div>
                    <div style={{ fontSize: "1.1rem", fontWeight: 700, fontFamily: "'Monda', system-ui, sans-serif", opacity: .8 }}>{c.creators.approved.length}</div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10 }}>
                    {c.creators.approved.map((cr, i) => <CreatorCard key={cr.userId || cr.name || i} creator={cr} showStatus showAdvance={isOwner} showMessage={isOwner} />)}
                  </div>
                </div>
              )}

              {/* Pending modal */}
              {showPendingModal && c.creators.pending?.length > 0 && (
                <div role="dialog" aria-modal="true" tabIndex={-1} ref={el => { if (el && !el.__f) { el.__f = true; el.focus(); } }} onKeyDown={e => { if (e.key === 'Escape') { setShowPendingModal(false); } }} onClick={() => setShowPendingModal(false)} style={{
                  position: "fixed", inset: 0, background: "rgba(0,0,0,.7)",
                  backdropFilter: "blur(8px)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  zIndex: 1000, padding: 20,
                }}>
                  <div onClick={(e) => e.stopPropagation()} style={{
                    background: "#0a1322",
                    border: "1px solid rgba(255,255,255,.12)",
                    borderRadius: 20, padding: "24px 28px",
                    maxWidth: 720, width: "100%", maxHeight: "85vh", overflowY: "auto",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                      <div style={{ fontSize: "1.1rem", fontWeight: 700, fontFamily: "'Monda', system-ui, sans-serif", textTransform: "lowercase" }}>
                        waiting for approval · {c.creators.pending.length}
                      </div>
                      <div onClick={() => setShowPendingModal(false)} style={{
                        cursor: "pointer", width: 44, height: 44, borderRadius: "50%",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: "rgba(255,255,255,.06)", fontSize: "1rem", opacity: .7,
                      }}><XIcon size={16} /></div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10 }}>
                      {c.creators.pending.map((cr, i) => <CreatorCard key={cr.userId || cr.name || i} creator={cr} showActions={isOwner} />)}
                    </div>
                    {c.creators.pending.length === 0 && (
                      <div style={{ textAlign: "center", padding: "30px 0", opacity: .3, fontSize: ".9rem" }}>all caught up!</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* Messages section — owner only */}
        {isOwner && (
          <div className="nf-detail-card" onClick={() => onOpenInbox?.()} style={{
            padding: "20px 24px", borderRadius: 16,
            background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)",
            marginBottom: 32, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 14,
          }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12, flexShrink: 0,
              background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.08)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "1rem", fontWeight: 600, fontFamily: "'Monda', system-ui, sans-serif", textTransform: "lowercase" }}>messages</div>
              <div style={{ fontSize: ".8rem", opacity: .35, marginTop: 2 }}>
                {messageCount > 0 ? `${messageCount} conversation${messageCount !== 1 ? "s" : ""}` : "no conversations yet"}
              </div>
            </div>
            <div style={{ fontSize: ".75rem", opacity: .4, textTransform: "lowercase" }}>open inbox →</div>
          </div>
        )}

        {/* Edit Campaign CTA — owner only */}
        {isOwner && (
          <div style={{ textAlign: "center" }}>
            <button onClick={() => onEditCampaign?.(c)} className="nf-cta-btn" style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 10,
              width: "100%", maxWidth: 400, padding: "18px 32px", borderRadius: 16,
              fontFamily: "system-ui, sans-serif", textTransform: "lowercase",
              fontSize: "1.1rem", fontWeight: 600,
              background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.2)",
              color: "rgba(255,255,255,.7)", cursor: "pointer",
              boxShadow: "0 10px 28px rgba(0,0,0,.25)"
            }}>
              ✏ edit campaign
            </button>
          </div>
        )}

        {/* Apply CTA — creator view only */}
        {c.isDemo && <div className="nf-demo-end"><p>Ready to build a campaign for your brand?</p><button className="nf-cta-btn" onClick={onStartCampaign}>start a campaign</button></div>}
        {!isOwner && !c.isDemo && (
          <div style={{ textAlign: "center" }}>
            {hasApplied ? (
              <div style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 10,
                width: "100%", maxWidth: 400, padding: "18px 32px", borderRadius: 16,
                fontFamily: "'Monda', system-ui, sans-serif", textTransform: "lowercase",
                fontSize: "1.1rem", fontWeight: 600,
                background: "rgba(100,255,150,.06)", border: "1px solid rgba(100,255,150,.2)",
                color: "rgba(100,255,150,.85)",
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(100,255,150,.85)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                application submitted
              </div>
            ) : (
              <button onClick={handleApplyClick} className="nf-cta-btn" style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: "100%", maxWidth: 400, padding: "18px 32px", borderRadius: 16,
                fontFamily: "system-ui, sans-serif", textTransform: "lowercase",
                fontSize: "1.1rem", fontWeight: 600,
                background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.28)",
                backdropFilter: "blur(20px)", color: "#fff", cursor: "pointer",
                boxShadow: "0 10px 28px rgba(0,0,0,.25)"
              }}>
                apply to this campaign
              </button>
            )}
          </div>
        )}

        {/* Apply Modal */}
        {showApplyModal && (
          <div role="dialog" aria-modal="true" tabIndex={-1} ref={el => { if (el && !el.__f) { el.__f = true; el.focus(); } }} onKeyDown={e => { if (e.key === 'Escape') { setShowApplyModal(false); } }} onClick={() => { if (applyStep === 3) setShowApplyModal(false); }} style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,.75)",
            backdropFilter: "blur(10px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1000, padding: 20,
          }}>
            <div onClick={(e) => e.stopPropagation()} style={{
              background: "#0a1322",
              border: "1px solid rgba(255,255,255,.12)",
              borderRadius: 24, padding: 24,
              maxWidth: 520, width: "100%", maxHeight: "85vh", overflowY: "auto",
              boxShadow: "0 40px 80px rgba(0,0,0,.6)",
            }}>
              {/* Modal header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: "1.2rem", fontWeight: 700, fontFamily: "'Monda', system-ui, sans-serif", textTransform: "lowercase" }}>
                    {applyStep === 3 ? "you're in!" : "apply to campaign"}
                  </div>
                  <div style={{ fontSize: ".85rem", opacity: .4, marginTop: 3 }}>
                    {applyStep === 3 ? `${c.brand} · ${c.campaign}` : `${c.brand} — ${c.campaign}`}
                  </div>
                </div>
                {applyStep < 3 && (
                  <div onClick={() => setShowApplyModal(false)} style={{
                    cursor: "pointer", width: 44, height: 44, borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: "rgba(255,255,255,.06)", fontSize: "1rem", opacity: .7,
                  }}><XIcon size={16} /></div>
                )}
              </div>

              {/* Step indicator */}
              {applyStep < 3 && (
                <div style={{ display: "flex", gap: 6, margin: "16px 0 24px" }}>
                  {["your info", "platforms", "pitch"].map((label, i) => (
                    <div key={label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                      <div style={{ width: "100%", height: 3, borderRadius: 2, background: i <= applyStep ? "#fff" : "rgba(255,255,255,.1)", transition: "background .3s" }} />
                      <div style={{ fontSize: ".7rem", opacity: i <= applyStep ? .7 : .25, textTransform: "lowercase", transition: "opacity .3s" }}>{label}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Step 0: Creator info */}
              {applyStep === 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div>
                    <div style={{ fontSize: ".75rem", opacity: .4, marginBottom: 6, textTransform: "lowercase" }}>full name</div>
                    <input
                      value={applyForm.name}
                      onChange={e => setApplyForm(f => ({ ...f, name: e.target.value }))}
                      aria-label="your name" placeholder="your name"
                      style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: "1px solid rgba(255,255,255,.15)", background: "rgba(0,0,0,.3)", color: "#fff", fontSize: ".95rem", outline: "none", fontFamily: "system-ui, sans-serif", transition: "border-color .12s" }}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: ".75rem", opacity: .4, marginBottom: 6, textTransform: "lowercase" }}>email</div>
                    <input
                      value={applyForm.email}
                      onChange={e => setApplyForm(f => ({ ...f, email: e.target.value }))}
                      aria-label="you@email.com" placeholder="you@email.com"
                      type="email"
                      style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: "1px solid rgba(255,255,255,.15)", background: "rgba(0,0,0,.3)", color: "#fff", fontSize: ".95rem", outline: "none", fontFamily: "system-ui, sans-serif", transition: "border-color .12s" }}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: ".75rem", opacity: .4, marginBottom: 6, textTransform: "lowercase" }}>portfolio link <span style={{ opacity: .5 }}>(optional)</span></div>
                    <input
                      value={applyForm.portfolio}
                      onChange={e => setApplyForm(f => ({ ...f, portfolio: e.target.value }))}
                      aria-label="https://your-site.com" placeholder="https://your-site.com"
                      style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: "1px solid rgba(255,255,255,.15)", background: "rgba(0,0,0,.3)", color: "#fff", fontSize: ".95rem", outline: "none", fontFamily: "system-ui, sans-serif", transition: "border-color .12s" }}
                    />
                  </div>
                  <button
                    disabled={!applyForm.name.trim() || !applyForm.email.includes("@")}
                    onClick={() => setApplyStep(1)}
                    style={{
                      width: "100%", padding: "14px", borderRadius: 14, border: "1px solid rgba(255,255,255,.25)",
                      background: applyForm.name.trim() && applyForm.email.includes("@") ? "rgba(255,255,255,.08)" : "transparent",
                      color: "#fff", fontSize: ".95rem", fontFamily: "system-ui, sans-serif",
                      textTransform: "lowercase", cursor: applyForm.name.trim() && applyForm.email.includes("@") ? "pointer" : "not-allowed",
                      opacity: applyForm.name.trim() && applyForm.email.includes("@") ? 1 : .3,
                      transition: "all .12s", marginTop: 6,
                    }}
                  >
                    continue →
                  </button>
                </div>
              )}

              {/* Step 1: Platforms */}
              {applyStep === 1 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ fontSize: ".85rem", opacity: .5, marginBottom: 4 }}>select the platforms you create on — this campaign is looking for {c.platforms.join(", ")}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {PLATFORM_LIST.map(p => {
                      const isTarget = c.platforms.includes(p);
                      const isSelected = applyForm.platforms[p];
                      return (
                        <div
                          key={p}
                          onClick={() => setApplyForm(f => ({ ...f, platforms: { ...f.platforms, [p]: !f.platforms[p] } }))}
                          style={{
                            display: "flex", alignItems: "center", gap: 8,
                            padding: "10px 16px", borderRadius: 12, cursor: "pointer",
                            background: isSelected ? "rgba(255,255,255,.1)" : "rgba(255,255,255,.03)",
                            border: `1px solid ${isSelected ? "rgba(255,255,255,.35)" : isTarget ? "rgba(100,200,255,.2)" : "rgba(255,255,255,.08)"}`,
                            transition: "all .15s",
                          }}
                        >
                          <span style={{ display: "flex", alignItems: "center" }}>{PLAT_SVGS_SMALL[p]}</span>
                          <span style={{ fontSize: ".85rem", fontWeight: isSelected ? 600 : 400 }}>{p}</span>
                          {isTarget && !isSelected && <span style={{ fontSize: ".6rem", opacity: .4, marginLeft: 2 }}>wanted</span>}
                        </div>
                      );
                    })}
                  </div>

                  {/* Handle + follower inputs for selected platforms */}
                  {applyPlatformKeys.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
                      {applyPlatformKeys.map(p => (
                        <div key={p} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,.06)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            {PLAT_SVGS_SMALL[p]}
                          </div>
                          <input aria-label="social handle"
                            value={applyForm.handles[p]}
                            onChange={e => setApplyForm(f => ({ ...f, handles: { ...f.handles, [p]: e.target.value } }))}
                            placeholder={`@${p.toLowerCase()} handle`}
                            style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,.12)", background: "rgba(0,0,0,.25)", color: "#fff", fontSize: ".85rem", outline: "none", fontFamily: "system-ui, sans-serif", minWidth: 0 }}
                          />
                          <input
                            value={applyForm.followers[p]}
                            onChange={e => setApplyForm(f => ({ ...f, followers: { ...f.followers, [p]: e.target.value } }))}
                            aria-label="followers" placeholder="followers"
                            style={{ width: 100, padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,.12)", background: "rgba(0,0,0,.25)", color: "#fff", fontSize: ".85rem", outline: "none", fontFamily: "system-ui, sans-serif" }}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                    <button
                      onClick={() => setApplyStep(0)}
                      style={{ flex: 1, padding: "12px", borderRadius: 12, border: "1px solid rgba(255,255,255,.12)", background: "transparent", color: "rgba(255,255,255,.5)", fontSize: ".85rem", cursor: "pointer", fontFamily: "'Monda', system-ui, sans-serif", textTransform: "lowercase" }}
                    >← back</button>
                    <button
                      disabled={!applyHandlesComplete}
                      onClick={() => setApplyStep(2)}
                      style={{
                        flex: 2, padding: "12px", borderRadius: 12, border: "1px solid rgba(255,255,255,.25)",
                        background: applyHandlesComplete ? "rgba(255,255,255,.08)" : "transparent",
                        color: "#fff", fontSize: ".85rem", fontFamily: "system-ui, sans-serif",
                        textTransform: "lowercase", cursor: applyHandlesComplete ? "pointer" : "not-allowed",
                        opacity: applyHandlesComplete ? 1 : .3, transition: "all .12s",
                      }}
                    >continue →</button>
                  </div>
                </div>
              )}

              {/* Step 2: Pitch */}
              {applyStep === 2 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div>
                    <div style={{ fontSize: ".75rem", opacity: .4, marginBottom: 6, textTransform: "lowercase" }}>why are you a great fit for this campaign?</div>
                    <textarea aria-label="pitch"
                      value={applyForm.pitch}
                      onChange={e => setApplyForm(f => ({ ...f, pitch: e.target.value }))}
                      placeholder={`Tell ${c.brand} why you'd be a great fit. Share your content style, past brand work, what excites you about this campaign...`}
                      rows={5}
                      style={{ width: "100%", padding: "14px 16px", borderRadius: 12, border: "1px solid rgba(255,255,255,.15)", background: "rgba(0,0,0,.3)", color: "#fff", fontSize: ".9rem", outline: "none", fontFamily: "system-ui, sans-serif", resize: "vertical", lineHeight: 1.5, transition: "border-color .12s" }}
                    />
                    <div style={{ fontSize: ".7rem", opacity: .25, marginTop: 4, textAlign: "right" }}>{applyForm.pitch.length} / 500</div>
                  </div>
                  <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", padding: "12px 14px", borderRadius: 12, background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.06)" }}>
                    <input
                      type="checkbox"
                      checked={applyForm.agreeTerms}
                      onChange={e => setApplyForm(f => ({ ...f, agreeTerms: e.target.checked }))}
                      style={{ marginTop: 2, accentColor: "#fff", flexShrink: 0 }}
                    />
                    <span style={{ fontSize: ".8rem", opacity: .55, lineHeight: 1.5 }}>
                      I confirm all information in my application is accurate, and I agree to Nfluence's{" "}
                      <a href="https://nfluenceagency.com/terms" target="_blank" rel="noopener noreferrer" style={{ color: "rgba(255,255,255,.85)", textDecoration: "underline" }}>Terms of Service</a>
                      {" "}and{" "}
                      <a href="https://nfluenceagency.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: "rgba(255,255,255,.85)", textDecoration: "underline" }}>Privacy Policy</a>.
                    </span>
                  </label>
                  {(c.ageMin || (c.requirements || "").includes("18+") || (c.requirements || "").includes("21+")) && (
                    <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", padding: "12px 14px", borderRadius: 12, background: "rgba(255,140,30,.04)", border: "1px solid rgba(255,140,30,.2)" }}>
                      <input
                        type="checkbox"
                        checked={applyForm.agreeAge || false}
                        onChange={e => setApplyForm(f => ({ ...f, agreeAge: e.target.checked }))}
                        style={{ marginTop: 2, accentColor: "rgba(255,160,50,.9)", flexShrink: 0 }}
                      />
                      <span style={{ fontSize: ".8rem", color: "rgba(255,160,50,.8)", lineHeight: 1.5 }}>
                        I confirm I meet the minimum age requirement for this campaign ({c.ageMin || "18+"}) and am legally permitted to receive the stated compensation. I understand that misrepresentation of my age may result in removal from the platform.
                      </span>
                    </label>
                  )}
                  <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                    <button
                      onClick={() => setApplyStep(1)}
                      style={{ flex: 1, padding: "12px", borderRadius: 12, border: "1px solid rgba(255,255,255,.12)", background: "transparent", color: "rgba(255,255,255,.5)", fontSize: ".85rem", cursor: "pointer", fontFamily: "'Monda', system-ui, sans-serif", textTransform: "lowercase" }}
                    >← back</button>
                    <button
                      disabled={workflowBusy || !applyForm.pitch.trim() || !applyForm.agreeTerms || ((c.ageMin || (c.requirements || "").includes("18+") || (c.requirements || "").includes("21+")) && !applyForm.agreeAge)}
                      onClick={submitApplication}
                      style={{
                        flex: 2, padding: "14px", borderRadius: 12,
                        border: (applyForm.pitch.trim() && applyForm.agreeTerms) ? "1px solid rgba(100,255,150,.35)" : "1px solid rgba(255,255,255,.15)",
                        background: (applyForm.pitch.trim() && applyForm.agreeTerms) ? "rgba(100,255,150,.1)" : "transparent",
                        color: (applyForm.pitch.trim() && applyForm.agreeTerms) ? "rgba(100,255,150,.9)" : "rgba(255,255,255,.3)",
                        fontSize: ".95rem", fontWeight: 600, fontFamily: "system-ui, sans-serif",
                        textTransform: "lowercase",
                        cursor: (applyForm.pitch.trim() && applyForm.agreeTerms) ? "pointer" : "not-allowed",
                        transition: "all .15s",
                      }}
                    >submit application</button>
                  </div>
                </div>
              )}

              {/* Step 3: Success */}
              {applyStep === 3 && (
                <div style={{ textAlign: "center", padding: "24px 0 12px" }}>
                  <div style={{
                    width: 64, height: 64, borderRadius: "50%",
                    background: "rgba(100,255,150,.1)", border: "1px solid rgba(100,255,150,.25)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    margin: "0 auto 20px",
                  }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(100,255,150,.85)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <div style={{ fontSize: "1.2rem", fontWeight: 700, fontFamily: "'Monda', system-ui, sans-serif", marginBottom: 8 }}>application sent!</div>
                  <div style={{ fontSize: ".9rem", opacity: .5, lineHeight: 1.6, maxWidth: 340, margin: "0 auto 24px" }}>
                    {c.brand} will review your profile and reach out if you're selected. Keep an eye on your email.
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{
                      padding: "12px 16px", borderRadius: 14, background: "rgba(255,255,255,.04)",
                      border: "1px solid rgba(255,255,255,.08)", fontSize: ".82rem", opacity: .6,
                      display: "flex", justifyContent: "space-between",
                    }}>
                      <span>applied as</span>
                      <span style={{ fontWeight: 600, opacity: 1 }}>{applyForm.name}</span>
                    </div>
                    <div style={{
                      padding: "12px 16px", borderRadius: 14, background: "rgba(255,255,255,.04)",
                      border: "1px solid rgba(255,255,255,.08)", fontSize: ".82rem", opacity: .6,
                      display: "flex", justifyContent: "space-between",
                    }}>
                      <span>platforms</span>
                      <span style={{ fontWeight: 600, opacity: 1 }}>{applyPlatformKeys.join(", ")}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowApplyModal(false)}
                    style={{
                      marginTop: 24, padding: "14px 32px", borderRadius: 14,
                      border: "1px solid rgba(255,255,255,.2)", background: "rgba(255,255,255,.06)",
                      color: "#fff", fontSize: ".9rem", cursor: "pointer",
                      fontFamily: "'Monda', system-ui, sans-serif", textTransform: "lowercase",
                      transition: "all .12s",
                    }}
                  >done</button>
                </div>
              )}
            </div>
          </div>
        )}

        {ScheduleCallModal()}
        {workflowError && <p role="alert" className="async-error" style={{position:'fixed',bottom:20,left:20,right:20,zIndex:2500}}>{workflowError}</p>}
        {paymentTarget && <ManualPaymentForm application={paymentTarget} campaign={c} onCancel={()=>setPaymentTarget(null)} onSaved={()=>{setC(prev=>({...prev,creators:{...prev.creators,approved:prev.creators.approved.map(cr=>cr.applicationId===paymentTarget.applicationId?{...cr,stage:'paid'}:cr)}}));setPaymentTarget(null);}}/>}

      </div>
    </div>
  );
}

function CampaignEditor({ campaign: initialCampaign, onBack, onSave, session }) {
  const [c, setC] = useState(() => { const init = JSON.parse(JSON.stringify(initialCampaign)); if (init.spotsTotal === undefined) init.spotsTotal = null; return init; });
  const [showPayModal, setShowPayModal] = useState(false);
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState("");
  const [customSpots, setCustomSpots] = useState(false);
  const hasAccepted = (c.creators?.approved?.length || 0) > 0;
  const featuredWeeks = c.featuredWeeks || 7;
  const containerRef = useRef(null);
  const cardRef = useRef(null);
  const cardDivRef = useRef(null);
  const [promoCode, setPromoCode] = useState("");
  // Server quote is the single source of truth — no client-side promo/discount math.
  const [quote, setQuote] = useState(null);        // { amount_cents, subtotal_cents, discount_pct, breakdown }
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState("");
  const isFree = !!quote && quote.amount_cents === 0;
  const buildEditFeatures = () => ({ featured: c.featured, featuredWeeks: c.featuredWeeks || 7, compType: c.compType, comp: c.comp, spotsTotal: c.spotsTotal });
  const fetchQuote = async (code = promoCode) => {
    setQuoteLoading(true); setQuoteError("");
    try {
      const q = await callStripePaymentV2({ action: 'quote', type: 'campaign_edit', campaignId: c.id, features: buildEditFeatures(), promoCode: (code || '').trim() }, session?.access_token);
      setQuote(q);
    } catch (e) { setQuote(null); setQuoteError(e.message || 'could not load price'); }
    finally { setQuoteLoading(false); }
  };
  const needCard = showPayModal && !!quote && quote.amount_cents > 0;
  useEffect(() => {
    if (!showPayModal) { setQuote(null); setQuoteError(""); setPayError(""); setPromoCode(""); return; }
    fetchQuote(); // price when the modal opens
  }, [showPayModal]);
  useEffect(() => {
    if (!needCard) { cardRef.current?.destroy(); cardRef.current = null; return; }
    const stripe = getStripe();
    if (!stripe) return;
    const t = setTimeout(() => {
      if (!cardDivRef.current || cardRef.current) return;
      const card = stripe.elements().create('card', {
        style: { base: { color: '#fff', fontFamily: 'system-ui, sans-serif', fontSize: '15px', '::placeholder': { color: 'rgba(255,255,255,.35)' } } },
      });
      card.mount(cardDivRef.current);
      cardRef.current = card;
    }, 0);
    return () => { clearTimeout(t); cardRef.current?.destroy(); cardRef.current = null; };
  }, [needCard]);
  useLayoutEffect(() => { window.scrollTo?.({ top: 0, behavior: "smooth" }); }, []);
  const setField = (field, value) => setC(prev => ({ ...prev, [field]: value }));
  const updateProduct = (i, key, value) => setC(prev => { const products = [...(prev.products || [])]; products[i] = { ...products[i], [key]: value }; return { ...prev, products }; });
  const addProduct = () => setC(prev => ({ ...prev, products: [...(prev.products || []), { name: "", variant: "" }] }));
  const removeProduct = (i) => setC(prev => ({ ...prev, products: prev.products.filter((_, idx) => idx !== i) }));
  const COMP_RANK = { product: 0, paid: 1, "product+paid": 2, other: 3 };
  const canChangeComp = (newType) => !hasAccepted || (COMP_RANK[newType] || 0) >= (COMP_RANK[c.compType] || 0);
  const compIsLocked = hasAccepted && (COMP_RANK[initialCampaign.compType] || 0) > 0;
  const sectionTitle = (label, locked = false) => (
    <div style={{ fontSize: ".72rem", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 14, fontFamily: "'Monda', system-ui, sans-serif", display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ opacity: .3 }}>{label}</span>
      {locked && <span style={{ fontSize: ".68rem", padding: "3px 10px", borderRadius: 20, background: "rgba(255,140,30,.9)", color: "#000", fontWeight: 700, letterSpacing: ".02em", lineHeight: 1.4, textTransform: "none" }}>locked</span>}
    </div>
  );

  // Escrow calculations
  const isPaidComp = c.compType === "paid" || c.compType === "product+paid";
  const perCreator = parseFloat((c.comp || "").replace(/[^0-9.]/g, "")) || 0;
  const capCount = c.spotsTotal || 0;
  const newEscrow = isPaidComp && capCount > 0 ? perCreator * capCount : 0;

  const wasAlreadyPaid = initialCampaign.compType === "paid" || initialCampaign.compType === "product+paid";
  const oldPerCreator = parseFloat((initialCampaign.comp || "").replace(/[^0-9.]/g, "")) || 0;
  const oldCap = initialCampaign.spotsTotal || 0;
  const oldEscrow = wasAlreadyPaid && oldCap > 0 ? oldPerCreator * oldCap : 0;
  const escrowDelta = Math.max(0, newEscrow - oldEscrow);
  const escrowChanged = escrowDelta > 0;

  const [saveError,setSaveError]=useState("");
  const [saveBusy,setSaveBusy]=useState(false);
  const handleSave = async () => {
    setSaveError("");
    const needsPayment = (c.featured && !initialCampaign.featured) || c.comp!==initialCampaign.comp || c.compType!==initialCampaign.compType || c.spotsTotal!==initialCampaign.spotsTotal;
    if (needsPayment) setShowPayModal(true);
    else {setSaveBusy(true);try{await onSave(c);}catch(error){setSaveError(error.message);}finally{setSaveBusy(false);}}
  };

  return (
    <div ref={containerRef} style={{ minHeight: "100vh", overflowX: "hidden", background: "radial-gradient(circle at calc(46% + 250px) calc(58% - 175px), rgba(255,255,255,.103) 0%, rgba(255,255,255,.0309) 38%, transparent 52%), linear-gradient(180deg, #040b15 0%, #070f1f 100%)", backgroundColor: "#040b15", color: "#fff", fontFamily: "system-ui, sans-serif" }}>
      <style>{`
        @font-face { font-family: 'Monda'; src: url('/assets/Monda-Regular.woff') format('woff'); font-weight: 400 700; font-display: swap; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .ce-input { border-radius: 12px; border: 1px solid rgba(255,255,255,.15); background: rgba(0,0,0,.3); color: #fff; padding: 11px 14px; font-size: .9rem; width: 100%; outline: none; font-family: system-ui, sans-serif; transition: border-color .12s; }
        .ce-input::placeholder { color: rgba(255,255,255,.3); }
        .ce-input:focus { border-color: rgba(255,255,255,.5); background: rgba(0,0,0,.45); }
        .ce-input:disabled { opacity: .35; cursor: not-allowed; }
        .ce-input option { background: #0a1322; color: #fff; }
        .ce-input[type="number"]::-webkit-inner-spin-button, .ce-input[type="number"]::-webkit-outer-spin-button { filter: invert(1); opacity: .5; }
        .ce-input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(1); opacity: .5; cursor: pointer; }
        .ce-input[type="date"] { color-scheme: dark; }
        .ce-label { font-size: .72rem; opacity: .35; margin-bottom: 6px; display: block; }
        .ce-section { background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.08); border-radius: 16px; padding: 22px 24px; margin-bottom: 16px; }
        .ce-locked-section { background: rgba(255,140,30,.04); border-radius: 16px; padding: 22px 24px; margin-bottom: 16px; animation: ce-lock-pulse 2.5s ease-in-out infinite; }
        @keyframes ce-lock-pulse { 0%,100% { border: 1px solid rgba(255,140,30,.25); box-shadow: 0 0 8px rgba(255,140,30,.08); } 50% { border: 1px solid rgba(255,165,50,.85); box-shadow: 0 0 18px rgba(255,140,30,.3); } }
        .ce-comp-pill { display: inline-flex; align-items: center; justify-content: center; min-height: 44px; box-sizing: border-box;padding: 10px 18px; border-radius: 12px; border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.03); color: rgba(255,255,255,.55); font-size: .85rem; cursor: pointer; transition: all .12s; }
        .ce-comp-pill.selected { background: rgba(255,255,255,.1); border-color: rgba(255,255,255,.35); color: #fff; }
        .ce-comp-pill.locked-opt { opacity: .22; cursor: not-allowed; pointer-events: none; }
        .ce-comp-pill.selected.in-locked { background: rgba(255,140,30,.15); border-color: rgba(255,165,50,.6); color: rgba(255,165,50,.95); }
        .ce-spots-pill { display: inline-flex; align-items: center; justify-content: center; min-height: 44px; box-sizing: border-box;padding: 8px 14px; border-radius: 10px; border: 1px solid rgba(255,255,255,.1); background: rgba(255,255,255,.03); color: rgba(255,255,255,.5); font-size: .82rem; cursor: pointer; transition: all .12s; }
        .ce-spots-pill.selected { background: rgba(255,255,255,.1); border-color: rgba(255,255,255,.3); color: #fff; }
        .ce-spots-pill.locked-opt { opacity: .22; cursor: not-allowed; pointer-events: none; }
        .ce-save-btn { padding: 14px 48px; border-radius: 14px; border: 1px solid rgba(255,255,255,.3); background: rgba(255,255,255,.08); color: #fff; font-size: 1rem; font-family: system-ui, sans-serif; text-transform: lowercase; cursor: pointer; transition: transform .12s, border-color .2s, box-shadow .2s, background .2s; display: block; margin: 0 auto; }
        .ce-save-btn:hover { background: rgba(255,255,255,.14); border-color: rgba(255,255,255,.55); box-shadow: 0 0 18px rgba(255,255,255,.12); transform: translateY(-2px); }
        .ce-comp-pill:not(.locked-opt):hover { border-color: rgba(255,255,255,.55) !important; box-shadow: 0 0 14px rgba(255,255,255,.15) !important; background: rgba(255,255,255,.08) !important; transform: translateY(-1px); }
        .ce-spots-pill:hover { border-color: rgba(255,255,255,.55) !important; box-shadow: 0 0 14px rgba(255,255,255,.15) !important; background: rgba(255,255,255,.08) !important; transform: translateY(-1px); }
        .ce-plat-locked { opacity: .45; pointer-events: none; }
        .ce-action-btn { transition: transform .12s, border-color .2s, box-shadow .2s, background .2s; }
        .ce-action-btn:hover { border-color: rgba(255,255,255,.55) !important; box-shadow: 0 0 14px rgba(255,255,255,.15) !important; background: rgba(255,255,255,.08) !important; transform: translateY(-1px); }
        .ce-featured-section { border-radius: 16px; padding: 22px 24px; margin-bottom: 16px; background: rgba(160,80,255,.04); animation: ce-feat-pulse 2.5s ease-in-out infinite; }
        .ce-featured-section-off { background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.08); border-radius: 16px; padding: 22px 24px; margin-bottom: 16px; }
        @keyframes ce-feat-pulse { 0%,100% { border: 1px solid rgba(160,80,255,.25); box-shadow: 0 0 8px rgba(140,60,255,.08); } 50% { border: 1px solid rgba(185,110,255,.85); box-shadow: 0 0 18px rgba(160,80,255,.3); } }
        .ce-feat-pill { min-height: 44px; box-sizing: border-box;flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 16px; font-size: .9rem; border-radius: 10px; border: 1px solid rgba(160,80,255,.2); background: rgba(160,80,255,.06); color: rgba(185,110,255,.7); cursor: pointer; transition: all .12s; }
        .ce-feat-pill:hover { border-color: rgba(185,110,255,.6) !important; box-shadow: 0 0 14px rgba(160,80,255,.2) !important; background: rgba(160,80,255,.12) !important; transform: translateY(-1px); }
        .ce-feat-pill.selected { background: rgba(160,80,255,.18); border-color: rgba(185,110,255,.7); color: rgba(210,160,255,.95); }
        @keyframes nf-gold-shimmer2 { 0%,100%{background-position:200% center}50%{background-position:0% center} }
        .ce-feat-name { background: linear-gradient(90deg,#fbbf24,#fef3c7,#f59e0b,#fbbf24); background-size: 200% auto; -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; animation: nf-gold-shimmer2 3s linear infinite; }
        .ce-field-row { display: flex; gap: 12px; }
        @media (max-width: 600px) {
          .ce-field-row { flex-direction: column; }
          .ce-feat-pill { padding: 10px 10px; font-size: .82rem; }
          .ce-input { font-size: 16px; }
        }
      `}</style>
      <div style={{ width: "100%", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ fontFamily: "'Monda', system-ui, sans-serif", fontWeight: 600, fontSize: "1.1rem", cursor: "pointer" }} role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }} onClick={onBack}>nfluence</div>
        <div className="ce-action-btn" style={{ cursor: "pointer", opacity: .5, fontSize: ".85rem", padding: "6px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,.1)" }} role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }} onClick={onBack}>← back</div>
      </div>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "8px 16px 100px" }}>{saveError && <p className="async-error" role="alert">{saveError}</p>}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: "clamp(1.3rem, 4vw, 1.8rem)", fontWeight: 700, fontFamily: "'Monda', system-ui, sans-serif", marginBottom: 4 }}>edit campaign</div>
          <div style={{ fontSize: ".88rem", opacity: .4 }}>{c.brand} · {c.campaign}</div>
          {hasAccepted && <div style={{ marginTop: 12, padding: "10px 16px", borderRadius: 12, background: "rgba(255,140,30,.08)", border: "1px solid rgba(255,140,30,.5)", fontSize: ".82rem", color: "rgba(255,165,50,.95)", display: "flex", alignItems: "center", gap: 8, animation: "ce-lock-pulse 2.5s ease-in-out infinite" }}><span>⚠</span> some fields are locked because creators have been accepted</div>}
        </div>
        <div className="ce-section">
          {sectionTitle("campaign details")}
          <div style={{ marginBottom: 14 }}><label className="ce-label">campaign name</label><input aria-label="Campaign name" className="ce-input" value={c.campaign} onChange={e => setField("campaign", e.target.value)} /></div>
          <div style={{ marginBottom: 14 }}><label className="ce-label">description</label><textarea aria-label="Description" className="ce-input" value={c.description} onChange={e => setField("description", e.target.value)} rows={5} style={{ resize: "vertical", lineHeight: 1.55 }} /></div>
          <div style={{ marginBottom: 14 }}><label className="ce-label">requirements</label><textarea aria-label="Requirements" className="ce-input" value={c.requirements} onChange={e => setField("requirements", e.target.value)} rows={3} style={{ resize: "vertical", lineHeight: 1.55 }} /></div>
          <div style={{ marginBottom: 14 }}>
            <label className="ce-label">min. age</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
              {["any", "18+", "21+"].map(opt => {
                const val = opt === "any" ? "" : opt;
                const active = (c.ageMin || "") === val;
                return (
                  <div key={opt} onClick={() => setField("ageMin", val)}
                    style={{
                      padding: "6px 18px", borderRadius: 20, cursor: "pointer", fontSize: ".82rem", fontWeight: 600,
                      transition: "all .12s",
                      background: active ? "rgba(255,255,255,.15)" : "rgba(255,255,255,.04)",
                      border: `1px solid ${active ? "rgba(255,255,255,.45)" : "rgba(255,255,255,.12)"}`,
                      color: active ? "#fff" : "rgba(255,255,255,.45)",
                    }}>
                    {opt}
                  </div>
                );
              })}
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
            <div style={{ flex: 1 }}>
              <label className="ce-label">deadline</label>
              {(() => {
                const toISO = (str) => {
                  if (!str) return "";
                  if (/^\d{4}-\d{2}-\d{2}$/.test(str))return str;
                  const parts = str.split("/");
                  if (parts.length !== 3) return "";
                  const [m, d, y] = parts;
                  const full = y.length === 2 ? "20" + y : y;
                  return `${full}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`;
                };
                const isoVal = c.deadlineISO || toISO(c.deadline);
                return (
                  <input className="ce-input" type="date" value={isoVal}
                    onChange={e => {
                      setField("deadlineISO", e.target.value);
                      if (e.target.value) {
                        setField("deadline", e.target.value);
                      }
                    }}
                    style={{ paddingRight: 10 }} />
                );
              })()}
              {c.deadline && <div style={{ fontSize: ".68rem", opacity: .3, marginTop: 4 }}>{c.deadline}</div>}
            </div>
          </div>
          <div className="ce-field-row" style={{ marginBottom: 14 }}>
            <div style={{ flex: 1 }}>
              <label className="ce-label">city</label>
              <input className="ce-input" value={c.locationCity || ""} onChange={e => { setField("locationCity", e.target.value); setField("location", [e.target.value, c.locationCountry].filter(Boolean).join(", ")); }} placeholder="e.g. Los Angeles" />
            </div>
            <div style={{ flex: 1 }}>
              <label className="ce-label">country</label>
              <select className="ce-input" value={c.locationCountry || ""} onChange={e => { setField("locationCountry", e.target.value); setField("location", [c.locationCity, e.target.value].filter(Boolean).join(", ")); }} style={{ appearance: "none", backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.4)' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 14px center" }}>
                <option value="">select country...</option>
                {REGION_CODES.map(code => {
                  const name = typeof Intl !== "undefined" ? new Intl.DisplayNames(["en"], { type: "region" }).of(code) : code;
                  return <option key={code} value={name} style={{ background: "#0a1322" }}>{name}</option>;
                })}
              </select>
            </div>
          </div>
        </div>
        <div className="ce-section">
          {sectionTitle("creator cap")}
          <label className="ce-label">max creators</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {[5, 10, 15, 20, 25, 50, null, "custom"].map((v, idx) => {
              const isAny = v === null; const isCustom = v === "custom";
              const isPaidComp = c.compType === "paid" || c.compType === "product+paid";
              const isDisabled = isAny && isPaidComp;
              const isSelected = isAny ? c.spotsTotal === null : isCustom ? (c.spotsTotal !== null && ![5,10,15,20,25,50].includes(c.spotsTotal)) : c.spotsTotal === v;
              return <div key={idx} className={"ce-spots-pill" + (isSelected ? " selected" : "") + (isDisabled ? " locked-opt" : "")} onClick={() => {
                if (isDisabled) return;
                if (isAny) { setCustomSpots(false); setField("spotsTotal", null); }
                else if (isCustom) { setCustomSpots(true); setField("spotsTotal", 0); }
                else { setCustomSpots(false); setField("spotsTotal", v); }
              }}>{isAny ? "any" : isCustom ? "custom" : v}</div>;
            })}
          </div>
          {(c.compType === "paid" || c.compType === "product+paid") && (
            <div style={{ marginTop: 12, display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 14px", borderRadius: 10, background: "rgba(255,140,30,.08)", border: "1px solid rgba(255,140,30,.25)" }}>
              <span style={{ color: "rgba(255,165,50,.9)", fontSize: ".95rem", flexShrink: 0, marginTop: 1 }}>⚠</span>
              <span style={{ fontSize: ".8rem", color: "rgba(255,165,50,.8)", lineHeight: 1.5 }}>paid campaigns require a creator cap — use this to plan the creator budget</span>
            </div>
          )}
          {(customSpots || (c.spotsTotal !== null && ![5,10,15,20,25,50].includes(c.spotsTotal))) && <input className="ce-input" type="number" style={{ marginTop: 10, maxWidth: 160 }} value={c.spotsTotal || ""} placeholder="enter number" onChange={e => setField("spotsTotal", parseInt(e.target.value) || 0)} />}
        </div>
        <div className={compIsLocked ? "ce-locked-section" : "ce-section"}>
          {sectionTitle("compensation", compIsLocked)}
          {compIsLocked && <div style={{ fontSize: ".78rem", opacity: .5, marginBottom: 14 }}>compensation type is locked after acceptance; the agreed amount cannot be reduced</div>}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
            {[{value:"product",label:"product only"},{value:"paid",label:"paid"},{value:"product+paid",label:"product + paid"}].map(opt => {
              const isSelected = c.compType === opt.value; const isLocked = compIsLocked && opt.value!==c.compType;
              return <div key={opt.value} className={"ce-comp-pill" + (isSelected ? " selected" + (compIsLocked ? " in-locked" : "") : "") + (isLocked ? " locked-opt" : "")} onClick={() => {
                if (!isLocked) {
                  const isPaid = opt.value === "paid" || opt.value === "product+paid";
                  setC(prev => ({
                    ...prev,
                    compType: opt.value,
                    comp: opt.value === "product" ? "free product" : isPaid ? (prev.comp === "free product" ? "" : prev.comp) : prev.comp,
                    spotsTotal: isPaid && prev.spotsTotal === null ? 0 : prev.spotsTotal,
                  }));
                  if (isPaid && c.spotsTotal === null) setCustomSpots(true);
                }
              }}>{opt.label}</div>;
            })}
          </div>
          {(c.compType === "paid" || c.compType === "product+paid") && (
            <div>
              <label className="ce-label">amount per creator</label>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ position: "relative", maxWidth: 200 }}>
                  <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", opacity: .5, fontSize: ".9rem" }}>$</span>
                  <input aria-label="Amount per creator in USD" className="ce-input" value={c.comp.replace(/^\$/, "")} onChange={e => setField("comp", "$" + e.target.value.replace(/^\$/, ""))} placeholder="0.00" style={{ paddingLeft: 28 }} />
                </div>
                {(() => {
                  const perCreator = parseFloat(c.comp.replace(/[^0-9.]/g, ""));
                  const count = c.spotsTotal || (c.creators?.approved?.length || 0);
                  if (!perCreator || count === 0) return null;
                  const total = (perCreator * count).toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 });
                  return (
                    <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                      <div style={{ fontSize: "2rem", fontWeight: 700, fontFamily: "'Monda', system-ui, sans-serif", color: "rgba(180,255,80,.95)", lineHeight: 1 }}>{total}</div>
                      <div style={{ fontSize: ".82rem", opacity: .4 }}>paid separately to creators</div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
        <div className={hasAccepted ? "ce-locked-section" : "ce-section"}>
          {sectionTitle("platforms & deliverables", hasAccepted)}
          {hasAccepted && <div style={{ fontSize: ".78rem", color: "rgba(255,200,60,.6)", marginBottom: 14 }}>these fields are read-only — creators applied based on these terms</div>}
          <div className={hasAccepted ? "ce-plat-locked" : ""} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {PLATFORM_LIST.map(p => {
              const isOn = (c.platforms || []).includes(p);
              return (
                <div key={p}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: isOn ? 8 : 0, cursor: hasAccepted ? "default" : "pointer" }} onClick={() => !hasAccepted && setC(prev => ({ ...prev, platforms: isOn ? prev.platforms.filter(x => x !== p) : [...(prev.platforms || []), p] }))}>
                    <div style={{ width: 20, height: 20, borderRadius: 6, border: "1px solid " + (isOn ? "rgba(255,255,255,.4)" : "rgba(255,255,255,.15)"), background: isOn ? "rgba(255,255,255,.12)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {isOn && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                    </div>
                    <span style={{ fontSize: ".9rem", opacity: isOn ? .9 : .4 }}>{p}</span>
                  </div>
                  {isOn && <input className="ce-input" disabled={hasAccepted} style={{ marginLeft: 30 }} placeholder={"deliverables for " + p} value={c.deliverables?.[p] || ""} onChange={e => !hasAccepted && setC(prev => ({ ...prev, deliverables: { ...prev.deliverables, [p]: e.target.value } }))} />}
                </div>
              );
            })}
          </div>
        </div>
        <div className="ce-section">
          {sectionTitle("products")}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
            {(c.products || []).map((p, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <input className="ce-input" placeholder="product name" value={p.name} onChange={e => updateProduct(i, "name", e.target.value)} style={{ flex: 2 }} />
                <input className="ce-input" placeholder="variant / size" value={p.variant} onChange={e => updateProduct(i, "variant", e.target.value)} style={{ flex: 1 }} />
                <div onClick={() => removeProduct(i)} style={{ cursor: "pointer", opacity: .3, fontSize: "1.1rem", padding: "0 6px", flexShrink: 0 }}><XIcon size={14} /></div>
              </div>
            ))}
          </div>
          <div onClick={addProduct} className="ce-action-btn" style={{ fontSize: ".82rem", opacity: .5, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,.1)" }}>+ add product</div>
        </div>
        <div className={c.featured ? "ce-featured-section" : "ce-featured-section-off"}>
          {sectionTitle("featured placement")}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div className={c.featured ? "ce-feat-name" : ""} style={{ fontSize: "1rem", fontWeight: 700 }}>feature this campaign</div>
            <div onClick={() => setField("featured", !c.featured)} style={{ width: 44, height: 24, borderRadius: 12, background: c.featured ? "rgba(160,80,255,.4)" : "rgba(255,255,255,.08)", border: `1px solid ${c.featured ? "rgba(185,110,255,.6)" : "rgba(255,255,255,.2)"}`, cursor: "pointer", position: "relative", transition: "all .2s", flexShrink: 0 }}>
              <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, left: c.featured ? 22 : 3, transition: "left .2s" }} />
            </div>
          </div>
          {/* Benefits — always visible */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: c.featured ? 16 : 0 }}>
            {[
              { icon: "✦", text: "pinned to the top of browse & landing page" },
              { icon: "✦", text: "gold shimmer brand name — stands out instantly" },
              { icon: "✦", text: "featured visibility in the campaign directory" },
              { icon: "✦", text: "featured campaigns get additional visibility" },
            ].map((b, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <span style={{ color: "#fbbf24", fontSize: ".9rem", marginTop: 1, flexShrink: 0 }}>{b.icon}</span>
                <span style={{ fontSize: ".9rem", opacity: .75, lineHeight: 1.5 }}>{b.text}</span>
              </div>
            ))}
          </div>
          {c.featured && (
            <>
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                {[{w:1,price:"$2.99"},{w:7,price:"$14.99"},{w:30,price:"$49.99"}].map(({w,price}) => (
                  <div key={w} className={"ce-feat-pill" + (c.featuredWeeks === w ? " selected" : "")} onClick={() => setField("featuredWeeks", w)}>
                    <span className="ce-feat-name" style={{ fontWeight: 600 }}>{w} {w === 1 ? "day" : "days"}</span>
                    <span style={{ color: "#fff", opacity: .9 }}>{price}</span>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: ".75rem", opacity: .35, paddingTop: 10, borderTop: "1px solid rgba(160,80,255,.15)", textAlign: "center" }}>you'll be prompted to pay when you save</div>
            </>
          )}
        </div>
        <button className="ce-save-btn" disabled={saveBusy} onClick={handleSave}>save changes</button>
      </div>

      {/* Payment modal */}
      {showPayModal && (
        <div role="dialog" aria-modal="true" tabIndex={-1} ref={el => { if (el && !el.__f) { el.__f = true; el.focus(); } }} onKeyDown={e => { if (e.key === 'Escape') { if (!payLoading) setShowPayModal(false); } }} onClick={() => { if (!payLoading) setShowPayModal(false); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.8)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "12px" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#0a1322", border: "1px solid rgba(160,80,255,.25)", borderRadius: 24, padding: 24, maxWidth: 440, width: "100%", boxShadow: "0 40px 80px rgba(0,0,0,.6)", animation: "ce-feat-pulse 2.5s ease-in-out infinite" }}>
            <div style={{ fontSize: "1.2rem", fontWeight: 700, fontFamily: "'Monda', system-ui, sans-serif", marginBottom: 6 }}>review charges</div>
            <div style={{ fontSize: ".88rem", opacity: .4, marginBottom: 24, lineHeight: 1.6 }}>the following will be charged when you confirm</div>

            <div style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 14, overflow: "hidden", marginBottom: 20 }}>
              {escrowChanged && (
                <div style={{ padding: "14px 20px", borderBottom: c.featured && escrowChanged ? "1px solid rgba(255,255,255,.06)" : "none" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                    <div>
                      <div style={{ fontSize: ".9rem", fontWeight: 600 }}>creator compensation budget</div>
                      <div style={{ fontSize: ".75rem", opacity: .4, marginTop: 2 }}>{capCount} creators × ${perCreator.toLocaleString()}{oldEscrow > 0 ? ` (${oldEscrow > 0 ? `+$${escrowDelta.toLocaleString()} top-up` : ""})` : ""}</div>
                    </div>
                    <div style={{ fontSize: "1.3rem", fontWeight: 700, fontFamily: "'Monda', system-ui, sans-serif", color: "rgba(180,255,80,.9)" }}>${escrowDelta.toLocaleString()}</div>
                  </div>
                  <div style={{ fontSize: ".72rem", opacity: .3, marginTop: 6 }}>Creator compensation is paid separately by the brand.</div>
                </div>
              )}
              {c.featured && (
                <div style={{ padding: "14px 20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                    <div>
                      <div style={{ fontSize: ".9rem", fontWeight: 600 }}>featured placement</div>
                      <div style={{ fontSize: ".75rem", opacity: .4, marginTop: 2 }}>{featuredWeeks} {featuredWeeks === 1 ? "day" : "days"} · gold shimmer + priority</div>
                    </div>
                    <div style={{ fontSize: "1.3rem", fontWeight: 700, fontFamily: "'Monda', system-ui, sans-serif", color: "rgba(185,110,255,.9)" }}>${((quote?.breakdown?.featured ?? 0) / 100).toFixed(2)}</div>
                  </div>
                  <div style={{ fontSize: ".72rem", opacity: .3, marginTop: 6 }}>charged immediately · non-refundable</div>
                </div>
              )}
              <div style={{ padding: "14px 20px", background: "rgba(255,255,255,.03)", borderTop: "1px solid rgba(255,255,255,.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: ".85rem", opacity: .5 }}>total due now</span>
                <div style={{ textAlign: "right" }}>
                  {quote && quote.discount_pct > 0 && <div style={{ fontSize: ".75rem", opacity: .4, textDecoration: "line-through", marginBottom: 2 }}>${(quote.subtotal_cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>}
                  <span style={{ fontSize: "1.6rem", fontWeight: 700, fontFamily: "'Monda', system-ui, sans-serif", color: "#fff" }}>{quoteLoading || !quote ? "…" : `$${(quote.amount_cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</span>
                </div>
              </div>
            </div>

            {/* Promo code */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={promoCode}
                  onChange={e => setPromoCode(e.target.value)}
                  placeholder="promo code"
                  style={{ flex: 1, background: "rgba(255,255,255,.05)", border: `1px solid ${quote && quote.discount_pct > 0 ? "rgba(100,255,150,.4)" : quoteError ? "rgba(255,100,100,.4)" : "rgba(255,255,255,.12)"}`, borderRadius: 10, padding: "10px 14px", color: "#fff", fontSize: ".88rem", outline: "none", fontFamily: "system-ui, sans-serif" }}
                />
                <button onClick={() => fetchQuote(promoCode)} style={{ padding: "10px 16px", borderRadius: 10, border: "1px solid rgba(255,255,255,.2)", background: "rgba(255,255,255,.06)", color: "#fff", fontSize: ".82rem", cursor: "pointer", fontFamily: "system-ui, sans-serif", whiteSpace: "nowrap" }}>apply</button>
              </div>
              {quote && quote.discount_pct > 0 && <div style={{ fontSize: ".75rem", color: "rgba(100,255,150,.9)", marginTop: 6 }}>✓ {promoCode.toUpperCase()} applied — {Math.round(quote.discount_pct * 100)}% off fees</div>}
              {quote&&!quote.checkout_available&&<p role="status" style={{margin:'12px 0',color:'#ffd89c'}}>Online checkout is temporarily unavailable. <a href="/contact.html" style={{color:'inherit'}}>Contact nfluence</a> to discuss your campaign.</p>}
              {quoteError && <div style={{ fontSize: ".75rem", color: "rgba(255,100,100,.8)", marginTop: 6 }}>{quoteError}</div>}
            </div>

            {!isFree && <div ref={cardDivRef} style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 12, padding: "13px 14px", marginBottom: 12 }} />}
            {payError && <div style={{ fontSize: ".8rem", color: "rgba(255,100,100,.9)", marginBottom: 10 }}>{payError}</div>}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => { setShowPayModal(false); setPayError(""); }} disabled={payLoading} style={{ flex: 1, padding: "13px", borderRadius: 12, border: "1px solid rgba(255,255,255,.12)", background: "transparent", color: "rgba(255,255,255,.5)", cursor: payLoading ? "not-allowed" : "pointer", fontSize: ".9rem", fontFamily: "system-ui, sans-serif" }}>cancel</button>
              <button disabled={payLoading || quoteLoading || !quote || !quote.checkout_available} onClick={async () => {
                if (!isFree && !cardRef.current) return;
                setPayLoading(true); setPayError("");
                let res;
                try {
                  res = await callStripePaymentV2({ action: 'charge', type: 'campaign_edit', campaignId: c.id, features: buildEditFeatures(), promoCode: (promoCode || '').trim() }, session?.access_token);
                  if (!res.free) await confirmStripeCard(res.client_secret, cardRef.current);
                  res.confirmed=true;
                  await onSave(c);
                  setShowPayModal(false);
                } catch (err) {
                  setPayError(err.message || "Payment failed");
                  if (res && res.payment_intent_id && !res.confirmed) { try { await callStripePaymentV2({ action: 'cancel', paymentIntentId: res.payment_intent_id }, session?.access_token); } catch (_) {} }
                } finally { setPayLoading(false); }
              }} style={{ flex: 2, padding: "13px", borderRadius: 12, border: "1px solid rgba(185,110,255,.4)", background: payLoading ? "rgba(160,80,255,.08)" : "rgba(160,80,255,.15)", color: "rgba(210,160,255,.95)", cursor: payLoading ? "not-allowed" : "pointer", fontSize: ".95rem", fontWeight: 700, fontFamily: "system-ui, sans-serif", textTransform: "lowercase", opacity: payLoading ? .6 : 1, transition: "opacity .15s" }}>
                {payLoading ? "processing..." : isFree ? "confirm & save" : `pay ${quote ? "$" + (quote.amount_cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ""} & save`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── CampaignBuilder ──



// ── CampaignBuilder ──

function CampaignBuilder({ onBack, onPublish, session }) {
  const [step, setStep] = useState(0);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState("");
  const [pendingCampaignData, setPendingCampaignData] = useState(null);
  const cardRef = useRef(null);
  const cardDivRef = useRef(null);
  const spotsInputRef = useRef(null);
  const [promoCode, setPromoCode] = useState("");
  const [quote, setQuote] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const quoteRequestRef = useRef(0);
  const [quoteError, setQuoteError] = useState("");
  const isFree = !!quote && quote.amount_cents === 0;
  const fetchQuote = async (code = promoCode) => {
    if (!pendingCampaignData) return;
    const request = ++quoteRequestRef.current;
    setQuoteLoading(true); setQuoteError("");
    try {
      const q = await callStripePaymentV2({ action: 'quote', type: 'campaign_new', features: pendingCampaignData, promoCode: (code || '').trim() }, session?.access_token);
      if(request === quoteRequestRef.current) setQuote(q);
    } catch (e) { if(request === quoteRequestRef.current){setQuote(null); setQuoteError(e.message || 'could not load price');} }
    finally { if(request === quoteRequestRef.current) setQuoteLoading(false); }
  };
  const needCard = showPayModal && !!quote && quote.amount_cents > 0;
  // Layer 1 orphan cleanup: sweep this user's stale draft campaigns (+ pending payments/promos) on mount.
  
  useEffect(() => {
    if (!showPayModal) { ++quoteRequestRef.current; setQuoteLoading(false); setQuote(null); setQuoteError(""); setPayError(""); setPromoCode(""); return; }
    fetchQuote();
  }, [showPayModal, pendingCampaignData]);
  useEffect(() => {
    if (!needCard) { cardRef.current?.destroy(); cardRef.current = null; return; }
    const stripe = getStripe();
    if (!stripe) return;
    const t = setTimeout(() => {
      if (!cardDivRef.current || cardRef.current) return;
      const card = stripe.elements().create('card', {
        style: { base: { color: '#fff', fontFamily: 'system-ui, sans-serif', fontSize: '15px', '::placeholder': { color: 'rgba(255,255,255,.35)' } } },
      });
      card.mount(cardDivRef.current);
      cardRef.current = card;
    }, 0);
    return () => { clearTimeout(t); cardRef.current?.destroy(); cardRef.current = null; };
  }, [needCard]);
  const [brand, setBrand] = useState({
    name: "", tagline: "", bio: "", manager: "", phone: "", email: "", website: "", phoneCode: "+1",
    city: "", state: "", country: "",
    vibes: [], logoPreview: null, logoTransform: null, logoEditing: false,
    socialPills: { Instagram: false, TikTok: false, YouTube: false, X: false, Facebook: false, Website: false },
    socials: { Instagram: "", TikTok: "", YouTube: "", X: "", Facebook: "", Website: "" },
  });
  const [campaign, setCampaign] = useState({
    name: "", summary: "", spotsTotal: null, spotsTotalCustom: "", customMode: false,
    products: [{ name: "", variant: "" }],
    industries: [], industryOther: "",
    productPhotos: [], styleGuide: null, bannerPreview: null, bannerTransform: null, bannerEditing: false,
  });
  const [platforms, setPlatforms] = useState({
    selected: { Instagram: false, TikTok: false, YouTube: false, X: false, Facebook: false },
    following: {},
    deliverables: {},
  });
  const [terms, setTerms] = useState({
    compType: "", compAmount: "", deadlineMode: "date", deadlineDate: "",
    deadlineAmount: "", deadlineUnit: "days", country: "", usState: "",
    stateSpecific: false, contiguousUS: false, ageMin: "", language: "",
    niches: "", publicRequired: false, approvalRequired: false, perApplicantApproval: false,
    featured: false, featuredWeeks: 7,
  });
  const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  const selectedSocials = SOCIAL_OPTIONS.filter(k => brand.socialPills[k]);
  const socialsComplete = selectedSocials.every(k => brand.socials[k]?.trim());
  const selectedPlatformKeys = PLATFORM_LIST.filter(p => platforms.selected[p]);
  const hasDeliverable = selectedPlatformKeys.some(p => platforms.deliverables[p]?.trim());

  const canProceed = useMemo(() => {
    if (step === 0) return brand.name.trim() && brand.bio.trim() && brand.manager.trim() && isValidEmail(brand.email) && socialsComplete;
    if (step === 1) return campaign.name.trim() && campaign.summary.trim() && campaign.spotsTotal !== null;
    if (step === 2) return selectedPlatformKeys.length > 0 && hasDeliverable;
    if (step === 3) {
      const isPaid = terms.compType === "paid" || terms.compType === "product+paid";
      const needsCap = isPaid && (campaign.spotsTotal === null || campaign.spotsTotal === 0);
      const hasDeadline = terms.deadlineMode === "date" ? !!terms.deadlineDate : !!(terms.deadlineAmount && parseInt(terms.deadlineAmount) > 0);
      const hasAmount = !isPaid || (parseFloat((terms.compAmount || "").replace(/[^0-9.]/g, "")) > 0);
      return terms.compType && terms.country && !needsCap && hasDeadline && hasAmount;
    }
    return true;
  }, [step, brand, campaign, platforms, terms, socialsComplete, selectedPlatformKeys, hasDeliverable]);

  const next = () => { if (step < 4) setStep(step + 1); };
  const back = () => { if (step > 0) setStep(step - 1); };

  const containerRef = useRef(null);
  useEffect(() => {
    containerRef.current?.scrollTo?.({ top: 0, behavior: "smooth" });
    window.scrollTo?.({ top: 0, behavior: "smooth" });
  }, [step]);





  const regionDisplay = typeof Intl !== "undefined" ? new Intl.DisplayNames(["en"], { type: "region" }) : null;
  const countries = useMemo(() => REGION_CODES.map(code => ({
    code, name: regionDisplay?.of(code) ?? code,
  })), []);

  return (
    <div ref={containerRef} style={{ minHeight: "100vh", overflowX: "hidden", background: "radial-gradient(circle at calc(46% + 250px) calc(58% - 175px), rgba(255,255,255,.103) 0%, rgba(255,255,255,.0309) 38%, transparent 52%), linear-gradient(180deg, #040b15 0%, #070f1f 100%)", backgroundColor: "#040b15", color: "#fff", fontFamily: "system-ui, sans-serif" }}>
      <style>{`
        @font-face {
          font-family: 'Monda';
          src: url('/assets/Monda-Regular.woff') format('woff');
          font-weight: 400 700;
          font-style: normal;
          font-display: swap;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }

        .nf-header {
          width: 100%; height: 64px; display: flex; align-items: center;
          justify-content: space-between; padding: 0 32px;
          text-shadow: 0 1px 3px rgba(0,0,0,.35);
          font-family: 'Monda', system-ui, sans-serif;
        }
        .nf-nav-brand { font-family: 'Monda', system-ui, sans-serif; font-weight: 600; letter-spacing: -.01em; font-size: 1.1rem; color: #fff; }
        .nf-nav-links { display: flex; gap: 18px; font-size: .9rem; opacity: .85; }
        .nf-nav-links a { color: #fff; text-decoration: none; }

        .nf-wrap { max-width: 470px; width: 100%; margin: 0 auto; padding: 0 16px; }

        .nf-section-title {
          text-align: center; font-family: 'Monda', system-ui, sans-serif;
          font-size: 1.5rem; margin-bottom: 15px; color: #fff;
        }

        .nf-step-row {
          display: flex; justify-content: center; gap: 8px;
          padding: 24px 16px 8px; max-width: 470px; margin: 0 auto;
        }
        .nf-step-pip {
          flex: 1; height: 3px; border-radius: 3px;
          background: rgba(255,255,255,.08); transition: background 0.3s;
        }
        .nf-step-pip.active { background: rgba(255,255,255,.55); }
        .nf-step-pip.done { background: rgba(255,255,255,.25); }

        .nf-step-labels {
          display: flex; justify-content: space-between;
          max-width: 470px; margin: 0 auto; padding: 8px 16px 0;
          font-size: .7rem; text-transform: lowercase; letter-spacing: .03em;
          color: rgba(255,255,255,.3);
        }
        .nf-step-labels span { flex: 1; text-align: center; transition: color 0.3s; }
        .nf-step-labels span.active { color: rgba(255,255,255,.85); }
        .nf-step-labels span.done { color: rgba(255,255,255,.45); }

        .nf-field-row { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 15px; }
        .nf-field { flex: 1 1 0; min-width: 140px; display: flex; flex-direction: column; gap: 4px; }
        .nf-field-full { width: 100%; margin-bottom: 15px; }

        .nf-input {
          border-radius: 12px; border: 1px solid rgba(255,255,255,.18);
          background: rgba(0,0,0,.35); color: #fff; padding: 8px 10px;
          font-size: .85rem; width: 100%; outline: none;
          font-family: system-ui, sans-serif;
          transition: border-color .12s, box-shadow .12s, background .12s;
        }
        .nf-input::placeholder { color: rgba(255,255,255,.45); }
        .nf-input:focus {
          border-color: #fff;
          box-shadow: 0 0 0 1px rgba(255,255,255,.2);
          background: rgba(0,0,0,.5);
        }

        .nf-textarea {
          border-radius: 12px; border: 1px solid rgba(255,255,255,.18);
          background: rgba(0,0,0,.35); color: #fff; padding: 8px 10px;
          font-size: .85rem; width: 100%; outline: none; resize: vertical;
          min-height: 90px; font-family: system-ui, sans-serif;
          transition: border-color .12s, box-shadow .12s, background .12s;
        }
        .nf-textarea::placeholder { color: rgba(255,255,255,.45); }
        .nf-textarea:focus {
          border-color: #fff;
          box-shadow: 0 0 0 1px rgba(255,255,255,.2);
          background: rgba(0,0,0,.5);
        }

        .nf-select {
          border-radius: 12px; border: 1px solid rgba(255,255,255,.18);
          background: rgba(0,0,0,.35); color: #fff; padding: 8px 10px;
          font-size: .85rem; width: 100%; outline: none; appearance: none;
          font-family: system-ui, sans-serif; cursor: pointer;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' fill='rgba(255,255,255,0.4)' viewBox='0 0 16 16'%3E%3Cpath d='M1.5 5.5l6.5 6 6.5-6'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 10px center;
          transition: border-color .12s, box-shadow .12s, background .12s;
        }
        .nf-select:focus {
          border-color: #fff;
          box-shadow: 0 0 0 1px rgba(255,255,255,.2);
          background-color: rgba(0,0,0,.5);
        }
        .nf-select option { background: #0a1020; color: #fff; }

        .nf-pill {
          text-align: center; text-transform: lowercase;
          font-family: system-ui, sans-serif;
          display: inline-flex; align-items: center; justify-content: center;
          padding: 8px 14px; border-radius: 14px; font-size: .99rem;
          border: 1px solid rgba(255,255,255,.18); background: transparent;
          color: #fff; cursor: pointer; backdrop-filter: blur(16px);
          transition: background .12s, border .12s, transform .12s, box-shadow .12s;
          user-select: none;
        }
        .nf-pill:hover {
          background: rgba(255,255,255,.04); border-color: rgba(255,255,255,.35);
          transform: translateY(-2px); box-shadow: 0 6px 18px rgba(0,0,0,.28);
        }
        .nf-pill.selected {
          background: rgba(255,255,255,.10); border-color: rgba(255,255,255,.55);
          box-shadow: 0 0 12px rgba(255,255,255,.18);
        }

        .nf-btn {
          display: inline-flex; align-items: center; justify-content: center;
          min-width: 160px; padding: 12px 24px; border-radius: 16px;
          font-family: system-ui, sans-serif; text-transform: lowercase;
          font-size: .99rem; background: transparent;
          border: 1px solid rgba(255,255,255,.28); backdrop-filter: blur(20px);
          color: #fff; cursor: pointer;
          transition: transform .12s, border .12s, box-shadow .12s, background .12s;
          box-shadow: 0 10px 28px rgba(0,0,0,.25);
        }
        .nf-btn:hover {
          transform: translateY(-2px); border-color: rgba(255,255,255,.45);
          background: rgba(255,255,255,.03);
        }
        .nf-btn:disabled { opacity: .25; cursor: not-allowed; transform: none; }

        .nf-btn-back {
          display: inline-flex; align-items: center; justify-content: center;
          padding: 12px 24px; border-radius: 16px;
          font-family: system-ui, sans-serif; text-transform: lowercase;
          font-size: .99rem; background: transparent;
          border: 1px solid rgba(255,255,255,.12); color: rgba(255,255,255,.5);
          cursor: pointer; transition: all .12s;
        }
        .nf-btn-back:hover { border-color: rgba(255,255,255,.28); color: #fff; }

        .nf-actions {
          display: flex; align-items: center; justify-content: space-between;
          max-width: 470px; margin: 0 auto; padding: 30px 16px 60px;
        }

        .nf-platform-expand {
          animation: nf-slide 0.2s ease;
          margin-bottom: 12px; padding-left: 8px;
        }
        @keyframes nf-slide {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .nf-upload {
          border: 1px dashed rgba(255,255,255,.18); border-radius: 12px;
          padding: 20px; text-align: center; cursor: pointer;
          transition: all .12s; background: rgba(0,0,0,.2);
        }
        .nf-upload:hover { border-color: rgba(255,255,255,.35); background: rgba(0,0,0,.35); }

        .nf-toggle {
          display: flex; align-items: center; gap: 10px;
          cursor: pointer; user-select: none; padding: 5px 0;
          font-size: .85rem; color: #fff;
        }
        .nf-toggle-track {
          width: 36px; height: 20px; border-radius: 10px;
          border: 1px solid rgba(255,255,255,.18);
          background: rgba(0,0,0,.35); position: relative;
          transition: all .2s; flex-shrink: 0;
        }
        .nf-toggle-track.on {
          background: rgba(255,255,255,.10);
          border-color: rgba(255,255,255,.55);
          box-shadow: 0 0 12px rgba(255,255,255,.18);
        }
        .nf-toggle-knob {
          width: 14px; height: 14px; border-radius: 50%;
          background: #fff; position: absolute;
          top: 2px; left: 2px; transition: transform .2s;
        }
        .nf-toggle-track.on .nf-toggle-knob { transform: translateX(16px); }

        .nf-chip {
          display: inline-flex; align-items: center; justify-content: center;
          padding: 8px 14px; border-radius: 14px;
          border: 1px solid rgba(255,255,255,.18); background: transparent;
          font-size: .8rem; color: rgba(255,255,255,.6); cursor: pointer;
          transition: all .12s; text-transform: lowercase; user-select: none;
          font-family: system-ui, sans-serif;
        }
        .nf-chip:hover { border-color: rgba(255,255,255,.35); color: rgba(255,255,255,.85); }
        .nf-chip.selected {
          background: rgba(255,255,255,.10); border-color: rgba(255,255,255,.55);
          box-shadow: 0 0 12px rgba(255,255,255,.18); color: #fff;
        }

        .nf-campaign-card {
          background: radial-gradient(circle at top, rgba(255,255,255,.045), rgba(4,11,21,0));
          border: 1px solid rgba(255,255,255,.12);
          border-radius: 20px;
          overflow: hidden;
          backdrop-filter: blur(20px);
          box-shadow: 0 20px 55px rgba(0,0,0,.35);
          cursor: pointer;
          display: flex;
          flex-direction: column;
          transition: transform .25s, box-shadow .25s, border-color .25s;
        }
        .nf-campaign-card:hover {
          transform: translateY(-4px) scale(1.01);
          box-shadow: 0 28px 65px rgba(0,0,0,.5);
          border-color: rgba(255,255,255,.25);
        }

        .nf-cta-btn {
          transition: transform .12s, border-color .2s, box-shadow .2s, background .2s;
        }
        .nf-cta-btn:hover {
          transform: translateY(-2px);
          border-color: rgba(255,255,255,.55) !important;
          box-shadow: 0 0 18px rgba(255,255,255,.12) !important;
          background: rgba(255,255,255,.12) !important;
        }

        .nf-apply-btn {
          transition: transform .12s, border-color .2s, box-shadow .2s, background .2s;
          cursor: pointer;
        }
        .nf-apply-btn:hover {
          border-color: rgba(255,255,255,.55) !important;
          box-shadow: 0 0 14px rgba(255,255,255,.15) !important;
          background: rgba(255,255,255,.08) !important;
          transform: translateY(-1px);
        }

        .nf-chip-grid {
          display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px;
        }
        .nf-chip-grid .nf-chip { width: 100%; }
        @media (max-width: 600px) {
          .nf-chip-grid { grid-template-columns: 1fr 1fr; }
        }

        .nf-hint { font-size: .75rem; opacity: .45; margin-top: -2px; text-align: center; }
        .nf-section-title + .nf-hint { margin-top: -10px; margin-bottom: 12px; }
        .nf-label { font-size: .8rem; opacity: .6; margin-bottom: 6px; text-transform: lowercase; letter-spacing: .02em; }

        .nf-line {
          width: 100%; height: 1px;
          background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,.15) 50%, rgba(255,255,255,0) 100%);
          opacity: .6; margin: 24px 0;
        }

        .nf-preview-card {
          background: radial-gradient(circle at top, rgba(255,255,255,.045), rgba(4,11,21,0));
          border: 1px solid rgba(255,255,255,.12); border-radius: 20px;
          backdrop-filter: blur(20px); box-shadow: 0 20px 55px rgba(0,0,0,.35);
          overflow: hidden; padding: 20px;
        }
        .nf-preview-header {
          display: flex; align-items: center; gap: 14px; margin-bottom: 16px;
        }
        .nf-preview-logo {
          width: 52px; height: 52px; border-radius: 50%;
          background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.12);
          display: flex; align-items: center; justify-content: center;
          font-size: .7rem; color: rgba(255,255,255,.4); text-transform: lowercase;
          flex-shrink: 0; overflow: hidden;
        }
        .nf-preview-brand-name {
          font-size: 1.1rem; font-weight: 600; color: #fff;
        }
        .nf-preview-campaign-name {
          font-size: .85rem; opacity: .5; margin-top: 2px;
        }
        .nf-preview-platforms {
          display: flex; gap: 6px; margin-bottom: 14px;
        }
        .nf-preview-plat-icon {
          width: 30px; height: 30px; border-radius: 8px;
          background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.1);
          display: flex; align-items: center; justify-content: center;
          font-size: .7rem; color: rgba(255,255,255,.6);
        }
        .nf-preview-details {
          margin-bottom: 14px;
        }
        .nf-preview-detail-row {
          display: flex; gap: 8px; padding: 3px 0; font-size: .85rem;
        }
        .nf-preview-detail-label { opacity: .4; min-width: 100px; }
        .nf-preview-detail-value { opacity: .85; }
        .nf-preview-footer {
          display: flex; align-items: flex-end; justify-content: space-between;
          padding-top: 14px; border-top: 1px solid rgba(255,255,255,.06);
        }
        .nf-preview-comp-label { font-size: .85rem; font-weight: 600; color: #fff; }
        .nf-preview-comp-detail { font-size: .75rem; opacity: .45; margin-top: 2px; }
        .nf-preview-comp-amount { font-size: 1.1rem; font-weight: 700; color: #fff; margin-top: 2px; }
        .nf-preview-apply-btn {
          padding: 8px 20px; border-radius: 10px;
          border: 1px solid rgba(255,255,255,.28);
          font-size: .85rem; color: #fff; cursor: default;
          backdrop-filter: blur(16px);
        }
        .nf-preview-note { text-align: center; padding: 16px 0 0; font-size: .75rem; opacity: .3; }

        .nf-deadline-toggle {
          display: inline-flex; border-radius: 14px; overflow: hidden;
          border: 1px solid rgba(255,255,255,.18);
        }
        .nf-deadline-opt {
          padding: 8px 18px; font-size: .85rem; border: none;
          background: transparent; color: rgba(255,255,255,.45);
          cursor: pointer; font-family: system-ui, sans-serif;
          text-transform: lowercase; transition: all .12s;
        }
        .nf-deadline-opt.active {
          background: rgba(255,255,255,.10); color: #fff;
        }

        @media (max-width: 600px) {
          .nf-header { padding: 0 18px; }
          .nf-field-row { flex-direction: column; }
          .nf-field { min-width: 100%; }
          .nf-input, .nf-textarea, .nf-select { font-size: 16px; }
        }
      `}</style>

      <div className="nf-header">
        <div className="nf-nav-brand" style={{ cursor: "pointer" }} role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }} onClick={onBack}>nfluence</div>
        <div className="nf-nav-links">
          <a href="#" onClick={e => { e.preventDefault(); onBack(); }}>campaigns</a>
        </div>
      </div>

      <div className="nf-step-row">
        {STEPS.map((_, i) => (
          <div key={i} className={`nf-step-pip ${i === step ? "active" : i < step ? "done" : ""}`} />
        ))}
      </div>
      <div className="nf-step-labels">
        {STEPS.map((l, i) => (
          <span key={l} className={i === step ? "active" : i < step ? "done" : ""}>{l}</span>
        ))}
      </div>

      {step === 0 && (
        <div style={{ display: "flex", justifyContent: "center", marginTop: 30 }}>
          <div className="nf-wrap">
            <div className="nf-section-title">about your brand</div>

            <div className="nf-field-full">
              <input className="nf-input" value={brand.name} onChange={e => setBrand(p => ({...p, name: e.target.value}))} placeholder="brand name *" maxLength={60} />
            </div>

            <div className="nf-field-full">
              <input className="nf-input" value={brand.tagline} onChange={e => setBrand(p => ({...p, tagline: e.target.value}))} placeholder="tagline" maxLength={120} />
            </div>

            <div className="nf-field-full">
              <textarea className="nf-textarea" value={brand.bio} onChange={e => setBrand(p => ({...p, bio: e.target.value}))} placeholder="describe your brand — vision, what you do, and why people should get behind it *" />
            </div>

            <label className="nf-upload" style={{ marginBottom: 15, display: "block", cursor: brand.logoEditing ? "default" : "pointer" }}>
              {!brand.logoEditing && (
                <input type="file" accept="image/png,image/svg+xml,image/jpeg" style={{ display: "none" }}
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (ev) => setBrand(p => ({...p, logoPreview: ev.target.result, logoEditing: true, logoTransform: null}));
                      reader.readAsDataURL(file);
                    }
                  }} />
              )}
              {brand.logoEditing && brand.logoPreview ? (
                <ImageEditor src={brand.logoPreview} shape="circle"
                  onSave={(t) => setBrand(p => ({...p, logoTransform: t, logoEditing: false}))}
                  onCancel={() => setBrand(p => ({...p, logoPreview: null, logoEditing: false, logoTransform: null}))} />
              ) : brand.logoPreview ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 80, height: 80, borderRadius: "50%", overflow: "hidden", border: "1px solid rgba(255,255,255,.15)", position: "relative" }}>
                    <img src={brand.logoPreview} alt="logo preview" style={{
                      position: "absolute", left: "50%", top: "50%",
                      transform: `translate(calc(-50% + ${brand.logoTransform?.pos?.x || 0}px), calc(-50% + ${brand.logoTransform?.pos?.y || 0}px)) scale(${brand.logoTransform?.scale || 1})`,
                      minWidth: "100%", minHeight: "100%", objectFit: "cover",
                    }} />
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <div style={{ fontSize: ".7rem", opacity: .4 }}>click to change</div>
                    <div style={{ fontSize: ".7rem", opacity: .6, cursor: "pointer", textDecoration: "underline" }}
                      onClick={(e) => { e.preventDefault(); setBrand(p => ({...p, logoEditing: true})); }}>
                      adjust
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: ".85rem", opacity: .6 }}>click to upload brand logo</div>
                  <div style={{ fontSize: ".7rem", opacity: .35, marginTop: 4 }}>recommended: 512×512px · png or svg · max 5mb</div>
                </div>
              )}
            </label>

            <div className="nf-line" />
            <div className="nf-section-title">contact</div>

            <div className="nf-field-full">
              <input className="nf-input" value={brand.manager} onChange={e => setBrand(p => ({...p, manager: e.target.value}))} placeholder="campaign manager *" />
            </div>
            <div className="nf-field-full">
              <input className="nf-input" type="email" value={brand.email} onChange={e => setBrand(p => ({...p, email: e.target.value}))} placeholder="email *"
                style={brand.email && !isValidEmail(brand.email) ? { borderColor: "rgba(255,100,100,.3)" } : {}} />
              {brand.email && !isValidEmail(brand.email) && (
                <div style={{ fontSize: ".7rem", color: "rgba(255,100,100,.6)", marginTop: 4 }}>enter a valid email address</div>
              )}
            </div>
            <div className="nf-field-full">
              <input className="nf-input" value={brand.website} onChange={e => setBrand(p => ({...p, website: e.target.value}))} placeholder="website" />
            </div>
            <div className="nf-field-row">
              <div className="nf-field" style={{ maxWidth: 80 }}>
                <select className="nf-select" value={brand.phoneCode} onChange={e => setBrand(p => ({...p, phoneCode: e.target.value}))}>
                  {["+1","+44","+61","+52","+55","+49","+33","+34","+39","+81","+82","+91"].map(c =>
                    <option key={c} value={c}>{c}</option>
                  )}
                </select>
              </div>
              <div className="nf-field">
                <input className="nf-input" value={brand.phone} onChange={e => setBrand(p => ({...p, phone: e.target.value}))} placeholder="phone number" />
              </div>
            </div>

            <div className="nf-field-full">
              <select className="nf-select" value={brand.country} onChange={e => setBrand(p => ({...p, country: e.target.value, state: ""}))}>
                <option value="">country</option>
                {REGION_CODES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {brand.country === "US" && (
              <div className="nf-field-row">
                <div className="nf-field">
                  <input className="nf-input" value={brand.city} onChange={e => setBrand(p => ({...p, city: e.target.value}))} placeholder="city" />
                </div>
                <div className="nf-field">
                  <select className="nf-select" value={brand.state} onChange={e => setBrand(p => ({...p, state: e.target.value}))}>
                    <option value="">state</option>
                    {US_STATES.map(s => <option key={s} value={s}>{s.toLowerCase()}</option>)}
                  </select>
                </div>
              </div>
            )}

            <div className="nf-line" />
            <div className="nf-section-title">social links</div>
            <div className="nf-hint">(select those that apply)</div>

            <div className="nf-chip-grid" style={{ marginBottom: 14 }}>
              {SOCIAL_OPTIONS.map(key => (
                <div key={key}
                  className={`nf-chip ${brand.socialPills[key] ? "selected" : ""}`}
                  onClick={() => setBrand(p => ({
                    ...p,
                    socialPills: { ...p.socialPills, [key]: !p.socialPills[key] },
                    socials: !p.socialPills[key] ? p.socials : { ...p.socials, [key]: "" },
                  }))}>
                  {key.toLowerCase()}
                </div>
              ))}
            </div>

            {SOCIAL_OPTIONS.filter(key => brand.socialPills[key]).map(key => (
              <div key={key} className="nf-field-full" style={{ marginBottom: 10, animation: "nf-slide 0.2s ease" }}>
                <input className="nf-input" value={brand.socials[key]}
                  onChange={e => setBrand(p => ({...p, socials: {...p.socials, [key]: e.target.value}}))}
                  placeholder={`${key.toLowerCase()} url *`}
                  style={brand.socials[key]?.trim() ? {} : { borderColor: "rgba(255,100,100,.3)" }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {step === 1 && (
        <div style={{ display: "flex", justifyContent: "center", marginTop: 30 }}>
          <div className="nf-wrap">
            <div className="nf-section-title">about your campaign</div>
            <div className="nf-field-full">
              <input className="nf-input" value={campaign.name} onChange={e => setCampaign(p => ({...p, name: e.target.value}))} placeholder="campaign name *" maxLength={60} />
            </div>
            <div className="nf-field-full">
              <textarea className="nf-textarea" value={campaign.summary} onChange={e => setCampaign(p => ({...p, summary: e.target.value}))} placeholder="describe the campaign — concept, talking points, hashtags, do's and don'ts *" />
            </div>
            <div className="nf-line" />
            <div className="nf-section-title">how many creators do you want?</div>
            <div className="nf-hint">set a cap or leave it open</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
              {[5, 10, 15, 20, 25, 50, "any", "custom"].map(opt => {
                const isAny = opt === "any";
                const isCustom = opt === "custom";
                const isPaidComp = terms.compType === "paid" || terms.compType === "product+paid";
                const isDisabled = isAny && isPaidComp;
                const isActive = isAny
                  ? (!campaign.customMode && campaign.spotsTotal === 0)
                  : isCustom
                  ? campaign.customMode
                  : (!campaign.customMode && campaign.spotsTotal === opt);
                return (
                  <button key={opt} onClick={() => {
                    if (isDisabled) return;
                    if (isAny) setCampaign(p => ({...p, customMode: false, spotsTotal: 0, spotsTotalCustom: ""}));
                    else if (isCustom) {
                      setCampaign(p => ({...p, customMode: true, spotsTotal: p.spotsTotalCustom ? (parseInt(p.spotsTotalCustom) || null) : null}));
                      setTimeout(() => spotsInputRef.current?.focus(), 0);
                    }
                    else setCampaign(p => ({...p, customMode: false, spotsTotal: opt, spotsTotalCustom: ""}));
                  }} style={{
                    padding: "8px 16px", borderRadius: 20, cursor: isDisabled ? "not-allowed" : "pointer",
                    border: `1px solid ${isActive ? "rgba(255,255,255,.5)" : "rgba(255,255,255,.12)"}`,
                    background: isActive ? "rgba(255,255,255,.12)" : "rgba(255,255,255,.04)",
                    color: "#fff", fontSize: ".85rem", fontFamily: "system-ui, sans-serif",
                    opacity: isDisabled ? 0.2 : isActive ? 1 : 0.65, transition: "all .15s",
                    pointerEvents: isDisabled ? "none" : "auto",
                  }}>{opt}</button>
                );
              })}
            </div>
            {(terms.compType === "paid" || terms.compType === "product+paid") && (
              <div style={{ marginBottom: 12, display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 14px", borderRadius: 10, background: "rgba(255,140,30,.08)", border: "1px solid rgba(255,140,30,.25)" }}>
                <span style={{ color: "rgba(255,165,50,.9)", fontSize: ".95rem", flexShrink: 0, marginTop: 1 }}>⚠</span>
                <span style={{ fontSize: ".8rem", color: "rgba(255,165,50,.8)", lineHeight: 1.5 }}>paid campaigns require a creator cap — use this to plan the creator budget</span>
              </div>
            )}
            {/* Custom number input — shown when custom mode is active */}
            {campaign.customMode && (
              <div className="nf-field-full" style={{ marginBottom: 4 }}>
                <input ref={spotsInputRef} className="nf-input" type="number" min="1" value={campaign.spotsTotalCustom}
                  onChange={e => {
                    const val = e.target.value;
                    setCampaign(p => ({...p, spotsTotalCustom: val, spotsTotal: parseInt(val) || null}));
                  }}
                  placeholder="enter number of creators"
                />
              </div>
            )}
            <div className="nf-line" />
            <div className="nf-section-title">campaign banner</div>
            <div className="nf-hint">this is the hero image at the top of your campaign card</div>
            <label className="nf-upload" style={{ marginBottom: 15, display: "block", cursor: campaign.bannerEditing ? "default" : "pointer" }}>
              {!campaign.bannerEditing && (
                <input type="file" accept="image/png,image/jpeg" style={{ display: "none" }}
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (ev) => setCampaign(p => ({...p, bannerPreview: ev.target.result, bannerEditing: true, bannerTransform: null}));
                      reader.readAsDataURL(file);
                    }
                  }} />
              )}
              {campaign.bannerEditing && campaign.bannerPreview ? (
                <ImageEditor src={campaign.bannerPreview} shape="banner"
                  onSave={(t) => setCampaign(p => ({...p, bannerTransform: t, bannerEditing: false}))}
                  onCancel={() => setCampaign(p => ({...p, bannerPreview: null, bannerEditing: false, bannerTransform: null}))} />
              ) : campaign.bannerPreview ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  <div style={{ width: "100%", height: 120, borderRadius: 10, overflow: "hidden", position: "relative", border: "1px solid rgba(255,255,255,.15)" }}>
                    <img src={campaign.bannerPreview} alt="banner preview" style={{
                      position: "absolute", left: "50%", top: "50%",
                      transform: `translate(calc(-50% + ${campaign.bannerTransform?.pos?.x || 0}px), calc(-50% + ${campaign.bannerTransform?.pos?.y || 0}px)) scale(${campaign.bannerTransform?.scale || 1})`,
                      minWidth: "100%", minHeight: "100%", objectFit: "cover",
                    }} />
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <div style={{ fontSize: ".7rem", opacity: .4 }}>click to change</div>
                    <div style={{ fontSize: ".7rem", opacity: .6, cursor: "pointer", textDecoration: "underline" }}
                      onClick={(e) => { e.preventDefault(); setCampaign(p => ({...p, bannerEditing: true})); }}>
                      adjust
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: ".85rem", opacity: .6 }}>click to upload campaign banner</div>
                  <div style={{ fontSize: ".7rem", opacity: .35, marginTop: 4 }}>recommended: 1200×400px · jpg or png · max 5mb</div>
                </div>
              )}
            </label>
            <div className="nf-line" />
            <div className="nf-section-title">product</div>
            {campaign.products.map((prod, idx) => (
              <div key={idx} style={{ marginBottom: 12 }}>
                {idx > 0 && <div style={{ fontSize: ".7rem", opacity: .3, marginBottom: 6 }}>product {idx + 1}</div>}
                <div className="nf-field-full" style={{ marginBottom: 8 }}>
                  <input className="nf-input" value={prod.name}
                    onChange={e => setCampaign(p => {
                      const prods = [...p.products];
                      prods[idx] = { ...prods[idx], name: e.target.value };
                      return { ...p, products: prods };
                    })}
                    placeholder="product name" />
                </div>
                <div className="nf-field-row" style={{ marginBottom: 0 }}>
                  <div className="nf-field">
                    <input className="nf-input" value={prod.variant}
                      onChange={e => setCampaign(p => {
                        const prods = [...p.products];
                        prods[idx] = { ...prods[idx], variant: e.target.value };
                        return { ...p, products: prods };
                      })}
                      placeholder="variant / flavor / size" />
                  </div>
                  {campaign.products.length > 1 && (
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <div style={{ fontSize: ".75rem", opacity: .4, cursor: "pointer", padding: "8px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,.1)" }}
                        onClick={() => setCampaign(p => ({ ...p, products: p.products.filter((_, i) => i !== idx) }))}>
                        remove
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div style={{ marginBottom: 15 }}>
              <div style={{ fontSize: ".85rem", opacity: .5, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}
                onClick={() => setCampaign(p => ({ ...p, products: [...p.products, { name: "", variant: "" }] }))}>
                + add product / variant
              </div>
            </div>
            <label className="nf-upload" style={{ marginBottom: 15, display: "block", cursor: "pointer" }}>
              <input type="file" accept="image/png,image/jpeg" multiple style={{ display: "none" }}
                onChange={e => {
                  const files = Array.from(e.target.files || []);
                  files.forEach(file => {
                    const reader = new FileReader();
                    reader.onload = (ev) => setCampaign(p => ({...p, productPhotos: [...p.productPhotos, ev.target.result]}));
                    reader.readAsDataURL(file);
                  });
                }} />
              {campaign.productPhotos.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
                    {campaign.productPhotos.map((src, i) => (
                      <img key={i} src={src} alt={`product ${i+1}`} style={{ width: 52, height: 52, borderRadius: 8, objectFit: "cover" }} />
                    ))}
                  </div>
                  <div style={{ fontSize: ".7rem", opacity: .4 }}>{campaign.productPhotos.length} photo{campaign.productPhotos.length > 1 ? "s" : ""} · click to add more</div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: ".85rem", opacity: .6 }}>click to upload product photos</div>
                  <div style={{ fontSize: ".7rem", opacity: .35, marginTop: 4 }}>jpg or png · multiple files accepted</div>
                </div>
              )}
            </label>
            <div className="nf-line" />
            <div className="nf-section-title">industry</div>
            <div className="nf-hint">(select all that apply)</div>
            <div className="nf-chip-grid">
              {INDUSTRIES.map(ind => (
                <div key={ind}
                  className={`nf-chip ${campaign.industries.includes(ind) ? "selected" : ""}`}
                  onClick={() => setCampaign(p => ({
                    ...p,
                    industries: p.industries.includes(ind) ? p.industries.filter(i => i !== ind) : [...p.industries, ind],
                  }))}>
                  {ind}
                </div>
              ))}
              <div
                className={`nf-chip ${campaign.industries.includes("other") ? "selected" : ""}`}
                onClick={() => setCampaign(p => ({
                  ...p,
                  industries: p.industries.includes("other") ? p.industries.filter(i => i !== "other") : [...p.industries, "other"],
                  industryOther: p.industries.includes("other") ? "" : p.industryOther,
                }))}>
                other
              </div>
            </div>
            {campaign.industries.includes("other") && (
              <div className="nf-field-full" style={{ marginTop: 12, animation: "nf-slide 0.2s ease" }}>
                <input className="nf-input" value={campaign.industryOther}
                  onChange={e => setCampaign(p => ({...p, industryOther: e.target.value}))}
                  placeholder="specify industry" />
              </div>
            )}
            <div className="nf-line" />
            <label className="nf-upload" style={{ display: "block", cursor: "pointer" }}>
              <input type="file" accept="application/pdf" style={{ display: "none" }}
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) setCampaign(p => ({...p, styleGuide: file.name}));
                }} />
              {campaign.styleGuide ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div style={{ fontSize: ".85rem", opacity: .7 }}>{campaign.styleGuide}</div>
                  <div style={{ fontSize: ".7rem", opacity: .4 }}>click to change</div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: ".85rem", opacity: .6 }}>upload creator style guide</div>
                  <div style={{ fontSize: ".7rem", opacity: .35, marginTop: 4 }}>pdf only · max 10mb</div>
                </div>
              )}
            </label>
          </div>
        </div>
      )}

      {step === 2 && (
        <div style={{ display: "flex", justifyContent: "center", marginTop: 30 }}>
          <div className="nf-wrap">
            <div className="nf-section-title">platforms & deliverables</div>
            <div className="nf-hint">(select platforms and fill in at least one deliverable)</div>
            {PLATFORM_LIST.map(p => (
              <div key={p}>
                <div
                  className={`nf-pill ${platforms.selected[p] ? "selected" : ""}`}
                  style={{ width: "100%", marginBottom: platforms.selected[p] ? 8 : 10 }}
                  onClick={() => setPlatforms(prev => ({
                    ...prev, selected: { ...prev.selected, [p]: !prev.selected[p] },
                  }))}>
                  {p.toLowerCase()}
                </div>
                {platforms.selected[p] && (
                  <div className="nf-platform-expand">
                    <div className="nf-field-row" style={{ marginBottom: 12 }}>
                      <div className="nf-field" style={{ maxWidth: 120 }}>
                        <div className="nf-label"># of creators</div>
                        <input className="nf-input" type="number" min="1"
                          value={platforms.creatorCount?.[p] || ""}
                          onChange={e => setPlatforms(prev => ({
                            ...prev, creatorCount: { ...(prev.creatorCount || {}), [p]: e.target.value },
                          }))}
                          placeholder="e.g., 10" />
                      </div>
                      <div className="nf-field" style={{ maxWidth: 140 }}>
                        <div className="nf-label">min. following</div>
                        <select className="nf-select"
                          value={platforms.following[p] || ""}
                          onChange={e => setPlatforms(prev => ({
                            ...prev, following: { ...prev.following, [p]: e.target.value },
                          }))}>
                          <option value="">any</option>
                          {FOLLOWER_TIERS.map(t => <option key={t} value={t}>{t.toLowerCase()}</option>)}
                        </select>
                      </div>
                      <div className="nf-field">
                        <div className="nf-label">deliverables *</div>
                        <input className="nf-input"
                          value={platforms.deliverables[p] || ""}
                          onChange={e => setPlatforms(prev => ({
                            ...prev, deliverables: { ...prev.deliverables, [p]: e.target.value },
                          }))}
                          placeholder={`e.g., ${PLATFORM_EXAMPLES[p]}`}
                          style={platforms.selected[p] && !platforms.deliverables[p]?.trim() ? { borderColor: "rgba(255,100,100,.3)" } : {}} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {step === 3 && (
        <div style={{ display: "flex", justifyContent: "center", marginTop: 30 }}>
          <div className="nf-wrap">
            <div className="nf-section-title">terms & requirements</div>
            <div className="nf-label">compensation *</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 15 }}>
              {COMP_OPTIONS.map(opt => (
                <div key={opt.value}
                  className={`nf-pill ${terms.compType === opt.value ? "selected" : ""}`}
                  style={{ width: "100%" }}
                  onClick={() => {
                    const isPaid = opt.value === "paid" || opt.value === "product+paid";
                    setTerms(p => ({...p, compType: opt.value}));
                    if (isPaid && campaign.spotsTotal === 0) {
                      setCampaign(p => ({...p, spotsTotal: null, spotsTotalCustom: ""}));
                    }
                  }}>
                  {opt.label}
                </div>
              ))}
            {(terms.compType === "paid" || terms.compType === "product+paid") && campaign.spotsTotal === null && (
              <div style={{ marginTop: 10, display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", borderRadius: 10, background: "rgba(255,140,30,.08)", border: "1px solid rgba(255,140,30,.35)" }}>
                <span style={{ color: "rgba(255,165,50,.9)", fontSize: "1rem", flexShrink: 0 }}>⚠</span>
                <div>
                  <div style={{ fontSize: ".82rem", color: "rgba(255,165,50,.9)", fontWeight: 600, marginBottom: 3 }}>creator cap required</div>
                  <div style={{ fontSize: ".78rem", color: "rgba(255,165,50,.7)", lineHeight: 1.5 }}>paid campaigns need a cap — go back to step 2 and set a number to plan your creator budget</div>
                </div>
              </div>
            )}
            </div>
            {(terms.compType === "paid" || terms.compType === "product+paid") && (
              <div className="nf-field-full">
                <input className="nf-input" value={terms.compAmount}
                  onChange={e => setTerms(p => ({...p, compAmount: e.target.value}))}
                  placeholder="$ amount per creator" />
              </div>
            )}
            {(terms.compType === "product" || terms.compType === "product+paid") && (
              <div className="nf-field-full">
                <input className="nf-input" value={terms.compProduct || ""}
                  onChange={e => setTerms(p => ({...p, compProduct: e.target.value}))}
                  placeholder="what product(s) will creators receive?" />
              </div>
            )}
            <div className="nf-line" />
            <div className="nf-label">deadline *</div>
            <div className="nf-deadline-toggle" style={{ marginBottom: 12 }}>
              <button className={`nf-deadline-opt ${terms.deadlineMode === "date" ? "active" : ""}`}
                onClick={() => setTerms(p => ({...p, deadlineMode: "date"}))}>exact date</button>
              <button className={`nf-deadline-opt ${terms.deadlineMode === "duration" ? "active" : ""}`}
                onClick={() => setTerms(p => ({...p, deadlineMode: "duration"}))}>duration</button>
            </div>
            {terms.deadlineMode === "date" ? (
              <div className="nf-field-full">
                <input type="date" className="nf-input" style={{ colorScheme: "dark" }}
                  value={terms.deadlineDate}
                  onChange={e => setTerms(p => ({...p, deadlineDate: e.target.value}))} />
              </div>
            ) : (
              <div className="nf-field-row">
                <div className="nf-field" style={{ maxWidth: 100 }}>
                  <input className="nf-input" type="number" min={1} value={terms.deadlineAmount}
                    onChange={e => setTerms(p => ({...p, deadlineAmount: e.target.value}))}
                    placeholder="30" />
                </div>
                <div className="nf-field" style={{ maxWidth: 130 }}>
                  <select className="nf-select" value={terms.deadlineUnit}
                    onChange={e => setTerms(p => ({...p, deadlineUnit: e.target.value}))}>
                    <option value="days">days</option>
                    <option value="weeks">weeks</option>
                    <option value="months">months</option>
                  </select>
                </div>
              </div>
            )}
            <div className="nf-hint" style={{ marginBottom: 8 }}>one deadline per campaign</div>
            <div className="nf-line" />
            <div className="nf-label">location *</div>
            <div className="nf-field-full">
              <select className="nf-select" value={terms.country}
                onChange={e => {
                  setTerms(p => ({...p, country: e.target.value, stateSpecific: false, usState: "", contiguousUS: false}));
                }}>
                <option value="">select country</option>
                {countries.map(c => <option key={c.code} value={c.code}>{c.name?.toLowerCase()}</option>)}
              </select>
            </div>
            {terms.country === "US" && (
              <div style={{ marginBottom: 15 }}>
                <Toggle label="continental u.s. only" checked={terms.contiguousUS}
                  onChange={v => setTerms(p => ({...p, contiguousUS: v}))} />
                <Toggle label="state specific" checked={terms.stateSpecific}
                  onChange={v => setTerms(p => ({...p, stateSpecific: v}))} />
                {terms.stateSpecific && (
                  <div style={{ marginTop: 8 }}>
                    <select className="nf-select" value={terms.usState}
                      onChange={e => setTerms(p => ({...p, usState: e.target.value}))}>
                      <option value="">select state</option>
                      {US_STATES.map(s => <option key={s} value={s}>{s.toLowerCase()}</option>)}
                    </select>
                  </div>
                )}
              </div>
            )}
            <div className="nf-line" />
            <div className="nf-section-title">creator requirements</div>
            <div className="nf-field-row">
              <div className="nf-field">
                <div className="nf-label">min. age</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
                  {["any", "18+", "21+"].map(opt => (
                    <div key={opt} onClick={() => setTerms(p => ({...p, ageMin: opt === "any" ? "" : opt}))}
                      style={{
                        padding: "6px 16px", borderRadius: 20, cursor: "pointer", fontSize: ".82rem", fontWeight: 600,
                        transition: "all .12s",
                        background: (terms.ageMin === (opt === "any" ? "" : opt)) ? "rgba(255,255,255,.15)" : "rgba(255,255,255,.04)",
                        border: `1px solid ${(terms.ageMin === (opt === "any" ? "" : opt)) ? "rgba(255,255,255,.45)" : "rgba(255,255,255,.12)"}`,
                        color: (terms.ageMin === (opt === "any" ? "" : opt)) ? "#fff" : "rgba(255,255,255,.45)",
                      }}>
                      {opt}
                    </div>
                  ))}
                </div>
              </div>
              <div className="nf-field">
                <div className="nf-label">language</div>
                <select className="nf-select" value={terms.language}
                  onChange={e => setTerms(p => ({...p, language: e.target.value}))}>
                  <option value="">any</option>
                  {LANGUAGES.map(l => <option key={l} value={l}>{l.toLowerCase()}</option>)}
                </select>
              </div>
            </div>
            <div className="nf-field-full">
              <div className="nf-label">niche</div>
              <input className="nf-input" value={terms.niches}
                onChange={e => setTerms(p => ({...p, niches: e.target.value}))}
                placeholder="e.g., fitness, lifestyle, outdoors" />
            </div>
            <div style={{ marginTop: 8 }}>
              <Toggle label="public account required" checked={terms.publicRequired}
                onChange={v => setTerms(p => ({...p, publicRequired: v}))} />
              <Toggle label="brand approval required before posting" checked={terms.approvalRequired}
                onChange={v => setTerms(p => ({...p, approvalRequired: v}))} />
              <Toggle label="approve each creator individually" checked={terms.perApplicantApproval}
                onChange={v => setTerms(p => ({...p, perApplicantApproval: v}))} />
            </div>

            <div className="nf-line" />

            {/* Featured campaign upsell */}
            <div
              onClick={() => setTerms(p => ({ ...p, featured: !p.featured }))}
              style={{
                borderRadius: 16, cursor: "pointer",
                background: terms.featured
                  ? "linear-gradient(135deg, rgba(255,210,80,.08) 0%, rgba(255,170,40,.04) 100%)"
                  : "rgba(255,255,255,.02)",
                border: `1px solid ${terms.featured ? "rgba(255,200,60,.3)" : "rgba(255,255,255,.1)"}`,
                padding: "20px 22px",
                transition: "all .2s",
                marginBottom: 4,
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                {/* Toggle circle */}
                <div style={{
                  width: 22, height: 22, borderRadius: "50%", flexShrink: 0, marginTop: 2,
                  background: terms.featured ? "rgba(255,200,60,.9)" : "rgba(255,255,255,.1)",
                  border: `2px solid ${terms.featured ? "rgba(255,200,60,.9)" : "rgba(255,255,255,.2)"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all .2s",
                }}>
                  {terms.featured && (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: ".95rem", fontWeight: 700, fontFamily: "'Monda', system-ui, sans-serif" }}>feature my campaign</span>
                    <span style={{
                      fontSize: ".65rem", fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                      background: "rgba(255,200,60,.15)", border: "1px solid rgba(255,200,60,.3)",
                      color: "rgba(255,200,60,.9)", textTransform: "uppercase", letterSpacing: ".06em",
                    }}>boost</span>
                  </div>
                  <div style={{ fontSize: ".8rem", opacity: .5, lineHeight: 1.5, marginBottom: terms.featured ? 16 : 0 }}>
                    <div style={{ marginBottom: 8 }}>get top placement and maximum visibility for your campaign:</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                      {[
                        "pinned to the top of the browse page above all other campaigns",
                        "shimmering gold brand name so creators notice you instantly",
                        "seen first by thousands of active creators browsing for deals",
                        "\"featured\" label in search results and campaign listings",
                        "priority indexing — your campaign is always fresh and visible",
                      ].map((item, i) => (
                        <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                          <span style={{ color: "rgba(255,200,60,.6)", flexShrink: 0, marginTop: 1 }}>✦</span>
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Week selector — only shown when opted in */}
                  {terms.featured && (
                    <div onClick={e => e.stopPropagation()} style={{ marginTop: 4 }}>
                      <div style={{ fontSize: ".75rem", opacity: .45, marginBottom: 10, textTransform: "lowercase" }}>how long?</div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {[{w:1,price:"$2.99"},{w:7,price:"$14.99"},{w:30,price:"$49.99"}].map(({w,price}) => (
                          <div
                            key={w}
                            onClick={() => setTerms(p => ({ ...p, featuredWeeks: w }))}
                            style={{
                              padding: "8px 16px", borderRadius: 10, cursor: "pointer",
                              background: terms.featuredWeeks === w ? "rgba(255,200,60,.15)" : "rgba(255,255,255,.04)",
                              border: `1px solid ${terms.featuredWeeks === w ? "rgba(255,200,60,.4)" : "rgba(255,255,255,.1)"}`,
                              transition: "all .15s",
                            }}
                          >
                            <div style={{ fontSize: ".85rem", fontWeight: 700, color: terms.featuredWeeks === w ? "rgba(255,200,60,.95)" : "rgba(255,255,255,.7)" }}>
                              {w} days
                            </div>
                            <div style={{ fontSize: ".7rem", opacity: .5, marginTop: 2 }}>
                              {price}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div style={{
                        marginTop: 14, padding: "12px 16px", borderRadius: 12,
                        background: "rgba(255,200,60,.06)", border: "1px solid rgba(255,200,60,.15)",
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                      }}>
                        <span style={{ fontSize: ".82rem", opacity: .55 }}>
                          {terms.featuredWeeks} days featured placement
                        </span>
                        <span style={{ fontSize: "1.1rem", fontWeight: 700, fontFamily: "'Monda', system-ui, sans-serif", color: "rgba(255,200,60,.9)" }}>
                          ${terms.featuredWeeks === 1 ? "2.99" : terms.featuredWeeks === 7 ? "14.99" : "49.99"}
                        </span>
                      </div>
                      <div style={{ fontSize: ".7rem", opacity: .3, marginTop: 8 }}>
                        billed at publish · cancel anytime
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 4 && (
        <div style={{ display: "flex", justifyContent: "center", marginTop: 30 }}>
          <div className="nf-wrap">
            <div className="nf-section-title">preview</div>
            <div className="nf-hint">this is how creators will see your listing</div>
            <Preview brand={brand} campaign={campaign} platforms={platforms} terms={terms} />
          </div>
        </div>
      )}

      <div className="nf-actions">
        {step > 0 ? (
          <button className="nf-btn-back" onClick={back}>back</button>
        ) : <div />}
        {step < 4 ? (
          <button className="nf-btn" disabled={!canProceed} onClick={next}>next</button>
        ) : (
          <button className="nf-btn" onClick={() => {
            const campaignData = {
              brand: brand.name, campaign: campaign.name, description: campaign.summary,
              logoPreview: brand.logoPreview, bannerPreview: campaign.bannerPreview,
              platforms: PLATFORM_LIST.filter(p => platforms.selected[p]),
              following: Object.values(platforms.following).filter(Boolean)[0] || "any",
              deliverables: Object.fromEntries(PLATFORM_LIST.filter(p => platforms.selected[p] && platforms.deliverables[p]?.trim()).map(p => [p, platforms.deliverables[p]])),
              deadline: terms.deadlineMode === "date" ? terms.deadlineDate : `${terms.deadlineAmount} ${terms.deadlineUnit}`,
              comp: terms.compType === "paid" || terms.compType === "product+paid" ? `$${terms.compAmount || "TBD"}` : terms.compType === "product" ? "free product" : "other",
              compType: terms.compType,
              spotsTotal: campaign.spotsTotal === 0 ? null : campaign.spotsTotal,
              location: terms.country ? (typeof Intl !== "undefined" ? new Intl.DisplayNames(["en"], { type: "region" }).of(terms.country) : terms.country) : "Worldwide",
              products: campaign.products.filter(p => p.name.trim()),
              requirements: [terms.ageMin && `Must be ${terms.ageMin}`, terms.language && `Language: ${terms.language}`, terms.niches && `Niche: ${terms.niches}`, terms.publicRequired && "Public account required"].filter(Boolean).join(". "),
              featured: terms.featured,
              featuredWeeks: terms.featured ? terms.featuredWeeks : 0,
              socialLinks: brand.socials,
            };
            setPendingCampaignData(campaignData);
            setShowPayModal(true);
          }}>publish</button>
        )}
      </div>
      {showPayModal && pendingCampaignData && (() => {
        const escrowC = quote?.breakdown?.escrow ?? 0;
        const featuredC = quote?.breakdown?.featured ?? 0;
        return (
          <div role="dialog" aria-modal="true" tabIndex={-1} ref={el => { if (el && !el.__f) { el.__f = true; el.focus(); } }} onKeyDown={e => { if (e.key === 'Escape') { if (!payLoading) setShowPayModal(false); } }} onClick={() => { if (!payLoading) setShowPayModal(false); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.8)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "12px" }}>
            <div onClick={e => e.stopPropagation()} style={{ background: "#0a1322", border: "1px solid rgba(160,80,255,.25)", borderRadius: 24, padding: 24, maxWidth: 440, width: "100%", boxShadow: "0 40px 80px rgba(0,0,0,.6)" }}>
              <div style={{ fontSize: "1.2rem", fontWeight: 700, fontFamily: "'Monda', system-ui, sans-serif", marginBottom: 6 }}>review charges</div>
              <div style={{ fontSize: ".88rem", opacity: .4, marginBottom: 24, lineHeight: 1.6 }}>{isFree ? "no charge — publish when ready" : "the following will be charged when you confirm"}</div>
              <div style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 14, overflow: "hidden", marginBottom: 20 }}>
                <div style={{padding:'14px 20px'}}><div style={{display:'flex',justifyContent:'space-between'}}><span>Campaign platform fee</span><strong>{quote?.annual_included?'Included in annual access':quote?'$'+((quote.breakdown?.campaign||0)/100).toFixed(2):'…'}</strong></div><p style={{fontSize:'.78rem',opacity:.6,marginTop:8}}>Creator compensation is separate and paid directly by the brand.</p></div>
                {escrowC > 0 && (
                  <div style={{ padding: "14px 20px", borderBottom: featuredC > 0 ? "1px solid rgba(255,255,255,.06)" : "none" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                      <div>
                        <div style={{ fontSize: ".9rem", fontWeight: 600 }}>creator compensation budget</div>
                        <div style={{ fontSize: ".75rem", opacity: .4, marginTop: 2 }}>{pendingCampaignData.spotsTotal} creators × ${parseFloat((pendingCampaignData.comp || "").replace(/[^0-9.]/g, "")).toLocaleString()}</div>
                      </div>
                      <div style={{ fontSize: "1.3rem", fontWeight: 700, fontFamily: "'Monda', system-ui, sans-serif", color: "rgba(180,255,80,.9)" }}>${(escrowC / 100).toLocaleString()}</div>
                    </div>
                    <div style={{ fontSize: ".72rem", opacity: .3, marginTop: 6 }}>Creator compensation is paid separately by the brand.</div>
                  </div>
                )}
                {featuredC > 0 && (
                  <div style={{ padding: "14px 20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                      <div>
                        <div style={{ fontSize: ".9rem", fontWeight: 600 }}>featured placement</div>
                        <div style={{ fontSize: ".75rem", opacity: .4, marginTop: 2 }}>{pendingCampaignData.featuredWeeks || 7} {(pendingCampaignData.featuredWeeks || 7) === 1 ? "day" : "days"} · gold shimmer + priority</div>
                      </div>
                      <div style={{ fontSize: "1.3rem", fontWeight: 700, fontFamily: "'Monda', system-ui, sans-serif", color: "rgba(185,110,255,.9)" }}>${(featuredC / 100).toFixed(2)}</div>
                    </div>
                    <div style={{ fontSize: ".72rem", opacity: .3, marginTop: 6 }}>charged immediately · non-refundable</div>
                  </div>
                )}
                <div style={{ padding: "14px 20px", background: "rgba(255,255,255,.03)", borderTop: "1px solid rgba(255,255,255,.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: ".85rem", opacity: .5 }}>total due now</span>
                  <div style={{ textAlign: "right" }}>
                    {quote && quote.discount_pct > 0 && <div style={{ fontSize: ".75rem", opacity: .4, textDecoration: "line-through", marginBottom: 2 }}>${(quote.subtotal_cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>}
                    <span style={{ fontSize: "1.6rem", fontWeight: 700, fontFamily: "'Monda', system-ui, sans-serif", color: "#fff" }}>{quoteLoading || !quote ? "…" : `$${(quote.amount_cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</span>
                  </div>
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <input value={promoCode} disabled={payLoading} onChange={e => {setPromoCode(e.target.value);++quoteRequestRef.current;setQuote(null);setQuoteError("");setQuoteLoading(false);}} aria-label="promo code" placeholder="promo code"
                    style={{ flex: 1, minWidth: 0, background: "rgba(255,255,255,.05)", border: `1px solid ${quote && quote.discount_pct > 0 ? "rgba(100,255,150,.4)" : quoteError ? "rgba(255,100,100,.4)" : "rgba(255,255,255,.12)"}`, borderRadius: 10, padding: "10px 14px", color: "#fff", fontSize: ".88rem", outline: "none", fontFamily: "system-ui, sans-serif" }} />
                  <button disabled={payLoading || quoteLoading} onClick={() => fetchQuote(promoCode)} style={{ padding: "10px 16px", borderRadius: 10, border: "1px solid rgba(255,255,255,.2)", background: "rgba(255,255,255,.06)", color: "#fff", fontSize: ".82rem", cursor: "pointer", fontFamily: "system-ui, sans-serif", whiteSpace: "nowrap" }}>apply</button>
                </div>
                {quote?.free_campaign && <p role="status" style={{fontSize:".82rem",color:"rgba(150,255,185,.95)",lineHeight:1.5,marginTop:10}}>Free campaign applied — the $299 campaign fee is covered. No card needed. Creator compensation is separate.</p>}
                {quote&&!quote.checkout_available&&<p role="status" style={{margin:'12px 0',color:'#ffd89c'}}>Card checkout is temporarily unavailable. Have a free-campaign code? Enter it above to publish without a card. <a href="/contact.html" style={{color:'inherit'}}>Contact nfluence</a> for help.</p>}
              {quoteError && <div style={{ fontSize: ".75rem", color: "rgba(255,100,100,.8)", marginTop: 6 }}>{quoteError}</div>}
              </div>
              {needCard && quote?.checkout_available && <div ref={cardDivRef} style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 12, padding: "13px 14px", marginBottom: 12 }} />}
              {payError && <div style={{ fontSize: ".8rem", color: "rgba(255,100,100,.9)", marginBottom: 10 }}>{payError}</div>}
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => { setShowPayModal(false); setPayError(""); }} disabled={payLoading} style={{ flex: 1, padding: "13px", borderRadius: 12, border: "1px solid rgba(255,255,255,.12)", background: "transparent", color: "rgba(255,255,255,.5)", cursor: payLoading ? "not-allowed" : "pointer", fontSize: ".9rem", fontFamily: "system-ui, sans-serif" }}>cancel</button>
                <button disabled={payLoading || quoteLoading || !quote || !quote.checkout_available} onClick={async () => {
                  if (!isFree && !cardRef.current) return;
                  setPayLoading(true); setPayError("");
                  let res;
                  try {
                    res = await callStripePaymentV2({ action: 'charge', type: 'campaign_new', features: pendingCampaignData, promoCode: (promoCode || '').trim() }, session?.access_token);
                    if (!res.free) await confirmStripeCard(res.client_secret, cardRef.current);
                  res.confirmed=true;
                    if (onPublish) await onPublish(pendingCampaignData, {}, { campaignId: res.campaignId, free: !!res.free });
                    setShowPayModal(false);
                  } catch (err) {
                    setPayError(err.message || "Payment failed");
                    if (res && res.payment_intent_id && !res.confirmed) { try { await callStripePaymentV2({ action: 'cancel', campaignId: res.campaignId, paymentIntentId: res.payment_intent_id }, session?.access_token); } catch (_) {} }
                  } finally { setPayLoading(false); }
                }} style={{ flex: 2, padding: "13px", borderRadius: 12, border: "1px solid rgba(185,110,255,.4)", background: payLoading ? "rgba(160,80,255,.08)" : "rgba(160,80,255,.15)", color: "rgba(210,160,255,.95)", cursor: payLoading ? "not-allowed" : "pointer", fontSize: ".95rem", fontWeight: 700, fontFamily: "system-ui, sans-serif", textTransform: "lowercase", opacity: payLoading ? .6 : 1, transition: "opacity .15s" }}>
                  {payLoading ? "processing..." : isFree ? "confirm & publish" : `pay ${quote ? "$" + (quote.amount_cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ""} & publish`}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <div className="nf-toggle" onClick={() => onChange(!checked)}>
      <div className={`nf-toggle-track ${checked ? "on" : ""}`}>
        <div className="nf-toggle-knob" />
      </div>
      <span>{label}</span>
    </div>
  );
}

function Preview({ brand, campaign, platforms, terms }) {
  const selectedPlatforms = PLATFORM_LIST.filter(p => platforms.selected[p]);

  // Combine ALL platform deliverables
  const allDeliverables = selectedPlatforms
    .filter(p => platforms.deliverables[p]?.trim())
    .map(p => platforms.deliverables[p].trim())
    .join(", ");

  // Highest following requirement across platforms
  const allFollowing = selectedPlatforms
    .map(p => platforms.following[p])
    .filter(Boolean);
  const followingLabel = allFollowing.length > 0 ? allFollowing[0] : "any";

  // Format deadline as MM/DD/YY
  const formatDeadline = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso + "T00:00:00");
    if (isNaN(d)) return iso;
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const yy = String(d.getFullYear()).slice(-2);
    return `${mm}/${dd}/${yy}`;
  };

  const deadlineLabel = terms.deadlineMode === "date"
    ? formatDeadline(terms.deadlineDate)
    : (terms.deadlineAmount ? `${terms.deadlineAmount} ${terms.deadlineUnit}` : "—");

  // Compensation — on card: show type + cash amount only, hide product details
  const hasCash = (terms.compType === "paid" || terms.compType === "product+paid") && terms.compAmount;

  const PLAT_SVGS = {
    Instagram: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="1.5" fill="#fff" stroke="none"/></svg>,
    TikTok: <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V9.05a8.27 8.27 0 004.76 1.5V7.1a4.83 4.83 0 01-1-.41z"/></svg>,
    YouTube: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="4"/><polygon points="10,8 16,12 10,16" fill="#fff" stroke="none"/></svg>,
    X: <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>,
    Facebook: <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
  };

  return (
    <div className="nf-preview-card">
      {/* Header: logo + brand + campaign name */}
      <div className="nf-preview-header">
        <div className="nf-preview-logo">
          {brand.logoPreview
            ? <img src={brand.logoPreview} alt="logo" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
            : "logo"
          }
        </div>
        <div>
          <div className="nf-preview-brand-name">{brand.name || "your brand"}</div>
          <div className="nf-preview-campaign-name">{campaign.name || "campaign name"}</div>
        </div>
      </div>

      {/* Platform icons */}
      {selectedPlatforms.length > 0 && (
        <div className="nf-preview-platforms">
          {selectedPlatforms.map(p => (
            <div key={p} className="nf-preview-plat-icon">{PLAT_SVGS[p]}</div>
          ))}
        </div>
      )}

      {/* Key details */}
      <div className="nf-preview-details">
        <div className="nf-preview-detail-row">
          <div className="nf-preview-detail-label">following:</div>
          <div className="nf-preview-detail-value">{followingLabel}</div>
        </div>
        <div className="nf-preview-detail-row">
          <div className="nf-preview-detail-label">posts:</div>
          <div className="nf-preview-detail-value">{allDeliverables || "—"}</div>
        </div>
        <div className="nf-preview-detail-row">
          <div className="nf-preview-detail-label">deadline:</div>
          <div className="nf-preview-detail-value">{deadlineLabel}</div>
        </div>
      </div>

      {/* Footer: compensation + apply */}
      <div className="nf-preview-footer">
        <div>
          <div className="nf-preview-comp-label">creators get</div>
          {terms.compType === "product" && (
            <div className="nf-preview-comp-detail">free product</div>
          )}
          {terms.compType === "paid" && (
            <div className="nf-preview-comp-amount">{hasCash ? `$${terms.compAmount}` : "paid"}</div>
          )}
          {terms.compType === "product+paid" && (
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <div className="nf-preview-comp-amount">{hasCash ? `$${terms.compAmount}` : "paid"}</div>
              <div className="nf-preview-comp-detail">+ product</div>
            </div>
          )}
          {!terms.compType && (
            <div className="nf-preview-comp-detail">—</div>
          )}
        </div>
        <div className="nf-preview-apply-btn">apply</div>
      </div>

      <div className="nf-preview-note">this is how your campaign card will appear to creators</div>
    </div>
  );
}



// ── SignIn ──



// ── GigListingBuilder ──

function GigListingBuilder({ onBack, onPublish, session }) {
  const [step, setStep] = useState(0);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState("");
  const [pendingGigData, setPendingGigData] = useState(null);
  const cardRef = useRef(null);
  const cardDivRef = useRef(null);
  const [promoCode, setPromoCode] = useState("");
  const [quote, setQuote] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState("");
  const isFree = !!quote && quote.amount_cents === 0;
  const fetchQuote = async (code = promoCode) => {
    setQuoteLoading(true); setQuoteError("");
    try {
      const q = await callStripePaymentV2({ action: 'quote', type: 'gig', promoCode: (code || '').trim() }, session?.access_token);
      setQuote(q);
    } catch (e) { setQuote(null); setQuoteError(e.message || 'could not load price'); }
    finally { setQuoteLoading(false); }
  };
  const needCard = showPayModal && !!quote && quote.amount_cents > 0;
  // Sweep any stale gig draft from an abandoned prior attempt on mount.
  

  const [brand, setBrand] = useState({
    name: "", email: "", phone: "", phoneCode: "+1",
    logoPreview: null, logoTransform: null, logoEditing: false,
  });
  const [details, setDetails] = useState({
    title: "", description: "", industry: "", location: "",
    shootDate: "", contentTypes: [], equipment: "",
    deliverables: "", requirements: "", spotsTotal: 1,
  });
  const [inspoBoard, setInspoBoard] = useState([]); // [{ type: "photo"|"video", src, id }]
  const [pay, setPay] = useState({ payType: "flat", payRate: "" });
  const [lightboxItem, setLightboxItem] = useState(null);

  const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const canProceed = useMemo(() => {
    if (step === 0) return brand.name.trim() && isValidEmail(brand.email);
    if (step === 1) return details.title.trim() && details.description.trim() && details.industry && details.location.trim() && details.shootDate && details.contentTypes.length > 0 && details.equipment && details.deliverables.trim();
    if (step === 2) return true; // inspo board optional
    if (step === 3) return pay.payRate && !isNaN(parseFloat(pay.payRate)) && parseFloat(pay.payRate) > 0;
    return true;
  }, [step, brand, details, pay]);

  const next = () => { if (step < 4) setStep(step + 1); };
  const back = () => { if (step > 0) setStep(step - 1); };

  const containerRef = useRef(null);
  useEffect(() => {
    containerRef.current?.scrollTo?.({ top: 0, behavior: "smooth" });
    window.scrollTo?.({ top: 0, behavior: "smooth" });
  }, [step]);

  useEffect(() => {
    if (!showPayModal) { setQuote(null); setQuoteError(""); setPayError(""); setPromoCode(""); return; }
    fetchQuote();
  }, [showPayModal]);
  useEffect(() => {
    if (!needCard) { cardRef.current?.destroy(); cardRef.current = null; return; }
    const stripe = getStripe();
    if (!stripe) return;
    const t = setTimeout(() => {
      if (!cardDivRef.current || cardRef.current) return;
      const card = stripe.elements().create('card', {
        style: { base: { color: '#fff', fontFamily: 'system-ui, sans-serif', fontSize: '15px', '::placeholder': { color: 'rgba(255,255,255,.35)' } } },
      });
      card.mount(cardDivRef.current);
      cardRef.current = card;
    }, 0);
    return () => { clearTimeout(t); cardRef.current?.destroy(); cardRef.current = null; };
  }, [needCard]);

  const handleAddMedia = (files, type) => {
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setInspoBoard(prev => [...prev, { id: Date.now() + Math.random(), type, src: ev.target.result }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveMedia = (id) => setInspoBoard(prev => prev.filter(item => item.id !== id));

  // Mosaic layout — assigns grid spans based on position
  const getMosaicStyle = (index, total) => {
    const patterns = [
      // Item 0: tall left
      { gridColumn: "span 1", gridRow: "span 2" },
      // Item 1: normal top right
      { gridColumn: "span 1", gridRow: "span 1" },
      // Item 2: normal bottom right
      { gridColumn: "span 1", gridRow: "span 1" },
      // Item 3: full width
      { gridColumn: "span 2", gridRow: "span 1" },
      // Item 4: normal
      { gridColumn: "span 1", gridRow: "span 1" },
      // Item 5: normal
      { gridColumn: "span 1", gridRow: "span 1" },
    ];
    return patterns[index % patterns.length];
  };

  const buildGigData = () => ({
    brand: brand.name, logoPreview: brand.logoPreview,
    title: details.title, description: details.description,
    industry: details.industry, location: details.location,
    shootDate: details.shootDate, contentTypes: details.contentTypes,
    equipment: details.equipment, deliverables: details.deliverables,
    requirements: details.requirements, spotsTotal: details.spotsTotal,
    payType: pay.payType, payRate: parseFloat(pay.payRate),
    inspoBoard, skills: [],
  });
  // Fields the Edge Function persists on the gig_listings draft.
  const buildGigFeatures = () => ({
    title: details.title, description: details.description,
    comp: pay.payRate ? String(pay.payRate) : null, pay_type: pay.payType,
    deadline: details.shootDate, location: details.location,
    platforms: details.contentTypes ?? [], deliverables: details.deliverables ?? null,
    requirements: details.requirements ?? null, equipment: details.equipment ?? null,
    skills_required: [],
  });

  // Gig price comes from the server quote (flat fee; fee fully discountable — no escrow).

  return (
    <div ref={containerRef} style={{ minHeight: "100vh", overflowX: "hidden", background: "radial-gradient(circle at calc(46% + 250px) calc(58% - 175px), rgba(255,255,255,.103) 0%, rgba(255,255,255,.0309) 38%, transparent 52%), linear-gradient(180deg, #040b15 0%, #070f1f 100%)", backgroundColor: "#040b15", color: "#fff", fontFamily: "system-ui, sans-serif" }}>

      {/* Pay Modal */}
      {showPayModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", backdropFilter: "blur(8px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#0a1020", border: "1px solid rgba(255,255,255,.15)", borderRadius: 20, padding: "28px 24px", width: "100%", maxWidth: 400, textAlign: "center" }}>
            <div style={{ fontFamily: "'Monda', system-ui, sans-serif", fontSize: "1.4rem", fontWeight: 700, marginBottom: 6 }}>publish your gig</div>
            <div style={{ fontSize: ".85rem", opacity: .45, marginBottom: 24 }}>your listing goes live immediately</div>
            <div style={{ fontSize: "3rem", fontWeight: 700, fontFamily: "'Monda', system-ui, sans-serif", color: "#fff", marginBottom: 4 }}>{quoteLoading || !quote ? "…" : `$${(quote.amount_cents / 100).toFixed(2)}`}</div>
            <div style={{ fontSize: ".85rem", opacity: .45, marginBottom: 20 }}>one-time · per listing</div>
            <div style={{ marginBottom: 20, display: "flex", gap: 8 }}>
              <input className="nf-input" value={promoCode} onChange={e => setPromoCode(e.target.value)} placeholder="promo code" style={{ flex: 1 }} />
              <button className="nf-btn" onClick={() => fetchQuote(promoCode)} style={{ minWidth: 0, padding: "8px 14px", fontSize: ".8rem" }}>apply</button>
            </div>
            {quote && quote.discount_pct > 0 && <div style={{ fontSize: ".8rem", color: "rgba(100,255,150,.8)", marginBottom: 12 }}>{Math.round(quote.discount_pct * 100)}% off applied</div>}
            {quote&&!quote.checkout_available&&<p role="status" style={{margin:'12px 0',color:'#ffd89c'}}>Online checkout is temporarily unavailable. <a href="/contact.html" style={{color:'inherit'}}>Contact nfluence</a> to discuss your campaign.</p>}
              {quoteError && <div style={{ fontSize: ".8rem", color: "rgba(255,100,100,.7)", marginBottom: 12 }}>{quoteError}</div>}
            {!isFree && <div ref={cardDivRef} style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 12, padding: "13px 14px", marginBottom: 12, textAlign: "left" }} />}
            {payError && <div style={{ fontSize: ".8rem", color: "rgba(255,100,100,.9)", marginBottom: 10, textAlign: "left" }}>{payError}</div>}
            <button className="nf-btn" disabled={payLoading || quoteLoading || !quote || !quote.checkout_available} style={{ width: "100%", marginBottom: 10, background: payLoading ? "rgba(255,255,255,.04)" : "rgba(255,255,255,.08)", opacity: payLoading ? .6 : 1 }} onClick={async () => {
              if (!isFree && !cardRef.current) return;
              setPayLoading(true); setPayError("");
              let res;
              try {
                res = await callStripePaymentV2({ action: 'charge', type: 'gig', features: buildGigFeatures(), promoCode: (promoCode || '').trim() }, session?.access_token);
                if (!res.free) await confirmStripeCard(res.client_secret, cardRef.current);
                  res.confirmed=true;
                setShowPayModal(false);
                if (onPublish) await onPublish(buildGigData(), {}, { gigId: res.gigId, free: !!res.free });
              } catch (err) {
                setPayError(err.message || "Payment failed");
                if (res && res.payment_intent_id && !res.confirmed) { try { await callStripePaymentV2({ action: 'cancel', gigId: res.gigId, paymentIntentId: res.payment_intent_id }, session?.access_token); } catch (_) {} }
              } finally { setPayLoading(false); }
            }}>{payLoading ? "processing..." : isFree ? "confirm & publish" : `pay ${quote ? "$" + (quote.amount_cents / 100).toFixed(2) : ""} & publish`}</button>
            <button className="nf-btn-back" disabled={payLoading} style={{ width: "100%" }} onClick={() => { if (!payLoading) setShowPayModal(false); }}>cancel</button>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxItem && (
        <div role="dialog" aria-modal="true" tabIndex={-1} ref={el => { if (el && !el.__f) { el.__f = true; el.focus(); } }} onKeyDown={e => { if (e.key === 'Escape') { setLightboxItem(null); } }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.92)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setLightboxItem(null)}>
          {lightboxItem.type === "video" ? (
            <video src={lightboxItem.src} controls autoPlay style={{ maxWidth: "90vw", maxHeight: "90vh", borderRadius: 12 }} onClick={e => e.stopPropagation()} />
          ) : (
            <img src={lightboxItem.src} alt="" style={{ maxWidth: "90vw", maxHeight: "90vh", borderRadius: 12, objectFit: "contain" }} />
          )}
          <div style={{ position: "absolute", top: 20, right: 20, cursor: "pointer", opacity: .7, fontSize: "1.5rem" }}><XIcon size={18} /></div>
        </div>
      )}

      <style>{`
        @font-face { font-family: 'Monda'; src: url('/assets/Monda-Regular.woff') format('woff'); font-weight: 400 700; font-style: normal; font-display: swap; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .nf-header { width: 100%; height: 64px; display: flex; align-items: center; justify-content: space-between; padding: 0 32px; font-family: system-ui, sans-serif; }
        .nf-nav-brand { font-family: 'Monda', system-ui, sans-serif; font-weight: 600; font-size: 1.1rem; color: #fff; cursor: pointer; }
        .nf-nav-links { display: flex; gap: 18px; font-size: .9rem; opacity: .85; }
        .nf-nav-links a { color: #fff; text-decoration: none; }
        .nf-wrap { max-width: 470px; width: 100%; margin: 0 auto; padding: 0 16px; }
        .nf-section-title { text-align: center; font-family: 'Monda', system-ui, sans-serif; font-size: 1.5rem; margin-bottom: 15px; color: #fff; }
        .nf-step-row { display: flex; justify-content: center; gap: 8px; padding: 24px 16px 8px; max-width: 470px; margin: 0 auto; }
        .nf-step-pip { flex: 1; height: 3px; border-radius: 3px; background: rgba(255,255,255,.08); transition: background 0.3s; }
        .nf-step-pip.active { background: rgba(255,255,255,.55); }
        .nf-step-pip.done { background: rgba(255,255,255,.25); }
        .nf-step-labels { display: flex; justify-content: space-between; max-width: 470px; margin: 0 auto; padding: 8px 16px 0; font-size: .7rem; text-transform: lowercase; letter-spacing: .03em; color: rgba(255,255,255,.3); }
        .nf-step-labels span { flex: 1; text-align: center; transition: color 0.3s; }
        .nf-step-labels span.active { color: rgba(255,255,255,.85); }
        .nf-step-labels span.done { color: rgba(255,255,255,.45); }
        .nf-field-row { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 15px; }
        .nf-field { flex: 1 1 0; min-width: 140px; display: flex; flex-direction: column; gap: 4px; }
        .nf-field-full { width: 100%; margin-bottom: 15px; }
        .nf-input { border-radius: 12px; border: 1px solid rgba(255,255,255,.18); background: rgba(0,0,0,.35); color: #fff; padding: 8px 10px; font-size: .85rem; width: 100%; outline: none; font-family: system-ui, sans-serif; transition: border-color .12s, box-shadow .12s; }
        .nf-input::placeholder { color: rgba(255,255,255,.45); }
        .nf-input:focus { border-color: #fff; box-shadow: 0 0 0 1px rgba(255,255,255,.2); background: rgba(0,0,0,.5); }
        .nf-textarea { border-radius: 12px; border: 1px solid rgba(255,255,255,.18); background: rgba(0,0,0,.35); color: #fff; padding: 8px 10px; font-size: .85rem; width: 100%; outline: none; resize: vertical; min-height: 90px; font-family: system-ui, sans-serif; transition: border-color .12s; }
        .nf-textarea::placeholder { color: rgba(255,255,255,.45); }
        .nf-textarea:focus { border-color: #fff; box-shadow: 0 0 0 1px rgba(255,255,255,.2); background: rgba(0,0,0,.5); }
        .nf-select { border-radius: 12px; border: 1px solid rgba(255,255,255,.18); background: rgba(0,0,0,.35); color: #fff; padding: 8px 10px; font-size: .85rem; width: 100%; outline: none; appearance: none; font-family: system-ui, sans-serif; cursor: pointer; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' fill='rgba(255,255,255,0.4)' viewBox='0 0 16 16'%3E%3Cpath d='M1.5 5.5l6.5 6 6.5-6'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 10px center; }
        .nf-select:focus { border-color: #fff; box-shadow: 0 0 0 1px rgba(255,255,255,.2); background-color: rgba(0,0,0,.5); }
        .nf-select option { background: #0a1020; color: #fff; }
        .nf-chip { display: inline-flex; align-items: center; justify-content: center; padding: 8px 14px; border-radius: 14px; border: 1px solid rgba(255,255,255,.18); background: transparent; font-size: .8rem; color: rgba(255,255,255,.6); cursor: pointer; transition: all .12s; text-transform: lowercase; user-select: none; font-family: system-ui, sans-serif; }
        .nf-chip:hover { border-color: rgba(255,255,255,.35); color: rgba(255,255,255,.85); }
        .nf-chip.selected { background: rgba(255,255,255,.10); border-color: rgba(255,255,255,.55); box-shadow: 0 0 12px rgba(255,255,255,.18); color: #fff; }
        .nf-chip-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
        .nf-chip-grid .nf-chip { width: 100%; }
        @media (max-width: 600px) { .nf-chip-grid { grid-template-columns: 1fr 1fr; } }
        .nf-label { font-size: .8rem; opacity: .6; margin-bottom: 6px; text-transform: lowercase; letter-spacing: .02em; }
        .nf-line { width: 100%; height: 1px; background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,.15) 50%, rgba(255,255,255,0) 100%); opacity: .6; margin: 24px 0; }
        .nf-hint { font-size: .75rem; opacity: .45; margin-top: -2px; text-align: center; }
        .nf-upload { border: 1px dashed rgba(255,255,255,.18); border-radius: 12px; padding: 20px; text-align: center; cursor: pointer; transition: all .12s; background: rgba(0,0,0,.2); }
        .nf-upload:hover { border-color: rgba(255,255,255,.35); background: rgba(0,0,0,.35); }
        .nf-btn { display: inline-flex; align-items: center; justify-content: center; min-width: 160px; padding: 12px 24px; border-radius: 16px; font-family: system-ui, sans-serif; text-transform: lowercase; font-size: .99rem; background: transparent; border: 1px solid rgba(255,255,255,.28); backdrop-filter: blur(20px); color: #fff; cursor: pointer; transition: transform .12s, border .12s, box-shadow .12s, background .12s; box-shadow: 0 10px 28px rgba(0,0,0,.25); }
        .nf-btn:hover { transform: translateY(-2px); border-color: rgba(255,255,255,.45); background: rgba(255,255,255,.03); }
        .nf-btn:disabled { opacity: .25; cursor: not-allowed; transform: none; }
        .nf-btn-back { display: inline-flex; align-items: center; justify-content: center; padding: 12px 24px; border-radius: 16px; font-family: system-ui, sans-serif; text-transform: lowercase; font-size: .99rem; background: transparent; border: 1px solid rgba(255,255,255,.12); color: rgba(255,255,255,.5); cursor: pointer; transition: all .12s; }
        .nf-btn-back:hover { border-color: rgba(255,255,255,.28); color: #fff; }
        .nf-actions { display: flex; align-items: center; justify-content: space-between; max-width: 470px; margin: 0 auto; padding: 30px 16px 60px; }
        .nf-mosaic { display: grid; grid-template-columns: 1fr 1fr; grid-auto-rows: 140px; gap: 4px; border-radius: 16px; overflow: hidden; }
        .nf-mosaic-item { position: relative; overflow: hidden; cursor: pointer; background: rgba(255,255,255,.04); }
        .nf-mosaic-item img, .nf-mosaic-item video { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform .2s; }
        .nf-mosaic-item:hover img, .nf-mosaic-item:hover video { transform: scale(1.03); }
        .nf-mosaic-remove { position: absolute; top: 6px; right: 6px; width: 22px; height: 22px; border-radius: 50%; background: rgba(0,0,0,.65); display: flex; align-items: center; justify-content: center; cursor: pointer; opacity: 0; transition: opacity .15s; font-size: 10px; color: #fff; z-index: 2; }
        .nf-mosaic-item:hover .nf-mosaic-remove { opacity: 1; }
        .nf-mosaic-type-badge { position: absolute; bottom: 6px; left: 6px; background: rgba(0,0,0,.55); border-radius: 6px; padding: 2px 7px; font-size: 10px; color: rgba(255,255,255,.8); }
        @keyframes nf-ann-shimmer { 0%,100% { border-color: rgba(180,255,80,.25); box-shadow: 0 0 8px rgba(180,255,80,.08); } 50% { border-color: rgba(180,255,80,.85); box-shadow: 0 0 18px rgba(180,255,80,.3); } }
        @keyframes nf-val-shimmer { 0%,100% { border-color: rgba(255,140,30,.25); box-shadow: 0 0 6px rgba(255,140,30,.08); } 50% { border-color: rgba(255,140,30,.9); box-shadow: 0 0 14px rgba(255,140,30,.35); } }
        .nf-plan-ann-selected { animation: nf-ann-shimmer 2.5s ease-in-out infinite; }
        .nf-plan-val-badge { animation: nf-val-shimmer 2.5s ease-in-out infinite; }
        .nf-plan-unsel:hover { border-color: rgba(255,255,255,.28) !important; background: rgba(255,255,255,.04) !important; transform: translateY(-2px); }
      `}</style>

      <div className="nf-header">
        <div className="nf-nav-brand" role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }} onClick={onBack}>nfluence</div>
        <div className="nf-nav-links"><a href="#" onClick={e => { e.preventDefault(); onBack(); }}>campaigns</a></div>
      </div>

      <div className="nf-step-row">
        {GIG_STEPS.map((_, i) => (
          <div key={i} className={`nf-step-pip ${i === step ? "active" : i < step ? "done" : ""}`} />
        ))}
      </div>
      <div className="nf-step-labels">
        {GIG_STEPS.map((l, i) => (
          <span key={l} className={i === step ? "active" : i < step ? "done" : ""}>{l}</span>
        ))}
      </div>

      {/* Step 0 — Brand */}
      {step === 0 && (
        <div style={{ display: "flex", justifyContent: "center", marginTop: 30 }}>
          <div className="nf-wrap">
            <div className="nf-section-title">about your brand</div>
            <div className="nf-field-full">
              <input className="nf-input" value={brand.name} onChange={e => setBrand(p => ({ ...p, name: e.target.value }))} placeholder="brand name *" maxLength={60} />
            </div>
            <div className="nf-field-full">
              <input className="nf-input" type="email" value={brand.email} onChange={e => setBrand(p => ({ ...p, email: e.target.value }))} placeholder="email *"
                style={brand.email && !isValidEmail(brand.email) ? { borderColor: "rgba(255,100,100,.3)" } : {}} />
              {brand.email && !isValidEmail(brand.email) && <div style={{ fontSize: ".7rem", color: "rgba(255,100,100,.6)", marginTop: 4 }}>enter a valid email address</div>}
            </div>
            <div className="nf-field-row">
              <div className="nf-field" style={{ maxWidth: 80 }}>
                <select className="nf-select" value={brand.phoneCode} onChange={e => setBrand(p => ({ ...p, phoneCode: e.target.value }))}>
                  {["+1","+44","+61","+52","+55","+49","+33","+34","+39","+81","+82","+91"].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="nf-field">
                <input className="nf-input" value={brand.phone} onChange={e => setBrand(p => ({ ...p, phone: e.target.value }))} placeholder="phone number" />
              </div>
            </div>
            <label className="nf-upload" style={{ marginBottom: 15, display: "block", cursor: brand.logoEditing ? "default" : "pointer" }}>
              {!brand.logoEditing && (
                <input type="file" accept="image/png,image/svg+xml,image/jpeg" style={{ display: "none" }}
                  onChange={e => { const file = e.target.files?.[0]; if (file) { const reader = new FileReader(); reader.onload = (ev) => setBrand(p => ({ ...p, logoPreview: ev.target.result, logoEditing: true, logoTransform: null })); reader.readAsDataURL(file); } }} />
              )}
              {brand.logoEditing && brand.logoPreview ? (
                <ImageEditor src={brand.logoPreview} shape="circle" onSave={t => setBrand(p => ({ ...p, logoTransform: t, logoEditing: false }))} onCancel={() => setBrand(p => ({ ...p, logoPreview: null, logoEditing: false, logoTransform: null }))} />
              ) : brand.logoPreview ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 80, height: 80, borderRadius: "50%", overflow: "hidden", border: "1px solid rgba(255,255,255,.15)", position: "relative" }}>
                    <img src={brand.logoPreview} alt="logo" style={{ position: "absolute", left: "50%", top: "50%", transform: `translate(calc(-50% + ${brand.logoTransform?.pos?.x || 0}px), calc(-50% + ${brand.logoTransform?.pos?.y || 0}px)) scale(${brand.logoTransform?.scale || 1})`, minWidth: "100%", minHeight: "100%", objectFit: "cover" }} />
                  </div>
                  <div style={{ fontSize: ".7rem", opacity: .4 }}>click to change</div>
                </div>
              ) : (
                <div><div style={{ fontSize: ".85rem", opacity: .6 }}>click to upload brand logo</div><div style={{ fontSize: ".7rem", opacity: .35, marginTop: 4 }}>recommended: 512×512px · png or svg · max 5mb</div></div>
              )}
            </label>
          </div>
        </div>
      )}

      {/* Step 1 — Details */}
      {step === 1 && (
        <div style={{ display: "flex", justifyContent: "center", marginTop: 30 }}>
          <div className="nf-wrap">
            <div className="nf-section-title">gig details</div>
            <div className="nf-field-full">
              <input className="nf-input" value={details.title} onChange={e => setDetails(p => ({ ...p, title: e.target.value }))} placeholder="gig title * e.g. product photography — summer line" maxLength={80} />
            </div>
            <div className="nf-field-full">
              <textarea className="nf-textarea" value={details.description} onChange={e => setDetails(p => ({ ...p, description: e.target.value }))} placeholder="describe the gig — what you're shooting, the vibe, what you're looking for *" />
            </div>
            <div className="nf-line" />
            <div className="nf-section-title">content type</div>
            <div className="nf-hint">(select all that apply)</div>
            <div className="nf-chip-grid" style={{ marginBottom: 20 }}>
              {GIG_CONTENT_TYPES.map(ct => (
                <div key={ct} className={`nf-chip ${details.contentTypes.includes(ct) ? "selected" : ""}`}
                  onClick={() => setDetails(p => ({ ...p, contentTypes: p.contentTypes.includes(ct) ? p.contentTypes.filter(i => i !== ct) : [...p.contentTypes, ct] }))}>
                  {ct}
                </div>
              ))}
            </div>
            <div className="nf-line" />
            <div className="nf-field-full">
              <div className="nf-label">industry *</div>
              <select className="nf-select" value={details.industry} onChange={e => setDetails(p => ({ ...p, industry: e.target.value }))}>
                <option value="">select industry</option>
                {INDUSTRIES.map(ind => <option key={ind} value={ind}>{ind}</option>)}
              </select>
            </div>
            <div className="nf-field-full">
              <input className="nf-input" value={details.location} onChange={e => setDetails(p => ({ ...p, location: e.target.value }))} placeholder="shoot location * e.g. Los Angeles, CA" />
            </div>
            <div className="nf-field-row">
              <div className="nf-field">
                <div className="nf-label">shoot date *</div>
                <input type="date" className="nf-input" style={{ colorScheme: "dark" }} value={details.shootDate} onChange={e => setDetails(p => ({ ...p, shootDate: e.target.value }))} />
              </div>
              <div className="nf-field">
                <div className="nf-label">spots available</div>
                <input className="nf-input" type="number" min="1" value={details.spotsTotal} onChange={e => setDetails(p => ({ ...p, spotsTotal: parseInt(e.target.value) || 1 }))} />
              </div>
            </div>
            <div className="nf-line" />
            <div className="nf-field-full">
              <div className="nf-label">equipment *</div>
              <select className="nf-select" value={details.equipment} onChange={e => setDetails(p => ({ ...p, equipment: e.target.value }))}>
                <option value="">select equipment situation</option>
                {GIG_EQUIPMENT.map(eq => <option key={eq} value={eq}>{eq}</option>)}
              </select>
            </div>
            <div className="nf-field-full">
              <textarea className="nf-textarea" value={details.deliverables} onChange={e => setDetails(p => ({ ...p, deliverables: e.target.value }))} placeholder="deliverables * e.g. 20 edited photos + RAW files, 3 short-form vertical videos" />
            </div>
            <div className="nf-field-full">
              <textarea className="nf-textarea" value={details.requirements} onChange={e => setDetails(p => ({ ...p, requirements: e.target.value }))} placeholder="requirements (optional) — portfolio link, experience level, etc." style={{ minHeight: 70 }} />
            </div>
          </div>
        </div>
      )}

      {/* Step 2 — Inspo Board */}
      {step === 2 && (
        <div style={{ display: "flex", justifyContent: "center", marginTop: 30 }}>
          <div className="nf-wrap">
            <div className="nf-section-title">inspo board</div>
            <div className="nf-hint" style={{ marginBottom: 20 }}>upload photos and videos to show the vibe — photographers will see this as a mosaic collage</div>

            {inspoBoard.length > 0 && (
              <div className="nf-mosaic" style={{ marginBottom: 20 }}>
                {inspoBoard.map((item, idx) => {
                  const mosaicStyle = getMosaicStyle(idx, inspoBoard.length);
                  return (
                    <div key={item.id} className="nf-mosaic-item" style={mosaicStyle} onClick={() => setLightboxItem(item)}>
                      {item.type === "video" ? (
                        <video src={item.src} muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <img src={item.src} alt="" />
                      )}
                      <div className="nf-mosaic-type-badge">{item.type}</div>
                      <div className="nf-mosaic-remove" onClick={e => { e.stopPropagation(); handleRemoveMedia(item.id); }}><XIcon size={14} /></div>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
              <label className="nf-upload" style={{ flex: 1, cursor: "pointer" }}>
                <input type="file" accept="image/png,image/jpeg,image/webp" multiple style={{ display: "none" }}
                  onChange={e => handleAddMedia(Array.from(e.target.files || []), "photo")} />
                <div style={{ fontSize: ".85rem", opacity: .6 }}>+ add photos</div>
                <div style={{ fontSize: ".7rem", opacity: .35, marginTop: 4 }}>jpg, png, webp</div>
              </label>
              <label className="nf-upload" style={{ flex: 1, cursor: "pointer" }}>
                <input type="file" accept="video/mp4,video/quicktime,video/webm" multiple style={{ display: "none" }}
                  onChange={e => handleAddMedia(Array.from(e.target.files || []), "video")} />
                <div style={{ fontSize: ".85rem", opacity: .6 }}>+ add videos</div>
                <div style={{ fontSize: ".7rem", opacity: .35, marginTop: 4 }}>mp4, mov, webm</div>
              </label>
            </div>
            {inspoBoard.length === 0 && <div style={{ fontSize: ".75rem", opacity: .3, textAlign: "center" }}>optional — skip if you don't have reference media yet</div>}
            {inspoBoard.length > 0 && <div style={{ fontSize: ".75rem", opacity: .3, textAlign: "center" }}>click any item to preview · hover to remove</div>}
          </div>
        </div>
      )}

      {/* Step 3 — Pay */}
      {step === 3 && (
        <div style={{ display: "flex", justifyContent: "center", marginTop: 30 }}>
          <div className="nf-wrap">
            <div className="nf-section-title">pay rate</div>
            <div className="nf-hint" style={{ marginBottom: 20 }}>cash only — set what you're paying the photographer / videographer</div>
            <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
              {[{ value: "flat", label: "flat fee" }, { value: "hourly", label: "hourly rate" }].map(opt => (
                <div key={opt.value}
                  onClick={() => setPay(p => ({ ...p, payType: opt.value }))}
                  style={{ flex: 1, padding: "12px 16px", borderRadius: 14, cursor: "pointer", textAlign: "center", fontSize: ".9rem", transition: "all .15s", border: `1px solid ${pay.payType === opt.value ? "rgba(255,255,255,.5)" : "rgba(255,255,255,.12)"}`, background: pay.payType === opt.value ? "rgba(255,255,255,.1)" : "rgba(255,255,255,.03)" }}>
                  {opt.label}
                </div>
              ))}
            </div>
            <div className="nf-field-full" style={{ position: "relative" }}>
              <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: "1rem", opacity: .6, pointerEvents: "none" }}>$</div>
              <input className="nf-input" type="number" min="1" value={pay.payRate} onChange={e => setPay(p => ({ ...p, payRate: e.target.value }))} placeholder={pay.payType === "flat" ? "total flat fee *" : "hourly rate *"} style={{ paddingLeft: 24 }} />
            </div>
            <div style={{ marginTop: 8, fontSize: ".8rem", opacity: .4 }}>
              {pay.payType === "flat" ? "paid as a single lump sum upon completion" : "billed by the hour — agree on total hours with the photographer beforehand"}
            </div>
          </div>
        </div>
      )}

      {/* Step 4 — Account / Preview */}
      {step === 4 && (
        <div style={{ display: "flex", justifyContent: "center", marginTop: 30 }}>
          <div className="nf-wrap">
            <div className="nf-section-title">preview & publish</div>

            {/* Gig preview card */}
            <div style={{ background: "radial-gradient(circle at top, rgba(255,255,255,.045), rgba(4,11,21,0))", border: "1px solid rgba(255,255,255,.12)", borderRadius: 20, overflow: "hidden", marginBottom: 24 }}>
              <div style={{ height: 100, background: "rgba(255,255,255,.04)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ fontSize: ".75rem", opacity: .3 }}>gig listing</div>
              </div>
              <div style={{ padding: "16px 16px 14px" }}>
                <div style={{ fontSize: "1rem", fontWeight: 700, color: "#fff", marginBottom: 4 }}>{details.title || "gig title"}</div>
                <div style={{ fontSize: ".82rem", opacity: .45, marginBottom: 12 }}>{brand.name || "brand name"}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                  {details.contentTypes.slice(0, 3).map(ct => (
                    <div key={ct} style={{ padding: "3px 10px", borderRadius: 20, border: "1px solid rgba(255,255,255,.15)", fontSize: ".72rem", opacity: .7 }}>{ct}</div>
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 12, borderTop: "1px solid rgba(255,255,255,.08)" }}>
                  <div>
                    <div style={{ fontSize: ".75rem", opacity: .4 }}>pay</div>
                    <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "#fff" }}>${pay.payRate || "—"}{pay.payType === "hourly" ? <span style={{ fontSize: ".75rem", opacity: .5 }}>/hr</span> : ""}</div>
                  </div>
                  <div style={{ fontSize: ".82rem", opacity: .5 }}>{details.location || "—"}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="nf-actions">
        {step > 0 ? <button className="nf-btn-back" onClick={back}>back</button> : <div />}
        {step < 4 ? (
          <button className="nf-btn" disabled={!canProceed} onClick={next}>next</button>
        ) : (
          <button className="nf-btn" disabled={!canProceed} onClick={() => setShowPayModal(true)}>publish gig — $49.99</button>
        )}
      </div>
    </div>
  );
}
// ═══════════════════════════════════════════════


function PublicNav({ onSignIn, hideSignIn = false }) {
  const [showMenu, setShowMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" && window.innerWidth <= 600);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 600);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return (
    <div style={{ width: "100%", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 clamp(16px, 4vw, 32px)", textShadow: "0 1px 3px rgba(0,0,0,.35)", fontFamily: "system-ui, sans-serif", flexShrink: 0, position: "relative", zIndex: 1 }}>
      <a href="https://nfluenceagency.com/" style={{ fontWeight: 600, letterSpacing: "-.01em", fontSize: "1.1rem", color: "#fff", cursor: "pointer", fontFamily: "'Monda', system-ui, sans-serif", textDecoration: "none" }}>nfluence</a>
      {!isMobile && (
        <div style={{ display: "flex", gap: 18, fontSize: ".9rem", fontFamily: "system-ui, sans-serif", alignItems: "center" }}>
          <a className="nf-nl" href="https://nfluenceagency.com/" style={{ color: "#fff" }}>home</a>
          <a className="nf-nl" href="/campaigns/#browse" style={{ color: "#fff" }}>campaigns</a>
          <a className="nf-nl" href="https://nfluenceagency.com/#popular" style={{ color: "#fff" }}>services</a>
          <a className="nf-nl" href="https://nfluenceagency.com/contact.html" style={{ color: "#fff" }}>contact us</a>
          <a className="nf-nl" href="/campaigns/#faq" style={{ color: "#fff" }}>faq</a>
          {!hideSignIn && (
            <>
              <span style={{ color: "rgba(255,255,255,.35)", userSelect: "none" }}>|</span>
              <span className="nf-nl" style={{ color: "#fff" }} role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }} onClick={onSignIn}>sign in</span>
            </>
          )}
        </div>
      )}
      {isMobile && (
        <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, cursor: "pointer", position: "relative" }} role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => setShowMenu(v => !v)}>
          <div style={{ width: 14, height: 1.5, background: "rgba(255,255,255,.7)", borderRadius: 2 }} />
          <div style={{ width: 14, height: 1.5, background: "rgba(255,255,255,.7)", borderRadius: 2 }} />
          <div style={{ width: 14, height: 1.5, background: "rgba(255,255,255,.7)", borderRadius: 2 }} />
          {showMenu && (
            <div style={{ position: "absolute", top: 44, right: 0, background: "#0a1020", border: "1px solid rgba(255,255,255,.12)", borderRadius: 14, padding: "6px", minWidth: 180, zIndex: 50, boxShadow: "0 16px 40px rgba(0,0,0,.5)" }} onClick={e => e.stopPropagation()}>
              {[
                { label: "home", href: "https://nfluenceagency.com/" },
                { label: "campaigns", href: "/campaigns/#browse" },
                { label: "services", href: "https://nfluenceagency.com/#popular" },
                { label: "contact us", href: "https://nfluenceagency.com/contact.html" },
                { label: "faq", href: "/campaigns/#faq" },
              ].map(item => (
                <a key={item.label} href={item.href} onClick={() => setShowMenu(false)} style={{ display: "block", padding: "10px 14px", borderRadius: 10, fontSize: ".85rem", color: "rgba(255,255,255,.75)", cursor: "pointer", textDecoration: "none", transition: "background .12s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,.06)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  {item.label}
                </a>
              ))}
              {!hideSignIn && (
                <>
                  <div style={{ height: 1, background: "rgba(255,255,255,.08)", margin: "4px 8px" }} />
                  <div role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => { setShowMenu(false); onSignIn?.(); }} style={{ padding: "10px 14px", borderRadius: 10, fontSize: ".85rem", color: "#fff", cursor: "pointer", transition: "background .12s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,.06)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    sign in
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SignIn({onSignIn,onBack,onSignUp}) {
  return <AccountSignIn navigation={<PublicNav onSignIn={()=>{}}/>} onSignIn={onSignIn} onBack={onBack} onSignUp={onSignUp}/>;
}

// ── SignUpChoice ──

function SignUpChoice({onBack,onBrand,onCreator,onSignIn}) {
  return <AuthLayout navigation={<PublicNav onSignIn={onSignIn}/>} mode="signup" onLogIn={onSignIn} onCreate={()=>{}} description="Choose how you want to use nfluence.">
    <div className="nf-auth-role-list"><button type="button" className="nf-auth-role" onClick={onBrand}><strong>I'm a brand</strong><span>Launch campaigns and work with creators.</span></button><button type="button" className="nf-auth-role" onClick={onCreator}><strong>I'm a creator</strong><span>Find campaigns and collaborate with brands.</span></button></div>
    <button className="nf-auth-text-button" type="button" onClick={onBack}>Back to log in</button>
  </AuthLayout>;
}

// ── BrandOnboarding ──

// Shown after signup when email confirmation is enabled (signUp returns no session).
function ConfirmEmailNotice({email,onSignIn,onHome}) {
  return <AuthLayout navigation={<PublicNav onSignIn={onSignIn} hideSignIn/>} title="Check your email" description="Confirm your account, then log in." headline>
    <p className="nf-auth-notice">If <strong>{email||'your email address'}</strong> needs confirmation, look for a link from Nfluence. If you already have an account, log in or reset your password instead.</p>
    <ConfirmationHelp initialEmail={email}/>
    <button type="button" className="nf-auth-text-button" onClick={onSignIn}>Back to log in</button>
    <button type="button" className="nf-auth-text-button" onClick={onHome}>Back to home</button>
  </AuthLayout>;
}

// Multi-select industry picker shared by brand onboarding and the dashboard edit modal.
// `value` is an array of industry strings; `onChange` receives the new array.
function IndustryMultiSelect({ value = [], onChange }) {
  const [otherInput, setOtherInput] = useState("");
  const selected = Array.isArray(value) ? value : [];
  const toggle = (ind) => onChange(selected.includes(ind) ? selected.filter(x => x !== ind) : [...selected, ind]);
  const remove = (ind) => onChange(selected.filter(x => x !== ind));
  const addOther = () => {
    const v = otherInput.trim().replace(/,/g, "");
    if (v && !selected.some(s => s.toLowerCase() === v.toLowerCase())) onChange([...selected, v]);
    setOtherInput("");
  };
  const chipBase = { padding: "6px 13px", borderRadius: 20, fontSize: ".78rem", cursor: "pointer", transition: "all .12s", userSelect: "none" };
  return (
    <div>
      {/* Selected chips with remove (×) */}
      {selected.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 12 }}>
          {selected.map(ind => (
            <div key={ind} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "6px 8px 6px 13px", borderRadius: 20, border: "1px solid rgba(255,255,255,.5)", background: "rgba(255,255,255,.12)", fontSize: ".78rem", color: "#fff", userSelect: "none" }}>
              {ind}
              <span onClick={() => remove(ind)} title="remove" style={{ cursor: "pointer", width: 17, height: 17, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,.18)", fontSize: ".95rem", lineHeight: 1 }}><XIcon size={12} /></span>
            </div>
          ))}
        </div>
      )}
      {/* Available options (presets not yet selected) */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
        {INDUSTRIES.filter(ind => !selected.includes(ind)).map(ind => (
          <div key={ind} onClick={() => toggle(ind)} style={{ ...chipBase, border: "1px solid rgba(255,255,255,.15)", background: "transparent", color: "rgba(255,255,255,.55)" }}>{ind}</div>
        ))}
      </div>
      {/* Add a custom industry */}
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <input value={otherInput} onChange={e => setOtherInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addOther(); } }}
          placeholder="add another industry" maxLength={60}
          style={{ flex: 1, borderRadius: 12, border: "1px solid rgba(255,255,255,.18)", background: "rgba(0,0,0,.35)", color: "#fff", padding: "9px 12px", fontSize: ".82rem", outline: "none", fontFamily: "system-ui, sans-serif", boxSizing: "border-box" }} />
        <button type="button" onClick={addOther} disabled={!otherInput.trim()} style={{ padding: "9px 16px", borderRadius: 12, border: "1px solid rgba(255,255,255,.25)", background: "rgba(255,255,255,.06)", color: "#fff", fontSize: ".82rem", cursor: otherInput.trim() ? "pointer" : "not-allowed", opacity: otherInput.trim() ? 1 : .4, fontFamily: "system-ui, sans-serif" }}>add</button>
      </div>
    </div>
  );
}

function BrandOnboarding({ onBack, onComplete, onSignIn }) {
  const [step, setStep] = useState(0);
  const STEPS = ["account", "brand", "location", "socials"];
  const [form, setForm] = useState({
    name: "", tagline: "", bio: "", logoPreview: null, logoEditing: false, logoTransform: null, bannerPreview: null, bannerEditing: false, bannerTransform: null,
    contactName: "", email: "", password: "", confirmPassword: "", phone: "",
    website: "", country: "", city: "", state: "",
    industries: [],
    instagram: "", tiktok: "", youtube: "", x: "", facebook: "",
    agreeTerms: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const containerRef = useRef(null);
  useEffect(() => { containerRef.current?.scrollTo?.({ top: 0, behavior: "smooth" }); window.scrollTo?.({ top: 0, behavior: "smooth" }); }, [step]);

  const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const canProceed = useMemo(() => {
    if (step === 0) return form.contactName.trim() && isValidEmail(form.email) && form.password.length >= 8 && form.password === form.confirmPassword && form.agreeTerms;
    if (step === 1) return form.name.trim() && form.bio.trim();
    if (step === 2) return true;
    if (step === 3) return true;
    return true;
  }, [step, form]);

  const inputStyle = { width: "100%" };
  const selectStyle = { ...inputStyle, padding: "12px 32px 12px 14px", appearance: "none" };
  // Prominent section labels: uppercase + letter-spacing + weight so titles don't blend into content above.
  const labelStyle = { fontSize: ".72rem", fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(255,255,255,.55)", marginBottom: 9 };
  const fieldWrap = { marginBottom: 18 };
  // Extra separation for a major sub-section (logo / banner / industry) within a step.
  const sectionWrap = { marginBottom: 18, marginTop: 28, paddingTop: 24, borderTop: "1px solid rgba(255,255,255,.08)" };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const socialLinks = {
        Instagram: form.instagram || "",
        TikTok: form.tiktok || "",
        YouTube: form.youtube || "",
        X: form.x || "",
        Facebook: form.facebook || "",
      };
      const location = [form.city, form.state, form.country].filter(Boolean).join(", ");
      await onComplete({
        name: form.name,
        tagline: form.tagline,
        bio: form.bio,
        logoPreview: form.logoPreview,
        logoTransform: form.logoTransform,
        bannerPreview: form.bannerPreview,
        bannerTransform: form.bannerTransform,
        contactName: form.contactName,
        email: form.email,
        password: form.password,
        phone: form.phone,
        website: form.website,
        country: form.country,
        city: form.city,
        state: form.state,
        location,
        industry: serializeIndustries(form.industries),
        industries: form.industries,
        socialLinks,
      });
    } catch (err) {
      setError(err?.message || "something went wrong");
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout pageRef={containerRef} navigation={<PublicNav onSignIn={onSignIn}/>} mode="signup" onLogIn={onSignIn} onCreate={()=>{}} disabled={submitting} title="Create a brand account" description="A few details to set up your workspace." onboarding>
      <style>{`
        @font-face { font-family: 'Monda'; src: url('/assets/Monda-Regular.woff') format('woff'); font-weight: 400 700; font-style: normal; font-display: swap; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .bo-input::placeholder, .bo-textarea::placeholder { color: rgba(255,255,255,.35); }
        .bo-input:focus, .bo-textarea:focus, .bo-select:focus { border-color: rgba(255,255,255,.6); box-shadow: 0 0 0 1px rgba(255,255,255,.15); background: rgba(0,0,0,.5); }
        .bo-chip { display: inline-flex; align-items: center; justify-content: center; min-height: 44px; box-sizing: border-box;padding: 8px 16px; border-radius: 20px; border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.04); color: rgba(255,255,255,.6); font-size: .8rem; cursor: pointer; transition: all .12s; user-select: none; }
        .bo-chip.selected { border-color: rgba(255,255,255,.35); background: rgba(255,255,255,.12); color: #fff; }
        .bo-btn { padding: 14px 24px; border-radius: 14px; border: 1px solid rgba(255,255,255,.28); background: rgba(255,255,255,.08); color: #fff; font-size: .95rem; font-family: system-ui, sans-serif; text-transform: lowercase; cursor: pointer; transition: all .12s; }
        .bo-btn:hover:not(:disabled) { transform: translateY(-2px); border-color: rgba(255,255,255,.45); background: rgba(255,255,255,.12); }
        .bo-btn:disabled { opacity: .3; cursor: not-allowed; }
        .bo-btn-back { background: transparent; border-color: rgba(255,255,255,.15); color: rgba(255,255,255,.5); }
        .bo-btn-back:hover { background: rgba(255,255,255,.05) !important; border-color: rgba(255,255,255,.25) !important; color: rgba(255,255,255,.8) !important; transform: none !important; }
        @keyframes nf-cta-pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(100,255,150,.35); } 60% { box-shadow: 0 0 0 10px rgba(100,255,150,0); } }
        .bo-btn-finish { animation: nf-cta-pulse 2s ease-out infinite; }
      `}</style>

      <AuthSteps steps={STEPS} current={step}/>

      {/* Content */}
      <div className="nf-auth-onboarding-fields">

        {/* Step 0: Account */}
        {step === 0 && <div className="nf-auth-account-fields">
            <label className="nf-auth-field">Contact name<input className="bo-input" autoComplete="name" value={form.contactName} onChange={e=>setForm(f=>({...f,contactName:e.target.value}))} aria-label="contact name *"/></label>
            <label className="nf-auth-field">Email address<input className="bo-input" type="email" autoComplete="email" autoCapitalize="none" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} aria-label="email *"/></label>
            {form.email&&!isValidEmail(form.email)&&<p className="nf-auth-error">Enter a valid email address.</p>}
            <PasswordField id="nf-brand-password" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))}/>
            <PasswordField id="nf-brand-confirm" label="Confirm password" value={form.confirmPassword} onChange={e=>setForm(f=>({...f,confirmPassword:e.target.value}))}/>
            {form.confirmPassword&&form.password!==form.confirmPassword&&<p className="nf-auth-error">Passwords don’t match.</p>}
            <label className="nf-auth-consent"><input type="checkbox" checked={form.agreeTerms} onChange={e=>setForm(f=>({...f,agreeTerms:e.target.checked}))}/><span>I agree to nfluence’s <a href="/terms/" target="_blank" rel="noopener noreferrer">Terms of Service</a> and <a href="/privacy/" target="_blank" rel="noopener noreferrer">Privacy Policy</a>. I confirm I am at least 18 years old and authorized to act on behalf of the brand I represent.</span></label>
        </div>}

        {/* Step 1: Brand */}
        {step === 1 && (
          <div>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, fontFamily: "'Monda', system-ui, sans-serif", marginBottom: 6 }}>about your brand</div>
            <div style={{ fontSize: ".88rem", opacity: .7, marginBottom: 28 }}>tell creators who you are</div>
            <div style={fieldWrap}>
              <input className="bo-input" style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} aria-label="brand name *" placeholder="brand name *" maxLength={60} />
            </div>
            <div style={fieldWrap}>
              <input className="bo-input" style={inputStyle} value={form.tagline} onChange={e => setForm(f => ({ ...f, tagline: e.target.value }))} aria-label="tagline" placeholder="tagline" maxLength={120} />
            </div>
            <div style={fieldWrap}>
              <textarea className="bo-textarea" style={{ ...inputStyle, minHeight: 100, resize: "vertical", fontFamily: "system-ui, sans-serif" }} value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} aria-label="describe your brand — vision, what you do, and why people should get behind it *" placeholder="describe your brand — vision, what you do, and why people should get behind it *" />
            </div>
            <div style={sectionWrap}>
              <div style={labelStyle}>logo</div>
              {form.logoEditing && form.logoPreview ? (
                <ImageEditor src={form.logoPreview} shape="circle"
                  initialScale={form.logoTransform?.scale} initialPos={form.logoTransform?.pos}
                  onSave={(t) => setForm(p => ({ ...p, logoPreview: t.croppedDataUrl, logoTransform: t, logoEditing: false }))}
                  onCancel={() => setForm(p => ({ ...p, logoPreview: null, logoEditing: false, logoTransform: null }))} />
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                  <label style={{ cursor: "pointer", position: "relative", flexShrink: 0 }}>
                    <input type="file" accept="image/*" style={{ display: "none", boxSizing: "border-box" }} onChange={e => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = ev => setForm(p => ({ ...p, logoPreview: ev.target.result, logoEditing: true, logoTransform: null })); r.readAsDataURL(f); } }} />
                    <div style={{ width: 120, height: 120, borderRadius: 14, overflow: "hidden", background: "rgba(255,255,255,.04)", border: "2px dashed rgba(255,255,255,.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {form.logoPreview ? <img src={form.logoPreview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: ".8rem", opacity: .35 }}>logo</span>}
                    </div>
                  </label>
                  <div>
                    <label style={{ cursor: "pointer" }}>
                      <input type="file" accept="image/*" style={{ display: "none", boxSizing: "border-box" }} onChange={e => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = ev => setForm(p => ({ ...p, logoPreview: ev.target.result, logoEditing: true, logoTransform: null })); r.readAsDataURL(f); } }} />
                      <div style={{ fontSize: ".82rem", opacity: .55 }}>{form.logoPreview ? "click to change logo" : "click to upload brand logo"}</div>
                    </label>
                    {form.logoPreview && <div onClick={() => setForm(p => ({ ...p, logoEditing: true }))} style={{ fontSize: ".75rem", opacity: .7, marginTop: 6, cursor: "pointer", textDecoration: "underline" }}>reposition</div>}
                  </div>
                </div>
              )}
            </div>
            <div style={sectionWrap}>
              <div style={labelStyle}>banner</div>
              {form.bannerEditing && form.bannerPreview ? (
                <ImageEditor src={form.bannerPreview} shape="banner"
                  initialScale={form.bannerTransform?.scale} initialPos={form.bannerTransform?.pos}
                  onSave={(t) => setForm(p => ({ ...p, bannerPreview: t.croppedDataUrl, bannerTransform: t, bannerEditing: false }))}
                  onCancel={() => setForm(p => ({ ...p, bannerPreview: null, bannerEditing: false, bannerTransform: null }))} />
              ) : (
                <label style={{ cursor: "pointer", display: "block" }}>
                  <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = ev => setForm(p => ({ ...p, bannerPreview: ev.target.result, bannerEditing: true, bannerTransform: null })); r.readAsDataURL(f); } }} />
                  <div style={{ width: "100%", aspectRatio: "25/9", borderRadius: 12, overflow: "hidden", background: "rgba(255,255,255,.04)", border: "2px dashed rgba(255,255,255,.2)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                    {form.bannerPreview
                      ? <img src={form.bannerPreview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <span style={{ fontSize: ".8rem", opacity: .35 }}>click to upload banner</span>}
                  </div>
                </label>
              )}
              {form.bannerPreview && !form.bannerEditing && (
                <div onClick={() => setForm(p => ({ ...p, bannerEditing: true }))} style={{ fontSize: ".75rem", opacity: .7, marginTop: 6, cursor: "pointer", textDecoration: "underline" }}>reposition</div>
              )}
            </div>
            <div style={sectionWrap}>
              <div style={labelStyle}>industry</div>
              <div style={{ fontSize: ".78rem", opacity: .65, marginBottom: 10, marginTop: -2 }}>select all that apply</div>
              <IndustryMultiSelect value={form.industries} onChange={inds => setForm(f => ({ ...f, industries: inds }))} />
            </div>
          </div>
        )}

        {/* Step 2: Location & contact */}
        {step === 2 && (
          <div>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, fontFamily: "'Monda', system-ui, sans-serif", marginBottom: 6 }}>where are you based?</div>
            <div style={{ fontSize: ".88rem", opacity: .7, marginBottom: 28 }}>optional — helps creators find you</div>

            <div style={fieldWrap}>
              <input className="bo-input" style={inputStyle} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} aria-label="phone number" placeholder="phone number" />
            </div>
            <div style={fieldWrap}>
              <input className="bo-input" style={inputStyle} value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} aria-label="website" placeholder="website" />
            </div>
            <div style={fieldWrap}>
              <div style={labelStyle}>country</div>
              <div style={{ position: "relative" }}>
                <select aria-label="country" className="bo-select" style={selectStyle} value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value, state: "" }))}>
                  <option value="">select country</option>
                  {REGION_CODES.map(c => <option key={c} value={c}>{REGION_NAMES[c] || c}</option>)}
                </select>
                <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", opacity: .4 }}>▾</div>
              </div>
            </div>
            {form.country === "US" && (
              <div style={{ ...fieldWrap, display: "flex", gap: 8 }}>
                <input className="bo-input" style={{ ...inputStyle, flex: 1 }} value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} aria-label="city" placeholder="city" />
                <div style={{ position: "relative", flex: 1 }}>
                  <select aria-label="state" className="bo-select" style={selectStyle} value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))}>
                    <option value="">state</option>
                    {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", opacity: .4 }}>▾</div>
                </div>
              </div>
            )}
            {form.country && form.country !== "US" && (
              <div style={{ ...fieldWrap, display: "flex", gap: 8 }}>
                <input className="bo-input" style={{ ...inputStyle, flex: 1 }} value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} aria-label="city" placeholder="city" />
                <input className="bo-input" style={{ ...inputStyle, flex: 1 }} value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} aria-label="region / province" placeholder="region / province" />
              </div>
            )}
          </div>
        )}

        {/* Step 3: Socials */}
        {step === 3 && (
          <div>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, fontFamily: "'Monda', system-ui, sans-serif", marginBottom: 6 }}>connect your socials</div>
            <div style={{ fontSize: ".88rem", opacity: .7, marginBottom: 28 }}>optional — helps build trust with creators</div>

            {[
              { key: "instagram", placeholder: "instagram url" },
              { key: "tiktok", placeholder: "tiktok url" },
              { key: "youtube", placeholder: "youtube url" },
              { key: "x", placeholder: "x url" },
              { key: "facebook", placeholder: "facebook url" },
            ].map(s => (
              <div key={s.key} style={fieldWrap}>
                <input className="bo-input" style={inputStyle} value={form[s.key]} onChange={e => setForm(f => ({ ...f, [s.key]: e.target.value }))} aria-label={s.placeholder} placeholder={s.placeholder} />
              </div>
            ))}

            {error && <div style={{ fontSize: ".82rem", color: "rgba(255,120,120,.85)", marginTop: 12 }}>{error}</div>}
            <div style={{ fontSize: ".82rem", opacity: .65, textAlign: "center", marginTop: 20 }}>you can edit all of this from your dashboard anytime</div>
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: "flex", gap: 12, marginTop: 32 }}>
          <button className="bo-btn bo-btn-back" onClick={() => step === 0 ? onBack() : setStep(s => s - 1)}>← back</button>
          {step < 3 ? (
            <button className="bo-btn" style={{ flex: 1 }} disabled={!canProceed} onClick={() => setStep(s => s + 1)}>continue →</button>
          ) : (
            <button className="bo-btn bo-btn-finish" style={{ flex: 1, borderColor: "rgba(100,255,150,.35)", background: "rgba(100,255,150,.1)", color: "rgba(100,255,150,.95)" }} disabled={submitting} onClick={handleSubmit}>{submitting ? "creating account…" : "i'm in →"}</button>
          )}
        </div>
      </div>
    </AuthLayout>
  );
}

// ── Dashboard ──

// ── ReviewsPage ──

function ReviewsPage({ campaigns, demoCampaigns, onBack, onUpdateReview }) {
  const [replyDrafts, setReplyDrafts] = useState({}); // key "campaignIdx:reviewIdx" → draft text
  const [editingKey, setEditingKey] = useState(null); // key being edited

  // Flatten all reviews across all campaigns
  const allCampaigns = [
    ...campaigns.map(c => ({ ...c, _source: "user" })),
    ...demoCampaigns.map((d, i) => ({ ...d, id: `demo-${i}`, _source: "demo", _demoIdx: i })),
  ];

  const allReviews = [];
  allCampaigns.forEach((c) => {
    (c.reviews || []).forEach((r, rIdx) => {
      allReviews.push({ campaign: c, review: r, reviewIdx: rIdx });
    });
  });

  // Sort newest first
  allReviews.sort((a, b) => new Date(b.review.submittedAt || 0) - new Date(a.review.submittedAt || 0));

  // Group by campaign
  const grouped = {};
  allReviews.forEach(item => {
    const key = item.campaign.brand + "::" + item.campaign.campaign;
    if (!grouped[key]) grouped[key] = { campaign: item.campaign, reviews: [] };
    grouped[key].reviews.push(item);
  });
  const groups = Object.values(grouped);

  const avgRating = (reviews) => reviews.length ? (reviews.reduce((s, r) => s + r.review.rating, 0) / reviews.length).toFixed(1) : null;

  const replyKey = (campaignKey, reviewIdx) => campaignKey + "::" + reviewIdx;

  const [replyError,setReplyError]=useState("");
  const handlePostReply = async (campaignKey, reviewIdx, campaign, text) => {
    if (!text.trim()) return;
    try{await onUpdateReview(campaign, reviewIdx, text.trim());setReplyError("");}catch(error){setReplyError(error.message);return;}
    setEditingKey(null);
    setReplyDrafts(prev => { const next = { ...prev }; delete next[replyKey(campaignKey, reviewIdx)]; return next; });
  };

  const formatDate = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <div style={{ minHeight: "100vh", overflowX: "hidden", background: "radial-gradient(circle at calc(46% + 250px) calc(58% - 175px), rgba(255,255,255,.103) 0%, rgba(255,255,255,.0309) 38%, transparent 52%), linear-gradient(180deg, #040b15 0%, #070f1f 100%)", backgroundColor: "#040b15", color: "#fff", fontFamily: "system-ui, sans-serif" }}>
      {replyError&&<p role="alert" className="async-error">{replyError}</p>}
      <style>{`
        .nf-review-card { background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.08); border-radius: 14px; padding: 18px 20px; }
        .nf-reply-btn { display: inline-flex; align-items: center; justify-content: center; min-height: 44px; box-sizing: border-box;padding: 8px 18px; border-radius: 10px; border: 1px solid rgba(255,255,255,.18); background: rgba(255,255,255,.05); color: rgba(255,255,255,.7); font-size: .78rem; cursor: pointer; transition: all .12s; font-family: system-ui, sans-serif; }
        .nf-reply-btn:hover { border-color: rgba(255,255,255,.3); background: rgba(255,255,255,.09); color: #fff; }
        .nf-reply-submit { padding: 9px 20px; border-radius: 10px; border: 1px solid rgba(251,191,36,.3); background: rgba(251,191,36,.1); color: #fbbf24; font-size: .82rem; font-weight: 600; cursor: pointer; transition: all .12s; font-family: system-ui, sans-serif; }
        .nf-reply-submit:hover { background: rgba(251,191,36,.18); }
        .nf-reply-submit:disabled { opacity: .3; cursor: not-allowed; }
        .nf-reply-textarea { width: 100%; padding: 12px 14px; border-radius: 11px; border: 1px solid rgba(255,255,255,.14); background: rgba(0,0,0,.3); color: #fff; font-size: .88rem; outline: none; font-family: system-ui, sans-serif; resize: vertical; line-height: 1.5; transition: border-color .12s; }
        .nf-reply-textarea:focus { border-color: rgba(251,191,36,.35); }
        @keyframes nf-gold-shimmer { 0%,100% { background-position: 200% center } 50% { background-position: 0% center } }
        .nf-gold-shimmer { background: linear-gradient(90deg,#fbbf24,#fef3c7,#f59e0b,#fbbf24); background-size: 200% auto; -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; animation: nf-gold-shimmer 3s linear infinite; }
      `}</style>

      {/* Header */}
      <div style={{ width: "100%", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ fontFamily: "'Monda', system-ui, sans-serif", fontWeight: 600, letterSpacing: "-.01em", fontSize: "1.1rem", color: "#fff", cursor: "pointer" }} onClick={onBack}>nfluence</div>
        <div style={{ display: "flex", gap: 18, fontSize: ".85rem", alignItems: "center" }}>
          <span style={{ opacity: .5, cursor: "pointer" }} onClick={onBack}>← back to dashboard</span>
        </div>
      </div>

      <div style={{ maxWidth: 780, margin: "0 auto", padding: "20px 16px 80px" }}>
        {/* Page header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: "clamp(1.3rem, 4vw, 1.8rem)", fontWeight: 700, fontFamily: "'Monda', system-ui, sans-serif" }}>reviews</div>
          <div style={{ fontSize: ".9rem", opacity: .4, marginTop: 4 }}>creator feedback across all your campaigns</div>
        </div>

        {allReviews.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 20px", opacity: .3 }}>
            <div style={{ fontSize: "2.5rem", marginBottom: 16 }}>★</div>
            <div style={{ fontSize: "1.1rem", marginBottom: 8 }}>no reviews yet</div>
            <div style={{ fontSize: ".85rem" }}>reviews from creators will appear here once campaigns complete</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            {groups.map((group) => {
              const campaignKey = group.campaign.brand + "::" + group.campaign.campaign;
              const avg = avgRating(group.reviews);
              return (
                <div key={campaignKey}>
                  {/* Campaign header */}
                  <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 14, background: "#0c1424", border: "1px solid rgba(255,255,255,.12)", flexShrink: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {group.campaign.logoUrl ? <img src={group.campaign.logoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: ".55rem", opacity: .4 }}>logo</span>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: "1rem", fontFamily: "'Monda', system-ui, sans-serif" }}>{group.campaign.brand}</div>
                      <div style={{ fontSize: ".8rem", opacity: .4 }}>{group.campaign.campaign}</div>
                    </div>
                    {avg && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                        <span style={{ color: "#fbbf24", fontSize: "1rem" }}>★</span>
                        <span style={{ fontWeight: 700, fontSize: "1rem", fontFamily: "'Monda', system-ui, sans-serif" }}>{avg}</span>
                        <span style={{ fontSize: ".8rem", opacity: .35 }}>({group.reviews.length})</span>
                      </div>
                    )}
                  </div>

                  {/* Reviews */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {group.reviews.map(({ review: r, reviewIdx }) => {
                      const key = replyKey(campaignKey, reviewIdx);
                      const isEditing = editingKey === key;
                      const draft = replyDrafts[key] || "";
                      return (
                        <div key={reviewIdx} className="nf-review-card">
                          {/* Creator + rating row */}
                          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
                            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".88rem", fontWeight: 600, flexShrink: 0 }}>
                              {r.creator.charAt(0)}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                <div style={{ fontWeight: 600, fontSize: ".95rem" }}>{r.creator}</div>
                                <div style={{ color: "#fbbf24", fontSize: ".82rem", letterSpacing: 1 }}>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</div>
                              </div>
                              {r.submittedAt && <div style={{ fontSize: ".72rem", opacity: .3, marginTop: 2 }}>{formatDate(r.submittedAt)}</div>}
                            </div>
                          </div>
                          <div style={{ fontSize: ".95rem", opacity: .65, lineHeight: 1.6, marginBottom: r.brandResponse || isEditing ? 14 : 0 }}>{r.text}</div>

                          {/* Existing brand response */}
                          {r.brandResponse && !isEditing && (
                            <div style={{ paddingTop: 14, borderTop: "1px solid rgba(255,255,255,.06)" }}>
                              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                                <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(251,191,36,.12)", border: "1px solid rgba(251,191,36,.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: ".6rem", fontWeight: 700, color: "#fbbf24" }}>B</div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: ".72rem", opacity: .4, marginBottom: 5, textTransform: "lowercase", letterSpacing: ".03em" }}>your response</div>
                                  <div style={{ fontSize: ".9rem", opacity: .75, lineHeight: 1.55 }}>{r.brandResponse}</div>
                                  <button className="nf-reply-btn" style={{ marginTop: 10, fontSize: ".72rem", padding: "5px 12px" }} onClick={() => { setEditingKey(key); setReplyDrafts(prev => ({ ...prev, [key]: r.brandResponse })); }}>edit response</button>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Reply compose area */}
                          {isEditing && (
                            <div style={{ paddingTop: 14, borderTop: "1px solid rgba(255,255,255,.06)" }}>
                              <div style={{ fontSize: ".72rem", opacity: .4, marginBottom: 8, textTransform: "lowercase", letterSpacing: ".03em" }}>responding as {group.campaign.brand}</div>
                              <textarea
                                className="nf-reply-textarea"
                                rows={3}
                                value={draft}
                                onChange={e => setReplyDrafts(prev => ({ ...prev, [key]: e.target.value }))}
                                placeholder="Write a public response to this review..."
                                autoFocus
                              />
                              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                                <button className="nf-reply-btn" onClick={() => { setEditingKey(null); setReplyDrafts(prev => { const n = { ...prev }; delete n[key]; return n; }); }}>cancel</button>
                                <button className="nf-reply-submit" disabled={!draft.trim()} onClick={() => handlePostReply(campaignKey, reviewIdx, group.campaign, draft)}>post response</button>
                              </div>
                            </div>
                          )}

                          {/* Reply button — only show if no response and not editing */}
                          {!r.brandResponse && !isEditing && (
                            <div style={{ marginTop: 10 }}>
                              <button className="nf-reply-btn" onClick={() => setEditingKey(key)}>reply</button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Dashboard({ user, campaigns, demoCampaigns, onBack, onSignOut, onNewCampaign, onNewGig, onSelectCampaign, onEditCampaign, onUnfeature, onViewReviews, lastReviewsVisitedAt, onBrowse, onOpenMessages, onUpdateUser, onFaq, scheduledCalls = {}, notifications = [], onMarkAllNotifsRead, onViewAllNotifications }) {
  const [profileSaveError,setProfileSaveError]=useState("");
  const [profileSaveBusy,setProfileSaveBusy]=useState(false);
  const [showTray, setShowTray] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showBrandEdit, setShowBrandEdit] = useState(false);
  const [brandEditForm, setBrandEditForm] = useState({ name: "", location: "", website: "", logoEditing: false, bannerEditing: false, logoTransform: null, bannerTransform: null });
  const [showAttentionModal, setShowAttentionModal] = useState(false);
  const [editWarnCampaign, setEditWarnCampaign] = useState(null); // campaign pending edit warning
  const [unfeaturingId, setUnfeaturingId] = useState(null); // campaign id currently being unfeatured
  const STAGE_LABELS = { draft: "draft", open: "accepting creators", active: "content in production", fulfillment: "approvals & payouts", wrap_up: "completed" };
  const STAGE_COLORS = { draft: "rgba(255,255,255,.15)", open: "rgba(100,200,255,.25)", active: "rgba(255,200,100,.25)", fulfillment: "rgba(200,100,255,.25)", wrap_up: "rgba(100,255,150,.25)" };
  // Item 2 — edit-modal section styling: prominent uppercase labels + a divider/gap before each
  // major section so titles don't blend into the content above them.
  const editLabel = { fontSize: ".7rem", fontWeight: 700, letterSpacing: ".09em", textTransform: "uppercase", color: "rgba(255,255,255,.5)", marginBottom: 9 };
  const editSection = { marginBottom: 14, marginTop: 30, paddingTop: 24, borderTop: "1px solid rgba(255,255,255,.08)" };

  const allCampaigns = [...campaigns, ...demoCampaigns.map((d, i) => ({
    ...d, id: `demo-${i}`, createdAt: new Date(Date.now() - (i + 1) * 86400000 * 7).toISOString(),
  }))];

  return (
    <div style={{ minHeight: "100vh", overflowX: "hidden", background: "radial-gradient(circle at calc(46% + 250px) calc(58% - 175px), rgba(255,255,255,.103) 0%, rgba(255,255,255,.0309) 38%, transparent 52%), linear-gradient(180deg, #040b15 0%, #070f1f 100%)", backgroundColor: "#040b15", color: "#fff", fontFamily: "system-ui, sans-serif" }}>
      {profileSaveError&&<p role="alert" className="async-error" style={{position:"fixed",top:12,left:12,right:12,zIndex:3500}}>{profileSaveError}</p>}
      <style>{`
        .nf-dash-card {
          background: radial-gradient(circle at top, rgba(255,255,255,.04), rgba(4,11,21,0));
          border: 1px solid rgba(255,255,255,.1); border-radius: 18px;
          padding: 22px 24px; cursor: pointer;
          transition: transform .2s, border-color .2s, box-shadow .2s;
        }
        .nf-dash-card:hover { transform: translateY(-3px); border-color: rgba(255,255,255,.22); box-shadow: 0 12px 35px rgba(0,0,0,.35); }
        .nf-stat-card {
          background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.08);
          border-radius: 16px; padding: 20px 22px; text-align: center;
        }
        .nf-reviews-card {
          background: rgba(255,255,255,.03); border: 1px solid rgba(251,191,36,.18);
          border-radius: 16px; padding: 20px 22px; cursor: pointer;
          transition: all .15s; text-align: center;
        }
        .nf-reviews-card:hover { border-color: rgba(251,191,36,.4); background: rgba(251,191,36,.04); transform: translateY(-2px); }
        @keyframes nf-gold-shimmer { 0%,100% { background-position: 200% center } 50% { background-position: 0% center } }
        .nf-gold-shimmer { background: linear-gradient(90deg,#fbbf24,#fef3c7,#f59e0b,#fbbf24); background-size: 200% auto; -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; animation: nf-gold-shimmer 3s linear infinite; }
        .nf-new-campaign-btn {
          padding: 12px 24px; border-radius: 14px; border: 1px solid rgba(255,255,255,.28);
          background: rgba(255,255,255,.08); backdrop-filter: blur(20px); color: #fff;
          font-size: .9rem; font-family: system-ui, sans-serif; text-transform: lowercase;
          cursor: pointer; transition: all .12s; display: inline-flex; align-items: center; gap: 8;
        }
        .nf-new-campaign-btn:hover { transform: translateY(-2px); border-color: rgba(255,255,255,.45); background: rgba(255,255,255,.12); }
        .nf-campaign-card {
          background: radial-gradient(circle at top, rgba(255,255,255,.04), rgba(4,11,21,0));
          border: 1px solid rgba(255,255,255,.1); border-radius: 20px;
          display: flex; flex-direction: column; overflow: hidden;
          transition: transform .2s, border-color .2s, box-shadow .2s; cursor: pointer;
        }
        .nf-campaign-card:hover { transform: translateY(-3px); border-color: rgba(255,255,255,.22); box-shadow: 0 12px 35px rgba(0,0,0,.35); }
        @keyframes nf-border-shimmer { 0%,100% { border-color: rgba(255,140,30,.4); box-shadow: 0 0 0 1px rgba(255,140,30,.15), 0 0 14px rgba(255,140,30,.15); } 50% { border-color: rgba(255,165,50,1); box-shadow: 0 0 0 1px rgba(255,165,50,.5), 0 0 28px rgba(255,140,30,.45); } }
        @keyframes nf-confirm-shimmer { 0%,100% { border-color: rgba(100,255,150,.3); box-shadow: 0 0 0 1px rgba(100,255,150,.1), 0 0 10px rgba(100,255,150,.1); } 50% { border-color: rgba(100,255,150,1); box-shadow: 0 0 0 1px rgba(100,255,150,.5), 0 0 22px rgba(100,255,150,.4); } }
        @media (max-width: 600px) { .nf-nav-secondary { display: none !important; } }
        @media (max-width: 600px) { .nf-dash-content { padding-left: 16px !important; padding-right: 16px !important; } }
      `}</style>

      {/* Nav */}
      <div style={{ height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", position: "relative", zIndex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: "1rem", cursor: "pointer", fontFamily: "'Monda', system-ui, sans-serif" }} role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }} onClick={onBack}>nfluence</div>
        <div style={{ display: "flex", gap: 18, alignItems: "center", fontFamily: "system-ui, sans-serif", fontSize: ".9rem" }}>
          <a className="nf-nl nf-nav-secondary" href="https://nfluenceagency.com/" style={{ color: "#fff" }}>home</a>
          <span className="nf-nl nf-nav-secondary" style={{ color: "#fff" }} role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => onBrowse?.()}>campaigns</span>
          <a className="nf-nl nf-nav-secondary" href="https://nfluenceagency.com/#popular" style={{ color: "#fff" }}>services</a>
          <a className="nf-nl nf-nav-secondary" href="https://nfluenceagency.com/contact.html" style={{ color: "#fff" }}>contact us</a>
          <span className="nf-nl nf-nav-secondary" style={{ color: "#fff" }} role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => onFaq?.()}>faq</span>
          <span className="nf-nav-secondary" style={{ color: "rgba(255,255,255,.35)", userSelect: "none" }}>|</span>
          <NotificationBell notifications={notifications.filter(n => n.for === "brand")} onOpen={() => setShowTray(v => !v)} />
          <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, cursor: "pointer", position: "relative" }} role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => setShowSettingsMenu(v => !v)}>
            <div style={{ width: 14, height: 1.5, background: "rgba(255,255,255,.7)", borderRadius: 2 }} />
            <div style={{ width: 14, height: 1.5, background: "rgba(255,255,255,.7)", borderRadius: 2 }} />
            <div style={{ width: 14, height: 1.5, background: "rgba(255,255,255,.7)", borderRadius: 2 }} />
            {showSettingsMenu && (
              <div style={{ position: "absolute", top: 44, right: 0, background: "#0a1020", border: "1px solid rgba(255,255,255,.12)", borderRadius: 14, padding: "6px", minWidth: 160, zIndex: 50, boxShadow: "0 16px 40px rgba(0,0,0,.5)" }} onClick={e => e.stopPropagation()}>
                {[
                  { label: "messages", action: () => { setShowSettingsMenu(false); onOpenMessages?.(); } },
                  { label: "edit profile", action: () => { setShowSettingsMenu(false); const parts = (user?.location || "").split(",").map(s => s.trim()); const sl = user?.socialLinks || {}; setBrandEditForm({ name: (user?.name && user.name !== user?.email) ? user.name : (user?.email ? user.email.split("@")[0] : ""), tagline: user?.tagline || "", city: user?.city || parts[0] || "", state: user?.state || parts[1] || "", country: user?.country || parts[2] || "", website: user?.website || "", industries: parseIndustries(user?.industry), bio: user?.bio || "", logoPreview: user?.logoPreview || user?.logoUrl || null, bannerPreview: user?.bannerPreview || user?.bannerUrl || null, logoEditing: false, bannerEditing: false, logoTransform: null, bannerTransform: null, instagram: sl.Instagram || "", tiktok: sl.TikTok || "", youtube: sl.YouTube || "", x: sl.X || "", facebook: sl.Facebook || "" }); setShowBrandEdit(true); } },
                  { label: "sign out", action: () => { setShowSettingsMenu(false); onSignOut?.(); } },
                ].map(item => (
                  <div key={item.label} role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }} onClick={item.action} style={{ padding: "10px 14px", borderRadius: 10, fontSize: ".85rem", color: "rgba(255,255,255,.75)", cursor: "pointer", transition: "background .12s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,.06)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    {item.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      {showTray && <NotificationTray notifications={notifications} forRole="brand" onClose={() => setShowTray(false)} onMarkAllRead={() => { onMarkAllNotifsRead?.(); setShowTray(false); }} onViewAll={() => { setShowTray(false); onViewAllNotifications?.(); }} />}

      {/* Banner */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 24px 0", position: "relative" }}>
        <div style={{ width: "100%", aspectRatio: "25/9", maxHeight: 320, borderRadius: 16, overflow: "hidden", background: "linear-gradient(135deg, rgba(100,80,255,.3), rgba(255,80,160,.18))" }}>
          {(user?.bannerPreview || user?.bannerUrl) && <img src={user.bannerPreview || user.bannerUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
        </div>
        <div style={{ position: "absolute", bottom: -48, left: 40, width: 96, height: 96, borderRadius: 18, border: "4px solid #040b15", background: "#1a1f35", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem", fontWeight: 700, fontFamily: "'Monda', system-ui, sans-serif" }}>
          {(user?.logoPreview || user?.logoUrl)
            ? <img src={user.logoPreview || user.logoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : (user?.name || user?.email || "B").charAt(0).toUpperCase()}
        </div>
      </div>

      <div className="nf-dash-content" style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px 80px" }}>
        {/* Profile info */}
        {(() => {
          return (
            <div style={{ paddingTop: 64, marginBottom: 24 }}>
              <div style={{ fontSize: "1.8rem", fontWeight: 700, fontFamily: "'Monda', system-ui, sans-serif", letterSpacing: "-.01em" }}>{(user?.name && user.name !== user?.email) ? user.name : (user?.brandName || (user?.email ? user.email.split("@")[0] : "your brand"))}</div>
              {(() => {
                const hrs = allCampaigns.flatMap(c => (c.reviews || []));
                const ht = hrs.length;
                const ha = ht ? hrs.reduce((s, r) => s + r.rating, 0) / ht : null;
                return (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
                    <div style={{ display: "flex", gap: 1 }}>
                      {[1,2,3,4,5].map(i => <span key={i} style={{ fontSize: ".85rem", color: ha && i <= Math.round(ha) ? "#fbbf24" : "rgba(251,191,36,.18)" }}>★</span>)}
                    </div>
                    {ha && <span style={{ fontSize: ".85rem", fontWeight: 600, color: "#fff" }}>{ha.toFixed(1)}</span>}
                    <span onClick={onViewReviews} style={{ fontSize: ".85rem", opacity: .55, textDecoration: "underline", cursor: "pointer" }}>
                      {ht > 0 ? `${ht} review${ht !== 1 ? "s" : ""}` : "no reviews yet"}
                    </span>
                  </div>
                );
              })()}
              {user?.tagline && <div style={{ fontSize: "1rem", opacity: .55, marginTop: 4 }}>{user.tagline}</div>}
              {user?.location && <div style={{ fontSize: ".9rem", opacity: .35, marginTop: 3 }}>{user.location.split(",").map(s => s.trim()).filter(Boolean).join(", ")}</div>}
              {user?.website && <a href={user.website.startsWith("http") ? user.website : `https://${user.website}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: ".88rem", opacity: .65, color: "rgba(255,255,255,.4)", textDecoration: "underline", display: "inline-block", marginTop: 3 }}>{user.website}</a>}
              {user?.bio && <div style={{ fontSize: ".9rem", opacity: .55, marginTop: 6, lineHeight: 1.6, maxWidth: "min(520px, 100%)" }}>{user.bio}</div>}
              {/* Social links */}
              {(() => {
                const entries = Object.entries(user?.socialLinks || {}).filter(([, url]) => url && String(url).trim());
                if (!entries.length) return null;
                return (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
                    {entries.map(([key, url]) => (
                      <a key={key} href={String(url).startsWith("http") ? url : `https://${url}`} target="_blank" rel="noopener noreferrer"
                        style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.12)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", textDecoration: "none", transition: "border-color .15s, background .15s" }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,.3)"; e.currentTarget.style.background = "rgba(255,255,255,.1)"; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,.12)"; e.currentTarget.style.background = "rgba(255,255,255,.06)"; }}>
                        {PLAT_SVGS_SMALL[key] || <span style={{ fontSize: ".7rem", opacity: .6 }}>{key.charAt(0)}</span>}
                      </a>
                    ))}
                  </div>
                );
              })()}
            </div>
          );
        })()}

        {/* Stats Row — 3 col: active · needs attention · total creators, then reviews */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 8 }}>
          {/* active campaigns */}
          <div className="nf-stat-card">
            <div style={{ fontSize: "1.8rem", fontWeight: 700, fontFamily: "'Monda', system-ui, sans-serif" }}>{allCampaigns.filter(c => ["open","active","shipped","delivered","accepted"].includes(c.stage)).length}</div>
            <div style={{ fontSize: ".72rem", opacity: .35, marginTop: 4 }}>active campaigns</div>
          </div>
          {/* needs attention */}
          {(() => {
            const pendingCount = allCampaigns.reduce((sum, c) => sum + (c.creators?.pending?.length || 0), 0);
            const overdueCount = allCampaigns.reduce((sum, c) => sum + (c.creators?.approved || []).filter(cr => cr.stage === "accepted" && businessDaysSince(cr.acceptedAt) > 3).length, 0);
            const total = pendingCount + overdueCount;
            return (
              <div className="nf-stat-card" style={{ borderColor: total > 0 ? "rgba(255,140,30,.5)" : "rgba(255,255,255,.08)", borderWidth: total > 0 ? 1.5 : 1, animation: total > 0 ? "nf-border-shimmer 2.5s ease-in-out infinite" : "none", cursor: total > 0 ? "pointer" : "default" }} onClick={() => total > 0 && setShowAttentionModal(true)}>
                <div style={{ fontSize: "2rem", fontWeight: 700, fontFamily: "'Monda', system-ui, sans-serif", color: total > 0 ? "rgba(255,140,30,.95)" : "#fff" }}>{total}</div>
                <div style={{ fontSize: ".75rem", opacity: .4, marginTop: 4, textTransform: "lowercase" }}>needs attention</div>
              </div>
            );
          })()}
          {/* Total creators */}
          <div className="nf-stat-card">
            <div style={{ fontSize: "1.8rem", fontWeight: 700, fontFamily: "'Monda', system-ui, sans-serif" }}>{allCampaigns.reduce((sum, c) => sum + (c.creators?.approved?.length || 0) + (c.creators?.pending?.length || 0), 0)}</div>
            <div style={{ fontSize: ".72rem", opacity: .35, marginTop: 4 }}>total creators</div>
          </div>
        </div>

        {/* Scheduled Calls */}
        {(() => {
          // Real signed-in brands only see their own scheduled calls — demo calls are public-only (Item 3).
          const merged = user?.id ? scheduledCalls : { ...DEMO_SCHEDULED_CALLS, ...scheduledCalls };
          const allCalls = Object.entries(merged).flatMap(([key, calls]) => {
            const brand=calls.brandName,campaign=calls.campaignName,creator=calls.creatorName;
            return (Array.isArray(calls) ? calls : [calls]).map(call => ({ ...call, brand, campaign, creator, key }));
          }).filter(c => c.status === "confirmed" || c.status === "pending").sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
          return (
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: "1.1rem", fontWeight: 600, fontFamily: "'Monda', system-ui, sans-serif", marginBottom: 16 }}>scheduled calls</div>
              {allCalls.length === 0 ? (
                <div style={{ padding: "14px 16px", borderRadius: 12, background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.06)", fontSize: ".85rem", opacity: .35 }}>no upcoming calls</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {allCalls.map((call, i) => {
                    const dt = new Date(call.datetime);
                    const dateStr = dt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
                    const timeStr = dt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZoneName: "short" });
                    return (
                      <div key={i} style={{ display: "flex", alignItems: "center", padding: "14px 20px", borderRadius: 14, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.1)" }}>
                        <div style={{ fontWeight: 700, fontSize: ".95rem", color: "#fff", flex: 1 }}>{call.brand} · {call.campaign}</div>
                        <div style={{ fontSize: ".9rem", opacity: .5, marginRight: 20, whiteSpace: "nowrap", minWidth: 220, textAlign: "center" }}>{dateStr} · {timeStr}</div>
                        {call.status === "confirmed" ? (
                          <div style={{ padding: "6px 16px", borderRadius: 20, border: "1px solid rgba(100,255,150,.4)", background: "rgba(100,255,150,.08)", fontSize: ".85rem", fontWeight: 700, color: "rgba(100,255,150,.9)" }}>confirmed</div>
                        ) : (
                          <div style={{ display: "flex", gap: 8 }}>
                            <div style={{ padding: "6px 16px", borderRadius: 20, border: "1px solid rgba(100,255,150,.4)", background: "rgba(100,255,150,.08)", fontSize: ".85rem", fontWeight: 700, color: "rgba(100,255,150,.9)", cursor: "pointer", animation: "nf-confirm-shimmer 2.5s ease-in-out infinite" }}>confirm</div>
                            <div style={{ padding: "6px 16px", borderRadius: 20, border: "1px solid rgba(255,100,100,.3)", background: "rgba(255,100,100,.06)", fontSize: ".85rem", fontWeight: 700, color: "rgba(255,120,120,.8)", cursor: "pointer" }}>decline</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {/* Campaign List */}
        {allCampaigns.length > 0 && <div style={{ fontSize: "1.1rem", fontWeight: 600, fontFamily: "'Monda', system-ui, sans-serif", marginBottom: 16 }}>your campaigns</div>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 420px), 1fr))", gap: 20 }}>
          {allCampaigns.length === 0 ? (
            <div style={{ gridColumn: "1/-1", display: "flex", justifyContent: "center", padding: "60px 0" }}>
              <button className="nf-new-campaign-btn" onClick={onNewCampaign} style={{ padding: "16px 36px", fontSize: "1rem" }}>
                <span style={{ fontSize: "1.4rem", lineHeight: 1 }}>+</span> launch your first campaign
              </button>
            </div>
          ) : (
            allCampaigns.map((c, i) => {
              const isUserCampaign = !String(c.id).startsWith("demo-");
              const approvedCount = c.creators?.approved?.length || 0;
              const pendingCount = c.creators?.pending?.length || 0;
              const spotsLeft = c.spotsTotal != null ? Math.max(0, c.spotsTotal - approvedCount) : null;
              return (
                <div key={c.id || i} className="nf-campaign-card" style={{ position: "relative" }} onClick={() => onSelectCampaign(c)}>
                  <div style={{ position: "relative" }}>
                    <div style={{ height: 150, background: c.imgBg || "#0c1424", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", borderRadius: "20px 20px 0 0" }}>
                      {c.imgUrl ? <img src={c.imgUrl} alt={c.brand} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>}
                    </div>
                    {c.logoUrl ? (
                      <img src={c.logoUrl} alt={c.brand} style={{ position: "absolute", bottom: -41, left: 16, width: 82, height: 82, borderRadius: 14, border: "3px solid rgba(255,255,255,.15)", objectFit: "cover", zIndex: 2 }} />
                    ) : (
                      <div style={{ position: "absolute", bottom: -41, left: 16, width: 82, height: 82, borderRadius: 14, background: "#0c1424", border: "3px solid rgba(255,255,255,.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".65rem", color: "rgba(255,255,255,.5)", zIndex: 2 }}>logo</div>
                    )}
                    {isUserCampaign && (
                      <div onClick={e => { e.stopPropagation(); setEditWarnCampaign(c); }} style={{ position: "absolute", top: 10, right: 10, padding: "5px 12px", borderRadius: 8, fontSize: ".72rem", fontWeight: 600, border: "1px solid rgba(255,255,255,.25)", background: "rgba(0,0,0,.5)", backdropFilter: "blur(10px)", color: "rgba(255,255,255,.8)", cursor: "pointer", zIndex: 3 }}>edit</div>
                    )}
                    {isUserCampaign && c.featured && (
                      <div onClick={async e => { e.stopPropagation(); if (unfeaturingId) return; if (!window.confirm('Remove featured placement? This is non-refundable.')) return; setUnfeaturingId(c.id); await onUnfeature?.(c); setUnfeaturingId(null); }} style={{ position: "absolute", top: 44, right: 10, padding: "5px 12px", borderRadius: 8, fontSize: ".72rem", fontWeight: 600, border: "1px solid rgba(251,191,36,.4)", background: "rgba(0,0,0,.5)", backdropFilter: "blur(10px)", color: "rgba(251,191,36,.95)", cursor: unfeaturingId === c.id ? "wait" : "pointer", zIndex: 3, opacity: unfeaturingId === c.id ? .6 : 1 }}>{unfeaturingId === c.id ? "removing…" : "remove featured"}</div>
                    )}
                    {c._publishing && (
                      <div style={{ position: "absolute", top: 10, left: 10, padding: "5px 12px", borderRadius: 8, fontSize: ".72rem", fontWeight: 600, border: "1px solid rgba(255,200,60,.3)", background: "rgba(0,0,0,.5)", backdropFilter: "blur(10px)", color: "rgba(255,220,140,.9)", zIndex: 3 }}>publishing…</div>
                    )}
                  </div>
                  <div className="nf-campaign-summary" style={{ padding: "12px 16px 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ paddingTop: 34 }}>
                      <div className={c.featured ? "nf-featured-name" : ""} style={{ fontSize: "1.7rem", fontWeight: 700, color: c.featured ? undefined : "#fff", lineHeight: 1.15 }}>{c.brand}</div>
                      <div style={{ fontSize: "1.05rem", opacity: .5, marginTop: 4 }}>{c.campaign}</div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      {spotsLeft != null && (
                        <div style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 10, padding: "6px 12px", fontSize: ".85rem", color: "#fff", fontWeight: 600, whiteSpace: "nowrap", display: "inline-block", marginBottom: 6 }}>
                          {spotsLeft} spots left
                        </div>
                      )}
                      <div style={{ fontSize: ".82rem", opacity: .35, textTransform: "lowercase", letterSpacing: ".03em", marginBottom: 6 }}>available for</div>
                      <div style={{ display: "flex", gap: 5, justifyContent: "flex-end" }}>
                        {(c.platforms || []).map(p => (
                          <div key={p} style={{ width: 34, height: 34, borderRadius: 8, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>{PLAT_SVGS_SMALL[p]}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div style={{ padding: "8px 16px 16px", flex: 1, display: "flex", flexDirection: "column" }}>
                    <div style={{ marginBottom: 0, flex: 1 }}>
                      {[["deadline:", c.deadline]].filter(([,v]) => v).map(([label, val]) => (
                        <div key={label} style={{ display: "flex", gap: 8, padding: "3px 0", fontSize: ".95rem" }}>
                          <div style={{ opacity: .35, minWidth: 105 }}>{label}</div>
                          <div style={{ opacity: .85 }}>{val}</div>
                        </div>
                      ))}
                      {c.deliverables && (
                        <div style={{ display: "flex", gap: 8, padding: "3px 0", fontSize: ".95rem" }}>
                          <div style={{ opacity: .35, minWidth: 105 }}>deliverables:</div>
                          <div style={{ opacity: .85 }}>
                            {Object.entries(c.deliverables).map(([plat, del], idx) => {
                              const abbr = { Instagram: "IG", TikTok: "TT", YouTube: "YT", X: "X", Facebook: "FB" };
                              return <span key={plat}>{idx > 0 ? " · " : ""}{abbr[plat] || plat}: {del}</span>;
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 14, marginTop: 14, borderTop: "1px solid rgba(255,255,255,.08)", minHeight: 68 }}>
                      <div>
                        <div style={{ fontSize: ".85rem", opacity: .4, textTransform: "lowercase", marginBottom: 3 }}>creators get</div>
                        <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "#fff", lineHeight: 1.2 }}>
                          {c.comp || "—"}
                          {c.compType === "product+paid" ? <span style={{ fontSize: ".85rem", fontWeight: 400, opacity: .45, marginLeft: 4 }}>+ product</span> : ""}
                        </div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                        <div style={{ padding: "4px 10px", borderRadius: 20, background: "rgba(100,180,255,.1)", border: "1px solid rgba(100,180,255,.25)", fontSize: ".72rem", fontWeight: 600, color: "rgba(100,180,255,.9)" }}>{approvedCount} creator{approvedCount !== 1 ? "s" : ""}</div>
                        {pendingCount > 0 && <div style={{ padding: "4px 10px", borderRadius: 20, background: "rgba(255,200,60,.08)", border: "1px solid rgba(255,200,60,.25)", fontSize: ".72rem", fontWeight: 600, color: "rgba(255,200,60,.9)" }}>{pendingCount} pending</div>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        {allCampaigns.length > 0 && (
          <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 28, flexWrap: "wrap" }}>
            <button className="nf-new-campaign-btn" onClick={onNewCampaign}>
              <span style={{ fontSize: "1.2rem", lineHeight: 1 }}>+</span> new campaign
            </button>
            <button className="nf-new-campaign-btn" onClick={onNewGig} style={{ borderColor: "rgba(255,255,255,.2)" }}>
              <span style={{ fontSize: "1.2rem", lineHeight: 1 }}>+</span> post a gig
            </button>
          </div>
        )}
        <div style={{ textAlign: "center", padding: "40px 0 8px", fontSize: ".75rem", opacity: .28, fontFamily: "system-ui, sans-serif" }}>
          questions? <a href="mailto:support@nfluenceagency.com" style={{ color: "inherit", textDecoration: "underline", textDecorationColor: "rgba(255,255,255,.25)" }}>support@nfluenceagency.com</a>
        </div>
      </div>

      {/* Brand edit modal */}
      {showBrandEdit && (
        <div role="dialog" aria-modal="true" tabIndex={-1} ref={el => { if (el && !el.__f) { el.__f = true; el.focus(); } }} onKeyDown={e => { if (e.key === 'Escape') { setShowBrandEdit(false); } }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", backdropFilter: "blur(8px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#0a1020", border: "1px solid rgba(255,255,255,.15)", borderRadius: 20, padding: "28px 24px", width: "100%", maxWidth: 460, maxHeight: "88vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontFamily: "'Monda', system-ui, sans-serif", fontSize: "1.1rem", fontWeight: 700, marginBottom: 24 }}>edit profile</div>

            {/* Logo */}
            <div style={{ marginBottom: 24 }}>
              <div style={editLabel}>logo</div>
              {brandEditForm.logoEditing && brandEditForm.logoPreview ? (
                <ImageEditor src={brandEditForm.logoPreview} shape="circle"
                  initialScale={brandEditForm.logoTransform?.scale} initialPos={brandEditForm.logoTransform?.pos}
                  onSave={(t) => setBrandEditForm(p => ({ ...p, logoPreview: t.croppedDataUrl, logoTransform: t, logoEditing: false }))}
                  onCancel={() => setBrandEditForm(p => ({ ...p, logoPreview: null, logoEditing: false, logoTransform: null }))} />
              ) : (
                <label style={{ display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }}>
                  <input type="file" accept="image/*" style={{ display: "none", boxSizing: "border-box" }} onChange={e => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = ev => setBrandEditForm(p => ({ ...p, logoPreview: ev.target.result, logoEditing: true, logoTransform: null })); r.readAsDataURL(f); } }} />
                  <div style={{ width: 64, height: 64, borderRadius: 14, border: "1px dashed rgba(255,255,255,.25)", overflow: "hidden", flexShrink: 0, background: "rgba(255,255,255,.04)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {brandEditForm.logoPreview
                      ? <img src={brandEditForm.logoPreview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>}
                  </div>
                  <div>
                    <div style={{ fontSize: ".8rem", opacity: .4 }}>{brandEditForm.logoPreview ? "click to change logo" : "click to upload brand logo"}</div>
                    {brandEditForm.logoPreview && (
                      <div onClick={e => { e.preventDefault(); setBrandEditForm(p => ({ ...p, logoEditing: true })); }} style={{ fontSize: ".75rem", opacity: .4, marginTop: 6, cursor: "pointer", textDecoration: "underline" }}>reposition</div>
                    )}
                  </div>
                </label>
              )}
            </div>

            {/* Banner */}
            <div style={{ marginBottom: 24 }}>
              <div style={editLabel}>banner</div>
              {brandEditForm.bannerEditing && brandEditForm.bannerPreview ? (
                <ImageEditor src={brandEditForm.bannerPreview} shape="banner"
                  initialScale={brandEditForm.bannerTransform?.scale} initialPos={brandEditForm.bannerTransform?.pos}
                  onSave={(t) => setBrandEditForm(p => ({ ...p, bannerPreview: t.croppedDataUrl, bannerTransform: t, bannerEditing: false }))}
                  onCancel={() => setBrandEditForm(p => ({ ...p, bannerPreview: null, bannerEditing: false, bannerTransform: null }))} />
              ) : (
                <label style={{ display: "block", cursor: "pointer" }}>
                  <input type="file" accept="image/*" style={{ display: "none", boxSizing: "border-box" }} onChange={e => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = ev => setBrandEditForm(p => ({ ...p, bannerPreview: ev.target.result, bannerEditing: true, bannerTransform: null })); r.readAsDataURL(f); } }} />
                  <div style={{ width: "100%", height: 90, borderRadius: 12, border: "1px dashed rgba(255,255,255,.2)", overflow: "hidden", background: "rgba(255,255,255,.03)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                    {brandEditForm.bannerPreview
                      ? <>
                          <img src={brandEditForm.bannerPreview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          <div onClick={e => { e.preventDefault(); setBrandEditForm(p => ({ ...p, bannerEditing: true })); }} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ fontSize: ".82rem", color: "#fff", background: "rgba(0,0,0,.4)", padding: "6px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,.2)" }}>reposition</span>
                          </div>
                        </>
                      : <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                          <span style={{ fontSize: ".75rem", opacity: .35 }}>click to upload banner</span>
                        </div>}
                  </div>
                </label>
              )}
            </div>

            {/* Brand name */}
            <div style={editSection}>
              <div style={editLabel}>brand name</div>
              <input style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,.18)", background: "rgba(0,0,0,.35)", color: "#fff", padding: "9px 12px", fontSize: ".85rem", width: "100%", outline: "none", fontFamily: "system-ui, sans-serif", boxSizing: "border-box" }}
                value={brandEditForm.name || ""} onChange={e => setBrandEditForm(f => ({ ...f, name: e.target.value }))} aria-label="brand name" placeholder="brand name" />
            </div>

            {/* Tagline */}
            <div style={{ marginBottom: 16 }}>
              <div style={editLabel}>tagline</div>
              <input style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,.18)", background: "rgba(0,0,0,.35)", color: "#fff", padding: "9px 12px", fontSize: ".85rem", width: "100%", outline: "none", fontFamily: "system-ui, sans-serif", boxSizing: "border-box" }}
                value={brandEditForm.tagline || ""} onChange={e => setBrandEditForm(f => ({ ...f, tagline: e.target.value }))} aria-label="tagline" placeholder="tagline" maxLength={120} />
            </div>

            {/* Website */}
            <div style={{ marginBottom: 16 }}>
              <div style={editLabel}>website</div>
              <input style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,.18)", background: "rgba(0,0,0,.35)", color: "#fff", padding: "9px 12px", fontSize: ".85rem", width: "100%", outline: "none", fontFamily: "system-ui, sans-serif", boxSizing: "border-box" }}
                value={brandEditForm.website || ""} onChange={e => setBrandEditForm(f => ({ ...f, website: e.target.value }))} aria-label="yoursite.com" placeholder="yoursite.com" />
            </div>

            {/* Country first */}
            <div style={editSection}>
              <div style={editLabel}>location</div>
              <div style={{ position: "relative" }}>
                <select aria-label="country" style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,.18)", background: "rgba(0,0,0,.35)", color: "#fff", padding: "9px 32px 9px 12px", fontSize: ".85rem", width: "100%", outline: "none", fontFamily: "system-ui, sans-serif", appearance: "none", boxSizing: "border-box" }}
                  value={brandEditForm.country || ""} onChange={e => setBrandEditForm(f => ({ ...f, country: e.target.value, state: "" }))}>
                  <option value="">select country</option>
                  {REGION_CODES.map(c => <option key={c} value={c}>{REGION_NAMES[c] || c}</option>)}
                </select>
                <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", opacity: .4 }}>▾</div>
              </div>
            </div>

            {/* City + State — only show if US selected */}
            {brandEditForm.country === "US" && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: ".75rem", opacity: .4, marginBottom: 5 }}>city & state</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,.18)", background: "rgba(0,0,0,.35)", color: "#fff", padding: "9px 12px", fontSize: ".85rem", flex: 1, outline: "none", fontFamily: "system-ui, sans-serif", boxSizing: "border-box" }}
                    value={brandEditForm.city || ""} onChange={e => setBrandEditForm(f => ({ ...f, city: e.target.value }))} aria-label="city" placeholder="city" />
                  <div style={{ position: "relative", flex: 1 }}>
                    <select aria-label="state" style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,.18)", background: "rgba(0,0,0,.35)", color: "#fff", padding: "9px 32px 9px 12px", fontSize: ".85rem", width: "100%", outline: "none", fontFamily: "system-ui, sans-serif", appearance: "none", boxSizing: "border-box" }}
                      value={brandEditForm.state || ""} onChange={e => setBrandEditForm(f => ({ ...f, state: e.target.value }))}>
                      <option value="">state</option>
                      {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", opacity: .4 }}>▾</div>
                  </div>
                </div>
              </div>
            )}

            {brandEditForm.country && brandEditForm.country !== "US" && (
              <div style={{ marginBottom: 14, display: "flex", gap: 8 }}>
                <input style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,.18)", background: "rgba(0,0,0,.35)", color: "#fff", padding: "9px 12px", fontSize: ".85rem", flex: 1, outline: "none", fontFamily: "system-ui, sans-serif", boxSizing: "border-box" }}
                  value={brandEditForm.city || ""} onChange={e => setBrandEditForm(f => ({ ...f, city: e.target.value }))} aria-label="city" placeholder="city" />
                <input style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,.18)", background: "rgba(0,0,0,.35)", color: "#fff", padding: "9px 12px", fontSize: ".85rem", flex: 1, outline: "none", fontFamily: "system-ui, sans-serif", boxSizing: "border-box" }}
                  value={brandEditForm.state || ""} onChange={e => setBrandEditForm(f => ({ ...f, state: e.target.value }))} aria-label="region / province" placeholder="region / province" />
              </div>
            )}

            {/* Industry — multi-select */}
            <div style={editSection}>
              <div style={editLabel}>industry</div>
              <div style={{ fontSize: ".78rem", opacity: .35, marginBottom: 10, marginTop: -2 }}>select all that apply</div>
              <IndustryMultiSelect value={brandEditForm.industries} onChange={inds => setBrandEditForm(f => ({ ...f, industries: inds }))} />
            </div>

            {/* Bio */}
            <div style={editSection}>
              <div style={editLabel}>bio</div>
              <textarea style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,.18)", background: "rgba(0,0,0,.35)", color: "#fff", padding: "9px 12px", fontSize: ".85rem", width: "100%", outline: "none", fontFamily: "system-ui, sans-serif", minHeight: 80, resize: "vertical", boxSizing: "border-box" }}
                value={brandEditForm.bio || ""} onChange={e => setBrandEditForm(f => ({ ...f, bio: e.target.value }))} aria-label="short brand description" placeholder="short brand description" />
            </div>

            {/* Social links */}
            <div style={{ ...editSection, marginBottom: 28 }}>
              <div style={editLabel}>social links</div>
              {[
                { key: "instagram", placeholder: "instagram url" },
                { key: "tiktok", placeholder: "tiktok url" },
                { key: "youtube", placeholder: "youtube url" },
                { key: "x", placeholder: "x url" },
                { key: "facebook", placeholder: "facebook url" },
              ].map(s => (
                <input key={s.key} style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,.18)", background: "rgba(0,0,0,.35)", color: "#fff", padding: "9px 12px", fontSize: ".85rem", width: "100%", outline: "none", fontFamily: "system-ui, sans-serif", boxSizing: "border-box", marginBottom: 8 }}
                  value={brandEditForm[s.key] || ""} onChange={e => setBrandEditForm(f => ({ ...f, [s.key]: e.target.value }))} aria-label={s.placeholder} placeholder={s.placeholder} />
              ))}
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowBrandEdit(false)} style={{ flex: 1, padding: "11px", borderRadius: 12, border: "1px solid rgba(255,255,255,.12)", background: "transparent", color: "rgba(255,255,255,.5)", cursor: "pointer", fontFamily: "system-ui, sans-serif", fontSize: ".9rem" }}>cancel</button>
              <button disabled={profileSaveBusy} onClick={async () => {setProfileSaveBusy(true);setProfileSaveError("");try{ const location = [brandEditForm.city, brandEditForm.state, brandEditForm.country].filter(Boolean).join(", "); const socialLinks = { Instagram: brandEditForm.instagram || "", TikTok: brandEditForm.tiktok || "", YouTube: brandEditForm.youtube || "", X: brandEditForm.x || "", Facebook: brandEditForm.facebook || "" }; await onUpdateUser?.({ ...user, ...brandEditForm, industry: serializeIndustries(brandEditForm.industries), industries: brandEditForm.industries, location, socialLinks }); setShowBrandEdit(false);}catch(error){setProfileSaveError(error.message);}finally{setProfileSaveBusy(false);} }} style={{ flex: 1, padding: "11px", borderRadius: 12, border: "1px solid rgba(255,255,255,.3)", background: "rgba(255,255,255,.08)", color: "#fff", cursor: "pointer", fontFamily: "system-ui, sans-serif", fontSize: ".9rem", fontWeight: 600 }}>save</button>
            </div>
          </div>
        </div>
      )}

      {/* Needs attention modal */}
      {showAttentionModal && (() => {
        const pendingItems = allCampaigns.flatMap(c => (c.creators?.pending || []).map(cr => ({ type: "pending", campaign: c.campaign, brand: c.brand, creator: cr.name })));
        const overdueItems = allCampaigns.flatMap(c => (c.creators?.approved || []).filter(cr => cr.stage === "accepted" && businessDaysSince(cr.acceptedAt) > 3).map(cr => ({ type: "overdue", campaign: c.campaign, brand: c.brand, creator: cr.name, days: businessDaysSince(cr.acceptedAt) })));
        const allItems = [...overdueItems, ...pendingItems];
        return (
          <div role="dialog" aria-modal="true" tabIndex={-1} ref={el => { if (el && !el.__f) { el.__f = true; el.focus(); } }} onKeyDown={e => { if (e.key === 'Escape') { setShowAttentionModal(false); } }} onClick={() => setShowAttentionModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "12px" }}>
            <div onClick={e => e.stopPropagation()} style={{ background: "#0a1322", border: "1px solid rgba(255,255,255,.12)", borderRadius: 24, padding: "28px", maxWidth: 520, width: "100%", maxHeight: "80vh", overflowY: "auto", boxShadow: "0 40px 80px rgba(0,0,0,.6)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <div style={{ fontSize: "1.1rem", fontWeight: 700, fontFamily: "'Monda', system-ui, sans-serif" }}>needs attention</div>
                <div onClick={() => setShowAttentionModal(false)} style={{ cursor: "pointer", width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,.06)", display: "flex", alignItems: "center", justifyContent: "center", opacity: .7 }}><XIcon size={16} /></div>
              </div>
              {allItems.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0", opacity: .3, fontSize: ".9rem" }}>nothing needs attention right now</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {allItems.map((item, i) => (
                    <div key={i} style={{ padding: "14px 16px", borderRadius: 14, background: "rgba(255,255,255,.03)", border: `1px solid ${item.type === "overdue" ? "rgba(255,100,100,.2)" : "rgba(255,200,60,.2)"}`, display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: item.type === "overdue" ? "rgba(255,100,100,.9)" : "rgba(255,200,60,.9)", flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: ".9rem" }}>{item.creator}</div>
                        <div style={{ fontSize: ".78rem", opacity: .4, marginTop: 2 }}>{item.brand} · {item.campaign}</div>
                      </div>
                      <div style={{ padding: "3px 10px", borderRadius: 20, fontSize: ".68rem", fontWeight: 600, background: item.type === "overdue" ? "rgba(255,100,100,.08)" : "rgba(255,200,60,.08)", border: `1px solid ${item.type === "overdue" ? "rgba(255,100,100,.25)" : "rgba(255,200,60,.25)"}`, color: item.type === "overdue" ? "rgba(255,100,100,.9)" : "rgba(255,200,60,.9)", flexShrink: 0 }}>
                        {item.type === "overdue" ? `overdue · ${item.days}d` : "awaiting review"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Edit warning modal */}
      {editWarnCampaign && (() => {
        const hasAccepted = (editWarnCampaign.creators?.approved?.length || 0) > 0;
        return (
          <div role="dialog" aria-modal="true" tabIndex={-1} ref={el => { if (el && !el.__f) { el.__f = true; el.focus(); } }} onKeyDown={e => { if (e.key === 'Escape') { setEditWarnCampaign(null); } }} onClick={() => setEditWarnCampaign(null)} style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", backdropFilter: "blur(10px)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "12px",
          }}>
            <div onClick={e => e.stopPropagation()} style={{
              background: "#0a1322", border: "1px solid rgba(255,255,255,.12)", borderRadius: 24,
              padding: 24, maxWidth: 480, width: "100%", boxShadow: "0 40px 80px rgba(0,0,0,.6)",
            }}>
              <div style={{ fontSize: "1.2rem", fontWeight: 700, fontFamily: "'Monda', system-ui, sans-serif", marginBottom: 8, textTransform: "lowercase" }}>before you edit</div>
              <div style={{ fontSize: ".9rem", opacity: .5, marginBottom: 24, lineHeight: 1.6 }}>most fields are editable anytime. a few things to know:</div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
                {[
                  { icon: "✓", color: "rgba(100,255,150,.8)", text: "campaign name, description, banner, deadline, location, creator cap, products, and requirements are always editable." },
                  { icon: "✓", color: "rgba(100,255,150,.8)", text: "featured placement can be added or removed at any time, even after creators have joined." },
                  hasAccepted && { icon: "⚠", color: "rgba(255,200,60,.8)", text: "platforms and deliverables are locked — creators applied based on these terms and cannot be changed." },
                  hasAccepted && { icon: "⚠", color: "rgba(255,200,60,.8)", text: "compensation type is locked after acceptance and the agreed creator payment cannot be reduced." },
                  !hasAccepted && { icon: "✓", color: "rgba(100,255,150,.8)", text: "no creators have been accepted yet, so all fields including platforms, deliverables, and compensation are editable." },
                ].filter(Boolean).map((item, i) => (
                  <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "12px 16px", borderRadius: 12, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)" }}>
                    <span style={{ color: item.color, flexShrink: 0, fontWeight: 700, marginTop: 1 }}>{item.icon}</span>
                    <span style={{ fontSize: ".85rem", opacity: .7, lineHeight: 1.55 }}>{item.text}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setEditWarnCampaign(null)} style={{
                  flex: 1, padding: "12px", borderRadius: 12, border: "1px solid rgba(255,255,255,.12)",
                  background: "transparent", color: "rgba(255,255,255,.5)", cursor: "pointer",
                  fontSize: ".9rem", fontFamily: "system-ui, sans-serif",
                }}>cancel</button>
                <button onClick={() => { onEditCampaign(editWarnCampaign); setEditWarnCampaign(null); }} style={{
                  flex: 2, padding: "12px", borderRadius: 12, border: "1px solid rgba(255,255,255,.28)",
                  background: "rgba(255,255,255,.08)", color: "#fff", cursor: "pointer",
                  fontSize: ".9rem", fontWeight: 600, fontFamily: "'Monda', system-ui, sans-serif", textTransform: "lowercase",
                }}>got it, edit campaign</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ── Shared message thread renderer (used in both panes) ──

function MessageThread({ campaign, creatorName, messages, onSend, isBrand, compact = false, brandAvatar, creatorAvatar, onBack = null }) {
  const [input, setInput] = useState("");
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { if (!compact) inputRef.current?.focus(); }, [creatorName, compact]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    onSend(text);
    setInput("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const formatTime = (ts) => {
    const d = new Date(ts);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();
    const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    if (isToday) return time;
    if (isYesterday) return `yesterday · ${time}`;
    return `${d.toLocaleDateString([], { month: "short", day: "numeric" })} · ${time}`;
  };

  const formatDateHeader = (ts) => {
    const d = new Date(ts);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return "today";
    const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return "yesterday";
    return d.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
  };

  // Avatars: brand = logoUrl, creator = avatarUrl or pravatar
  const avatarIdx = (name) => {
    let h = 0;
    for (let i = 0; i < (name || "").length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
    return (h % 70) + 1;
  };
  const resolvedCreatorAvatar = creatorAvatar || `https://i.pravatar.cc/100?img=${avatarIdx(creatorName || "")}`;
  const resolvedBrandAvatar = brandAvatar || null;
  const brandFallback = (campaign?.brand || "B").slice(0, 2).toUpperCase();

  const grouped = [];
  let lastDate = null;
  (messages || []).forEach((m) => {
    const d = new Date(m.ts).toDateString();
    if (d !== lastDate) { grouped.push({ type: "date", ts: m.ts }); lastDate = d; }
    grouped.push({ type: "msg", ...m });
  });

  // Group consecutive messages from same sender to only show avatar on last bubble
  const withAvatarFlag = grouped.map((item, i) => {
    if (item.type !== "msg") return item;
    const next = grouped[i + 1];
    const showAvatar = !next || next.type === "date" || next.from !== item.from;
    return { ...item, showAvatar };
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <style>{`
        .nf-msg-input { background: rgba(255,255,255,.05); border: 1.5px solid rgba(255,255,255,.12); border-radius: 22px; color: #fff; padding: 10px 16px; font-size: .9rem; outline: none; resize: none; font-family: system-ui, sans-serif; line-height: 1.5; transition: border-color .12s; width: 100%; box-sizing: border-box; }
        .nf-msg-input:focus { border-color: rgba(255,255,255,.3); }
        .nf-msg-input::placeholder { color: rgba(255,255,255,.28); }
        .nf-msg-send-btn { width: 38px; height: 38px; border-radius: 50%; border: none; background: rgba(255,255,255,.12); color: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all .12s; flex-shrink: 0; }
        .nf-msg-send-btn:disabled { background: rgba(255,255,255,.04); color: rgba(255,255,255,.2); cursor: not-allowed; }
        .nf-msg-send-btn:not(:disabled):hover { background: rgba(255,255,255,.22); transform: scale(1.08); }
        .nf-msg-bubble { animation: nf-msg-in .18s ease-out; }
        @keyframes nf-msg-in { from { opacity:0; transform:translateY(5px) scale(.97); } to { opacity:1; transform:none; } }
      `}</style>

  // Shape: circle for people, rounded-square for brands


      {/* Thread header */}
      <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,.07)", background: "rgba(4,11,21,.85)", backdropFilter: "blur(20px)", flexShrink: 0, display: "flex", alignItems: "center", gap: 12 }}>
        {onBack && <div onClick={onBack} style={{ cursor: "pointer", opacity: .6, fontSize: "1.1rem", flexShrink: 0 }}>←</div>}
        {/* Header avatar */}
        <div style={{ width: 36, height: 36, borderRadius: 10, overflow: "hidden", background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.1)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".65rem", fontWeight: 700, color: "rgba(255,255,255,.5)" }}>
          {isBrand
            ? (resolvedCreatorAvatar ? <img src={resolvedCreatorAvatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (creatorName || "?").charAt(0))
            : (resolvedBrandAvatar ? <img src={resolvedBrandAvatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : brandFallback)
          }
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: ".95rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{isBrand ? creatorName : campaign?.brand}</div>
          <div style={{ fontSize: ".72rem", opacity: .35, marginTop: 2 }}>{campaign?.brand} · {campaign?.campaign}</div>
        </div>
        {campaign?.stage && <div style={{ padding: "3px 10px", borderRadius: 20, fontSize: ".68rem", fontWeight: 600, background: "rgba(100,255,150,.08)", border: "1px solid rgba(100,255,150,.15)", color: "rgba(100,255,150,.7)", flexShrink: 0 }}>{campaign.stage}</div>}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 16px 8px" }}>
        {grouped.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 10 }}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            <div style={{ fontSize: ".88rem", opacity: .25 }}>no messages yet</div>
          </div>
        )}
        {withAvatarFlag.map((item, i) => {
          if (item.type === "date") return (
            <div key={`d${i}`} style={{ textAlign: "center", padding: "14px 0 8px" }}>
              <span style={{ fontSize: ".78rem", fontWeight: 500, color: "rgba(255,255,255,.28)", letterSpacing: ".01em" }}>{formatDateHeader(item.ts)}</span>
            </div>
          );
          const isMe = (isBrand && item.from === "brand") || (!isBrand && item.from === "creator");
          const fromBrand = item.from === "brand";
          const avatarSrc = fromBrand ? resolvedBrandAvatar : resolvedCreatorAvatar;
          const avatarFallback = fromBrand ? brandFallback : (creatorName || "?").charAt(0);

          return (
            <div key={i} className="nf-msg-bubble" style={{ display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start", marginBottom: 2 }}>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 8, flexDirection: isMe ? "row-reverse" : "row" }}>
                {/* Avatar — only on last bubble in a run */}
                <div style={{ width: 30, flexShrink: 0, display: "flex", alignItems: "flex-end" }}>
                  {item.showAvatar && (
                    <div style={{ width: 30, height: 30, borderRadius: 10, overflow: "hidden", background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".65rem", fontWeight: 700, color: "rgba(255,255,255,.5)" }}>
                      {avatarSrc ? <img src={avatarSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : avatarFallback}
                    </div>
                  )}
                </div>
                <div style={{
                  maxWidth: "68%", padding: "10px 14px", lineHeight: 1.55, wordBreak: "break-word",
                  fontSize: ".9rem", color: "#fff",
                  background: isMe ? "rgba(255,255,255,.14)" : "rgba(255,255,255,.07)",
                  border: `1px solid ${isMe ? "rgba(255,255,255,.18)" : "rgba(255,255,255,.09)"}`,
                  borderRadius: 20,
                  borderBottomRightRadius: isMe ? 5 : 20,
                  borderBottomLeftRadius: isMe ? 20 : 5,
                }}>{item.text}</div>
              </div>
              {item.showAvatar && (
                <div style={{ fontSize: ".72rem", color: "rgba(255,255,255,.25)", margin: "3px 0 8px", paddingLeft: isMe ? 0 : 38, paddingRight: isMe ? 38 : 0 }}>{formatTime(item.ts)}</div>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div style={{ padding: "10px 16px 14px", borderTop: "1px solid rgba(255,255,255,.07)", background: "rgba(4,11,21,.9)", backdropFilter: "blur(20px)", flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <textarea ref={inputRef} className="nf-msg-input" value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
            placeholder="message..." rows={1} style={{ maxHeight: 100, overflowY: "auto" }} />
          <button className="nf-msg-send-btn" disabled={!input.trim()} onClick={handleSend}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
// ── MessageInbox (two-pane on desktop, single-pane on mobile) ──

function MessageInbox({ conversations, campaign, onSelectThread, onBack, onSend, allMessages, isBrand, brandAvatar, creatorAvatars = {} }) {
  const [selected, setSelected] = useState(conversations[0] || null);

  const avatarIdx = (name) => {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
    return (h % 70) + 1;
  };

  // On mobile, selecting a thread navigates away; on desktop it updates the right pane
  const handleSelect = (conv) => {
    setSelected(conv);
    if (window.innerWidth < 768) onSelectThread(conv);
  };

  const ConvList = () => (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* List header */}
      <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,.07)", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        <div onClick={onBack} style={{ cursor: "pointer", opacity: .5, fontSize: "1.1rem", transition: "opacity .12s" }}>←</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: "1rem", fontFamily: "'Monda', system-ui, sans-serif" }}>messages</div>
          {campaign && <div style={{ fontSize: ".72rem", opacity: .35, marginTop: 1 }}>{campaign.brand} · {campaign.campaign}</div>}
        </div>
      </div>
      {/* Threads */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 10px" }}>
        {conversations.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 16px", opacity: .25, fontSize: ".85rem" }}>no conversations yet</div>
        )}
        {conversations.map((conv, i) => {
          const lastMsg = conv.messages[conv.messages.length - 1];
          const isActive = selected?.creatorName === conv.creatorName;
          return (
            <div key={i} onClick={() => handleSelect(conv)} style={{ padding: "12px 14px", borderRadius: 12, marginBottom: 4, display: "flex", alignItems: "center", gap: 12, cursor: "pointer", background: isActive ? "rgba(255,255,255,.08)" : "transparent", transition: "background .12s" }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,.04)"; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, flexShrink: 0, overflow: "hidden", border: `1px solid ${isActive ? "rgba(255,255,255,.2)" : "rgba(255,255,255,.08)"}`, background: "rgba(255,255,255,.05)" }}>
                <img src={`https://i.pravatar.cc/100?img=${avatarIdx(conv.creatorName)}`} alt={conv.creatorName} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 6, marginBottom: 3 }}>
                  <div style={{ fontWeight: 600, fontSize: ".88rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{conv.creatorName}</div>
                  <div style={{ fontSize: ".68rem", opacity: .25, flexShrink: 0 }}>{lastMsg ? new Date(lastMsg.ts).toLocaleDateString([], { month: "short", day: "numeric" }) : ""}</div>
                </div>
                <div style={{ fontSize: ".76rem", opacity: .4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {lastMsg ? `${lastMsg.from === "brand" ? "you: " : ""}${lastMsg.text}` : "no messages"}
                </div>
              </div>
              {(conv.unread || 0) > 0 && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(100,200,255,.9)", flexShrink: 0 }} />}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "linear-gradient(180deg, #040b15 0%, #070f1f 100%)", color: "#fff", fontFamily: "system-ui, sans-serif" }}>
      <style>{`
        .nf-msg-layout { display: flex; flex: 1; min-height: 0; }
        .nf-msg-sidebar { width: 300px; min-width: 260px; border-right: 1px solid rgba(255,255,255,.08); display: flex; flex-direction: column; }
        .nf-msg-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
        .nf-msg-empty { flex: 1; display: flex; align-items: center; justify-content: center; opacity: .2; flex-direction: column; gap: 10; }
        @media (max-width: 767px) { .nf-msg-sidebar { width: 100%; border-right: none; } .nf-msg-main { display: none; } }
      `}</style>
      <div className="nf-msg-layout">
        <div className="nf-msg-sidebar">{ConvList()}</div>
        <div className="nf-msg-main">
          {selected && allMessages ? (
            <MessageThread
              campaign={campaign}
              creatorName={selected.creatorName}
              messages={allMessages[selected.creatorName] || selected.messages || []}
              onSend={(text) => onSend?.(selected.creatorName, text)}
              isBrand={isBrand}
              brandAvatar={brandAvatar}
              creatorAvatar={creatorAvatars[selected.creatorName]}
            />
          ) : (
            <div className="nf-msg-empty">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              <div style={{ fontSize: ".88rem" }}>select a conversation</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Messages (mobile thread view — used when navigating directly to a thread) ──

function Messages({ campaign, creatorName, messages, onSend, onBack, isBrand, brandAvatar, creatorAvatar }) {
  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "linear-gradient(180deg, #040b15 0%, #070f1f 100%)", color: "#fff", fontFamily: "system-ui, sans-serif" }}>
      <MessageThread campaign={campaign} creatorName={creatorName} messages={messages} onSend={onSend} isBrand={isBrand} brandAvatar={brandAvatar} creatorAvatar={creatorAvatar} onBack={onBack} />
    </div>
  );
}

// ── CreatorInbox (two-pane on desktop) ──

function CreatorInbox({ conversations, onSelectThread, onBack, onSend, allMessages, creatorAvatar, brandAvatars = {} }) {
  const [selected, setSelected] = useState(conversations[0] || null);

  const handleSelect = (conv) => {
    setSelected(conv);
    if (window.innerWidth < 768) onSelectThread(conv);
  };

  const ConvList = () => (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,.07)", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        <div onClick={onBack} style={{ cursor: "pointer", opacity: .5, fontSize: "1.1rem" }}>←</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: "1rem", fontFamily: "'Monda', system-ui, sans-serif" }}>messages</div>
          <div style={{ fontSize: ".72rem", opacity: .35, marginTop: 1 }}>conversations with brands</div>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 10px" }}>
        {conversations.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 16px", opacity: .25, fontSize: ".85rem" }}>no messages yet</div>
        )}
        {conversations.map((conv, i) => {
          const lastMsg = conv.messages[conv.messages.length - 1];
          const isActive = selected?.key === conv.key;
          return (
            <div key={i} onClick={() => handleSelect(conv)} style={{ padding: "12px 14px", borderRadius: 12, marginBottom: 4, display: "flex", alignItems: "center", gap: 12, cursor: "pointer", background: isActive ? "rgba(255,255,255,.08)" : "transparent", transition: "background .12s" }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,.04)"; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, flexShrink: 0, background: "rgba(255,255,255,.08)", border: `1px solid ${isActive ? "rgba(255,255,255,.2)" : "rgba(255,255,255,.08)"}`, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".72rem", fontWeight: 700, color: "rgba(255,255,255,.6)" }}>
                {brandAvatars[conv.brandName]
                  ? <img src={brandAvatars[conv.brandName]} alt={conv.brandName} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  : conv.brandName?.slice(0,2).toUpperCase() || "??"
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 6, marginBottom: 2 }}>
                  <div style={{ fontWeight: 600, fontSize: ".88rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{conv.brandName}</div>
                  <div style={{ fontSize: ".68rem", opacity: .25, flexShrink: 0 }}>{lastMsg ? new Date(lastMsg.ts).toLocaleDateString([], { month: "short", day: "numeric" }) : ""}</div>
                </div>
                <div style={{ fontSize: ".72rem", opacity: .35, marginBottom: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{conv.campaignName}</div>
                <div style={{ fontSize: ".76rem", opacity: .4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {lastMsg ? `${lastMsg.from === "creator" ? "you: " : ""}${lastMsg.text}` : "no messages yet"}
                </div>
              </div>
              {(conv.unread || 0) > 0 && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(100,200,255,.9)", flexShrink: 0 }} />}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "linear-gradient(180deg, #040b15 0%, #070f1f 100%)", color: "#fff", fontFamily: "system-ui, sans-serif" }}>
      <style>{`
        .nf-msg-layout { display: flex; flex: 1; min-height: 0; }
        .nf-msg-sidebar { width: 300px; min-width: 260px; border-right: 1px solid rgba(255,255,255,.08); display: flex; flex-direction: column; }
        .nf-msg-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
        .nf-msg-empty { flex: 1; display: flex; align-items: center; justify-content: center; opacity: .2; flex-direction: column; gap: 10; }
        @media (max-width: 767px) { .nf-msg-sidebar { width: 100%; border-right: none; } .nf-msg-main { display: none; } }
      `}</style>
      <div className="nf-msg-layout">
        <div className="nf-msg-sidebar">{ConvList()}</div>
        <div className="nf-msg-main">
          {selected && allMessages ? (
            <MessageThread
              campaign={{ brand: selected.brandName, campaign: selected.campaignName }}
              creatorName={selected.key?.split("::")[2] || ""}
              messages={allMessages[selected.key] || selected.messages || []}
              onSend={(text) => onSend?.(selected.key, text)}
              isBrand={false}
              brandAvatar={brandAvatars[selected.brandName]}
              creatorAvatar={creatorAvatar}
            />
          ) : (
            <div className="nf-msg-empty">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              <div style={{ fontSize: ".88rem" }}>select a conversation</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── OnboardingPage ──

// ── CreatorPublicProfile ──

function CreatorPublicProfile({ creator, onBack, onMessage }) {
  const platforms = [
    { key: "Instagram", handle: creator.instagram, count: creator.instagramFollowers, url: "https://instagram.com/" },
    { key: "TikTok",    handle: creator.tiktok,    count: creator.tiktokFollowers,    url: "https://tiktok.com/@" },
    { key: "YouTube",  handle: creator.youtube,    count: creator.youtubeFollowers,   url: "https://youtube.com/@" },
    { key: "X",        handle: creator.x,          count: creator.xFollowers,         url: "https://x.com/" },
  ].filter(p => p.handle);

  const niches = creator.niches ? creator.niches.split(",").map(n => n.trim()).filter(Boolean) : [];
  const completedCount = typeof creator.completedCampaigns === "number" ? creator.completedCampaigns : 0;
  const rating = creator.rating || null;

  // Abbreviate large follower numbers
  const abbrev = (n) => {
    if (!n) return null;
    const str = String(n).replace(/[^0-9.kmb]/gi, "");
    if (/[kmb]/i.test(str)) return str;
    const num = parseFloat(str);
    if (isNaN(num)) return str;
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, "") + "K";
    return String(num);
  };

  return (
    <div style={{ minHeight: "100vh", overflowX: "hidden", background: "radial-gradient(circle at calc(46% + 250px) calc(58% - 175px), rgba(255,255,255,.103) 0%, rgba(255,255,255,.0309) 38%, transparent 52%), linear-gradient(180deg, #040b15 0%, #070f1f 100%)", backgroundColor: "#040b15", color: "#fff", fontFamily: "system-ui, sans-serif" }}>
      <style>{`
        @font-face { font-family:'Monda'; src:url('/assets/Monda-Regular.woff') format('woff'); font-weight:400 700; font-display:swap; }
        * { box-sizing:border-box; margin:0; padding:0; }
        .cpp-back { opacity:.5; transition:opacity .15s; cursor:pointer; }
        .cpp-back:hover { opacity:1; }
        .cpp-plat-card { background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12); border-radius:16px; padding:18px 20px; display:flex; flex-direction:column; justify-content:space-between; aspect-ratio:1; text-decoration:none; color:#fff; transition:transform .2s, border-color .2s, box-shadow .2s; }
        .cpp-plat-card:hover { transform:translateY(-3px); border-color:rgba(255,255,255,.2); box-shadow:0 10px 30px rgba(0,0,0,.35); }
        .cpp-msg-btn { transition:transform .12s, border-color .2s, box-shadow .2s, background .2s; cursor:pointer; }
        .cpp-msg-btn:hover { transform:translateY(-2px); border-color:rgba(255,255,255,.55) !important; box-shadow:0 0 18px rgba(255,255,255,.12) !important; background:rgba(255,255,255,.12) !important; }
        .cpp-niche { padding:5px 14px; border-radius:20px; background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.1); font-size:.78rem; color:rgba(255,255,255,.65); }
      `}</style>

      {/* Back */}
      <div className="cpp-back" style={{ padding: "16px 24px", fontSize: ".85rem", display: "inline-flex", alignItems: "center", gap: 6 }} onClick={onBack}>
        <span style={{ fontSize: "1.1rem" }}>←</span> back
      </div>

      {/* Banner */}
      <div style={{ width: "100%", maxWidth: 800, margin: "0 auto", position: "relative" }}>
        <div style={{ width: "100%", height: "clamp(140px, 30vw, 260px)", borderRadius: 16, overflow: "hidden", background: creator.bannerUrl ? undefined : "linear-gradient(135deg, rgba(100,80,255,.25), rgba(255,80,160,.15))" }}>
          {creator.bannerUrl && <img src={creator.bannerUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />}
        </div>
        {/* Avatar */}
        <div style={{ position: "absolute", bottom: -55, left: 28, width: 110, height: 110, borderRadius: 18, border: "4px solid rgba(255,255,255,.15)", background: "#0c1424", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem", fontWeight: 700 }}>
          {creator.avatarUrl
            ? <img src={creator.avatarUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
            : (creator.name || "?").charAt(0).toUpperCase()
          }
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "68px 16px 80px" }}>

        {/* Header row */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: "clamp(1.4rem, 4vw, 2rem)", fontWeight: 700, fontFamily: "'Monda', system-ui, sans-serif", textTransform: "lowercase", letterSpacing: "-.01em", overflowWrap: "break-word", minWidth: 0 }}>
            {creator.name || "creator"}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, fontSize: ".88rem", opacity: .5, marginTop: 10 }}>
            {creator.location && <span>{creator.location}</span>}
            {creator.age && <span>· {creator.age} yrs</span>}
            {creator.languages && <span>· {creator.languages}</span>}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, marginTop: 8 }}>
            {rating
              ? <span style={{ color: "#fbbf24", fontSize: ".95rem" }}>{"★".repeat(Math.round(rating))}{"☆".repeat(5 - Math.round(rating))}</span>
              : <span style={{ color: "rgba(255,255,255,.2)", fontSize: ".95rem" }}>☆☆☆☆☆</span>
            }
            <span style={{ fontSize: ".85rem", opacity: .5 }}>
              {rating
                ? `${rating.toFixed(1)}${completedCount > 0 ? ` · ${completedCount} campaign${completedCount !== 1 ? "s" : ""} completed` : ""}`
                : "(0 reviews)"}
            </span>
          </div>
        </div>

        {/* Bio */}
        {creator.bio && (
          <div style={{ fontSize: ".95rem", opacity: .5, marginTop: 10, lineHeight: 1.6 }}>
            {creator.bio}
          </div>
        )}

        {/* Niches */}
        {niches.length > 0 && (
          <div style={{ fontSize: ".85rem", opacity: .5, marginBottom: 20, marginTop: 6 }}>
            {niches.join(", ")}
          </div>
        )}

        {/* Platform cards — 2-col grid */}
        {platforms.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: ".72rem", opacity: .35, textTransform: "lowercase", letterSpacing: ".06em", fontFamily: "'Monda', system-ui, sans-serif", marginBottom: 12 }}>platforms</div>
            <div className="nf-plat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10 }}>
              <style>{`.nf-plat-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } @media(max-width:600px){ .nf-plat-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; } }`}</style>
              {platforms.map(p => {
                const handle = p.handle.startsWith("@") ? p.handle : "@" + p.handle;
                const href = p.url + handle.replace("@", "");
                const count = abbrev(p.count);
                return (
                  <a key={p.key} href={href} target="_blank" rel="noopener noreferrer" className="cpp-plat-card">
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(255,255,255,.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {PLAT_SVGS_SMALL[p.key]}
                      </div>
                      {count && (
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#fff", lineHeight: 1 }}>{count}</div>
                          <div style={{ fontSize: ".7rem", color: "rgba(255,255,255,.35)", marginTop: 2 }}>followers</div>
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: ".85rem", color: "rgba(255,255,255,.6)" }}>{handle}</div>
                  </a>
                );
              })}
            </div>
          </div>
        )}



        {/* Message CTA */}
        {onMessage && (
          <div className="cpp-msg-btn" onClick={onMessage} style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            width: "100%", padding: "16px 28px", borderRadius: 16,
            fontFamily: "'Monda', system-ui, sans-serif", textTransform: "lowercase",
            fontSize: "1rem", fontWeight: 600,
            background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.2)",
            color: "rgba(255,255,255,.8)", cursor: "pointer",
            boxShadow: "0 10px 28px rgba(0,0,0,.2)",
          }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            send a message
          </div>
        )}

      </div>
    </div>
  );
}

// ── Notifications ──

const NOTIF_ICONS = {
  new_application:      { icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>', color: "rgba(100,180,255,.9)" },
  content_submitted:    { icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>', color: "rgba(255,160,50,.9)" },
  call_confirmed:       { icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>', color: "rgba(100,255,150,.9)" },
  call_declined:        { icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>', color: "rgba(255,100,100,.8)" },
  application_accepted: { icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>', color: "rgba(100,255,150,.9)" },
  application_rejected: { icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>', color: "rgba(255,100,100,.8)" },
  product_shipped:      { icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>', color: "rgba(185,110,255,.9)" },
  call_scheduled:       { icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>', color: "rgba(100,180,255,.9)" },
  content_approved:     { icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>', color: "rgba(180,255,80,.9)" },
  message_received:     { icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>', color: "rgba(255,255,255,.7)" },
};

function relativeTime(ts) {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString([], { month: "short", day: "numeric" });
}

function NotificationBell({ notifications, onOpen }) {
  const unread = notifications.filter(n => !n.read).length;
  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
      <div onClick={onOpen} style={{ cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,.05)", border: unread > 0 ? "1.5px solid rgba(255,140,30,.8)" : "1px solid rgba(255,255,255,.1)", transition: "all .15s", position: "relative", animation: unread > 0 ? "nf-notif-pulse 2.5s ease-in-out infinite" : "none" }}
        onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,.1)"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,.05)"; }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.7)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {unread > 0 && (
          <div style={{
            position: "absolute", top: -5, right: -5,
            width: 18, height: 18, borderRadius: "50%",
            background: "rgba(255,140,30,1)", border: "2px solid #040b15",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: ".6rem", fontWeight: 700, color: "#000",
            animation: "nf-notif-pulse 2.5s ease-in-out infinite",
          }}>{unread > 9 ? "9+" : unread}</div>
        )}
      </div>
    </div>
  );
}

function NotificationTray({ notifications, onClose, onMarkAllRead, onViewAll, forRole }) {
  const filtered = notifications.filter(n => n.for === forRole);
  const unread = filtered.filter(n => !n.read);
  const recent = filtered.slice(0, 12);
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 998 }} />
      <div style={{
        position: "fixed", top: 68, right: 16, width: "min(380px, calc(100vw - 32px))",
        background: "#0c1525", border: "1px solid rgba(255,255,255,.14)",
        borderRadius: 18, zIndex: 999,
        boxShadow: "0 24px 60px rgba(0,0,0,.6), 0 0 0 1px rgba(255,255,255,.04)",
        overflow: "hidden", animation: "nf-tray-in .18s ease-out",
      }}>
        <style>{`
          @keyframes nf-tray-in { from { opacity:0; transform:translateY(-8px) scale(.98); } to { opacity:1; transform:none; } }
          @keyframes nf-notif-pulse { 0%,100% { box-shadow:0 0 0 0 rgba(255,140,30,.15); } 50% { box-shadow:0 0 0 6px rgba(255,140,30,0); } }
          .nf-notif-row { transition: background .12s; cursor: default; }
          .nf-notif-row:hover { background: rgba(255,255,255,.04) !important; }
        `}</style>
        <div style={{ padding: "16px 18px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,.07)" }}>
          <div style={{ fontWeight: 700, fontSize: ".95rem", fontFamily: "'Monda', system-ui, sans-serif" }}>notifications</div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {unread.length > 0 && <div onClick={onMarkAllRead} style={{ fontSize: ".72rem", color: "rgba(100,180,255,.8)", cursor: "pointer" }}>mark all read</div>}
            <div onClick={onClose} style={{ cursor: "pointer", opacity: .4, fontSize: "1rem", lineHeight: 1 }}><XIcon size={14} /></div>
          </div>
        </div>
        <div style={{ maxHeight: 420, overflowY: "auto" }}>
          {recent.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center", opacity: .3, fontSize: ".88rem" }}>no notifications yet</div>
          ) : recent.map((n, i) => {
            const meta = NOTIF_ICONS[n.type] || { icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>', color: "rgba(255,255,255,.6)" };
            return (
              <div key={n.id} className="nf-notif-row" style={{
                padding: "13px 18px", display: "flex", gap: 12, alignItems: "flex-start",
                background: n.read ? "transparent" : "rgba(255,140,30,.04)",
                borderBottom: i < recent.length - 1 ? "1px solid rgba(255,255,255,.05)" : "none",
              }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,.06)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: meta.color }} dangerouslySetInnerHTML={{ __html: meta.icon }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: ".85rem", fontWeight: n.read ? 400 : 600, color: n.read ? "rgba(255,255,255,.6)" : "#fff", marginBottom: 2 }}>{n.title}</div>
                  <div style={{ fontSize: ".75rem", opacity: .45, lineHeight: 1.4 }}>{n.body}</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                  <div style={{ fontSize: ".68rem", opacity: .3 }}>{relativeTime(n.ts)}</div>
                  {!n.read && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(255,140,30,.9)" }} />}
                </div>
              </div>
            );
          })}
        </div>
        {filtered.length > 0 && (
          <div onClick={onViewAll} style={{ padding: "12px 18px", borderTop: "1px solid rgba(255,255,255,.07)", textAlign: "center", fontSize: ".78rem", color: "rgba(100,180,255,.7)", cursor: "pointer" }}>
            view all notifications →
          </div>
        )}
      </div>
    </>
  );
}

function NotificationsPage({ notifications, forRole, onBack, onMarkAllRead, onMarkRead }) {
  const [filter, setFilter] = useState("all");
  const filtered = notifications
    .filter(n => n.for === forRole)
    .filter(n => filter === "all" || (filter === "unread" && !n.read));
  const typeLabels = {
    new_application: "new application", content_submitted: "content submitted",
    call_confirmed: "call confirmed", call_declined: "call declined",
    application_accepted: "accepted", application_rejected: "rejected",
    product_shipped: "product shipped", call_scheduled: "call scheduled",
    content_approved: "content approved", message_received: "message",
  };
  return (
    <div style={{ minHeight: "100vh", overflowX: "hidden", background: "linear-gradient(180deg, #040b15 0%, #070f1f 100%)", color: "#fff", fontFamily: "system-ui, sans-serif" }}>
      <style>{`
        @keyframes nf-notif-pulse { 0%,100%{box-shadow:0 0 0 0 rgba(255,140,30,.15);}50%{box-shadow:0 0 0 6px rgba(255,140,30,0);} }
        .nf-notif-full-row { transition: background .12s; cursor: pointer; }
        .nf-notif-full-row:hover { background: rgba(255,255,255,.03) !important; }
        .nf-notif-filter { padding:6px 16px; border-radius:20px; font-size:.8rem; cursor:pointer; transition:all .12s; border:1px solid transparent; }
        .nf-notif-filter.active { background:rgba(255,255,255,.1); border-color:rgba(255,255,255,.2); color:#fff; }
        .nf-notif-filter:not(.active) { color:rgba(255,255,255,.4); }
        .nf-notif-filter:not(.active):hover { color:rgba(255,255,255,.7); }
      `}</style>
      <div style={{ padding: "16px 24px", display: "flex", alignItems: "center", gap: 14, borderBottom: "1px solid rgba(255,255,255,.08)" }}>
        <div onClick={onBack} style={{ cursor: "pointer", opacity: .6, fontSize: "1.1rem" }}>←</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: "1.1rem", fontFamily: "'Monda', system-ui, sans-serif" }}>notifications</div>
          <div style={{ fontSize: ".75rem", opacity: .35, marginTop: 2 }}>{notifications.filter(n => n.for === forRole && !n.read).length} unread</div>
        </div>
        {notifications.some(n => n.for === forRole && !n.read) && (
          <div onClick={onMarkAllRead} style={{ fontSize: ".78rem", color: "rgba(100,180,255,.8)", cursor: "pointer", padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(100,180,255,.2)", background: "rgba(100,180,255,.06)" }}>mark all read</div>
        )}
      </div>
      <div style={{ padding: "12px 24px", display: "flex", gap: 8, borderBottom: "1px solid rgba(255,255,255,.06)" }}>
        {["all", "unread"].map(f => (
          <div key={f} className={`nf-notif-filter${filter === f ? " active" : ""}`} onClick={() => setFilter(f)}>{f}</div>
        ))}
      </div>
      <div style={{ maxWidth: 700, margin: "0 auto", padding: "8px 16px 80px" }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", opacity: .3, fontSize: ".9rem" }}>
            {filter === "unread" ? "all caught up!" : "no notifications yet"}
          </div>
        ) : filtered.map((n) => {
          const meta = NOTIF_ICONS[n.type] || { icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>', color: "rgba(255,255,255,.6)" };
          const borderCol = meta.color.replace(/[\d.]+\)$/, "0.25)");
          return (
            <div key={n.id} className="nf-notif-full-row" onClick={() => onMarkRead?.(n.id)} style={{
              padding: "16px 14px", display: "flex", gap: 14, alignItems: "flex-start",
              background: n.read ? "transparent" : "rgba(255,140,30,.04)",
              borderRadius: 12, marginBottom: 4,
              borderLeft: n.read ? "3px solid transparent" : "3px solid rgba(255,140,30,.6)",
            }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,.06)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: meta.color }} dangerouslySetInnerHTML={{ __html: meta.icon }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                  <div style={{ fontSize: ".9rem", fontWeight: n.read ? 400 : 600, color: n.read ? "rgba(255,255,255,.65)" : "#fff" }}>{n.title}</div>
                  <div style={{ fontSize: ".65rem", padding: "2px 8px", borderRadius: 10, background: "rgba(255,255,255,.06)", color: meta.color, border: `1px solid ${borderCol}`, whiteSpace: "nowrap" }}>
                    {typeLabels[n.type] || n.type}
                  </div>
                </div>
                <div style={{ fontSize: ".82rem", opacity: .5, lineHeight: 1.5 }}>{n.body}</div>
                <div style={{ fontSize: ".7rem", opacity: .3, marginTop: 6 }}>{new Date(n.ts).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NotificationToast({ message, onView, onDismiss }) {
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 1200,
      background: "#0c1525", border: "1px solid rgba(255,140,30,.4)",
      borderRadius: 14, padding: "14px 18px",
      display: "flex", alignItems: "center", gap: 12,
      boxShadow: "0 16px 48px rgba(0,0,0,.55), 0 0 0 1px rgba(255,140,30,.1)",
      animation: "nf-toast-in .25s ease-out", maxWidth: 320,
    }}>
      <style>{`@keyframes nf-toast-in { from{opacity:0;transform:translateY(16px) scale(.97);}to{opacity:1;transform:none;} }`}</style>
      <div style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.8)" strokeWidth="1.8" strokeLinecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: ".85rem", fontWeight: 600, color: "#fff", marginBottom: 2 }}>{message}</div>
        <div style={{ fontSize: ".72rem", opacity: .45 }}>tap the bell to see more</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
        <div onClick={onView} style={{ padding: "4px 12px", borderRadius: 8, background: "rgba(255,140,30,.15)", border: "1px solid rgba(255,140,30,.35)", fontSize: ".72rem", fontWeight: 600, color: "rgba(255,160,50,.95)", cursor: "pointer" }}>view</div>
        <div onClick={onDismiss} style={{ padding: "4px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,.1)", fontSize: ".72rem", color: "rgba(255,255,255,.4)", cursor: "pointer", textAlign: "center" }}>ok</div>
      </div>
    </div>
  );
}

// ── BrowseCampaigns ──

// ── BrandProfile ──

function BrandProfile({ brand, allCampaigns, onBack, onSelectCampaign, appliedCampaigns = [], onApplyClick, user }) {
  const campaigns = allCampaigns.filter(c => c.brand === brand);
  const firstCampaign = campaigns[0] || {};
  const meta = firstCampaign.isDemo ? DEMO_BRAND_META[brand] || {} : {};

  // Aggregate reviews across all campaigns
  const allReviews = campaigns.flatMap(c => (c.reviews || []).map(r => ({ ...r, _campaign: c.campaign })));
  const avgRating = allReviews.length ? (allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length) : null;

  const [activeTab, setActiveTab] = useState("campaigns"); // campaigns | reviews

  const StarRow = ({ rating, size = ".85rem" }) => (
    <div style={{ display: "flex", gap: 2 }}>
      {[1,2,3,4,5].map(i => {
        const filled = i <= Math.floor(rating);
        const half = !filled && i === Math.ceil(rating) && rating % 1 >= 0.5;
        return <span key={i} style={{ fontSize: size, color: filled || half ? "#fbbf24" : "rgba(251,191,36,.2)" }}>★</span>;
      })}
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", overflowX: "hidden", background: "radial-gradient(circle at calc(46% + 250px) calc(58% - 175px), rgba(255,255,255,.103) 0%, rgba(255,255,255,.0309) 38%, transparent 52%), linear-gradient(180deg, #040b15 0%, #070f1f 100%)", backgroundColor: "#040b15", color: "#fff", fontFamily: "system-ui, sans-serif" }}>
      <style>{`
        @font-face { font-family:'Monda'; src:url('/assets/Monda-Regular.woff') format('woff'); font-weight:400 700; font-display:swap; }
        * { box-sizing:border-box; margin:0; padding:0; }
        .bp-back { opacity:.5; transition:opacity .15s; cursor:pointer; }
        .bp-back:hover { opacity:1; }
        .bp-tab { display: inline-flex; align-items: center; justify-content: center; min-height: 44px; box-sizing: border-box;padding:10px 20px; border-radius:20px; font-size:.88rem; cursor:pointer; transition:all .15s; border:1px solid transparent; }
        .bp-tab.active { background:rgba(255,255,255,.1); border-color:rgba(255,255,255,.2); color:#fff; }
        .bp-tab:not(.active) { color:rgba(255,255,255,.4); }
        .bp-tab:not(.active):hover { color:rgba(255,255,255,.7); }
        .bp-card { background:radial-gradient(circle at top, rgba(255,255,255,.045), rgba(4,11,21,0)); border:1px solid rgba(255,255,255,.12); border-radius:20px; overflow:hidden; cursor:pointer; display:flex; flex-direction:column; transition:transform .25s, box-shadow .25s, border-color .25s; }
        .bp-card:hover { transform:translateY(-4px) scale(1.01); box-shadow:0 28px 65px rgba(0,0,0,.5); border-color:rgba(255,255,255,.25); }
        .bp-apply-btn { transition:transform .12s, border-color .2s, box-shadow .2s, background .2s; cursor:pointer; }
        .bp-apply-btn:hover { border-color:rgba(255,255,255,.55) !important; box-shadow:0 0 14px rgba(255,255,255,.15) !important; background:rgba(255,255,255,.1) !important; transform:translateY(-1px); }
        .nf-featured-name { background:linear-gradient(90deg,#fbbf24,#fde68a,#f59e0b,#fbbf24); background-size:200% auto; -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; animation:nf-gold-shimmer 3s linear infinite; }
        @keyframes nf-gold-shimmer { to { background-position:200% center; } }
      `}</style>

      {/* Back */}
      <div className="bp-back" style={{ padding: "16px 24px", fontSize: ".85rem", display: "inline-flex", alignItems: "center", gap: 6 }} onClick={onBack}>
        <span style={{ fontSize: "1.1rem" }}>←</span> back
      </div>

      {/* Banner */}
      <div style={{ width: "100%", maxWidth: 860, margin: "0 auto", position: "relative" }}>
        <div style={{ width: "100%", aspectRatio: "25/9", background: "#0c1424", overflow: "hidden", borderRadius: 16 }}>
          {firstCampaign.imgUrl && <img src={firstCampaign.imgUrl} alt={brand} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "brightness(.6)" }} />}
        </div>
        {/* Logo */}
        <div style={{ position: "absolute", bottom: -52, left: 28 }}>
          {firstCampaign.logoUrl ? (
            <img src={firstCampaign.logoUrl} alt={brand} style={{ width: 104, height: 104, borderRadius: 14, border: "4px solid #040b15", objectFit: "cover" }} />
          ) : (
            <div style={{ width: 104, height: 104, borderRadius: 14, background: "#0c1424", border: "4px solid #040b15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".75rem", opacity: .5 }}>logo</div>
          )}
        </div>
      </div>

      {/* Profile header */}
      {(() => {
        const tagline = meta.tagline || firstCampaign.tagline;
        const location = meta.location || firstCampaign.location;
        const bio = meta.bio || firstCampaign.bio;
        const website = meta.website || firstCampaign.website;
        const socials = firstCampaign.socialLinks || firstCampaign.socials || meta.socials || user?.socialLinks || {};
        const socialEntries = Object.entries(socials).filter(([, url]) => url && String(url).trim());
        return (
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "64px 16px 0" }}>
        {firstCampaign.isDemo && <aside className="nf-demo-notice"><strong>demo brand profile</strong><p>The campaign activity and reviews on this example profile are sample data.</p></aside>}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: "clamp(1.4rem, 4vw, 2rem)", fontWeight: 700, fontFamily: "'Monda', system-ui, sans-serif", marginBottom: 4 }}>{brand}</div>
            {tagline && <div style={{ fontSize: "1rem", opacity: .4, fontStyle: "italic" }}>{tagline}</div>}
            {location && <div style={{ fontSize: ".88rem", opacity: .5, marginTop: 6 }}>{location}</div>}
          </div>
          {/* Rating badge */}
          {avgRating && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
              <StarRow rating={avgRating} size="1rem" />
              <div style={{ fontSize: ".82rem", opacity: .4 }}>{avgRating.toFixed(1)} · {allReviews.length} review{allReviews.length !== 1 ? "s" : ""}</div>
            </div>
          )}
        </div>

        {/* Meta row */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 20, fontSize: ".85rem", opacity: .45 }}>
          {website && <a href={website.startsWith("http") ? website : `https://${website}`} target="_blank" rel="noopener noreferrer" style={{ color: "#fff", textDecoration: "none", borderBottom: "1px solid rgba(255,255,255,.25)" }}>{website.replace(/^https?:\/\//, "")}</a>}
          {meta.founded && <span>est. {meta.founded}</span>}
          {meta.totalCampaigns && <span>{meta.totalCampaigns} campaigns run</span>}
          {meta.totalCreators && <span>{meta.totalCreators.toLocaleString()} creators worked with</span>}
        </div>

        {/* Bio */}
        {bio && (
          <div style={{ fontSize: ".95rem", lineHeight: 1.7, opacity: .65, marginBottom: 20, maxWidth: 620 }}>{bio}</div>
        )}

        {/* Social links */}
        {socialEntries.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 28 }}>
            {socialEntries.map(([key, url]) => (
              <a key={key} href={String(url).startsWith("http") ? url : `https://${url}`} target="_blank" rel="noopener noreferrer"
                style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.12)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", textDecoration: "none", transition: "border-color .15s, background .15s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,.3)"; e.currentTarget.style.background = "rgba(255,255,255,.1)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,.12)"; e.currentTarget.style.background = "rgba(255,255,255,.06)"; }}>
                {PLAT_SVGS_SMALL[key] || <span style={{ fontSize: ".7rem", opacity: .6 }}>{key.charAt(0)}</span>}
              </a>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 28, borderBottom: "1px solid rgba(255,255,255,.08)", paddingBottom: 16 }}>
          <div className={`bp-tab${activeTab === "campaigns" ? " active" : ""}`} onClick={() => setActiveTab("campaigns")}>
            campaigns ({campaigns.length})
          </div>
          <div className={`bp-tab${activeTab === "reviews" ? " active" : ""}`} onClick={() => setActiveTab("reviews")}>
            reviews ({allReviews.length})
          </div>
        </div>

        {/* Campaigns tab */}
        {activeTab === "campaigns" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 420px), 1fr))", gap: 20, paddingBottom: 60 }}>
            {campaigns.map((c, i) => {
              const spotsLeft = c.spotsTotal != null ? Math.max(0, c.spotsTotal - Math.max(c.spotsFilled || 0, c.creators?.approved?.length || 0)) : null;
              const applied = appliedCampaigns.includes(c.id);
              return (
                <div key={i} className="bp-card" onClick={() => onSelectCampaign(c)}>
                  {/* Banner */}
                  <div style={{ position: "relative" }}>
                    <div style={{ height: 140, background: c.imgBg || "#0c1424", overflow: "hidden" }}>
                      {c.imgUrl && <img src={c.imgUrl} alt={c.campaign} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                    </div>
                    {spotsLeft !== null && (
                      <div style={{ position: "absolute", top: 10, right: 10, padding: "4px 10px", borderRadius: 8, background: "rgba(0,0,0,.55)", backdropFilter: "blur(8px)", fontSize: ".72rem", fontWeight: 600, border: "1px solid rgba(255,255,255,.15)" }}>
                        {spotsLeft} spots left
                      </div>
                    )}
                  </div>
                  {/* Info */}
                  <div style={{ padding: "14px 16px 16px", flex: 1, display: "flex", flexDirection: "column" }}>
                    <div className={c.featured ? "nf-featured-name" : ""} style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 3 }}>{c.campaign}</div>
                    <div style={{ fontSize: ".82rem", opacity: .4, marginBottom: 12 }}>{c.location}</div>
                    <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                      {(c.platforms || []).map(p => (
                        <div key={p} style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>{PLAT_SVGS_SMALL[p]}</div>
                      ))}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto", paddingTop: 12, borderTop: "1px solid rgba(255,255,255,.06)" }}>
                      <div>
                        <div style={{ fontSize: ".72rem", opacity: .35, marginBottom: 2 }}>creators get</div>
                        <div style={{ fontSize: "1.3rem", fontWeight: 700 }}>{c.comp}</div>
                      </div>
                      {applied ? (
                        <div style={{ padding: "7px 14px", borderRadius: 10, border: "1px solid rgba(100,255,150,.2)", fontSize: ".8rem", fontWeight: 600, color: "rgba(100,255,150,.8)", display: "flex", alignItems: "center", gap: 5 }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(100,255,150,.85)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                          applied
                        </div>
                      ) : (
                        <div className="bp-apply-btn" onClick={e => { e.stopPropagation(); onApplyClick?.(c); }} style={{ padding: "8px 18px", borderRadius: 10, border: "1px solid rgba(255,255,255,.25)", fontSize: ".88rem", fontWeight: 600, color: "#fff", background: "rgba(255,255,255,.06)" }}>
                          apply
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Reviews tab */}
        {activeTab === "reviews" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingBottom: 60 }}>
            {/* Summary */}
            {avgRating && (
              <div style={{ display: "flex", alignItems: "center", gap: 24, padding: "20px 24px", borderRadius: 16, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)", marginBottom: 8 }}>
                <div style={{ textAlign: "center" }}>
                  <div className="nf-gold-shimmer" style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", fontWeight: 700, fontFamily: "'Monda', system-ui, sans-serif", lineHeight: 1 }}>{avgRating.toFixed(1)}</div>
                  <StarRow rating={avgRating} size="1.1rem" />
                  <div style={{ fontSize: ".75rem", opacity: .35, marginTop: 4 }}>{allReviews.length} reviews</div>
                </div>
                <div style={{ flex: 1 }}>
                  {[5,4,3,2,1].map(star => {
                    const count = allReviews.filter(r => r.rating === star).length;
                    const pct = allReviews.length ? (count / allReviews.length) * 100 : 0;
                    return (
                      <div key={star} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 5 }}>
                        <span style={{ fontSize: ".75rem", opacity: .4, minWidth: 8 }}>{star}</span>
                        <span style={{ color: "#fbbf24", fontSize: ".75rem" }}>★</span>
                        <div style={{ flex: 1, height: 6, borderRadius: 3, background: "rgba(255,255,255,.08)", overflow: "hidden" }}>
                          <div style={{ width: `${pct}%`, height: "100%", borderRadius: 3, background: "#fbbf24", transition: "width .4s" }} />
                        </div>
                        <span style={{ fontSize: ".72rem", opacity: .3, minWidth: 16, textAlign: "right" }}>{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Review cards */}
            {allReviews.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)).map((r, i) => (
              <div key={i} style={{ padding: "18px 22px", borderRadius: 16, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: ".95rem", marginBottom: 4 }}>{r.creator}</div>
                    <StarRow rating={r.rating} />
                  </div>
                  <div style={{ fontSize: ".72rem", opacity: .3 }}>{r._campaign}</div>
                </div>
                <div style={{ fontSize: ".9rem", opacity: .7, lineHeight: 1.6 }}>{r.text}</div>
                {r.brandResponse && (
                  <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.06)", fontSize: ".82rem", opacity: .6, lineHeight: 1.5 }}>
                    <span style={{ opacity: .5, marginRight: 6 }}>brand reply:</span>{r.brandResponse}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
        );
      })()}
    </div>
  );
}

// ── BrowseCampaigns ──

function BrowseCampaigns({ loading = false, error = null, onRetry, campaigns = DEMO_CAMPAIGNS, onBack, onSelectCampaign, onApplyClick, appliedCampaigns = [], onFaq, onSignIn, user, creatorUser }) {
  const [search, setSearch] = useState("");
  const [filterPlatform, setFilterPlatform] = useState("All");
  const [filterComp, setFilterComp] = useState("All");
  const [filterIndustry, setFilterIndustry] = useState("All");

  const COMP_LABELS = { All: "All", product: "product only", paid: "paid", "product+paid": "product + paid" };

  const getIndustries = (c) => {
    if (c.industry) return [c.industry];
    const text = (c.description + " " + c.brand + " " + c.campaign).toLowerCase();
    return INDUSTRIES.filter(ind => {
      const keywords = ind.split(/[&\s]+/).filter(w => w.length > 3);
      return keywords.some(k => text.includes(k));
    });
  };

  const filtered = useMemo(() => {
    const seed = parseInt(new Date().toISOString().slice(0, 10).replace(/-/g, ""));
    const seededRand = (s) => { let x = Math.sin(s) * 10000; return x - Math.floor(x); };
    const shuffle = (arr, offset) => {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(seededRand(seed + i + offset) * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    };
    const results = campaigns.filter(c => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const haystack = `${c.brand} ${c.campaign} ${c.description} ${c.location}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (filterPlatform !== "All" && !c.platforms.includes(filterPlatform)) return false;
      if (filterComp !== "All" && c.compType !== filterComp) return false;
      if (filterIndustry !== "All") {
        const inds = getIndustries(c);
        if (!inds.includes(filterIndustry)) return false;
      }
      return true;
    });
    const featured = shuffle(results.filter(c => c.featured), 0);
    const regular = shuffle(results.filter(c => !c.featured), 1000);
    return [...featured, ...regular];
  }, [campaigns, search, filterPlatform, filterComp, filterIndustry]);

  const hasActiveFilters = search.trim() || filterPlatform !== "All" || filterComp !== "All" || filterIndustry !== "All";
  const clearAll = () => { setSearch(""); setFilterPlatform("All"); setFilterComp("All"); setFilterIndustry("All"); };

  const pillBtn = (active, onClick, label) => (
    <button key={label} onClick={onClick} style={{
      padding: "6px 14px", borderRadius: 20, border: `1px solid ${active ? "rgba(255,255,255,.5)" : "rgba(255,255,255,.12)"}`,
      background: active ? "rgba(255,255,255,.12)" : "rgba(255,255,255,.04)",
      color: "#fff", fontSize: ".82rem", cursor: "pointer", fontFamily: "system-ui, sans-serif",
      opacity: active ? 1 : 0.65, transition: "all .15s", whiteSpace: "nowrap",
    }}>{label}</button>
  );

  return (
    <div style={{ minHeight: "100vh", overflowX: "hidden", background: "radial-gradient(circle at 70% 20%, rgba(255,255,255,.06) 0%, transparent 55%), linear-gradient(180deg, #040b15 0%, #070f1f 100%)", color: "#fff", fontFamily: "system-ui, sans-serif" }}>
      <style>{`
        @font-face { font-family: 'Monda'; src: url('/assets/Monda-Regular.woff') format('woff'); font-weight: 400 700; font-style: normal; font-display: swap; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .nf-browse-card { background: radial-gradient(circle at top, rgba(255,255,255,.045), rgba(4,11,21,0)); border: 1px solid rgba(255,255,255,.12); border-radius: 20px; overflow: hidden; backdrop-filter: blur(20px); box-shadow: 0 20px 55px rgba(0,0,0,.35); cursor: pointer; display: flex; flex-direction: column; transition: transform .25s, box-shadow .25s, border-color .25s; }
        .nf-browse-card:hover { transform: translateY(-4px) scale(1.01); box-shadow: 0 28px 65px rgba(0,0,0,.5); border-color: rgba(255,255,255,.25); }
        .nf-apply-btn2 { transition: transform .12s, border-color .2s, box-shadow .2s, background .2s !important; cursor: pointer; }
        .nf-apply-btn2:hover { border-color: rgba(255,255,255,.55) !important; box-shadow: 0 0 14px rgba(255,255,255,.15) !important; background: rgba(255,255,255,.08) !important; transform: translateY(-1px); }
        .nf-search-input::placeholder { color: rgba(255,255,255,.3); }
        .nf-search-input:focus { outline: none; border-color: rgba(255,255,255,.35) !important; box-shadow: 0 0 0 3px rgba(255,255,255,.06); }
        .nf-filter-scroll { display: flex; gap: 8px; overflow-x: auto; -webkit-overflow-scrolling: touch; padding-bottom: 4px; scrollbar-width: none; flex: 1; min-width: 0; }
        .nf-filter-scroll::-webkit-scrollbar { display: none; }
        @keyframes nf-gold-shimmer { 0%,100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
        .nf-featured-name { background: linear-gradient(90deg, #fbbf24 0%, #fde68a 40%, #f59e0b 60%, #fbbf24 100%); background-size: 200% auto; -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; animation: nf-gold-shimmer 3s ease-in-out infinite; }
        @keyframes nf-border-shimmer { 0%,100% { border-color: rgba(255,140,30,.25); box-shadow: 0 0 8px rgba(255,140,30,.08); } 50% { border-color: rgba(255,165,50,.85); box-shadow: 0 0 18px rgba(255,140,30,.3); } }
        @keyframes nf-confirm-shimmer { 0%,100% { border-color: rgba(100,255,150,.2); box-shadow: 0 0 8px rgba(100,255,150,.08); } 50% { border-color: rgba(100,255,150,.9); box-shadow: 0 0 18px rgba(100,255,150,.35); } }
        .nf-awaiting-tile { border: 1px solid rgba(255,140,30,.25); animation: nf-border-shimmer 2.5s ease-in-out infinite; }
        @media (max-width: 600px) { .nf-nav-secondary, .nf-browse-back { display: none !important; } .nf-browse-back-mobile { display: inline-flex !important; } }
        .nf-browse-back-mobile { display: none; }
      `}</style>

      {/* Header */}
      <div style={{ width: "100%", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 clamp(16px, 4vw, 32px)", position: "relative", zIndex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: "1.1rem", color: "#fff", cursor: "pointer", fontFamily: "'Monda', system-ui, sans-serif" }} role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }} onClick={onBack}>nfluence</div>
        <div className="nf-browse-back-mobile" style={{ alignItems: "center", gap: 6, fontSize: ".88rem", opacity: .65, color: "#fff", cursor: "pointer", fontFamily: "system-ui, sans-serif" }} role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }} onClick={onBack}>
          <span style={{ fontSize: "1.05rem" }}>←</span> back
        </div>
        <div className="nf-browse-back" style={{ display: "flex", gap: 18, fontSize: ".9rem", alignItems: "center", fontFamily: "system-ui, sans-serif" }}>
          <a className="nf-nl nf-nav-secondary" href="https://nfluenceagency.com/" style={{ color: "#fff" }}>home</a>
          <span className="nf-nl nf-nav-secondary" style={{ color: "#fff" }}>campaigns</span>
          <a className="nf-nl nf-nav-secondary" href="https://nfluenceagency.com/#popular" style={{ color: "#fff" }}>services</a>
          <a className="nf-nl nf-nav-secondary" href="https://nfluenceagency.com/contact.html" style={{ color: "#fff" }}>contact us</a>
          <span className="nf-nl nf-nav-secondary" style={{ color: "#fff" }} role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => onFaq?.()}>faq</span>
          <span className="nf-nav-secondary" style={{ color: "rgba(255,255,255,.35)", userSelect: "none" }}>|</span>
          <span className="nf-nl nf-nav-secondary" style={{ color: "#fff" }} role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => onSignIn?.()}>{user || creatorUser ? "dashboard" : "sign in"}</span>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "16px 24px 80px" }}>
        <h1 style={{ fontFamily: "'Monda', system-ui, sans-serif", fontSize: "1.8rem", fontWeight: 700, marginBottom: 28, textAlign: "center" }}>browse campaigns</h1>

        <p className="nf-demo-intro">Explore live opportunities and demo campaigns that show what your own campaign can look like.</p>
        {loading && <p role="status" className="nf-demo-intro">Loading live campaigns…</p>}
        {error && <p role="alert" className="nf-demo-intro">Live campaigns couldn’t load. You can still explore the demos below. <button onClick={onRetry}>Try again</button></p>}
        {/* Search bar */}
        <div style={{ position: "relative", marginBottom: 20 }}>
          <svg style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", opacity: .35, pointerEvents: "none" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            className="nf-search-input"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="search by brand, campaign, or keyword..."
            style={{ width: "100%", background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 14, padding: "12px 16px 12px 42px", color: "#fff", fontSize: ".95rem", fontFamily: "system-ui, sans-serif", transition: "border-color .2s, box-shadow .2s" }}
          />
          {search && <div onClick={() => setSearch("")} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", cursor: "pointer", opacity: .4, fontSize: "1.1rem", lineHeight: 1 }}><XIcon size={14} /></div>}
        </div>

        {/* Filter rows */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, overflow: "hidden" }}>
            <div style={{ fontSize: ".78rem", opacity: .35, minWidth: 64, textTransform: "lowercase", flexShrink: 0 }}>platform</div>
            <div className="nf-filter-scroll">{["All", ...PLATFORM_LIST].map(p => pillBtn(filterPlatform === p, () => setFilterPlatform(p), p === "All" ? "all" : p))}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, overflow: "hidden" }}>
            <div style={{ fontSize: ".78rem", opacity: .35, minWidth: 64, textTransform: "lowercase", flexShrink: 0 }}>comp</div>
            <div className="nf-filter-scroll">{Object.entries(COMP_LABELS).map(([val, label]) => pillBtn(filterComp === val, () => setFilterComp(val), label))}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, overflow: "hidden" }}>
            <div style={{ fontSize: ".78rem", opacity: .35, minWidth: 64, textTransform: "lowercase", flexShrink: 0 }}>industry</div>
            <div className="nf-filter-scroll">
              {pillBtn(filterIndustry === "All", () => setFilterIndustry("All"), "all")}
              {INDUSTRIES.map(ind => pillBtn(filterIndustry === ind, () => setFilterIndustry(ind), ind))}
            </div>
          </div>
        </div>

        {/* Results header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ fontSize: ".85rem", opacity: .4 }}>{filtered.length} {filtered.length === 1 ? "campaign" : "campaigns"}{hasActiveFilters ? " found" : ""}</div>
          {hasActiveFilters && <button onClick={clearAll} style={{ background: "none", border: "none", color: "rgba(255,255,255,.45)", fontSize: ".82rem", cursor: "pointer", fontFamily: "system-ui, sans-serif", textDecoration: "underline" }}>clear filters</button>}
        </div>

        {/* Campaign grid */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", opacity: .35 }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 12 }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <div style={{ fontSize: "1rem" }}>no campaigns match your filters</div>
            <div style={{ fontSize: ".85rem", marginTop: 6 }}>try adjusting or clearing your filters</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 420px), 1fr))", gap: 20 }}>
            {filtered.map((c) => (
              <div key={c.id} data-demo={c.isDemo || undefined} className="nf-browse-card" tabIndex={0} role="group" aria-label={`${c.brand}: ${c.campaign}${c.isDemo ? " demo" : ""}`} onKeyDown={e=>{if(e.target===e.currentTarget && (e.key==="Enter" || e.key===" ")){e.preventDefault();onSelectCampaign(c);}}} onClick={() => onSelectCampaign(c)}>
                <div style={{ position: "relative" }}>
                  {c.isDemo && <span className="nf-demo-badge">demo campaign</span>}
                  <div style={{ height: 150, background: c.imgBg, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", borderRadius: "20px 20px 0 0" }}>
                    {c.imgUrl ? <img src={c.imgUrl} alt={c.brand} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ fontSize: "2.8rem", opacity: .25 }}>{c.imgIcon}</div>}
                  </div>
                  {c.logoUrl ? (
                    <img src={c.logoUrl} alt={c.brand} style={{ position: "absolute", bottom: -41, left: 16, width: 82, height: 82, borderRadius: 14, border: "3px solid rgba(255,255,255,.15)", objectFit: "cover", zIndex: 2 }} />
                  ) : (
                    <div style={{ position: "absolute", bottom: -41, left: 16, width: 82, height: 82, borderRadius: 14, background: "#0c1424", border: "3px solid rgba(255,255,255,.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".65rem", color: "rgba(255,255,255,.5)", zIndex: 2 }}>logo</div>
                  )}
                </div>
                <div className="nf-campaign-summary" style={{ padding: "12px 16px 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ paddingTop: 34 }}>
                    <div className={c.featured ? "nf-featured-name" : ""} style={{ fontSize: "1.7rem", fontWeight: 700, color: c.featured ? undefined : "#fff", lineHeight: 1.15 }}>{c.brand}</div>
                    <div style={{ fontSize: "1.05rem", opacity: .5, marginTop: 4 }}>{c.campaign}</div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    {c.spotsTotal && (
                      <div style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 10, padding: "6px 12px", fontSize: ".85rem", color: "#fff", fontWeight: 600, whiteSpace: "nowrap", display: "inline-block", marginBottom: 6 }}>
                        {c.spotsTotal != null ? `${Math.max(0, c.spotsTotal - Math.max(c.spotsFilled || 0, c.creators?.approved?.length || 0))} spots left` : "open"}
                      </div>
                    )}
                    <div style={{ fontSize: ".82rem", opacity: .35, textTransform: "lowercase", letterSpacing: ".03em", marginBottom: 6 }}>available for</div>
                    <div style={{ display: "flex", gap: 5, justifyContent: "flex-end" }}>
                      {c.platforms.map(p => (
                        <div key={p} style={{ width: 34, height: 34, borderRadius: 8, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>{PLAT_SVGS_SMALL[p]}</div>
                      ))}
                    </div>
                  </div>
                </div>
                <div style={{ padding: "8px 16px 16px", flex: 1, display: "flex", flexDirection: "column" }}>
                  <div style={{ marginBottom: 0, flex: 1 }}>
                    {[["following:", c.following], ["deadline:", c.deadline]].map(([label, val]) => (
                      <div key={label} style={{ display: "flex", gap: 8, padding: "3px 0", fontSize: ".95rem" }}>
                        <div style={{ opacity: .35, minWidth: 105 }}>{label}</div>
                        <div style={{ opacity: .85 }}>{val}</div>
                      </div>
                    ))}
                    <div style={{ display: "flex", gap: 8, padding: "3px 0", fontSize: ".95rem" }}>
                      <div style={{ opacity: .35, minWidth: 105 }}>deliverables:</div>
                      <div style={{ opacity: .85 }}>
                        {c.deliverables && Object.entries(c.deliverables).map(([plat, del], idx) => {
                          const abbr = { Instagram: "IG", TikTok: "TT", YouTube: "YT", X: "X", Facebook: "FB" };
                          return <span key={plat}>{idx > 0 ? " · " : ""}{abbr[plat] || plat}: {del}</span>;
                        })}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 14, marginTop: 14, borderTop: "1px solid rgba(255,255,255,.08)", minHeight: 68 }}>
                    <div>
                      <div style={{ fontSize: ".85rem", opacity: .4, textTransform: "lowercase", marginBottom: 3 }}>creators get</div>
                      <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "#fff", lineHeight: 1.2 }}>
                        {c.comp}
                        {c.compType === "product+paid" ? <span style={{ fontSize: ".85rem", fontWeight: 400, opacity: .45, marginLeft: 4 }}>+ product</span> : ""}
                      </div>
                    </div>
                    {c.isDemo ? <button className="nf-demo-preview" onClick={e => {e.stopPropagation();onSelectCampaign(c);}}>view demo</button> : appliedCampaigns.includes(c.id) ? (
                      <div style={{ padding: "8px 16px", borderRadius: 12, border: "1px solid rgba(100,255,150,.2)", fontSize: ".85rem", fontWeight: 600, color: "rgba(100,255,150,.8)", display: "flex", alignItems: "center", gap: 6 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(100,255,150,.85)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        applied
                      </div>
                    ) : (
                      <div className="nf-apply-btn2" onClick={e => { e.stopPropagation(); onApplyClick?.(c); }} style={{ padding: "10px 24px", borderRadius: 12, border: "1px solid rgba(255,255,255,.3)", fontSize: ".95rem", fontWeight: 600, color: "#fff" }}>apply</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── GigBrowse (creator-facing live gig listings) ──

function GigBrowse({ onBack, onSelectGig, appliedGigs = [], creatorUser }) {
  const [gigs, setGigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterSkill, setFilterSkill] = useState("All");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const sb = getSB();
      if (!sb) { setError("connection unavailable"); setLoading(false); return; }
      try {
        // Step 1: open gigs (anon read; RLS exposes stage<>'draft')
        const { data: rows, error: gErr } = await sb
          .from("gig_listings")
          .select("id,title,description,comp,pay_type,deadline,location,platforms,skills_required,requirements,equipment,deliverables,created_at,brand_id")
          .eq("stage", "open")
          .order("created_at", { ascending: false });
        if (gErr) throw gErr;
        const list = rows || [];
        // Step 2: brand name/logo via public projection (profiles is own-row-only under RLS)
        const brandIds = [...new Set(list.map(g => g.brand_id).filter(Boolean))];
        let brandMap = {};
        if (brandIds.length) {
          const { data: profs } = await sb.from("profiles_public").select("id,name,logo_url").in("id", brandIds);
          brandMap = Object.fromEntries((profs || []).map(p => [p.id, p]));
        }
        const merged = list.map(g => ({ ...g, brandName: brandMap[g.brand_id]?.name || "a brand", brandLogo: brandMap[g.brand_id]?.logo_url || null }));
        if (!cancelled) { setGigs(merged); setLoading(false); }
      } catch (e) {
        if (!cancelled) { setError(e.message || "failed to load gigs"); setLoading(false); }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = filterSkill === "All" ? gigs : gigs.filter(g => (g.skills_required || []).includes(filterSkill));

  const pill = (active, onClick, label) => (
    <button key={label} onClick={onClick} style={{ padding: "6px 14px", borderRadius: 20, border: `1px solid ${active ? "rgba(255,255,255,.5)" : "rgba(255,255,255,.12)"}`, background: active ? "rgba(255,255,255,.12)" : "rgba(255,255,255,.04)", color: "#fff", fontSize: ".82rem", cursor: "pointer", fontFamily: "system-ui, sans-serif", opacity: active ? 1 : .65, transition: "all .15s", whiteSpace: "nowrap", textTransform: "lowercase" }}>{label}</button>
  );

  return (
    <div style={{ minHeight: "100vh", overflowX: "hidden", background: "radial-gradient(circle at 70% 20%, rgba(255,255,255,.06) 0%, transparent 55%), linear-gradient(180deg, #040b15 0%, #070f1f 100%)", color: "#fff", fontFamily: "system-ui, sans-serif" }}>
      <style>{`
        @font-face { font-family: 'Monda'; src: url('/assets/Monda-Regular.woff') format('woff'); font-weight: 400 700; font-style: normal; font-display: swap; }
        .nf-gig-card { background: radial-gradient(circle at top, rgba(255,255,255,.045), rgba(4,11,21,0)); border: 1px solid rgba(255,255,255,.12); border-radius: 20px; overflow: hidden; cursor: pointer; display: flex; flex-direction: column; transition: transform .25s, box-shadow .25s, border-color .25s; }
        .nf-gig-card:hover { transform: translateY(-4px) scale(1.01); box-shadow: 0 28px 65px rgba(0,0,0,.5); border-color: rgba(255,255,255,.25); }
      `}</style>

      <div style={{ width: "100%", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 clamp(16px,4vw,32px)" }}>
        <div role="button" tabIndex={0} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onBack(); } }} onClick={onBack} style={{ fontFamily: "'Monda', system-ui, sans-serif", fontWeight: 600, fontSize: "1.1rem", cursor: "pointer" }}>nfluence</div>
        <span role="button" tabIndex={0} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onBack(); } }} onClick={onBack} style={{ fontSize: ".9rem", opacity: .75, cursor: "pointer" }}>back</span>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 16px 80px" }}>
        <h2 style={{ fontFamily: "'Monda', system-ui, sans-serif", fontSize: "1.4rem", textAlign: "center", marginBottom: 8, fontWeight: 600 }}>gig listings</h2>
        <p style={{ textAlign: "center", opacity: .4, fontSize: ".85rem", marginBottom: 24 }}>brands hiring photographers &amp; videographers</p>

        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 28, flexWrap: "wrap" }}>
          {pill(filterSkill === "All", () => setFilterSkill("All"), "all")}
          {GIG_SKILLS.map(s => pill(filterSkill === s, () => setFilterSkill(s), s))}
        </div>

        {loading && <div style={{ textAlign: "center", opacity: .4, fontSize: ".9rem", marginTop: 60 }}>loading gigs…</div>}
        {!loading && error && <div style={{ textAlign: "center", color: "rgba(255,120,120,.8)", fontSize: ".9rem", marginTop: 60 }}>{error}</div>}
        {!loading && !error && filtered.length === 0 && <div style={{ textAlign: "center", opacity: .3, fontSize: ".9rem", marginTop: 60 }}>no open gig listings right now</div>}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {filtered.map(gig => {
            const applied = appliedGigs.includes(gig.id);
            return (
              <div key={gig.id} className="nf-gig-card" onClick={() => onSelectGig(gig)}>
                <div style={{ padding: "16px 18px 18px", flex: 1, display: "flex", flexDirection: "column" }}>
                  <div style={{ fontSize: "1.02rem", fontWeight: 700, marginBottom: 3, lineHeight: 1.3 }}>{gig.title}</div>
                  <div style={{ fontSize: ".82rem", opacity: .45, marginBottom: 12 }}>{gig.brandName}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 12 }}>
                    {(gig.platforms || []).slice(0, 4).map(p => (
                      <span key={p} style={{ padding: "2px 9px", borderRadius: 20, border: "1px solid rgba(255,255,255,.15)", fontSize: ".7rem", opacity: .7 }}>{p}</span>
                    ))}
                  </div>
                  <div style={{ flex: 1 }}>
                    {[["location", gig.location], ["deadline", gig.deadline]].map(([label, val]) => (
                      <div key={label} style={{ display: "flex", gap: 8, padding: "2px 0", fontSize: ".85rem" }}>
                        <div style={{ opacity: .35, minWidth: 72 }}>{label}:</div>
                        <div style={{ opacity: .75 }}>{val || "—"}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 14, marginTop: 14, borderTop: "1px solid rgba(255,255,255,.08)" }}>
                    <div>
                      <div style={{ fontSize: ".7rem", opacity: .4, marginBottom: 2 }}>{gig.pay_type === "hourly" ? "hourly rate" : "pay"}</div>
                      <div style={{ fontSize: "1.4rem", fontWeight: 700 }}>{gig.comp || "—"}{gig.pay_type === "hourly" ? <span style={{ fontSize: ".72rem", opacity: .5 }}>/hr</span> : ""}</div>
                    </div>
                    {applied
                      ? <div style={{ padding: "8px 16px", borderRadius: 12, border: "1px solid rgba(100,255,150,.2)", fontSize: ".85rem", fontWeight: 600, color: "rgba(100,255,150,.8)" }}>applied</div>
                      : <div style={{ padding: "8px 18px", borderRadius: 12, border: "1px solid rgba(255,255,255,.3)", fontSize: ".85rem", fontWeight: 600 }}>view</div>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── GigDetail (creator-facing gig detail + apply) ──

function GigDetail({ gig, onBack, creatorUser, appliedGigs = [], onApply, onSignInRedirect }) {
  const [hasApplied, setHasApplied] = useState(appliedGigs.includes(gig.id));
  const [showApply, setShowApply] = useState(false);
  const [pitch, setPitch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [done, setDone] = useState(false);

  const openApply = () => { if (!creatorUser) { onSignInRedirect?.(); return; } setSubmitError(""); setShowApply(true); };
  const submit = async () => {
    if (!pitch.trim()) return;
    setSubmitting(true); setSubmitError("");
    try {
      const res = await onApply?.(gig, { pitch: pitch.trim() });
      if (res && res.error) throw new Error(res.error);
      setHasApplied(true); setDone(true);
    } catch (e) { setSubmitError(e.message || "could not submit application"); }
    finally { setSubmitting(false); }
  };

  const Field = ({ label, value }) => value ? (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: ".72rem", opacity: .35, marginBottom: 4, textTransform: "lowercase" }}>{label}</div>
      <div style={{ fontSize: ".92rem", opacity: .85, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{value}</div>
    </div>
  ) : null;

  return (
    <div style={{ minHeight: "100vh", overflowX: "hidden", background: "radial-gradient(circle at calc(46% + 250px) calc(58% - 175px), rgba(255,255,255,.103) 0%, rgba(255,255,255,.0309) 38%, transparent 52%), linear-gradient(180deg, #040b15 0%, #070f1f 100%)", backgroundColor: "#040b15", color: "#fff", fontFamily: "system-ui, sans-serif" }}>
      <style>{`@font-face { font-family: 'Monda'; src: url('/assets/Monda-Regular.woff') format('woff'); font-weight: 400 700; font-display: swap; }`}</style>

      <div style={{ width: "100%", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 clamp(16px,4vw,32px)" }}>
        <div role="button" tabIndex={0} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onBack(); } }} onClick={onBack} style={{ fontFamily: "'Monda', system-ui, sans-serif", fontWeight: 600, fontSize: "1.1rem", cursor: "pointer" }}>nfluence</div>
        <span role="button" tabIndex={0} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onBack(); } }} onClick={onBack} style={{ fontSize: ".9rem", opacity: .75, cursor: "pointer" }}>back</span>
      </div>

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "8px 16px 100px" }}>
        <div style={{ fontSize: ".82rem", opacity: .45, marginBottom: 4 }}>{gig.brandName || "a brand"}</div>
        <h1 style={{ fontFamily: "'Monda', system-ui, sans-serif", fontSize: "1.7rem", fontWeight: 700, marginBottom: 14 }}>{gig.title}</h1>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, padding: "16px 18px", borderRadius: 16, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)", marginBottom: 24 }}>
          <div><div style={{ fontSize: ".7rem", opacity: .4 }}>{gig.pay_type === "hourly" ? "hourly rate" : "pay"}</div><div style={{ fontSize: "1.3rem", fontWeight: 700 }}>{gig.comp || "—"}{gig.pay_type === "hourly" ? <span style={{ fontSize: ".72rem", opacity: .5 }}>/hr</span> : ""}</div></div>
          <div><div style={{ fontSize: ".7rem", opacity: .4 }}>location</div><div style={{ fontSize: ".95rem", marginTop: 4 }}>{gig.location || "—"}</div></div>
          <div><div style={{ fontSize: ".7rem", opacity: .4 }}>deadline</div><div style={{ fontSize: ".95rem", marginTop: 4 }}>{gig.deadline || "—"}</div></div>
        </div>

        {((gig.platforms || []).length > 0 || (gig.skills_required || []).length > 0) && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 24 }}>
            {(gig.platforms || []).map(p => <span key={"p" + p} style={{ padding: "3px 11px", borderRadius: 20, border: "1px solid rgba(255,255,255,.15)", fontSize: ".75rem", opacity: .75 }}>{p}</span>)}
            {(gig.skills_required || []).map(s => <span key={"s" + s} style={{ padding: "3px 11px", borderRadius: 20, border: "1px solid rgba(100,200,255,.25)", color: "rgba(150,200,255,.9)", fontSize: ".75rem" }}>{s}</span>)}
          </div>
        )}

        <Field label="description" value={gig.description} />
        <Field label="deliverables" value={typeof gig.deliverables === "string" ? gig.deliverables : (gig.deliverables && Object.entries(gig.deliverables).map(([k, v]) => `${k}: ${v}`).join("\n"))} />
        <Field label="requirements" value={gig.requirements} />
        <Field label="equipment" value={gig.equipment} />

        <div style={{ textAlign: "center", marginTop: 32 }}>
          {hasApplied
            ? <div style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "16px 32px", borderRadius: 16, background: "rgba(100,255,150,.06)", border: "1px solid rgba(100,255,150,.2)", color: "rgba(100,255,150,.85)", fontFamily: "'Monda', system-ui, sans-serif", textTransform: "lowercase", fontWeight: 600 }}>application submitted</div>
            : <button onClick={openApply} style={{ width: "100%", maxWidth: 400, padding: "18px 32px", borderRadius: 16, background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.28)", color: "#fff", cursor: "pointer", fontSize: "1.05rem", fontWeight: 600, fontFamily: "system-ui, sans-serif", textTransform: "lowercase" }}>apply for this gig</button>}
        </div>
      </div>

      {showApply && (
        <div role="dialog" aria-modal="true" tabIndex={-1} ref={el => { if (el && !el.__f) { el.__f = true; el.focus(); } }} onKeyDown={e => { if (e.key === "Escape" && !submitting) setShowApply(false); }} onClick={() => { if (done || !submitting) setShowApply(false); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.78)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#0a1322", border: "1px solid rgba(255,255,255,.12)", borderRadius: 22, padding: 24, maxWidth: 440, width: "100%" }}>
            {done ? (
              <div style={{ textAlign: "center", padding: "12px 0" }}>
                <div style={{ width: 60, height: 60, borderRadius: "50%", background: "rgba(100,255,150,.1)", border: "1px solid rgba(100,255,150,.25)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="rgba(100,255,150,.85)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <div style={{ fontSize: "1.2rem", fontWeight: 700, fontFamily: "'Monda', system-ui, sans-serif", marginBottom: 8 }}>application sent!</div>
                <div style={{ fontSize: ".88rem", opacity: .5, marginBottom: 22 }}>{gig.brandName || "the brand"} will review your application.</div>
                <button onClick={() => setShowApply(false)} style={{ padding: "12px 28px", borderRadius: 12, border: "1px solid rgba(255,255,255,.2)", background: "rgba(255,255,255,.06)", color: "#fff", cursor: "pointer", fontFamily: "'Monda', system-ui, sans-serif", textTransform: "lowercase" }}>done</button>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                  <div>
                    <div style={{ fontSize: "1.2rem", fontWeight: 700, fontFamily: "'Monda', system-ui, sans-serif", textTransform: "lowercase" }}>apply for this gig</div>
                    <div style={{ fontSize: ".85rem", opacity: .4, marginTop: 3 }}>{gig.title}</div>
                  </div>
                  <div onClick={() => { if (!submitting) setShowApply(false); }} style={{ cursor: "pointer", width: 44, height: 44, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,.06)", opacity: .7 }}><XIcon size={16} /></div>
                </div>
                <div style={{ fontSize: ".75rem", opacity: .4, margin: "18px 0 6px", textTransform: "lowercase" }}>why are you a great fit?</div>
                <textarea aria-label="pitch" value={pitch} onChange={e => setPitch(e.target.value)} rows={5} placeholder={`Tell ${gig.brandName || "the brand"} about your experience, gear, and why you're right for this shoot…`} style={{ width: "100%", padding: "14px 16px", borderRadius: 12, border: "1px solid rgba(255,255,255,.15)", background: "rgba(0,0,0,.3)", color: "#fff", fontSize: ".9rem", outline: "none", fontFamily: "system-ui, sans-serif", resize: "vertical", lineHeight: 1.5 }} />
                {submitError && <div style={{ fontSize: ".8rem", color: "rgba(255,120,120,.9)", marginTop: 10 }}>{submitError}</div>}
                <button disabled={!pitch.trim() || submitting} onClick={submit} style={{ width: "100%", marginTop: 16, padding: "14px", borderRadius: 12, border: "1px solid " + (pitch.trim() ? "rgba(100,255,150,.35)" : "rgba(255,255,255,.15)"), background: pitch.trim() && !submitting ? "rgba(100,255,150,.1)" : "transparent", color: pitch.trim() ? "rgba(100,255,150,.9)" : "rgba(255,255,255,.3)", fontSize: ".95rem", fontWeight: 600, fontFamily: "system-ui, sans-serif", textTransform: "lowercase", cursor: pitch.trim() && !submitting ? "pointer" : "not-allowed" }}>{submitting ? "submitting…" : "submit application"}</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── CreatorSignIn ──

function CreatorSignIn({onSignIn,onBack,onSignUp}) {
  return <AccountSignIn navigation={<PublicNav onSignIn={()=>{}}/>} onSignIn={onSignIn} onBack={onBack} onSignUp={onSignUp} role="creator"/>;
}

// ── CreatorOnboarding ──

function CreatorOnboarding({ onComplete, onBack, onSignIn }) {
  const [step, setStep] = useState(0);
  const STEPS = ["account", "profile", "platforms", "preview"];
  const [account, setAccount] = useState({ firstName: "", lastName: "", email: "", password: "", confirmPassword: "", agreeTerms: false });
  const [profile, setProfile] = useState({ bio: "", city: "", state: "", country: "", age: "", languages: "", niches: "", avatarPreview: null, bannerPreview: null, avatarEditing: false, bannerEditing: false, avatarTransform: null, bannerTransform: null });
  const [platforms, setPlatforms] = useState({ selected: { Instagram: false, TikTok: false, YouTube: false, X: false, Facebook: false }, handles: {}, followers: {} });
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const containerRef = useRef(null);
  useEffect(() => { containerRef.current?.scrollTo?.({ top: 0, behavior: "smooth" }); window.scrollTo?.({ top: 0, behavior: "smooth" }); }, [step]);

  const selectedPlatformKeys = PLATFORM_LIST.filter(p => platforms.selected[p]);
  const handlesComplete = selectedPlatformKeys.length > 0 && selectedPlatformKeys.every(p => platforms.handles[p]?.trim());

  const canProceed = useMemo(() => {
    if (step === 0) return account.firstName.trim() && account.lastName.trim() && account.email.includes("@") && account.password.length >= 8 && account.password === account.confirmPassword && account.agreeTerms;
    if (step === 1) return true; // profile optional
    if (step === 2) return handlesComplete;
    return true;
  }, [step, account, handlesComplete]);

  const handleFileUpload = (field, e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    const editingField = field === "bannerPreview" ? "bannerEditing" : "avatarEditing";
    const transformField = field === "bannerPreview" ? "bannerTransform" : "avatarTransform";
    reader.onload = ev => setProfile(p => ({ ...p, [field]: ev.target.result, [editingField]: true, [transformField]: null }));
    reader.readAsDataURL(file);
  };

  const [signupError,setSignupError]=useState("");
  const [signupBusy,setSignupBusy]=useState(false);
  const handleComplete = async () => {
    if(signupBusy)return;setSignupBusy(true);setSignupError("");
    const fullName = [account.firstName, account.lastName].filter(Boolean).join(" ");
    const profileData = {
      name: fullName,
      bio: profile.bio,
      location: [profile.city, profile.state, profile.country].filter(Boolean).join(", "),
      age: profile.age,
      languages: profile.languages,
      niches: profile.niches,
      avatarUrl: profile.avatarPreview,
      bannerUrl: profile.bannerPreview,
      avatarTransform: profile.avatarTransform,
      bannerTransform: profile.bannerTransform,
      instagram: platforms.handles["Instagram"] || "",
      tiktok: platforms.handles["TikTok"] || "",
      youtube: platforms.handles["YouTube"] || "",
      x: platforms.handles["X"] || "",
      facebook: platforms.handles["Facebook"] || "",
      instagramFollowers: platforms.followers["Instagram"] || "",
      tiktokFollowers: platforms.followers["TikTok"] || "",
      youtubeFollowers: platforms.followers["YouTube"] || "",
      xFollowers: platforms.followers["X"] || "",
      facebookFollowers: platforms.followers["Facebook"] || "",
      rating: null,
    };
    try{const error=await onComplete(account.email, fullName, account.password, profileData);if(error)setSignupError(error);}catch(error){setSignupError(error.message);}finally{setSignupBusy(false);}
  };

  const [selectedNiches, setSelectedNiches] = useState([]);
  const toggleNiche = (n) => {
    setSelectedNiches(prev => {
      const next = prev.includes(n) ? prev.filter(x => x !== n) : [...prev, n];
      setProfile(p => ({ ...p, niches: next.join(", ") }));
      return next;
    });
  };

  return (
    <AuthLayout pageRef={containerRef} navigation={<PublicNav onSignIn={onSignIn}/>} mode="signup" onLogIn={onSignIn} onCreate={()=>{}} disabled={signupBusy} title="Create a creator account" description="A few details to set up your workspace." onboarding>
      {signupError&&<p role="alert" className="async-error">{signupError}</p>}
      <style>{`
        @font-face { font-family: 'Monda'; src: url('/assets/Monda-Regular.woff') format('woff'); font-weight: 400 700; font-display: swap; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .co-input { border-radius: 12px; border: 1px solid rgba(255,255,255,.18); background: rgba(0,0,0,.35); color: #fff; padding: 12px 14px; font-size: .92rem; width: 100%; outline: none; font-family: system-ui, sans-serif; transition: border-color .12s, box-shadow .12s; }
        .co-input::placeholder { color: rgba(255,255,255,.35); }
        .co-input:focus { border-color: rgba(255,255,255,.6); box-shadow: 0 0 0 1px rgba(255,255,255,.15); background: rgba(0,0,0,.5); }
        .co-btn { padding: 14px 24px; border-radius: 14px; border: 1px solid rgba(255,255,255,.28); background: rgba(255,255,255,.08); color: #fff; font-size: .95rem; font-family: system-ui, sans-serif; text-transform: lowercase; cursor: pointer; transition: all .12s; }
        .co-btn:hover:not(:disabled) { transform: translateY(-2px); border-color: rgba(255,255,255,.45); background: rgba(255,255,255,.12); }
        .co-btn:disabled { opacity: .3; cursor: not-allowed; }
        .co-btn-back { background: transparent; border-color: rgba(255,255,255,.15); color: rgba(255,255,255,.5); }
        .co-btn-back:hover { background: rgba(255,255,255,.05) !important; border-color: rgba(255,255,255,.25) !important; color: rgba(255,255,255,.8) !important; transform: none !important; }
        .co-niche-pill { display: inline-flex; align-items: center; justify-content: center; min-height: 44px; box-sizing: border-box;padding: 8px 16px; border-radius: 20px; border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.04); color: rgba(255,255,255,.6); font-size: .8rem; cursor: pointer; transition: all .12s; }
        .co-niche-pill.selected { background: rgba(255,255,255,.12); border-color: rgba(255,255,255,.35); color: #fff; }
        .co-plat-btn { min-height: 44px; box-sizing: border-box;display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-radius: 14px; border: 1px solid rgba(255,255,255,.1); background: rgba(255,255,255,.03); cursor: pointer; transition: all .15s; }
        .co-plat-btn.selected { background: rgba(255,255,255,.08); border-color: rgba(255,255,255,.3); }
        .co-upload-zone { display: block; padding: 20px; border-radius: 14px; border: 2px dashed rgba(255,255,255,.12); background: rgba(255,255,255,.02); cursor: pointer; text-align: center; transition: all .15s; }
        .co-upload-zone:hover { border-color: rgba(255,255,255,.25); background: rgba(255,255,255,.04); }
        @keyframes nf-cta-pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(100,255,150,.35); } 60% { box-shadow: 0 0 0 10px rgba(100,255,150,0); } }
        .co-btn-finish { animation: nf-cta-pulse 2s ease-out infinite; }
      `}</style>

      <AuthSteps steps={STEPS} current={step}/>

      {/* Content */}
      <div className="nf-auth-onboarding-fields">

        {/* Step 0: Account */}
        {step === 0 && <div className="nf-auth-account-fields">
            <div className="nf-auth-name-row"><label className="nf-auth-field">First name<input className="co-input" autoComplete="given-name" value={account.firstName} onChange={e=>setAccount(a=>({...a,firstName:e.target.value}))} aria-label="first"/></label><label className="nf-auth-field">Last name<input className="co-input" autoComplete="family-name" value={account.lastName} onChange={e=>setAccount(a=>({...a,lastName:e.target.value}))} aria-label="last"/></label></div>
            <label className="nf-auth-field">Email address<input className="co-input" type="email" autoComplete="email" autoCapitalize="none" value={account.email} onChange={e=>setAccount(a=>({...a,email:e.target.value}))} aria-label="you@email.com"/></label>
            <PasswordField id="nf-creator-password" value={account.password} onChange={e=>setAccount(a=>({...a,password:e.target.value}))}/>
            <PasswordField id="nf-creator-confirm" label="Confirm password" value={account.confirmPassword} onChange={e=>setAccount(a=>({...a,confirmPassword:e.target.value}))}/>
            {account.confirmPassword&&account.password!==account.confirmPassword&&<p className="nf-auth-error">Passwords don’t match.</p>}
            <label className="nf-auth-consent"><input type="checkbox" checked={account.agreeTerms} onChange={e=>setAccount(a=>({...a,agreeTerms:e.target.checked}))}/><span>I agree to nfluence’s <a href="/terms/" target="_blank" rel="noopener noreferrer">Terms of Service</a> and <a href="/privacy/" target="_blank" rel="noopener noreferrer">Privacy Policy</a>. I confirm I am at least 18 years old.</span></label>
        </div>}

        {/* Step 1: Profile */}
        {step === 1 && (
          <div>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, fontFamily: "'Monda', system-ui, sans-serif", marginBottom: 6 }}>set up your profile</div>
            <div style={{ fontSize: ".88rem", opacity: .7, marginBottom: 28 }}>you can always update this later</div>

            {/* Banner upload */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: ".72rem", opacity: .65, marginBottom: 8 }}>banner photo</div>
              {profile.bannerEditing && profile.bannerPreview ? (
                <ImageEditor src={profile.bannerPreview} shape="banner"
                  initialScale={profile.bannerTransform?.scale} initialPos={profile.bannerTransform?.pos}
                  onSave={(t) => setProfile(p => ({ ...p, bannerPreview: t.croppedDataUrl, bannerTransform: t, bannerEditing: false }))}
                  onCancel={() => setProfile(p => ({ ...p, bannerPreview: null, bannerEditing: false, bannerTransform: null }))} />
              ) : profile.bannerPreview ? (
                <div style={{ position: "relative", borderRadius: 14, overflow: "hidden", height: 120, marginBottom: 4 }}>
                  <img src={profile.bannerPreview} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
                  <div onClick={() => setProfile(p => ({ ...p, bannerEditing: true }))} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                    <span style={{ fontSize: ".82rem", color: "#fff", background: "rgba(0,0,0,.4)", padding: "6px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,.2)" }}>reposition</span>
                  </div>
                </div>
              ) : (
                <label className="co-upload-zone" style={{ height: 120, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderRadius: 14 }}>
                  <input type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={e => handleFileUpload("bannerPreview", e)} />
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  <div style={{ fontSize: ".8rem", opacity: .65, marginTop: 8 }}>click to upload banner</div>
                  <div style={{ fontSize: ".68rem", opacity: .2, marginTop: 4 }}>1500×500px · JPG or PNG</div>
                </label>
              )}
            </div>

            {/* Avatar upload */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: ".72rem", opacity: .65, marginBottom: 8 }}>profile photo</div>
              {profile.avatarEditing && profile.avatarPreview ? (
                <ImageEditor src={profile.avatarPreview} shape="square"
                  initialScale={profile.avatarTransform?.scale} initialPos={profile.avatarTransform?.pos}
                  onSave={(t) => setProfile(p => ({ ...p, avatarPreview: t.croppedDataUrl, avatarTransform: t, avatarEditing: false }))}
                  onCancel={() => setProfile(p => ({ ...p, avatarPreview: null, avatarEditing: false, avatarTransform: null }))} />
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <label style={{ cursor: "pointer", position: "relative" }}>
                    <input type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={e => handleFileUpload("avatarPreview", e)} />
                    <div style={{ width: 72, height: 72, borderRadius: 14, border: "2px dashed rgba(255,255,255,.2)", background: "rgba(255,255,255,.04)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {profile.avatarPreview ? <img src={profile.avatarPreview} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" /> : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
                    </div>
                  </label>
                  <div>
                    <label style={{ cursor: "pointer" }}>
                      <input type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={e => handleFileUpload("avatarPreview", e)} />
                      <div style={{ fontSize: ".82rem", opacity: .6 }}>{profile.avatarPreview ? "click to change photo" : "click to upload a photo"}</div>
                    </label>
                    <div style={{ fontSize: ".68rem", opacity: .25, marginTop: 3 }}>400×400px · JPG or PNG</div>
                    {profile.avatarPreview && <div onClick={() => setProfile(p => ({ ...p, avatarEditing: true }))} style={{ fontSize: ".72rem", opacity: .7, marginTop: 5, cursor: "pointer", textDecoration: "underline" }}>reposition</div>}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <div style={{ fontSize: ".72rem", opacity: .65, marginBottom: 5 }}>bio <span style={{ opacity: .5 }}>(optional)</span></div>
                <textarea className="co-input" placeholder="tell brands about yourself..." rows={3} value={profile.bio} onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))} style={{ resize: "vertical", lineHeight: 1.5 }} />
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: ".72rem", opacity: .65, marginBottom: 5 }}>city</div>
                  <input className="co-input" aria-label="city" placeholder="city" value={profile.city} onChange={e => setProfile(p => ({ ...p, city: e.target.value }))} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: ".72rem", opacity: .65, marginBottom: 5 }}>state</div>
                  <input className="co-input" aria-label="state" placeholder="state" value={profile.state} onChange={e => setProfile(p => ({ ...p, state: e.target.value }))} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: ".72rem", opacity: .65, marginBottom: 5 }}>country</div>
                  <input className="co-input" aria-label="country" placeholder="country" value={profile.country} onChange={e => setProfile(p => ({ ...p, country: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: ".72rem", opacity: .65, marginBottom: 5 }}>age</div>
                  <input className="co-input" aria-label="age" placeholder="age" value={profile.age} onChange={e => setProfile(p => ({ ...p, age: e.target.value }))} />
                </div>
              </div>
              <div>
                <div style={{ fontSize: ".72rem", opacity: .65, marginBottom: 5 }}>languages</div>
                <input className="co-input" aria-label="e.g. English, Spanish" placeholder="e.g. English, Spanish" value={profile.languages} onChange={e => setProfile(p => ({ ...p, languages: e.target.value }))} />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Platforms + niches */}
        {step === 2 && (
          <div>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, fontFamily: "'Monda', system-ui, sans-serif", marginBottom: 6 }}>your platforms</div>
            <div style={{ fontSize: ".88rem", opacity: .7, marginBottom: 24 }}>select every platform you create on</div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
              {PLATFORM_LIST.map(p => (
                <div key={p} className={`co-plat-btn${platforms.selected[p] ? " selected" : ""}`} onClick={() => setPlatforms(prev => ({ ...prev, selected: { ...prev.selected, [p]: !prev.selected[p] } }))}>
                  <span style={{ display: "flex", alignItems: "center" }}>{PLAT_SVGS_SMALL[p]}</span>
                  <span style={{ fontSize: ".92rem", fontWeight: platforms.selected[p] ? 600 : 400, flex: 1 }}>{p}</span>
                  {platforms.selected[p] && <span style={{ fontSize: ".7rem", color: "rgba(100,255,150,.8)" }}>✓</span>}
                </div>
              ))}
            </div>

            {/* Handle + follower inputs */}
            {selectedPlatformKeys.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
                <div style={{ fontSize: ".72rem", opacity: .65, marginBottom: 4 }}>add your handles and follower counts</div>
                {selectedPlatformKeys.map(p => (
                  <div key={p} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <div style={{ width: 34, height: 34, borderRadius: 8, background: "rgba(255,255,255,.06)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{PLAT_SVGS_SMALL[p]}</div>
                    <input className="co-input" placeholder={`@${p.toLowerCase()} handle`} value={platforms.handles[p] || ""} onChange={e => setPlatforms(prev => ({ ...prev, handles: { ...prev.handles, [p]: e.target.value } }))} style={{ flex: 2 }} />
                    <input className="co-input" placeholder="followers" value={platforms.followers[p] || ""} onChange={e => setPlatforms(prev => ({ ...prev, followers: { ...prev.followers, [p]: e.target.value } }))} style={{ flex: 1 }} />
                  </div>
                ))}
              </div>
            )}

            {/* Niches */}
            <div>
              <div style={{ fontSize: ".72rem", opacity: .65, marginBottom: 10 }}>content niches <span style={{ opacity: .5 }}>(select all that apply)</span></div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {INDUSTRIES.map(n => (
                  <div key={n} className={`co-niche-pill${selectedNiches.includes(n) ? " selected" : ""}`} onClick={() => toggleNiche(n)}>{n}</div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Preview */}
        {step === 3 && (
          <div>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, fontFamily: "'Monda', system-ui, sans-serif", marginBottom: 6 }}>looking good!</div>
            <div style={{ fontSize: ".88rem", opacity: .7, marginBottom: 28 }}>here's your profile preview</div>

            {/* Profile preview card */}
            <div style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,.1)", overflow: "hidden", marginBottom: 24 }}>
              {/* Banner */}
              <div style={{ height: 120, background: profile.bannerPreview ? `url(${profile.bannerPreview}) center/cover` : "linear-gradient(135deg, rgba(100,80,255,.3), rgba(255,80,160,.2))", position: "relative" }}>
                <div style={{ position: "absolute", bottom: -28, left: 20, width: 56, height: 56, borderRadius: 14, border: "3px solid #040b15", background: "#0c1424", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", fontWeight: 700 }}>
                  {profile.avatarPreview ? <img src={profile.avatarPreview} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" /> : (account.firstName || "?").charAt(0).toUpperCase()}
                </div>
              </div>
              <div style={{ padding: "38px 20px 20px", background: "rgba(255,255,255,.02)" }}>
                <div style={{ fontSize: "1.3rem", fontWeight: 700, fontFamily: "'Monda', system-ui, sans-serif", marginBottom: 4 }}>{[account.firstName, account.lastName].filter(Boolean).join(" ") || "your name"}</div>
                {([profile.city, profile.state, profile.country].some(Boolean) || profile.age) && <div style={{ fontSize: ".82rem", opacity: .5, marginBottom: 6 }}>{[[profile.city, profile.state, profile.country].filter(Boolean).join(", "), profile.age && `${profile.age} yrs`].filter(Boolean).join(" · ")}</div>}
                {profile.bio && <div style={{ fontSize: ".85rem", opacity: .55, lineHeight: 1.5, marginBottom: 10 }}>{profile.bio}</div>}
                {selectedNiches.length > 0 && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                    {selectedNiches.map(n => <span key={n} style={{ fontSize: ".7rem", padding: "2px 10px", borderRadius: 20, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", opacity: .7 }}>{n}</span>)}
                  </div>
                )}
                {selectedPlatformKeys.length > 0 && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {selectedPlatformKeys.map(p => (
                      <span key={p} style={{ fontSize: ".72rem", padding: "3px 10px", borderRadius: 20, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", opacity: .7 }}>
                        {p}{platforms.handles[p] ? ` · ${platforms.handles[p]}` : ""}{platforms.followers[p] ? ` · ${platforms.followers[p]}` : ""}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div style={{ fontSize: ".82rem", opacity: .65, textAlign: "center", marginBottom: 20 }}>you can edit all of this from your dashboard anytime</div>
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: "flex", gap: 12, marginTop: 32 }}>
          <button className="co-btn co-btn-back" onClick={() => step === 0 ? onBack() : setStep(s => s - 1)}>← back</button>
          {step < 3 ? (
            <button className="co-btn" style={{ flex: 1 }} disabled={!canProceed} onClick={() => setStep(s => s + 1)}>continue →</button>
          ) : (
            <button className="co-btn co-btn-finish" style={{ flex: 1, borderColor: "rgba(100,255,150,.35)", background: "rgba(100,255,150,.1)", color: "rgba(100,255,150,.95)" }} disabled={signupBusy} onClick={handleComplete}>i'm in →</button>
          )}
        </div>
      </div>
    </AuthLayout>
  );
}

// ── CreatorDashboard ──

function CreatorDashboard({ user, appliedCampaigns, activeCampaigns, uploads, onSignOut, onBack, onUpload, onEditProfile, creatorProfile, onSelectCampaign, onBrowse, onBrowseGigs, onOpenMessages, onViewOwnProfile, scheduledCalls = {}, onRespondToCall, notifications = [], onMarkAllNotifsRead, onViewAllNotifications }) {
  const [profileSaveError,setProfileSaveError]=useState("");
  const [profileSaveBusy,setProfileSaveBusy]=useState(false);
  const [showTray, setShowTray] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showCreatorReviews, setShowCreatorReviews] = useState(false);
  const [reviewStarFilter, setReviewStarFilter] = useState(null);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [showActiveModal, setShowActiveModal] = useState(false);
  const [showCompletedModal, setShowCompletedModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUploadCampaign, setSelectedUploadCampaign] = useState("");
  const [uploadFile, setUploadFile] = useState(null);
  const [editForm, setEditForm] = useState({ ...creatorProfile });

  const CREATOR_STAGES = ["accepted", "product_shipped", "product_delivered", "content_submitted", "approved", "paid"];
  const CREATOR_STAGE_LABELS = { accepted: "accepted", product_shipped: "product shipped", product_delivered: "product delivered", content_submitted: "content submitted", approved: "content approved", paid: "paid" };
  const CREATOR_STAGE_COLORS = {
    accepted: "rgba(100,180,255,.9)", product_shipped: "rgba(185,110,255,.9)", product_delivered: "rgba(140,100,255,.9)",
    content_submitted: "rgba(255,160,50,.9)", approved: "rgba(255,220,80,.9)", paid: "rgba(100,255,150,.9)",
  };

  const APPLICATION_STATUS_COLORS = {
    applied:   { bg: "rgba(255,255,255,.06)",    border: "rgba(255,255,255,.12)",    color: "rgba(255,255,255,.6)",    label: "under review" },
    accepted:  { bg: "rgba(100,255,150,.1)",     border: "rgba(100,255,150,.3)",     color: "rgba(180,255,80,.95)",    label: "accepted" },
    rejected:  { bg: "rgba(255,100,100,.08)",    border: "rgba(255,100,100,.2)",     color: "rgba(255,100,100,.7)",    label: "rejected" },
  };

  const [uploadError,setUploadError]=useState("");
  const [uploadBusy,setUploadBusy]=useState(false);
  const handleUploadSubmit = async () => {
    if (!uploadFile || !selectedUploadCampaign || uploadBusy) return;
    setUploadBusy(true);setUploadError("");
    try{await onUpload({applicationId:selectedUploadCampaign,file:uploadFile});}catch(error){setUploadError(error.message);setUploadBusy(false);return;}
    setUploadBusy(false);
    setUploadFile(null);
    setSelectedUploadCampaign("");
    setShowUploadModal(false);
  };

  const formatTs = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) + " · " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  };

  return (
    <div style={{ minHeight: "100vh", overflowX: "hidden", background: "radial-gradient(circle at calc(46% + 250px) calc(58% - 175px), rgba(255,255,255,.103) 0%, rgba(255,255,255,.0309) 38%, transparent 52%), linear-gradient(180deg, #040b15 0%, #070f1f 100%)", backgroundColor: "#040b15", color: "#fff", fontFamily: "system-ui, sans-serif" }}>
      {profileSaveError&&<p role="alert" className="async-error" style={{position:"fixed",top:12,left:12,right:12,zIndex:3500}}>{profileSaveError}</p>}
      <style>{`
        .nf-creator-card { background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.08); border-radius: 16px; transition: transform .2s, border-color .2s, box-shadow .2s; }
        .nf-creator-card:hover { transform: translateY(-2px); border-color: rgba(255,255,255,.2) !important; box-shadow: 0 8px 30px rgba(0,0,0,.3); }
        .nf-creator-btn { padding: 9px 20px; border-radius: 11px; border: 1px solid rgba(255,255,255,.2); background: rgba(255,255,255,.06); color: rgba(255,255,255,.8); font-size: .82rem; cursor: pointer; font-family: system-ui, sans-serif; transition: transform .12s, border-color .2s, box-shadow .2s, background .2s; }
        .nf-creator-btn:hover { border-color: rgba(255,255,255,.55) !important; box-shadow: 0 0 14px rgba(255,255,255,.15) !important; background: rgba(255,255,255,.08) !important; transform: translateY(-1px); color: #fff; }
        .nf-creator-input { border-radius: 11px; border: 1px solid rgba(255,255,255,.15); background: rgba(0,0,0,.3); color: #fff; padding: 11px 14px; font-size: .88rem; width: 100%; outline: none; font-family: system-ui, sans-serif; transition: border-color .12s; }
        .nf-creator-input:focus { border-color: rgba(255,255,255,.4); }
        .nf-creator-input::placeholder { color: rgba(255,255,255,.3); }
        @keyframes nf-gold-shimmer { 0%,100%{background-position:200% center}50%{background-position:0% center} }
      `}</style>

      {/* Header */}
      <div style={{ width: "100%", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", fontFamily: "system-ui, sans-serif", flexShrink: 0 }}>
        <div style={{ fontFamily: "'Monda', system-ui, sans-serif", fontWeight: 600, fontSize: "1.1rem", cursor: "pointer", flexShrink: 0 }} role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }} onClick={onBack}>nfluence</div>
        <div style={{ display: "flex", gap: 18, fontSize: ".9rem", alignItems: "center", flexShrink: 0 }}>
          <span style={{ color: "#fff", cursor: "pointer", opacity: .7 }} role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => onBrowse?.()}>campaigns</span>
          <span style={{ color: "#fff", cursor: "pointer", opacity: .7 }} role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => onBrowseGigs?.()}>gig listings</span>
          <NotificationBell notifications={notifications.filter(n => n.for === "creator")} onOpen={() => setShowTray(v => !v)} />
          <div style={{ position: "relative" }}>
            <div onClick={() => setShowMenu(v => !v)} style={{ cursor: "pointer", width: 44, height: 44, borderRadius: 10, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", display: "flex", alignItems: "center", justifyContent: "center", gap: 3, flexDirection: "column" }}>
              <div style={{ width: 14, height: 1.5, background: "rgba(255,255,255,.7)", borderRadius: 2 }} />
              <div style={{ width: 14, height: 1.5, background: "rgba(255,255,255,.7)", borderRadius: 2 }} />
              <div style={{ width: 14, height: 1.5, background: "rgba(255,255,255,.7)", borderRadius: 2 }} />
            </div>
            {showMenu && (
              <>
                <div onClick={() => setShowMenu(false)} style={{ position: "fixed", inset: 0, zIndex: 998 }} />
                <div style={{ position: "absolute", top: 44, right: 0, width: 200, background: "#0c1525", border: "1px solid rgba(255,255,255,.14)", borderRadius: 14, zIndex: 999, overflow: "hidden", boxShadow: "0 16px 48px rgba(0,0,0,.5)", animation: "nf-tray-in .15s ease-out" }}>
                  {[
                    { label: "view profile", icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>', action: () => { setShowMenu(false); onViewOwnProfile?.(); } },
                    { label: "messages", icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>', action: () => { setShowMenu(false); onOpenMessages?.(); } },
                    { label: "edit profile", icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>', action: () => { setShowMenu(false); const parts = (creatorProfile.location || "").split(",").map(s => s.trim()); const baseForm = { ...creatorProfile, city: creatorProfile.city || parts[0] || "", state: creatorProfile.state || parts[1] || "", country: creatorProfile.country || parts[2] || "", avatarEditing: false, bannerEditing: false }; setEditForm(baseForm); setShowEditModal(true); } },
                    { label: "sign out", icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>', action: () => { setShowMenu(false); onSignOut(); } },
                  ].map((item, i, arr) => (
                    <div key={item.label} onClick={item.action} style={{ padding: "13px 18px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,.06)" : "none", transition: "background .1s" }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,.05)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <span style={{ color: "rgba(255,255,255,.5)", display: "flex", alignItems: "center" }} dangerouslySetInnerHTML={{ __html: item.icon }} />
                      <span style={{ fontSize: ".85rem", color: "rgba(255,255,255,.8)" }}>{item.label}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      {showTray && <NotificationTray notifications={notifications} forRole="creator" onClose={() => setShowTray(false)} onMarkAllRead={() => { onMarkAllNotifsRead?.(); setShowTray(false); }} onViewAll={() => { setShowTray(false); onViewAllNotifications?.(); }} />}

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "20px 16px 100px" }}>

        {/* Profile card */}
        <div style={{ marginBottom: 24 }}>
          {/* Banner */}
          <div style={{ width: "100%", position: "relative" }}>
            <div style={{ width: "100%", height: "clamp(140px, 30vw, 300px)", borderRadius: 16, overflow: "hidden", background: creatorProfile.bannerUrl ? undefined : "linear-gradient(135deg, rgba(100,80,255,.25), rgba(255,80,160,.15))" }}>
              {creatorProfile.bannerUrl && <img src={creatorProfile.bannerUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />}
            </div>
            {/* Avatar */}
            <div style={{ position: "absolute", bottom: -55, left: 28, width: 110, height: 110, borderRadius: 18, border: "4px solid rgba(255,255,255,.15)", background: "#0c1424", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem", fontWeight: 700 }}>
              {creatorProfile.avatarUrl ? <img src={creatorProfile.avatarUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" /> : (creatorProfile.name || "T").charAt(0).toUpperCase()}
            </div>
          </div>
          {/* Name + bio + edit button */}
          <div style={{ paddingTop: 68 }}>
            <div style={{ fontSize: "clamp(1.4rem, 4vw, 2rem)", fontWeight: 700, fontFamily: "'Monda', system-ui, sans-serif", textTransform: "lowercase", letterSpacing: "-.01em" }}>{creatorProfile.name || user?.name || "your name"}</div>
            {/* Location · age */}
            {(creatorProfile.location || creatorProfile.age) && (
              <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
                {creatorProfile.location && <span style={{ fontSize: ".88rem", opacity: .5 }}>{creatorProfile.location}</span>}
                {creatorProfile.age && <span style={{ fontSize: ".88rem", opacity: .5 }}>· {creatorProfile.age} yrs</span>}
              </div>
            )}
            {/* Rating + completed campaigns — clickable */}
            {activeCampaigns.filter(c => c.myStage === "paid").length > 0 || creatorProfile.rating ? (
              <div onClick={() => setShowCreatorReviews(true)} style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8, cursor: "pointer" }}>
                <span style={{ color: "#fbbf24", fontSize: ".95rem" }}>{'★'.repeat(Math.round(creatorProfile.rating || 5))}{'☆'.repeat(5 - Math.round(creatorProfile.rating || 5))}</span>
                <span style={{ fontSize: ".85rem", opacity: .5 }}>{creatorProfile.rating || "5.0"} · <span style={{ fontWeight: 700, textDecoration: "underline", textUnderlineOffset: 3 }}>({(creatorProfile.reviews || []).length || 3} review{((creatorProfile.reviews || []).length || 3) !== 1 ? "s" : ""})</span></span>
              </div>
            ) : null}
            {/* Bio — above pills, single line */}
            {creatorProfile.bio && <div style={{ fontSize: ".95rem", opacity: .5, marginTop: 10, lineHeight: 1.6 }}>{creatorProfile.bio}</div>}
            {/* Niche tags */}
            {creatorProfile.niches && (
              <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                {creatorProfile.niches.split(",").map(n => n.trim()).filter(Boolean).map(n => (
                  <div key={n} style={{ fontSize: ".72rem", padding: "3px 10px", borderRadius: 20, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", opacity: .65 }}>{n}</div>
                ))}
              </div>
            )}
            {/* Platform cards */}
            {(() => {
              const platData = [
                { key: "Instagram", handle: creatorProfile.instagram, count: creatorProfile.instagramFollowers, url: "https://instagram.com/" },
                { key: "TikTok", handle: creatorProfile.tiktok, count: creatorProfile.tiktokFollowers, url: "https://tiktok.com/@" },
                { key: "YouTube", handle: creatorProfile.youtube, count: creatorProfile.youtubeFollowers, url: "https://youtube.com/@" },
                { key: "X", handle: creatorProfile.x, count: creatorProfile.xFollowers, url: "https://x.com/" },
              ].filter(p => p.handle);
              if (!platData.length) return null;
              return (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12, marginTop: 16 }}
                  className="nf-plat-grid">
                  <style>{`.nf-plat-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } @media(max-width:600px){ .nf-plat-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; } }`}</style>
                  {platData.map(p => (
                    <a key={p.key} href={p.url + p.handle.replace(/^@/, "")} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", borderRadius: 16, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 14, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.12)", transition: "transform .2s, border-color .2s, box-shadow .2s" }}
                      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.borderColor = "rgba(255,255,255,.2)"; e.currentTarget.style.boxShadow = "0 8px 30px rgba(0,0,0,.3)"; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.borderColor = "rgba(255,255,255,.12)"; e.currentTarget.style.boxShadow = "none"; }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(255,255,255,.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {PLAT_SVGS_SMALL[p.key]}
                        </div>
                        {p.count && (
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#fff", lineHeight: 1 }}>{p.count}</div>
                            <div style={{ fontSize: ".7rem", color: "rgba(255,255,255,.35)", marginTop: 2 }}>followers</div>
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize: ".85rem", color: "rgba(255,255,255,.6)" }}>{p.handle}</div>
                    </a>
                  ))}
                </div>
              );
            })()}
            {/* Edit profile — in hamburger menu */}
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, marginBottom: 24 }}>
          {[
            { label: "active campaigns", value: activeCampaigns.length, onClick: () => setShowActiveModal(true) },
            { label: "pending campaigns", value: appliedCampaigns.filter(c => c.status === "applied").length, onClick: () => setShowPendingModal(true) },
            { label: "completed campaigns", value: appliedCampaigns.filter(c => c.status === "paid").length, onClick: () => setShowCompletedModal(true) },
          ].map((s, i) => (
            <div key={i} className="nf-creator-card" style={{ padding: "18px 20px", textAlign: "center", cursor: "pointer" }} onClick={s.onClick}>
              <div style={{ fontSize: ".72rem", opacity: .35, marginBottom: 8, textTransform: "lowercase" }}>{s.label}</div>
              <div style={{ fontSize: "clamp(1.4rem, 3vw, 2rem)", fontWeight: 700, fontFamily: "'Monda', system-ui, sans-serif" }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Active campaigns */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: "1.1rem", fontWeight: 600, fontFamily: "'Monda', system-ui, sans-serif", marginBottom: 14 }}>active campaigns</div>
          {activeCampaigns.length === 0 ? (
            <div className="nf-creator-card" style={{ padding: "40px 24px", textAlign: "center", opacity: .3, fontSize: ".9rem" }}>no active campaigns yet</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {activeCampaigns.map((c, i) => {
                const stageIdx = CREATOR_STAGES.indexOf(c.myStage);
                return (
                  <div key={i} className="nf-creator-card" style={{ padding: "20px 24px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                      <div style={{ width: 54, height: 54, borderRadius: 14, overflow: "hidden", border: "1px solid rgba(255,255,255,.12)", flexShrink: 0, background: "#0c1424", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {c.logoUrl ? <img src={c.logoUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" /> : <span style={{ fontSize: ".6rem", opacity: .4 }}>logo</span>}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: "1rem" }}>{c.brand}</div>
                        <div style={{ fontSize: ".8rem", opacity: .4 }}>{c.campaign}</div>
                      </div>
                    </div>
                    {/* Stage tracker — matches brand view */}
                    <div style={{ display: "grid", gridTemplateColumns: `repeat(${CREATOR_STAGES.length}, 1fr)`, alignItems: "start", marginBottom: 4 }}>
                      {CREATOR_STAGES.map((s, si) => {
                        const isActive = si <= stageIdx;
                        const isCurrent = si === stageIdx;
                        const isLineFilled = si < stageIdx;
                        return (
                          <div key={s} style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
                            {si < CREATOR_STAGES.length - 1 && (
                              <div style={{ position: "absolute", top: 8, left: "calc(50% + 9px)", right: "calc(-50% + 9px)", height: 2, background: isLineFilled ? "#fff" : "rgba(255,255,255,.08)", transition: "background .3s" }} />
                            )}
                            <div style={{ width: isCurrent ? 18 : 14, height: isCurrent ? 18 : 14, borderRadius: "50%", background: isActive ? "#fff" : "rgba(255,255,255,.1)", border: isCurrent ? "2px solid #fff" : "none", boxShadow: isCurrent ? "0 0 12px rgba(255,255,255,.4)" : "none", marginTop: isCurrent ? 0 : 2, transition: "all .3s", position: "relative", zIndex: 1 }} />
                            <div style={{ fontSize: ".72rem", marginTop: 10, textAlign: "center", opacity: isCurrent ? .9 : isActive ? .45 : .2, fontWeight: isCurrent ? 600 : 400, lineHeight: 1.2, padding: "0 4px" }}>
                              {CREATOR_STAGE_LABELS[s]}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {c.deadline && <div style={{ fontSize: ".75rem", opacity: .3, marginTop: 10 }}>deadline: {c.deadline}</div>}
                    {/* Action buttons */}
                    <div style={{ display: "flex", gap: 8, marginTop: 16, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,.06)", justifyContent: "center", flexWrap: "wrap" }}>
                      <button className="nf-creator-btn" style={{ display: "flex", alignItems: "center", gap: 6 }} onClick={e => { e.stopPropagation(); onOpenMessages?.(c); }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                        send message
                      </button>
                      <button className="nf-creator-btn" style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(100,180,255,.08)", borderColor: "rgba(100,180,255,.25)", color: "rgba(100,180,255,.9)" }} onClick={e => { e.stopPropagation(); setSelectedUploadCampaign(c.applicationId); setShowUploadModal(true); }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>
                        upload content
                      </button>
                      <button className="nf-creator-btn" style={{ display: "flex", alignItems: "center", gap: 6 }} onClick={e => { e.stopPropagation(); onSelectCampaign?.(c); }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        view campaign
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Scheduled Calls */}
        {(() => {
          const callEntries = Object.entries(scheduledCalls).filter(([, call]) => call && !call.declined);
          if (callEntries.length === 0) return null;
          const formatCallTime = (iso, tz) => {
            try {
              return new Date(iso).toLocaleString("en-US", { timeZone: tz, weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" });
            } catch { return iso; }
          };
          return (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: "1.1rem", fontWeight: 600, fontFamily: "'Monda', system-ui, sans-serif", marginBottom: 14 }}>scheduled calls</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {callEntries.map(([key, call]) => {
                  const brand=call.brandName, campaign=call.campaignName;
                  const isPast = new Date(call.datetime) < new Date();
                  return (
                    <div key={key} style={{ padding: "14px 18px", borderRadius: 14, background: call.confirmed ? "rgba(100,200,255,.05)" : "rgba(255,255,255,.03)", border: `1px solid ${call.confirmed ? "rgba(100,200,255,.2)" : "rgba(255,255,255,.1)"}`, display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ fontWeight: 600, fontSize: ".88rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>{brand} · {campaign}</div>
                      <div style={{ width: 220, textAlign: "center", fontSize: ".8rem", opacity: .5, whiteSpace: "nowrap", flexShrink: 0 }}>{formatCallTime(call.datetime, call.timezone)}</div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0, width: 160, justifyContent: "flex-end" }}>
                        {call.confirmed ? (
                          <div style={{ padding: "5px 14px", borderRadius: 10, background: "rgba(100,255,150,.1)", border: "1px solid rgba(100,255,150,.25)", fontSize: ".78rem", fontWeight: 600, color: "rgba(100,255,150,.9)" }}>confirmed</div>
                        ) : !isPast ? (
                          <>
                            <div onClick={() => onRespondToCall?.(key, "confirm")} style={{ padding: "5px 14px", borderRadius: 10, background: "rgba(100,255,150,.1)", border: "1px solid rgba(100,255,150,.25)", color: "rgba(100,255,150,.9)", fontSize: ".78rem", fontWeight: 600, cursor: "pointer", animation: "nf-confirm-shimmer 2.5s ease-in-out infinite" }}>confirm</div>
                            <div onClick={() => onRespondToCall?.(key, "decline")} style={{ padding: "5px 14px", borderRadius: 10, background: "rgba(255,100,100,.07)", border: "1px solid rgba(255,100,100,.2)", color: "rgba(255,100,100,.7)", fontSize: ".78rem", fontWeight: 600, cursor: "pointer" }}>decline</div>
                          </>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

      </div>

      {/* Active campaigns modal */}
      {showActiveModal && (
        <div role="dialog" aria-modal="true" tabIndex={-1} ref={el => { if (el && !el.__f) { el.__f = true; el.focus(); } }} onKeyDown={e => { if (e.key === 'Escape') { setShowActiveModal(false); } }} onClick={() => setShowActiveModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "12px" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#0a1322", border: "1px solid rgba(255,255,255,.12)", borderRadius: 24, padding: "28px", maxWidth: 560, width: "100%", maxHeight: "80vh", overflowY: "auto", boxShadow: "0 40px 80px rgba(0,0,0,.6)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div style={{ fontSize: "1.1rem", fontWeight: 700, fontFamily: "'Monda', system-ui, sans-serif" }}>active campaigns</div>
              <div onClick={() => setShowActiveModal(false)} style={{ cursor: "pointer", width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", opacity: .7 }}><XIcon size={16} /></div>
            </div>
            {activeCampaigns.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", opacity: .3, fontSize: ".9rem" }}>no active campaigns</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {activeCampaigns.map((c, i) => {
                  const stageIdx = CREATOR_STAGES.indexOf(c.myStage);
                  return (
                    <div key={i} style={{ padding: "18px 20px", borderRadius: 14, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 14, overflow: "hidden", border: "1px solid rgba(255,255,255,.12)", background: "#0c1424", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {c.logoUrl ? <img src={c.logoUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" /> : <span style={{ fontSize: ".55rem", opacity: .4 }}>logo</span>}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: ".95rem" }}>{c.brand}</div>
                          <div style={{ fontSize: ".78rem", opacity: .4 }}>{c.campaign}</div>
                        </div>
                        {c.deadline && <div style={{ fontSize: ".72rem", opacity: .3 }}>due {c.deadline}</div>}
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: `repeat(${CREATOR_STAGES.length}, 1fr)`, alignItems: "start" }}>
                        {CREATOR_STAGES.map((s, si) => {
                          const isActive = si <= stageIdx;
                          const isCurrent = si === stageIdx;
                          return (
                            <div key={s} style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
                              {si < CREATOR_STAGES.length - 1 && <div style={{ position: "absolute", top: 8, left: "calc(50% + 9px)", right: "calc(-50% + 9px)", height: 2, background: si < stageIdx ? "#fff" : "rgba(255,255,255,.08)" }} />}
                              <div style={{ width: isCurrent ? 18 : 14, height: isCurrent ? 18 : 14, borderRadius: "50%", background: isActive ? "#fff" : "rgba(255,255,255,.1)", border: isCurrent ? "2px solid #fff" : "none", boxShadow: isCurrent ? "0 0 12px rgba(255,255,255,.4)" : "none", marginTop: isCurrent ? 0 : 2, position: "relative", zIndex: 1 }} />
                              <div style={{ fontSize: ".6rem", marginTop: 8, textAlign: "center", opacity: isCurrent ? .9 : isActive ? .45 : .2, fontWeight: isCurrent ? 600 : 400, lineHeight: 1.2, padding: "0 2px" }}>{CREATOR_STAGE_LABELS[s]}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Completed campaigns modal */}
      {showCompletedModal && (
        <div role="dialog" aria-modal="true" tabIndex={-1} ref={el => { if (el && !el.__f) { el.__f = true; el.focus(); } }} onKeyDown={e => { if (e.key === 'Escape') { setShowCompletedModal(false); } }} onClick={() => setShowCompletedModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "12px" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#0a1322", border: "1px solid rgba(255,255,255,.12)", borderRadius: 24, padding: "28px", maxWidth: 540, width: "100%", maxHeight: "80vh", overflowY: "auto", boxShadow: "0 40px 80px rgba(0,0,0,.6)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div style={{ fontSize: "1.1rem", fontWeight: 700, fontFamily: "'Monda', system-ui, sans-serif" }}>completed campaigns</div>
              <div onClick={() => setShowCompletedModal(false)} style={{ cursor: "pointer", width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", opacity: .7 }}><XIcon size={16} /></div>
            </div>
            {appliedCampaigns.filter(c => c.status === "accepted").length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", opacity: .3, fontSize: ".9rem" }}>no completed campaigns yet</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {appliedCampaigns.filter(c => c.status === "accepted").map((c, i) => (
                  <div key={i} style={{ padding: "16px 18px", borderRadius: 14, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 14, overflow: "hidden", border: "1px solid rgba(255,255,255,.1)", background: "#0c1424", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {c.logoUrl ? <img src={c.logoUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" /> : <span style={{ fontSize: ".55rem", opacity: .4 }}>logo</span>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: ".95rem" }}>{c.brand}</div>
                      <div style={{ fontSize: ".78rem", opacity: .4 }}>{c.campaign}</div>
                    </div>
                    <div style={{ fontSize: ".68rem", fontWeight: 600, padding: "4px 12px", borderRadius: 20, background: "rgba(100,255,150,.1)", border: "1px solid rgba(100,255,150,.25)", color: "rgba(180,255,80,.95)" }}>completed</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pending applications modal */}
      {showPendingModal && (
        <div role="dialog" aria-modal="true" tabIndex={-1} ref={el => { if (el && !el.__f) { el.__f = true; el.focus(); } }} onKeyDown={e => { if (e.key === 'Escape') { setShowPendingModal(false); } }} onClick={() => setShowPendingModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "12px" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#0a1322", border: "1px solid rgba(255,255,255,.12)", borderRadius: 24, padding: "28px 28px", maxWidth: 540, width: "100%", maxHeight: "80vh", overflowY: "auto", boxShadow: "0 40px 80px rgba(0,0,0,.6)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div style={{ fontSize: "1.1rem", fontWeight: 700, fontFamily: "'Monda', system-ui, sans-serif" }}>my applications</div>
              <div onClick={() => setShowPendingModal(false)} style={{ cursor: "pointer", width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", opacity: .7 }}><XIcon size={16} /></div>
            </div>
            {appliedCampaigns.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", opacity: .3, fontSize: ".9rem" }}>no applications yet</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {appliedCampaigns.map((c, i) => {
                  const statusStyle = APPLICATION_STATUS_COLORS[c.status] || APPLICATION_STATUS_COLORS.applied;
                  return (
                    <div key={i} style={{ padding: "16px 18px", borderRadius: 14, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 14, overflow: "hidden", border: "1px solid rgba(255,255,255,.1)", background: "#0c1424", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {c.logoUrl ? <img src={c.logoUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" /> : <span style={{ fontSize: ".55rem", opacity: .4 }}>logo</span>}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: ".95rem" }}>{c.brand}</div>
                        <div style={{ fontSize: ".78rem", opacity: .4, marginTop: 2 }}>{c.campaign}</div>
                      </div>
                      <div style={{ fontSize: ".68rem", fontWeight: 600, padding: "4px 12px", borderRadius: 20, background: statusStyle.bg, border: `1px solid ${statusStyle.border}`, color: statusStyle.color, whiteSpace: "nowrap" }}>
                        {statusStyle.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Upload modal */}
      {showUploadModal && (
        <div role="dialog" aria-modal="true" tabIndex={-1} ref={el => { if (el && !el.__f) { el.__f = true; el.focus(); } }} onKeyDown={e => { if (e.key === 'Escape') { setShowUploadModal(false); } }} onClick={() => setShowUploadModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "12px" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#0a1322", border: "1px solid rgba(255,255,255,.12)", borderRadius: 24, padding: "28px 28px", maxWidth: 480, width: "100%", boxShadow: "0 40px 80px rgba(0,0,0,.6)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <div style={{ fontSize: "1.1rem", fontWeight: 700, fontFamily: "'Monda', system-ui, sans-serif" }}>upload content</div>{uploadError&&<p className="async-error" role="alert">{uploadError}</p>}
              <div onClick={() => setShowUploadModal(false)} style={{ cursor: "pointer", width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", opacity: .7 }}><XIcon size={16} /></div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <div style={{ fontSize: ".75rem", opacity: .4, marginBottom: 6, textTransform: "lowercase" }}>campaign</div>
                <select value={selectedUploadCampaign} onChange={e => setSelectedUploadCampaign(e.target.value)} style={{ width: "100%", padding: "12px 14px", borderRadius: 11, border: "1px solid rgba(255,255,255,.15)", background: "rgba(0,0,0,.4)", color: selectedUploadCampaign ? "#fff" : "rgba(255,255,255,.35)", fontSize: ".88rem", outline: "none", fontFamily: "system-ui, sans-serif" }}>
                  <option value="">select a campaign...</option>
                  {activeCampaigns.map((c, i) => <option key={i} value={c.applicationId}>{c.brand} · {c.campaign}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: ".75rem", opacity: .4, marginBottom: 6, textTransform: "lowercase" }}>file</div>
                <label style={{ display: "block", padding: "20px", borderRadius: 11, border: `2px dashed ${uploadFile ? "rgba(100,180,255,.4)" : "rgba(255,255,255,.12)"}`, background: uploadFile ? "rgba(100,180,255,.05)" : "rgba(255,255,255,.02)", cursor: "pointer", textAlign: "center", transition: "all .15s" }}>
                  <input type="file" style={{ display: "none" }} onChange={e => setUploadFile(e.target.files[0])} />
                  {uploadFile ? (
                    <div>
                      <div style={{ fontSize: ".88rem", color: "rgba(100,180,255,.9)", fontWeight: 600 }}>{uploadFile.name}</div>
                      <div style={{ fontSize: ".72rem", opacity: .4, marginTop: 4 }}>{(uploadFile.size / 1024 / 1024).toFixed(1)} MB</div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: ".88rem", opacity: .4 }}>click to choose a file</div>
                      <div style={{ fontSize: ".72rem", opacity: .25, marginTop: 4 }}>video, image, or document</div>
                    </div>
                  )}
                </label>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button className="nf-creator-btn" style={{ flex: 1 }} onClick={() => setShowUploadModal(false)}>cancel</button>
                <button disabled={uploadBusy || !uploadFile || !selectedUploadCampaign} onClick={handleUploadSubmit} aria-busy={uploadBusy} style={{ flex: 2, padding: "11px", borderRadius: 11, border: uploadFile && selectedUploadCampaign ? "1px solid rgba(100,180,255,.35)" : "1px solid rgba(255,255,255,.1)", background: uploadFile && selectedUploadCampaign ? "rgba(100,180,255,.12)" : "transparent", color: uploadFile && selectedUploadCampaign ? "rgba(100,180,255,.9)" : "rgba(255,255,255,.25)", fontSize: ".88rem", fontWeight: 600, cursor: uploadFile && selectedUploadCampaign ? "pointer" : "not-allowed", fontFamily: "system-ui, sans-serif", textTransform: "lowercase", transition: "all .12s" }}>upload</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Creator reviews modal */}
      {showCreatorReviews && (() => {
        const demoReviews = [];
        const reviews = creatorProfile.reviews || demoReviews;
        const filtered = reviewStarFilter ? reviews.filter(r => r.rating === reviewStarFilter) : reviews;
        const avg = reviews.length?(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1):"—";
        const counts = [5,4,3,2,1].map(s => ({ star: s, count: reviews.filter(r => r.rating === s).length }));
        return (
          <div role="dialog" aria-modal="true" tabIndex={-1} ref={el => { if (el && !el.__f) { el.__f = true; el.focus(); } }} onKeyDown={e => { if (e.key === 'Escape') { setShowCreatorReviews(false); setReviewStarFilter(null); } }} onClick={() => { setShowCreatorReviews(false); setReviewStarFilter(null); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: "#0a1322", border: "1px solid rgba(255,255,255,.12)", borderRadius: 20, padding: "24px 28px", maxWidth: 560, width: "100%", maxHeight: "80vh", overflowY: "auto", boxShadow: "0 40px 80px rgba(0,0,0,.6)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <div style={{ fontSize: "1.1rem", fontWeight: 700, fontFamily: "'Monda', system-ui, sans-serif" }}>reviews</div>
                <div onClick={() => { setShowCreatorReviews(false); setReviewStarFilter(null); }} style={{ cursor: "pointer", opacity: .4, fontSize: "1.1rem" }}><XIcon size={16} /></div>
              </div>
              <div style={{ display: "flex", gap: 24, alignItems: "flex-start", marginBottom: 20, paddingBottom: 20, borderBottom: "1px solid rgba(255,255,255,.07)" }}>
                <div style={{ textAlign: "center", flexShrink: 0 }}>
                  <div style={{ fontSize: "3rem", fontWeight: 700, lineHeight: 1 }}>{avg}</div>
                  <div style={{ color: "#fbbf24", fontSize: "1rem", margin: "4px 0" }}>{"★".repeat(Number.isFinite(parseFloat(avg))?Math.round(parseFloat(avg)):0)}</div>
                  <div style={{ fontSize: ".72rem", opacity: .35 }}>{reviews.length} reviews</div>
                </div>
                <div style={{ flex: 1 }}>
                  {counts.map(({ star, count }) => {
                    const pct = reviews.length ? Math.round((count / reviews.length) * 100) : 0;
                    const isActive = reviewStarFilter === star;
                    return (
                      <div key={star} onClick={() => setReviewStarFilter(isActive ? null : star)} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, cursor: "pointer", opacity: reviewStarFilter && !isActive ? .35 : 1, transition: "opacity .15s" }}>
                        <span style={{ fontSize: ".78rem", color: "#fbbf24", minWidth: 14 }}>{star}</span>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="#fbbf24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                        <div style={{ flex: 1, height: 6, borderRadius: 3, background: "rgba(255,255,255,.08)", overflow: "hidden" }}>
                          <div style={{ width: `${pct}%`, height: "100%", borderRadius: 3, background: isActive ? "#fbbf24" : "rgba(251,191,36,.5)", transition: "background .15s" }} />
                        </div>
                        <span style={{ fontSize: ".72rem", opacity: .4, minWidth: 16, textAlign: "right" }}>{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              {filtered.length === 0 ? (
                <div style={{ textAlign: "center", padding: "30px 0", opacity: .3, fontSize: ".9rem" }}>no {reviewStarFilter}-star reviews</div>
              ) : filtered.map((r, i) => (
                <div key={i} style={{ paddingBottom: 18, marginBottom: 18, borderBottom: i < filtered.length - 1 ? "1px solid rgba(255,255,255,.06)" : "none" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <div>
                      <span style={{ fontWeight: 600, fontSize: ".9rem" }}>{r.brand}</span>
                      <span style={{ fontSize: ".8rem", opacity: .4, marginLeft: 8 }}>{r.campaign}</span>
                    </div>
                    <span style={{ fontSize: ".72rem", opacity: .3 }}>{new Date(r.date).toLocaleDateString([], { month: "short", year: "numeric" })}</span>
                  </div>
                  <div style={{ color: "#fbbf24", fontSize: ".85rem", marginBottom: 6 }}>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</div>
                  <div style={{ fontSize: ".88rem", opacity: .65, lineHeight: 1.6 }}>{r.text}</div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Edit profile modal */}
      {showEditModal && (
        <div role="dialog" aria-modal="true" tabIndex={-1} ref={el => { if (el && !el.__f) { el.__f = true; el.focus(); } }} onKeyDown={e => { if (e.key === 'Escape') { setShowEditModal(false); } }} onClick={() => setShowEditModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "12px" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#0a1322", border: "1px solid rgba(255,255,255,.12)", borderRadius: 24, padding: "28px 28px", maxWidth: 480, width: "100%", maxHeight: "85vh", overflowY: "auto", boxShadow: "0 40px 80px rgba(0,0,0,.6)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <div style={{ fontSize: "1.1rem", fontWeight: 700, fontFamily: "'Monda', system-ui, sans-serif" }}>edit profile</div>
              <div onClick={() => setShowEditModal(false)} style={{ cursor: "pointer", width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", opacity: .7 }}><XIcon size={16} /></div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Avatar */}
              <div>
                <div style={{ fontSize: ".72rem", opacity: .35, marginBottom: 5, textTransform: "lowercase" }}>profile photo</div>
                {editForm.avatarEditing && editForm.avatarUrl ? (
                  <ImageEditor src={editForm.avatarUrl} shape="circle"
                    onSave={(t) => setEditForm(p => ({ ...p, avatarUrl: t.croppedDataUrl, avatarEditing: false }))}
                    onCancel={() => setEditForm(p => ({ ...p, avatarEditing: false }))} />
                ) : (
                  <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
                    <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = ev => setEditForm(p => ({ ...p, avatarUrl: ev.target.result, avatarEditing: true })); r.readAsDataURL(f); } }} />
                    <div style={{ width: 56, height: 56, borderRadius: 14, border: "1px dashed rgba(255,255,255,.25)", overflow: "hidden", flexShrink: 0, background: "rgba(255,255,255,.04)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {editForm.avatarUrl ? <img src={editForm.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: ".65rem", opacity: .35 }}>photo</span>}
                    </div>
                    <span style={{ fontSize: ".78rem", opacity: .4 }}>{editForm.avatarUrl ? "click to change" : "click to upload profile photo"}</span>
                  </label>
                )}
              </div>
              {/* Banner */}
              <div>
                <div style={{ fontSize: ".72rem", opacity: .35, marginBottom: 5, textTransform: "lowercase" }}>banner</div>
                {editForm.bannerEditing && editForm.bannerUrl ? (
                  <ImageEditor src={editForm.bannerUrl} shape="banner"
                    onSave={(t) => setEditForm(p => ({ ...p, bannerUrl: t.croppedDataUrl, bannerEditing: false }))}
                    onCancel={() => setEditForm(p => ({ ...p, bannerEditing: false }))} />
                ) : (
                  <label style={{ display: "block", cursor: "pointer" }}>
                    <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = ev => setEditForm(p => ({ ...p, bannerUrl: ev.target.result, bannerEditing: true })); r.readAsDataURL(f); } }} />
                    <div style={{ width: "100%", height: 70, borderRadius: 12, border: "1px dashed rgba(255,255,255,.2)", overflow: "hidden", background: "rgba(255,255,255,.03)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {editForm.bannerUrl ? <img src={editForm.bannerUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: ".72rem", opacity: .35 }}>click to upload banner</span>}
                    </div>
                  </label>
                )}
              </div>
              {/* Basic info */}
              <div style={{ fontSize: ".7rem", opacity: .3, textTransform: "uppercase", letterSpacing: ".08em" }}>basic info</div>
              {[["name", "your name"], ["bio", "short bio (shown on profile)"]].map(([field, placeholder]) => (
                <div key={field}>
                  <div style={{ fontSize: ".72rem", opacity: .35, marginBottom: 5, textTransform: "lowercase" }}>{field}</div>
                  <input className="nf-creator-input" placeholder={placeholder} value={editForm[field] || ""} onChange={e => setEditForm(f => ({ ...f, [field]: e.target.value }))} />
                </div>
              ))}
              <div style={{ display: "flex", gap: 10 }}>
                {[["city", "city"], ["state", "state"], ["country", "country"]].map(([field, placeholder]) => (
                  <div key={field} style={{ flex: 1 }}>
                    <div style={{ fontSize: ".72rem", opacity: .35, marginBottom: 5, textTransform: "lowercase" }}>{field}</div>
                    <input className="nf-creator-input" placeholder={placeholder} value={editForm[field] || ""} onChange={e => {
                      const val = e.target.value;
                      setEditForm(f => {
                        const updated = { ...f, [field]: val };
                        updated.location = [updated.city, updated.state, updated.country].filter(Boolean).join(", ");
                        return updated;
                      });
                    }} />
                  </div>
                ))}
              </div>
              {[["age", "your age"], ["languages", "e.g. English, Spanish"]].map(([field, placeholder]) => (
                <div key={field}>
                  <div style={{ fontSize: ".72rem", opacity: .35, marginBottom: 5, textTransform: "lowercase" }}>{field}</div>
                  <input className="nf-creator-input" placeholder={placeholder} value={editForm[field] || ""} onChange={e => setEditForm(f => ({ ...f, [field]: e.target.value }))} />
                </div>
              ))}
              <div>
                <div style={{ fontSize: ".72rem", opacity: .35, marginBottom: 5, textTransform: "lowercase" }}>niches</div>
                <input className="nf-creator-input" placeholder="e.g. fitness, wellness, travel (comma separated)" value={editForm.niches || ""} onChange={e => setEditForm(f => ({ ...f, niches: e.target.value }))} />
              </div>
              {/* Skills */}
              <div style={{ fontSize: ".7rem", opacity: .3, textTransform: "uppercase", letterSpacing: ".08em", marginTop: 4 }}>skills</div>
              <div style={{ display: "flex", gap: 8 }}>
                {GIG_SKILLS.map(skill => {
                  const isSelected = (editForm.skills || []).includes(skill);
                  return (
                    <div key={skill}
                      onClick={() => setEditForm(f => ({ ...f, skills: isSelected ? (f.skills || []).filter(s => s !== skill) : [...(f.skills || []), skill] }))}
                      style={{ flex: 1, padding: "8px 12px", borderRadius: 12, cursor: "pointer", textAlign: "center", fontSize: ".82rem", transition: "all .15s", border: `1px solid ${isSelected ? "rgba(255,255,255,.5)" : "rgba(255,255,255,.12)"}`, background: isSelected ? "rgba(255,255,255,.1)" : "rgba(255,255,255,.03)", color: isSelected ? "#fff" : "rgba(255,255,255,.5)" }}>
                      {skill}
                    </div>
                  );
                })}
              </div>
              <div style={{ fontSize: ".7rem", opacity: .3, textTransform: "uppercase", letterSpacing: ".08em", marginTop: 4 }}>platforms</div>
              <div style={{ fontSize: ".72rem", opacity: .3, marginTop: -8 }}>follower counts are self-reported — verification coming soon</div>
              {[["instagram", "Instagram handle", "instagramFollowers", "followers"], ["tiktok", "TikTok handle", "tiktokFollowers", "followers"], ["youtube", "YouTube channel", "youtubeFollowers", "subscribers"], ["x", "X handle", "xFollowers", "followers"], ["facebook", "Facebook page / profile", "facebookFollowers", "followers"]].map(([handleField, handlePlaceholder, countField, countLabel]) => (
                <div key={handleField}>
                  <div style={{ fontSize: ".72rem", opacity: .35, marginBottom: 5, textTransform: "lowercase" }}>{handleField}</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input className="nf-creator-input" placeholder={handlePlaceholder} value={editForm[handleField] || ""} onChange={e => setEditForm(f => ({ ...f, [handleField]: e.target.value }))} style={{ flex: 2 }} />
                    <input className="nf-creator-input" placeholder={countLabel} value={editForm[countField] || ""} onChange={e => setEditForm(f => ({ ...f, [countField]: e.target.value }))} style={{ flex: 1 }} />
                  </div>
                </div>
              ))}
              <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                <button className="nf-creator-btn" style={{ flex: 1 }} onClick={() => setShowEditModal(false)}>cancel</button>
                <button disabled={profileSaveBusy} onClick={async () => {setProfileSaveBusy(true);setProfileSaveError("");try{await onEditProfile(editForm); setShowEditModal(false);}catch(error){setProfileSaveError(error.message);}finally{setProfileSaveBusy(false);}}} style={{ flex: 2, padding: "11px", borderRadius: 11, border: "1px solid rgba(255,255,255,.28)", background: "rgba(255,255,255,.08)", color: "#fff", fontSize: ".88rem", fontWeight: 600, cursor: "pointer", fontFamily: "system-ui, sans-serif", textTransform: "lowercase", transition: "all .12s" }}>save profile</button>
              </div>
            </div>
          </div>
        </div>
      )}
      <div style={{ textAlign: "center", padding: "32px 0 16px", fontSize: ".75rem", opacity: .28, fontFamily: "system-ui, sans-serif" }}>
        questions? <a href="mailto:support@nfluenceagency.com" style={{ color: "inherit", textDecoration: "underline", textDecorationColor: "rgba(255,255,255,.25)" }}>support@nfluenceagency.com</a>
      </div>
    </div>
  );
}



// ═══════════════════════════════════════════════

// ── FAQPage ──

function FAQPage({ onBack, onStart, onSignIn, user, creatorUser }) {
  const [openIdx, setOpenIdx] = useState(null);

  const sections = [
    {
      heading: "about nfluence",
      items: [
        { q: "what is nfluence?", a: "Nfluence is a digital marketing agency. Part of what we do is bring creators and brands together — so we built this platform to simplify the entire process. Instead of DMing influencers one by one, brands create a campaign, set their requirements, and interested creators comes to you. We used to charge $1,500+ per campaign to source influencers, collect deliverables, and manage everything. nfluence brings those workflows into one workspace for a flat $299 per campaign." },
        { q: "how much does it cost?", a: "$299 per campaign for brands, or $1,999/year for unlimited campaigns (up to 3 active at once). Free for creators. Any creator budget you offer is separate — that's your call, not a platform fee." },
        { q: "what is the annual plan?", a: "The annual plan is $1,999 for 12 months and gives you unlimited campaign publications with up to 3 running simultaneously — no per-campaign fees. It does not renew automatically. It also includes 1 free 30-day featured campaign per month (a $600 value). You break even at 7 campaigns. If you're running more than 7 campaigns a year, the annual plan pays for itself." },
        { q: "what do I get for $299?", a: "Publish one campaign and manage applications, approvals, shipping references, private content submissions, revision requests, messages and completed payment records. Creator compensation, optional featured placement and any separately agreed agency work are additional." },
      ],
    },
    {
      heading: "creator budgets & compensation",
      items: [
        { q: "do I need a creator budget?", a: "No — a budget is completely optional. Many brands run successful product-seeding campaigns where creators receive free product in exchange for approved content, no cash involved." },
        { q: "why should I consider a paid campaign?", a: "Paid campaigns significantly outperform product-only campaigns across the board: they fill more prominently, attract higher-quality creators with larger and more engaged audiences, generate more content per campaign, produce higher view counts and reach, and result in better overall content quality. Paid creators treat it like a job." },
        { q: "is there a sourcing guarantee?", a: "Creator availability and acceptance vary. The platform fee covers publishing and managing your campaign. Discuss any additional sourcing service and written commitments with nfluence before buying." },
        { q: "how do creators get paid?", a: "Creator compensation is separate from the platform fee. Agree the payment method and timing in your campaign. Approving content does not automatically transfer funds. A completed manual payment is recorded with its amount and reference. For product-only campaigns, the brand ships the agreed product." },
      ],
    },
    {
      heading: "setting up your campaign",
      items: [
        { q: "how many creators can join?", a: "That's up to you. You set a cap during setup — or leave it open. Campaigns run for a maximum of 30 days." },
        { q: "how does creator vetting work?", a: "Set your requirements in the campaign brief and review each application before accepting it. Check platform handles, audience fit, age eligibility and agreed deliverables yourself. Profile claims are supplied by creators." },
        { q: "how do creators know what to post?", a: "Two options: upload a creator posting guide during campaign setup (brand guidelines, sample posts, dos and don'ts), or schedule a call with each accepted creator once they're in." },
        { q: "can I edit my campaign after publishing?", a: "Yes — most fields are editable anytime: name, description, banner, deadline, creator cap, location, requirements, products, and featured placement. Two things lock once any creator has been accepted: platforms and deliverables (creators applied based on these terms), and compensation type. The compensation type stays fixed after acceptance. You can increase the agreed payment amount, but cannot reduce it." },
      ],
    },
    {
      heading: "managing creators",
      items: [
        { q: "what's the creator pipeline?", a: "Once accepted: accepted → product shipped → content submitted → content approved → paid. You advance each creator manually as things happen." },
        { q: "what happens after I approve a creator?", a: "A 3-business-day clock starts. You need to ship their product and enter a tracking number within that window. Missing this window will flag your product shipped card as overdue on your dashboard — it's a private reminder, only visible to you. However, slow or missing shipments can show up in creator reviews of your brand, which are public and can hurt your ability to attract quality creators in the future." },
        { q: "can I review content before it goes live?", a: "Yes. Enable content approval in your campaign settings. Creators submit content first, you approve or request revisions, then they post." },
        { q: "what counts as a business day?", a: "Monday through Friday, excluding weekends. Holidays are not currently excluded." },
      ],
    },
    {
      heading: "featured placement",
      items: [
        { q: "what is featured placement?", a: "Featured placement pins your campaign to the top of the browse page and landing page above all non-featured campaigns. Your brand name gets a gold shimmer effect so creators spot you immediately as they scroll." },
        { q: "what does featured include?", a: "First position above all non-featured campaigns on the browse and landing page. A gold shimmer on your brand name. Priority visibility to creators browsing the platform. The ability to add or remove featured placement at any time — even after publishing." },
        { q: "how is the order determined for featured campaigns?", a: "Featured campaigns are randomized daily — not alphabetical, not by spend. Every day the order reshuffles so no single brand has a permanent advantage. The order is consistent throughout the day but changes at midnight." },
        { q: "how much does featured cost?", a: "Three options: $2.99 for 1 day, $14.99 for 7 days, or $49.99 for 30 days. You can add or extend featured placement at any time from your campaign settings." },
      ],
    },
  ];

  return (
    <div style={{ minHeight: "100vh", overflowX: "hidden", background: "radial-gradient(circle at calc(46% + 250px) calc(58% - 175px), rgba(255,255,255,.103) 0%, rgba(255,255,255,.0309) 38%, transparent 52%), linear-gradient(180deg, #040b15 0%, #070f1f 100%)", backgroundColor: "#040b15", color: "#fff", fontFamily: "system-ui, sans-serif" }}>
      <style>{`
        @font-face { font-family: 'Monda'; src: url('/assets/Monda-Regular.woff') format('woff'); font-weight: 400 700; font-style: normal; font-display: swap; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .nf-faq-item { border: 1px solid rgba(255,255,255,.08); border-radius: 14px; overflow: hidden; transition: border-color .2s; }
        .nf-faq-item:hover { border-color: rgba(255,255,255,.18); }
        .nf-faq-q { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px; cursor: pointer; gap: 16px; }
        .nf-faq-a { padding: 0 20px 18px; font-size: .9rem; opacity: .6; line-height: 1.7; }
        .nf-faq-cta { transition: transform .12s, border-color .2s, background .2s; }
        .nf-faq-cta:hover { transform: translateY(-2px); border-color: rgba(255,255,255,.45) !important; background: rgba(255,255,255,.12) !important; }
      `}</style>

      <PublicNav onSignIn={onSignIn}/>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 24px 100px" }}>
        <div style={{ marginBottom: 48, textAlign: "center" }}>
          <h1 style={{ fontFamily: "'Monda', system-ui, sans-serif", fontSize: "2rem", fontWeight: 700, marginBottom: 10 }}>frequently asked questions</h1>
          <p style={{ opacity: .4, fontSize: ".95rem" }}>everything you need to know about running campaigns on nfluence</p>
        </div>

        {sections.map((section, si) => (
          <div key={si} style={{ marginBottom: 40 }}>
            <div style={{ fontFamily: "'Monda', system-ui, sans-serif", fontSize: ".75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".1em", opacity: .3, marginBottom: 14, paddingLeft: 4 }}>{section.heading}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {section.items.map((item, ii) => {
                const key = `${si}-${ii}`;
                const isOpen = openIdx === key;
                return (
                  <div key={key} className="nf-faq-item" style={{ background: isOpen ? "rgba(255,255,255,.04)" : "rgba(255,255,255,.02)" }}>
                    <button type="button" className="nf-faq-q" aria-expanded={isOpen} aria-controls={"faq-"+key} onClick={() => setOpenIdx(isOpen ? null : key)}>
                      <span style={{ fontSize: ".95rem", fontWeight: 500, opacity: .9, flex: 1 }}>{item.q}</span>
                      <span style={{ opacity: .35, fontSize: ".85rem", flexShrink: 0, transition: "transform .2s", transform: isOpen ? "rotate(45deg)" : "none" }}>+</span>
                    </button>
                    {isOpen && <div id={"faq-"+key} className="nf-faq-a">{item.a}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <div style={{ marginTop: 16, padding: "32px", borderRadius: 20, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)", textAlign: "center" }}>
          <div style={{ fontFamily: "'Monda', system-ui, sans-serif", fontSize: "1.2rem", fontWeight: 700, marginBottom: 8 }}>ready to launch?</div>
          <div style={{ fontSize: ".9rem", opacity: .45, marginBottom: 24 }}>join the brands already growing with nfluence</div>
          <button onClick={onStart} className="nf-faq-cta" style={{ padding: "14px 32px", borderRadius: 14, border: "1px solid rgba(255,255,255,.25)", background: "rgba(255,255,255,.08)", color: "#fff", cursor: "pointer", fontFamily: "system-ui, sans-serif", fontSize: ".95rem", fontWeight: 600, textTransform: "lowercase" }}>start a campaign — $299</button>
        </div>
        <div style={{ textAlign: "center", marginTop: 32, fontSize: ".78rem", opacity: .3, fontFamily: "system-ui, sans-serif", lineHeight: 1.7 }}>
          still have questions? email us at <a href="mailto:support@nfluenceagency.com" style={{ color: "inherit", textDecoration: "underline", textDecorationColor: "rgba(255,255,255,.25)" }}>support@nfluenceagency.com</a>
        </div>
      </div>
    </div>
  );
}

// ── OnboardingPage ──

function OnboardingPage({ onDone }) {
  const [agreed, setAgreed] = useState(false);

  const rules = [
    {
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.5)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>,
      title: "your campaign is live",
      body: "your campaign is published in the campaign directory. creators can review your requirements and apply while places are available.",
    },
    {
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.5)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
      title: "ship within 3 business days of approving a creator",
      body: "once you approve a creator, a 3-business-day clock starts. ship their product and enter a tracking number before it runs out. your dashboard will flag overdue shipments — and slow delivery can show up in creator reviews of your brand, which are public.",
    },
    {
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.5)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
      title: "you control the pipeline",
      body: "creators move through stages: accepted → product shipped → content submitted → content approved → paid. you advance each creator manually as things happen. on paid campaigns, approval does not itself transfer money. Record actual creator payments with a payment reference.",
    },
    {
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.5)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
      title: "you can edit your campaign anytime",
      body: "most fields — name, description, banner, deadline, creator cap, location, requirements, products — are always editable. featured placement can be added or removed at any time. platforms, deliverables, and compensation type lock once a creator has been accepted. you can upgrade compensation but never reduce it.",
    },
    {
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.5)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
      title: "your reputation matters",
      body: "creators leave public reviews of brands they've worked with. brands that communicate clearly, ship on time, and pay promptly attract better creators and fill campaigns faster. treat your creators well.",
    },
    {
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.5)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
      title: "paid campaigns perform significantly better",
      body: "set a clear creator budget that reflects the work, usage rights and timeline. Responses and results vary. Agree any sourcing assistance with nfluence in writing before your campaign.",
    },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(circle at 60% 20%, rgba(255,255,255,.06) 0%, transparent 55%), linear-gradient(180deg, #040b15 0%, #070f1f 100%)", color: "#fff", fontFamily: "system-ui, sans-serif" }}>
      <style>{`
        @font-face { font-family: 'Monda'; src: url('/assets/Monda-Regular.woff') format('woff'); font-weight: 400 700; font-style: normal; font-display: swap; }
        .nf-onboard-card { background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.08); border-radius: 16px; padding: 20px 22px; transition: border-color .2s; }
        .nf-onboard-card:hover { border-color: rgba(255,255,255,.16); }
      `}</style>

      <div style={{ maxWidth: 620, margin: "0 auto", padding: "48px 24px 80px" }}>
        <div style={{ marginBottom: 36 }}>
          <div style={{ fontFamily: "'Monda', system-ui, sans-serif", fontSize: ".85rem", opacity: .4, marginBottom: 10, textTransform: "lowercase", letterSpacing: ".04em" }}>campaign published</div>
          <h1 style={{ fontFamily: "'Monda', system-ui, sans-serif", fontSize: "2rem", fontWeight: 700, lineHeight: 1.2, marginBottom: 10 }}>before you head to your dashboard</h1>
          <p style={{ fontSize: "1rem", opacity: .5, lineHeight: 1.65 }}>here's what you need to know to run a successful campaign on nfluence.</p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
          {rules.map((r, i) => (
            <div key={i} className="nf-onboard-card">
              <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }} dangerouslySetInnerHTML={{ __html: r.icon }} />
                <div>
                  <div style={{ fontFamily: "'Monda', system-ui, sans-serif", fontSize: ".95rem", fontWeight: 600, marginBottom: 6, textTransform: "lowercase" }}>{r.title}</div>
                  <div style={{ fontSize: ".85rem", opacity: .55, lineHeight: 1.65 }}>{r.body}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div onClick={() => setAgreed(a => !a)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", borderRadius: 14, marginBottom: 20, background: agreed ? "rgba(100,255,150,.05)" : "rgba(255,255,255,.03)", border: `1px solid ${agreed ? "rgba(100,255,150,.25)" : "rgba(255,255,255,.1)"}`, cursor: "pointer", transition: "all .2s" }}>
          <div style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0, background: agreed ? "rgba(100,255,150,.2)" : "rgba(255,255,255,.08)", border: `1.5px solid ${agreed ? "rgba(100,255,150,.6)" : "rgba(255,255,255,.2)"}`, display: "flex", alignItems: "center", justifyContent: "center", transition: "all .2s" }}>
            {agreed && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(100,255,150,.9)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
          </div>
          <span style={{ fontSize: ".88rem", opacity: .7, lineHeight: 1.4 }}>i've read and understood the guidelines above</span>
        </div>

        <button onClick={onDone} disabled={!agreed} style={{ width: "100%", padding: "16px", borderRadius: 16, fontFamily: "system-ui, sans-serif", fontSize: "1rem", fontWeight: 600, textTransform: "lowercase", background: agreed ? "rgba(255,255,255,.1)" : "rgba(255,255,255,.03)", border: `1px solid ${agreed ? "rgba(255,255,255,.3)" : "rgba(255,255,255,.08)"}`, color: agreed ? "#fff" : "rgba(255,255,255,.25)", cursor: agreed ? "pointer" : "not-allowed", transition: "all .2s" }}>go to my dashboard →</button>
      </div>
    </div>
  );
}
// ═══════════════════════════════════════════════

let _sbClient = null;
function getSB() {
  if (_sbClient) return _sbClient;
  if (typeof window === 'undefined' || !window.supabase || !window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) return null;
  _sbClient = getClient();
  return _sbClient;
}

// When email confirmation is enabled, signUp() returns no session, so the authenticated
// profiles upsert can't run yet. Stash the onboarding fields locally and replay the upsert
// on first successful sign-in (B1). The password is NEVER stashed.
const PENDING_PROFILE_KEY = 'nf_pending_profile';
function stashPendingProfile(payload) {
  payload=sanitizePendingProfile(payload);
  try {
    localStorage.setItem(PENDING_PROFILE_KEY, JSON.stringify(payload));
  } catch (e) {
    // Base64 logo/banner/avatar data URLs can exceed the localStorage quota — retry text-only.
    try {
      const d = payload.data || {};
      const { logoPreview, bannerPreview, logoUrl, bannerUrl, avatarUrl, avatarPreview, ...textOnly } = d;
      localStorage.setItem(PENDING_PROFILE_KEY, JSON.stringify({ ...payload, data: textOnly, imagesDropped: true }));
      console.warn('[pending-profile] stashed without images (quota: ' + (e?.name || 'error') + ')');
    } catch (e2) {
      console.error('[pending-profile] failed to stash onboarding data:', e2?.name || e2);
    }
  }
}
function readPendingProfile() {
  try { const raw = localStorage.getItem(PENDING_PROFILE_KEY); return raw ? JSON.parse(raw) : null; }
  catch (e) { return null; }
}
function clearPendingProfile() {
  try { localStorage.removeItem(PENDING_PROFILE_KEY); } catch (e) {}
}

function NfluenceApp() {
  const initialHashView = (typeof window !== "undefined" && ["faq", "browse", "signin", "creatorsignin", "signupchoice", "brandonboarding", "creatoronboarding", "forgotpassword", "resetpassword", "confirmemail"].includes(window.location.hash.replace("#", ""))) ? window.location.hash.replace("#", "") : "landing";
  const [view, setView] = useState(initialHashView); // landing | builder | browse | detail | brandprofile | signin | dashboard | messages | inbox | onboarding | reviews | creatordashboard | creatorinbox | creatormessages | creatorprofile | notifications | faq
  const [showLandingMenu, setShowLandingMenu] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState("Nike");
  const [pendingCampaign, setPendingCampaign] = useState(null);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [user, setUser] = useState(null); // { email, name }
  const [authSession, setAuthSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [confirmEmailInfo, setConfirmEmailInfo] = useState(null); // { role, email } while awaiting email confirmation
  const [pendingBuilderView, setPendingBuilderView] = useState(null); // 'builder'|'gigbuilder' to resume after sign-in
  const [myCampaigns, setMyCampaigns] = useState([]);
  const [publicCampaigns,setPublicCampaigns]=useState([]);
  const [publicLoading,setPublicLoading]=useState(true);
  const [publicError,setPublicError]=useState("");
  const [operationError,setOperationError]=useState("");
  const refreshPublic=async()=>{setPublicLoading(true);setPublicError("");try{const rows=await loadPublicCampaigns();setPublicCampaigns(rows);return rows;}catch(error){setPublicError(error.message);return [];}finally{setPublicLoading(false);}};
  useEffect(()=>{refreshPublic();billingInfo().then(info=>{window.NFLUENCE_BILLING=info;window.STRIPE_PUBLISHABLE_KEY=info.checkout_available?info.public_key:null;}).catch(()=>{});},[]);

  const [appliedCampaigns, setAppliedCampaigns] = useState([]); // ["Brand::Campaign", ...]
  const [appliedGigs, setAppliedGigs] = useState([]); // gig_listings ids the creator applied to
  const [selectedGig, setSelectedGig] = useState(null);
  const [demoCampaignOverrides, setDemoCampaignOverrides] = useState({}); // index → campaign override
  const [signInRedirect, setSignInRedirect] = useState(null); // campaign to redirect back to after sign in
  const [detailSource, setDetailSource] = useState("landing"); // "landing" | "dashboard" | "browse"
  const [autoApply, setAutoApply] = useState(false);
  const [lastReviewsVisitedAt, setLastReviewsVisitedAt] = useState(null); // ISO string — when brand last opened reviews page
  const [demoCampaignReviewOverrides, setDemoCampaignReviewOverrides] = useState({}); // demoIdx → { reviewIdx → brandResponse }

  // Creator state
  const [creatorUser, setCreatorUser] = useState(null);
  const [creatorProfile, setCreatorProfile] = useState({});
  const [creatorUploads, setCreatorUploads] = useState([]);
  const [creatorApplied, setCreatorApplied] = useState([]);
  const [creatorActive, setCreatorActive] = useState([]);

  // Messaging state
  const [allMessages, setAllMessages] = useState(DEMO_MESSAGES); // key → message[]
  const [messageCreator, setMessageCreator] = useState(null); // creator name for current thread
  const [messageReturnView, setMessageReturnView] = useState("detail"); // where to go back from messages

  // Scheduled calls state — key: "brand::campaign::creatorName"
  const [scheduledCalls, setScheduledCalls] = useState({});

  // Creator messaging state
  const [creatorMessageThread, setCreatorMessageThread] = useState(null); // { brandName, campaignName, key }

  // Creator public profile state
  const [selectedCreatorProfile, setSelectedCreatorProfile] = useState(null);
  const [creatorProfileReturnView, setCreatorProfileReturnView] = useState("detail");

  // Notifications state
  const [notifications, setNotifications] = useState([]);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const notifIdRef = React.useRef(0);

  const addNotification = React.useCallback((n) => {
    const id = ++notifIdRef.current;
    setNotifications(prev => [{ ...n, id, ts: new Date().toISOString(), read: false }, ...prev]);
    setToastMessage(n.title);
    setShowToast(true);
  }, []);

  const markAllNotifsRead = async () => {try{unwrap(await getSB().from('notifications').update({read:true}).eq('user_id',authSession.user.id));setNotifications(prev=>prev.map(n=>({...n,read:true})));}catch(error){setOperationError(error.message);}};
  const markNotifRead = async id => {try{unwrap(await getSB().from('notifications').update({read:true}).eq('id',id));setNotifications(prev=>prev.map(n=>n.id===id?{...n,read:true}:n));}catch(error){setOperationError(error.message);}};

  const hydrateSession=async(session,{redirect=false}={})=>{
    const sb=getSB();setAuthSession(session);
    if(!session){setUser(null);setCreatorUser(null);setAuthLoading(false);return;}
    const u=session.user;
    let profile=unwrap(await sb.from('profiles').select('*').eq('id',u.id).single());
    const pending=readPendingProfile();
    if(pending&&pending.email?.toLowerCase()===u.email?.toLowerCase()&&pending.role===profile.role){
      const d=pending.data||{};
      const update={name:d.name||profile.name,terms_version:TERMS_VERSION,terms_accepted_at:new Date().toISOString()};
      if(profile.role==='brand')Object.assign(update,{tagline:d.tagline,bio:d.bio,phone:d.phone,website:d.website,country:d.country,city:d.city,state:d.state,location:d.location,industry:d.industry,logo_url:d.logoPreview||null,banner_url:d.bannerPreview||null,social_links:d.socialLinks||{}});
      profile=unwrap(await sb.from('profiles').update(update).eq('id',u.id).select().single());
      if(profile.role==='creator')unwrap(await sb.from('creator_profiles').upsert({id:u.id,bio:d.bio,location:d.location,age:d.age,languages:d.languages,niches:d.niches,instagram:d.instagram,instagram_followers:d.instagramFollowers,tiktok:d.tiktok,tiktok_followers:d.tiktokFollowers,youtube:d.youtube,youtube_followers:d.youtubeFollowers,x:d.x,x_followers:d.xFollowers,facebook:d.facebook,facebook_followers:d.facebookFollowers,avatar_url:d.avatarUrl||null,banner_url:d.bannerUrl||null}));
      clearPendingProfile();
    }
    const identity={...profile,id:u.id,email:u.email,name:profile.name||u.user_metadata?.name||'Account',logoUrl:profile.logo_url,bannerUrl:profile.banner_url,socialLinks:profile.social_links||{},role:profile.role};
    if(profile.role==='brand'){setUser(identity);setCreatorUser(null);setMyCampaigns(await fetchOwnedCampaigns(sb,u.id));}
    else if(profile.role==='creator'){
      setCreatorUser(identity);setUser(null);
      const cp=unwrap(await sb.from('creator_profiles').select('*').eq('id',u.id).maybeSingle())||{};
      setCreatorProfile({...cp,id:u.id,userId:u.id,name:identity.name,instagramFollowers:cp.instagram_followers,tiktokFollowers:cp.tiktok_followers,youtubeFollowers:cp.youtube_followers,xFollowers:cp.x_followers,facebookFollowers:cp.facebook_followers,avatarUrl:cp.avatar_url,bannerUrl:cp.banner_url,platforms:{Instagram:cp.instagram,TikTok:cp.tiktok,YouTube:cp.youtube,X:cp.x,Facebook:cp.facebook}});
      const rows=unwrap(await sb.from('applications').select('*,campaigns(*)').eq('creator_id',u.id));
      const apps=rows.map(applicationFromRow);setCreatorApplied(apps);setCreatorActive(apps.filter(a=>a.status==='accepted'&&a.myStage!=='paid'));setAppliedCampaigns(apps.map(a=>a.id||a.campaignId));
      setAppliedGigs(unwrap(await sb.from('gig_applications').select('gig_id').eq('creator_id',u.id)).map(a=>a.gig_id));
      setCreatorUploads(unwrap(await sb.from('content_uploads').select('*,campaigns(name,brand_name)').eq('creator_id',u.id)).map(u=>({...u,fileName:u.file_name,campaign:u.campaigns?.brand_name+' · '+u.campaigns?.name,uploadedAt:u.uploaded_at})));
    }else throw Error('This account does not have a valid workspace role.');
    setNotifications(unwrap(await sb.from('notifications').select('*').eq('user_id',u.id).order('created_at',{ascending:false}).limit(100)).map(n=>({...n,for:n.for_role,ts:n.created_at})));
    const calls=unwrap(await sb.from('scheduled_calls').select('*,campaigns(id,name,brand_name)').order('datetime'));
    const creatorIds=[...new Set(calls.map(c=>c.creator_id))];const people=creatorIds.length?unwrap(await sb.from('profiles_public').select('id,name').in('id',creatorIds)):[];
    const names=new Map(people.map(p=>[p.id,p.name]));setScheduledCalls(Object.fromEntries(calls.map(c=>[c.id,{...callFromRow(c),creatorName:names.get(c.creator_id)||'Creator'}])));
    setAuthLoading(false);
    if(redirect)setView(profile.role==='brand'?'dashboard':'creatordashboard');
    return identity;
  };
  useEffect(()=>{
    const sb=getSB();let alive=true;
    sb.auth.getSession().then(async r=>{if(!alive)return;const session=unwrap(r).session;const recovery=new URLSearchParams(location.search).has('recovery')||location.hash.includes('type=recovery');if(recovery){setAuthSession(session);setAuthLoading(false);setView('resetpassword');return;}await hydrateSession(session,{redirect:!!session&&['','signin','creatorsignin'].includes(location.hash.replace('#',''))});}).catch(error=>{setAuthLoading(false);setOperationError(error.message);});
    const {data:{subscription}}=sb.auth.onAuthStateChange((event,session)=>{
      if(event==='PASSWORD_RECOVERY'){setAuthSession(session);setView('resetpassword');setAuthLoading(false);return;}
      if(event==='SIGNED_OUT'){setAuthSession(null);setUser(null);setCreatorUser(null);setMyCampaigns([]);setCreatorApplied([]);setCreatorActive([]);setNotifications([]);setScheduledCalls({});setView('landing');}
      else if(event==='SIGNED_IN'||event==='TOKEN_REFRESHED'){setAuthSession(session);setTimeout(()=>{if(alive&&!new URLSearchParams(location.search).has('recovery'))hydrateSession(session).catch(error=>setOperationError(error.message));},0);}
    });
    const timer=setInterval(()=>{sb.auth.getSession().then(({data})=>{if(data.session)hydrateSession(data.session).catch(()=>{});});},30000);
    return()=>{alive=false;subscription.unsubscribe();clearInterval(timer);};
  },[]);
  useEffect(()=>{const route=async()=>{const hash=location.hash.slice(1);const m=hash.match(/^campaign\/([0-9a-f-]{36})$/i);if(m){try{const row=unwrap(await getSB().from('campaigns').select('*,applications(*),reviews(*)').eq('id',m[1]).maybeSingle());if(!row){setOperationError('This campaign is unavailable or no longer public.');setView('browse');return;}const people=unwrap(await getSB().from('profiles_public').select('*').eq('id',row.brand_id).maybeSingle());setSelectedCampaign(campaignFromRow({...row,profile:people}));setView('detail');}catch(error){setOperationError(error.message);setView('browse');}}};route();window.addEventListener('hashchange',route);return()=>window.removeEventListener('hashchange',route);},[]);
  useEffect(()=>{if(authSession&&user&&new URLSearchParams(location.search).has('annual_session'))setView('plans');},[authSession?.user?.id,user?.id]);
  useEffect(()=>{if(view==='detail'&&selectedCampaign?.id)history.replaceState(null,'','#campaign/'+selectedCampaign.id);},[view,selectedCampaign?.id]);
  // Persist current view to localStorage on every change
  useEffect(() => {
    try { localStorage.setItem("nf_last_view", view); } catch (e) {}
    // Mirror auth-flow / public views into the URL hash so refresh stays put
    const HASHED_VIEWS = ["faq", "browse", "signin", "creatorsignin", "signupchoice", "brandonboarding", "creatoronboarding", "forgotpassword", "resetpassword", "confirmemail"];
    if (typeof window !== "undefined") {
      const currentHash = window.location.hash.replace("#", "");
      if (HASHED_VIEWS.includes(view)) {
        if (currentHash !== view) window.history.replaceState(null, "", "#" + view);
      } else if (HASHED_VIEWS.includes(currentHash)) {
        // We've moved off a public view (e.g. into dashboard) — clear stale hash
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      }
    }
  }, [view]);

  // Respond to in-page hash changes so deep links inside the SPA still route
  useEffect(() => {
    const onHash = () => {
      const h = window.location.hash.replace("#", "");
      if (["faq", "browse", "signin", "creatorsignin", "signupchoice", "brandonboarding", "creatoronboarding", "forgotpassword", "resetpassword", "confirmemail"].includes(h)) {
        setView(h);
      }
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // Auto-dismiss toast after 5 seconds
  useEffect(() => {
    if (!showToast) return;
    const t = setTimeout(() => setShowToast(false), 5000);
    return () => clearTimeout(t);
  }, [showToast]);

  const mergedDemos=[...publicCampaigns,...DEMO_CAMPAIGNS];
  const brandDemoCampaigns=[];
  const handlePublish=async(campaignData,account={},result={})=>{
    if(!result.campaignId)throw Error('The campaign could not be confirmed. Contact support before paying again.');
    const saved=unwrap(await getSB().from('campaigns').select('*').eq('id',result.campaignId).single());
    if(saved.stage!=='open')throw Error('Your payment is being reconciled. Refresh your dashboard before trying again.');
    setMyCampaigns(await fetchOwnedCampaigns(getSB(),authSession.user.id));await refreshPublic();setView('dashboard');
  };
  const handleGigPublish=async(gigData,account={},result={})=>{
    if(!result.gigId)throw Error('The listing could not be confirmed. Contact support before paying again.');
    const saved=unwrap(await getSB().from('gig_listings').select('id,stage').eq('id',result.gigId).single());
    if(saved.stage!=='open')throw Error('Your payment is being reconciled. Refresh before trying again.');setView('dashboard');
  };

  const handleOnboardingDone = () => {
    if (pendingCampaign) {
      setMyCampaigns(prev => [pendingCampaign, ...prev]);
      setPendingCampaign(null);
    }
    setView("dashboard");
  };

  const handleViewReviews = () => {
    setLastReviewsVisitedAt(new Date().toISOString());
    setView("reviews");
  };

  // Update a brand response on a review — works for both demo and user campaigns
  const handleUpdateReview=async(campaign,reviewIdx,responseText)=>{
    const review=campaign.reviews?.[reviewIdx];if(!review?.id)throw Error('This review could not be found.');
    const saved=unwrap(await getSB().from('reviews').update({brand_response:responseText}).eq('id',review.id).select().single());
    setMyCampaigns(prev=>prev.map(c=>c.id===campaign.id?{...c,reviews:c.reviews.map(r=>r.id===saved.id?{...r,brandResponse:saved.brand_response}:r)}:c));
  };
  const handleBrandOnboardingComplete=async data=>{
    data={...data,email:normalizeEmail(data.email)};
    stashPendingProfile({email:data.email,role:'brand',data});
    const result=unwrap(await getSB().auth.signUp({email:data.email,password:data.password,options:{emailRedirectTo:location.origin+'/campaigns/',data:{role:'brand',name:data.name}}}));
    if(!result.session){setConfirmEmailInfo({email:data.email,role:'brand'});setView('confirmemail');return;}
    await hydrateSession(result.session);setView(pendingBuilderView||'dashboard');setPendingBuilderView(null);
  };
  const handleSignIn=async(email,name,password)=>{
    try{email=normalizeEmail(email);const response=await getSB().auth.signInWithPassword({email,password});if(response.error?.code==='email_not_confirmed')return {confirmationRequired:true};const result=unwrap(response);const identity=await hydrateSession(result.session);
      if(signInRedirect){setSelectedCampaign(signInRedirect);setSignInRedirect(null);setAutoApply(identity.role==='creator');setView('detail');}
      else if(pendingBuilderView&&identity.role==='brand'){setView(pendingBuilderView);setPendingBuilderView(null);}
      else setView(identity.role==='brand'?'dashboard':'creatordashboard');
      return null;
    }catch(error){return error.message?.includes('Invalid login credentials')?'Incorrect email or password.':error.message;}
  };
  const handleSignOut = async () => {
    const sb = getSB();
    try{unwrap(await sb.auth.signOut());}catch(error){setOperationError(error.message);return;}
    setCreatorUser(null);
    setUser(null);
    setAuthSession(null);
    setMyCampaigns([]);
    setNotifications([]);
    setAppliedCampaigns([]);
    setDemoCampaignOverrides({});
    setDemoCampaignReviewOverrides({});
    setSignInRedirect(null);
    setAutoApply(false);
    setLastReviewsVisitedAt(null);
    setPendingCampaign(null);
    setSelectedCampaign(null);
    setAllMessages({});
    setScheduledCalls({});
    setCreatorMessageThread(null);
    setSelectedCreatorProfile(null);
    setMessageCreator(null);
    setShowToast(false);
    setCreatorProfile({});
    setCreatorApplied([]);
    setCreatorActive([]);
    setConfirmEmailInfo(null);
    setPendingBuilderView(null);
    setView('landing');
  };

  const handleCreatorSignIn=async(email,name,password,profileData=null)=>{
    if(!name)return handleSignIn(email,null,password);
    email=normalizeEmail(email);
    try{stashPendingProfile({email,role:'creator',data:{...profileData,name}});const result=unwrap(await getSB().auth.signUp({email,password,options:{emailRedirectTo:location.origin+'/campaigns/',data:{role:'creator',name}}}));if(!result.session){setConfirmEmailInfo({email,role:'creator'});setView('confirmemail');return null;}await hydrateSession(result.session,{redirect:true});return null;}catch(error){return error.message;}
  };
  const handleCreatorSignOut = async () => {
    const sb = getSB();
    try{unwrap(await sb.auth.signOut());}catch(error){setOperationError(error.message);return;}
    setAuthSession(null);
    setUser(null);
    setCreatorUser(null);
    setCreatorProfile({});
    setCreatorApplied([]);
    setAppliedGigs([]);
    setCreatorActive([]);
    setScheduledCalls({});
    setAllMessages({});
    setConfirmEmailInfo(null);
    setPendingBuilderView(null);
    setView('landing');
  };

  const handleApply=async(campaign,data)=>{
    if(campaign.isDemo || String(campaign.id).startsWith("demo-")) throw Error("Demo campaigns are examples and do not accept applications.");
    if(!creatorUser?.id)throw Error('Please sign in with a creator account.');
    const row=unwrap(await getSB().from('applications').insert({campaign_id:campaign.id,creator_id:creatorUser.id,status:'applied',stage:'applied',name:data.name,pitch:data.pitch,portfolio:data.portfolio,platforms:data.platforms}).select().single());
    setAppliedCampaigns(prev=>[...new Set([...prev,campaign.id])]);
    await hydrateSession(authSession);return row;
  };
  const handleGigApply = async (gig, { pitch }) => {
    const sb = getSB();
    if (!sb || !creatorUser?.id) return { error: 'You must be signed in as a creator to apply.' };
    const { error } = await sb.from('gig_applications').insert({
      gig_id: gig.id, creator_id: creatorUser.id, stage: 'applied', message: pitch,
    });
    if (error) return { error: error.message };
    setAppliedGigs(prev => prev.includes(gig.id) ? prev : [...prev, gig.id]);
    return {};
  };

  const handleUnfeature = async (campaign) => {
    if (!campaign?.id || String(campaign.id).startsWith('demo-')) return;
    try {
      await callStripePaymentV2({ action: 'unfeature', campaignId: campaign.id }, authSession?.access_token);
      setMyCampaigns(prev => prev.map(c => c.id === campaign.id ? { ...c, featured: false, featured_until: null, featuredWeeks: 0 } : c));
      setSelectedCampaign(prev => (prev && prev.id === campaign.id) ? { ...prev, featured: false, featured_until: null, featuredWeeks: 0 } : prev);
    } catch (e) {
      console.error('unfeature failed:', e);
      setToastMessage('Could not remove featured placement'); setShowToast(true);
    }
  };

  const handleSignInRedirect = () => {
    setSignInRedirect(selectedCampaign);
    setView("signin");
  };

  // Messaging handlers
  const getMessageKey = (campaign, creatorName) => `${campaign.brand}::${campaign.campaign}::${creatorName}`;

  const handleOpenMessage = (campaign, creatorName, returnView) => {
    setSelectedCampaign(campaign);
    setMessageCreator(creatorName);
    setMessageReturnView(returnView || "detail");
    setView("messages");
  };

  const handleSendMessage = (text) => {
    if (!selectedCampaign || !messageCreator) return;
    const key = getMessageKey(selectedCampaign, messageCreator);
    const newMsg = {
      from: "brand", // in this demo, the signed-in user is always the brand
      text,
      ts: new Date().toISOString(),
    };
    setAllMessages(prev => ({
      ...prev,
      [key]: [...(prev[key] || []), newMsg],
    }));
  };

  const handleOpenInbox = (campaign, returnView) => {
    setSelectedCampaign(campaign);
    setMessageReturnView(returnView || "detail");
    setView("inbox");
  };

  const getConversationsForCampaign = (campaign) => {
    if (!campaign) return [];
    const prefix = `${campaign.brand}::${campaign.campaign}::`;
    const convs = [];
    // Get all creators (approved + pending) for this campaign
    const allCreators = [
      ...(campaign.creators?.approved || []),
      ...(campaign.creators?.pending || []),
    ];
    // Check for existing message threads
    const seenNames = new Set();
    Object.entries(allMessages).forEach(([key, msgs]) => {
      if (key.startsWith(prefix) && msgs.length > 0) {
        const creatorName = key.slice(prefix.length);
        seenNames.add(creatorName);
        convs.push({ creatorName, messages: msgs, unread: 0 });
      }
    });
    // Also include approved creators with no messages yet
    allCreators.forEach(cr => {
      if (!seenNames.has(cr.name) && cr.stage !== "applied") {
        convs.push({ creatorName: cr.name, messages: [], unread: 0 });
      }
    });
    // Sort by last message time (most recent first), empty threads at the end
    convs.sort((a, b) => {
      const aLast = a.messages[a.messages.length - 1]?.ts || "";
      const bLast = b.messages[b.messages.length - 1]?.ts || "";
      if (!aLast && !bLast) return 0;
      if (!aLast) return 1;
      if (!bLast) return -1;
      return bLast.localeCompare(aLast);
    });
    return convs;
  };

  // Schedule call handler (brand schedules with a creator)
  const handleScheduleCall=async({creator,campaign,datetime,timezone,meetLink,notes})=>{
    const row=unwrap(await getSB().from('scheduled_calls').insert({campaign_id:campaign.id,brand_id:user.id,creator_id:creator.userId,datetime,timezone,meet_link:meetLink||null,notes:notes||null}).select().single());
    setScheduledCalls(prev=>({...prev,[row.id]:{...callFromRow(row),brandName:campaign.brand,campaignName:campaign.campaign,creatorName:creator.name}}));return row;
  };
  const handleRespondToCall=async(key,action)=>{
    try{const row=unwrap(await getSB().from('scheduled_calls').update({confirmed:action==='confirm',declined:action==='decline'}).eq('id',key).select().single());setScheduledCalls(prev=>({...prev,[key]:{...prev[key],...callFromRow(row)}}));}catch(error){setOperationError(error.message);}
  };
  // Creator messaging — get all conversations the creator is part of
  const getCreatorConversations = () => {
    if (!creatorUser) return [];
    const creatorName = creatorProfile?.name || creatorUser?.name || "";
    const convs = [];
    Object.entries(allMessages).forEach(([key, msgs]) => {
      const parts = key.split("::");
      if (parts.length === 3 && parts[2] === creatorName) {
        convs.push({ key, brandName: parts[0], campaignName: parts[1], messages: msgs, unread: 0 });
      }
    });
    convs.sort((a, b) => {
      const aLast = a.messages[a.messages.length - 1]?.ts || "";
      const bLast = b.messages[b.messages.length - 1]?.ts || "";
      return bLast.localeCompare(aLast);
    });
    return convs;
  };

  // Creator sends a message
  const handleCreatorSendMessage = (text) => {
    if (!creatorMessageThread) return;
    const newMsg = { from: "creator", text, ts: new Date().toISOString() };
    setAllMessages(prev => ({
      ...prev,
      [creatorMessageThread.key]: [...(prev[creatorMessageThread.key] || []), newMsg],
    }));
  };

  // Require an authenticated brand before entering a builder; remember intent and resume post-auth.
  const goToBuilder = (target) => {
    if (user) setView(target);
    else { setPendingBuilderView(target); setView('signupchoice'); }
  };

  if(view==='forgotpassword'||view==='resetpassword')return <RecoveryScreen mode={view==='forgotpassword'?'forgot':'reset'} onBack={()=>setView('signin')} onDone={()=>{history.replaceState(null,'','/campaigns/#signin');setView('signin');}}/>;
  if(view==='creatorreviews'&&authSession)return <CreatorReviewWorkspace user={authSession.user} onBack={()=>setView('creatordashboard')}/>;
  if(view==='plans'&&authSession&&user)return <AnnualPlanPanel session={authSession} onBack={()=>setView('dashboard')}/>;
  if(['inbox','messages','creatorinbox','creatormessages'].includes(view)&&authSession)return <ConversationHub user={authSession.user} campaignId={view==='inbox'||view==='creatorinbox'?null:selectedCampaign?.id} recipientId={messageCreator?.userId} onBack={()=>setView(user?'dashboard':'creatordashboard')}/>;
  if(view==='content'&&authSession)return <UploadLibrary user={authSession.user} campaignId={selectedCampaign?.id} onBack={()=>setView(user?'dashboard':'creatordashboard')}/>;

  if (view === "notifications") return <NotificationsPage notifications={notifications} forRole={user ? "brand" : "creator"} onBack={() => setView(user ? "dashboard" : "creatordashboard")} onMarkAllRead={markAllNotifsRead} onMarkRead={markNotifRead} />;
  if (view === "faq") return <FAQPage onBack={() => setView("landing")} onStart={() => goToBuilder("builder")} onSignIn={() => user ? setView("dashboard") : creatorUser ? setView("creatordashboard") : setView("signin")} user={user} creatorUser={creatorUser} />;
  if (view === "signin") return <SignIn onSignIn={handleSignIn} onBack={() => setView("landing")} onSignUp={() => setView("signupchoice")} />;
  if (view === "signupchoice") return <SignUpChoice onBack={() => setView("signin")} onBrand={() => setView("brandonboarding")} onCreator={() => setView("creatoronboarding")} onSignIn={() => setView("signin")} />;
  if (view === "brandonboarding") return <BrandOnboarding onBack={() => setView("signupchoice")} onComplete={handleBrandOnboardingComplete} onSignIn={() => setView("signin")} />;
  if (view === "creatorsignin") return <CreatorSignIn onSignIn={handleCreatorSignIn} onBack={() => setView("landing")} onSignUp={() => setView("creatoronboarding")} />;
  if (view === "creatoronboarding") return <CreatorOnboarding onBack={() => setView("signupchoice")} onComplete={handleCreatorSignIn} onSignIn={() => setView("creatorsignin")} />;
  if (view === "confirmemail") return <ConfirmEmailNotice email={confirmEmailInfo?.email||readPendingProfile()?.email} role={confirmEmailInfo?.role} onSignIn={() => setView(confirmEmailInfo?.role === "creator" ? "creatorsignin" : "signin")} onHome={() => setView("landing")} />;
  if (view === "creatordashboard") return <>
    <div style={{display:'flex',justifyContent:'center',gap:20,padding:12}}><button className="nf-recovery-link" onClick={()=>{setSelectedCampaign(null);setView('content')}}>Your deliverables</button><button className="nf-recovery-link" onClick={()=>setView('creatorreviews')}>Review a campaign</button></div>
    <CreatorDashboard user={creatorUser} appliedCampaigns={creatorApplied} activeCampaigns={creatorActive} uploads={creatorUploads} onSignOut={handleCreatorSignOut} onBack={() => setView("landing")} onBrowseGigs={() => setView("gigbrowse")} creatorProfile={creatorProfile} onEditProfile={async (form) => {
        const sb = getSB();
        if (sb && creatorUser?.id) { unwrap(await sb.from('creator_profiles').upsert({
          id: creatorUser.id,
          bio: form.bio,
          location: form.location,
          age: form.age,
          languages: form.languages,
          niches: form.niches,
          instagram: form.instagram,
          instagram_followers: form.instagramFollowers,
          tiktok: form.tiktok,
          tiktok_followers: form.tiktokFollowers,
          youtube: form.youtube,
          youtube_followers: form.youtubeFollowers,
          x: form.x,
          x_followers: form.xFollowers,
          facebook: form.facebook,
          facebook_followers: form.facebookFollowers,
          avatar_url: form.avatarUrl || null,
          banner_url: form.bannerUrl || null,
        }));await hydrateSession(authSession); }
      }} onUpload={async upload=>{await import('./features.jsx').then(m=>m.uploadDeliverable(upload.applicationId,upload.file));await hydrateSession(authSession);}} onSelectCampaign={(c) => { setSelectedCampaign(mergedDemos.find(d => d.brand === c.brand && d.campaign === c.campaign) || c); setDetailSource("landing"); setView("detail"); }} onBrowse={() => setView("browse")} onViewOwnProfile={() => { setSelectedCreatorProfile(creatorProfile); setCreatorProfileReturnView("creatordashboard"); setView("creatorprofile"); }} onOpenMessages={(campaign) => { if (campaign) { const creatorName = creatorProfile?.name || creatorUser?.name || ""; const key = `${campaign.brand}::${campaign.campaign}::${creatorName}`; setSelectedCampaign(campaign);setCreatorMessageThread({ key, brandName: campaign.brand, campaignName: campaign.campaign }); setView("creatormessages"); } else { setView("creatorinbox"); } }} scheduledCalls={Object.fromEntries(Object.entries(scheduledCalls).filter(([,call])=>call.creator_id===creatorUser?.id))} onRespondToCall={handleRespondToCall} notifications={notifications} onMarkAllNotifsRead={markAllNotifsRead} onViewAllNotifications={() => setView("notifications")} />
    {operationError && <div role="alert" className="async-error" style={{position:"fixed",bottom:16,left:16,right:16,zIndex:3000}}>{operationError}<button onClick={()=>setOperationError("")} style={{marginLeft:16}}>Dismiss</button></div>}{showToast && <NotificationToast message={toastMessage} onView={() => { setShowToast(false); setView("notifications"); }} onDismiss={() => setShowToast(false)} />}
  </>;
  if (view === "creatorinbox") {
    const brandAvatarMap = Object.fromEntries(DEMO_CAMPAIGNS.map(c => [c.brand, c.logoUrl || null]));
    return <CreatorInbox conversations={getCreatorConversations()} onSelectThread={(conv) => { setCreatorMessageThread({ key: conv.key, brandName: conv.brandName, campaignName: conv.campaignName }); setView("creatormessages"); }} onBack={() => setView("creatordashboard")} allMessages={allMessages} onSend={(key, text) => { const newMsg = { from: "creator", text, ts: new Date().toISOString() }; setAllMessages(prev => ({ ...prev, [key]: [...(prev[key] || []), newMsg] })); }} creatorAvatar={creatorProfile?.avatarUrl || null} brandAvatars={brandAvatarMap} />;
  }
  if (view === "creatormessages" && creatorMessageThread) {
    const brandAvatarMap = Object.fromEntries(DEMO_CAMPAIGNS.map(c => [c.brand, c.logoUrl || null]));
    return <Messages campaign={{ brand: creatorMessageThread.brandName, campaign: creatorMessageThread.campaignName }} creatorName={creatorProfile?.name || creatorUser?.name || ""} messages={allMessages[creatorMessageThread.key] || []} onSend={handleCreatorSendMessage} onBack={() => setView("creatorinbox")} isBrand={false} brandAvatar={brandAvatarMap[creatorMessageThread.brandName] || null} creatorAvatar={creatorProfile?.avatarUrl || null} />;
  }
  if (view === "creatorprofile" && selectedCreatorProfile) return <CreatorPublicProfile creator={selectedCreatorProfile} onBack={() => setView(creatorProfileReturnView)} onMessage={selectedCampaign ? () => handleOpenMessage(selectedCampaign, selectedCreatorProfile, "creatorprofile") : null} />;
  if (view === "onboarding") return <OnboardingPage onDone={handleOnboardingDone} />;
  if (view === "reviews") return <ReviewsPage campaigns={myCampaigns} demoCampaigns={brandDemoCampaigns} onBack={() => setView("dashboard")} onUpdateReview={handleUpdateReview} />;
  if (view === "dashboard") return <>
    <div style={{display:"flex",justifyContent:"center",gap:20,padding:12}}><button className="nf-recovery-link" onClick={()=>setView("plans")}>Campaign plans</button><button className="nf-recovery-link" onClick={()=>{setSelectedCampaign(null);setView("content")}}>Review deliverables</button></div>
    <Dashboard user={user} campaigns={myCampaigns} demoCampaigns={brandDemoCampaigns} onBack={() => setView("landing")} onSignOut={handleSignOut} onNewCampaign={() => setView("builder")} onNewGig={() => setView("gigbuilder")} onSelectCampaign={(c) => { setSelectedCampaign(c); setDetailSource("dashboard"); setView("detail"); }} onEditCampaign={(c) => { setSelectedCampaign(c); setView("edit"); }} onUnfeature={handleUnfeature} onViewReviews={handleViewReviews} lastReviewsVisitedAt={lastReviewsVisitedAt} onBrowse={() => setView("browse")} notifications={notifications} onMarkAllNotifsRead={markAllNotifsRead} onViewAllNotifications={() => setView("notifications")} onOpenMessages={() => setView("inbox")} scheduledCalls={scheduledCalls} onUpdateUser={async (updatedUser) => {
      const sb = getSB();
      if (updatedUser?.id && sb) {

          unwrap(await sb.from('profiles').upsert({
            id: updatedUser.id,
            email: updatedUser.email,
            name: updatedUser.name,
            phone: updatedUser.phone,
            location: updatedUser.location,
            city: updatedUser.city,
            state: updatedUser.state,
            country: updatedUser.country,
            website: updatedUser.website,
            industry: updatedUser.industry,
            bio: updatedUser.bio,
            tagline: updatedUser.tagline,
            logo_url: updatedUser.logoPreview || updatedUser.logoUrl,
            banner_url: updatedUser.bannerPreview || updatedUser.bannerUrl,
            social_links: updatedUser.socialLinks,
            role: 'brand',
          }));await hydrateSession(authSession);
      }
    }} onFaq={() => setView("faq")} />
    {operationError && <div role="alert" className="async-error" style={{position:"fixed",bottom:16,left:16,right:16,zIndex:3000}}>{operationError}<button onClick={()=>setOperationError("")} style={{marginLeft:16}}>Dismiss</button></div>}{showToast && <NotificationToast message={toastMessage} onView={() => { setShowToast(false); setView("notifications"); }} onDismiss={() => setShowToast(false)} />}
  </>;
  if ((view === "builder" || view === "gigbuilder") && !user) {
    return <SignUpChoice onBack={() => setView("landing")} onBrand={() => setView("brandonboarding")} onCreator={() => setView("creatoronboarding")} onSignIn={() => setView("signin")} />;
  }
  if (view === "builder") return <CampaignBuilder onBack={() => user ? setView("dashboard") : setView("landing")} onPublish={handlePublish} session={authSession} />;
  if (view === "gigbuilder") return <GigListingBuilder onBack={() => setView("dashboard")} onPublish={handleGigPublish} session={authSession} />;
  if(view==='edit'&&selectedCampaign)return <CampaignEditor campaign={selectedCampaign} onBack={()=>setView('dashboard')} session={authSession} onSave={async updated=>{
    const row=unwrap(await getSB().from('campaigns').update(campaignToUpdate(updated)).eq('id',updated.id).select().single());
    const normalized=campaignFromRow({...row,applications:updated.applications||[],reviews:updated.reviews||[]});setSelectedCampaign(normalized);setMyCampaigns(await fetchOwnedCampaigns(getSB(),user.id));await refreshPublic();setView('dashboard');
  }}/>;
  if (view === "brandprofile") return <BrandProfile brand={selectedBrand} allCampaigns={mergedDemos} onBack={() => setView("browse")} onSelectCampaign={(c) => { setSelectedCampaign(c); setDetailSource("browse"); setView("detail"); }} appliedCampaigns={appliedCampaigns} onApplyClick={(c) => { setSelectedCampaign(c); setAutoApply(true); setDetailSource("browse"); setView("detail"); }} user={user} />;
  if (view === "gigbrowse") return <GigBrowse onBack={() => creatorUser ? setView("creatordashboard") : setView("landing")} onSelectGig={(g) => { setSelectedGig(g); setView("gigdetail"); }} appliedGigs={appliedGigs} creatorUser={creatorUser} />;
  if (view === "gigdetail" && selectedGig) return <GigDetail gig={selectedGig} onBack={() => setView("gigbrowse")} creatorUser={creatorUser} appliedGigs={appliedGigs} onApply={handleGigApply} onSignInRedirect={() => setView("creatorsignin")} />;
  if (view === "browse") return <BrowseCampaigns loading={publicLoading} error={publicError} onRetry={refreshPublic} campaigns={mergedDemos} onBack={() => setView("landing")} onSelectCampaign={(c)=>{setSelectedCampaign(c);setDetailSource("browse");setView("detail");}} appliedCampaigns={appliedCampaigns} onApplyClick={(c) => { setSelectedCampaign(mergedDemos.find(d => d.brand === c.brand && d.campaign === c.campaign) || c); setAutoApply(true); setDetailSource("browse"); setView("detail"); }} onFaq={() => setView("faq")} onSignIn={() => user ? setView("dashboard") : creatorUser ? setView("creatordashboard") : setView("signin")} user={user} creatorUser={creatorUser} />;
  if (view === "messages" && selectedCampaign && messageCreator) {
    const key = getMessageKey(selectedCampaign, messageCreator);
    return <Messages
      campaign={selectedCampaign}
      creatorName={messageCreator}
      messages={allMessages[key] || []}
      onSend={handleSendMessage}
      onBack={() => setView(messageReturnView)}
      isBrand={true}
      brandAvatar={selectedCampaign.logoUrl || null}
      creatorAvatar={`https://i.pravatar.cc/100?img=${(() => { let h=0; for(let i=0;i<messageCreator.length;i++) h=(h*31+messageCreator.charCodeAt(i))>>>0; return (h%70)+1; })()}`}
    />;
  }
  if (view === "inbox" && selectedCampaign) {
    const convs = getConversationsForCampaign(selectedCampaign);
    const msgKeyMap = Object.fromEntries(convs.map(c => [c.creatorName, allMessages[getMessageKey(selectedCampaign, c.creatorName)] || []]));
    const avatarIdx = (name) => { let h=0; for(let i=0;i<name.length;i++) h=(h*31+name.charCodeAt(i))>>>0; return (h%70)+1; };
    const creatorAvatarMap = Object.fromEntries(convs.map(c => [c.creatorName, `https://i.pravatar.cc/100?img=${avatarIdx(c.creatorName)}`]));
    return <MessageInbox
      conversations={convs}
      campaign={selectedCampaign}
      onSelectThread={(conv) => handleOpenMessage(selectedCampaign, conv.creatorName, "inbox")}
      onBack={() => setView(messageReturnView)}
      allMessages={msgKeyMap}
      onSend={(creatorName, text) => { const key = getMessageKey(selectedCampaign, creatorName); const newMsg = { from: "brand", text, ts: new Date().toISOString() }; setAllMessages(prev => ({ ...prev, [key]: [...(prev[key] || []), newMsg] })); }}
      isBrand={true}
      brandAvatar={selectedCampaign.logoUrl || null}
      creatorAvatars={creatorAvatarMap}
    />;
  }
  if (view === "detail" && selectedCampaign) {
    const isOwnCampaign = myCampaigns.some(c => c.id === selectedCampaign.id);
    const isOwner = !selectedCampaign.isDemo && isOwnCampaign;
    return <CampaignDetail key={selectedCampaign.id} campaign={selectedCampaign} onStartCampaign={() => goToBuilder("builder")} onBack={() => { setAutoApply(false); if (detailSource === "dashboard") setView("dashboard"); else if (detailSource === "browse") setView("browse"); else setView("landing"); }} isOwner={isOwner} user={user || creatorUser} onApply={handleApply} onSignInRedirect={handleSignInRedirect} appliedCampaigns={appliedCampaigns} onOpenMessage={(creatorName) => handleOpenMessage(selectedCampaign, creatorName, "detail")} onOpenInbox={() => handleOpenInbox(selectedCampaign, "detail")} messageCount={getConversationsForCampaign(selectedCampaign).filter(c => c.messages.length > 0).length} autoApply={autoApply} onAutoApplyConsumed={() => setAutoApply(false)} onEditCampaign={(c) => { setSelectedCampaign(c); setView("edit"); }} onScheduleCall={handleScheduleCall} onViewCreatorProfile={(creator) => { setSelectedCreatorProfile(creator); setCreatorProfileReturnView("detail"); setView("creatorprofile"); }} onNotify={addNotification} />;
  }

  if (authLoading) return null;

  return (
    <div style={{ minHeight: "100vh", overflowX: "hidden", background: "radial-gradient(circle at calc(46% + 250px) calc(58% - 175px), rgba(255,255,255,.103) 0%, rgba(255,255,255,.0309) 38%, transparent 52%), linear-gradient(180deg, #040b15 0%, #070f1f 100%)", backgroundColor: "#040b15", color: "#fff", fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <style>{`
        @font-face {
          font-family: 'Monda';
          src: url('/assets/Monda-Regular.woff') format('woff');
          font-weight: 400 700;
          font-style: normal;
          font-display: swap;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { overflow-x: hidden; max-width: 100%; }
        img { max-width: 100%; }
        .nf-campaign-card {
          background: radial-gradient(circle at top, rgba(255,255,255,.045), rgba(4,11,21,0));
          border: 1px solid rgba(255,255,255,.12);
          border-radius: 20px;
          overflow: hidden;
          backdrop-filter: blur(20px);
          box-shadow: 0 20px 55px rgba(0,0,0,.35);
          cursor: pointer;
          display: flex;
          flex-direction: column;
          transition: transform .25s, box-shadow .25s, border-color .25s;
        }
        .nf-campaign-card:hover {
          transform: translateY(-4px) scale(1.01);
          box-shadow: 0 28px 65px rgba(0,0,0,.5);
          border-color: rgba(255,255,255,.25);
        }
        .nf-cta-btn {
          transition: transform .12s, border-color .2s, box-shadow .2s, background .2s !important;
        }
        .nf-cta-btn:hover {
          transform: translateY(-2px);
          border-color: rgba(255,255,255,.55) !important;
          box-shadow: 0 0 18px rgba(255,255,255,.12) !important;
          background: rgba(255,255,255,.12) !important;
        }
        .nf-apply-btn {
          transition: transform .12s, border-color .2s, box-shadow .2s, background .2s !important;
          cursor: pointer;
        }
        .nf-apply-btn:hover {
          border-color: rgba(255,255,255,.55) !important;
          box-shadow: 0 0 14px rgba(255,255,255,.15) !important;
          background: rgba(255,255,255,.08) !important;
          transform: translateY(-1px);
        }
        @keyframes nf-gold-shimmer { 0%,100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
        .nf-featured-name { background: linear-gradient(90deg, #fbbf24 0%, #fde68a 40%, #f59e0b 60%, #fbbf24 100%); background-size: 200% auto; -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; animation: nf-gold-shimmer 3s ease-in-out infinite; }
        .nf-nl { opacity: .85; transition: opacity .15s; cursor: pointer; text-decoration: none; }
        .nf-nl:hover { opacity: 1; text-decoration: underline; text-underline-offset: 4px; text-decoration-thickness: 1.5px; }
        .nf-mobile-hamburger { display: none; }
        @media (max-width: 600px) {
          .nf-nav-secondary { display: none !important; }
          .nf-mobile-hamburger { display: flex !important; }
        }
      `}</style>
      {/* Header */}
      <div style={{ width: "100%", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 clamp(16px, 4vw, 32px)", textShadow: "0 1px 3px rgba(0,0,0,.35)", fontFamily: "system-ui, sans-serif", position: "relative", zIndex: 1 }}>
        <div style={{ fontWeight: 600, letterSpacing: "-.01em", fontSize: "1.1rem", color: "#fff", cursor: "pointer", fontFamily: "'Monda', system-ui, sans-serif" }} role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => setView("landing")}>nfluence</div>
        <div style={{ display: "flex", gap: 18, fontSize: ".9rem", fontFamily: "system-ui, sans-serif", alignItems: "center" }}>
          <a className="nf-nl nf-nav-secondary" href="https://nfluenceagency.com/" style={{ color: "#fff", fontFamily: "system-ui, sans-serif" }}>home</a>
          <span className="nf-nl nf-nav-secondary" style={{ color: "#fff" }} role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => setView("browse")}>campaigns</span>
          <a className="nf-nl nf-nav-secondary" href="https://nfluenceagency.com/#popular" style={{ color: "#fff" }}>services</a>
          <a className="nf-nl nf-nav-secondary" href="https://nfluenceagency.com/contact.html" style={{ color: "#fff" }}>contact us</a>
          <span className="nf-nl nf-nav-secondary" style={{ color: "#fff" }} role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => setView("faq")}>faq</span>
          <span className="nf-nav-secondary" style={{ color: "rgba(255,255,255,.35)", userSelect: "none" }}>|</span>
          {user ? (
            <span className="nf-nl" style={{ color: "#fff" }} role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => setView("dashboard")}>dashboard</span>
          ) : creatorUser ? (
            <span className="nf-nl" style={{ color: "#fff" }} role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => setView("creatordashboard")}>dashboard</span>
          ) : (
            <span className="nf-nl" style={{ color: "#fff" }} role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => setView("signin")}>sign in</span>
          )}
          <div className="nf-mobile-hamburger" style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, cursor: "pointer", marginLeft: 8 }} role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }} onClick={(e) => { e.stopPropagation(); setShowLandingMenu(v => !v); }}>
            <div style={{ width: 16, height: 1.5, background: "rgba(255,255,255,.85)", borderRadius: 2 }} />
            <div style={{ width: 16, height: 1.5, background: "rgba(255,255,255,.85)", borderRadius: 2 }} />
            <div style={{ width: 16, height: 1.5, background: "rgba(255,255,255,.85)", borderRadius: 2 }} />
          </div>
        </div>
        {showLandingMenu && (
          <div onClick={e => e.stopPropagation()} style={{ position: "absolute", top: 60, right: 16, background: "#0a1322", border: "1px solid rgba(255,255,255,.12)", borderRadius: 14, padding: 6, minWidth: 180, zIndex: 50, boxShadow: "0 18px 40px rgba(0,0,0,.5)" }}>
            {[
              { label: "home", action: () => { setShowLandingMenu(false); window.location.href = "https://nfluenceagency.com/"; } },
              { label: "campaigns", action: () => { setShowLandingMenu(false); setView("browse"); } },
              { label: "services", action: () => { setShowLandingMenu(false); window.location.href = "https://nfluenceagency.com/#popular"; } },
              { label: "contact us", action: () => { setShowLandingMenu(false); window.location.href = "https://nfluenceagency.com/contact.html"; } },
              { label: "faq", action: () => { setShowLandingMenu(false); setView("faq"); } },
              { label: user ? "dashboard" : creatorUser ? "dashboard" : "sign in", action: () => { setShowLandingMenu(false); setView(user ? "dashboard" : creatorUser ? "creatordashboard" : "signin"); } },
            ].map(item => (
              <div key={item.label} role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }} onClick={item.action} style={{ padding: "10px 14px", borderRadius: 10, fontSize: ".9rem", color: "rgba(255,255,255,.85)", cursor: "pointer", transition: "background .12s" }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,.08)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                {item.label}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Hero */}
      <div style={{ textAlign: "center", padding: "50px 24px 20px", maxWidth: 700, margin: "0 auto" }}>
        <h1 className="campaign-title" style={{ fontFamily: "'Monda', system-ui, sans-serif", fontSize: "clamp(1.6rem, 5vw, 2.8rem)", fontWeight: 600, lineHeight: 1.2, margin: 0 }}>
          <span style={{ color: "rgba(255,255,255,.4)" }}>launch creator campaigns</span>{" "}<span style={{ color: "#fff" }}>with a clear path to delivery</span>
        </h1>
        <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 32, flexWrap: "wrap" }}>
          <button onClick={() => goToBuilder("builder")} className="nf-cta-btn" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 0, width: "100%", maxWidth: 220, padding: "14px 28px", borderRadius: 16, fontFamily: "system-ui, sans-serif", textTransform: "lowercase", fontSize: ".99rem", background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.28)", backdropFilter: "blur(20px)", color: "#fff", cursor: "pointer", boxShadow: "0 10px 28px rgba(0,0,0,.25)" }}>
            start a campaign
          </button>
          <button onClick={() => setView(creatorUser ? "creatordashboard" : "creatorsignin")} className="nf-cta-btn" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 0, width: "100%", maxWidth: 220, padding: "14px 28px", borderRadius: 16, fontFamily: "system-ui, sans-serif", textTransform: "lowercase", fontSize: ".99rem", background: "transparent", border: "1px solid rgba(255,255,255,.18)", color: "#fff", cursor: "pointer" }}>
            i'm a creator
          </button>
        </div>
      </div>

      {/* Divider */}
      <div style={{ width: "min(58%, 520px)", height: 1, background: "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,.15) 50%, rgba(255,255,255,0) 100%)", opacity: .6, margin: "20px auto 32px" }} />

      {/* Open Campaigns */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 16px 80px" }}>
        <p style={{textAlign:'center',color:'#b9c7d8',marginBottom:24}}>$299 per campaign · $1,999 for 12 months · Free for creators</p>
        {publicCampaigns.length > 0 && <h2 style={{ fontFamily: "'Monda', system-ui, sans-serif", fontSize: "1.4rem", textAlign: "center", marginBottom: 28, fontWeight: 600 }}>current campaigns</h2>}
        {publicLoading?<p className="nf-empty-state" role="status">Loading current campaigns…</p>:publicError?<div className="nf-empty-state" role="alert"><p>Campaigns couldn’t load. Please try again.</p><button onClick={refreshPublic}>Try again</button></div>:null}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {mergedDemos.map((c, i) => {
            const isApplied = appliedCampaigns.includes(c.id);
            return (
            <React.Fragment key={c.id}>
            {c.isDemo && i === publicCampaigns.length && <div className="nf-demo-heading"><h2>demo campaigns</h2><p>Example briefs to show how your campaign, deliverables, and creator compensation can look.</p></div>}
            <div data-demo={c.isDemo || undefined} className="nf-campaign-card" tabIndex={0} role="group" aria-label={`${c.brand}: ${c.campaign}${c.isDemo ? " demo" : ""}`} onKeyDown={e=>{if(e.target===e.currentTarget && (e.key==="Enter" || e.key===" ")){e.preventDefault();setSelectedCampaign(c);setDetailSource("landing");setView("detail");}}} onClick={() => { setSelectedCampaign(c); setDetailSource("landing"); setView("detail"); }}>
              {/* Product image area */}
              <div style={{ position: "relative" }}>
                {c.isDemo && <span className="nf-demo-badge">demo campaign</span>}
                  <div style={{ height: 150, background: c.imgBg, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", borderRadius: "20px 20px 0 0" }}>
                  {c.imgUrl ? (
                    <img src={c.imgUrl} alt={c.brand} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ fontSize: "2.8rem", opacity: .25 }}>{c.imgIcon}</div>
                  )}
                </div>
                {/* Brand logo overlay — outside overflow:hidden */}
                {c.logoUrl ? (
                  <img src={c.logoUrl} alt={c.brand} style={{ position: "absolute", bottom: -41, left: 16, width: 82, height: 82, borderRadius: "50%", border: "3px solid rgba(255,255,255,.15)", objectFit: "cover", zIndex: 2 }} />
                ) : (
                  <div style={{ position: "absolute", bottom: -41, left: 16, width: 82, height: 82, borderRadius: "50%", background: "#0c1424", border: "3px solid rgba(255,255,255,.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".65rem", color: "rgba(255,255,255,.5)", zIndex: 2 }}>logo</div>
                )}
              </div>

              {/* Under banner: brand name left, spots + icons right */}
              <div className="nf-campaign-summary" style={{ padding: "12px 16px 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                {/* Brand + campaign name — left, pushed down to clear logo */}
                <div style={{ paddingTop: 34 }}>
                  <div className={c.featured ? "nf-featured-name" : ""} style={{ fontSize: "1.7rem", fontWeight: 700, color: c.featured ? undefined : "#fff", lineHeight: 1.15 }}>{c.brand}</div>
                  <div style={{ fontSize: "1.05rem", opacity: .5, marginTop: 4 }}>{c.campaign}</div>
                </div>
                {/* Spots + available for — right */}
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  {c.spotsTotal && (
                    <div style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 10, padding: "6px 12px", fontSize: ".85rem", color: "#fff", fontWeight: 600, whiteSpace: "nowrap", display: "inline-block", marginBottom: 6 }}>
                      {c.spotsTotal != null ? `${Math.max(0, c.spotsTotal - Math.max(c.spotsFilled || 0, c.creators?.approved?.length || 0))} spots left` : "open"}
                    </div>
                  )}
                  <div style={{ fontSize: ".82rem", opacity: .35, textTransform: "lowercase", letterSpacing: ".03em", marginBottom: 6 }}>available for</div>
                  <div style={{ display: "flex", gap: 5, justifyContent: "flex-end" }}>
                    {c.platforms.map(p => (
                      <div key={p} style={{ width: 34, height: 34, borderRadius: 8, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>{PLAT_SVGS_SMALL[p]}</div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Card body */}
              <div style={{ padding: "8px 16px 16px", flex: 1, display: "flex", flexDirection: "column" }}>
                {/* Details */}
                <div style={{ marginBottom: 0, flex: 1 }}>
                  {[["following:", c.following], ["deadline:", c.deadline]].map(([label, val]) => (
                    <div key={label} style={{ display: "flex", gap: 8, padding: "3px 0", fontSize: ".95rem" }}>
                      <div style={{ opacity: .35, minWidth: 105 }}>{label}</div>
                      <div style={{ opacity: .85 }}>{val}</div>
                    </div>
                  ))}
                  {/* Deliverables — per platform */}
                  <div style={{ display: "flex", gap: 8, padding: "3px 0", fontSize: ".95rem" }}>
                    <div style={{ opacity: .35, minWidth: 105 }}>deliverables:</div>
                    <div style={{ opacity: .85 }}>
                      {c.deliverables && Object.entries(c.deliverables).map(([plat, del], idx) => {
                        const abbr = { Instagram: "IG", TikTok: "TT", YouTube: "YT", X: "X", Facebook: "FB" };
                        return <span key={plat}>{idx > 0 ? " · " : ""}{abbr[plat] || plat}: {del}</span>;
                      })}
                    </div>
                  </div>
                </div>

                {/* Footer — compensation prominent, fixed height */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 14, marginTop: 14, borderTop: "1px solid rgba(255,255,255,.08)", minHeight: 68 }}>
                  <div>
                    <div style={{ fontSize: ".85rem", opacity: .4, textTransform: "lowercase", marginBottom: 3 }}>creators get</div>
                    <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "#fff", lineHeight: 1.2 }}>
                      {c.comp}
                      {c.compType === "product+paid" ? <span style={{ fontSize: ".85rem", fontWeight: 400, opacity: .45, marginLeft: 4 }}>+ product</span> : ""}
                    </div>
                  </div>
                  {c.isDemo ? <button className="nf-demo-preview" onClick={e => {e.stopPropagation();setSelectedCampaign(c);setDetailSource("landing");setView("detail");}}>view demo</button> : isApplied ? (
                    <div style={{ padding: "8px 16px", borderRadius: 12, border: "1px solid rgba(100,255,150,.2)", fontSize: ".85rem", fontWeight: 600, color: "rgba(100,255,150,.8)", display: "flex", alignItems: "center", gap: 6 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(100,255,150,.85)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      applied
                    </div>
                  ) : (
                    <div className="nf-apply-btn" onClick={e => { e.stopPropagation(); setAutoApply(true); setSelectedCampaign(c); setDetailSource("landing"); setView("detail"); }} style={{ padding: "10px 24px", borderRadius: 12, border: "1px solid rgba(255,255,255,.3)", fontSize: ".95rem", fontWeight: 600, color: "#fff" }}>apply</div>
                  )}
                </div>
              </div>
            </div>
            </React.Fragment>
          );
          })}
        </div>
        <div style={{ textAlign: "center", padding: "40px 24px 28px", fontSize: ".75rem", opacity: .25, fontFamily: "system-ui, sans-serif", lineHeight: 2 }}>
          <div><a href="mailto:support@nfluenceagency.com" style={{ color: "inherit", textDecoration: "underline", textDecorationColor: "rgba(255,255,255,.2)" }}>support@nfluenceagency.com</a></div>
          <div>© 2026 nfluence</div>
        </div>
      </div>
    </div>
  );
}
createRoot(document.getElementById('root')).render(<AppBoundary><NfluenceApp /></AppBoundary>);
  