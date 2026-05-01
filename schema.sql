-- ============================================================
-- Nfluence — Supabase Schema
-- Run this in the Supabase SQL editor (Database > SQL Editor)
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================

create type user_role as enum ('brand', 'creator');
create type comp_type as enum ('product', 'paid', 'product+paid', 'other');
create type campaign_stage as enum ('draft', 'open', 'active', 'fulfillment', 'wrap_up');
create type creator_stage as enum ('applied', 'accepted', 'product_shipped', 'product_delivered', 'content_submitted', 'approved', 'paid');
create type application_status as enum ('applied', 'accepted', 'rejected');
create type notification_type as enum (
  'new_application', 'content_submitted', 'call_confirmed', 'call_declined',
  'application_accepted', 'application_rejected', 'product_shipped',
  'call_scheduled', 'content_approved', 'message_received'
);

-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================

create table profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  role user_role not null,
  name text,
  email text,
  created_at timestamptz default now()
);

-- Brand profile
create table brand_profiles (
  id uuid references profiles(id) on delete cascade primary key,
  bio text,
  tagline text,
  location text,
  website text,
  founded text,
  logo_url text,
  banner_url text,
  vibes text[], -- array of vibe tags
  socials jsonb default '{}'::jsonb, -- { Instagram: "@handle", ... }
  updated_at timestamptz default now()
);

-- Creator profile
create table creator_profiles (
  id uuid references profiles(id) on delete cascade primary key,
  bio text,
  location text,
  age text,
  languages text,
  niches text, -- comma-separated
  rating numeric(3,2) default 0,
  avatar_url text,
  banner_url text,
  instagram text,
  instagram_followers text,
  tiktok text,
  tiktok_followers text,
  youtube text,
  youtube_followers text,
  x text,
  x_followers text,
  facebook text,
  facebook_followers text,
  updated_at timestamptz default now()
);

-- ============================================================
-- CAMPAIGNS
-- ============================================================

create table campaigns (
  id uuid default uuid_generate_v4() primary key,
  brand_id uuid references profiles(id) on delete cascade not null,
  brand_name text not null,
  name text not null,
  description text,
  stage campaign_stage default 'open',
  comp_type comp_type,
  comp text, -- "$500" or "free product"
  spots_total int,
  spots_filled int default 0,
  platforms text[] default '{}',
  deliverables jsonb default '{}'::jsonb, -- { Instagram: "(1) reel", ... }
  following text, -- "25k"
  deadline text,
  location text,
  requirements text,
  products jsonb default '[]'::jsonb, -- [{ name, variant }]
  has_style_guide boolean default false,
  style_guide_url text,
  approval_required boolean default false,
  per_applicant_approval boolean default false,
  age_min text,
  language text,
  niches text,
  public_required boolean default false,
  contiguous_us boolean default false,
  state_specific boolean default false,
  us_state text,
  featured boolean default false,
  featured_weeks int default 0,
  featured_until timestamptz,
  img_url text,
  img_bg text,
  logo_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- APPLICATIONS (creator applies to campaign)
-- ============================================================

create table applications (
  id uuid default uuid_generate_v4() primary key,
  campaign_id uuid references campaigns(id) on delete cascade not null,
  creator_id uuid references profiles(id) on delete cascade not null,
  brand_id uuid references profiles(id) not null,
  status application_status default 'applied',
  stage creator_stage default 'applied',
  name text, -- creator name at time of apply
  email text,
  pitch text,
  portfolio text,
  platforms jsonb default '{}'::jsonb, -- { Instagram: "48k", TikTok: "120k" }
  tracking_number text,
  accepted_at timestamptz,
  shipped_at timestamptz,
  content_submitted_at timestamptz,
  approved_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(campaign_id, creator_id)
);

-- ============================================================
-- REVIEWS (creator reviews brand)
-- ============================================================

create table reviews (
  id uuid default uuid_generate_v4() primary key,
  campaign_id uuid references campaigns(id) on delete cascade not null,
  creator_id uuid references profiles(id) on delete cascade not null,
  brand_id uuid references profiles(id) not null,
  rating int check (rating between 1 and 5) not null,
  text text,
  brand_response text,
  submitted_at timestamptz default now()
);

-- ============================================================
-- MESSAGES
-- ============================================================

create table messages (
  id uuid default uuid_generate_v4() primary key,
  campaign_id uuid references campaigns(id) on delete cascade not null,
  sender_id uuid references profiles(id) on delete cascade not null,
  recipient_id uuid references profiles(id) on delete cascade not null,
  from_role user_role not null,
  text text not null,
  read boolean default false,
  created_at timestamptz default now()
);

-- ============================================================
-- SCHEDULED CALLS
-- ============================================================

create table scheduled_calls (
  id uuid default uuid_generate_v4() primary key,
  campaign_id uuid references campaigns(id) on delete cascade not null,
  brand_id uuid references profiles(id) not null,
  creator_id uuid references profiles(id) not null,
  datetime timestamptz not null,
  timezone text default 'America/New_York',
  notes text,
  meet_link text,
  confirmed boolean default false,
  declined boolean default false,
  created_at timestamptz default now()
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

create table notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  for_role user_role not null,
  type notification_type not null,
  title text,
  body text,
  read boolean default false,
  created_at timestamptz default now()
);

-- ============================================================
-- CONTENT UPLOADS (creator uploads deliverable)
-- ============================================================

create table content_uploads (
  id uuid default uuid_generate_v4() primary key,
  application_id uuid references applications(id) on delete cascade not null,
  campaign_id uuid references campaigns(id) on delete cascade not null,
  creator_id uuid references profiles(id) on delete cascade not null,
  file_name text,
  file_url text,
  status text default 'pending review', -- pending review | approved | revision requested
  revision_notes text,
  uploaded_at timestamptz default now()
);

-- ============================================================
-- PAYMENTS (Stripe charges)
-- ============================================================

create table payments (
  id uuid default uuid_generate_v4() primary key,
  brand_id uuid references profiles(id) on delete cascade not null,
  campaign_id uuid references campaigns(id) on delete cascade,
  stripe_payment_intent_id text unique,
  amount_cents int not null,
  type text not null, -- 'campaign_fee' | 'escrow' | 'featured'
  status text default 'pending', -- pending | succeeded | failed | refunded
  promo_code text,
  discount_pct numeric(5,2) default 0,
  created_at timestamptz default now()
);

-- ============================================================
-- SUBSCRIPTIONS (Stripe billing)
-- ============================================================

create table subscriptions (
  id                     uuid        primary key default gen_random_uuid(),
  brand_id               uuid        not null references profiles(id) on delete cascade,
  stripe_customer_id     text,
  stripe_subscription_id text        unique,
  status                 text        not null default 'incomplete',
  -- status values: 'incomplete' | 'active' | 'past_due' | 'canceled' | 'unpaid'
  plan                   text        not null default 'annual',
  current_period_start   timestamptz,
  current_period_end     timestamptz,
  cancel_at_period_end   boolean     not null default false,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- ============================================================
-- PROMO REDEMPTIONS (one-use promo tracking)
-- ============================================================

create table promo_redemptions (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references profiles(id) on delete cascade,
  promo_code text        not null,
  payment_id uuid        references payments(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (user_id, promo_code)
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table profiles enable row level security;
alter table brand_profiles enable row level security;
alter table creator_profiles enable row level security;
alter table campaigns enable row level security;
alter table applications enable row level security;
alter table reviews enable row level security;
alter table messages enable row level security;
alter table scheduled_calls enable row level security;
alter table notifications enable row level security;
alter table content_uploads enable row level security;
alter table payments enable row level security;
alter table subscriptions enable row level security;
alter table promo_redemptions enable row level security;

-- profiles: users can read all, only update their own
create policy "profiles_read_all" on profiles for select using (true);
create policy "profiles_update_own" on profiles for update using (auth.uid() = id);

-- brand_profiles: public read, own write
create policy "brand_profiles_read_all" on brand_profiles for select using (true);
create policy "brand_profiles_write_own" on brand_profiles for all using (auth.uid() = id);

-- creator_profiles: public read, own write
create policy "creator_profiles_read_all" on creator_profiles for select using (true);
create policy "creator_profiles_write_own" on creator_profiles for all using (auth.uid() = id);

-- campaigns: public read, brand owns write
create policy "campaigns_read_all" on campaigns for select using (true);
create policy "campaigns_insert_own" on campaigns for insert with check (auth.uid() = brand_id);
create policy "campaigns_update_own" on campaigns for update using (auth.uid() = brand_id);
create policy "campaigns_delete_own" on campaigns for delete using (auth.uid() = brand_id);

-- applications: brand sees their campaign apps, creator sees their own
create policy "applications_brand_read" on applications for select using (auth.uid() = brand_id);
create policy "applications_creator_read" on applications for select using (auth.uid() = creator_id);
create policy "applications_creator_insert" on applications for insert with check (auth.uid() = creator_id);
create policy "applications_brand_update" on applications for update using (auth.uid() = brand_id);
create policy "applications_creator_update_own" on applications for update using (auth.uid() = creator_id);

-- reviews: public read, creator inserts own, brand updates (response only)
create policy "reviews_read_all" on reviews for select using (true);
create policy "reviews_creator_insert" on reviews for insert with check (auth.uid() = creator_id);
create policy "reviews_brand_update" on reviews for update using (auth.uid() = brand_id);

-- messages: only sender and recipient can see
create policy "messages_read_own" on messages for select using (auth.uid() = sender_id or auth.uid() = recipient_id);
create policy "messages_insert_own" on messages for insert with check (auth.uid() = sender_id);
create policy "messages_update_own" on messages for update using (auth.uid() = recipient_id);

-- scheduled_calls: brand and creator in call can see
create policy "calls_read_own" on scheduled_calls for select using (auth.uid() = brand_id or auth.uid() = creator_id);
create policy "calls_brand_insert" on scheduled_calls for insert with check (auth.uid() = brand_id);
create policy "calls_update_own" on scheduled_calls for update using (auth.uid() = brand_id or auth.uid() = creator_id);

-- notifications: own only
create policy "notifications_read_own" on notifications for select using (auth.uid() = user_id);
create policy "notifications_update_own" on notifications for update using (auth.uid() = user_id);

-- content_uploads: brand and creator in campaign
create policy "uploads_read_own" on content_uploads for select using (auth.uid() = creator_id);
create policy "uploads_brand_read" on content_uploads for select using (
  auth.uid() in (select brand_id from campaigns where id = campaign_id)
);
create policy "uploads_creator_insert" on content_uploads for insert with check (auth.uid() = creator_id);
create policy "uploads_brand_update" on content_uploads for update using (
  auth.uid() in (select brand_id from campaigns where id = campaign_id)
);

-- payments: own only
create policy "payments_read_own" on payments for select using (auth.uid() = brand_id);
create policy "payments_insert_own" on payments for insert with check (auth.uid() = brand_id);

-- subscriptions: own read only — writes via service_role (Edge Function) only
create policy "subscriptions_select_own" on subscriptions for select to authenticated using (auth.uid() = brand_id);

-- promo_redemptions: own read only — writes via service_role (Edge Function) only
create policy "promo_redemptions_select_own" on promo_redemptions for select to authenticated using (auth.uid() = user_id);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, email, role)
  values (
    new.id,
    new.email,
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'creator')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger campaigns_updated_at before update on campaigns
  for each row execute procedure update_updated_at();
create trigger applications_updated_at before update on applications
  for each row execute procedure update_updated_at();
create trigger brand_profiles_updated_at before update on brand_profiles
  for each row execute procedure update_updated_at();
create trigger creator_profiles_updated_at before update on creator_profiles
  for each row execute procedure update_updated_at();

-- ============================================================
-- INDEXES
-- ============================================================

create index idx_campaigns_brand_id on campaigns(brand_id);
create index idx_campaigns_featured on campaigns(featured) where featured = true;
create index idx_applications_campaign_id on applications(campaign_id);
create index idx_applications_creator_id on applications(creator_id);
create index idx_applications_brand_id on applications(brand_id);
create index idx_messages_campaign_id on messages(campaign_id);
create index idx_notifications_user_id on notifications(user_id);
create index idx_notifications_unread on notifications(user_id, read) where read = false;
create index idx_reviews_brand_id on reviews(brand_id);
create index idx_scheduled_calls_creator_id on scheduled_calls(creator_id);
create index idx_scheduled_calls_brand_id on scheduled_calls(brand_id);
create index idx_subscriptions_brand_id on subscriptions(brand_id);
create index idx_subscriptions_status on subscriptions(status);
create index idx_promo_redemptions_user_id on promo_redemptions(user_id);
