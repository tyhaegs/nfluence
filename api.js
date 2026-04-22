// src/lib/api.js
// All data fetching / mutation functions.
// These replace the in-memory useState calls in NfluenceApp.jsx.

import { supabase } from './supabase';

// ============================================================
// PROFILES
// ============================================================

export const getProfile = async (userId) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
};

export const getBrandProfile = async (userId) => {
  const { data, error } = await supabase
    .from('brand_profiles')
    .select('*, profiles(name, email)')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
};

export const updateBrandProfile = async (userId, updates) => {
  const { data, error } = await supabase
    .from('brand_profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const getCreatorProfile = async (userId) => {
  const { data, error } = await supabase
    .from('creator_profiles')
    .select('*, profiles(name, email)')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
};

export const updateCreatorProfile = async (userId, updates) => {
  const { data, error } = await supabase
    .from('creator_profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
};

// ============================================================
// CAMPAIGNS
// ============================================================

// Get all public campaigns (browse page + landing page)
export const getPublicCampaigns = async () => {
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('stage', 'open')
    .order('featured', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;

  // Daily seed shuffle — featured first, non-featured second, each group randomized by date
  const seed = parseInt(new Date().toISOString().slice(0, 10).replace(/-/g, ''));
  const seededRand = (s) => { let x = Math.sin(s) * 10000; return x - Math.floor(x); };
  const shuffle = (arr, offset) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(seededRand(seed + i + offset) * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const featured = shuffle(data.filter(c => c.featured), 0);
  const regular = shuffle(data.filter(c => !c.featured), 1000);
  return [...featured, ...regular];
};

// Get brand's own campaigns
export const getBrandCampaigns = async (brandId) => {
  const { data, error } = await supabase
    .from('campaigns')
    .select(`
      *,
      applications(
        id, creator_id, status, stage, name, accepted_at, shipped_at,
        content_submitted_at, approved_at, paid_at, platforms, tracking_number,
        profiles(name)
      ),
      reviews(id, rating, text, brand_response, submitted_at, profiles(name))
    `)
    .eq('brand_id', brandId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
};

// Get single campaign with full detail
export const getCampaign = async (campaignId) => {
  const { data, error } = await supabase
    .from('campaigns')
    .select(`
      *,
      applications(
        id, creator_id, status, stage, name, accepted_at, shipped_at,
        content_submitted_at, approved_at, paid_at, platforms, tracking_number,
        creator_profiles(instagram, instagram_followers, tiktok, tiktok_followers,
          youtube, youtube_followers, x, x_followers, avatar_url, rating)
      ),
      reviews(id, rating, text, brand_response, submitted_at,
        creator_profiles(*)
      )
    `)
    .eq('id', campaignId)
    .single();
  if (error) throw error;
  return data;
};

// Create new campaign
export const createCampaign = async (brandId, campaignData) => {
  const { data, error } = await supabase
    .from('campaigns')
    .insert({
      brand_id: brandId,
      brand_name: campaignData.brand,
      name: campaignData.campaign,
      description: campaignData.description,
      stage: 'open',
      comp_type: campaignData.compType,
      comp: campaignData.comp,
      spots_total: campaignData.spotsTotal,
      platforms: campaignData.platforms,
      deliverables: campaignData.deliverables,
      following: campaignData.following,
      deadline: campaignData.deadline,
      location: campaignData.location,
      requirements: campaignData.requirements,
      products: campaignData.products,
      featured: campaignData.featured,
      featured_weeks: campaignData.featuredWeeks,
      featured_until: campaignData.featured
        ? new Date(Date.now() + (campaignData.featuredWeeks || 7) * 24 * 60 * 60 * 1000).toISOString()
        : null,
      img_bg: campaignData.imgBg || 'linear-gradient(135deg,#1a1a2e,#16213e)',
    })
    .select()
    .single();
  if (error) throw error;
  return data;
};

// Update campaign
export const updateCampaign = async (campaignId, updates) => {
  const { data, error } = await supabase
    .from('campaigns')
    .update({
      name: updates.campaign,
      description: updates.description,
      comp_type: updates.compType,
      comp: updates.comp,
      spots_total: updates.spotsTotal,
      platforms: updates.platforms,
      deliverables: updates.deliverables,
      following: updates.following,
      deadline: updates.deadline,
      location: updates.location,
      requirements: updates.requirements,
      products: updates.products,
      featured: updates.featured,
      featured_weeks: updates.featuredWeeks,
      featured_until: updates.featured
        ? new Date(Date.now() + (updates.featuredWeeks || 7) * 24 * 60 * 60 * 1000).toISOString()
        : null,
    })
    .eq('id', campaignId)
    .select()
    .single();
  if (error) throw error;
  return data;
};

// ============================================================
// APPLICATIONS
// ============================================================

// Creator applies to a campaign
export const applyToCampaign = async (campaignId, creatorId, brandId, applyData) => {
  const { data, error } = await supabase
    .from('applications')
    .insert({
      campaign_id: campaignId,
      creator_id: creatorId,
      brand_id: brandId,
      status: 'applied',
      stage: 'applied',
      name: applyData.name,
      email: applyData.email,
      pitch: applyData.pitch,
      portfolio: applyData.portfolio,
      platforms: applyData.platforms,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
};

// Get creator's applications
export const getCreatorApplications = async (creatorId) => {
  const { data, error } = await supabase
    .from('applications')
    .select('*, campaigns(id, brand_name, name, logo_url, comp_type, comp)')
    .eq('creator_id', creatorId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
};

// Get creator's active campaigns (accepted+)
export const getCreatorActiveCampaigns = async (creatorId) => {
  const ACTIVE_STAGES = ['accepted', 'product_shipped', 'product_delivered', 'content_submitted', 'approved'];
  const { data, error } = await supabase
    .from('applications')
    .select('*, campaigns(id, brand_name, name, logo_url, comp_type, comp, deadline, deliverables)')
    .eq('creator_id', creatorId)
    .in('stage', ACTIVE_STAGES)
    .order('accepted_at', { ascending: false });
  if (error) throw error;
  return data;
};

// Brand accepts/rejects application
export const updateApplicationStatus = async (applicationId, status) => {
  const updates = {
    status,
    stage: status === 'accepted' ? 'accepted' : 'applied',
  };
  if (status === 'accepted') updates.accepted_at = new Date().toISOString();
  const { data, error } = await supabase
    .from('applications')
    .update(updates)
    .eq('id', applicationId)
    .select()
    .single();
  if (error) throw error;
  return data;
};

// Advance creator stage (brand advances the pipeline)
export const advanceCreatorStage = async (applicationId, stage, extraData = {}) => {
  const updates = { stage, ...extraData };
  const stageTimestamps = {
    product_shipped: 'shipped_at',
    content_submitted: 'content_submitted_at',
    approved: 'approved_at',
    paid: 'paid_at',
  };
  if (stageTimestamps[stage]) {
    updates[stageTimestamps[stage]] = new Date().toISOString();
  }
  const { data, error } = await supabase
    .from('applications')
    .update(updates)
    .eq('id', applicationId)
    .select()
    .single();
  if (error) throw error;
  return data;
};

// ============================================================
// MESSAGES
// ============================================================

// Get all messages for a campaign thread between brand and creator
export const getMessages = async (campaignId, brandId, creatorId) => {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('campaign_id', campaignId)
    .or(`and(sender_id.eq.${brandId},recipient_id.eq.${creatorId}),and(sender_id.eq.${creatorId},recipient_id.eq.${brandId})`)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
};

// Send a message
export const sendMessage = async (campaignId, senderId, recipientId, fromRole, text) => {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      campaign_id: campaignId,
      sender_id: senderId,
      recipient_id: recipientId,
      from_role: fromRole,
      text,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
};

// Mark messages as read
export const markMessagesRead = async (campaignId, recipientId) => {
  const { error } = await supabase
    .from('messages')
    .update({ read: true })
    .eq('campaign_id', campaignId)
    .eq('recipient_id', recipientId)
    .eq('read', false);
  if (error) throw error;
};

// Subscribe to new messages in real-time
export const subscribeToMessages = (campaignId, callback) => {
  return supabase
    .channel(`messages:${campaignId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `campaign_id=eq.${campaignId}`,
    }, callback)
    .subscribe();
};

// Get all message threads for a brand's campaign (inbox)
export const getBrandInbox = async (campaignId) => {
  const { data, error } = await supabase
    .from('messages')
    .select('*, sender:sender_id(name), recipient:recipient_id(name)')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  // Group by the other party
  const threads = {};
  data.forEach(msg => {
    const otherParty = msg.from_role === 'creator' ? msg.sender_id : msg.recipient_id;
    if (!threads[otherParty]) threads[otherParty] = [];
    threads[otherParty].push(msg);
  });
  return threads;
};

// ============================================================
// NOTIFICATIONS
// ============================================================

export const getNotifications = async (userId) => {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data;
};

export const markNotificationRead = async (notificationId) => {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId);
  if (error) throw error;
};

export const markAllNotificationsRead = async (userId) => {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false);
  if (error) throw error;
};

export const createNotification = async (userId, forRole, type, title, body) => {
  const { data, error } = await supabase
    .from('notifications')
    .insert({ user_id: userId, for_role: forRole, type, title, body })
    .select()
    .single();
  if (error) throw error;
  return data;
};

// Subscribe to new notifications in real-time
export const subscribeToNotifications = (userId, callback) => {
  return supabase
    .channel(`notifications:${userId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${userId}`,
    }, callback)
    .subscribe();
};

// ============================================================
// SCHEDULED CALLS
// ============================================================

export const getScheduledCalls = async (userId, role) => {
  const filter = role === 'brand' ? 'brand_id' : 'creator_id';
  const { data, error } = await supabase
    .from('scheduled_calls')
    .select('*, campaigns(brand_name, name)')
    .eq(filter, userId)
    .eq('declined', false)
    .order('datetime', { ascending: true });
  if (error) throw error;
  return data;
};

export const createScheduledCall = async (campaignId, brandId, creatorId, callData) => {
  const { data, error } = await supabase
    .from('scheduled_calls')
    .insert({
      campaign_id: campaignId,
      brand_id: brandId,
      creator_id: creatorId,
      datetime: callData.datetime,
      timezone: callData.timezone,
      notes: callData.notes,
      meet_link: callData.meetLink,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const respondToCall = async (callId, response) => {
  const updates = response === 'confirm'
    ? { confirmed: true }
    : { declined: true };
  const { data, error } = await supabase
    .from('scheduled_calls')
    .update(updates)
    .eq('id', callId)
    .select()
    .single();
  if (error) throw error;
  return data;
};

// ============================================================
// REVIEWS
// ============================================================

export const getBrandReviews = async (brandId) => {
  const { data, error } = await supabase
    .from('reviews')
    .select('*, campaigns(name), creator_profiles(*, profiles(name))')
    .eq('brand_id', brandId)
    .order('submitted_at', { ascending: false });
  if (error) throw error;
  return data;
};

export const getCreatorReviews = async (creatorId) => {
  const { data, error } = await supabase
    .from('reviews')
    .select('*, campaigns(brand_name, name)')
    .eq('creator_id', creatorId)
    .order('submitted_at', { ascending: false });
  if (error) throw error;
  return data;
};

export const submitReview = async (campaignId, creatorId, brandId, rating, text) => {
  const { data, error } = await supabase
    .from('reviews')
    .insert({ campaign_id: campaignId, creator_id: creatorId, brand_id: brandId, rating, text })
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const respondToReview = async (reviewId, brandResponse) => {
  const { data, error } = await supabase
    .from('reviews')
    .update({ brand_response: brandResponse })
    .eq('id', reviewId)
    .select()
    .single();
  if (error) throw error;
  return data;
};

// ============================================================
// CONTENT UPLOADS
// ============================================================

export const submitContent = async (applicationId, campaignId, creatorId, file) => {
  // 1. Upload file to Supabase Storage
  const filePath = `uploads/${campaignId}/${creatorId}/${Date.now()}_${file.name}`;
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('content')
    .upload(filePath, file);
  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from('content')
    .getPublicUrl(filePath);

  // 2. Create upload record
  const { data, error } = await supabase
    .from('content_uploads')
    .insert({
      application_id: applicationId,
      campaign_id: campaignId,
      creator_id: creatorId,
      file_name: file.name,
      file_url: publicUrl,
      status: 'pending review',
    })
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const reviewContent = async (uploadId, status, revisionNotes = null) => {
  const { data, error } = await supabase
    .from('content_uploads')
    .update({ status, revision_notes: revisionNotes })
    .eq('id', uploadId)
    .select()
    .single();
  if (error) throw error;
  return data;
};

// ============================================================
// PAYMENTS (Stripe)
// ============================================================

export const recordPayment = async (brandId, campaignId, stripePaymentIntentId, amountCents, type, promoCode, discountPct) => {
  const { data, error } = await supabase
    .from('payments')
    .insert({
      brand_id: brandId,
      campaign_id: campaignId,
      stripe_payment_intent_id: stripePaymentIntentId,
      amount_cents: amountCents,
      type,
      status: 'pending',
      promo_code: promoCode || null,
      discount_pct: discountPct || 0,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const updatePaymentStatus = async (stripePaymentIntentId, status) => {
  const { data, error } = await supabase
    .from('payments')
    .update({ status })
    .eq('stripe_payment_intent_id', stripePaymentIntentId)
    .select()
    .single();
  if (error) throw error;
  return data;
};
