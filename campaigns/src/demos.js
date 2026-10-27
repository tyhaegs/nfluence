// Original campaign examples. Keep them public and separate from live campaign records.
const originalCampaigns = [
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
    }, logoUrl: "/assets/logo_nike.jpg", campaign: "Running Challenge", platforms: ["TikTok", "Instagram", "YouTube"], following: "10k+", deliverables: { TikTok: "(1) video", Instagram: "(2) reels", YouTube: "(1) review" }, deadline: "06/15/26", comp: "free product", compType: "product", spotsTotal: 30, spotsFilled: 18, description: "Join Nike's Running Challenge and inspire your community to get moving. We're looking for passionate fitness creators who live and breathe running culture. You'll receive our latest running gear and create authentic content showing how Nike fits into your active lifestyle. This is a product-seeding campaign — no cash compensation, but you keep everything we send.", location: "United States", requirements: "Must be 18+. Authentic fitness/running niche. No competitors for 90 days.", products: [{ name: "Nike Pegasus 41", variant: "Any colorway" }, { name: "Nike Dri-FIT Apparel Pack", variant: "Size provided" }], hasStyleGuide: true, reviews: [{ creator: "Alex R.", rating: 5, text: "Nike was super professional. Product arrived on time, communication was great throughout.", submittedAt: "2026-04-10T09:00:00.000Z", brandResponse: "Thank you Alex! It was a pleasure working with you — your content was incredible." }, { creator: "Mia T.", rating: 4, text: "Loved the gear! Only wish the campaign timeline was a bit longer.", submittedAt: "2026-04-14T11:00:00.000Z", brandResponse: null }, { creator: "Jordan K.", rating: 5, text: "Best brand I've worked with. Clear expectations and they repost your content.", submittedAt: "2026-04-16T14:30:00.000Z", brandResponse: null }], imgUrl: "/assets/banner_nike.jpg", imgBg: "#111", imgIcon: "", industry: "fitness & training", featured: true },
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
    }, logoUrl: "/assets/logo_alani_nu.jpg", campaign: "Lifestyle & Energy Campaign", platforms: ["TikTok", "X"], following: "5k+", deliverables: { TikTok: "(1) video", X: "(2) posts" }, deadline: "05/30/26", comp: "$200", compType: "product+paid", spotsTotal: 20, spotsFilled: 14, description: "Alani Nu is looking for lifestyle and fitness creators to showcase our energy drink line in everyday moments — gym sessions, morning routines, study sessions, road trips. We want real, unscripted vibes that show how Alani fits naturally into your day. You'll receive a full product box plus $200 per creator.", location: "United States, Canada", requirements: "Must be 18+. Health/fitness or lifestyle niche preferred. No energy drink competitors for 60 days.", products: [{ name: "Alani Nu Energy Variety Pack", variant: "12 cans, mixed flavors" }], hasStyleGuide: false, reviews: [{ creator: "Sophie L.", rating: 5, text: "Payment was fast, product was delicious, and the team was so kind.", submittedAt: "2026-04-12T10:00:00.000Z", brandResponse: "So glad you loved it Sophie! Can't wait to work together again 🙌" }, { creator: "Chris M.", rating: 4, text: "Great experience overall. Would love to work together again.", submittedAt: "2026-04-17T08:00:00.000Z", brandResponse: null }], imgUrl: "/assets/banner_alani_nu.jpg", imgBg: "#111", imgIcon: "", industry: "wellness & supplements", featured: true },
  { brand: "Alo", stage: "accepted", creators: {
      approved: [
        { name: "Nina Williams", avatar: "NW", platforms: { Instagram: "88k" }, stage: "product_shipped" },
        { name: "David Park", avatar: "DP", platforms: { Instagram: "145k" }, stage: "accepted", acceptedAt: "2026-04-14T10:00:00.000Z" },
        { name: "Lena Kowalski", avatar: "LK", platforms: { Instagram: "52k" }, stage: "accepted", acceptedAt: "2026-04-13T10:00:00.000Z" },
        { name: "Marcus Johnson", avatar: "MJ", platforms: { Instagram: "210k" }, stage: "accepted", acceptedAt: "2026-04-14T10:00:00.000Z" },
        { name: "Aria Sato", avatar: "AS", platforms: { Instagram: "76k" }, stage: "accepted", acceptedAt: "2026-04-15T10:00:00.000Z" },
      ],
      pending: []
    }, logoUrl: "/assets/logo_alo.jpg", campaign: "Mindful Movement", platforms: ["Instagram"], following: "25k+", deliverables: { Instagram: "(1) reel + (1) static" }, deadline: "05/01/26", comp: "free product", compType: "product", spotsTotal: 10, spotsFilled: 5, description: "Alo is seeking mindful movement creators to showcase our latest studio-to-street collection. We're looking for authentic yoga and wellness creators who embody the Alo lifestyle. You'll receive a curated product box and create content that inspires your community to move with intention.", location: "United States", requirements: "Must be 18+. Yoga/wellness niche. Minimum 25k followers on Instagram. No competing activewear brands for 90 days.", products: [{ name: "Alo Warrior Mat", variant: "Stone" }, { name: "Alo Studio Top", variant: "Size provided" }, { name: "Alo High-Waist Legging", variant: "Size provided" }], hasStyleGuide: true, reviews: [], imgUrl: "/assets/banner_alo.jpg", imgBg: "#111", imgIcon: "", industry: "fashion & apparel", featured: false },
  { brand: "GoPro", stage: "open", creators: { approved: [
        { name: "Jake Sullivan", avatar: "JS", platforms: { YouTube: "180k", Instagram: "95k" }, stage: "product_shipped" },
      ], pending: [] }, logoUrl: "/assets/logo_gopro.jpg", campaign: "POV Creator Program", platforms: ["YouTube", "Instagram"], following: "50k+", deliverables: { YouTube: "(1) short + (1) review", Instagram: "(2) reels" }, deadline: "07/01/26", comp: "free product", compType: "product", spotsTotal: 15, spotsFilled: 3, description: "GoPro is searching for adventure creators who push limits. Whether you're surfing, skiing, mountain biking, or skydiving — if you live for the POV, we want you. You'll receive the HERO13 Black and full accessories kit to capture your next adventure.", location: "Worldwide", requirements: "Must be 18+. Adventure/action sports niche. 50k+ followers. Must have existing action/adventure content.", products: [{ name: "GoPro HERO13 Black", variant: "Standard" }, { name: "GoPro Accessories Kit", variant: "Full bundle" }], hasStyleGuide: false, reviews: [], imgUrl: "/assets/banner_gopro.jpg", imgBg: "#111", imgIcon: "", industry: "outdoors & adventure", featured: false },
];

export const DEMO_BRAND_META = {
  "Nike": { bio: "Nike is the world's leading athletic footwear and apparel brand. We exist to bring inspiration and innovation to every athlete in the world.", tagline: "just do it", location: "Beaverton, OR", website: "nike.com", founded: "1964", totalCampaigns: 48, totalCreators: 1240 },
  "Alani Nu": { bio: "Alani Nu makes better-for-you energy drinks, protein bars, and supplements designed for the health-conscious generation.", tagline: "fuel your lifestyle", location: "Louisville, KY", website: "alaninu.com", founded: "2018", totalCampaigns: 22, totalCreators: 410 },
  "Alo": { bio: "Alo exists to inspire mindful movement and bring yoga to the world. We make gear designed to go from the studio to the streets.", tagline: "mindful movement", location: "Los Angeles, CA", website: "aloyoga.com", founded: "2007", totalCampaigns: 31, totalCreators: 680 },
  "GoPro": { bio: "GoPro makes the world's most versatile cameras. We help people capture and share their most meaningful experiences.", tagline: "be a hero", location: "San Mateo, CA", website: "gopro.com", founded: "2002", totalCampaigns: 18, totalCreators: 290 },
};


export const DEMO_CAMPAIGNS = originalCampaigns.map((campaign, index) => ({...campaign, id: `demo-${index}`, isDemo: true}));
