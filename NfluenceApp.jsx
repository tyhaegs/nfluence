// ═══════════════════════════════════════════════

let _sbClient = null;
if (typeof window !== 'undefined') console.log('[supabase config]', { SUPABASE_URL: !!window.SUPABASE_URL, SUPABASE_ANON_KEY: !!window.SUPABASE_ANON_KEY });
function getSB() {
  if (_sbClient) return _sbClient;
  if (typeof window === 'undefined' || !window.supabase || !window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) return null;
  _sbClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
  return _sbClient;
}

// When email confirmation is enabled, signUp() returns no session, so the authenticated
// profiles upsert can't run yet. Stash the onboarding fields locally and replay the upsert
// on first successful sign-in (B1). The password is NEVER stashed.
const PENDING_PROFILE_KEY = 'nf_pending_profile';
function stashPendingProfile(payload) {
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
  const initialHashView = (typeof window !== "undefined" && ["faq", "browse", "signin", "creatorsignin", "signupchoice", "brandonboarding", "creatoronboarding"].includes(window.location.hash.replace("#", ""))) ? window.location.hash.replace("#", "") : "landing";
  const [view, setView] = useState(initialHashView); // landing | builder | browse | detail | brandprofile | signin | dashboard | messages | inbox | onboarding | reviews | creatordashboard | creatorinbox | creatormessages | creatorprofile | notifications | faq
  const [showLandingMenu, setShowLandingMenu] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState("Nike");
  const [pendingCampaign, setPendingCampaign] = useState(null);
  const [selectedCampaign, setSelectedCampaign] = useState(DEMO_CAMPAIGNS[0]);
  const [user, setUser] = useState(null); // { email, name }
  const [authSession, setAuthSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [confirmEmailInfo, setConfirmEmailInfo] = useState(null); // { role, email } while awaiting email confirmation
  const [pendingBuilderView, setPendingBuilderView] = useState(null); // 'builder'|'gigbuilder' to resume after sign-in
  const [myCampaigns, setMyCampaigns] = useState([]);
  const [appliedCampaigns, setAppliedCampaigns] = useState([]); // ["Brand::Campaign", ...]
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

  const markAllNotifsRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  const markNotifRead = (id) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));

  // ── Supabase: session persistence on page load ──
  // When the app loads, check if the user already has a session.
  // If so, restore their state without requiring them to sign in again.
  useEffect(() => {
    console.log("[auth] mount effect running");
    const sb = getSB();
    if (!sb) return; // not wired yet — demo mode

    const channelRef = { current: null };

    console.log('[auth] getSession() — calling on mount');
    sb.auth.getSession().then(({ data: { session }, error }) => {
      console.log("[auth] getSession result:", { hasSession: !!session, userId: session?.user?.id, error: error?.message });
      console.log('[auth] getSession() result:', { hasSession: !!session, userId: session?.user?.id, role: session?.user?.user_metadata?.role });
      if (!session) { setAuthLoading(false); return; }
      setAuthSession(session);
      setAuthLoading(false);
      const u = session.user;
      const role = u.user_metadata?.role;
      const name = u.user_metadata?.name || u.email;

      const BRAND_AUTH_VIEWS = ["dashboard", "browse", "inbox", "messages", "detail", "edit", "builder", "gigbuilder", "reviews", "notifications", "brandprofile", "creatorprofile", "faq"];
      const CREATOR_AUTH_VIEWS = ["creatordashboard", "creatorinbox", "creatormessages", "creatorprofile", "browse", "detail", "notifications", "faq"];
      let persistedView = null;
      try { persistedView = localStorage.getItem("nf_last_view"); } catch (e) {}

      if (role === 'brand') {
        setUser({ id: u.id, email: u.email, name });
        // Load extended brand profile fields and merge into user
        sb.from('profiles')
          .select('*')
          .eq('id', u.id)
          .single()
          .then(({ data: p }) => {
            if (!p) return;
            setUser(prev => ({
              ...prev,
              name: p.name || prev?.name,
              email: p.email || prev?.email,
              phone: p.phone,
              location: p.location,
              city: p.city,
              state: p.state,
              country: p.country,
              website: p.website,
              industry: p.industry,
              bio: p.bio,
              tagline: p.tagline,
              logoUrl: p.logo_url || p.logoUrl,
              bannerUrl: p.banner_url || p.bannerUrl,
              socialLinks: p.social_links || p.socialLinks || prev?.socialLinks,
            }));
          });
        // Load brand's campaigns from Supabase (join applications for creator management)
        sb.from('campaigns')
          .select('*, profiles!brand_id(logo_url, banner_url, social_links), applications(id, status, stage, name, pitch, portfolio, platforms, tracking_number)')
          .eq('brand_id', u.id)
          .order('created_at', { ascending: false })
          .then(({ data }) => {
            if (data) setMyCampaigns(data.map(c => {
              const mkCreator = (a) => ({
                applicationId: a.id,
                name: a.name || '',
                avatar: (a.name || '').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?',
                platforms: a.platforms || {},
                pitch: a.pitch || '',
                portfolio: a.portfolio || '',
                stage: a.stage || 'applied',
                trackingNumber: a.tracking_number || null,
              });
              return {
                ...c,
                logoUrl: c.logo_url || c.profiles?.logo_url || null,
                bannerUrl: c.banner_url || c.profiles?.banner_url || null,
                socialLinks: c.profiles?.social_links || null,
                creators: {
                  pending: (c.applications || []).filter(a => a.status === 'applied').map(mkCreator),
                  approved: (c.applications || []).filter(a => a.status === 'accepted').map(mkCreator),
                },
              };
            }));
          });
        // Load notifications
        sb.from('notifications')
          .select('*')
          .eq('user_id', u.id)
          .order('created_at', { ascending: false })
          .limit(50)
          .then(({ data }) => { if (data) setNotifications(data); });
        // Subscribe to new notifications in real-time
        channelRef.current = sb.channel(`notifications:${u.id}`)
          .on('postgres_changes', {
            event: 'INSERT', schema: 'public', table: 'notifications',
            filter: `user_id=eq.${u.id}`,
          }, ({ new: notif }) => {
            setNotifications(prev => [notif, ...prev]);
            setToastMessage(notif.title);
            setShowToast(true);
          })
          .subscribe();

        if (view === "landing") {
          if (persistedView && BRAND_AUTH_VIEWS.includes(persistedView)) setView(persistedView);
          else setView("dashboard");
        }

      } else if (role === 'creator') {
        setCreatorUser({ id: u.id, email: u.email, name });
        // Load creator profile
        sb.from('creator_profiles')
          .select('*, profiles(name, email)')
          .eq('id', u.id)
          .single()
          .then(({ data }) => { if (data) setCreatorProfile({ ...data, name: data.profiles?.name || name, avatarUrl: data.avatar_url || null, bannerUrl: data.banner_url || null }); });
        // Load creator applications
        sb.from('applications')
          .select('*, campaigns(brand_name, name, logo_url, comp_type, comp)')
          .eq('creator_id', u.id)
          .then(({ data }) => {
            if (!data) return;
            setCreatorApplied(data.map(a => ({
              brand: a.campaigns?.brand_name,
              campaign: a.campaigns?.name,
              logoUrl: a.campaigns?.logo_url || null,
              status: a.status,
            })));
            const ACTIVE_STAGES = ['accepted', 'product_shipped', 'product_delivered', 'content_submitted', 'approved'];
            setCreatorActive(data.filter(a => ACTIVE_STAGES.includes(a.stage)).map(a => ({
              brand: a.campaigns?.brand_name,
              campaign: a.campaigns?.name,
              logoUrl: a.campaigns?.logo_url || null,
              myStage: a.stage,
              comp: a.campaigns?.comp,
              applicationId: a.id,
            })));
          });
        // Load notifications
        sb.from('notifications')
          .select('*')
          .eq('user_id', u.id)
          .order('created_at', { ascending: false })
          .limit(50)
          .then(({ data }) => { if (data) setNotifications(data); });

        if (view === "landing") {
          if (persistedView && CREATOR_AUTH_VIEWS.includes(persistedView)) setView(persistedView);
          else setView("creatordashboard");
        }
      }
    });

    // Listen for auth state changes (sign in / sign out)
    console.log('[auth] onAuthStateChange() — subscribing');
    const { data: { subscription } } = sb.auth.onAuthStateChange((event, session) => {
      console.log('[auth] onAuthStateChange event:', event, { hasSession: !!session, userId: session?.user?.id });
      if (event === 'SIGNED_OUT') {
        setAuthSession(null);
        setUser(null);
        setCreatorUser(null);
        setMyCampaigns([]);
        setNotifications([]);
        setCreatorApplied([]);
        setCreatorActive([]);
        setAllMessages(DEMO_MESSAGES);
        setMessageCreator(null);
        setSignInRedirect(null);
        setView('landing');
      }
    });
    return () => {
      subscription.unsubscribe();
      if (channelRef.current) sb.removeChannel(channelRef.current);
    };
  }, []);

  // Persist current view to localStorage on every change
  useEffect(() => {
    try { localStorage.setItem("nf_last_view", view); } catch (e) {}
    // Mirror auth-flow / public views into the URL hash so refresh stays put
    const HASHED_VIEWS = ["faq", "browse", "signin", "creatorsignin", "signupchoice", "brandonboarding", "creatoronboarding"];
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
      if (["faq", "browse", "signin", "creatorsignin", "signupchoice", "brandonboarding", "creatoronboarding"].includes(h)) {
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

  // Merged demo campaigns with any overrides (from applications or review responses)
  const mergedDemos = React.useMemo(() => {
    const mapped = DEMO_CAMPAIGNS.map((d, i) => {
      const base = demoCampaignOverrides[i] ? { ...d, ...demoCampaignOverrides[i] } : d;
      const reviewOverrides = demoCampaignReviewOverrides[i];
      if (!reviewOverrides || !base.reviews) return base;
      return { ...base, reviews: base.reviews.map((r, rIdx) => reviewOverrides[rIdx] !== undefined ? { ...r, brandResponse: reviewOverrides[rIdx] } : r) };
    });
    // Daily seed shuffle — consistent within a day, changes each day
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
    const featured = shuffle(mapped.filter(c => c.featured), 0);
    const regular = shuffle(mapped.filter(c => !c.featured), 1000);
    return [...featured, ...regular];
  }, [demoCampaignOverrides, demoCampaignReviewOverrides]);

  // Item 3 — systemic demo-data gate.
  // A real authenticated brand (one with a Supabase user id) must only ever see their OWN
  // campaigns/reviews in the dashboard & reviews views — never the demo seed data, which is
  // reserved for the public landing/browse experience. This is the single source of truth for
  // "should this signed-in account see demo content" so we don't have to whack-a-mole each view.
  const isRealUser = !!user?.id;
  const brandDemoCampaigns = isRealUser ? [] : mergedDemos;

  const handlePublish = async (campaignData, account = {}, result = {}) => {
    const sb = getSB();
    const campaignId = result.campaignId;
    if (!campaignId) console.warn('[handlePublish] no campaignId from Edge Function — campaign will not persist');
    // The Edge Function created the campaign (charging if needed). Persist the brand profile
    // collected in the builder. We do NOT flip stage here — free campaigns are published by
    // the EF; paid ones flip draft→open via the Stripe webhook once payment succeeds.
    if (sb && campaignId) {
      try {
        const { data: { session } } = await sb.auth.getSession();
        const uid = session?.user?.id;
        if (uid) {
          await sb.from('profiles').upsert({
            id: uid, name: campaignData.brand, tagline: campaignData.tagline,
            location: [campaignData.city, campaignData.state, campaignData.country].filter(Boolean).join(", "),
            city: campaignData.city, state: campaignData.state, country: campaignData.country,
            website: campaignData.website, logo_url: campaignData.logoUrl, banner_url: campaignData.bannerUrl,
            industry: campaignData.industry, bio: campaignData.bio, social_links: campaignData.socialLinks, role: 'brand',
          });
        }
      } catch (err) { console.error('Failed to finalize campaign:', err); }
    }
    // Paid campaigns publish asynchronously via the webhook; show optimistically with a
    // "publishing…" badge and reconcile against the authoritative DB stage shortly after.
    const publishing = !result.free;
    const newCampaign = { ...campaignData, id: campaignId || Date.now(), createdAt: new Date().toISOString(), stage: 'open', spotsFilled: 0, creators: { pending: [], approved: [] }, _publishing: publishing };

    if (myCampaigns.length === 0) {
      setPendingCampaign(newCampaign);
      setView('onboarding');
    } else {
      setMyCampaigns(prev => [newCampaign, ...prev]);
      setView('dashboard');
    }

    if (sb && campaignId && publishing) {
      setTimeout(async () => {
        try {
          const { data } = await sb.from('campaigns').select('stage').eq('id', campaignId).maybeSingle();
          const live = data?.stage === 'open';
          setMyCampaigns(prev => prev.map(c => c.id === campaignId ? { ...c, _publishing: !live, stage: live ? 'open' : c.stage } : c));
          setPendingCampaign(prev => (prev && prev.id === campaignId) ? { ...prev, _publishing: !live } : prev);
        } catch (_) {}
      }, 3000);
    }
  };

  const handleGigPublish = async (gigData, account = {}) => {
    const sb = getSB();
    let activeUser = user;

    // Build the brand profile from data collected in the builder
    const brandProfile = {
      name: gigData.brand,
      tagline: gigData.tagline,
      email: account?.email,
      phone: account?.phone,
      location: [gigData.city, gigData.state, gigData.country].filter(Boolean).join(", "),
      city: gigData.city,
      state: gigData.state,
      country: gigData.country,
      website: gigData.website,
      logoUrl: gigData.logoUrl,
      bannerUrl: gigData.bannerUrl,
      industry: gigData.industry,
      bio: gigData.bio,
    };

    // If not signed in, sign up with the credentials from the account step
    if (!activeUser && account?.email) {
      if (sb && account?.password) {
        try {
          console.log('[auth] signUp() — handleGigPublish:', { email: account.email, brand: gigData.brand });
          const { data, error } = await sb.auth.signUp({
            email: account.email,
            password: account.password,
            options: { data: { name: gigData.brand, role: 'brand' } },
          });
          console.log('[auth] signUp() result:', { hasUser: !!data?.user, hasSession: !!data?.session, userId: data?.user?.id, error: error?.message });
          if (error) throw error;
          if (data.user) {
            activeUser = { id: data.user.id, ...brandProfile, email: data.user.email };
            setAuthSession(data.session);
            setUser(activeUser);
            await sb.from('profiles').upsert({ id: data.user.id, email: data.user.email, name: gigData.brand, role: 'brand' });
          }
        } catch (err) {
          console.error('Sign up failed during gig publish:', err);
        }
      }
      // Demo-mode fallback: still populate the user state even without Supabase
      if (!activeUser) {
        activeUser = { ...brandProfile };
        setUser(activeUser);
      }
    }

    if (activeUser?.id && sb) {
      try {
        await sb.from('gig_listings').insert({
          brand_id: activeUser.id,
          brand_name: gigData.brand,
          title: gigData.title,
          description: gigData.description,
          industry: gigData.industry,
          location: gigData.location,
          shoot_date: gigData.shootDate,
          content_types: gigData.contentTypes,
          equipment: gigData.equipment,
          deliverables: gigData.deliverables,
          requirements: gigData.requirements,
          spots_total: gigData.spotsTotal,
          pay_type: gigData.payType,
          pay_rate: gigData.payRate,
        });
      } catch (err) {
        console.error('Failed to save gig to Supabase:', err);
      }
    }

    addNotification({ for: 'brand', type: 'gig_published', title: 'gig listing published', body: `Your ${gigData.title || 'gig'} listing is now live.` });
    setView('dashboard');
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

  const handleBrandOnboardingComplete = async (data) => {
    const _sb = getSB();
    let activeUser = null;
    if (_sb) {
      try {
        console.log('[auth] signUp() — handleBrandOnboardingComplete:', { email: data.email, brand: data.name });
        const { data: signUpData, error } = await _sb.auth.signUp({
          email: data.email,
          password: data.password,
          options: { data: { name: data.name, role: 'brand' } },
        });
        console.log('[auth] signUp() result:', { hasUser: !!signUpData?.user, hasSession: !!signUpData?.session, userId: signUpData?.user?.id, error: error?.message });
        if (error) throw error;
        if (signUpData.user && !signUpData.session) {
          // Email confirmation enabled — no session yet. Stash onboarding fields (minus the
          // password) to replay after confirm, then show the pending screen. (B1)
          const { password: _pw, ...safeData } = data;
          stashPendingProfile({ role: 'brand', email: data.email, data: safeData });
          setConfirmEmailInfo({ role: 'brand', email: data.email });
          setView('confirmemail');
          return;
        }
        if (signUpData.user) {
          activeUser = {
            id: signUpData.user.id,
            email: signUpData.user.email,
            name: data.name,
            tagline: data.tagline,
            bio: data.bio,
            logoPreview: data.logoPreview,
            logoUrl: data.logoPreview,
            bannerPreview: data.bannerPreview,
            bannerUrl: data.bannerPreview,
            contactName: data.contactName,
            phone: data.phone,
            website: data.website,
            country: data.country,
            city: data.city,
            state: data.state,
            location: data.location,
            industry: data.industry,
            socialLinks: data.socialLinks,
          };
          setAuthSession(signUpData.session);
          setUser(activeUser);
          await _sb.from('profiles').upsert({
            id: signUpData.user.id,
            email: signUpData.user.email,
            name: data.name,
            tagline: data.tagline,
            bio: data.bio,
            phone: data.phone,
            website: data.website,
            country: data.country,
            city: data.city,
            state: data.state,
            location: data.location,
            industry: data.industry,
            logo_url: data.logoPreview,
            banner_url: data.bannerPreview,
            social_links: data.socialLinks,
            role: 'brand',
          });
        }
      } catch (err) {
        console.error('Brand onboarding sign up failed:', err);
        throw err;
      }
    }
    if (!activeUser) {
      // demo-mode fallback so the user can still proceed without supabase
      activeUser = { ...data, logoUrl: data.logoPreview, bannerUrl: data.bannerPreview };
      setUser(activeUser);
    }
    if (pendingBuilderView) { const v = pendingBuilderView; setPendingBuilderView(null); setView(v); return; }
    setView('dashboard');
  };

  const handleSignIn = async (email, name, password) => {
    // Try Supabase auth if available, otherwise demo mode
    const _sb = getSB();
    if (_sb) {
      try {
        console.log('[auth] signInWithPassword() — handleSignIn:', { email });
        const { data, error } = await _sb.auth.signInWithPassword({ email, password });
        console.log('[auth] signInWithPassword() result:', { hasUser: !!data?.user, hasSession: !!data?.session, userId: data?.user?.id, error: error?.message });
        if (error) throw error;
        const u = data.user;
        const resolvedName = u.user_metadata?.name || name || email;
        setAuthSession(data.session);
        setUser({ id: u.id, email: u.email, name: resolvedName });
        // Load brand campaigns (join applications for creator management)
        const { data: campaigns } = await _sb.from('campaigns').select('*, profiles!brand_id(logo_url, banner_url, social_links), applications(id, status, stage, name, pitch, portfolio, platforms, tracking_number)').eq('brand_id', u.id).order('created_at', { ascending: false });
        if (campaigns) setMyCampaigns(campaigns.map(c => {
          const mkCreator = (a) => ({
            applicationId: a.id,
            name: a.name || '',
            avatar: (a.name || '').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?',
            platforms: a.platforms || {},
            pitch: a.pitch || '',
            portfolio: a.portfolio || '',
            stage: a.stage || 'applied',
            trackingNumber: a.tracking_number || null,
          });
          return {
            ...c,
            logoUrl: c.logo_url || c.profiles?.logo_url || null,
            bannerUrl: c.banner_url || c.profiles?.banner_url || null,
            socialLinks: c.profiles?.social_links || null,
            creators: {
              pending: (c.applications || []).filter(a => a.status === 'applied').map(mkCreator),
              approved: (c.applications || []).filter(a => a.status === 'accepted').map(mkCreator),
            },
          };
        }));
        // Load full brand profile — same fields as session restore path
        const { data: p } = await _sb.from('profiles').select('*').eq('id', u.id).single();
        if (p) setUser(prev => ({
          ...prev,
          name: p.name || prev?.name,
          email: p.email || prev?.email,
          phone: p.phone,
          location: p.location,
          city: p.city,
          state: p.state,
          country: p.country,
          website: p.website,
          industry: p.industry,
          bio: p.bio,
          tagline: p.tagline,
          logoUrl: p.logo_url || p.logoUrl,
          bannerUrl: p.banner_url || p.bannerUrl,
          socialLinks: p.social_links || p.socialLinks || prev?.socialLinks,
        }));
        // Replay onboarding profile stashed before email confirmation (B1)
        const pending = readPendingProfile();
        if (pending && pending.role === 'brand' && (pending.email || '').toLowerCase() === (u.email || '').toLowerCase()) {
          const d = pending.data || {};
          try {
            await _sb.from('profiles').upsert({
              id: u.id, email: u.email,
              name: d.name, tagline: d.tagline, bio: d.bio, phone: d.phone, website: d.website,
              country: d.country, city: d.city, state: d.state, location: d.location,
              industry: d.industry, logo_url: d.logoPreview, banner_url: d.bannerPreview,
              social_links: d.socialLinks, role: 'brand',
            });
            clearPendingProfile();
            setUser(prev => ({ ...prev,
              name: d.name || prev?.name, tagline: d.tagline, bio: d.bio, phone: d.phone,
              website: d.website, country: d.country, city: d.city, state: d.state, location: d.location,
              industry: d.industry, industries: d.industries, socialLinks: d.socialLinks,
              logoUrl: d.logoPreview || prev?.logoUrl, bannerUrl: d.bannerPreview || prev?.bannerUrl,
            }));
          } catch (e) { console.error('[pending-profile] brand replay failed:', e); }
        }
      } catch (err) {
        console.error('Supabase sign in failed:', err);
        return err.message?.includes('Email not confirmed')
          ? 'Please check your email for a confirmation link before signing in.'
          : err.message?.includes('Invalid login credentials')
          ? 'Incorrect email or password.'
          : (err.message || 'Sign in failed. Please try again.');
      }
    } else {
      console.log('[auth] handleSignIn — demo mode (no supabase)');
      setUser({ email, name: name || email });
    }
    if (signInRedirect) {
      setSelectedCampaign(signInRedirect);
      setSignInRedirect(null);
      setView('detail');
    } else if (pendingBuilderView) {
      const v = pendingBuilderView; setPendingBuilderView(null); setView(v);
    } else {
      setView('dashboard');
    }
  };

  const handleSignOut = async () => {
    console.log("[auth] handleSignOut called from:", new Error().stack);
    const sb = getSB();
    console.log('[auth] signOut() — handleSignOut');
    if (sb) await sb.auth.signOut().then(r => console.log('[auth] signOut() result:', { error: r?.error?.message })).catch(console.error);
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
    setSelectedCampaign(DEMO_CAMPAIGNS[0]);
    setAllMessages(DEMO_MESSAGES);
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

  const handleCreatorSignIn = async (email, name, password, profileData = null) => {
    const _sb = getSB();
    if (_sb) {
      // Attempt sign-in first (works for existing accounts)
      console.log('[auth] signInWithPassword() — handleCreatorSignIn:', { email });
      let { data, error } = await _sb.auth.signInWithPassword({ email, password });
      console.log('[auth] signInWithPassword() result:', { hasUser: !!data?.user, hasSession: !!data?.session, userId: data?.user?.id, error: error?.message });

      // New creator from onboarding whose account doesn't exist yet → sign up
      if (error && profileData && error.message?.includes('Invalid login credentials')) {
        console.log('[auth] signUp() — handleCreatorSignIn (new creator):', { email });
        const { data: signUpData, error: signUpError } = await _sb.auth.signUp({
          email, password,
          options: { data: { name, role: 'creator' } },
        });
        console.log('[auth] signUp() result:', { hasUser: !!signUpData?.user, hasSession: !!signUpData?.session, userId: signUpData?.user?.id, error: signUpError?.message });
        if (signUpError) {
          console.error('Creator signup failed:', signUpError);
          return signUpError.message || 'Sign up failed. Please try again.';
        }
        if (signUpData?.user && !signUpData.session) {
          // Email confirmation enabled — stash onboarding profile, show pending screen. (B1)
          stashPendingProfile({ role: 'creator', email, name, data: profileData || {} });
          setConfirmEmailInfo({ role: 'creator', email });
          setView('confirmemail');
          return;
        }
        if (signUpData?.user) {
          await _sb.from('profiles').upsert({ id: signUpData.user.id, email, name, role: 'creator' }).catch(console.error);
          await _sb.from('creator_profiles').upsert({ id: signUpData.user.id }).catch(console.error);
          setAuthSession(signUpData.session);
          setCreatorUser({ id: signUpData.user.id, email, name });
          setCreatorProfile({ ...profileData, name });
          setView('creatordashboard');
          return;
        }
      }

      // Surface auth errors to the user — no silent demo-mode fallback
      if (error) {
        console.error('Supabase creator sign in failed:', error);
        return error.message?.includes('Email not confirmed')
          ? 'Please check your email for a confirmation link before signing in.'
          : error.message?.includes('Invalid login credentials')
          ? 'Incorrect email or password.'
          : (error.message || 'Sign in failed. Please try again.');
      }

      // Successful sign-in
      const u = data.user;
      const resolvedName = u.user_metadata?.name || name || email;
      setCreatorUser({ id: u.id, email: u.email, name: resolvedName });
      const { data: profile } = await _sb.from('creator_profiles').select('*, profiles(name, email)').eq('id', u.id).single();
      if (profile) {
        setCreatorProfile({ ...profile, name: profile.profiles?.name || resolvedName, avatarUrl: profile.avatar_url || null, bannerUrl: profile.banner_url || null });
      } else if (profileData) {
        setCreatorProfile(profileData);
      }
      // Replay onboarding profile stashed before email confirmation (B1)
      const pendingC = readPendingProfile();
      if (pendingC && pendingC.role === 'creator' && (pendingC.email || '').toLowerCase() === (u.email || '').toLowerCase()) {
        const d = pendingC.data || {};
        try {
          await _sb.from('profiles').upsert({ id: u.id, email: u.email, name: d.name || resolvedName, role: 'creator' });
          await _sb.from('creator_profiles').upsert({
            id: u.id, bio: d.bio, location: d.location, age: d.age, languages: d.languages, niches: d.niches,
            instagram: d.instagram, instagram_followers: d.instagramFollowers,
            tiktok: d.tiktok, tiktok_followers: d.tiktokFollowers,
            youtube: d.youtube, youtube_followers: d.youtubeFollowers,
            x: d.x, x_followers: d.xFollowers,
            facebook: d.facebook, facebook_followers: d.facebookFollowers,
            avatar_url: d.avatarUrl || null, banner_url: d.bannerUrl || null,
          });
          clearPendingProfile();
          setCreatorProfile(prev => ({ ...prev, ...d, name: d.name || resolvedName,
            platforms: { Instagram: d.instagram, TikTok: d.tiktok, YouTube: d.youtube, X: d.x, Facebook: d.facebook } }));
        } catch (e) { console.error('[pending-profile] creator replay failed:', e); }
      }
    } else {
      // Demo mode — Supabase not configured
      setCreatorUser({ email, name: name || email });
      setCreatorProfile(prev => ({ ...prev, ...(profileData || {}), name: profileData?.name || prev.name || name }));
    }
    setView('creatordashboard');
  };

  const handleCreatorSignOut = async () => {
    const sb = getSB();
    console.log('[auth] signOut() — handleCreatorSignOut');
    if (sb) await sb.auth.signOut().then(r => console.log('[auth] signOut() result:', { error: r?.error?.message })).catch(console.error);
    setCreatorUser(null);
    setCreatorProfile({});
    setCreatorApplied([]);
    setCreatorActive([]);
    setScheduledCalls({});
    setAllMessages(DEMO_MESSAGES);
    setConfirmEmailInfo(null);
    setPendingBuilderView(null);
    setView('landing');
  };

  const handleApply = async (campaign, applicationData) => {
    let enriched = applicationData;
    const sb = getSB();
    if (sb && campaign.id && !String(campaign.id).startsWith('demo-') && creatorUser?.id) {
      try {
        const { data: appRow } = await sb.from('applications').insert({
          campaign_id: campaign.id,
          creator_id: creatorUser.id,
          status: 'applied',
          stage: 'applied',
          name: applicationData.name,
          pitch: applicationData.pitch,
          portfolio: applicationData.portfolio,
          platforms: applicationData.platforms,
        }).select('id').single();
        if (appRow?.id) enriched = { ...applicationData, applicationId: appRow.id };
      } catch (err) { console.error('application insert failed:', err); }
    }
    const key = campaign.brand + "::" + campaign.campaign;
    setAppliedCampaigns(prev => [...prev, key]);
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
              pending: [...(existingCreators.pending || []), enriched],
            },
          },
        };
      });
    }
    const userIdx = myCampaigns.findIndex(c => c.brand === campaign.brand && c.campaign === campaign.campaign);
    if (userIdx >= 0) {
      setMyCampaigns(prev => prev.map((c, i) => {
        if (i !== userIdx) return c;
        return { ...c, creators: { ...c.creators, pending: [...(c.creators?.pending || []), enriched] } };
      }));
    }
    addNotification({ for: "brand", type: "new_application", title: "new application received", body: `${enriched.name} applied to ${campaign.brand} · ${campaign.campaign}` });
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
  const handleScheduleCall = ({ creatorName, campaign, datetime, timezone, meetLink, notes }) => {
    const key = `${campaign.brand}::${campaign.campaign}::${creatorName}`;
    setScheduledCalls(prev => ({
      ...prev,
      [key]: { datetime, timezone, meetLink, notes, confirmed: false, declined: false },
    }));
    const formatted = new Date(datetime).toLocaleString("en-US", { timeZone: timezone, weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
    addNotification({ for: "creator", type: "call_scheduled", title: "call scheduled", body: `${campaign.brand} scheduled a call with you for ${formatted}` });
  };

  // Creator responds to a scheduled call
  const handleRespondToCall = (key, action) => {
    setScheduledCalls(prev => ({
      ...prev,
      [key]: { ...prev[key], confirmed: action === "confirm", declined: action === "decline" },
    }));
    const [brand, campaign] = key.split("::");
    if (action === "confirm") {
      addNotification({ for: "brand", type: "call_confirmed", title: "call confirmed", body: `A creator confirmed your scheduled call for ${brand} · ${campaign}` });
    } else {
      addNotification({ for: "brand", type: "call_declined", title: "call declined", body: `A creator declined your scheduled call for ${brand} · ${campaign}` });
    }
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

  if (view === "notifications") return <NotificationsPage notifications={notifications} forRole={user ? "brand" : "creator"} onBack={() => setView(user ? "dashboard" : "creatordashboard")} onMarkAllRead={markAllNotifsRead} onMarkRead={markNotifRead} />;
  if (view === "faq") return <FAQPage onBack={() => setView("landing")} onStart={() => goToBuilder("builder")} onSignIn={() => user ? setView("dashboard") : creatorUser ? setView("creatordashboard") : setView("signin")} user={user} creatorUser={creatorUser} />;
  if (view === "signin") return <SignIn onSignIn={handleSignIn} onBack={() => setView("landing")} onSignUp={() => setView("signupchoice")} />;
  if (view === "signupchoice") return <SignUpChoice onBack={() => setView("signin")} onBrand={() => setView("brandonboarding")} onCreator={() => setView("creatoronboarding")} onSignIn={() => setView("signin")} />;
  if (view === "brandonboarding") return <BrandOnboarding onBack={() => setView("signupchoice")} onComplete={handleBrandOnboardingComplete} onSignIn={() => setView("signin")} />;
  if (view === "creatorsignin") return <CreatorSignIn onSignIn={handleCreatorSignIn} onBack={() => setView("landing")} onSignUp={() => setView("creatoronboarding")} />;
  if (view === "creatoronboarding") return <CreatorOnboarding onBack={() => setView("signupchoice")} onComplete={(email, name, password, profileData) => { handleCreatorSignIn(email, name, password, profileData); }} onSignIn={() => setView("signin")} />;
  if (view === "confirmemail") return <ConfirmEmailNotice email={confirmEmailInfo?.email} role={confirmEmailInfo?.role} onSignIn={() => setView(confirmEmailInfo?.role === "creator" ? "creatorsignin" : "signin")} onHome={() => setView("landing")} />;
  if (view === "creatordashboard") return <>
    <CreatorDashboard user={creatorUser} appliedCampaigns={creatorApplied} activeCampaigns={creatorActive} uploads={creatorUploads} onSignOut={handleCreatorSignOut} onBack={() => setView("landing")} creatorProfile={creatorProfile} onEditProfile={async (form) => {
        setCreatorProfile(prev => ({ ...prev, ...form, platforms: { Instagram: form.instagram, TikTok: form.tiktok, YouTube: form.youtube, X: form.x } }));
        const sb = getSB();
        if (sb && creatorUser?.id) await sb.from('creator_profiles').upsert({
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
        }).catch(console.error);
      }} onUpload={(upload) => setCreatorUploads(prev => [upload, ...prev])} onSelectCampaign={(c) => { setSelectedCampaign(mergedDemos.find(d => d.brand === c.brand && d.campaign === c.campaign) || c); setDetailSource("landing"); setView("detail"); }} onBrowse={() => setView("browse")} onViewOwnProfile={() => { setSelectedCreatorProfile(creatorProfile); setCreatorProfileReturnView("creatordashboard"); setView("creatorprofile"); }} onOpenMessages={(campaign) => { if (campaign) { const creatorName = creatorProfile?.name || creatorUser?.name || ""; const key = `${campaign.brand}::${campaign.campaign}::${creatorName}`; setCreatorMessageThread({ key, brandName: campaign.brand, campaignName: campaign.campaign }); setView("creatormessages"); } else { setView("creatorinbox"); } }} scheduledCalls={Object.fromEntries(Object.entries(scheduledCalls).filter(([key]) => key.endsWith(`::`+(creatorProfile?.name || creatorUser?.name || ""))))} onRespondToCall={handleRespondToCall} notifications={notifications} onMarkAllNotifsRead={markAllNotifsRead} onViewAllNotifications={() => setView("notifications")} />
    {showToast && <NotificationToast message={toastMessage} onView={() => { setShowToast(false); setView("notifications"); }} onDismiss={() => setShowToast(false)} />}
  </>;
  if (view === "creatorinbox") {
    const brandAvatarMap = Object.fromEntries(DEMO_CAMPAIGNS.map(c => [c.brand, c.logoUrl || null]));
    return <CreatorInbox conversations={getCreatorConversations()} onSelectThread={(conv) => { setCreatorMessageThread({ key: conv.key, brandName: conv.brandName, campaignName: conv.campaignName }); setView("creatormessages"); }} onBack={() => setView("creatordashboard")} allMessages={allMessages} onSend={(key, text) => { const newMsg = { from: "creator", text, ts: new Date().toISOString() }; setAllMessages(prev => ({ ...prev, [key]: [...(prev[key] || []), newMsg] })); }} creatorAvatar={creatorProfile?.avatarUrl || null} brandAvatars={brandAvatarMap} />;
  }
  if (view === "creatormessages" && creatorMessageThread) {
    const brandAvatarMap = Object.fromEntries(DEMO_CAMPAIGNS.map(c => [c.brand, c.logoUrl || null]));
    return <Messages campaign={{ brand: creatorMessageThread.brandName, campaign: creatorMessageThread.campaignName }} creatorName={creatorProfile?.name || creatorUser?.name || ""} messages={allMessages[creatorMessageThread.key] || []} onSend={handleCreatorSendMessage} onBack={() => setView("creatorinbox")} isBrand={false} brandAvatar={brandAvatarMap[creatorMessageThread.brandName] || null} creatorAvatar={creatorProfile?.avatarUrl || null} />;
  }
  if (view === "creatorprofile" && selectedCreatorProfile) return <CreatorPublicProfile creator={selectedCreatorProfile} onBack={() => setView(creatorProfileReturnView)} onMessage={selectedCampaign ? () => handleOpenMessage(selectedCampaign, selectedCreatorProfile.name, "creatorprofile") : null} />;
  if (view === "onboarding") return <OnboardingPage onDone={handleOnboardingDone} />;
  if (view === "reviews") return <ReviewsPage campaigns={myCampaigns} demoCampaigns={brandDemoCampaigns} onBack={() => setView("dashboard")} onUpdateReview={handleUpdateReview} />;
  if (view === "dashboard") return <>
    <Dashboard user={user} campaigns={myCampaigns} demoCampaigns={brandDemoCampaigns} onBack={() => setView("landing")} onSignOut={handleSignOut} onNewCampaign={() => setView("builder")} onNewGig={() => setView("gigbuilder")} onSelectCampaign={(c) => { setSelectedCampaign(c); setDetailSource("dashboard"); setView("detail"); }} onEditCampaign={(c) => { setSelectedCampaign(c); setView("edit"); }} onViewReviews={handleViewReviews} lastReviewsVisitedAt={lastReviewsVisitedAt} onBrowse={() => setView("browse")} notifications={notifications} onMarkAllNotifsRead={markAllNotifsRead} onViewAllNotifications={() => setView("notifications")} onOpenMessages={() => setView("inbox")} scheduledCalls={scheduledCalls} onUpdateUser={async (updatedUser) => {
      setUser(prev => ({ ...prev, ...updatedUser }));
      const sb = getSB();
      if (updatedUser?.id && sb) {
        try {
          await sb.from('profiles').upsert({
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
          });
        } catch (err) { console.error('profile upsert failed:', err); }
      }
    }} onFaq={() => setView("faq")} />
    {showToast && <NotificationToast message={toastMessage} onView={() => { setShowToast(false); setView("notifications"); }} onDismiss={() => setShowToast(false)} />}
  </>;
  if ((view === "builder" || view === "gigbuilder") && !user) {
    return <SignUpChoice onBack={() => setView("landing")} onBrand={() => setView("brandonboarding")} onCreator={() => setView("creatoronboarding")} onSignIn={() => setView("signin")} />;
  }
  if (view === "builder") return <CampaignBuilder onBack={() => user ? setView("dashboard") : setView("landing")} onPublish={handlePublish} session={authSession} />;
  if (view === "gigbuilder") return <GigListingBuilder onBack={() => setView("dashboard")} onPublish={handleGigPublish} session={authSession} />;
  if (view === "edit" && selectedCampaign) return <CampaignEditor campaign={selectedCampaign} onBack={() => setView("dashboard")} session={authSession} onSave={async (updated) => {
    setMyCampaigns(prev => prev.map(c => c.id === updated.id ? updated : c));
    setSelectedCampaign(updated);
    setView("dashboard");
    const sb = getSB();
    if (sb && updated.id && !String(updated.id).startsWith('demo-'))
      await sb.from('campaigns').update({
        name: updated.name,
        brand_name: updated.brand_name,
        description: updated.description,
        comp_type: updated.comp_type,
        comp: updated.comp,
        platforms: updated.platforms,
        deliverables: updated.deliverables,
        requirements: updated.requirements,
        deadline: updated.deadline,
        status: updated.status,
        following: updated.following,
        spots_total: updated.spots_total,
        location: updated.location,
        niches: updated.niches,
      }).eq('id', updated.id).catch(console.error);
  }} />;
  if (view === "brandprofile") return <BrandProfile brand={selectedBrand} allCampaigns={mergedDemos} onBack={() => setView("browse")} onSelectCampaign={(c) => { setSelectedCampaign(c); setDetailSource("browse"); setView("detail"); }} appliedCampaigns={appliedCampaigns} onApplyClick={(c) => { setSelectedCampaign(c); setAutoApply(true); setDetailSource("browse"); setView("detail"); }} user={user} />;
  if (view === "browse") return <BrowseCampaigns campaigns={mergedDemos} onBack={() => setView("landing")} onSelectCampaign={(c) => { setSelectedBrand(c.brand); setView("brandprofile"); }} appliedCampaigns={appliedCampaigns} onApplyClick={(c) => { setSelectedCampaign(mergedDemos.find(d => d.brand === c.brand && d.campaign === c.campaign) || c); setAutoApply(true); setDetailSource("browse"); setView("detail"); }} onFaq={() => setView("faq")} onSignIn={() => user ? setView("dashboard") : creatorUser ? setView("creatordashboard") : setView("signin")} user={user} creatorUser={creatorUser} />;
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
    const isDemoFromDashboard = user && DEMO_CAMPAIGNS.some(d => d.brand === selectedCampaign.brand && d.campaign === selectedCampaign.campaign) && detailSource === "dashboard";
    const isOwner = isOwnCampaign || isDemoFromDashboard;
    return <CampaignDetail campaign={selectedCampaign} onBack={() => { setAutoApply(false); if (detailSource === "dashboard") setView("dashboard"); else if (detailSource === "browse") setView("browse"); else setView("landing"); }} isOwner={isOwner} user={user} onApply={handleApply} onSignInRedirect={handleSignInRedirect} appliedCampaigns={appliedCampaigns} onOpenMessage={(creatorName) => handleOpenMessage(selectedCampaign, creatorName, "detail")} onOpenInbox={() => handleOpenInbox(selectedCampaign, "detail")} messageCount={getConversationsForCampaign(selectedCampaign).filter(c => c.messages.length > 0).length} autoApply={autoApply} onAutoApplyConsumed={() => setAutoApply(false)} onEditCampaign={(c) => { setSelectedCampaign(c); setView("edit"); }} onScheduleCall={handleScheduleCall} onViewCreatorProfile={(creator) => { setSelectedCreatorProfile(creator); setCreatorProfileReturnView("detail"); setView("creatorprofile"); }} onNotify={addNotification} />;
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
          <span className="nf-nl nf-nav-secondary" style={{ color: "#fff" }} role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => setView(user || creatorUser ? "browse" : "landing")}>campaigns</span>
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
          <div className="nf-mobile-hamburger" style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, cursor: "pointer", marginLeft: 8 }} role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }} onClick={(e) => { e.stopPropagation(); setShowLandingMenu(v => !v); }}>
            <div style={{ width: 16, height: 1.5, background: "rgba(255,255,255,.85)", borderRadius: 2 }} />
            <div style={{ width: 16, height: 1.5, background: "rgba(255,255,255,.85)", borderRadius: 2 }} />
            <div style={{ width: 16, height: 1.5, background: "rgba(255,255,255,.85)", borderRadius: 2 }} />
          </div>
        </div>
        {showLandingMenu && (
          <div onClick={e => e.stopPropagation()} style={{ position: "absolute", top: 60, right: 16, background: "#0a1322", border: "1px solid rgba(255,255,255,.12)", borderRadius: 14, padding: 6, minWidth: 180, zIndex: 50, boxShadow: "0 18px 40px rgba(0,0,0,.5)" }}>
            {[
              { label: "home", action: () => { setShowLandingMenu(false); window.location.href = "https://nfluenceagency.com/"; } },
              { label: "campaigns", action: () => { setShowLandingMenu(false); setView(user || creatorUser ? "browse" : "landing"); } },
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
        <h1 style={{ fontFamily: "'Monda', system-ui, sans-serif", fontSize: "clamp(1.6rem, 5vw, 2.8rem)", fontWeight: 600, lineHeight: 1.2, margin: 0 }}>
          <span style={{ color: "rgba(255,255,255,.4)" }}>launch creator campaigns<br />that </span><span style={{ color: "#fff" }}>run on autopilot</span>
        </h1>
        <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 32, flexWrap: "wrap" }}>
          <button onClick={() => goToBuilder("builder")} className="nf-cta-btn" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 0, width: "100%", maxWidth: 220, padding: "14px 28px", borderRadius: 16, fontFamily: "'Monda', system-ui, sans-serif", textTransform: "lowercase", fontSize: ".99rem", background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.28)", backdropFilter: "blur(20px)", color: "#fff", cursor: "pointer", boxShadow: "0 10px 28px rgba(0,0,0,.25)" }}>
            start a campaign
          </button>
          <button onClick={() => setView(creatorUser ? "creatordashboard" : "creatorsignin")} className="nf-cta-btn" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 0, width: "100%", maxWidth: 220, padding: "14px 28px", borderRadius: 16, fontFamily: "'Monda', system-ui, sans-serif", textTransform: "lowercase", fontSize: ".99rem", background: "transparent", border: "1px solid rgba(255,255,255,.18)", color: "#fff", cursor: "pointer" }}>
            i'm a creator
          </button>
        </div>
      </div>

      {/* Divider */}
      <div style={{ width: "min(58%, 520px)", height: 1, background: "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,.15) 50%, rgba(255,255,255,0) 100%)", opacity: .6, margin: "20px auto 32px" }} />

      {/* Open Campaigns */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 16px 80px" }}>
        <h2 style={{ fontFamily: "'Monda', system-ui, sans-serif", fontSize: "1.4rem", textAlign: "center", marginBottom: 28, fontWeight: 600 }}>featured campaigns</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {mergedDemos.map((c, i) => {
            const isApplied = appliedCampaigns.includes(c.brand + "::" + c.campaign);
            return (
            <div key={i} className="nf-campaign-card" onClick={() => { setSelectedCampaign(c); setDetailSource("landing"); setView("detail"); }}>
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
                      {c.comp}
                      {c.compType === "product+paid" ? <span style={{ fontSize: ".85rem", fontWeight: 400, opacity: .45, marginLeft: 4 }}>+ product</span> : ""}
                    </div>
                  </div>
                  {isApplied ? (
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
