// ── Data ──

const PLATFORM_LIST = ["Instagram", "TikTok", "YouTube", "X", "Facebook"];
const FOLLOWER_TIERS = ["Any", "5k+", "10k+", "25k+", "50k+", "100k+", "250k+", "500k+", "1M+"];
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
const COMP_OPTIONS = [
  { value: "product", label: "product only" },
  { value: "paid", label: "paid" },
  { value: "product+paid", label: "product + paid" },
];
const STEPS = ["brand", "campaign", "platforms", "terms", "account", "preview"];
const VIBES = ["bold", "playful", "minimal", "luxury", "edgy", "warm", "professional", "raw", "inspirational", "witty", "clean", "authentic"];
const SOCIAL_OPTIONS = ["Instagram", "TikTok", "YouTube", "X", "Facebook", "Website"];

const REGION_CODES = ["US","CA","MX","GB","IE","FR","DE","ES","PT","IT","CH","AT","NL","BE","DK","NO","SE","FI","PL","CZ","HU","RO","GR","TR","IL","AE","SA","EG","ZA","IN","CN","JP","KR","TH","SG","AU","NZ","BR","AR","CL","CO"];
const US_STATES = ["Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia","Wisconsin","Wyoming"];

// Demo campaign data for the browse view
const DEMO_CAMPAIGNS = [
  { brand: "Nike", stage: "delivered", creators: {
      approved: [
        { name: "Alex Rivera", avatar: "AR", platforms: { Instagram: "48k", TikTok: "120k" }, stage: "paid" },
        { name: "Mia Thompson", avatar: "MT", platforms: { Instagram: "22k", TikTok: "85k", YouTube: "15k" }, stage: "approved" },
        { name: "Jordan Kim", avatar: "JK", platforms: { Instagram: "67k", TikTok: "210k" }, stage: "product_shipped" },
        { name: "Sophie Chen", avatar: "SC", platforms: { Instagram: "31k", YouTube: "42k" }, stage: "accepted", acceptedAt: "2026-04-13T10:00:00.000Z" },
      ],
      pending: [
        { name: "Chris Nakamura", avatar: "CN", platforms: { Instagram: "18k", TikTok: "55k" }, stage: "applied" },
        { name: "Priya Patel", avatar: "PP", platforms: { TikTok: "92k", YouTube: "28k" }, stage: "applied" },
      ]
    }, logoUrl: "/assets/logo_nike.jpg", campaign: "Running Challenge", platforms: ["TikTok", "Instagram", "YouTube"], following: "10k+", deliverables: { TikTok: "(1) video", Instagram: "(2) reels", YouTube: "(1) review" }, deadline: "06/15/26", comp: "free product", compType: "product", spotsTotal: 30, spotsFilled: 18, description: "Join Nike's Running Challenge and inspire your community to get moving. We're looking for passionate fitness creators who live and breathe running culture. You'll receive our latest running gear and create authentic content showing how Nike fits into your active lifestyle. This is a product-seeding campaign — no cash compensation, but you keep everything we send.", location: "United States", requirements: "Must be 18+. Authentic fitness/running niche. No competitors for 90 days.", products: [{ name: "Nike Pegasus 41", variant: "Any colorway" }, { name: "Nike Dri-FIT Apparel Pack", variant: "Size provided" }], hasStyleGuide: true, reviews: [{ creator: "Alex R.", rating: 5, text: "Nike was super professional. Product arrived on time, communication was great throughout.", submittedAt: "2026-04-10T09:00:00.000Z", brandResponse: "Thank you Alex! It was a pleasure working with you — your content was incredible." }, { creator: "Mia T.", rating: 4, text: "Loved the gear! Only wish the campaign timeline was a bit longer.", submittedAt: "2026-04-14T11:00:00.000Z", brandResponse: null }, { creator: "Jordan K.", rating: 5, text: "Best brand I've worked with. Clear expectations and they repost your content.", submittedAt: "2026-04-16T14:30:00.000Z", brandResponse: null }], imgUrl: "/assets/banner_nike.jpg", imgBg: "#111", imgIcon: "", featured: true },
  { brand: "Alani Nu", stage: "shipped", creators: {
      approved: [
        { name: "Emma Davis", avatar: "ED", platforms: { TikTok: "180k", X: "12k" }, stage: "content_submitted" },
        { name: "Liam Brooks", avatar: "LB", platforms: { TikTok: "95k", X: "8k" }, stage: "product_shipped" },
      ],
      pending: [
        { name: "Ava Wilson", avatar: "AW", platforms: { TikTok: "42k", X: "5k" }, stage: "applied" },
        { name: "Noah Garcia", avatar: "NG", platforms: { TikTok: "67k" }, stage: "applied" },
        { name: "Zoe Martinez", avatar: "ZM", platforms: { TikTok: "110k", X: "22k" }, stage: "applied" },
      ]
    }, logoUrl: "/assets/logo_alani_nu.jpg", campaign: "Lifestyle & Energy Campaign", platforms: ["TikTok", "X"], following: "5k+", deliverables: { TikTok: "(1) video", X: "(2) posts" }, deadline: "05/30/26", comp: "$200", compType: "product+paid", spotsTotal: 20, spotsFilled: 14, description: "Alani Nu is looking for lifestyle and fitness creators to showcase our energy drink line in everyday moments — gym sessions, morning routines, study sessions, road trips. We want real, unscripted vibes that show how Alani fits naturally into your day. You'll receive a full product box plus $200 per creator.", location: "United States, Canada", requirements: "Must be 18+. Health/fitness or lifestyle niche preferred. No energy drink competitors for 60 days.", products: [{ name: "Alani Nu Energy Variety Pack", variant: "12 cans, mixed flavors" }], hasStyleGuide: false, reviews: [{ creator: "Sophie L.", rating: 5, text: "Payment was fast, product was delicious, and the team was so kind.", submittedAt: "2026-04-12T10:00:00.000Z", brandResponse: "So glad you loved it Sophie! Can't wait to work together again 🙌" }, { creator: "Chris M.", rating: 4, text: "Great experience overall. Would love to work together again.", submittedAt: "2026-04-17T08:00:00.000Z", brandResponse: null }], imgUrl: "/assets/banner_alani_nu.jpg", imgBg: "#111", imgIcon: "", featured: true },
  { brand: "Alo", stage: "accepted", creators: {
      approved: [
        { name: "Nina Williams", avatar: "NW", platforms: { Instagram: "88k" }, stage: "product_shipped" },
        { name: "David Park", avatar: "DP", platforms: { Instagram: "145k" }, stage: "accepted", acceptedAt: "2026-04-14T10:00:00.000Z" },
        { name: "Lena Kowalski", avatar: "LK", platforms: { Instagram: "52k" }, stage: "accepted", acceptedAt: "2026-04-13T10:00:00.000Z" },
        { name: "Marcus Johnson", avatar: "MJ", platforms: { Instagram: "210k" }, stage: "accepted", acceptedAt: "2026-04-14T10:00:00.000Z" },
        { name: "Aria Sato", avatar: "AS", platforms: { Instagram: "76k" }, stage: "accepted", acceptedAt: "2026-04-15T10:00:00.000Z" },
      ],
      pending: []
    }, logoUrl: "/assets/logo_alo.jpg", campaign: "Mindful Movement", platforms: ["Instagram"], following: "20k+", deliverables: { Instagram: "(3) stories + (1) reel" }, deadline: "07/01/26", comp: "$500", compType: "paid", spotsTotal: 10, spotsFilled: 8, description: "Alo Yoga is seeking mindful movement creators for a premium paid campaign. We want content that captures the intersection of wellness, fashion, and intentional living. Think sunrise flows, studio sessions, mindful moments. This campaign pays $500 per creator — no product seeding, purely paid collaboration.", location: "Worldwide", requirements: "Must be 18+. Yoga, wellness, or mindful living niche. Professional-quality content required. 20k+ following on Instagram.", products: [], hasStyleGuide: true, reviews: [{ creator: "Nina W.", rating: 5, text: "Alo is a dream brand to work with. The creative brief was clear and they gave me full creative freedom.", submittedAt: "2026-04-08T09:00:00.000Z", brandResponse: "Thank you Nina! Your content perfectly captured the Alo spirit." }, { creator: "David P.", rating: 5, text: "Paid on time, great communication, and they featured my content on their main page.", submittedAt: "2026-04-09T15:00:00.000Z", brandResponse: null }, { creator: "Lena K.", rating: 4, text: "Beautiful products and a very organized team. Would recommend.", submittedAt: "2026-04-15T11:00:00.000Z", brandResponse: null }, { creator: "Marcus J.", rating: 5, text: "One of the most professional campaigns I've been part of.", submittedAt: "2026-04-17T16:00:00.000Z", brandResponse: null }], imgUrl: "/assets/banner_alo.jpg", imgBg: "#111", imgIcon: "", featured: true },
  { brand: "GoPro", stage: "under_review", creators: {
      approved: [
        { name: "Jake Sullivan", avatar: "JS", platforms: { YouTube: "320k", Instagram: "95k" }, stage: "content_submitted" },
        { name: "Tanya Rodriguez", avatar: "TR", platforms: { YouTube: "180k", Instagram: "62k" }, stage: "product_shipped" },
      ],
      pending: [
        { name: "Kai Andersen", avatar: "KA", platforms: { YouTube: "45k", Instagram: "38k" }, stage: "applied" },
      ]
    }, logoUrl: "/assets/logo_gopro.jpg", campaign: "POV Creator Program", platforms: ["YouTube", "Instagram"], following: "30k+", deliverables: { YouTube: "(1) video", Instagram: "(1) reel" }, deadline: "06/20/26", comp: "$2,500", compType: "paid", spotsTotal: 15, spotsFilled: 3, description: "GoPro is launching a POV Creator Program for adventure and action sports creators. We want first-person perspective content that makes viewers feel like they're right there with you — whether that's mountain biking, surfing, skydiving, or anything that gets the adrenaline pumping. This is a premium paid campaign at $2,500 per creator, and you'll receive the latest GoPro HERO to keep.", location: "Worldwide", requirements: "Must be 18+. Adventure, action sports, or extreme outdoor niche. Must shoot on GoPro. 30k+ combined following across YouTube and Instagram.", products: [{ name: "GoPro HERO13 Black", variant: "Latest model" }, { name: "GoPro Accessories Kit", variant: "Mounts, cases, batteries" }], hasStyleGuide: true, reviews: [{ creator: "Jake S.", rating: 5, text: "Incredible opportunity. GoPro gave me full creative freedom and the gear is next level.", submittedAt: "2026-04-11T13:00:00.000Z", brandResponse: null }, { creator: "Tanya R.", rating: 5, text: "Best-paying campaign I've done. The team really cares about the creator experience.", submittedAt: "2026-04-18T10:00:00.000Z", brandResponse: null }], imgUrl: "/assets/banner_gopro.jpg", imgBg: "#111", imgIcon: "", featured: true },
];

const BRAND_META = {
  "Nike": { bio: "We exist to bring inspiration and innovation to every athlete in the world. If you have a body, you are an athlete.", tagline: "Just Do It", location: "Beaverton, OR", website: "nike.com", founded: "1964", totalCampaigns: 47, totalCreators: 1240 },
  "Alani Nu": { bio: "Built for women who hustle. Alani Nu is a health & wellness brand making supplements and energy drinks that actually taste good and work.", tagline: "fuel the hustle", location: "Louisville, KY", website: "alaninutrition.com", founded: "2018", totalCampaigns: 22, totalCreators: 410 },
  "Alo": { bio: "Alo exists to inspire mindful movement and bring yoga to the world. We make gear designed to go from the studio to the streets.", tagline: "mindful movement", location: "Los Angeles, CA", website: "aloyoga.com", founded: "2007", totalCampaigns: 31, totalCreators: 680 },
  "GoPro": { bio: "GoPro makes the world's most versatile cameras. We help people capture and share their most meaningful experiences.", tagline: "be a hero", location: "San Mateo, CA", website: "gopro.com", founded: "2002", totalCampaigns: 18, totalCreators: 290 },
};

const PLAT_SVGS_SMALL = {
  Instagram: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="1.5" fill="#fff" stroke="none"/></svg>,
  TikTok: <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V9.05a8.27 8.27 0 004.76 1.5V7.1a4.83 4.83 0 01-1-.41z"/></svg>,
  YouTube: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="4"/><polygon points="10,8 16,12 10,16" fill="#fff" stroke="none"/></svg>,
  X: <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>,
  Facebook: <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
};

const DEMO_MESSAGES = {
  "Alo::Mindful Movement::Tyler": [
    { from: "brand", text: "Hey Tyler! We've been following your content for a while — your fitness and wellness niche is exactly what we're looking for. Welcome to the Mindful Movement campaign!", ts: "2026-04-14T09:00:00" },
    { from: "creator", text: "Really excited to be part of this one. I've been wearing Alo for years so this feels very authentic for me.", ts: "2026-04-14T09:22:00" },
    { from: "brand", text: "That's exactly why we wanted you. We're putting together your product box now — leggings, a studio top, and the new Warrior mat. Should ship out by end of week.", ts: "2026-04-14T10:05:00" },
    { from: "creator", text: "Love the mat inclusion — I've been wanting to try it. Should I focus more on studio content or outdoor? My outdoor yoga content tends to perform better.", ts: "2026-04-14T10:30:00" },
    { from: "brand", text: "Outdoor would be perfect. We're leaning into the 'movement in nature' angle for this campaign. Mountains, parks, rooftops — all fair game.", ts: "2026-04-14T11:00:00" },
    { from: "creator", text: "I have a shoot planned at Runyon Canyon next week. Could be a great backdrop. Thinking a sunrise flow — golden hour lighting always hits on Instagram.", ts: "2026-04-14T11:18:00" },
    { from: "brand", text: "Runyon Canyon sunrise sounds incredible. Make sure to tag @aloyoga and use #AloMoves and #MindfulMovement in the caption. Check the style guide we attached — there's a section on caption tone.", ts: "2026-04-14T13:45:00" },
    { from: "creator", text: "Will do. One question — is there a minimum video length for the reel, or is shorter better?", ts: "2026-04-14T14:10:00" },
    { from: "brand", text: "Aim for 30–60 seconds for the reel. Shorter tends to get better completion rates. The static post can be a single hero shot — clean, minimal, let the product speak.", ts: "2026-04-14T14:30:00" },
    { from: "creator", text: "Got it. I'll plan for a 45-second reel and one strong static. Should have everything shot and ready to submit by April 25th.", ts: "2026-04-14T14:55:00" },
    { from: "brand", text: "Perfect, that works great with our timeline. Looking forward to seeing it — your eye for composition is going to make this one stand out. Let us know if you need anything else before the shoot!", ts: "2026-04-14T15:20:00" },
  ],
  "Nike::Running Challenge::Alex Rivera": [
    { from: "brand", text: "Hey Alex! We loved your running content. Welcome to the Nike Running Challenge!", ts: "2026-04-01T10:00:00" },
    { from: "creator", text: "Thank you so much! I'm really excited to be part of this. When should I expect the product shipment?", ts: "2026-04-01T10:15:00" },
    { from: "brand", text: "We're shipping the Pegasus 41 and Dri-FIT pack this week. You should have tracking by Thursday.", ts: "2026-04-01T11:30:00" },
    { from: "creator", text: "Perfect! I already have some content ideas — thinking a sunrise run vlog and a gear unboxing reel.", ts: "2026-04-01T12:00:00" },
    { from: "brand", text: "Love that. The sunrise run vlog sounds amazing. Just remember to tag @nike and use #NikeRunningChallenge. Check the style guide for the full list of dos and don'ts.", ts: "2026-04-01T14:20:00" },
    { from: "creator", text: "Got it! Will review the guide tonight. Quick question — any preference on which colorway I feature first?", ts: "2026-04-01T15:45:00" },
    { from: "brand", text: "Totally your call — we want it to feel authentic to your style.", ts: "2026-04-01T16:00:00" },
  ],
  "Nike::Running Challenge::Mia Thompson": [
    { from: "brand", text: "Welcome Mia! Excited to have you on the Running Challenge.", ts: "2026-04-02T09:00:00" },
    { from: "creator", text: "Thanks! Quick q — can I include my dog in the running content? He's my running partner 🐕", ts: "2026-04-02T09:30:00" },
    { from: "brand", text: "Absolutely, that sounds adorable and on-brand. Go for it!", ts: "2026-04-02T10:00:00" },
  ],
  "Alani Nu::Lifestyle & Energy Campaign::Emma Davis": [
    { from: "brand", text: "Hey Emma! Welcome to the Alani Nu fam. Your TikTok energy is exactly what we're looking for.", ts: "2026-04-03T11:00:00" },
    { from: "creator", text: "Omg thank you! I literally drink Alani every morning so this is a dream collab.", ts: "2026-04-03T11:20:00" },
    { from: "brand", text: "That's what we love to hear! We're sending a variety pack — 12 cans, mixed flavors. Should arrive by next week.", ts: "2026-04-03T12:00:00" },
    { from: "creator", text: "Can't wait! I'm thinking a 'what I drink in a day' style video. Would that work?", ts: "2026-04-03T13:00:00" },
    { from: "brand", text: "Perfect format for TikTok. Just keep it natural and fun — that's the Alani vibe.", ts: "2026-04-03T13:15:00" },
  ],
  "GoPro::POV Creator Program::Jake Sullivan": [
    { from: "brand", text: "Jake! Your mountain biking footage is insane. Welcome to the POV Creator Program.", ts: "2026-04-05T08:00:00" },
    { from: "creator", text: "Stoked to be here! I've been shooting GoPro for years — this feels full circle.", ts: "2026-04-05T08:30:00" },
    { from: "brand", text: "We're sending you the HERO13 Black with the full accessories kit. Any trail trips coming up?", ts: "2026-04-05T09:00:00" },
    { from: "creator", text: "Heading to Moab next month. Planning a sunrise-to-sunset edit — Slickrock trail, Porcupine Rim, the works.", ts: "2026-04-05T09:45:00" },
    { from: "brand", text: "That's going to be incredible. Make sure to shoot some BTS too — we might feature it on GoPro's channel.", ts: "2026-04-05T10:00:00" },
    { from: "creator", text: "Wait, seriously? That would be huge. I'll plan extra footage for sure.", ts: "2026-04-05T10:10:00" },
    { from: "brand", text: "Dead serious. Your content quality is exactly what we showcase. Just send us the raw files along with your edit.", ts: "2026-04-05T10:30:00" },
  ],
};


// ── Messages ──

export { PLATFORM_LIST, FOLLOWER_TIERS, PLATFORM_EXAMPLES, LANGUAGES, INDUSTRIES, COMP_OPTIONS, STEPS, VIBES, SOCIAL_OPTIONS, REGION_CODES, US_STATES, DEMO_CAMPAIGNS, BRAND_META, PLAT_SVGS_SMALL, DEMO_MESSAGES };
