// ═══════════════════════════════════════════════

let _stripe = null;
function getStripe() {
  if (!_stripe && window.Stripe && window.STRIPE_PUBLISHABLE_KEY) {
    _stripe = window.Stripe(window.STRIPE_PUBLISHABLE_KEY);
  }
  return _stripe;
}

async function callStripePayment(amountCents, token, cardElement) {
  const stripe = getStripe();
  if (!stripe) throw new Error('Stripe.js not loaded — add <script src="https://js.stripe.com/v3/"><\/script>');
  const res = await fetch('https://xynujmscxjxbfivylfne.supabase.co/functions/v1/stripe-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token || ''}` },
    body: JSON.stringify({ amount: Math.round(amountCents), currency: 'usd' }),
  });
  const payload = await res.json();
  if (!res.ok) throw new Error(payload.error || 'Payment service error');
  const { error } = await stripe.confirmCardPayment(payload.client_secret, {
    payment_method: { card: cardElement },
  });
  if (error) throw new Error(error.message);
}

function CampaignDetail({ campaign: initialCampaign, onBack, isOwner, user, onApply, onSignInRedirect, appliedCampaigns = [], onOpenMessage, onOpenInbox, messageCount = 0, autoApply = false, onAutoApplyConsumed, onEditCampaign, onScheduleCall, onViewCreatorProfile, onNotify }) {
  const [c, setC] = useState(JSON.parse(JSON.stringify(initialCampaign)));
  const derivedSpotsFilled = (c.creators?.approved?.length || 0);
  const spotsLeft = c.spotsTotal != null ? Math.max(0, c.spotsTotal - derivedSpotsFilled) : null;
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyStep, setApplyStep] = useState(0); // 0=info, 1=platforms, 2=pitch, 3=done
  const [hasApplied, setHasApplied] = useState(
    appliedCampaigns.includes(initialCampaign.brand + "::" + initialCampaign.campaign)
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
    if (!user) {
      onSignInRedirect?.();
      return;
    }
    setApplyForm(f => ({ ...f, name: user.name || "", email: user.email || "" }));
    setApplyStep(0);
    setShowApplyModal(true);
  };

  useEffect(() => {
    if (autoApply) { handleApplyClick(); onAutoApplyConsumed?.(); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoApply]);

  const submitApplication = () => {
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
    // Add to local campaign state
    setC(prev => ({
      ...prev,
      creators: {
        ...prev.creators,
        pending: [...(prev.creators?.pending || []), applicationData],
      },
    }));
    setHasApplied(true);
    setApplyStep(3);
    onApply?.(initialCampaign, applicationData);
  };

  const INFLUENCER_STAGES = ["accepted", "product_shipped", "content_submitted", "approved", "paid"];
  const STAGE_LABELS = {
    applied: "applied", accepted: "accepted", product_shipped: "product shipped",
    content_submitted: "content submitted", approved: "content approved", paid: "paid",
  };

  const approveCreator = (creator) => {
    setC(prev => {
      const newPending = (prev.creators?.pending || []).filter(cr => cr.name !== creator.name);
      const newApproved = [...(prev.creators?.approved || []), { ...creator, stage: "accepted", acceptedAt: new Date().toISOString() }];
      return { ...prev, creators: { ...prev.creators, pending: newPending, approved: newApproved } };
    });
    const sb = getSB();
    if (sb && creator.applicationId)
      sb.from('applications').update({ status: 'accepted', stage: 'accepted', accepted_at: new Date().toISOString() }).eq('id', creator.applicationId).catch(console.error);
    onNotify?.({ for: "creator", type: "application_accepted", title: "application accepted!", body: `You've been accepted into ${initialCampaign.brand} · ${initialCampaign.campaign}. Check your dashboard for next steps.` });
  };

  const rejectCreator = (creator) => {
    setC(prev => {
      const newPending = (prev.creators?.pending || []).filter(cr => cr.name !== creator.name);
      return { ...prev, creators: { ...prev.creators, pending: newPending } };
    });
    const sb = getSB();
    if (sb && creator.applicationId)
      sb.from('applications').update({ status: 'rejected' }).eq('id', creator.applicationId).catch(console.error);
    onNotify?.({ for: "creator", type: "application_rejected", title: "application update", body: `Your application to ${initialCampaign.brand} · ${initialCampaign.campaign} was not selected this time.` });
  };

  const advanceCreator = (creatorName) => {
    const creatorObj = (c.creators?.approved || []).find(cr => cr.name === creatorName);
    const currentIdx = INFLUENCER_STAGES.indexOf(creatorObj?.stage || '');
    const nextStage = currentIdx >= 0 && currentIdx < INFLUENCER_STAGES.length - 1 ? INFLUENCER_STAGES[currentIdx + 1] : null;
    setC(prev => {
      const newApproved = (prev.creators?.approved || []).map(cr => {
        if (cr.name !== creatorName) return cr;
        const idx = INFLUENCER_STAGES.indexOf(cr.stage);
        if (idx < INFLUENCER_STAGES.length - 1) {
          const ns = INFLUENCER_STAGES[idx + 1];
          if (ns === "paid") onNotify?.({ for: "creator", type: "content_approved", title: "content approved — payment released!", body: `Your content for ${initialCampaign.brand} · ${initialCampaign.campaign} has been approved and payment is on its way.` });
          if (ns === "content_submitted") onNotify?.({ for: "creator", type: "content_submitted", title: "content marked as submitted", body: `Your content for ${initialCampaign.brand} · ${initialCampaign.campaign} is now under review.` });
          return { ...cr, stage: ns };
        }
        return cr;
      });
      return { ...prev, creators: { ...prev.creators, approved: newApproved } };
    });
    const sb = getSB();
    if (sb && creatorObj?.applicationId && nextStage) {
      const tsMap = { content_submitted: 'content_submitted_at', approved: 'approved_at', paid: 'paid_at' };
      const tsField = tsMap[nextStage];
      sb.from('applications').update({ stage: nextStage, ...(tsField ? { [tsField]: new Date().toISOString() } : {}) })
        .eq('id', creatorObj.applicationId).catch(console.error);
    }
  };

  const shipCreator = (creatorName, trackingNumber) => {
    const creatorObj = (c.creators?.approved || []).find(cr => cr.name === creatorName);
    setC(prev => {
      const newApproved = (prev.creators?.approved || []).map(cr => {
        if (cr.name !== creatorName) return cr;
        return { ...cr, stage: "product_shipped", trackingNumber: trackingNumber.trim() || null };
      });
      return { ...prev, creators: { ...prev.creators, approved: newApproved } };
    });
    const sb = getSB();
    if (sb && creatorObj?.applicationId)
      sb.from('applications').update({ stage: 'product_shipped', tracking_number: trackingNumber.trim() || null, shipped_at: new Date().toISOString() }).eq('id', creatorObj.applicationId).catch(console.error);
    const trackingMsg = trackingNumber.trim() ? ` Tracking: ${trackingNumber.trim()}` : "";
    onNotify?.({ for: "creator", type: "product_shipped", title: "product shipped!", body: `${initialCampaign.brand} has shipped your product for ${initialCampaign.campaign}.${trackingMsg}` });
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

  const submitSchedule = () => {
    if (!scheduleForm.date || !scheduleForm.time) return;
    const datetime = new Date(`${scheduleForm.date}T${scheduleForm.time}`).toISOString();
    onScheduleCall?.({
      creatorName: scheduleTarget,
      campaign: c,
      datetime,
      timezone: scheduleForm.timezone,
      meetLink: scheduleForm.meetLink.trim(),
      notes: scheduleForm.notes.trim(),
    });
    setScheduleTarget(null);
    setScheduleForm({ date: "", time: "", timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, meetLink: "", notes: "" });
  };

  const ScheduleCallModal = () => {
    if (!scheduleTarget) return null;
    const isValid = scheduleForm.date && scheduleForm.time;
    return (
      <div onClick={() => setScheduleTarget(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, padding: 20 }}>
        <div onClick={e => e.stopPropagation()} style={{ background: "#0a1322", border: "1px solid rgba(255,255,255,.12)", borderRadius: 20, padding: "28px", maxWidth: 500, width: "100%", maxHeight: "90vh", overflowY: "auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
            <div>
              <div style={{ fontSize: "1.1rem", fontWeight: 700, fontFamily: "'Monda', system-ui, sans-serif" }}>schedule a call</div>
              <div style={{ fontSize: ".78rem", opacity: .4, marginTop: 3 }}>{scheduleTarget}</div>
            </div>
            <div onClick={() => setScheduleTarget(null)} style={{ cursor: "pointer", width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", opacity: .7 }}>✕</div>
          </div>

          {/* Date + Time row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: ".72rem", opacity: .4, marginBottom: 6, textTransform: "lowercase" }}>date</div>
              <input type="date" value={scheduleForm.date} onChange={e => setScheduleForm(f => ({ ...f, date: e.target.value }))}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,.15)", background: "rgba(0,0,0,.3)", color: "#fff", fontSize: ".85rem", outline: "none", fontFamily: "system-ui, sans-serif", boxSizing: "border-box" }} />
            </div>
            <div>
              <div style={{ fontSize: ".72rem", opacity: .4, marginBottom: 6, textTransform: "lowercase" }}>time</div>
              <input type="time" value={scheduleForm.time} onChange={e => setScheduleForm(f => ({ ...f, time: e.target.value }))}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,.15)", background: "rgba(0,0,0,.3)", color: "#fff", fontSize: ".85rem", outline: "none", fontFamily: "system-ui, sans-serif", boxSizing: "border-box" }} />
            </div>
          </div>

          {/* Timezone */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: ".72rem", opacity: .4, marginBottom: 6, textTransform: "lowercase" }}>timezone</div>
            <select value={scheduleForm.timezone} onChange={e => setScheduleForm(f => ({ ...f, timezone: e.target.value }))}
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
              placeholder="https://zoom.us/j/... or meet.google.com/..."
              style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,.15)", background: "rgba(0,0,0,.3)", color: "#fff", fontSize: ".85rem", outline: "none", fontFamily: "system-ui, sans-serif", boxSizing: "border-box" }} />
          </div>

          {/* Notes */}
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontSize: ".72rem", opacity: .4, marginBottom: 6, textTransform: "lowercase" }}>notes for creator (optional)</div>
            <textarea value={scheduleForm.notes} onChange={e => setScheduleForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="e.g. we'll discuss content requirements and brand guidelines"
              rows={3}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,.15)", background: "rgba(0,0,0,.3)", color: "#fff", fontSize: ".85rem", outline: "none", fontFamily: "system-ui, sans-serif", resize: "vertical", lineHeight: 1.5, boxSizing: "border-box" }} />
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <div onClick={() => setScheduleTarget(null)} style={{ flex: 1, padding: "12px", borderRadius: 12, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.03)", color: "rgba(255,255,255,.5)", fontSize: ".85rem", fontWeight: 600, cursor: "pointer", textAlign: "center", fontFamily: "'Monda', system-ui, sans-serif" }}>cancel</div>
            <div onClick={isValid ? submitSchedule : undefined} style={{ flex: 2, padding: "12px", borderRadius: 12, border: `1px solid ${isValid ? "rgba(100,200,255,.4)" : "rgba(255,255,255,.08)"}`, background: isValid ? "rgba(100,200,255,.1)" : "rgba(255,255,255,.02)", color: isValid ? "rgba(100,200,255,.9)" : "rgba(255,255,255,.2)", fontSize: ".85rem", fontWeight: 600, cursor: isValid ? "pointer" : "not-allowed", textAlign: "center", fontFamily: "'Monda', system-ui, sans-serif", transition: "all .12s" }}>
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
      <div className="nf-back-link" style={{ padding: "16px 24px", cursor: "pointer", opacity: .6, fontSize: ".85rem", display: "inline-flex", alignItems: "center", gap: 6 }} onClick={onBack}>
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
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 12, marginBottom: 12 }}>
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
            <div style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,.2)", fontSize: ".8rem", cursor: "pointer", flexShrink: 0 }}>view</div>
          </div>
        )}

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
                      placeholder="tracking # (optional)"
                      style={{
                        flex: 1, minWidth: 120, padding: "5px 10px", borderRadius: 8,
                        background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.12)",
                        color: "#fff", fontSize: ".72rem", outline: "none",
                        fontFamily: "system-ui, sans-serif",
                      }}
                    />
                    <div
                      onClick={(e) => { e.stopPropagation(); shipCreator(creator.name, trackingInput); }}
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
                    {showAdvance && creator.stage !== "paid" && creator.stage !== "accepted" && nextStageLabel(creator.stage) && (
                      <div onClick={(e) => { e.stopPropagation(); advanceCreator(creator.name); }} style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        padding: "6px 14px", borderRadius: 10, fontSize: ".75rem", fontWeight: 600,
                        background: "rgba(100,200,255,.08)", border: "1px solid rgba(100,200,255,.25)",
                        color: "rgba(100,200,255,.9)", cursor: "pointer", transition: "all .12s",
                      }}>
                        advance → {nextStageLabel(creator.stage)}
                      </div>
                    )}
                    {showMessage && (
                      <div onClick={(e) => { e.stopPropagation(); onOpenMessage?.(creator.name); }} style={{
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
                      <div onClick={(e) => { e.stopPropagation(); setScheduleTarget(creator.name); }} style={{
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
                <div onClick={() => setShowPendingModal(false)} style={{
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
                        cursor: "pointer", width: 32, height: 32, borderRadius: "50%",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: "rgba(255,255,255,.06)", fontSize: "1rem", opacity: .7,
                      }}>✕</div>
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
              fontFamily: "'Monda', system-ui, sans-serif", textTransform: "lowercase",
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
        {!isOwner && (
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
                fontFamily: "'Monda', system-ui, sans-serif", textTransform: "lowercase",
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
          <div onClick={() => { if (applyStep === 3) setShowApplyModal(false); }} style={{
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
                    cursor: "pointer", width: 32, height: 32, borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: "rgba(255,255,255,.06)", fontSize: "1rem", opacity: .7,
                  }}>✕</div>
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
                      placeholder="your name"
                      style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: "1px solid rgba(255,255,255,.15)", background: "rgba(0,0,0,.3)", color: "#fff", fontSize: ".95rem", outline: "none", fontFamily: "system-ui, sans-serif", transition: "border-color .12s" }}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: ".75rem", opacity: .4, marginBottom: 6, textTransform: "lowercase" }}>email</div>
                    <input
                      value={applyForm.email}
                      onChange={e => setApplyForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="you@email.com"
                      type="email"
                      style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: "1px solid rgba(255,255,255,.15)", background: "rgba(0,0,0,.3)", color: "#fff", fontSize: ".95rem", outline: "none", fontFamily: "system-ui, sans-serif", transition: "border-color .12s" }}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: ".75rem", opacity: .4, marginBottom: 6, textTransform: "lowercase" }}>portfolio link <span style={{ opacity: .5 }}>(optional)</span></div>
                    <input
                      value={applyForm.portfolio}
                      onChange={e => setApplyForm(f => ({ ...f, portfolio: e.target.value }))}
                      placeholder="https://your-site.com"
                      style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: "1px solid rgba(255,255,255,.15)", background: "rgba(0,0,0,.3)", color: "#fff", fontSize: ".95rem", outline: "none", fontFamily: "system-ui, sans-serif", transition: "border-color .12s" }}
                    />
                  </div>
                  <button
                    disabled={!applyForm.name.trim() || !applyForm.email.includes("@")}
                    onClick={() => setApplyStep(1)}
                    style={{
                      width: "100%", padding: "14px", borderRadius: 14, border: "1px solid rgba(255,255,255,.25)",
                      background: applyForm.name.trim() && applyForm.email.includes("@") ? "rgba(255,255,255,.08)" : "transparent",
                      color: "#fff", fontSize: ".95rem", fontFamily: "'Monda', system-ui, sans-serif",
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
                          <input
                            value={applyForm.handles[p]}
                            onChange={e => setApplyForm(f => ({ ...f, handles: { ...f.handles, [p]: e.target.value } }))}
                            placeholder={`@${p.toLowerCase()} handle`}
                            style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,.12)", background: "rgba(0,0,0,.25)", color: "#fff", fontSize: ".85rem", outline: "none", fontFamily: "system-ui, sans-serif", minWidth: 0 }}
                          />
                          <input
                            value={applyForm.followers[p]}
                            onChange={e => setApplyForm(f => ({ ...f, followers: { ...f.followers, [p]: e.target.value } }))}
                            placeholder="followers"
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
                        color: "#fff", fontSize: ".85rem", fontFamily: "'Monda', system-ui, sans-serif",
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
                    <textarea
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
                      disabled={!applyForm.pitch.trim() || !applyForm.agreeTerms || ((c.ageMin || (c.requirements || "").includes("18+") || (c.requirements || "").includes("21+")) && !applyForm.agreeAge)}
                      onClick={submitApplication}
                      style={{
                        flex: 2, padding: "14px", borderRadius: 12,
                        border: (applyForm.pitch.trim() && applyForm.agreeTerms) ? "1px solid rgba(100,255,150,.35)" : "1px solid rgba(255,255,255,.15)",
                        background: (applyForm.pitch.trim() && applyForm.agreeTerms) ? "rgba(100,255,150,.1)" : "transparent",
                        color: (applyForm.pitch.trim() && applyForm.agreeTerms) ? "rgba(100,255,150,.9)" : "rgba(255,255,255,.3)",
                        fontSize: ".95rem", fontWeight: 600, fontFamily: "'Monda', system-ui, sans-serif",
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
  const PRICES = { 1: 2.99, 7: 14.99, 30: 49.99 };
  const featuredWeeks = c.featuredWeeks || 7;
  const featuredPrice = PRICES[featuredWeeks] || 2.99;
  const containerRef = useRef(null);
  const cardRef = useRef(null);
  const cardDivRef = useRef(null);
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoError, setPromoError] = useState("");

  const promoDiscount = promoApplied && VALID_PROMOS[promoCode.toUpperCase()] ? VALID_PROMOS[promoCode.toUpperCase()] : 0;
  const applyPromo = () => {
    const code = promoCode.trim().toUpperCase();
    if (VALID_PROMOS[code]) { setPromoApplied(true); setPromoError(""); }
    else { setPromoError("invalid promo code"); setPromoApplied(false); }
  };
  useEffect(() => {
    if (!showPayModal) {
      cardRef.current?.destroy();
      cardRef.current = null;
      setPayError("");
      return;
    }
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
    return () => {
      clearTimeout(t);
      cardRef.current?.destroy();
      cardRef.current = null;
    };
  }, [showPayModal]);
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

  const handleSave = () => {
    const needsPayment = (c.featured && !initialCampaign.featured) || escrowChanged;
    if (needsPayment) setShowPayModal(true);
    else onSave(c);
  };

  const totalDue = (((c.featured && !initialCampaign.featured) ? featuredPrice : 0) + escrowDelta) * (1 - promoDiscount);

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
        .ce-comp-pill { padding: 10px 18px; border-radius: 12px; border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.03); color: rgba(255,255,255,.55); font-size: .85rem; cursor: pointer; transition: all .12s; }
        .ce-comp-pill.selected { background: rgba(255,255,255,.1); border-color: rgba(255,255,255,.35); color: #fff; }
        .ce-comp-pill.locked-opt { opacity: .22; cursor: not-allowed; pointer-events: none; }
        .ce-comp-pill.selected.in-locked { background: rgba(255,140,30,.15); border-color: rgba(255,165,50,.6); color: rgba(255,165,50,.95); }
        .ce-spots-pill { padding: 8px 14px; border-radius: 10px; border: 1px solid rgba(255,255,255,.1); background: rgba(255,255,255,.03); color: rgba(255,255,255,.5); font-size: .82rem; cursor: pointer; transition: all .12s; }
        .ce-spots-pill.selected { background: rgba(255,255,255,.1); border-color: rgba(255,255,255,.3); color: #fff; }
        .ce-spots-pill.locked-opt { opacity: .22; cursor: not-allowed; pointer-events: none; }
        .ce-save-btn { padding: 14px 48px; border-radius: 14px; border: 1px solid rgba(255,255,255,.3); background: rgba(255,255,255,.08); color: #fff; font-size: 1rem; font-family: 'Monda', system-ui, sans-serif; text-transform: lowercase; cursor: pointer; transition: transform .12s, border-color .2s, box-shadow .2s, background .2s; display: block; margin: 0 auto; }
        .ce-save-btn:hover { background: rgba(255,255,255,.14); border-color: rgba(255,255,255,.55); box-shadow: 0 0 18px rgba(255,255,255,.12); transform: translateY(-2px); }
        .ce-comp-pill:not(.locked-opt):hover { border-color: rgba(255,255,255,.55) !important; box-shadow: 0 0 14px rgba(255,255,255,.15) !important; background: rgba(255,255,255,.08) !important; transform: translateY(-1px); }
        .ce-spots-pill:hover { border-color: rgba(255,255,255,.55) !important; box-shadow: 0 0 14px rgba(255,255,255,.15) !important; background: rgba(255,255,255,.08) !important; transform: translateY(-1px); }
        .ce-plat-locked { opacity: .45; pointer-events: none; }
        .ce-action-btn { transition: transform .12s, border-color .2s, box-shadow .2s, background .2s; }
        .ce-action-btn:hover { border-color: rgba(255,255,255,.55) !important; box-shadow: 0 0 14px rgba(255,255,255,.15) !important; background: rgba(255,255,255,.08) !important; transform: translateY(-1px); }
        .ce-featured-section { border-radius: 16px; padding: 22px 24px; margin-bottom: 16px; background: rgba(160,80,255,.04); animation: ce-feat-pulse 2.5s ease-in-out infinite; }
        .ce-featured-section-off { background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.08); border-radius: 16px; padding: 22px 24px; margin-bottom: 16px; }
        @keyframes ce-feat-pulse { 0%,100% { border: 1px solid rgba(160,80,255,.25); box-shadow: 0 0 8px rgba(140,60,255,.08); } 50% { border: 1px solid rgba(185,110,255,.85); box-shadow: 0 0 18px rgba(160,80,255,.3); } }
        .ce-feat-pill { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 16px; font-size: .9rem; border-radius: 10px; border: 1px solid rgba(160,80,255,.2); background: rgba(160,80,255,.06); color: rgba(185,110,255,.7); cursor: pointer; transition: all .12s; }
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
      <div style={{ width: "100%", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", fontFamily: "'Monda', system-ui, sans-serif" }}>
        <div style={{ fontWeight: 600, fontSize: "1.1rem", cursor: "pointer" }} onClick={onBack}>nfluence</div>
        <div className="ce-action-btn" style={{ cursor: "pointer", opacity: .5, fontSize: ".85rem", padding: "6px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,.1)" }} onClick={onBack}>← back</div>
      </div>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "8px 16px 100px" }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: "clamp(1.3rem, 4vw, 1.8rem)", fontWeight: 700, fontFamily: "'Monda', system-ui, sans-serif", marginBottom: 4 }}>edit campaign</div>
          <div style={{ fontSize: ".88rem", opacity: .4 }}>{c.brand} · {c.campaign}</div>
          {hasAccepted && <div style={{ marginTop: 12, padding: "10px 16px", borderRadius: 12, background: "rgba(255,140,30,.08)", border: "1px solid rgba(255,140,30,.5)", fontSize: ".82rem", color: "rgba(255,165,50,.95)", display: "flex", alignItems: "center", gap: 8, animation: "ce-lock-pulse 2.5s ease-in-out infinite" }}><span>⚠</span> some fields are locked because creators have been accepted</div>}
        </div>
        <div className="ce-section">
          {sectionTitle("campaign details")}
          <div style={{ marginBottom: 14 }}><label className="ce-label">campaign name</label><input className="ce-input" value={c.campaign} onChange={e => setField("campaign", e.target.value)} /></div>
          <div style={{ marginBottom: 14 }}><label className="ce-label">description</label><textarea className="ce-input" value={c.description} onChange={e => setField("description", e.target.value)} rows={5} style={{ resize: "vertical", lineHeight: 1.55 }} /></div>
          <div style={{ marginBottom: 14 }}><label className="ce-label">requirements</label><textarea className="ce-input" value={c.requirements} onChange={e => setField("requirements", e.target.value)} rows={3} style={{ resize: "vertical", lineHeight: 1.55 }} /></div>
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
                        const d = new Date(e.target.value + "T00:00:00");
                        setField("deadline", `${d.getMonth()+1}/${d.getDate()}/${String(d.getFullYear()).slice(-2)}`);
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
              <span style={{ fontSize: ".8rem", color: "rgba(255,165,50,.8)", lineHeight: 1.5 }}>paid campaigns require a creator cap — escrow is calculated from this number</span>
            </div>
          )}
          {(customSpots || (c.spotsTotal !== null && ![5,10,15,20,25,50].includes(c.spotsTotal))) && <input className="ce-input" type="number" style={{ marginTop: 10, maxWidth: 160 }} value={c.spotsTotal || ""} placeholder="enter number" onChange={e => setField("spotsTotal", parseInt(e.target.value) || 0)} />}
        </div>
        <div className={compIsLocked ? "ce-locked-section" : "ce-section"}>
          {sectionTitle("compensation", compIsLocked)}
          {compIsLocked && <div style={{ fontSize: ".78rem", opacity: .5, marginBottom: 14 }}>you can upgrade but not downgrade after creators have been accepted</div>}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
            {[{value:"product",label:"product only"},{value:"paid",label:"paid"},{value:"product+paid",label:"product + paid"}].map(opt => {
              const isSelected = c.compType === opt.value; const isLocked = compIsLocked && !canChangeComp(opt.value);
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
                  <input className="ce-input" value={c.comp.replace(/^\$/, "")} onChange={e => setField("comp", "$" + e.target.value.replace(/^\$/, ""))} placeholder="0.00" style={{ paddingLeft: 28 }} />
                </div>
                {(() => {
                  const perCreator = parseFloat(c.comp.replace(/[^0-9.]/g, ""));
                  const count = c.spotsTotal || (c.creators?.approved?.length || 0);
                  if (!perCreator || count === 0) return null;
                  const total = (perCreator * count).toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 });
                  return (
                    <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                      <div style={{ fontSize: "2rem", fontWeight: 700, fontFamily: "'Monda', system-ui, sans-serif", color: "rgba(180,255,80,.95)", lineHeight: 1 }}>{total}</div>
                      <div style={{ fontSize: ".82rem", opacity: .4 }}>to be held in escrow</div>
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
                <div onClick={() => removeProduct(i)} style={{ cursor: "pointer", opacity: .3, fontSize: "1.1rem", padding: "0 6px", flexShrink: 0 }}>✕</div>
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
              { icon: "✦", text: "priority in creator email blasts & notifications" },
              { icon: "✦", text: "featured campaigns fill 2–3× faster" },
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
        <button className="ce-save-btn" onClick={handleSave}>save changes</button>
      </div>

      {/* Payment modal */}
      {showPayModal && (
        <div onClick={() => { if (!payLoading) setShowPayModal(false); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.8)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "12px" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#0a1322", border: "1px solid rgba(160,80,255,.25)", borderRadius: 24, padding: 24, maxWidth: 440, width: "100%", boxShadow: "0 40px 80px rgba(0,0,0,.6)", animation: "ce-feat-pulse 2.5s ease-in-out infinite" }}>
            <div style={{ fontSize: "1.2rem", fontWeight: 700, fontFamily: "'Monda', system-ui, sans-serif", marginBottom: 6 }}>review charges</div>
            <div style={{ fontSize: ".88rem", opacity: .4, marginBottom: 24, lineHeight: 1.6 }}>the following will be charged when you confirm</div>

            <div style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 14, overflow: "hidden", marginBottom: 20 }}>
              {escrowChanged && (
                <div style={{ padding: "14px 20px", borderBottom: c.featured && escrowChanged ? "1px solid rgba(255,255,255,.06)" : "none" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                    <div>
                      <div style={{ fontSize: ".9rem", fontWeight: 600 }}>escrow deposit</div>
                      <div style={{ fontSize: ".75rem", opacity: .4, marginTop: 2 }}>{capCount} creators × ${perCreator.toLocaleString()}{oldEscrow > 0 ? ` (${oldEscrow > 0 ? `+$${escrowDelta.toLocaleString()} top-up` : ""})` : ""}</div>
                    </div>
                    <div style={{ fontSize: "1.3rem", fontWeight: 700, fontFamily: "'Monda', system-ui, sans-serif", color: "rgba(180,255,80,.9)" }}>${escrowDelta.toLocaleString()}</div>
                  </div>
                  <div style={{ fontSize: ".72rem", opacity: .3, marginTop: 6 }}>held securely · released to creators on completion</div>
                </div>
              )}
              {c.featured && (
                <div style={{ padding: "14px 20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                    <div>
                      <div style={{ fontSize: ".9rem", fontWeight: 600 }}>featured placement</div>
                      <div style={{ fontSize: ".75rem", opacity: .4, marginTop: 2 }}>{featuredWeeks} {featuredWeeks === 1 ? "day" : "days"} · gold shimmer + priority</div>
                    </div>
                    <div style={{ fontSize: "1.3rem", fontWeight: 700, fontFamily: "'Monda', system-ui, sans-serif", color: "rgba(185,110,255,.9)" }}>${featuredPrice.toFixed(2)}</div>
                  </div>
                  <div style={{ fontSize: ".72rem", opacity: .3, marginTop: 6 }}>charged immediately · non-refundable</div>
                </div>
              )}
              <div style={{ padding: "14px 20px", background: "rgba(255,255,255,.03)", borderTop: "1px solid rgba(255,255,255,.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: ".85rem", opacity: .5 }}>total due now</span>
                <div style={{ textAlign: "right" }}>
                  {promoDiscount > 0 && <div style={{ fontSize: ".75rem", opacity: .4, textDecoration: "line-through", marginBottom: 2 }}>${((c.featured ? featuredPrice : 0) + escrowDelta).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>}
                  <span style={{ fontSize: "1.6rem", fontWeight: 700, fontFamily: "'Monda', system-ui, sans-serif", color: "#fff" }}>${totalDue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            {/* Promo code */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={promoCode}
                  onChange={e => { setPromoCode(e.target.value); setPromoApplied(false); setPromoError(""); }}
                  placeholder="promo code"
                  style={{ flex: 1, background: "rgba(255,255,255,.05)", border: `1px solid ${promoApplied ? "rgba(100,255,150,.4)" : promoError ? "rgba(255,100,100,.4)" : "rgba(255,255,255,.12)"}`, borderRadius: 10, padding: "10px 14px", color: "#fff", fontSize: ".88rem", outline: "none", fontFamily: "system-ui, sans-serif" }}
                />
                <button onClick={applyPromo} style={{ padding: "10px 16px", borderRadius: 10, border: "1px solid rgba(255,255,255,.2)", background: "rgba(255,255,255,.06)", color: "#fff", fontSize: ".82rem", cursor: "pointer", fontFamily: "system-ui, sans-serif", whiteSpace: "nowrap" }}>apply</button>
              </div>
              {promoApplied && <div style={{ fontSize: ".75rem", color: "rgba(100,255,150,.9)", marginTop: 6 }}>✓ {promoCode.toUpperCase()} applied — {Math.round(promoDiscount * 100)}% off</div>}
              {promoError && <div style={{ fontSize: ".75rem", color: "rgba(255,100,100,.8)", marginTop: 6 }}>{promoError}</div>}
            </div>

            <div ref={cardDivRef} style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 12, padding: "13px 14px", marginBottom: 12 }} />
            {payError && <div style={{ fontSize: ".8rem", color: "rgba(255,100,100,.9)", marginBottom: 10 }}>{payError}</div>}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => { setShowPayModal(false); setPayError(""); }} disabled={payLoading} style={{ flex: 1, padding: "13px", borderRadius: 12, border: "1px solid rgba(255,255,255,.12)", background: "transparent", color: "rgba(255,255,255,.5)", cursor: payLoading ? "not-allowed" : "pointer", fontSize: ".9rem", fontFamily: "system-ui, sans-serif" }}>cancel</button>
              <button disabled={payLoading} onClick={async () => {
                if (!cardRef.current) return;
                setPayLoading(true);
                setPayError("");
                try {
                  await callStripePayment(Math.round(totalDue * 100), session?.access_token, cardRef.current);
                  setShowPayModal(false);
                  onSave(c);
                } catch (err) {
                  setPayError(err.message || "Payment failed");
                } finally {
                  setPayLoading(false);
                }
              }} style={{ flex: 2, padding: "13px", borderRadius: 12, border: "1px solid rgba(185,110,255,.4)", background: payLoading ? "rgba(160,80,255,.08)" : "rgba(160,80,255,.15)", color: "rgba(210,160,255,.95)", cursor: payLoading ? "not-allowed" : "pointer", fontSize: ".95rem", fontWeight: 700, fontFamily: "'Monda', system-ui, sans-serif", textTransform: "lowercase", opacity: payLoading ? .6 : 1, transition: "opacity .15s" }}>
                {payLoading ? "processing..." : `pay $${totalDue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} & save`}
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
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoError, setPromoError] = useState("");

  const promoDiscount = promoApplied && VALID_PROMOS[promoCode.toUpperCase()] ? VALID_PROMOS[promoCode.toUpperCase()] : 0;
  const applyPromo = () => {
    const code = promoCode.trim().toUpperCase();
    if (VALID_PROMOS[code]) { setPromoApplied(true); setPromoError(""); }
    else { setPromoError("invalid promo code"); setPromoApplied(false); }
  };
  useEffect(() => {
    if (!showPayModal) {
      cardRef.current?.destroy();
      cardRef.current = null;
      setPayError("");
      return;
    }
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
    return () => {
      clearTimeout(t);
      cardRef.current?.destroy();
      cardRef.current = null;
    };
  }, [showPayModal]);
  const [brand, setBrand] = useState({
    name: "", tagline: "", bio: "", manager: "", phone: "", email: "", website: "", phoneCode: "+1",
    city: "", state: "", country: "",
    vibes: [], logoPreview: null, logoTransform: null, logoEditing: false,
    socialPills: { Instagram: false, TikTok: false, YouTube: false, X: false, Facebook: false, Website: false },
    socials: { Instagram: "", TikTok: "", YouTube: "", X: "", Facebook: "", Website: "" },
  });
  const [campaign, setCampaign] = useState({
    name: "", summary: "", spotsTotal: null, spotsTotalCustom: "",
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
  const [account, setAccount] = useState({
    email: "", password: "", confirmPassword: "", agreeTerms: false, plan: "campaign", // "campaign" | "annual"
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
    if (step === 4) return isValidEmail(account.email) && account.password.length >= 8 && account.password === account.confirmPassword && account.agreeTerms;
    return true;
  }, [step, brand, campaign, platforms, terms, account, socialsComplete, selectedPlatformKeys, hasDeliverable]);

  const next = () => { if (step < 5) setStep(step + 1); };
  const back = () => { if (step > 0) setStep(step - 1); };

  const containerRef = useRef(null);
  useEffect(() => {
    containerRef.current?.scrollTo?.({ top: 0, behavior: "smooth" });
    window.scrollTo?.({ top: 0, behavior: "smooth" });
    // Auto-prefill account email from brand email
    if (step === 4 && !account.email && brand.email) {
      setAccount(p => ({ ...p, email: brand.email }));
    }
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
        .nf-nav-brand { font-weight: 600; letter-spacing: -.01em; font-size: 1.1rem; color: #fff; }
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

        /* account / pricing */
        .nf-account-pricing {
          border: 1px solid rgba(255,255,255,.12); border-radius: 20px;
          padding: 28px 24px; text-align: center;
          background: radial-gradient(circle at top, rgba(255,255,255,.045), rgba(4,11,21,0));
          backdrop-filter: blur(20px);
        }
        .nf-account-price {
          font-size: 3.4rem; font-weight: 700; color: #fff;
          letter-spacing: -0.02em;
        }
        .nf-account-price-label {
          font-size: .9rem; opacity: .45; margin-top: 4px;
          text-transform: lowercase;
        }
        .nf-account-price-line {
          width: 60px; height: 1px; margin: 22px auto;
          background: rgba(255,255,255,.12);
        }
        .nf-account-includes { text-align: left; max-width: 320px; margin: 0 auto; }
        .nf-account-includes-title {
          font-size: .8rem; text-transform: lowercase;
          letter-spacing: .05em; opacity: .35; margin-bottom: 12px;
        }
        .nf-account-include-item {
          font-size: .9rem; color: rgba(255,255,255,.75);
          padding: 6px 0; padding-left: 22px; position: relative;
        }
        .nf-account-include-item::before {
          content: "✓"; position: absolute; left: 0;
          color: rgba(255,255,255,.6); font-size: .85rem; font-weight: 700;
        }

        @media (max-width: 600px) {
          .nf-header { padding: 0 18px; }
          .nf-field-row { flex-direction: column; }
          .nf-field { min-width: 100%; }
          .nf-input, .nf-textarea, .nf-select { font-size: 16px; }
        }
      `}</style>

      <div className="nf-header">
        <div className="nf-nav-brand" style={{ cursor: "pointer" }} onClick={onBack}>nfluence</div>
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
                  ? campaign.spotsTotal === 0
                  : isCustom
                  ? campaign.spotsTotal !== null && campaign.spotsTotal !== 0 && ![5,10,15,20,25,50].includes(campaign.spotsTotal)
                  : campaign.spotsTotal === opt;
                return (
                  <button key={opt} onClick={() => {
                    if (isDisabled) return;
                    if (isAny) setCampaign(p => ({...p, spotsTotal: 0, spotsTotalCustom: ""}));
                    else if (isCustom) setCampaign(p => ({...p, spotsTotal: p.spotsTotalCustom ? parseInt(p.spotsTotalCustom) || null : null}));
                    else setCampaign(p => ({...p, spotsTotal: opt, spotsTotalCustom: ""}));
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
                <span style={{ fontSize: ".8rem", color: "rgba(255,165,50,.8)", lineHeight: 1.5 }}>paid campaigns require a creator cap — escrow is calculated from this number</span>
              </div>
            )}
            {/* Custom number input — shown when custom is active */}
            {campaign.spotsTotal !== null && campaign.spotsTotal !== 0 && ![5,10,15,20,25,50].includes(campaign.spotsTotal) && (
              <div className="nf-field-full" style={{ marginBottom: 4 }}>
                <input className="nf-input" type="number" min="1" value={campaign.spotsTotalCustom}
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
                  <div style={{ fontSize: ".78rem", color: "rgba(255,165,50,.7)", lineHeight: 1.5 }}>paid campaigns need a cap — go back to step 2 and set a number so escrow can be calculated</div>
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
            <div className="nf-section-title">create your account</div>

            <div style={{ marginBottom: 24 }}>
              <style>{`
                @keyframes nf-ann-shimmer { 0%,100% { border-color: rgba(180,255,80,.25); box-shadow: 0 0 8px rgba(180,255,80,.08); } 50% { border-color: rgba(180,255,80,.85); box-shadow: 0 0 18px rgba(180,255,80,.3); } }
                @keyframes nf-val-shimmer { 0%,100% { border-color: rgba(255,140,30,.25); box-shadow: 0 0 6px rgba(255,140,30,.08); } 50% { border-color: rgba(255,140,30,.9); box-shadow: 0 0 14px rgba(255,140,30,.35); } }
                .nf-plan-ann-selected { animation: nf-ann-shimmer 2.5s ease-in-out infinite; }
                .nf-plan-val-badge { animation: nf-val-shimmer 2.5s ease-in-out infinite; }
                .nf-plan-best-badge { animation: nf-ann-shimmer 2.5s ease-in-out infinite; }
                .nf-plan-unsel:hover { border-color: rgba(255,255,255,.28) !important; background: rgba(255,255,255,.04) !important; transform: translateY(-2px); }
              `}</style>
              {/* Per-campaign */}
              <div className={account.plan !== "campaign" ? "nf-plan-unsel" : ""} onClick={() => setAccount(p => ({ ...p, plan: "campaign" }))} style={{ padding: "18px 20px", borderRadius: 16, border: `1.5px solid ${account.plan === "campaign" ? "rgba(255,255,255,.4)" : "rgba(255,255,255,.1)"}`, background: account.plan === "campaign" ? "rgba(255,255,255,.06)" : "rgba(255,255,255,.02)", cursor: "pointer", transition: "all .15s", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <div style={{ fontFamily: "'Monda', system-ui, sans-serif", fontWeight: 700, fontSize: "1rem" }}>per campaign</div>
                  <div style={{ fontFamily: "'Monda', system-ui, sans-serif", fontWeight: 700, fontSize: "1.4rem" }}>$299</div>
                </div>
                <div style={{ fontSize: ".78rem", opacity: .45, lineHeight: 1.5 }}>one-time fee per campaign. no commitment.</div>
              </div>
              {/* Annual */}
              <div className={account.plan === "annual" ? "nf-plan-ann-selected" : "nf-plan-unsel"} onClick={() => setAccount(p => ({ ...p, plan: "annual" }))} style={{ padding: "18px 20px", borderRadius: 16, border: `1.5px solid ${account.plan === "annual" ? "rgba(180,255,80,.5)" : "rgba(255,255,255,.1)"}`, background: account.plan === "annual" ? "rgba(180,255,80,.05)" : "rgba(255,255,255,.02)", cursor: "pointer", transition: "all .15s" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ fontFamily: "'Monda', system-ui, sans-serif", fontWeight: 700, fontSize: "1rem" }}>annual plan</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                    <div style={{ fontFamily: "'Monda', system-ui, sans-serif", fontWeight: 700, fontSize: "1.4rem", color: "rgba(180,255,80,.9)" }}>$1,999</div>
                    <div style={{ fontFamily: "'Monda', system-ui, sans-serif", fontWeight: 700, fontSize: ".8rem", color: "rgba(180,255,80,.7)", letterSpacing: 1 }}>/ yr</div>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 14 }}>
                  {["unlimited campaigns for 12 months", "up to 3 active simultaneously", "all platform features included"].map((item, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: ".78rem", opacity: .65 }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(180,255,80,.8)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      {item}
                    </div>
                  ))}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: ".78rem", opacity: .65, flexWrap: "wrap" }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(180,255,80,.8)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    <span>1 free 30-day featured campaign per month</span>
                    <span className="nf-plan-val-badge" style={{ padding: "1px 7px", borderRadius: 20, background: "rgba(255,140,30,.1)", border: "1px solid rgba(255,140,30,.3)", fontSize: ".68rem", fontWeight: 700, color: "rgba(255,140,30,.95)", marginLeft: 2 }}>$600 value!</span>
                  </div>
                </div>
                <div className="nf-plan-best-badge" style={{ display: "inline-block", padding: "3px 12px", borderRadius: 20, background: "rgba(180,255,80,.1)", border: "1px solid rgba(180,255,80,.3)", fontSize: ".72rem", fontWeight: 700, color: "rgba(180,255,80,.9)" }}>best value</div>
              </div>
            </div>

            <div className="nf-line" />
            <div className="nf-section-title">account details</div>

            <div className="nf-field-full">
              <input className="nf-input" type="email" value={account.email}
                onChange={e => setAccount(p => ({...p, email: e.target.value}))}
                placeholder="email *"
                style={account.email && !isValidEmail(account.email) ? { borderColor: "rgba(255,100,100,.3)" } : {}} />
            </div>
            <div className="nf-field-full">
              <input className="nf-input" type="password" value={account.password}
                onChange={e => setAccount(p => ({...p, password: e.target.value}))}
                placeholder="password * (min 8 characters)" />
              {account.password && account.password.length < 8 && (
                <div style={{ fontSize: ".7rem", color: "rgba(255,100,100,.6)", marginTop: 4 }}>password must be at least 8 characters</div>
              )}
            </div>
            <div className="nf-field-full">
              <input className="nf-input" type="password" value={account.confirmPassword}
                onChange={e => setAccount(p => ({...p, confirmPassword: e.target.value}))}
                placeholder="confirm password *" />
              {account.confirmPassword && account.password !== account.confirmPassword && (
                <div style={{ fontSize: ".7rem", color: "rgba(255,100,100,.6)", marginTop: 4 }}>passwords do not match</div>
              )}
            </div>

            <div style={{ marginTop: 16 }}>
              <div className="nf-toggle" onClick={() => setAccount(p => ({...p, agreeTerms: !p.agreeTerms}))}>
                <div className={`nf-toggle-track ${account.agreeTerms ? "on" : ""}`}>
                  <div className="nf-toggle-knob" />
                </div>
                <span>i agree to the <span style={{ textDecoration: "underline", opacity: .8 }}>terms of service</span> and <span style={{ textDecoration: "underline", opacity: .8 }}>privacy policy</span></span>
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 5 && (
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
        {step < 5 ? (
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
            const isPaid = terms.compType === "paid" || terms.compType === "product+paid";
            const perCreator = parseFloat((terms.compAmount || "").replace(/[^0-9.]/g, "")) || 0;
            const capCount = campaign.spotsTotal || 0;
            const escrow = isPaid && capCount > 0 ? perCreator * capCount : 0;
            const PRICES = { 1: 2.99, 7: 14.99, 30: 49.99 };
            const featuredPrice = PRICES[terms.featuredWeeks || 7] || 2.99;
            const needsPayment = terms.featured || escrow > 0;
            if (needsPayment) { setPendingCampaignData({ ...campaignData, _escrow: escrow, _featuredPrice: terms.featured ? featuredPrice : 0 }); setShowPayModal(true); }
            else if (onPublish) onPublish(campaignData, account);
            else alert("campaign published! (demo)");
          }}>publish</button>
        )}
      </div>
      {showPayModal && pendingCampaignData && (() => {
        const escrow = pendingCampaignData._escrow || 0;
        const featuredPrice = pendingCampaignData._featuredPrice || 0;
        const subtotal = escrow + featuredPrice;
        const totalDue = subtotal * (1 - promoDiscount);
        return (
          <div onClick={() => { if (!payLoading) setShowPayModal(false); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.8)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "12px" }}>
            <div onClick={e => e.stopPropagation()} style={{ background: "#0a1322", border: "1px solid rgba(160,80,255,.25)", borderRadius: 24, padding: 24, maxWidth: 440, width: "100%", boxShadow: "0 40px 80px rgba(0,0,0,.6)" }}>
              <div style={{ fontSize: "1.2rem", fontWeight: 700, fontFamily: "'Monda', system-ui, sans-serif", marginBottom: 6 }}>review charges</div>
              <div style={{ fontSize: ".88rem", opacity: .4, marginBottom: 24, lineHeight: 1.6 }}>the following will be charged when you confirm</div>
              <div style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 14, overflow: "hidden", marginBottom: 20 }}>
                {escrow > 0 && (
                  <div style={{ padding: "14px 20px", borderBottom: featuredPrice > 0 ? "1px solid rgba(255,255,255,.06)" : "none" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                      <div>
                        <div style={{ fontSize: ".9rem", fontWeight: 600 }}>escrow deposit</div>
                        <div style={{ fontSize: ".75rem", opacity: .4, marginTop: 2 }}>{pendingCampaignData.spotsTotal} creators × ${parseFloat((pendingCampaignData.comp || "").replace(/[^0-9.]/g, "")).toLocaleString()}</div>
                      </div>
                      <div style={{ fontSize: "1.3rem", fontWeight: 700, fontFamily: "'Monda', system-ui, sans-serif", color: "rgba(180,255,80,.9)" }}>${escrow.toLocaleString()}</div>
                    </div>
                    <div style={{ fontSize: ".72rem", opacity: .3, marginTop: 6 }}>held securely · released to creators on completion</div>
                  </div>
                )}
                {featuredPrice > 0 && (
                  <div style={{ padding: "14px 20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                      <div>
                        <div style={{ fontSize: ".9rem", fontWeight: 600 }}>featured placement</div>
                        <div style={{ fontSize: ".75rem", opacity: .4, marginTop: 2 }}>{pendingCampaignData.featuredWeeks || 7} {(pendingCampaignData.featuredWeeks || 7) === 1 ? "day" : "days"} · gold shimmer + priority</div>
                      </div>
                      <div style={{ fontSize: "1.3rem", fontWeight: 700, fontFamily: "'Monda', system-ui, sans-serif", color: "rgba(185,110,255,.9)" }}>${featuredPrice.toFixed(2)}</div>
                    </div>
                    <div style={{ fontSize: ".72rem", opacity: .3, marginTop: 6 }}>charged immediately · non-refundable</div>
                  </div>
                )}
                <div style={{ padding: "14px 20px", background: "rgba(255,255,255,.03)", borderTop: "1px solid rgba(255,255,255,.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: ".85rem", opacity: .5 }}>total due now</span>
                  <div style={{ textAlign: "right" }}>
                    {promoDiscount > 0 && <div style={{ fontSize: ".75rem", opacity: .4, textDecoration: "line-through", marginBottom: 2 }}>${subtotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>}
                    <span style={{ fontSize: "1.6rem", fontWeight: 700, fontFamily: "'Monda', system-ui, sans-serif", color: "#fff" }}>${totalDue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <input value={promoCode} onChange={e => { setPromoCode(e.target.value); setPromoApplied(false); setPromoError(""); }} placeholder="promo code"
                    style={{ flex: 1, background: "rgba(255,255,255,.05)", border: `1px solid ${promoApplied ? "rgba(100,255,150,.4)" : promoError ? "rgba(255,100,100,.4)" : "rgba(255,255,255,.12)"}`, borderRadius: 10, padding: "10px 14px", color: "#fff", fontSize: ".88rem", outline: "none", fontFamily: "system-ui, sans-serif" }} />
                  <button onClick={applyPromo} style={{ padding: "10px 16px", borderRadius: 10, border: "1px solid rgba(255,255,255,.2)", background: "rgba(255,255,255,.06)", color: "#fff", fontSize: ".82rem", cursor: "pointer", fontFamily: "system-ui, sans-serif", whiteSpace: "nowrap" }}>apply</button>
                </div>
                {promoApplied && <div style={{ fontSize: ".75rem", color: "rgba(100,255,150,.9)", marginTop: 6 }}>✓ {promoCode.toUpperCase()} applied — {Math.round(promoDiscount * 100)}% off</div>}
                {promoError && <div style={{ fontSize: ".75rem", color: "rgba(255,100,100,.8)", marginTop: 6 }}>{promoError}</div>}
              </div>
              <div ref={cardDivRef} style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 12, padding: "13px 14px", marginBottom: 12 }} />
              {payError && <div style={{ fontSize: ".8rem", color: "rgba(255,100,100,.9)", marginBottom: 10 }}>{payError}</div>}
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => { setShowPayModal(false); setPayError(""); }} disabled={payLoading} style={{ flex: 1, padding: "13px", borderRadius: 12, border: "1px solid rgba(255,255,255,.12)", background: "transparent", color: "rgba(255,255,255,.5)", cursor: payLoading ? "not-allowed" : "pointer", fontSize: ".9rem", fontFamily: "system-ui, sans-serif" }}>cancel</button>
                <button disabled={payLoading} onClick={async () => {
                  if (!cardRef.current) return;
                  setPayLoading(true);
                  setPayError("");
                  try {
                    await callStripePayment(Math.round(totalDue * 100), session?.access_token, cardRef.current);
                    setShowPayModal(false);
                    if (onPublish) onPublish(pendingCampaignData, account);
                  } catch (err) {
                    setPayError(err.message || "Payment failed");
                  } finally {
                    setPayLoading(false);
                  }
                }} style={{ flex: 2, padding: "13px", borderRadius: 12, border: "1px solid rgba(185,110,255,.4)", background: payLoading ? "rgba(160,80,255,.08)" : "rgba(160,80,255,.15)", color: "rgba(210,160,255,.95)", cursor: payLoading ? "not-allowed" : "pointer", fontSize: ".95rem", fontWeight: 700, fontFamily: "'Monda', system-ui, sans-serif", textTransform: "lowercase", opacity: payLoading ? .6 : 1, transition: "opacity .15s" }}>
                  {payLoading ? "processing..." : `pay $${totalDue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} & publish`}
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
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoError, setPromoError] = useState("");

  const promoDiscount = promoApplied && VALID_PROMOS[promoCode.toUpperCase()] ? VALID_PROMOS[promoCode.toUpperCase()] : 0;
  const applyPromo = () => {
    const code = promoCode.trim().toUpperCase();
    if (VALID_PROMOS[code]) { setPromoApplied(true); setPromoError(""); }
    else { setPromoError("invalid promo code"); setPromoApplied(false); }
  };

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
  const [account, setAccount] = useState({ email: "", password: "", confirmPassword: "", agreeTerms: false, plan: "gig" });
  const [lightboxItem, setLightboxItem] = useState(null);

  const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const canProceed = useMemo(() => {
    if (step === 0) return brand.name.trim() && isValidEmail(brand.email);
    if (step === 1) return details.title.trim() && details.description.trim() && details.industry && details.location.trim() && details.shootDate && details.contentTypes.length > 0 && details.equipment && details.deliverables.trim();
    if (step === 2) return true; // inspo board optional
    if (step === 3) return pay.payRate && !isNaN(parseFloat(pay.payRate)) && parseFloat(pay.payRate) > 0;
    if (step === 4) return isValidEmail(account.email) && account.password.length >= 8 && account.password === account.confirmPassword && account.agreeTerms;
    return true;
  }, [step, brand, details, pay, account]);

  const next = () => { if (step < 4) setStep(step + 1); };
  const back = () => { if (step > 0) setStep(step - 1); };

  const containerRef = useRef(null);
  useEffect(() => {
    containerRef.current?.scrollTo?.({ top: 0, behavior: "smooth" });
    window.scrollTo?.({ top: 0, behavior: "smooth" });
    if (step === 4 && !account.email && brand.email) setAccount(p => ({ ...p, email: brand.email }));
  }, [step]);

  useEffect(() => {
    if (!showPayModal) {
      cardRef.current?.destroy();
      cardRef.current = null;
      setPayError("");
      return;
    }
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
  }, [showPayModal]);

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

  const buildAndPublish = () => {
    const gigData = {
      brand: brand.name, logoPreview: brand.logoPreview,
      title: details.title, description: details.description,
      industry: details.industry, location: details.location,
      shootDate: details.shootDate, contentTypes: details.contentTypes,
      equipment: details.equipment, deliverables: details.deliverables,
      requirements: details.requirements, spotsTotal: details.spotsTotal,
      payType: pay.payType, payRate: parseFloat(pay.payRate),
      inspoBoard, skills: [],
    };
    onPublish(gigData, account);
  };

  const gigPrice = 49.99;
  const discountedPrice = (gigPrice * (1 - promoDiscount)).toFixed(2);

  return (
    <div ref={containerRef} style={{ minHeight: "100vh", overflowX: "hidden", background: "radial-gradient(circle at calc(46% + 250px) calc(58% - 175px), rgba(255,255,255,.103) 0%, rgba(255,255,255,.0309) 38%, transparent 52%), linear-gradient(180deg, #040b15 0%, #070f1f 100%)", backgroundColor: "#040b15", color: "#fff", fontFamily: "system-ui, sans-serif" }}>

      {/* Pay Modal */}
      {showPayModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", backdropFilter: "blur(8px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#0a1020", border: "1px solid rgba(255,255,255,.15)", borderRadius: 20, padding: "28px 24px", width: "100%", maxWidth: 400, textAlign: "center" }}>
            <div style={{ fontFamily: "'Monda', system-ui, sans-serif", fontSize: "1.4rem", fontWeight: 700, marginBottom: 6 }}>publish your gig</div>
            <div style={{ fontSize: ".85rem", opacity: .45, marginBottom: 24 }}>your listing goes live immediately</div>
            <div style={{ fontSize: "3rem", fontWeight: 700, fontFamily: "'Monda', system-ui, sans-serif", color: "#fff", marginBottom: 4 }}>${discountedPrice}</div>
            <div style={{ fontSize: ".85rem", opacity: .45, marginBottom: 20 }}>one-time · per listing</div>
            <div style={{ marginBottom: 20, display: "flex", gap: 8 }}>
              <input className="nf-input" value={promoCode} onChange={e => setPromoCode(e.target.value)} placeholder="promo code" style={{ flex: 1 }} />
              <button className="nf-btn" onClick={applyPromo} style={{ minWidth: 0, padding: "8px 14px", fontSize: ".8rem" }}>apply</button>
            </div>
            {promoApplied && <div style={{ fontSize: ".8rem", color: "rgba(100,255,150,.8)", marginBottom: 12 }}>{Math.round(promoDiscount * 100)}% off applied</div>}
            {promoError && <div style={{ fontSize: ".8rem", color: "rgba(255,100,100,.7)", marginBottom: 12 }}>{promoError}</div>}
            <div ref={cardDivRef} style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 12, padding: "13px 14px", marginBottom: 12, textAlign: "left" }} />
            {payError && <div style={{ fontSize: ".8rem", color: "rgba(255,100,100,.9)", marginBottom: 10, textAlign: "left" }}>{payError}</div>}
            <button className="nf-btn" disabled={payLoading} style={{ width: "100%", marginBottom: 10, background: payLoading ? "rgba(255,255,255,.04)" : "rgba(255,255,255,.08)", opacity: payLoading ? .6 : 1 }} onClick={async () => {
              if (!cardRef.current) return;
              setPayLoading(true);
              setPayError("");
              try {
                await callStripePayment(Math.round(parseFloat(discountedPrice) * 100), session?.access_token, cardRef.current);
                setShowPayModal(false);
                buildAndPublish();
              } catch (err) {
                setPayError(err.message || "Payment failed");
              } finally {
                setPayLoading(false);
              }
            }}>{payLoading ? "processing..." : `pay $${discountedPrice} & publish`}</button>
            <button className="nf-btn-back" disabled={payLoading} style={{ width: "100%" }} onClick={() => { if (!payLoading) setShowPayModal(false); }}>cancel</button>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxItem && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.92)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setLightboxItem(null)}>
          {lightboxItem.type === "video" ? (
            <video src={lightboxItem.src} controls autoPlay style={{ maxWidth: "90vw", maxHeight: "90vh", borderRadius: 12 }} onClick={e => e.stopPropagation()} />
          ) : (
            <img src={lightboxItem.src} alt="" style={{ maxWidth: "90vw", maxHeight: "90vh", borderRadius: 12, objectFit: "contain" }} />
          )}
          <div style={{ position: "absolute", top: 20, right: 20, cursor: "pointer", opacity: .7, fontSize: "1.5rem" }}>✕</div>
        </div>
      )}

      <style>{`
        @font-face { font-family: 'Monda'; src: url('/assets/Monda-Regular.woff') format('woff'); font-weight: 400 700; font-style: normal; font-display: swap; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .nf-header { width: 100%; height: 64px; display: flex; align-items: center; justify-content: space-between; padding: 0 32px; font-family: 'Monda', system-ui, sans-serif; }
        .nf-nav-brand { font-weight: 600; font-size: 1.1rem; color: #fff; cursor: pointer; }
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
        <div className="nf-nav-brand" onClick={onBack}>nfluence</div>
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
                      <div className="nf-mosaic-remove" onClick={e => { e.stopPropagation(); handleRemoveMedia(item.id); }}>✕</div>
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

            <div className="nf-line" />
            <div className="nf-section-title">account details</div>
            <div className="nf-field-full">
              <input className="nf-input" type="email" value={account.email} onChange={e => setAccount(p => ({ ...p, email: e.target.value }))} placeholder="email *"
                style={account.email && !isValidEmail(account.email) ? { borderColor: "rgba(255,100,100,.3)" } : {}} />
            </div>
            <div className="nf-field-full">
              <input className="nf-input" type="password" value={account.password} onChange={e => setAccount(p => ({ ...p, password: e.target.value }))} placeholder="password * (min 8 characters)" />
              {account.password && account.password.length < 8 && <div style={{ fontSize: ".7rem", color: "rgba(255,100,100,.6)", marginTop: 4 }}>password must be at least 8 characters</div>}
            </div>
            <div className="nf-field-full">
              <input className="nf-input" type="password" value={account.confirmPassword} onChange={e => setAccount(p => ({ ...p, confirmPassword: e.target.value }))} placeholder="confirm password *" />
              {account.confirmPassword && account.password !== account.confirmPassword && <div style={{ fontSize: ".7rem", color: "rgba(255,100,100,.6)", marginTop: 4 }}>passwords do not match</div>}
            </div>
            <div style={{ marginTop: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", userSelect: "none", padding: "5px 0", fontSize: ".85rem", color: "#fff" }}
                onClick={() => setAccount(p => ({ ...p, agreeTerms: !p.agreeTerms }))}>
                <div style={{ width: 36, height: 20, borderRadius: 10, border: `1px solid ${account.agreeTerms ? "rgba(255,255,255,.55)" : "rgba(255,255,255,.18)"}`, background: account.agreeTerms ? "rgba(255,255,255,.10)" : "rgba(0,0,0,.35)", position: "relative", transition: "all .2s", flexShrink: 0 }}>
                  <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, left: 2, transition: "transform .2s", transform: account.agreeTerms ? "translateX(16px)" : "none" }} />
                </div>
                <span>i agree to the <span style={{ textDecoration: "underline", opacity: .8 }}>terms of service</span> and <span style={{ textDecoration: "underline", opacity: .8 }}>privacy policy</span></span>
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



// ── BrowseGigListings ──

function BrowseGigListings({ demoGigs = [], myGigs = [], onBack, onSelectGig, appliedGigs = [] }) {
  const [filterIndustry, setFilterIndustry] = useState("");
  const [filterSkill, setFilterSkill] = useState("");

  const allGigs = [...demoGigs, ...myGigs];
  const filtered = allGigs.filter(g => {
    if (filterIndustry && g.industry !== filterIndustry) return false;
    if (filterSkill && !g.skills?.includes(filterSkill)) return false;
    return true;
  });

  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(circle at calc(46% + 250px) calc(58% - 175px), rgba(255,255,255,.103) 0%, rgba(255,255,255,.0309) 38%, transparent 52%), linear-gradient(180deg, #040b15 0%, #070f1f 100%)", backgroundColor: "#040b15", color: "#fff", fontFamily: "system-ui, sans-serif" }}>
      <style>{`
        @font-face { font-family: 'Monda'; src: url('/assets/Monda-Regular.woff') format('woff'); font-weight: 400 700; font-style: normal; font-display: swap; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .nf-gig-card { background: radial-gradient(circle at top, rgba(255,255,255,.045), rgba(4,11,21,0)); border: 1px solid rgba(255,255,255,.12); border-radius: 20px; overflow: hidden; cursor: pointer; display: flex; flex-direction: column; transition: transform .25s, box-shadow .25s, border-color .25s; }
        .nf-gig-card:hover { transform: translateY(-4px) scale(1.01); box-shadow: 0 28px 65px rgba(0,0,0,.5); border-color: rgba(255,255,255,.25); }
        .nf-select { border-radius: 12px; border: 1px solid rgba(255,255,255,.18); background: rgba(0,0,0,.35); color: #fff; padding: 8px 10px; font-size: .85rem; outline: none; appearance: none; font-family: system-ui, sans-serif; cursor: pointer; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' fill='rgba(255,255,255,0.4)' viewBox='0 0 16 16'%3E%3Cpath d='M1.5 5.5l6.5 6 6.5-6'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 10px center; }
        .nf-select option { background: #0a1020; color: #fff; }
      `}</style>

      {/* Header */}
      <div style={{ width: "100%", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 clamp(16px, 4vw, 32px)", fontFamily: "'Monda', system-ui, sans-serif" }}>
        <div style={{ fontWeight: 600, fontSize: "1.1rem", color: "#fff", cursor: "pointer" }} onClick={onBack}>nfluence</div>
        <span style={{ fontSize: ".9rem", opacity: .75, cursor: "pointer" }} onClick={onBack}>back</span>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 16px 80px" }}>
        <h2 style={{ fontFamily: "'Monda', system-ui, sans-serif", fontSize: "1.4rem", textAlign: "center", marginBottom: 8, fontWeight: 600 }}>gig listings</h2>
        <p style={{ textAlign: "center", opacity: .4, fontSize: ".85rem", marginBottom: 28 }}>brands looking for photographers & videographers</p>

        {/* Filters */}
        <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
          <select className="nf-select" value={filterIndustry} onChange={e => setFilterIndustry(e.target.value)} style={{ flex: 1, minWidth: 160 }}>
            <option value="">all industries</option>
            {INDUSTRIES.map(ind => <option key={ind} value={ind}>{ind}</option>)}
          </select>
          <select className="nf-select" value={filterSkill} onChange={e => setFilterSkill(e.target.value)} style={{ flex: 1, minWidth: 160 }}>
            <option value="">all skills</option>
            {GIG_SKILLS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign: "center", opacity: .3, fontSize: ".9rem", marginTop: 60 }}>no gig listings yet</div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {filtered.map((gig, i) => {
            const isApplied = appliedGigs.includes(gig.id);
            const spotsLeft = Math.max(0, (gig.spotsTotal || 1) - (gig.spotsFilled || 0));
            return (
              <div key={gig.id || i} className="nf-gig-card" onClick={() => onSelectGig(gig)}>
                <div style={{ height: 90, background: "rgba(255,255,255,.04)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                  {gig.logoUrl ? <img src={gig.logoUrl} alt={gig.brand} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ fontSize: ".7rem", opacity: .25 }}>no image</div>}
                  <div style={{ position: "absolute", top: 10, right: 10, background: "rgba(0,0,0,.55)", borderRadius: 8, padding: "3px 10px", fontSize: ".72rem", color: "#fff" }}>{spotsLeft} spot{spotsLeft !== 1 ? "s" : ""} left</div>
                </div>
                <div style={{ padding: "14px 16px 16px", flex: 1, display: "flex", flexDirection: "column" }}>
                  <div style={{ fontSize: "1rem", fontWeight: 700, color: "#fff", marginBottom: 3, lineHeight: 1.3 }}>{gig.title}</div>
                  <div style={{ fontSize: ".82rem", opacity: .45, marginBottom: 10 }}>{gig.brand}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 12 }}>
                    {(gig.contentTypes || []).slice(0, 2).map(ct => (
                      <div key={ct} style={{ padding: "2px 9px", borderRadius: 20, border: "1px solid rgba(255,255,255,.15)", fontSize: ".7rem", opacity: .65 }}>{ct}</div>
                    ))}
                  </div>
                  <div style={{ flex: 1 }}>
                    {[["location", gig.location], ["shoot date", gig.shootDate], ["equipment", gig.equipment]].map(([label, val]) => (
                      <div key={label} style={{ display: "flex", gap: 8, padding: "2px 0", fontSize: ".85rem" }}>
                        <div style={{ opacity: .35, minWidth: 90 }}>{label}:</div>
                        <div style={{ opacity: .75 }}>{val || "—"}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 14, marginTop: 14, borderTop: "1px solid rgba(255,255,255,.08)" }}>
                    <div>
                      <div style={{ fontSize: ".75rem", opacity: .4, marginBottom: 2 }}>pay</div>
                      <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#fff" }}>${gig.payRate}{gig.payType === "hourly" ? <span style={{ fontSize: ".75rem", opacity: .5 }}>/hr</span> : ""}</div>
                    </div>
                    {isApplied ? (
                      <div style={{ padding: "8px 16px", borderRadius: 12, border: "1px solid rgba(100,255,150,.2)", fontSize: ".85rem", fontWeight: 600, color: "rgba(100,255,150,.8)", display: "flex", alignItems: "center", gap: 6 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(100,255,150,.85)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        applied
                      </div>
                    ) : (
                      <div style={{ padding: "8px 18px", borderRadius: 12, border: "1px solid rgba(255,255,255,.3)", fontSize: ".85rem", fontWeight: 600, color: "#fff", cursor: "pointer" }}>apply</div>
                    )}
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



// ── GigDetail ──

function GigDetail({ gig, onBack, isOwner, user, appliedGigs = [], onApply, onSignInRedirect }) {
  const [hasApplied, setHasApplied] = useState(appliedGigs.includes(gig.id));
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyStep, setApplyStep] = useState(0);
  const [lightboxItem, setLightboxItem] = useState(null);
  const [applyForm, setApplyForm] = useState({ name: user?.name || "", email: user?.email || "", pitch: "", portfolio: "" });

  const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  const spotsLeft = Math.max(0, (gig.spotsTotal || 1) - (gig.spotsFilled || 0));

  const submitApplication = () => {
    const applicationData = { name: applyForm.name, email: applyForm.email, pitch: applyForm.pitch, portfolio: applyForm.portfolio };
    setHasApplied(true);
    setApplyStep(1);
    onApply?.(gig, applicationData);
  };

  // Mosaic layout helper
  const getMosaicStyle = (index) => {
    const patterns = [
      { gridColumn: "span 1", gridRow: "span 2" },
      { gridColumn: "span 1", gridRow: "span 1" },
      { gridColumn: "span 1", gridRow: "span 1" },
      { gridColumn: "span 2", gridRow: "span 1" },
      { gridColumn: "span 1", gridRow: "span 1" },
      { gridColumn: "span 1", gridRow: "span 1" },
    ];
    return patterns[index % patterns.length];
  };

  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(circle at calc(46% + 250px) calc(58% - 175px), rgba(255,255,255,.103) 0%, rgba(255,255,255,.0309) 38%, transparent 52%), linear-gradient(180deg, #040b15 0%, #070f1f 100%)", backgroundColor: "#040b15", color: "#fff", fontFamily: "system-ui, sans-serif" }}>
      <style>{`
        @font-face { font-family: 'Monda'; src: url('/assets/Monda-Regular.woff') format('woff'); font-weight: 400 700; font-style: normal; font-display: swap; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .nf-mosaic { display: grid; grid-template-columns: 1fr 1fr; grid-auto-rows: 160px; gap: 4px; border-radius: 16px; overflow: hidden; }
        .nf-mosaic-item { position: relative; overflow: hidden; cursor: pointer; background: rgba(255,255,255,.04); }
        .nf-mosaic-item img, .nf-mosaic-item video { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform .2s; }
        .nf-mosaic-item:hover img, .nf-mosaic-item:hover video { transform: scale(1.03); }
        .nf-mosaic-play { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
        .nf-mosaic-play-btn { width: 44px; height: 44px; border-radius: 50%; background: rgba(0,0,0,.55); border: 2px solid rgba(255,255,255,.6); display: flex; align-items: center; justify-content: center; transition: transform .15s; }
        .nf-mosaic-item:hover .nf-mosaic-play-btn { transform: scale(1.08); }
        .nf-input { border-radius: 12px; border: 1px solid rgba(255,255,255,.18); background: rgba(0,0,0,.35); color: #fff; padding: 8px 10px; font-size: .85rem; width: 100%; outline: none; font-family: system-ui, sans-serif; transition: border-color .12s; }
        .nf-input::placeholder { color: rgba(255,255,255,.45); }
        .nf-input:focus { border-color: #fff; box-shadow: 0 0 0 1px rgba(255,255,255,.2); background: rgba(0,0,0,.5); }
        .nf-textarea { border-radius: 12px; border: 1px solid rgba(255,255,255,.18); background: rgba(0,0,0,.35); color: #fff; padding: 8px 10px; font-size: .85rem; width: 100%; outline: none; resize: vertical; min-height: 80px; font-family: system-ui, sans-serif; }
        .nf-textarea::placeholder { color: rgba(255,255,255,.45); }
        .nf-textarea:focus { border-color: #fff; background: rgba(0,0,0,.5); }
      `}</style>

      {/* Lightbox */}
      {lightboxItem && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.95)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setLightboxItem(null)}>
          {lightboxItem.type === "video" ? (
            <video src={lightboxItem.src} controls autoPlay style={{ maxWidth: "92vw", maxHeight: "92vh", borderRadius: 12 }} onClick={e => e.stopPropagation()} />
          ) : (
            <img src={lightboxItem.src} alt="" style={{ maxWidth: "92vw", maxHeight: "92vh", borderRadius: 12, objectFit: "contain" }} />
          )}
          <div style={{ position: "absolute", top: 20, right: 24, cursor: "pointer", fontSize: "1.4rem", opacity: .7 }} onClick={() => setLightboxItem(null)}>✕</div>
        </div>
      )}

      {/* Apply Modal */}
      {showApplyModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", backdropFilter: "blur(8px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#0a1020", border: "1px solid rgba(255,255,255,.15)", borderRadius: 20, padding: "28px 24px", width: "100%", maxWidth: 400 }}>
            {applyStep === 0 ? (
              <>
                <div style={{ fontFamily: "'Monda', system-ui, sans-serif", fontSize: "1.2rem", fontWeight: 700, marginBottom: 20, textAlign: "center" }}>apply for this gig</div>
                <div style={{ marginBottom: 12 }}>
                  <input className="nf-input" value={applyForm.name} onChange={e => setApplyForm(p => ({ ...p, name: e.target.value }))} placeholder="your name *" style={{ marginBottom: 10 }} />
                  <input className="nf-input" type="email" value={applyForm.email} onChange={e => setApplyForm(p => ({ ...p, email: e.target.value }))} placeholder="your email *" style={{ marginBottom: 10 }} />
                  <textarea className="nf-textarea" value={applyForm.portfolio} onChange={e => setApplyForm(p => ({ ...p, portfolio: e.target.value }))} placeholder="portfolio link or Instagram *" style={{ marginBottom: 10 }} />
                  <textarea className="nf-textarea" value={applyForm.pitch} onChange={e => setApplyForm(p => ({ ...p, pitch: e.target.value }))} placeholder="why are you a great fit for this gig?" />
                </div>
                <button onClick={submitApplication} disabled={!applyForm.name.trim() || !isValidEmail(applyForm.email) || !applyForm.portfolio.trim()}
                  style={{ width: "100%", padding: "12px", borderRadius: 14, border: "1px solid rgba(255,255,255,.3)", background: "rgba(255,255,255,.08)", color: "#fff", cursor: "pointer", fontSize: ".95rem", fontFamily: "system-ui, sans-serif", marginBottom: 10, opacity: (!applyForm.name.trim() || !isValidEmail(applyForm.email) || !applyForm.portfolio.trim()) ? 0.3 : 1 }}>
                  submit application
                </button>
                <button onClick={() => setShowApplyModal(false)} style={{ width: "100%", padding: "10px", borderRadius: 14, border: "1px solid rgba(255,255,255,.1)", background: "transparent", color: "rgba(255,255,255,.5)", cursor: "pointer", fontSize: ".9rem", fontFamily: "system-ui, sans-serif" }}>cancel</button>
              </>
            ) : (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "2rem", marginBottom: 12 }}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(100,255,150,.85)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <div style={{ fontFamily: "'Monda', system-ui, sans-serif", fontSize: "1.2rem", fontWeight: 700, marginBottom: 8 }}>application sent</div>
                <div style={{ fontSize: ".85rem", opacity: .5, marginBottom: 20 }}>{gig.brand} will be in touch if you're a fit</div>
                <button onClick={() => setShowApplyModal(false)} style={{ padding: "10px 24px", borderRadius: 14, border: "1px solid rgba(255,255,255,.2)", background: "transparent", color: "#fff", cursor: "pointer", fontFamily: "system-ui, sans-serif" }}>close</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ width: "100%", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 clamp(16px, 4vw, 32px)", fontFamily: "'Monda', system-ui, sans-serif" }}>
        <div style={{ fontWeight: 600, fontSize: "1.1rem", color: "#fff", cursor: "pointer" }} onClick={onBack}>nfluence</div>
        <span style={{ fontSize: ".9rem", opacity: .75, cursor: "pointer" }} onClick={onBack}>back</span>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 16px 80px" }}>

        {/* Hero */}
        <div style={{ background: "radial-gradient(circle at top, rgba(255,255,255,.045), rgba(4,11,21,0))", border: "1px solid rgba(255,255,255,.12)", borderRadius: 20, overflow: "hidden", marginBottom: 20 }}>
          <div style={{ height: 140, background: gig.imgUrl ? "transparent" : "rgba(255,255,255,.04)", position: "relative" }}>
            {gig.imgUrl ? <img src={gig.imgUrl} alt={gig.brand} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontSize: ".75rem", opacity: .25 }}>gig listing</div>}
          </div>
          <div style={{ padding: "18px 20px 20px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 14 }}>
              {gig.logoUrl ? (
                <img src={gig.logoUrl} alt={gig.brand} style={{ width: 52, height: 52, borderRadius: 14, objectFit: "cover", border: "1px solid rgba(255,255,255,.15)", flexShrink: 0 }} />
              ) : (
                <div style={{ width: 52, height: 52, borderRadius: 14, background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.12)", flexShrink: 0 }} />
              )}
              <div>
                <div style={{ fontFamily: "'Monda', system-ui, sans-serif", fontSize: "1.2rem", fontWeight: 700, color: "#fff", lineHeight: 1.3, marginBottom: 3 }}>{gig.title}</div>
                <div style={{ fontSize: ".85rem", opacity: .45 }}>{gig.brand}</div>
              </div>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
              {(gig.contentTypes || []).map(ct => (
                <div key={ct} style={{ padding: "3px 10px", borderRadius: 20, border: "1px solid rgba(255,255,255,.15)", fontSize: ".75rem", opacity: .7 }}>{ct}</div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 20px", marginBottom: 16 }}>
              {[["location", gig.location], ["shoot date", gig.shootDate], ["equipment", gig.equipment], ["spots left", `${spotsLeft} of ${gig.spotsTotal || 1}`], ["industry", gig.industry]].map(([label, val]) => (
                <div key={label} style={{ fontSize: ".85rem" }}>
                  <span style={{ opacity: .35 }}>{label}: </span>
                  <span style={{ opacity: .8 }}>{val || "—"}</span>
                </div>
              ))}
            </div>

            <div style={{ fontSize: ".85rem", opacity: .65, lineHeight: 1.65, marginBottom: 16 }}>{gig.description}</div>

            {gig.deliverables && (
              <div style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", marginBottom: 16 }}>
                <div style={{ fontSize: ".75rem", opacity: .4, marginBottom: 5, textTransform: "lowercase", letterSpacing: ".04em" }}>deliverables</div>
                <div style={{ fontSize: ".85rem", opacity: .75, lineHeight: 1.6 }}>{gig.deliverables}</div>
              </div>
            )}

            {gig.requirements && (
              <div style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", marginBottom: 16 }}>
                <div style={{ fontSize: ".75rem", opacity: .4, marginBottom: 5, textTransform: "lowercase", letterSpacing: ".04em" }}>requirements</div>
                <div style={{ fontSize: ".85rem", opacity: .75, lineHeight: 1.6 }}>{gig.requirements}</div>
              </div>
            )}

            {/* Pay + Apply */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 16, borderTop: "1px solid rgba(255,255,255,.08)" }}>
              <div>
                <div style={{ fontSize: ".75rem", opacity: .4, marginBottom: 3 }}>pay</div>
                <div style={{ fontSize: "2rem", fontWeight: 700, color: "#fff", fontFamily: "'Monda', system-ui, sans-serif" }}>
                  ${gig.payRate}{gig.payType === "hourly" ? <span style={{ fontSize: ".9rem", opacity: .5 }}>/hr</span> : ""}
                </div>
                <div style={{ fontSize: ".75rem", opacity: .4 }}>{gig.payType === "flat" ? "flat fee" : "hourly rate"}</div>
              </div>
              {isOwner ? (
                <div style={{ padding: "10px 20px", borderRadius: 12, border: "1px solid rgba(255,255,255,.2)", fontSize: ".9rem", opacity: .5 }}>your listing</div>
              ) : hasApplied ? (
                <div style={{ padding: "10px 20px", borderRadius: 12, border: "1px solid rgba(100,255,150,.2)", fontSize: ".9rem", color: "rgba(100,255,150,.8)", display: "flex", alignItems: "center", gap: 6 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(100,255,150,.85)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  applied
                </div>
              ) : (
                <button onClick={() => { if (!user) { onSignInRedirect?.(); return; } setApplyStep(0); setShowApplyModal(true); }} style={{ padding: "12px 28px", borderRadius: 14, border: "1px solid rgba(255,255,255,.35)", background: "rgba(255,255,255,.08)", color: "#fff", cursor: "pointer", fontSize: ".95rem", fontWeight: 600, fontFamily: "system-ui, sans-serif", transition: "all .15s" }}>
                  apply now
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Inspo Board */}
        {gig.inspoBoard && gig.inspoBoard.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: "'Monda', system-ui, sans-serif", fontSize: "1rem", fontWeight: 600, marginBottom: 12, opacity: .8 }}>inspo board</div>
            <div className="nf-mosaic">
              {gig.inspoBoard.map((item, idx) => {
                const mosaicStyle = getMosaicStyle(idx);
                return (
                  <div key={item.id || idx} className="nf-mosaic-item" style={mosaicStyle} onClick={() => setLightboxItem(item)}>
                    {item.type === "video" ? (
                      <>
                        <video src={item.src} muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        <div className="nf-mosaic-play">
                          <div className="nf-mosaic-play-btn">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><polygon points="5,3 19,12 5,21"/></svg>
                          </div>
                        </div>
                      </>
                    ) : (
                      <img src={item.src} alt="" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}



// ═══════════════════════════════════════════════
