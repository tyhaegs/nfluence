// ── OnboardingPage ──

function OnboardingPage({ onDone }) {
  const [agreed, setAgreed] = useState(false);

  const rules = [
    {
      icon: "🚀",
      title: "your campaign is live",
      body: "it's been pushed to our network of 5,000+ creators via email blasts and social promotion. creators who meet your requirements can apply immediately.",
    },
    {
      icon: "⏱",
      title: "ship within 3 business days of approving a creator",
      body: "once you approve a creator, a 3-business-day clock starts. ship their product and enter a tracking number before it runs out. your dashboard will flag overdue shipments — and slow delivery can show up in creator reviews of your brand, which are public.",
    },
    {
      icon: "📋",
      title: "you control the pipeline",
      body: "creators move through stages: accepted → product shipped → content submitted → content approved → paid. you advance each creator manually as things happen. on paid campaigns, funds are held in escrow and released when you mark content as approved.",
    },
    {
      icon: "✏️",
      title: "you can edit your campaign anytime",
      body: "most fields — name, description, banner, deadline, creator cap, location, requirements, products — are always editable. featured placement can be added or removed at any time. platforms, deliverables, and compensation type lock once a creator has been accepted. you can upgrade compensation but never reduce it.",
    },
    {
      icon: "⭐",
      title: "your reputation matters",
      body: "creators leave public reviews of brands they've worked with. brands that communicate clearly, ship on time, and pay promptly attract better creators and fill campaigns faster. treat your creators well.",
    },
    {
      icon: "💡",
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
        {/* Header */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ fontFamily: "'Monda', system-ui, sans-serif", fontSize: ".85rem", opacity: .4, marginBottom: 10, textTransform: "lowercase", letterSpacing: ".04em" }}>campaign published</div>
          <h1 style={{ fontFamily: "'Monda', system-ui, sans-serif", fontSize: "2rem", fontWeight: 700, lineHeight: 1.2, marginBottom: 10 }}>before you head to your dashboard</h1>
          <p style={{ fontSize: "1rem", opacity: .5, lineHeight: 1.65 }}>here's what you need to know to run a successful campaign on nfluence.</p>
        </div>

        {/* Rules */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
          {rules.map((r, i) => (
            <div key={i} className="nf-onboard-card">
              <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                <div style={{ fontSize: "1.3rem", flexShrink: 0, marginTop: 1 }}>{r.icon}</div>
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
    <div style={{ minHeight: "100vh", background: "radial-gradient(circle at calc(46% + 250px) calc(58% - 175px), rgba(255,255,255,.103) 0%, rgba(255,255,255,.0309) 38%, transparent 52%), linear-gradient(180deg, #040b15 0%, #070f1f 100%)", backgroundColor: "#040b15", color: "#fff", fontFamily: "system-ui, -apple-system, sans-serif" }}>
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
        <div style={{ width: "100%", height: 280, background: "#0c1424", overflow: "hidden", borderRadius: 16 }}>
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
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "64px 28px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: "2rem", fontWeight: 700, fontFamily: "'Monda', system-ui, sans-serif", marginBottom: 4 }}>{brand}</div>
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
          {meta.location && <span>📍 {meta.location}</span>}
          {meta.website && <span>🌐 {meta.website}</span>}
          {meta.founded && <span>📅 est. {meta.founded}</span>}
          {meta.totalCampaigns && <span>🎯 {meta.totalCampaigns} campaigns run</span>}
          {meta.totalCreators && <span>👥 {meta.totalCreators.toLocaleString()} creators worked with</span>}
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
                  <div className="nf-gold-shimmer" style={{ fontSize: "3.5rem", fontWeight: 700, fontFamily: "'Monda', system-ui, sans-serif", lineHeight: 1 }}>{avgRating.toFixed(1)}</div>
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

function BrowseCampaigns({ onBack, onSelectCampaign, onApplyClick, appliedCampaigns = [] }) {
  const [search, setSearch] = useState("");
  const [filterPlatform, setFilterPlatform] = useState("All");
  const [filterComp, setFilterComp] = useState("All");
  const [filterTier, setFilterTier] = useState("Any");
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
    return DEMO_CAMPAIGNS.filter(c => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const haystack = `${c.brand} ${c.campaign} ${c.description} ${c.location}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (filterPlatform !== "All" && !c.platforms.includes(filterPlatform)) return false;
      if (filterComp !== "All" && c.compType !== filterComp) return false;
      if (filterTier !== "Any") {
        const tierOrder = ["Any", "5k+", "10k+", "25k+", "50k+", "100k+", "250k+", "500k+", "1M+"];
        const campaignIdx = tierOrder.indexOf(c.following);
        const filterIdx = tierOrder.indexOf(filterTier);
        if (campaignIdx === -1 || campaignIdx > filterIdx) return false;
      }
      if (filterIndustry !== "All") {
        const inds = getIndustries(c);
        if (!inds.includes(filterIndustry)) return false;
      }
      return true;
    });
  }, [search, filterPlatform, filterComp, filterTier, filterIndustry]);

  const hasActiveFilters = search.trim() || filterPlatform !== "All" || filterComp !== "All" || filterTier !== "Any" || filterIndustry !== "All";
  const clearAll = () => { setSearch(""); setFilterPlatform("All"); setFilterComp("All"); setFilterTier("Any"); setFilterIndustry("All"); };

  const pillBtn = (active, onClick, label) => (
    <button onClick={onClick} style={{
      padding: "6px 14px", borderRadius: 20, border: `1px solid ${active ? "rgba(255,255,255,.5)" : "rgba(255,255,255,.12)"}`,
      background: active ? "rgba(255,255,255,.12)" : "rgba(255,255,255,.04)",
      color: "#fff", fontSize: ".82rem", cursor: "pointer", fontFamily: "system-ui, sans-serif",
      opacity: active ? 1 : 0.65, transition: "all .15s", whiteSpace: "nowrap",
    }}>{label}</button>
  );

  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(circle at 70% 20%, rgba(255,255,255,.06) 0%, transparent 55%), linear-gradient(180deg, #040b15 0%, #070f1f 100%)", color: "#fff", fontFamily: "system-ui, sans-serif" }}>
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
        .nf-awaiting-tile { border: 1px solid rgba(255,140,30,.25); animation: nf-border-shimmer 2.5s ease-in-out infinite; }
      `}</style>

      {/* Header */}
      <div style={{ width: "100%", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", fontFamily: "'Monda', system-ui, sans-serif" }}>
        <div style={{ fontWeight: 600, fontSize: "1.1rem", color: "#fff", cursor: "pointer" }} onClick={onBack}>nfluence</div>
        <div style={{ cursor: "pointer", opacity: .5, fontSize: ".85rem" }} onClick={onBack}>← back</div>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "16px 24px 80px" }}>
        <h1 style={{ fontFamily: "'Monda', system-ui, sans-serif", fontSize: "1.8rem", fontWeight: 700, marginBottom: 6 }}>open campaigns</h1>
        <p style={{ opacity: .4, fontSize: ".9rem", marginBottom: 28 }}>find your next brand deal</p>

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
            <div className="nf-filter-scroll">{FOLLOWER_TIERS.map(t => pillBtn(filterTier === t, () => setFilterTier(t), t === "Any" ? "any" : t))}</div>
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
            <div style={{ fontSize: "2rem", marginBottom: 12 }}>🔍</div>
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
    <div style={{ minHeight: "100vh", background: "radial-gradient(circle at calc(46% + 250px) calc(58% - 175px), rgba(255,255,255,.103) 0%, rgba(255,255,255,.0309) 38%, transparent 52%), linear-gradient(180deg, #040b15 0%, #070f1f 100%)", backgroundColor: "#040b15", color: "#fff", fontFamily: "system-ui, -apple-system, sans-serif", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{`
        .nf-signin-input { border-radius: 12px; border: 1px solid rgba(255,255,255,.18); background: rgba(0,0,0,.35); color: #fff; padding: 14px 16px; font-size: .95rem; width: 100%; outline: none; font-family: system-ui, -apple-system, sans-serif; transition: border-color .12s, box-shadow .12s, background .12s; }
        .nf-signin-input::placeholder { color: rgba(255,255,255,.4); }
        .nf-signin-input:focus { border-color: #fff; box-shadow: 0 0 0 1px rgba(255,255,255,.2); background: rgba(0,0,0,.5); }
        .nf-signin-btn { width: 100%; padding: 14px 24px; border-radius: 14px; border: 1px solid rgba(255,255,255,.28); background: rgba(255,255,255,.08); backdrop-filter: blur(20px); color: #fff; font-size: 1rem; font-family: 'Monda', system-ui, sans-serif; text-transform: lowercase; cursor: pointer; transition: all .12s; box-shadow: 0 10px 28px rgba(0,0,0,.25); }
        .nf-signin-btn:hover:not(:disabled) { transform: translateY(-2px); border-color: rgba(255,255,255,.45); background: rgba(255,255,255,.12); }
        .nf-signin-btn:disabled { opacity: .3; cursor: not-allowed; }
      `}</style>
      <div style={{ width: "100%", maxWidth: 400, padding: "0 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 12 }}>
          <div style={{ fontFamily: "'Monda', system-ui, sans-serif", fontSize: "2.2rem", fontWeight: 700, marginBottom: 32, marginTop: "-40px" }}>nfluence</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 600, fontFamily: "'Monda', system-ui, sans-serif", marginBottom: 20 }}>sign in</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <input className="nf-signin-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email" />
          <input className="nf-signin-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="password" />
          <div style={{ display: "flex", gap: 12 }}>
            <button className="nf-signin-btn" style={{ flex: 1 }} onClick={onBack}>back</button>
            <button className="nf-signin-btn" style={{ flex: 1 }} disabled={!isValid} onClick={() => onSignIn(email, email.split("@")[0])}>sign in</button>
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
      instagramFollowers: platforms.followers["Instagram"] || "",
      tiktokFollowers: platforms.followers["TikTok"] || "",
      youtubeFollowers: platforms.followers["YouTube"] || "",
      rating: null,
    };
    onComplete(account.email, account.name, profileData);
  };

  const NICHE_OPTIONS = ["fitness & training", "wellness & supplements", "beauty & skincare", "fashion & apparel", "outdoors & adventure", "health & nutrition", "tech & gadgets", "gaming", "lifestyle & home", "food & beverage", "coffee & energy", "sports equipment", "travel", "pets", "automotive", "finance & investing", "education & coaching"];
  const [selectedNiches, setSelectedNiches] = useState([]);
  const toggleNiche = (n) => {
    setSelectedNiches(prev => prev.includes(n) ? prev.filter(x => x !== n) : [...prev, n]);
    setProfile(p => {
      const current = selectedNiches.includes(n) ? selectedNiches.filter(x => x !== n) : [...selectedNiches, n];
      return { ...p, niches: current.join(", ") };
    });
  };

  return (
    <div ref={containerRef} style={{ minHeight: "100vh", background: "radial-gradient(circle at calc(46% + 250px) calc(58% - 175px), rgba(255,255,255,.103) 0%, rgba(255,255,255,.0309) 38%, transparent 52%), linear-gradient(180deg, #040b15 0%, #070f1f 100%)", backgroundColor: "#040b15", color: "#fff", fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
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
      <div style={{ width: "100%", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", fontFamily: "'Monda', system-ui, sans-serif" }}>
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

function CreatorDashboard({ user, appliedCampaigns, activeCampaigns, uploads, onSignOut, onBack, onUpload, onEditProfile, creatorProfile, onSelectCampaign }) {
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
    <div style={{ minHeight: "100vh", overflowX: "hidden", background: "radial-gradient(circle at calc(46% + 250px) calc(58% - 175px), rgba(255,255,255,.103) 0%, rgba(255,255,255,.0309) 38%, transparent 52%), linear-gradient(180deg, #040b15 0%, #070f1f 100%)", backgroundColor: "#040b15", color: "#fff", fontFamily: "system-ui, -apple-system, sans-serif" }}>
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
      <div style={{ width: "100%", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", fontFamily: "'Monda', system-ui, sans-serif" }}>
        <div style={{ fontWeight: 600, fontSize: "1.1rem", cursor: "pointer" }} onClick={onBack}>nfluence</div>
        <div style={{ display: "flex", gap: 18, fontSize: ".9rem", opacity: .85, alignItems: "center" }}>
          <span style={{ color: "#fff", cursor: "pointer" }} onClick={onBack}>campaigns</span>
          <span style={{ color: "rgba(255,255,255,.3)" }}>·</span>
          <span style={{ color: "#fff", cursor: "pointer" }} onClick={onSignOut}>sign out</span>
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "20px 24px 100px" }}>

        {/* Profile card */}
        <div style={{ marginBottom: 24 }}>
          {/* Banner */}
          <div style={{ width: "100%", position: "relative" }}>
            <div style={{ width: "100%", height: 300, borderRadius: 16, overflow: "hidden", background: creatorProfile.bannerUrl ? undefined : "linear-gradient(135deg, rgba(100,80,255,.25), rgba(255,80,160,.15))" }}>
              {creatorProfile.bannerUrl && <img src={creatorProfile.bannerUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />}
            </div>
            {/* Avatar */}
            <div style={{ position: "absolute", bottom: -55, left: 28, width: 110, height: 110, borderRadius: "50%", border: "4px solid rgba(255,255,255,.15)", background: "#0c1424", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem", fontWeight: 700 }}>
              {creatorProfile.avatarUrl ? <img src={creatorProfile.avatarUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" /> : (creatorProfile.name || "T").charAt(0).toUpperCase()}
            </div>
          </div>
          {/* Name + bio + edit button */}
          <div style={{ paddingTop: 68, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ fontSize: "2rem", fontWeight: 700, fontFamily: "'Monda', system-ui, sans-serif", textTransform: "lowercase", letterSpacing: "-.01em" }}>{creatorProfile.name || user?.name || "your name"}</div>
              {/* Location · age · languages */}
              {(creatorProfile.location || creatorProfile.age || creatorProfile.languages) && (
                <div style={{ display: "flex", gap: 10, marginTop: 6, flexWrap: "wrap", alignItems: "center" }}>
                  {creatorProfile.location && <span style={{ fontSize: ".88rem", opacity: .5 }}>📍 {creatorProfile.location}</span>}
                  {creatorProfile.age && <span style={{ fontSize: ".88rem", opacity: .5 }}>· {creatorProfile.age} yrs</span>}
                  {creatorProfile.languages && <span style={{ fontSize: ".88rem", opacity: .5 }}>· {creatorProfile.languages}</span>}
                </div>
              )}
              {/* Rating + completed campaigns */}
              {activeCampaigns.filter(c => c.myStage === "paid").length > 0 || creatorProfile.rating ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
                  <span style={{ color: "#fbbf24", fontSize: ".95rem" }}>{'★'.repeat(Math.round(creatorProfile.rating || 5))}{'☆'.repeat(5 - Math.round(creatorProfile.rating || 5))}</span>
                  <span style={{ fontSize: ".85rem", opacity: .5 }}>{creatorProfile.rating || "5.0"} · {appliedCampaigns.filter(c => c.status === "accepted").length} campaign{appliedCampaigns.filter(c => c.status === "accepted").length !== 1 ? "s" : ""} completed</span>
                </div>
              ) : null}
              {/* Niche tags */}
              {creatorProfile.niches && (
                <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                  {creatorProfile.niches.split(",").map(n => n.trim()).filter(Boolean).map(n => (
                    <div key={n} style={{ fontSize: ".72rem", padding: "3px 10px", borderRadius: 20, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", opacity: .65 }}>{n}</div>
                  ))}
                </div>
              )}
              {/* Bio */}
              {creatorProfile.bio && <div style={{ fontSize: ".95rem", opacity: .5, marginTop: 8, maxWidth: 480, lineHeight: 1.6 }}>{creatorProfile.bio}</div>}
              {/* Platform handles with verified badges */}
              {Object.entries({ Instagram: [creatorProfile.instagram, creatorProfile.instagramFollowers], TikTok: [creatorProfile.tiktok, creatorProfile.tiktokFollowers], YouTube: [creatorProfile.youtube, creatorProfile.youtubeFollowers] }).filter(([,v]) => v[0]).length > 0 && (
                <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                  {Object.entries({ Instagram: [creatorProfile.instagram, creatorProfile.instagramFollowers], TikTok: [creatorProfile.tiktok, creatorProfile.tiktokFollowers], YouTube: [creatorProfile.youtube, creatorProfile.youtubeFollowers] }).filter(([,v]) => v[0]).map(([plat, [handle, count]]) => (
                    <div key={plat} style={{ fontSize: ".75rem", padding: "3px 12px", borderRadius: 20, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", opacity: .75, display: "flex", alignItems: "center", gap: 5 }}>
                      {plat} · {handle}{count ? ` · ${count}` : ""}
                      <span style={{ fontSize: ".6rem", padding: "1px 5px", borderRadius: 8, background: "rgba(255,200,60,.08)", border: "1px solid rgba(255,200,60,.18)", color: "rgba(255,200,60,.6)" }}>unverified</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button className="nf-creator-btn" onClick={() => { setEditForm({ ...creatorProfile }); setShowEditModal(true); }}>✏ edit profile</button>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
          {[
            { label: "active campaigns", value: activeCampaigns.length, onClick: () => setShowActiveModal(true) },
            { label: "pending campaigns", value: appliedCampaigns.filter(c => c.status === "applied").length, onClick: () => setShowPendingModal(true) },
            { label: "completed campaigns", value: appliedCampaigns.filter(c => c.status === "accepted").length, onClick: () => setShowCompletedModal(true) },
          ].map((s, i) => (
            <div key={i} className="nf-creator-card" style={{ padding: "18px 20px", textAlign: "center", cursor: "pointer" }} onClick={s.onClick}>
              <div style={{ fontSize: ".72rem", opacity: .35, marginBottom: 8, textTransform: "lowercase" }}>{s.label}</div>
              <div style={{ fontSize: "2rem", fontWeight: 700, fontFamily: "'Monda', system-ui, sans-serif" }}>{s.value}</div>
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
                      <div style={{ width: 44, height: 44, borderRadius: "50%", overflow: "hidden", border: "1px solid rgba(255,255,255,.12)", flexShrink: 0, background: "#0c1424", display: "flex", alignItems: "center", justifyContent: "center" }}>
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
                      <button className="nf-creator-btn" style={{ display: "flex", alignItems: "center", gap: 6 }} onClick={e => { e.stopPropagation(); }}>
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

      </div>

      {/* Active campaigns modal */}
      {showActiveModal && (
        <div onClick={() => setShowActiveModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
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
        <div onClick={() => setShowCompletedModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
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
        <div onClick={() => setShowPendingModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
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
        <div onClick={() => setShowUploadModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
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

      {/* Edit profile modal */}
      {showEditModal && (
        <div onClick={() => setShowEditModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
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
              {/* Platforms */}
              <div style={{ fontSize: ".7rem", opacity: .3, textTransform: "uppercase", letterSpacing: ".08em", marginTop: 4 }}>platforms</div>
              <div style={{ fontSize: ".72rem", opacity: .3, marginTop: -8 }}>follower counts are self-reported — verification coming soon</div>
              {[["instagram", "Instagram handle", "instagramFollowers", "followers"], ["tiktok", "TikTok handle", "tiktokFollowers", "followers"], ["youtube", "YouTube channel", "youtubeFollowers", "subscribers"]].map(([handleField, handlePlaceholder, countField, countLabel]) => (
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

