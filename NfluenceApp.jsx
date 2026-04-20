// ── NfluenceApp ──

function NfluenceApp() {
  const [view, setView] = useState("landing"); // landing | builder | browse | detail | brandprofile | signin | dashboard | messages | inbox | onboarding | reviews
  const [selectedBrand, setSelectedBrand] = useState("Nike");
  const [pendingCampaign, setPendingCampaign] = useState(null);
  const [selectedCampaign, setSelectedCampaign] = useState(DEMO_CAMPAIGNS[0]);
  const [user, setUser] = useState(null); // { email, name }
  const [myCampaigns, setMyCampaigns] = useState([]);
  const [appliedCampaigns, setAppliedCampaigns] = useState([]); // ["Brand::Campaign", ...]
  const [demoCampaignOverrides, setDemoCampaignOverrides] = useState({}); // index → campaign override
  const [signInRedirect, setSignInRedirect] = useState(null); // campaign to redirect back to after sign in
  const [detailSource, setDetailSource] = useState("landing"); // "landing" | "dashboard"
  const [autoApply, setAutoApply] = useState(false);
  const [lastReviewsVisitedAt, setLastReviewsVisitedAt] = useState(null); // ISO string — when brand last opened reviews page
  const [demoCampaignReviewOverrides, setDemoCampaignReviewOverrides] = useState({}); // demoIdx → { reviewIdx → brandResponse }

  // Creator state
  const [creatorUser, setCreatorUser] = useState({ email: "tyler@nfluenceagency.com", name: "Tyler" });
  const [creatorProfile, setCreatorProfile] = useState({ name: "Tyler", bio: "Partner at Nfluence. Building the future of creator-brand collaboration.", location: "Los Angeles, CA", age: "40", languages: "English", niches: "fitness, wellness, lifestyle", rating: 5.0, instagram: "@tyler", tiktok: "@tyler", tiktokFollowers: "42k", youtube: "", instagramFollowers: "18k", youtubeFollowers: "", bannerUrl: null, avatarUrl: null, platforms: {} });
  const [creatorUploads, setCreatorUploads] = useState([]);
  const [creatorApplied, setCreatorApplied] = useState([
    { brand: "Nike", campaign: "Running Challenge", logoUrl: "/assets/logo_nike.jpg", status: "applied" },
    { brand: "Alo", campaign: "Mindful Movement", logoUrl: "/assets/logo_alo.jpg", status: "accepted" },
    { brand: "GoPro", campaign: "POV Creator Program", logoUrl: "/assets/logo_gopro.jpg", status: "rejected" },
  ]);
  const [creatorActive, setCreatorActive] = useState([
    { brand: "Alo", campaign: "Mindful Movement", logoUrl: "/assets/logo_alo.jpg", myStage: "product_shipped", deadline: "07/01/26", comp: "$500" },
  ]);

  // Messaging state
  const [allMessages, setAllMessages] = useState(DEMO_MESSAGES); // key → message[]
  const [messageCreator, setMessageCreator] = useState(null); // creator name for current thread
  const [messageReturnView, setMessageReturnView] = useState("detail"); // where to go back from messages

  // Merged demo campaigns with any overrides (from applications or review responses)
  const mergedDemos = DEMO_CAMPAIGNS.map((d, i) => {
    const base = demoCampaignOverrides[i] ? { ...d, ...demoCampaignOverrides[i] } : d;
    const reviewOverrides = demoCampaignReviewOverrides[i];
    if (!reviewOverrides || !base.reviews) return base;
    return {
      ...base,
      reviews: base.reviews.map((r, rIdx) =>
        reviewOverrides[rIdx] !== undefined ? { ...r, brandResponse: reviewOverrides[rIdx] } : r
      ),
    };
  });

  const handlePublish = (campaignData) => {
    const newCampaign = {
      ...campaignData,
      id: Date.now(),
      createdAt: new Date().toISOString(),
      stage: "open",
      spotsFilled: 0,
      creators: { pending: [], approved: [] },
    };
    // Show onboarding first if this is their first campaign
    if (myCampaigns.length === 0) {
      setPendingCampaign(newCampaign);
      setView("onboarding");
    } else {
      setMyCampaigns(prev => [newCampaign, ...prev]);
      setView("dashboard");
    }
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
  const handleUpdateReview = (campaign, reviewIdx, responseText) => {
    const demoIdx = DEMO_CAMPAIGNS.findIndex(d => d.brand === campaign.brand && d.campaign === campaign.campaign);
    if (demoIdx >= 0) {
      setDemoCampaignReviewOverrides(prev => ({
        ...prev,
        [demoIdx]: { ...(prev[demoIdx] || {}), [reviewIdx]: responseText },
      }));
    } else {
      setMyCampaigns(prev => prev.map(c => {
        if (c.brand !== campaign.brand || c.campaign !== campaign.campaign) return c;
        const reviews = (c.reviews || []).map((r, i) => i === reviewIdx ? { ...r, brandResponse: responseText } : r);
        return { ...c, reviews };
      }));
    }
  };

  const handleSignIn = (email, name) => {
    setUser({ email, name });
    if (signInRedirect) {
      setSelectedCampaign(signInRedirect);
      setSignInRedirect(null);
      setView("detail");
    } else {
      setView("dashboard");
    }
  };

  const handleSignOut = () => {
    setUser(null);
    setView("landing");
  };

  const handleCreatorSignIn = (email, name) => {
    setCreatorUser({ email, name });
    setCreatorProfile(prev => ({ ...prev, name: prev.name || name }));
    setView("creatordashboard");
  };

  const handleCreatorSignOut = () => {
    setCreatorUser(null);
    setView("landing");
  };

  const handleApply = (campaign, applicationData) => {
    const key = campaign.brand + "::" + campaign.campaign;
    setAppliedCampaigns(prev => [...prev, key]);
    // If it's a demo campaign, update the override
    const demoIdx = DEMO_CAMPAIGNS.findIndex(d => d.brand === campaign.brand && d.campaign === campaign.campaign);
    if (demoIdx >= 0) {
      setDemoCampaignOverrides(prev => {
        const existing = prev[demoIdx] || {};
        const existingCreators = existing.creators || DEMO_CAMPAIGNS[demoIdx].creators || { pending: [], approved: [] };
        return {
          ...prev,
          [demoIdx]: {
            ...existing,
            creators: {
              ...existingCreators,
              pending: [...(existingCreators.pending || []), applicationData],
            },
          },
        };
      });
    }
    // If it's a user campaign, update myCampaigns
    const userIdx = myCampaigns.findIndex(c => c.brand === campaign.brand && c.campaign === campaign.campaign);
    if (userIdx >= 0) {
      setMyCampaigns(prev => prev.map((c, i) => {
        if (i !== userIdx) return c;
        return { ...c, creators: { ...c.creators, pending: [...(c.creators?.pending || []), applicationData] } };
      }));
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

  if (view === "signin") return <SignIn onSignIn={handleSignIn} onBack={() => setView("landing")} />;
  if (view === "creatorsignin") return <CreatorSignIn onSignIn={handleCreatorSignIn} onBack={() => setView("landing")} onSignUp={() => setView("creatoronboarding")} />;
  if (view === "creatoronboarding") return <CreatorOnboarding onBack={() => setView("creatorsignin")} onComplete={(email, name, profileData) => { handleCreatorSignIn(email, name); setCreatorProfile(prev => ({ ...prev, ...profileData })); }} />;
  if (view === "creatordashboard") return <CreatorDashboard user={creatorUser} appliedCampaigns={creatorApplied} activeCampaigns={creatorActive} uploads={creatorUploads} onSignOut={handleCreatorSignOut} onBack={() => setView("landing")} creatorProfile={creatorProfile} onEditProfile={(form) => setCreatorProfile(prev => ({ ...prev, ...form, platforms: { Instagram: form.instagram, TikTok: form.tiktok, YouTube: form.youtube } }))} onUpload={(upload) => setCreatorUploads(prev => [upload, ...prev])} onSelectCampaign={(c) => { setSelectedCampaign(mergedDemos.find(d => d.brand === c.brand && d.campaign === c.campaign) || c); setDetailSource("landing"); setView("detail"); }} />;
  if (view === "onboarding") return <OnboardingPage onDone={handleOnboardingDone} />;
  if (view === "reviews") return <ReviewsPage campaigns={myCampaigns} demoCampaigns={mergedDemos} onBack={() => setView("dashboard")} onUpdateReview={handleUpdateReview} />;
  if (view === "dashboard") return <Dashboard user={user} campaigns={myCampaigns} demoCampaigns={mergedDemos} onBack={() => setView("landing")} onSignOut={handleSignOut} onNewCampaign={() => setView("builder")} onSelectCampaign={(c) => { setSelectedCampaign(c); setDetailSource("dashboard"); setView("detail"); }} onEditCampaign={(c) => { setSelectedCampaign(c); setView("edit"); }} onViewReviews={handleViewReviews} lastReviewsVisitedAt={lastReviewsVisitedAt} />;
  if (view === "builder") return <CampaignBuilder onBack={() => user ? setView("dashboard") : setView("landing")} onPublish={handlePublish} />;
  if (view === "edit" && selectedCampaign) return <CampaignEditor campaign={selectedCampaign} onBack={() => setView("dashboard")} onSave={(updated) => {
    setMyCampaigns(prev => prev.map(c => c.id === updated.id ? updated : c));
    setView("dashboard");
  }} />;
  if (view === "brandprofile") return <BrandProfile brand={selectedBrand} allCampaigns={mergedDemos} onBack={() => setView("browse")} onSelectCampaign={(c) => { setSelectedCampaign(c); setDetailSource("browse"); setView("detail"); }} appliedCampaigns={appliedCampaigns} onApplyClick={(c) => { setSelectedCampaign(c); setAutoApply(true); setView("detail"); }} />;
  if (view === "browse") return <BrowseCampaigns onBack={() => setView("landing")} onSelectCampaign={(c) => { setSelectedBrand(c.brand); setView("brandprofile"); }} appliedCampaigns={appliedCampaigns} />;
  if (view === "messages" && selectedCampaign && messageCreator) {
    const key = getMessageKey(selectedCampaign, messageCreator);
    return <Messages
      campaign={selectedCampaign}
      creatorName={messageCreator}
      messages={allMessages[key] || []}
      onSend={handleSendMessage}
      onBack={() => setView(messageReturnView)}
      isBrand={true}
    />;
  }
  if (view === "inbox" && selectedCampaign) {
    const convs = getConversationsForCampaign(selectedCampaign);
    return <MessageInbox
      conversations={convs}
      campaign={selectedCampaign}
      onSelectThread={(conv) => handleOpenMessage(selectedCampaign, conv.creatorName, "inbox")}
      onBack={() => setView(messageReturnView)}
    />;
  }
  if (view === "detail" && selectedCampaign) {
    const isOwnCampaign = myCampaigns.some(c => c.id === selectedCampaign.id);
    const isDemoFromDashboard = user && DEMO_CAMPAIGNS.some(d => d.brand === selectedCampaign.brand && d.campaign === selectedCampaign.campaign) && detailSource === "dashboard";
    const isOwner = isOwnCampaign || isDemoFromDashboard;
    return <CampaignDetail campaign={selectedCampaign} onBack={() => { setAutoApply(false); user ? setView(detailSource === "dashboard" ? "dashboard" : "landing") : setView("landing"); }} isOwner={isOwner} user={user} onApply={handleApply} onSignInRedirect={handleSignInRedirect} appliedCampaigns={appliedCampaigns} onOpenMessage={(creatorName) => handleOpenMessage(selectedCampaign, creatorName, "detail")} onOpenInbox={() => handleOpenInbox(selectedCampaign, "detail")} messageCount={getConversationsForCampaign(selectedCampaign).filter(c => c.messages.length > 0).length} autoApply={autoApply} onEditCampaign={(c) => { setSelectedCampaign(c); setView("edit"); }} />;
  }

  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(circle at calc(46% + 250px) calc(58% - 175px), rgba(255,255,255,.103) 0%, rgba(255,255,255,.0309) 38%, transparent 52%), linear-gradient(180deg, #040b15 0%, #070f1f 100%)", backgroundColor: "#040b15", color: "#fff", fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <style>{`
        @font-face {
          font-family: 'Monda';
          src: url('/assets/Monda-Regular.woff') format('woff');
          font-weight: 400 700;
          font-style: normal;
          font-display: swap;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
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
      `}</style>
      {/* Header */}
      <div style={{ width: "100%", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", textShadow: "0 1px 3px rgba(0,0,0,.35)", fontFamily: "'Monda', system-ui, sans-serif" }}>
        <div style={{ fontWeight: 600, letterSpacing: "-.01em", fontSize: "1.1rem", color: "#fff", cursor: "pointer" }} onClick={() => setView("landing")}>nfluence</div>
        <div style={{ display: "flex", gap: 18, fontSize: ".9rem", opacity: .85 }}>
          <a href="https://nfluenceagency.com/" style={{ color: "#fff", textDecoration: "none" }}>home</a>
          <span style={{ color: "#fff", cursor: "pointer" }} onClick={() => setView("landing")}>campaigns</span>
          <a href="https://nfluenceagency.com/contact.html" style={{ color: "#fff", textDecoration: "none" }}>contact</a>
          {user ? (
            <span style={{ color: "#fff", cursor: "pointer", borderLeft: "1px solid rgba(255,255,255,.2)", paddingLeft: 18 }} onClick={() => setView("dashboard")}>dashboard</span>
          ) : creatorUser ? (
            <span style={{ color: "#fff", cursor: "pointer", borderLeft: "1px solid rgba(255,255,255,.2)", paddingLeft: 18 }} onClick={() => setView("creatordashboard")}>dashboard</span>
          ) : (
            <span style={{ color: "#fff", cursor: "pointer", borderLeft: "1px solid rgba(255,255,255,.2)", paddingLeft: 18 }} onClick={() => setView("signin")}>sign in</span>
          )}
        </div>
      </div>

      {/* Hero */}
      <div style={{ textAlign: "center", padding: "50px 24px 20px", maxWidth: 700, margin: "0 auto" }}>
        <h1 style={{ fontFamily: "'Monda', system-ui, sans-serif", fontSize: "clamp(1.8rem, 5vw, 2.8rem)", fontWeight: 600, lineHeight: 1.2, margin: 0 }}>
          launch <span style={{ color: "rgba(255,255,255,.5)" }}>creator campaigns</span><br />that run on autopilot
        </h1>
        <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 32, flexWrap: "wrap" }}>
          <button onClick={() => setView("builder")} className="nf-cta-btn" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 180, padding: "14px 28px", borderRadius: 16, fontFamily: "'Monda', system-ui, sans-serif", textTransform: "lowercase", fontSize: ".99rem", background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.28)", backdropFilter: "blur(20px)", color: "#fff", cursor: "pointer", boxShadow: "0 10px 28px rgba(0,0,0,.25)" }}>
            start a campaign
          </button>
          <button onClick={() => setView(creatorUser ? "creatordashboard" : "creatorsignin")} className="nf-cta-btn" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 180, padding: "14px 28px", borderRadius: 16, fontFamily: "'Monda', system-ui, sans-serif", textTransform: "lowercase", fontSize: ".99rem", background: "transparent", border: "1px solid rgba(255,255,255,.18)", color: "#fff", cursor: "pointer" }}>
            i'm a creator
          </button>
        </div>
      </div>

      {/* Divider */}
      <div style={{ width: "min(58%, 520px)", height: 1, background: "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,.15) 50%, rgba(255,255,255,0) 100%)", opacity: .6, margin: "20px auto 32px" }} />

      {/* Open Campaigns */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px 80px" }}>
        <h2 style={{ fontFamily: "'Monda', system-ui, sans-serif", fontSize: "1.4rem", textAlign: "center", marginBottom: 28, fontWeight: 600 }}>featured campaigns</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {mergedDemos.map((c, i) => {
            const isApplied = appliedCampaigns.includes(c.brand + "::" + c.campaign);
            return (
            <div key={i} className="nf-campaign-card" onClick={() => { setSelectedCampaign(mergedDemos[i]); setDetailSource("landing"); setView("detail"); }}>
              {/* Product image area */}
              <div style={{ position: "relative" }}>
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
              <div style={{ padding: "12px 16px 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                {/* Brand + campaign name — left, pushed down to clear logo */}
                <div style={{ paddingTop: 34 }}>
                  <div className={c.featured ? "nf-featured-name" : ""} style={{ fontSize: "1.7rem", fontWeight: 700, color: c.featured ? undefined : "#fff", lineHeight: 1.15 }}>{c.brand}</div>
                  <div style={{ fontSize: "1.05rem", opacity: .5, marginTop: 4 }}>{c.campaign}</div>
                </div>
                {/* Spots + available for — right */}
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
                      {c.comp.startsWith("$") ? c.comp : c.comp}
                      {c.compType === "product+paid" ? <span style={{ fontSize: ".85rem", fontWeight: 400, opacity: .45, marginLeft: 4 }}>+ product</span> : ""}
                    </div>
                  </div>
                  {isApplied ? (
                    <div style={{ padding: "8px 16px", borderRadius: 12, border: "1px solid rgba(100,255,150,.2)", fontSize: ".85rem", fontWeight: 600, color: "rgba(100,255,150,.8)", display: "flex", alignItems: "center", gap: 6 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(100,255,150,.85)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      applied
                    </div>
                  ) : (
                    <div className="nf-apply-btn" onClick={e => { e.stopPropagation(); setAutoApply(true); setSelectedCampaign(mergedDemos[i]); setDetailSource("landing"); setView("detail"); }} style={{ padding: "10px 24px", borderRadius: 12, border: "1px solid rgba(255,255,255,.3)", fontSize: ".95rem", fontWeight: 600, color: "#fff" }}>apply</div>
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



