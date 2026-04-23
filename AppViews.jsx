// ═══════════════════════════════════════════════

function SignIn({ onSignIn, onBack }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const isValid = email.includes("@") && password.length >= 8 && (!isSignUp || name.trim()) && (!isSignUp || agreeTerms);

  return (
    <div style={{ minHeight: "100vh", overflowX: "hidden", background: "radial-gradient(circle at calc(46% + 250px) calc(58% - 175px), rgba(255,255,255,.103) 0%, rgba(255,255,255,.0309) 38%, transparent 52%), linear-gradient(180deg, #040b15 0%, #070f1f 100%)", backgroundColor: "#040b15", color: "#fff", fontFamily: "system-ui, sans-serif", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{`
        .nf-signin-input {
          border-radius: 12px; border: 1px solid rgba(255,255,255,.18);
          background: rgba(0,0,0,.35); color: #fff; padding: 14px 16px;
          font-size: .95rem; width: 100%; outline: none;
          font-family: system-ui, sans-serif;
          transition: border-color .12s, box-shadow .12s, background .12s;
        }
        .nf-signin-input::placeholder { color: rgba(255,255,255,.4); }
        .nf-signin-input:focus { border-color: #fff; box-shadow: 0 0 0 1px rgba(255,255,255,.2); background: rgba(0,0,0,.5); }
        .nf-signin-btn {
          width: 100%; padding: 14px 24px; border-radius: 14px; border: 1px solid rgba(255,255,255,.28);
          background: rgba(255,255,255,.08); backdrop-filter: blur(20px); color: #fff;
          font-size: 1rem; font-family: 'Monda', system-ui, sans-serif; text-transform: lowercase;
          cursor: pointer; transition: all .12s; box-shadow: 0 10px 28px rgba(0,0,0,.25);
        }
        .nf-signin-btn:hover:not(:disabled) { transform: translateY(-2px); border-color: rgba(255,255,255,.45); background: rgba(255,255,255,.12); }
        .nf-signin-btn:disabled { opacity: .3; cursor: not-allowed; }
      `}</style>
      <div style={{ width: "100%", maxWidth: 400, padding: "0 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 12 }}>
          <div style={{ fontFamily: "'Monda', system-ui, sans-serif", fontSize: "clamp(1.6rem, 4vw, 2.2rem)", fontWeight: 700, marginBottom: 32, marginTop: "-40px" }}>nfluence</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 600, fontFamily: "'Monda', system-ui, sans-serif", marginBottom: 20 }}>{isSignUp ? "create account" : "sign in"}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {isSignUp && (
            <input className="nf-signin-input" value={name} onChange={e => setName(e.target.value)} placeholder="brand or company name" />
          )}
          <input className="nf-signin-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email" />
          <input className="nf-signin-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="password" />
          {isSignUp && (
            <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", padding: "12px 14px", borderRadius: 12, background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.08)" }}>
              <input type="checkbox" checked={agreeTerms} onChange={e => setAgreeTerms(e.target.checked)} style={{ marginTop: 3, accentColor: "#fff", flexShrink: 0 }} />
              <span style={{ fontSize: ".78rem", opacity: .5, lineHeight: 1.55 }}>
                I agree to Nfluence's{" "}
                <a href="https://nfluenceagency.com/terms" target="_blank" rel="noopener noreferrer" style={{ color: "rgba(255,255,255,.85)", textDecoration: "underline" }}>Terms of Service</a>
                {" "}and{" "}
                <a href="https://nfluenceagency.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: "rgba(255,255,255,.85)", textDecoration: "underline" }}>Privacy Policy</a>.
                I confirm I am at least 18 years old and authorized to act on behalf of the brand I represent.
              </span>
            </label>
          )}
          <div style={{ display: "flex", gap: 12 }}>
            <button className="nf-signin-btn" style={{ flex: 1 }} onClick={onBack}>back</button>
            <button className="nf-signin-btn" style={{ flex: 1 }} disabled={!isValid} onClick={() => onSignIn(email, isSignUp ? name : null, password)}>
              {isSignUp ? "create account" : "sign in"}
            </button>
          </div>
        </div>
        <div style={{ textAlign: "center", marginTop: 24, fontSize: ".85rem", opacity: .5 }}>
          {isSignUp ? "already have an account?" : "don't have an account?"}{" "}
          <span style={{ color: "#fff", opacity: 1, cursor: "pointer", textDecoration: "underline" }} onClick={() => setIsSignUp(!isSignUp)}>
            {isSignUp ? "sign in" : "sign up for free!"}
          </span>
        </div>
      </div>
    </div>
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

  const handlePostReply = (campaignKey, reviewIdx, campaign, text) => {
    if (!text.trim()) return;
    onUpdateReview(campaign, reviewIdx, text.trim());
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
      <style>{`
        .nf-review-card { background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.08); border-radius: 14px; padding: 18px 20px; }
        .nf-reply-btn { padding: 8px 18px; border-radius: 10px; border: 1px solid rgba(255,255,255,.18); background: rgba(255,255,255,.05); color: rgba(255,255,255,.7); font-size: .78rem; cursor: pointer; transition: all .12s; font-family: system-ui, sans-serif; }
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
      <div style={{ width: "100%", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", fontFamily: "'Monda', system-ui, sans-serif" }}>
        <div style={{ fontWeight: 600, letterSpacing: "-.01em", fontSize: "1.1rem", color: "#fff", cursor: "pointer" }} onClick={onBack}>nfluence</div>
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
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#0c1424", border: "1px solid rgba(255,255,255,.12)", flexShrink: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
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

function Dashboard({ user, campaigns, demoCampaigns, onBack, onSignOut, onNewCampaign, onNewGig, onSelectCampaign, onEditCampaign, onViewReviews, lastReviewsVisitedAt, onBrowse, notifications = [], onMarkAllNotifsRead, onViewAllNotifications }) {
  const [showTray, setShowTray] = useState(false);
  const [showAttentionModal, setShowAttentionModal] = useState(false);
  const [editWarnCampaign, setEditWarnCampaign] = useState(null); // campaign pending edit warning
  const STAGE_LABELS = { draft: "draft", open: "accepting creators", active: "content in production", fulfillment: "approvals & payouts", wrap_up: "completed" };
  const STAGE_COLORS = { draft: "rgba(255,255,255,.15)", open: "rgba(100,200,255,.25)", active: "rgba(255,200,100,.25)", fulfillment: "rgba(200,100,255,.25)", wrap_up: "rgba(100,255,150,.25)" };

  const allCampaigns = [...campaigns, ...demoCampaigns.map((d, i) => ({
    ...d, id: `demo-${i}`, createdAt: new Date(Date.now() - (i + 1) * 86400000 * 7).toISOString(),
  }))];

  return (
    <div style={{ minHeight: "100vh", overflowX: "hidden", background: "radial-gradient(circle at calc(46% + 250px) calc(58% - 175px), rgba(255,255,255,.103) 0%, rgba(255,255,255,.0309) 38%, transparent 52%), linear-gradient(180deg, #040b15 0%, #070f1f 100%)", backgroundColor: "#040b15", color: "#fff", fontFamily: "system-ui, sans-serif" }}>
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
          font-size: .9rem; font-family: 'Monda', system-ui, sans-serif; text-transform: lowercase;
          cursor: pointer; transition: all .12s; display: inline-flex; align-items: center; gap: 8;
        }
        .nf-new-campaign-btn:hover { transform: translateY(-2px); border-color: rgba(255,255,255,.45); background: rgba(255,255,255,.12); }
      `}</style>

      {/* Nav */}
      <div style={{ height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", borderBottom: "1px solid rgba(255,255,255,.07)", fontFamily: "'Monda', system-ui, sans-serif" }}>
        <div style={{ fontWeight: 600, fontSize: "1rem", cursor: "pointer" }} onClick={onBack}>nfluence</div>
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <span style={{ fontSize: ".85rem", opacity: .6, cursor: "pointer" }} onClick={() => onBrowse?.()}>campaigns</span>
          <NotificationBell notifications={notifications.filter(n => n.for === "brand")} onOpen={() => setShowTray(v => !v)} />
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, cursor: "pointer" }} onClick={() => setShowTray(v => !v)}>
            <div style={{ width: 14, height: 1.5, background: "rgba(255,255,255,.7)", borderRadius: 2 }} />
            <div style={{ width: 14, height: 1.5, background: "rgba(255,255,255,.7)", borderRadius: 2 }} />
            <div style={{ width: 14, height: 1.5, background: "rgba(255,255,255,.7)", borderRadius: 2 }} />
          </div>
        </div>
      </div>
      {showTray && <NotificationTray notifications={notifications} forRole="brand" onClose={() => setShowTray(false)} onMarkAllRead={() => { onMarkAllNotifsRead?.(); setShowTray(false); }} onViewAll={() => { setShowTray(false); onViewAllNotifications?.(); }} />}

      {/* Banner */}
      <div style={{ width: "100%", height: 160, background: "linear-gradient(135deg, rgba(100,80,255,.3), rgba(255,80,160,.18))", position: "relative" }}>
        <div style={{ position: "absolute", bottom: -52, left: 24, width: 104, height: 104, borderRadius: 18, border: "4px solid #040b15", background: "#1a1f35", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2.2rem", fontWeight: 700, fontFamily: "'Monda', system-ui, sans-serif" }}>
          {(user?.name || "B").charAt(0).toUpperCase()}
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px 80px" }}>
        {/* Profile info */}
        <div style={{ paddingTop: 64, marginBottom: 24 }}>
          <div style={{ fontSize: "1.8rem", fontWeight: 700, fontFamily: "'Monda', system-ui, sans-serif", letterSpacing: "-.01em" }}>{user?.name || "your brand"}</div>
          <div style={{ display: "flex", gap: 10, marginTop: 10, fontSize: ".88rem", opacity: .5, alignItems: "center", flexWrap: "wrap" }}>
            {user?.email && <span>{user.email}</span>}
          </div>
        </div>

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
              <div className="nf-stat-card" style={{ borderColor: total > 0 ? "rgba(255,140,30,.5)" : "rgba(255,255,255,.08)", animation: total > 0 ? "nf-border-shimmer 2.5s ease-in-out infinite" : "none", cursor: total > 0 ? "pointer" : "default" }} onClick={() => total > 0 && setShowAttentionModal(true)}>
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
        {/* Reviews card — full width row */}
        {(() => {
          const allReviews = allCampaigns.flatMap(c => (c.reviews || []).map(r => ({ ...r, _campaign: c })));
          const totalReviews = allReviews.length;
          const avgRating = totalReviews ? (allReviews.reduce((s, r) => s + r.rating, 0) / totalReviews).toFixed(1) : null;
          const newCount = allReviews.filter(r => r.submittedAt && (!lastReviewsVisitedAt || new Date(r.submittedAt) > new Date(lastReviewsVisitedAt))).length;
          return (
            <div className="nf-reviews-card" onClick={onViewReviews} style={{ marginBottom: 28, display: "flex", alignItems: "center", gap: 20, textAlign: "left", padding: "18px 22px" }}>
              <div style={{ textAlign: "center", minWidth: 60 }}>
                <div className="nf-gold-shimmer" style={{ fontSize: "2rem", fontWeight: 700, fontFamily: "'Monda', system-ui, sans-serif", lineHeight: 1 }}>{avgRating || "—"}</div>
                <div style={{ display: "flex", gap: 1, justifyContent: "center", marginTop: 4 }}>
                  {[1,2,3,4,5].map(i => { const r = parseFloat(avgRating); return <span key={i} style={{ fontSize: ".75rem", color: i <= Math.floor(r) ? "#fbbf24" : "rgba(251,191,36,.2)" }}>★</span>; })}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: ".85rem", fontWeight: 600 }}>{totalReviews > 0 ? `${totalReviews} review${totalReviews !== 1 ? "s" : ""}` : "no reviews yet"}</div>
                <div style={{ fontSize: ".75rem", opacity: .4, marginTop: 2 }}>creator reviews of your brand</div>
              </div>
              {newCount > 0 && <div style={{ padding: "3px 10px", borderRadius: 20, background: "rgba(251,191,36,.15)", border: "1px solid rgba(251,191,36,.3)", fontSize: ".7rem", fontWeight: 600, color: "#fbbf24", flexShrink: 0 }}>{newCount} new</div>}
            </div>
          );
        })()}

        {/* Campaign List */}
        {allCampaigns.length > 0 && <div style={{ fontSize: "1.1rem", fontWeight: 600, fontFamily: "'Monda', system-ui, sans-serif", marginBottom: 16 }}>your campaigns</div>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
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
                  {/* Banner */}
                  <div style={{ position: "relative" }}>
                    <div style={{ height: 150, background: c.imgBg || "#0c1424", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", borderRadius: "20px 20px 0 0" }}>
                      {c.imgUrl ? <img src={c.imgUrl} alt={c.brand} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>}
                    </div>
                    {/* Logo */}
                    {c.logoUrl ? (
                      <img src={c.logoUrl} alt={c.brand} style={{ position: "absolute", bottom: -41, left: 16, width: 82, height: 82, borderRadius: 14, border: "3px solid rgba(255,255,255,.15)", objectFit: "cover", zIndex: 2 }} />
                    ) : (
                      <div style={{ position: "absolute", bottom: -41, left: 16, width: 82, height: 82, borderRadius: 14, background: "#0c1424", border: "3px solid rgba(255,255,255,.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".65rem", color: "rgba(255,255,255,.5)", zIndex: 2 }}>logo</div>
                    )}
                    {/* Edit button top-right */}
                    {isUserCampaign && (
                      <div onClick={e => { e.stopPropagation(); setEditWarnCampaign(c); }} style={{ position: "absolute", top: 10, right: 10, padding: "5px 12px", borderRadius: 8, fontSize: ".72rem", fontWeight: 600, border: "1px solid rgba(255,255,255,.25)", background: "rgba(0,0,0,.5)", backdropFilter: "blur(10px)", color: "rgba(255,255,255,.8)", cursor: "pointer", zIndex: 3 }}>edit</div>
                    )}
                  </div>
                  {/* Brand name + campaign */}
                  <div style={{ padding: "12px 16px 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ paddingTop: 34 }}>
                      <div className={c.featured ? "nf-featured-name" : ""} style={{ fontSize: "1.7rem", fontWeight: 700, color: c.featured ? undefined : "#fff", lineHeight: 1.15 }}>{c.brand}</div>
                      <div style={{ fontSize: "1.05rem", opacity: .5, marginTop: 4 }}>{c.campaign}</div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 10, padding: "6px 12px", fontSize: ".85rem", color: "#fff", fontWeight: 600, whiteSpace: "nowrap", display: "inline-block", marginBottom: 6 }}>
                        {spotsLeft != null ? `${spotsLeft} spots left` : "open"}
                      </div>
                      <div style={{ fontSize: ".82rem", opacity: .35, textTransform: "lowercase", letterSpacing: ".03em", marginBottom: 6 }}>available for</div>
                      <div style={{ display: "flex", gap: 5, justifyContent: "flex-end" }}>
                        {(c.platforms || []).map(p => (
                          <div key={p} style={{ width: 34, height: 34, borderRadius: 8, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>{PLAT_SVGS_SMALL[p]}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                  {/* Details */}
                  <div style={{ padding: "8px 16px 16px", flex: 1, display: "flex", flexDirection: "column" }}>
                    <div style={{ flex: 1 }}>
                      {[["following:", c.following], ["deadline:", c.deadline]].map(([label, val]) => val ? (
                        <div key={label} style={{ display: "flex", gap: 8, padding: "3px 0", fontSize: ".95rem" }}>
                          <div style={{ opacity: .35, minWidth: 105 }}>{label}</div>
                          <div style={{ opacity: .85 }}>{val}</div>
                        </div>
                      ) : null)}
                    </div>
                    {/* Footer */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 14, marginTop: 14, borderTop: "1px solid rgba(255,255,255,.08)" }}>
                      <div>
                        <div style={{ fontSize: ".85rem", opacity: .4, textTransform: "lowercase", marginBottom: 3 }}>creators get</div>
                        <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "#fff", lineHeight: 1.2 }}>
                          {c.comp || "—"}
                          {c.compType === "product+paid" ? <span style={{ fontSize: ".85rem", fontWeight: 400, opacity: .45, marginLeft: 4 }}>+ product</span> : ""}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
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
      </div>

      {/* Needs attention modal */}
      {showAttentionModal && (() => {
        const pendingItems = allCampaigns.flatMap(c => (c.creators?.pending || []).map(cr => ({ type: "pending", campaign: c.campaign, brand: c.brand, creator: cr.name })));
        const overdueItems = allCampaigns.flatMap(c => (c.creators?.approved || []).filter(cr => cr.stage === "accepted" && businessDaysSince(cr.acceptedAt) > 3).map(cr => ({ type: "overdue", campaign: c.campaign, brand: c.brand, creator: cr.name, days: businessDaysSince(cr.acceptedAt) })));
        const allItems = [...overdueItems, ...pendingItems];
        return (
          <div onClick={() => setShowAttentionModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "12px" }}>
            <div onClick={e => e.stopPropagation()} style={{ background: "#0a1322", border: "1px solid rgba(255,255,255,.12)", borderRadius: 24, padding: "28px", maxWidth: 520, width: "100%", maxHeight: "80vh", overflowY: "auto", boxShadow: "0 40px 80px rgba(0,0,0,.6)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <div style={{ fontSize: "1.1rem", fontWeight: 700, fontFamily: "'Monda', system-ui, sans-serif" }}>needs attention</div>
                <div onClick={() => setShowAttentionModal(false)} style={{ cursor: "pointer", width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,.06)", display: "flex", alignItems: "center", justifyContent: "center", opacity: .7 }}>✕</div>
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
          <div onClick={() => setEditWarnCampaign(null)} style={{
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
                  hasAccepted && { icon: "⚠", color: "rgba(255,200,60,.8)", text: "you can upgrade compensation (product → paid) but you cannot reduce it once creators have been accepted." },
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

function OnboardingPage({ onDone }) {
  const [agreed, setAgreed] = useState(false);

  const rules = [
    {
      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.5)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>',
      title: "your campaign is live",
      body: "it's been pushed to our network of 5,000+ creators via email blasts and social promotion. creators who meet your requirements can apply immediately.",
    },
    {
      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.5)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
      title: "ship within 3 business days of approving a creator",
      body: "once you approve a creator, a 3-business-day clock starts. ship their product and enter a tracking number before it runs out. your dashboard will flag overdue shipments — and slow delivery can show up in creator reviews of your brand, which are public.",
    },
    {
      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.5)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
      title: "you control the pipeline",
      body: "creators move through stages: accepted → product shipped → content submitted → content approved → paid. you advance each creator manually as things happen. on paid campaigns, funds are held in escrow and released when you mark content as approved.",
    },
    {
      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.5)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
      title: "you can edit your campaign anytime",
      body: "most fields — name, description, banner, deadline, creator cap, location, requirements, products — are always editable. featured placement can be added or removed at any time. platforms, deliverables, and compensation type lock once a creator has been accepted. you can upgrade compensation but never reduce it.",
    },
    {
      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.5)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>',
      title: "your reputation matters",
      body: "creators leave public reviews of brands they've worked with. brands that communicate clearly, ship on time, and pay promptly attract better creators and fill campaigns faster. treat your creators well.",
    },
    {
      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.5)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>',
      title: "paid campaigns perform significantly better",
      body: "campaigns with a creator budget of at least $100 per creator fill 2–3x faster, attract higher-quality creators, and generate more views and reach. they're also backed by our sourcing guarantee — if we can't fill your campaign organically, we headhunt creators ourselves.",
    },
  ];

  return (
    <div style={{ minHeight: "100vh", overflowX: "hidden", background: "radial-gradient(circle at 60% 20%, rgba(255,255,255,.06) 0%, transparent 55%), linear-gradient(180deg, #040b15 0%, #070f1f 100%)", color: "#fff", fontFamily: "system-ui, sans-serif" }}>
      <style>{`
        @font-face { font-family: 'Monda'; src: url('/assets/Monda-Regular.woff') format('woff'); font-weight: 400 700; font-style: normal; font-display: swap; }
        .nf-onboard-card { background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.08); border-radius: 16px; padding: 20px 22px; transition: border-color .2s; }
        .nf-onboard-card:hover { border-color: rgba(255,255,255,.16); }
      `}</style>

      <div style={{ maxWidth: 620, margin: "0 auto", padding: "48px 24px 80px" }}>
        {/* Header */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ fontFamily: "'Monda', system-ui, sans-serif", fontSize: ".85rem", opacity: .4, marginBottom: 10, textTransform: "lowercase", letterSpacing: ".04em" }}>campaign published</div>
          <h1 style={{ fontFamily: "'Monda', system-ui, sans-serif", fontSize: "clamp(1.3rem, 4vw, 2rem)", fontWeight: 700, lineHeight: 1.2, marginBottom: 10 }}>before you head to your dashboard</h1>
          <p style={{ fontSize: "1rem", opacity: .5, lineHeight: 1.65 }}>here's what you need to know to run a successful campaign on nfluence.</p>
        </div>

        {/* Rules */}
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

        {/* Agree + CTA */}
        <div onClick={() => setAgreed(a => !a)} style={{
          display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", borderRadius: 14, marginBottom: 20,
          background: agreed ? "rgba(100,255,150,.05)" : "rgba(255,255,255,.03)",
          border: `1px solid ${agreed ? "rgba(100,255,150,.25)" : "rgba(255,255,255,.1)"}`,
          cursor: "pointer", transition: "all .2s",
        }}>
          <div style={{
            width: 20, height: 20, borderRadius: 6, flexShrink: 0,
            background: agreed ? "rgba(100,255,150,.2)" : "rgba(255,255,255,.08)",
            border: `1.5px solid ${agreed ? "rgba(100,255,150,.6)" : "rgba(255,255,255,.2)"}`,
            display: "flex", alignItems: "center", justifyContent: "center", transition: "all .2s",
          }}>
            {agreed && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(100,255,150,.9)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
          </div>
          <span style={{ fontSize: ".88rem", opacity: .7, lineHeight: 1.4 }}>i've read and understood the guidelines above</span>
        </div>

        <button onClick={onDone} disabled={!agreed} style={{
          width: "100%", padding: "16px", borderRadius: 16,
          fontFamily: "'Monda', system-ui, sans-serif", fontSize: "1rem", fontWeight: 600, textTransform: "lowercase",
          background: agreed ? "rgba(255,255,255,.1)" : "rgba(255,255,255,.03)",
          border: `1px solid ${agreed ? "rgba(255,255,255,.3)" : "rgba(255,255,255,.08)"}`,
          color: agreed ? "#fff" : "rgba(255,255,255,.25)",
          cursor: agreed ? "pointer" : "not-allowed", transition: "all .2s",
        }}>go to my dashboard →</button>
      </div>
    </div>
  );
}

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
        .cpp-plat-card { background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12); border-radius:16px; padding:18px 20px; display:flex; flex-direction:column; gap:14px; text-decoration:none; color:#fff; transition:transform .2s, border-color .2s, box-shadow .2s; }
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
          <div style={{ fontSize: "clamp(1.4rem, 4vw, 2rem)", fontWeight: 700, fontFamily: "'Monda', system-ui, sans-serif", textTransform: "lowercase", letterSpacing: "-.01em" }}>
            {creator.name || "creator"}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, fontSize: ".88rem", opacity: .5, marginTop: 10 }}>
            {creator.location && <span>{creator.location}</span>}
            {creator.age && <span>· {creator.age} yrs</span>}
            {creator.languages && <span>· {creator.languages}</span>}
          </div>
          {rating && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
              <span style={{ color: "#fbbf24", fontSize: ".95rem" }}>{"★".repeat(Math.round(rating))}{"☆".repeat(5 - Math.round(rating))}</span>
              <span style={{ fontSize: ".85rem", opacity: .5 }}>{rating.toFixed(1)}{completedCount > 0 ? ` · ${completedCount} campaign${completedCount !== 1 ? "s" : ""} completed` : ""}</span>
            </div>
          )}
        </div>

        {/* Bio */}
        {creator.bio && (
          <div style={{ fontSize: ".95rem", opacity: .5, marginTop: 10, lineHeight: 1.6 }}>
            {creator.bio}
          </div>
        )}

        {/* Niches */}
        {niches.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20, marginTop: 8 }}>
            {niches.map((n, i) => <div key={i} className="cpp-niche">{n}</div>)}
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
            <div onClick={onClose} style={{ cursor: "pointer", opacity: .4, fontSize: "1rem", lineHeight: 1 }}>✕</div>
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

function BrandProfile({ brand, allCampaigns, onBack, onSelectCampaign, appliedCampaigns = [], onApplyClick }) {
  const campaigns = allCampaigns.filter(c => c.brand === brand);
  const firstCampaign = campaigns[0] || {};
  const meta = BRAND_META[brand] || {};

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
        .bp-tab { padding:10px 20px; border-radius:20px; font-size:.88rem; cursor:pointer; transition:all .15s; border:1px solid transparent; }
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
        <div style={{ width: "100%", height: "clamp(140px, 30vw, 280px)", background: "#0c1424", overflow: "hidden", borderRadius: 16 }}>
          {firstCampaign.imgUrl && <img src={firstCampaign.imgUrl} alt={brand} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "brightness(.6)" }} />}
        </div>
        {/* Logo */}
        <div style={{ position: "absolute", bottom: -52, left: 28 }}>
          {firstCampaign.logoUrl ? (
            <img src={firstCampaign.logoUrl} alt={brand} style={{ width: 104, height: 104, borderRadius: "50%", border: "4px solid #040b15", objectFit: "cover" }} />
          ) : (
            <div style={{ width: 104, height: 104, borderRadius: "50%", background: "#0c1424", border: "4px solid #040b15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".75rem", opacity: .5 }}>logo</div>
          )}
        </div>
      </div>

      {/* Profile header */}
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "64px 16px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: "clamp(1.4rem, 4vw, 2rem)", fontWeight: 700, fontFamily: "'Monda', system-ui, sans-serif", marginBottom: 4 }}>{brand}</div>
            {meta.tagline && <div style={{ fontSize: "1rem", opacity: .4, fontStyle: "italic" }}>{meta.tagline}</div>}
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
          {meta.location && <span>{meta.location}</span>}
          {meta.website && <a href={`https://${meta.website}`} target="_blank" rel="noopener noreferrer" style={{ color: "#fff", textDecoration: "none", borderBottom: "1px solid rgba(255,255,255,.25)" }}>{meta.website}</a>}
          {meta.founded && <span>est. {meta.founded}</span>}
          {meta.totalCampaigns && <span>{meta.totalCampaigns} campaigns run</span>}
          {meta.totalCreators && <span>{meta.totalCreators.toLocaleString()} creators worked with</span>}
        </div>

        {/* Bio */}
        {meta.bio && (
          <div style={{ fontSize: ".95rem", lineHeight: 1.7, opacity: .65, marginBottom: 28, maxWidth: 620 }}>{meta.bio}</div>
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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16, paddingBottom: 60 }}>
            {campaigns.map((c, i) => {
              const spotsLeft = c.spotsTotal != null ? Math.max(0, c.spotsTotal - (c.creators?.approved?.length || 0)) : null;
              const applied = appliedCampaigns.includes(c.brand + "::" + c.campaign);
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
    </div>
  );
}

// ── BrowseCampaigns ──

function BrowseCampaigns({ campaigns = DEMO_CAMPAIGNS, onBack, onSelectCampaign, onApplyClick, appliedCampaigns = [] }) {
  const [search, setSearch] = useState("");
  const [filterPlatform, setFilterPlatform] = useState("All");
  const [filterComp, setFilterComp] = useState("All");
  const [filterTier, setFilterTier] = useState("all");
  const [filterIndustry, setFilterIndustry] = useState("All");

  const COMP_LABELS = { All: "All", product: "product only", paid: "paid", "product+paid": "product + paid", other: "other" };

  const getIndustries = (c) => {
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
      if (filterTier !== "all") {
        const tierOrder = ["25k", "50k", "100k", "250k", "500k", "1M+"];
        const normalize = (t) => t.toLowerCase().replace(/\+$/, "");
        const campaignIdx = tierOrder.findIndex(t => normalize(t) === normalize(c.following || ""));
        const filterIdx = tierOrder.findIndex(t => normalize(t) === normalize(filterTier));
        if (campaignIdx === -1 || campaignIdx > filterIdx) return false;
      }
      if (filterIndustry !== "All") {
        const inds = getIndustries(c);
        if (!inds.includes(filterIndustry)) return false;
      }
      return true;
    });
    const featured = shuffle(results.filter(c => c.featured), 0);
    const regular = shuffle(results.filter(c => !c.featured), 1000);
    return [...featured, ...regular];
  }, [campaigns, search, filterPlatform, filterComp, filterTier, filterIndustry]);

  const hasActiveFilters = search.trim() || filterPlatform !== "All" || filterComp !== "All" || filterTier !== "all" || filterIndustry !== "All";
  const clearAll = () => { setSearch(""); setFilterPlatform("All"); setFilterComp("All"); setFilterTier("all"); setFilterIndustry("All"); };

  const pillBtn = (active, onClick, label) => (
    <button onClick={onClick} style={{
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
        .nf-browse-card { background: radial-gradient(circle at top, rgba(255,255,255,.045), rgba(4,11,21,0)); border: 1px solid rgba(255,255,255,.12); border-radius: 20px; overflow: hidden; backdrop-filter: blur(20px); box-shadow: 0 20px 55px rgba(0,0,0,.35); cursor: pointer; display: flex; flex-direction: column; transition: transform .25s, box-shadow .25s, border-color .25s; }
        .nf-browse-card:hover { transform: translateY(-4px) scale(1.01); box-shadow: 0 28px 65px rgba(0,0,0,.5); border-color: rgba(255,255,255,.25); }
        .nf-apply-btn2 { transition: transform .12s, border-color .2s, box-shadow .2s, background .2s !important; cursor: pointer; }
        .nf-apply-btn2:hover { border-color: rgba(255,255,255,.55) !important; box-shadow: 0 0 14px rgba(255,255,255,.15) !important; background: rgba(255,255,255,.08) !important; transform: translateY(-1px); }
        .nf-search-input::placeholder { color: rgba(255,255,255,.3); }
        .nf-search-input:focus { outline: none; border-color: rgba(255,255,255,.35) !important; box-shadow: 0 0 0 3px rgba(255,255,255,.06); }
        .nf-filter-scroll { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; scrollbar-width: none; }
        .nf-filter-scroll::-webkit-scrollbar { display: none; }
        @keyframes nf-gold-shimmer { 0%,100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
        .nf-featured-name { background: linear-gradient(90deg, #fbbf24 0%, #fde68a 40%, #f59e0b 60%, #fbbf24 100%); background-size: 200% auto; -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; animation: nf-gold-shimmer 3s ease-in-out infinite; }
        @keyframes nf-border-shimmer { 0%,100% { border-color: rgba(255,140,30,.25); box-shadow: 0 0 8px rgba(255,140,30,.08); } 50% { border-color: rgba(255,165,50,.85); box-shadow: 0 0 18px rgba(255,140,30,.3); } }
        @keyframes nf-confirm-shimmer { 0%,100% { border-color: rgba(100,255,150,.2); box-shadow: 0 0 8px rgba(100,255,150,.08); } 50% { border-color: rgba(100,255,150,.9); box-shadow: 0 0 18px rgba(100,255,150,.35); } }
        .nf-awaiting-tile { border: 1px solid rgba(255,140,30,.25); animation: nf-border-shimmer 2.5s ease-in-out infinite; }
      `}</style>

      {/* Header */}
      <div style={{ width: "100%", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", fontFamily: "'Monda', system-ui, sans-serif" }}>
        <div style={{ fontWeight: 600, fontSize: "1.1rem", color: "#fff", cursor: "pointer" }} onClick={onBack}>nfluence</div>
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <NotificationBell notifications={[]} onOpen={() => {}} />
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, cursor: "pointer" }}>
            <div style={{ width: 14, height: 1.5, background: "rgba(255,255,255,.7)", borderRadius: 2 }} />
            <div style={{ width: 14, height: 1.5, background: "rgba(255,255,255,.7)", borderRadius: 2 }} />
            <div style={{ width: 14, height: 1.5, background: "rgba(255,255,255,.7)", borderRadius: 2 }} />
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "16px 24px 80px" }}>
        <h1 style={{ fontFamily: "'Monda', system-ui, sans-serif", fontSize: "1.8rem", fontWeight: 700, marginBottom: 28, textAlign: "center" }}>open campaigns</h1>

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
          {search && <div onClick={() => setSearch("")} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", cursor: "pointer", opacity: .4, fontSize: "1.1rem", lineHeight: 1 }}>×</div>}
        </div>

        {/* Filter rows */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: ".78rem", opacity: .35, minWidth: 64, textTransform: "lowercase" }}>platform</div>
            <div className="nf-filter-scroll">{["All", ...PLATFORM_LIST].map(p => pillBtn(filterPlatform === p, () => setFilterPlatform(p), p === "All" ? "all" : p))}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: ".78rem", opacity: .35, minWidth: 64, textTransform: "lowercase" }}>comp</div>
            <div className="nf-filter-scroll">{Object.entries(COMP_LABELS).map(([val, label]) => pillBtn(filterComp === val, () => setFilterComp(val), label))}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: ".78rem", opacity: .35, minWidth: 64, textTransform: "lowercase" }}>following</div>
            <div className="nf-filter-scroll">{FOLLOWER_TIERS.map(t => pillBtn(filterTier === t, () => setFilterTier(t), t))}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: ".78rem", opacity: .35, minWidth: 64, textTransform: "lowercase" }}>industry</div>
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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
            {filtered.map((c, i) => (
              <div key={i} className="nf-browse-card" onClick={() => onSelectCampaign(c)}>
                <div style={{ position: "relative" }}>
                  <div style={{ height: 150, background: c.imgBg, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", borderRadius: "20px 20px 0 0" }}>
                    {c.imgUrl ? <img src={c.imgUrl} alt={c.brand} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ fontSize: "2.8rem", opacity: .25 }}>{c.imgIcon}</div>}
                  </div>
                  {c.logoUrl ? (
                    <img src={c.logoUrl} alt={c.brand} style={{ position: "absolute", bottom: -41, left: 16, width: 82, height: 82, borderRadius: "50%", border: "3px solid rgba(255,255,255,.15)", objectFit: "cover", zIndex: 2 }} />
                  ) : (
                    <div style={{ position: "absolute", bottom: -41, left: 16, width: 82, height: 82, borderRadius: "50%", background: "#0c1424", border: "3px solid rgba(255,255,255,.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".65rem", color: "rgba(255,255,255,.5)", zIndex: 2 }}>logo</div>
                  )}
                </div>
                <div style={{ padding: "12px 16px 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ paddingTop: 34 }}>
                    <div className={c.featured ? "nf-featured-name" : ""} style={{ fontSize: "1.7rem", fontWeight: 700, color: c.featured ? undefined : "#fff", lineHeight: 1.15 }}>{c.brand}</div>
                    <div style={{ fontSize: "1.05rem", opacity: .5, marginTop: 4 }}>{c.campaign}</div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    {c.spotsTotal && (
                      <div style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 10, padding: "6px 12px", fontSize: ".85rem", color: "#fff", fontWeight: 600, whiteSpace: "nowrap", display: "inline-block", marginBottom: 6 }}>
                        {c.spotsTotal != null ? `${Math.max(0, c.spotsTotal - (c.creators?.approved?.length || 0))} spots left` : "open"}
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
                    {appliedCampaigns.includes(c.brand + "::" + c.campaign) ? (
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

// ── CreatorSignIn ──

function CreatorSignIn({ onSignIn, onBack, onSignUp }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const isValid = email.includes("@") && password.length >= 8;

  return (
    <div style={{ minHeight: "100vh", overflowX: "hidden", background: "radial-gradient(circle at calc(46% + 250px) calc(58% - 175px), rgba(255,255,255,.103) 0%, rgba(255,255,255,.0309) 38%, transparent 52%), linear-gradient(180deg, #040b15 0%, #070f1f 100%)", backgroundColor: "#040b15", color: "#fff", fontFamily: "system-ui, sans-serif", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{`
        .nf-signin-input { border-radius: 12px; border: 1px solid rgba(255,255,255,.18); background: rgba(0,0,0,.35); color: #fff; padding: 14px 16px; font-size: .95rem; width: 100%; outline: none; font-family: system-ui, sans-serif; transition: border-color .12s, box-shadow .12s, background .12s; }
        .nf-signin-input::placeholder { color: rgba(255,255,255,.4); }
        .nf-signin-input:focus { border-color: #fff; box-shadow: 0 0 0 1px rgba(255,255,255,.2); background: rgba(0,0,0,.5); }
        .nf-signin-btn { width: 100%; padding: 14px 24px; border-radius: 14px; border: 1px solid rgba(255,255,255,.28); background: rgba(255,255,255,.08); backdrop-filter: blur(20px); color: #fff; font-size: 1rem; font-family: 'Monda', system-ui, sans-serif; text-transform: lowercase; cursor: pointer; transition: all .12s; box-shadow: 0 10px 28px rgba(0,0,0,.25); }
        .nf-signin-btn:hover:not(:disabled) { transform: translateY(-2px); border-color: rgba(255,255,255,.45); background: rgba(255,255,255,.12); }
        .nf-signin-btn:disabled { opacity: .3; cursor: not-allowed; }
      `}</style>
      <div style={{ width: "100%", maxWidth: 400, padding: "0 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 12 }}>
          <div style={{ fontFamily: "'Monda', system-ui, sans-serif", fontSize: "clamp(1.6rem, 4vw, 2.2rem)", fontWeight: 700, marginBottom: 32, marginTop: "-40px" }}>nfluence</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 600, fontFamily: "'Monda', system-ui, sans-serif", marginBottom: 20 }}>sign in</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <input className="nf-signin-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email" />
          <input className="nf-signin-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="password" />
          <div style={{ display: "flex", gap: 12 }}>
            <button className="nf-signin-btn" style={{ flex: 1 }} onClick={onBack}>back</button>
            <button className="nf-signin-btn" style={{ flex: 1 }} disabled={!isValid} onClick={() => onSignIn(email, null, password)}>sign in</button>
          </div>
        </div>
        <div style={{ textAlign: "center", marginTop: 24, fontSize: ".85rem", opacity: .5 }}>
          don't have an account?{" "}
          <span style={{ color: "#fff", opacity: 1, cursor: "pointer", textDecoration: "underline" }} onClick={onSignUp}>sign up for free!</span>
        </div>
      </div>
    </div>
  );
}

// ── CreatorOnboarding ──

function CreatorOnboarding({ onComplete, onBack }) {
  const [step, setStep] = useState(0);
  const STEPS = ["account", "profile", "platforms", "preview"];
  const [account, setAccount] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [profile, setProfile] = useState({ bio: "", location: "", age: "", languages: "", niches: "", avatarPreview: null, bannerPreview: null, avatarEditing: false, bannerEditing: false, avatarTransform: null, bannerTransform: null });
  const [platforms, setPlatforms] = useState({ selected: { Instagram: false, TikTok: false, YouTube: false, X: false, Facebook: false }, handles: {}, followers: {} });
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const containerRef = useRef(null);
  useEffect(() => { containerRef.current?.scrollTo?.({ top: 0, behavior: "smooth" }); window.scrollTo?.({ top: 0, behavior: "smooth" }); }, [step]);

  const selectedPlatformKeys = PLATFORM_LIST.filter(p => platforms.selected[p]);
  const handlesComplete = selectedPlatformKeys.length > 0 && selectedPlatformKeys.every(p => platforms.handles[p]?.trim());

  const canProceed = useMemo(() => {
    if (step === 0) return account.name.trim() && account.email.includes("@") && account.password.length >= 8 && account.password === account.confirmPassword;
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

  const handleComplete = () => {
    const profileData = {
      name: account.name,
      bio: profile.bio,
      location: profile.location,
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
    onComplete(account.email, account.name, account.password, profileData);
  };

  const NICHE_OPTIONS = ["fitness & training", "wellness & supplements", "beauty & skincare", "fashion & apparel", "outdoors & adventure", "health & nutrition", "tech & gadgets", "gaming", "lifestyle & home", "food & beverage", "coffee & energy", "sports equipment", "travel", "pets", "automotive", "finance & investing", "education & coaching"];
  const [selectedNiches, setSelectedNiches] = useState([]);
  const toggleNiche = (n) => {
    setSelectedNiches(prev => {
      const next = prev.includes(n) ? prev.filter(x => x !== n) : [...prev, n];
      setProfile(p => ({ ...p, niches: next.join(", ") }));
      return next;
    });
  };

  return (
    <div ref={containerRef} style={{ minHeight: "100vh", overflowX: "hidden", background: "radial-gradient(circle at calc(46% + 250px) calc(58% - 175px), rgba(255,255,255,.103) 0%, rgba(255,255,255,.0309) 38%, transparent 52%), linear-gradient(180deg, #040b15 0%, #070f1f 100%)", backgroundColor: "#040b15", color: "#fff", fontFamily: "system-ui, sans-serif" }}>
      <style>{`
        @font-face { font-family: 'Monda'; src: url('/assets/Monda-Regular.woff') format('woff'); font-weight: 400 700; font-display: swap; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .co-input { border-radius: 12px; border: 1px solid rgba(255,255,255,.18); background: rgba(0,0,0,.35); color: #fff; padding: 12px 14px; font-size: .92rem; width: 100%; outline: none; font-family: system-ui, sans-serif; transition: border-color .12s, box-shadow .12s; }
        .co-input::placeholder { color: rgba(255,255,255,.35); }
        .co-input:focus { border-color: rgba(255,255,255,.6); box-shadow: 0 0 0 1px rgba(255,255,255,.15); background: rgba(0,0,0,.5); }
        .co-btn { padding: 14px 24px; border-radius: 14px; border: 1px solid rgba(255,255,255,.28); background: rgba(255,255,255,.08); color: #fff; font-size: .95rem; font-family: 'Monda', system-ui, sans-serif; text-transform: lowercase; cursor: pointer; transition: all .12s; }
        .co-btn:hover:not(:disabled) { transform: translateY(-2px); border-color: rgba(255,255,255,.45); background: rgba(255,255,255,.12); }
        .co-btn:disabled { opacity: .3; cursor: not-allowed; }
        .co-btn-back { background: transparent; border-color: rgba(255,255,255,.15); color: rgba(255,255,255,.5); }
        .co-btn-back:hover { background: rgba(255,255,255,.05) !important; border-color: rgba(255,255,255,.25) !important; color: rgba(255,255,255,.8) !important; transform: none !important; }
        .co-niche-pill { padding: 8px 16px; border-radius: 20px; border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.04); color: rgba(255,255,255,.6); font-size: .8rem; cursor: pointer; transition: all .12s; }
        .co-niche-pill.selected { background: rgba(255,255,255,.12); border-color: rgba(255,255,255,.35); color: #fff; }
        .co-plat-btn { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-radius: 14px; border: 1px solid rgba(255,255,255,.1); background: rgba(255,255,255,.03); cursor: pointer; transition: all .15s; }
        .co-plat-btn.selected { background: rgba(255,255,255,.08); border-color: rgba(255,255,255,.3); }
        .co-upload-zone { display: block; padding: 20px; border-radius: 14px; border: 2px dashed rgba(255,255,255,.12); background: rgba(255,255,255,.02); cursor: pointer; text-align: center; transition: all .15s; }
        .co-upload-zone:hover { border-color: rgba(255,255,255,.25); background: rgba(255,255,255,.04); }
      `}</style>

      {/* Header */}
      <div style={{ width: "100%", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", fontFamily: "'Monda', system-ui, sans-serif" }}>
        <div style={{ fontWeight: 600, fontSize: "1.1rem", cursor: "pointer" }} onClick={onBack}>nfluence</div>
        <div style={{ fontSize: ".8rem", opacity: .35 }}>creator sign up</div>
      </div>

      {/* Step pips */}
      <div className="nf-step-row" style={{ display: "flex", justifyContent: "center", gap: 8, padding: "8px 16px 4px", maxWidth: 470, margin: "0 auto" }}>
        {STEPS.map((s, i) => (
          <div key={s} style={{ flex: 1, height: 3, borderRadius: 3, background: i < step ? "rgba(255,255,255,.25)" : i === step ? "rgba(255,255,255,.55)" : "rgba(255,255,255,.08)", transition: "background .3s" }} />
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", maxWidth: 470, margin: "0 auto", padding: "6px 16px 0", fontSize: ".7rem", textTransform: "lowercase", letterSpacing: ".03em" }}>
        {STEPS.map((s, i) => (
          <span key={s} style={{ flex: 1, textAlign: "center", color: i === step ? "rgba(255,255,255,.85)" : i < step ? "rgba(255,255,255,.45)" : "rgba(255,255,255,.25)", transition: "color .3s" }}>{s}</span>
        ))}
      </div>

      {/* Content */}
      <div style={{ maxWidth: 470, margin: "0 auto", padding: "28px 24px 80px" }}>

        {/* Step 0: Account */}
        {step === 0 && (
          <div>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, fontFamily: "'Monda', system-ui, sans-serif", marginBottom: 6 }}>create your account</div>
            <div style={{ fontSize: ".88rem", opacity: .4, marginBottom: 28 }}>free forever for creators</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <div style={{ fontSize: ".72rem", opacity: .35, marginBottom: 5 }}>full name <span style={{ color: "rgba(255,100,100,.7)" }}>*</span></div>
                <input className="co-input" placeholder="your name" value={account.name} onChange={e => setAccount(a => ({ ...a, name: e.target.value }))} />
              </div>
              <div>
                <div style={{ fontSize: ".72rem", opacity: .35, marginBottom: 5 }}>email <span style={{ color: "rgba(255,100,100,.7)" }}>*</span></div>
                <input className="co-input" type="email" placeholder="you@email.com" value={account.email} onChange={e => setAccount(a => ({ ...a, email: e.target.value }))} />
              </div>
              <div>
                <div style={{ fontSize: ".72rem", opacity: .35, marginBottom: 5 }}>password <span style={{ color: "rgba(255,100,100,.7)" }}>*</span></div>
                <div style={{ position: "relative" }}>
                  <input className="co-input" type={showPass ? "text" : "password"} placeholder="min 8 characters" value={account.password} onChange={e => setAccount(a => ({ ...a, password: e.target.value }))} style={{ paddingRight: 44 }} />
                  <div onClick={() => setShowPass(v => !v)} style={{ position: "absolute", right: 13, top: "50%", transform: "translateY(-50%)", cursor: "pointer", opacity: showPass ? .7 : .35, display: "flex" }}>
                    {showPass ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg> : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
                  </div>
                </div>
              </div>
              <div>
                <div style={{ fontSize: ".72rem", opacity: .35, marginBottom: 5 }}>confirm password <span style={{ color: "rgba(255,100,100,.7)" }}>*</span></div>
                <div style={{ position: "relative" }}>
                  <input className="co-input" type={showConfirmPass ? "text" : "password"} placeholder="repeat password" value={account.confirmPassword} onChange={e => setAccount(a => ({ ...a, confirmPassword: e.target.value }))} style={{ paddingRight: 44 }} />
                  <div onClick={() => setShowConfirmPass(v => !v)} style={{ position: "absolute", right: 13, top: "50%", transform: "translateY(-50%)", cursor: "pointer", opacity: showConfirmPass ? .7 : .35, display: "flex" }}>
                    {showConfirmPass ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg> : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
                  </div>
                </div>
                {account.confirmPassword && account.password !== account.confirmPassword && (
                  <div style={{ fontSize: ".72rem", color: "rgba(255,100,100,.8)", marginTop: 5 }}>passwords don't match</div>
                )}
              </div>
              <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", padding: "12px 14px", borderRadius: 12, background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.08)", marginTop: 4 }}>
                <input type="checkbox" checked={account.agreeTerms} onChange={e => setAccount(a => ({ ...a, agreeTerms: e.target.checked }))} style={{ marginTop: 3, accentColor: "#fff", flexShrink: 0 }} />
                <span style={{ fontSize: ".78rem", opacity: .5, lineHeight: 1.55 }}>
                  I agree to Nfluence's{" "}
                  <a href="https://nfluenceagency.com/terms" target="_blank" rel="noopener noreferrer" style={{ color: "rgba(255,255,255,.8)", textDecoration: "underline" }}>Terms of Service</a>
                  {" "}and{" "}
                  <a href="https://nfluenceagency.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: "rgba(255,255,255,.8)", textDecoration: "underline" }}>Privacy Policy</a>.
                  I confirm I am at least 18 years old.
                </span>
              </label>
            </div>
          </div>
        )}

        {/* Step 1: Profile */}
        {step === 1 && (
          <div>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, fontFamily: "'Monda', system-ui, sans-serif", marginBottom: 6 }}>set up your profile</div>
            <div style={{ fontSize: ".88rem", opacity: .4, marginBottom: 28 }}>you can always update this later</div>

            {/* Banner upload */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: ".72rem", opacity: .35, marginBottom: 8 }}>banner photo</div>
              {profile.bannerEditing && profile.bannerPreview ? (
                <ImageEditor src={profile.bannerPreview} shape="banner"
                  initialScale={profile.bannerTransform?.scale} initialPos={profile.bannerTransform?.pos}
                  onSave={(t) => setProfile(p => ({ ...p, bannerTransform: t, bannerEditing: false }))}
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
                  <div style={{ fontSize: ".8rem", opacity: .35, marginTop: 8 }}>click to upload banner</div>
                  <div style={{ fontSize: ".68rem", opacity: .2, marginTop: 4 }}>1500×500px · JPG or PNG</div>
                </label>
              )}
            </div>

            {/* Avatar upload */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: ".72rem", opacity: .35, marginBottom: 8 }}>profile photo</div>
              {profile.avatarEditing && profile.avatarPreview ? (
                <ImageEditor src={profile.avatarPreview} shape="circle"
                  initialScale={profile.avatarTransform?.scale} initialPos={profile.avatarTransform?.pos}
                  onSave={(t) => setProfile(p => ({ ...p, avatarTransform: t, avatarEditing: false }))}
                  onCancel={() => setProfile(p => ({ ...p, avatarPreview: null, avatarEditing: false, avatarTransform: null }))} />
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <label style={{ cursor: "pointer", position: "relative" }}>
                    <input type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={e => handleFileUpload("avatarPreview", e)} />
                    <div style={{ width: 72, height: 72, borderRadius: "50%", border: "2px dashed rgba(255,255,255,.2)", background: "rgba(255,255,255,.04)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {profile.avatarPreview ? <img src={profile.avatarPreview} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" /> : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
                    </div>
                  </label>
                  <div>
                    <label style={{ cursor: "pointer" }}>
                      <input type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={e => handleFileUpload("avatarPreview", e)} />
                      <div style={{ fontSize: ".82rem", opacity: .6 }}>{profile.avatarPreview ? "click to change photo" : "click to upload a photo"}</div>
                    </label>
                    <div style={{ fontSize: ".68rem", opacity: .25, marginTop: 3 }}>400×400px · JPG or PNG</div>
                    {profile.avatarPreview && <div onClick={() => setProfile(p => ({ ...p, avatarEditing: true }))} style={{ fontSize: ".72rem", opacity: .4, marginTop: 5, cursor: "pointer", textDecoration: "underline" }}>reposition</div>}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <div style={{ fontSize: ".72rem", opacity: .35, marginBottom: 5 }}>bio <span style={{ opacity: .5 }}>(optional)</span></div>
                <textarea className="co-input" placeholder="tell brands about yourself..." rows={3} value={profile.bio} onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))} style={{ resize: "vertical", lineHeight: 1.5 }} />
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 2 }}>
                  <div style={{ fontSize: ".72rem", opacity: .35, marginBottom: 5 }}>location</div>
                  <input className="co-input" placeholder="city, state or country" value={profile.location} onChange={e => setProfile(p => ({ ...p, location: e.target.value }))} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: ".72rem", opacity: .35, marginBottom: 5 }}>age</div>
                  <input className="co-input" placeholder="age" value={profile.age} onChange={e => setProfile(p => ({ ...p, age: e.target.value }))} />
                </div>
              </div>
              <div>
                <div style={{ fontSize: ".72rem", opacity: .35, marginBottom: 5 }}>languages</div>
                <input className="co-input" placeholder="e.g. English, Spanish" value={profile.languages} onChange={e => setProfile(p => ({ ...p, languages: e.target.value }))} />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Platforms + niches */}
        {step === 2 && (
          <div>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, fontFamily: "'Monda', system-ui, sans-serif", marginBottom: 6 }}>your platforms</div>
            <div style={{ fontSize: ".88rem", opacity: .4, marginBottom: 24 }}>select every platform you create on</div>

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
                <div style={{ fontSize: ".72rem", opacity: .35, marginBottom: 4 }}>add your handles and follower counts</div>
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
              <div style={{ fontSize: ".72rem", opacity: .35, marginBottom: 10 }}>content niches <span style={{ opacity: .5 }}>(select all that apply)</span></div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {NICHE_OPTIONS.map(n => (
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
            <div style={{ fontSize: ".88rem", opacity: .4, marginBottom: 28 }}>here's your profile preview</div>

            {/* Profile preview card */}
            <div style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,.1)", overflow: "hidden", marginBottom: 24 }}>
              {/* Banner */}
              <div style={{ height: 120, background: profile.bannerPreview ? `url(${profile.bannerPreview}) center/cover` : "linear-gradient(135deg, rgba(100,80,255,.3), rgba(255,80,160,.2))", position: "relative" }}>
                <div style={{ position: "absolute", bottom: -28, left: 20, width: 56, height: 56, borderRadius: "50%", border: "3px solid #040b15", background: "#0c1424", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", fontWeight: 700 }}>
                  {profile.avatarPreview ? <img src={profile.avatarPreview} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" /> : account.name.charAt(0).toUpperCase()}
                </div>
              </div>
              <div style={{ padding: "38px 20px 20px", background: "rgba(255,255,255,.02)" }}>
                <div style={{ fontSize: "1.3rem", fontWeight: 700, fontFamily: "'Monda', system-ui, sans-serif", marginBottom: 4 }}>{account.name || "your name"}</div>
                {(profile.location || profile.age) && <div style={{ fontSize: ".82rem", opacity: .5, marginBottom: 6 }}>{[profile.location, profile.age && `${profile.age} yrs`].filter(Boolean).join(" · ")}</div>}
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

            <div style={{ fontSize: ".82rem", opacity: .35, textAlign: "center", marginBottom: 20 }}>you can edit all of this from your dashboard anytime</div>
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: "flex", gap: 12, marginTop: 32 }}>
          <button className="co-btn co-btn-back" onClick={() => step === 0 ? onBack() : setStep(s => s - 1)}>← back</button>
          {step < 3 ? (
            <button className="co-btn" style={{ flex: 1 }} disabled={!canProceed} onClick={() => setStep(s => s + 1)}>continue →</button>
          ) : (
            <button className="co-btn" style={{ flex: 1, borderColor: "rgba(100,255,150,.35)", background: "rgba(100,255,150,.1)", color: "rgba(100,255,150,.95)" }} onClick={handleComplete}>let's go →</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── CreatorDashboard ──

function CreatorDashboard({ user, appliedCampaigns, activeCampaigns, uploads, onSignOut, onBack, onUpload, onEditProfile, creatorProfile, onSelectCampaign, onBrowse, onOpenMessages, onViewOwnProfile, scheduledCalls = {}, onRespondToCall, notifications = [], onMarkAllNotifsRead, onViewAllNotifications }) {
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

  const handleUploadSubmit = () => {
    if (!uploadFile || !selectedUploadCampaign) return;
    onUpload({ fileName: uploadFile.name, campaign: selectedUploadCampaign, uploadedAt: new Date().toISOString(), status: "pending review" });
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
      <div style={{ width: "100%", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", fontFamily: "'Monda', system-ui, sans-serif", flexShrink: 0 }}>
        <div style={{ fontWeight: 600, fontSize: "1.1rem", cursor: "pointer", flexShrink: 0 }} onClick={onBack}>nfluence</div>
        <div style={{ display: "flex", gap: 14, fontSize: ".9rem", alignItems: "center", flexShrink: 0 }}>
          <span style={{ color: "#fff", cursor: "pointer", opacity: .7 }} onClick={() => onBrowse?.()}>campaigns</span>
          <NotificationBell notifications={notifications.filter(n => n.for === "creator")} onOpen={() => setShowTray(v => !v)} />
          <div style={{ position: "relative" }}>
            <div onClick={() => setShowMenu(v => !v)} style={{ cursor: "pointer", width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", display: "flex", alignItems: "center", justifyContent: "center", gap: 3, flexDirection: "column" }}>
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
                    { label: "edit profile", icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>', action: () => { setShowMenu(false); setEditForm({ ...creatorProfile }); setShowEditModal(true); } },
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
            { label: "completed campaigns", value: appliedCampaigns.filter(c => c.status === "accepted").length, onClick: () => setShowCompletedModal(true) },
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
                      <div style={{ width: 54, height: 54, borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,.12)", flexShrink: 0, background: "#0c1424", display: "flex", alignItems: "center", justifyContent: "center" }}>
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
                      <button className="nf-creator-btn" style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(100,180,255,.08)", borderColor: "rgba(100,180,255,.25)", color: "rgba(100,180,255,.9)" }} onClick={e => { e.stopPropagation(); setSelectedUploadCampaign(`${c.brand} · ${c.campaign}`); setShowUploadModal(true); }}>
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
                  const [brand, campaign] = key.split("::");
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
        <div onClick={() => setShowActiveModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "12px" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#0a1322", border: "1px solid rgba(255,255,255,.12)", borderRadius: 24, padding: "28px", maxWidth: 560, width: "100%", maxHeight: "80vh", overflowY: "auto", boxShadow: "0 40px 80px rgba(0,0,0,.6)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div style={{ fontSize: "1.1rem", fontWeight: 700, fontFamily: "'Monda', system-ui, sans-serif" }}>active campaigns</div>
              <div onClick={() => setShowActiveModal(false)} style={{ cursor: "pointer", width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", opacity: .7 }}>✕</div>
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
                        <div style={{ width: 40, height: 40, borderRadius: "50%", overflow: "hidden", border: "1px solid rgba(255,255,255,.12)", background: "#0c1424", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
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
        <div onClick={() => setShowCompletedModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "12px" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#0a1322", border: "1px solid rgba(255,255,255,.12)", borderRadius: 24, padding: "28px", maxWidth: 540, width: "100%", maxHeight: "80vh", overflowY: "auto", boxShadow: "0 40px 80px rgba(0,0,0,.6)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div style={{ fontSize: "1.1rem", fontWeight: 700, fontFamily: "'Monda', system-ui, sans-serif" }}>completed campaigns</div>
              <div onClick={() => setShowCompletedModal(false)} style={{ cursor: "pointer", width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", opacity: .7 }}>✕</div>
            </div>
            {appliedCampaigns.filter(c => c.status === "accepted").length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", opacity: .3, fontSize: ".9rem" }}>no completed campaigns yet</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {appliedCampaigns.filter(c => c.status === "accepted").map((c, i) => (
                  <div key={i} style={{ padding: "16px 18px", borderRadius: 14, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", overflow: "hidden", border: "1px solid rgba(255,255,255,.1)", background: "#0c1424", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
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
        <div onClick={() => setShowPendingModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "12px" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#0a1322", border: "1px solid rgba(255,255,255,.12)", borderRadius: 24, padding: "28px 28px", maxWidth: 540, width: "100%", maxHeight: "80vh", overflowY: "auto", boxShadow: "0 40px 80px rgba(0,0,0,.6)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div style={{ fontSize: "1.1rem", fontWeight: 700, fontFamily: "'Monda', system-ui, sans-serif" }}>my applications</div>
              <div onClick={() => setShowPendingModal(false)} style={{ cursor: "pointer", width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", opacity: .7 }}>✕</div>
            </div>
            {appliedCampaigns.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", opacity: .3, fontSize: ".9rem" }}>no applications yet</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {appliedCampaigns.map((c, i) => {
                  const statusStyle = APPLICATION_STATUS_COLORS[c.status] || APPLICATION_STATUS_COLORS.applied;
                  return (
                    <div key={i} style={{ padding: "16px 18px", borderRadius: 14, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{ width: 40, height: 40, borderRadius: "50%", overflow: "hidden", border: "1px solid rgba(255,255,255,.1)", background: "#0c1424", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
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
        <div onClick={() => setShowUploadModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "12px" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#0a1322", border: "1px solid rgba(255,255,255,.12)", borderRadius: 24, padding: "28px 28px", maxWidth: 480, width: "100%", boxShadow: "0 40px 80px rgba(0,0,0,.6)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <div style={{ fontSize: "1.1rem", fontWeight: 700, fontFamily: "'Monda', system-ui, sans-serif" }}>upload content</div>
              <div onClick={() => setShowUploadModal(false)} style={{ cursor: "pointer", width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", opacity: .7 }}>✕</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <div style={{ fontSize: ".75rem", opacity: .4, marginBottom: 6, textTransform: "lowercase" }}>campaign</div>
                <select value={selectedUploadCampaign} onChange={e => setSelectedUploadCampaign(e.target.value)} style={{ width: "100%", padding: "12px 14px", borderRadius: 11, border: "1px solid rgba(255,255,255,.15)", background: "rgba(0,0,0,.4)", color: selectedUploadCampaign ? "#fff" : "rgba(255,255,255,.35)", fontSize: ".88rem", outline: "none", fontFamily: "system-ui, sans-serif" }}>
                  <option value="">select a campaign...</option>
                  {activeCampaigns.map((c, i) => <option key={i} value={`${c.brand} · ${c.campaign}`}>{c.brand} · {c.campaign}</option>)}
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
                <button disabled={!uploadFile || !selectedUploadCampaign} onClick={handleUploadSubmit} style={{ flex: 2, padding: "11px", borderRadius: 11, border: uploadFile && selectedUploadCampaign ? "1px solid rgba(100,180,255,.35)" : "1px solid rgba(255,255,255,.1)", background: uploadFile && selectedUploadCampaign ? "rgba(100,180,255,.12)" : "transparent", color: uploadFile && selectedUploadCampaign ? "rgba(100,180,255,.9)" : "rgba(255,255,255,.25)", fontSize: ".88rem", fontWeight: 600, cursor: uploadFile && selectedUploadCampaign ? "pointer" : "not-allowed", fontFamily: "'Monda', system-ui, sans-serif", textTransform: "lowercase", transition: "all .12s" }}>upload</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Creator reviews modal */}
      {showCreatorReviews && (() => {
        const demoReviews = [
          { brand: "Alo", campaign: "Mindful Movement", rating: 5, text: "Tyler was incredible to work with. Content was delivered on time, exactly on brief, and performed extremely well. Would work with again without hesitation.", date: "2026-03-15" },
          { brand: "Nike", campaign: "Running Challenge", rating: 5, text: "Professional, creative, and responsive throughout the entire campaign. The sunrise run vlog exceeded all our expectations.", date: "2026-01-28" },
          { brand: "GoPro", campaign: "POV Creator Program", rating: 4, text: "Great content quality and strong audience engagement. Minor delay on first draft but communicated proactively.", date: "2025-11-10" },
        ];
        const reviews = creatorProfile.reviews || demoReviews;
        const filtered = reviewStarFilter ? reviews.filter(r => r.rating === reviewStarFilter) : reviews;
        const avg = (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1);
        const counts = [5,4,3,2,1].map(s => ({ star: s, count: reviews.filter(r => r.rating === s).length }));
        return (
          <div onClick={() => { setShowCreatorReviews(false); setReviewStarFilter(null); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: "#0a1322", border: "1px solid rgba(255,255,255,.12)", borderRadius: 20, padding: "24px 28px", maxWidth: 560, width: "100%", maxHeight: "80vh", overflowY: "auto", boxShadow: "0 40px 80px rgba(0,0,0,.6)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <div style={{ fontSize: "1.1rem", fontWeight: 700, fontFamily: "'Monda', system-ui, sans-serif" }}>reviews</div>
                <div onClick={() => { setShowCreatorReviews(false); setReviewStarFilter(null); }} style={{ cursor: "pointer", opacity: .4, fontSize: "1.1rem" }}>✕</div>
              </div>
              <div style={{ display: "flex", gap: 24, alignItems: "flex-start", marginBottom: 20, paddingBottom: 20, borderBottom: "1px solid rgba(255,255,255,.07)" }}>
                <div style={{ textAlign: "center", flexShrink: 0 }}>
                  <div style={{ fontSize: "3rem", fontWeight: 700, lineHeight: 1 }}>{avg}</div>
                  <div style={{ color: "#fbbf24", fontSize: "1rem", margin: "4px 0" }}>{"★".repeat(Math.round(parseFloat(avg)))}</div>
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
        <div onClick={() => setShowEditModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "12px" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#0a1322", border: "1px solid rgba(255,255,255,.12)", borderRadius: 24, padding: "28px 28px", maxWidth: 480, width: "100%", maxHeight: "85vh", overflowY: "auto", boxShadow: "0 40px 80px rgba(0,0,0,.6)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <div style={{ fontSize: "1.1rem", fontWeight: 700, fontFamily: "'Monda', system-ui, sans-serif" }}>edit profile</div>
              <div onClick={() => setShowEditModal(false)} style={{ cursor: "pointer", width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", opacity: .7 }}>✕</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Basic info */}
              <div style={{ fontSize: ".7rem", opacity: .3, textTransform: "uppercase", letterSpacing: ".08em" }}>basic info</div>
              {[["name", "your name"], ["bio", "short bio (shown on profile)"], ["location", "city, state or country"], ["age", "your age"], ["languages", "e.g. English, Spanish"]].map(([field, placeholder]) => (
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
                <button onClick={() => { onEditProfile(editForm); setShowEditModal(false); }} style={{ flex: 2, padding: "11px", borderRadius: 11, border: "1px solid rgba(255,255,255,.28)", background: "rgba(255,255,255,.08)", color: "#fff", fontSize: ".88rem", fontWeight: 600, cursor: "pointer", fontFamily: "'Monda', system-ui, sans-serif", textTransform: "lowercase", transition: "all .12s" }}>save profile</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



// ═══════════════════════════════════════════════

// ── FAQPage ──

function FAQPage({ onBack, onStart }) {
  const [openIdx, setOpenIdx] = useState(null);

  const sections = [
    {
      heading: "about nfluence",
      items: [
        { q: "what is nfluence?", a: "Nfluence is a digital marketing agency. Part of what we do is bring creators and brands together — so we built this platform to simplify the entire process. Instead of DMing influencers one by one, brands create a campaign, set their requirements, and our network of 5,000+ creators comes to you. We used to charge $1,500+ per campaign to source influencers, collect deliverables, and manage everything. Nfluence automates all of that for a flat $299 per campaign." },
        { q: "how much does it cost?", a: "$299 per campaign for brands, or $1,999/year for unlimited campaigns (up to 3 active at once). Free for creators. Any creator budget you offer is separate — that's your call, not a platform fee." },
        { q: "what is the annual plan?", a: "The annual plan is $1,999/year and gives you unlimited campaigns with up to 3 running simultaneously for 12 months — no per-campaign fees. It also includes 1 free 30-day featured campaign per month (a $600 value). You break even at 7 campaigns. If you're running more than 7 campaigns a year, the annual plan pays for itself." },
        { q: "what do I get for $299?", a: "Your campaign is pushed to our network of 5,000+ creators via email blasts and social promotion. The platform manages your entire pipeline: applications, approvals, shipping tracking, content submission, revision requests, and payment tracking. On qualifying paid campaigns, we also manually headhunt creators if your campaign doesn't fill organically." },
      ],
    },
    {
      heading: "creator budgets & compensation",
      items: [
        { q: "do I need a creator budget?", a: "No — a budget is completely optional. Many brands run successful product-seeding campaigns where creators receive free product in exchange for approved content, no cash involved." },
        { q: "why should I consider a paid campaign?", a: "Paid campaigns significantly outperform product-only campaigns across the board: they fill 2–3x faster, attract higher-quality creators with larger and more engaged audiences, generate more content per campaign, produce higher view counts and reach, and result in better overall content quality. Paid creators treat it like a job." },
        { q: "is there a sourcing guarantee?", a: "Yes. If your campaign includes a budget of at least $100 per creator, Nfluence guarantees up to 20 approved creators. If our email blasts and social promotion don't fill your campaign, we manually headhunt creators ourselves — included in the $299." },
        { q: "how do creators get paid?", a: "On paid campaigns, funds are held in escrow by Nfluence (similar to how PayPal holds funds) and released to creators once they complete their deliverables per your brand guidelines. On product-only campaigns, you ship directly to creators in exchange for approved content." },
      ],
    },
    {
      heading: "setting up your campaign",
      items: [
        { q: "how many creators can join?", a: "That's up to you. You set a cap during setup — or leave it open. Campaigns run for a maximum of 30 days." },
        { q: "how does creator vetting work?", a: "Two layers. First, creators must meet your requirements — minimum following, age range, location, niche, platform — just to apply. Then it's your call: manually approve each applicant one by one, or auto-accept anyone who passes your filters." },
        { q: "how do creators know what to post?", a: "Two options: upload a creator posting guide during campaign setup (brand guidelines, sample posts, dos and don'ts), or schedule a call with each accepted creator once they're in." },
        { q: "can I edit my campaign after publishing?", a: "Yes — most fields are editable anytime: name, description, banner, deadline, creator cap, location, requirements, products, and featured placement. Two things lock once any creator has been accepted: platforms and deliverables (creators applied based on these terms), and compensation type. You can upgrade compensation (product → paid, or either → product+paid) but you can never reduce it after creators have committed." },
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
        { q: "what does featured include?", a: "First position above all non-featured campaigns on the browse and landing page. A gold shimmer on your brand name. Priority visibility to our entire creator network. The ability to add or remove featured placement at any time — even after publishing." },
        { q: "how is the order determined for featured campaigns?", a: "Featured campaigns are randomized daily — not alphabetical, not by spend. Every day the order reshuffles so no single brand has a permanent advantage. The order is consistent throughout the day but changes at midnight." },
        { q: "how much does featured cost?", a: "Three options: $2.99 for 1 day, $14.99 for 7 days, or $49.99 for 30 days. You can add or extend featured placement at any time from your campaign settings." },
      ],
    },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(circle at 70% 15%, rgba(255,255,255,.05) 0%, transparent 55%), linear-gradient(180deg, #040b15 0%, #070f1f 100%)", color: "#fff", fontFamily: "system-ui, sans-serif" }}>
      <style>{`
        @font-face { font-family: 'Monda'; src: url('/assets/Monda-Regular.woff') format('woff'); font-weight: 400 700; font-style: normal; font-display: swap; }
        .nf-faq-item { border: 1px solid rgba(255,255,255,.08); border-radius: 14px; overflow: hidden; transition: border-color .2s; }
        .nf-faq-item:hover { border-color: rgba(255,255,255,.18); }
        .nf-faq-q { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px; cursor: pointer; gap: 16px; }
        .nf-faq-a { padding: 0 20px 18px; font-size: .9rem; opacity: .6; line-height: 1.7; }
        .nf-faq-cta { transition: transform .12s, border-color .2s, background .2s; }
        .nf-faq-cta:hover { transform: translateY(-2px); border-color: rgba(255,255,255,.45) !important; background: rgba(255,255,255,.12) !important; }
      `}</style>

      <div style={{ width: "100%", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", fontFamily: "'Monda', system-ui, sans-serif" }}>
        <div style={{ fontWeight: 600, fontSize: "1.1rem", color: "#fff", cursor: "pointer" }} onClick={onBack}>nfluence</div>
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.7)" strokeWidth="1.8" strokeLinecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          </div>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, cursor: "pointer" }} onClick={onBack}>
            <div style={{ width: 14, height: 1.5, background: "rgba(255,255,255,.7)", borderRadius: 2 }} />
            <div style={{ width: 14, height: 1.5, background: "rgba(255,255,255,.7)", borderRadius: 2 }} />
            <div style={{ width: 14, height: 1.5, background: "rgba(255,255,255,.7)", borderRadius: 2 }} />
          </div>
        </div>
      </div>

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
                    <div className="nf-faq-q" onClick={() => setOpenIdx(isOpen ? null : key)}>
                      <span style={{ fontSize: ".95rem", fontWeight: 500, opacity: .9, flex: 1 }}>{item.q}</span>
                      <span style={{ opacity: .35, fontSize: ".85rem", flexShrink: 0, transition: "transform .2s", transform: isOpen ? "rotate(45deg)" : "none" }}>+</span>
                    </div>
                    {isOpen && <div className="nf-faq-a">{item.a}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <div style={{ marginTop: 16, padding: "32px", borderRadius: 20, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)", textAlign: "center" }}>
          <div style={{ fontFamily: "'Monda', system-ui, sans-serif", fontSize: "1.2rem", fontWeight: 700, marginBottom: 8 }}>ready to launch?</div>
          <div style={{ fontSize: ".9rem", opacity: .45, marginBottom: 24 }}>join the brands already growing with nfluence</div>
          <button onClick={onStart} className="nf-faq-cta" style={{ padding: "14px 32px", borderRadius: 14, border: "1px solid rgba(255,255,255,.25)", background: "rgba(255,255,255,.08)", color: "#fff", cursor: "pointer", fontFamily: "'Monda', system-ui, sans-serif", fontSize: ".95rem", fontWeight: 600, textTransform: "lowercase" }}>start a campaign — $299</button>
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
      body: "it's been pushed to our network of 5,000+ creators via email blasts and social promotion. creators who meet your requirements can apply immediately.",
    },
    {
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.5)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
      title: "ship within 3 business days of approving a creator",
      body: "once you approve a creator, a 3-business-day clock starts. ship their product and enter a tracking number before it runs out. your dashboard will flag overdue shipments — and slow delivery can show up in creator reviews of your brand, which are public.",
    },
    {
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.5)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
      title: "you control the pipeline",
      body: "creators move through stages: accepted → product shipped → content submitted → content approved → paid. you advance each creator manually as things happen. on paid campaigns, funds are held in escrow and released when you mark content as approved.",
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
      body: "campaigns with a creator budget of at least $100 per creator fill 2–3x faster, attract higher-quality creators, and generate more views and reach. they're also backed by our sourcing guarantee — if we can't fill your campaign organically, we headhunt creators ourselves.",
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

        <button onClick={onDone} disabled={!agreed} style={{ width: "100%", padding: "16px", borderRadius: 16, fontFamily: "'Monda', system-ui, sans-serif", fontSize: "1rem", fontWeight: 600, textTransform: "lowercase", background: agreed ? "rgba(255,255,255,.1)" : "rgba(255,255,255,.03)", border: `1px solid ${agreed ? "rgba(255,255,255,.3)" : "rgba(255,255,255,.08)"}`, color: agreed ? "#fff" : "rgba(255,255,255,.25)", cursor: agreed ? "pointer" : "not-allowed", transition: "all .2s" }}>go to my dashboard →</button>
      </div>
    </div>
  );
}
