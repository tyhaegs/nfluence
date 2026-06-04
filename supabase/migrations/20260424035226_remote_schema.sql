


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."application_status" AS ENUM (
    'applied',
    'accepted',
    'rejected'
);


ALTER TYPE "public"."application_status" OWNER TO "postgres";


CREATE TYPE "public"."campaign_stage" AS ENUM (
    'draft',
    'open',
    'active',
    'fulfillment',
    'wrap_up'
);


ALTER TYPE "public"."campaign_stage" OWNER TO "postgres";


CREATE TYPE "public"."comp_type" AS ENUM (
    'product',
    'paid',
    'product+paid',
    'other'
);


ALTER TYPE "public"."comp_type" OWNER TO "postgres";


CREATE TYPE "public"."creator_stage" AS ENUM (
    'applied',
    'accepted',
    'product_shipped',
    'product_delivered',
    'content_submitted',
    'approved',
    'paid'
);


ALTER TYPE "public"."creator_stage" OWNER TO "postgres";


CREATE TYPE "public"."notification_type" AS ENUM (
    'new_application',
    'content_submitted',
    'call_confirmed',
    'call_declined',
    'application_accepted',
    'application_rejected',
    'product_shipped',
    'call_scheduled',
    'content_approved',
    'message_received'
);


ALTER TYPE "public"."notification_type" OWNER TO "postgres";


CREATE TYPE "public"."user_role" AS ENUM (
    'brand',
    'creator'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  BEGIN
    INSERT INTO public.profiles (id, email, role)
    VALUES (
      new.id,
      new.email,
      coalesce((new.raw_user_meta_data->>'role')::user_role, 'creator')
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user: profiles insert failed for %: %', new.id, SQLERRM;
  END;
  RETURN new;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_application_brand_id"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
  BEGIN                                                                         
    SELECT brand_id                                                           
    INTO NEW.brand_id
    FROM campaigns
    WHERE id = NEW.campaign_id;
                                                                                
    IF NOT FOUND THEN
      RAISE EXCEPTION 'set_application_brand_id: campaign % not found — insert  
  rejected', NEW.campaign_id;                                                   
    END IF;
                                                                                
    RETURN NEW;                                                               
  END;
  $$;


ALTER FUNCTION "public"."set_application_brand_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."update_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_application_stage_transition"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$                                                                       
  DECLARE
    valid_next text[];
  BEGIN
    IF OLD.stage IS NOT DISTINCT FROM NEW.stage THEN
      RETURN NEW;                                                               
    END IF;
                                                                                
    IF OLD.stage IS NULL THEN                                                   
      RAISE NOTICE 'validate_application_stage_transition: application % has 
  NULL old stage — transition to % allowed (legacy row)', OLD.id, NEW.stage;    
      RETURN NEW;                                                             
    END IF;                                                                     
                                                                              
    CASE OLD.stage::text                                                        
      WHEN 'applied'           THEN valid_next := ARRAY['accepted'];
      WHEN 'accepted'          THEN valid_next := ARRAY['product_shipped'];     
      WHEN 'product_shipped'   THEN valid_next := ARRAY['content_submitted',    
  'product_delivered'];                                                         
      WHEN 'product_delivered' THEN valid_next := ARRAY['content_submitted'];   
      WHEN 'content_submitted' THEN valid_next := ARRAY['approved'];            
      WHEN 'approved'          THEN valid_next := ARRAY['paid'];              
      WHEN 'paid'              THEN valid_next := ARRAY[]::text[];              
      ELSE                                                                      
        RAISE NOTICE 'validate_application_stage_transition: application % has 
  unrecognised old stage "%" — transition to "%" allowed (unknown state,        
  skipping validation)', OLD.id, OLD.stage, NEW.stage;                        
        RETURN NEW;                                                             
    END CASE;                                                                 

    IF NOT (NEW.stage::text = ANY(valid_next)) THEN                             
      RAISE EXCEPTION
        'invalid stage transition on application %: "%" → "%" is not allowed    
  (valid next stages from "%": [%])',                                           
        OLD.id, OLD.stage, NEW.stage, OLD.stage, array_to_string(valid_next, ', 
  ')                                                                            
        USING ERRCODE = 'P0001';                                              
    END IF;                                                                     
                                                                              
    RAISE NOTICE 'validate_application_stage_transition: application % stage "%"
   → "%" OK', OLD.id, OLD.stage, NEW.stage;
                                                                                
    RETURN NEW;                                                               
  END;
  $$;


ALTER FUNCTION "public"."validate_application_stage_transition"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."applications" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "campaign_id" "uuid" NOT NULL,
    "creator_id" "uuid" NOT NULL,
    "brand_id" "uuid" NOT NULL,
    "status" "public"."application_status" DEFAULT 'applied'::"public"."application_status",
    "stage" "public"."creator_stage" DEFAULT 'applied'::"public"."creator_stage",
    "name" "text",
    "email" "text",
    "pitch" "text",
    "portfolio" "text",
    "platforms" "jsonb" DEFAULT '{}'::"jsonb",
    "tracking_number" "text",
    "accepted_at" timestamp with time zone,
    "shipped_at" timestamp with time zone,
    "content_submitted_at" timestamp with time zone,
    "approved_at" timestamp with time zone,
    "paid_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."applications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."brand_profiles" (
    "id" "uuid" NOT NULL,
    "bio" "text",
    "tagline" "text",
    "location" "text",
    "website" "text",
    "founded" "text",
    "logo_url" "text",
    "banner_url" "text",
    "vibes" "text"[],
    "socials" "jsonb" DEFAULT '{}'::"jsonb",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."brand_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."campaigns" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "brand_id" "uuid" NOT NULL,
    "brand_name" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "stage" "public"."campaign_stage" DEFAULT 'open'::"public"."campaign_stage",
    "comp_type" "public"."comp_type",
    "comp" "text",
    "spots_total" integer,
    "spots_filled" integer DEFAULT 0,
    "platforms" "text"[] DEFAULT '{}'::"text"[],
    "deliverables" "jsonb" DEFAULT '{}'::"jsonb",
    "following" "text",
    "deadline" "text",
    "location" "text",
    "requirements" "text",
    "products" "jsonb" DEFAULT '[]'::"jsonb",
    "has_style_guide" boolean DEFAULT false,
    "style_guide_url" "text",
    "approval_required" boolean DEFAULT false,
    "per_applicant_approval" boolean DEFAULT false,
    "age_min" "text",
    "language" "text",
    "niches" "text",
    "public_required" boolean DEFAULT false,
    "contiguous_us" boolean DEFAULT false,
    "state_specific" boolean DEFAULT false,
    "us_state" "text",
    "featured" boolean DEFAULT false,
    "featured_weeks" integer DEFAULT 0,
    "featured_until" timestamp with time zone,
    "img_url" "text",
    "img_bg" "text",
    "logo_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."campaigns" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."content_uploads" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "application_id" "uuid" NOT NULL,
    "campaign_id" "uuid" NOT NULL,
    "creator_id" "uuid" NOT NULL,
    "file_name" "text",
    "file_url" "text",
    "status" "text" DEFAULT 'pending review'::"text",
    "revision_notes" "text",
    "uploaded_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."content_uploads" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."creator_profiles" (
    "id" "uuid" NOT NULL,
    "bio" "text",
    "location" "text",
    "age" "text",
    "languages" "text",
    "niches" "text",
    "rating" numeric(3,2) DEFAULT 0,
    "avatar_url" "text",
    "banner_url" "text",
    "instagram" "text",
    "instagram_followers" "text",
    "tiktok" "text",
    "tiktok_followers" "text",
    "youtube" "text",
    "youtube_followers" "text",
    "x" "text",
    "x_followers" "text",
    "facebook" "text",
    "facebook_followers" "text",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."creator_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "campaign_id" "uuid" NOT NULL,
    "sender_id" "uuid" NOT NULL,
    "recipient_id" "uuid" NOT NULL,
    "from_role" "public"."user_role" NOT NULL,
    "text" "text" NOT NULL,
    "read" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "for_role" "public"."user_role" NOT NULL,
    "type" "public"."notification_type" NOT NULL,
    "title" "text",
    "body" "text",
    "read" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "brand_id" "uuid" NOT NULL,
    "campaign_id" "uuid",
    "stripe_payment_intent_id" "text",
    "amount_cents" integer NOT NULL,
    "type" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "promo_code" "text",
    "discount_pct" numeric(5,2) DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "role" "public"."user_role" NOT NULL,
    "name" "text",
    "email" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "bio" "text",
    "tagline" "text",
    "website" "text",
    "industry" "text",
    "city" "text",
    "state" "text",
    "country" "text",
    "location" "text",
    "phone" "text",
    "logo_url" "text",
    "banner_url" "text",
    "social_links" "jsonb" DEFAULT '{}'::"jsonb",
    "active" boolean DEFAULT true
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."profiles_public" AS
 SELECT "id",
    "name",
    "role",
    "logo_url",
    "banner_url",
    "tagline"
   FROM "public"."profiles";


ALTER VIEW "public"."profiles_public" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."promo_redemptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "promo_code" "text" NOT NULL,
    "payment_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."promo_redemptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reviews" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "campaign_id" "uuid" NOT NULL,
    "creator_id" "uuid" NOT NULL,
    "brand_id" "uuid" NOT NULL,
    "rating" integer NOT NULL,
    "text" "text",
    "brand_response" "text",
    "submitted_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "reviews_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."reviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."scheduled_calls" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "campaign_id" "uuid" NOT NULL,
    "brand_id" "uuid" NOT NULL,
    "creator_id" "uuid" NOT NULL,
    "datetime" timestamp with time zone NOT NULL,
    "timezone" "text" DEFAULT 'America/New_York'::"text",
    "notes" "text",
    "meet_link" "text",
    "confirmed" boolean DEFAULT false,
    "declined" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."scheduled_calls" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "brand_id" "uuid" NOT NULL,
    "stripe_customer_id" "text",
    "stripe_subscription_id" "text",
    "status" "text" DEFAULT 'incomplete'::"text" NOT NULL,
    "plan" "text" DEFAULT 'annual'::"text" NOT NULL,
    "current_period_start" timestamp with time zone,
    "current_period_end" timestamp with time zone,
    "cancel_at_period_end" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."subscriptions" OWNER TO "postgres";


ALTER TABLE ONLY "public"."applications"
    ADD CONSTRAINT "applications_campaign_id_creator_id_key" UNIQUE ("campaign_id", "creator_id");



ALTER TABLE ONLY "public"."applications"
    ADD CONSTRAINT "applications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."brand_profiles"
    ADD CONSTRAINT "brand_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."campaigns"
    ADD CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."content_uploads"
    ADD CONSTRAINT "content_uploads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."creator_profiles"
    ADD CONSTRAINT "creator_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_stripe_payment_intent_id_key" UNIQUE ("stripe_payment_intent_id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."promo_redemptions"
    ADD CONSTRAINT "promo_redemptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."promo_redemptions"
    ADD CONSTRAINT "promo_redemptions_user_id_promo_code_key" UNIQUE ("user_id", "promo_code");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."scheduled_calls"
    ADD CONSTRAINT "scheduled_calls_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_stripe_subscription_id_key" UNIQUE ("stripe_subscription_id");



CREATE INDEX "idx_applications_brand_id" ON "public"."applications" USING "btree" ("brand_id");



CREATE INDEX "idx_applications_campaign_id" ON "public"."applications" USING "btree" ("campaign_id");



CREATE INDEX "idx_applications_creator_id" ON "public"."applications" USING "btree" ("creator_id");



CREATE INDEX "idx_campaigns_brand_id" ON "public"."campaigns" USING "btree" ("brand_id");



CREATE INDEX "idx_campaigns_featured" ON "public"."campaigns" USING "btree" ("featured") WHERE ("featured" = true);



CREATE INDEX "idx_messages_campaign_id" ON "public"."messages" USING "btree" ("campaign_id");



CREATE INDEX "idx_notifications_unread" ON "public"."notifications" USING "btree" ("user_id", "read") WHERE ("read" = false);



CREATE INDEX "idx_notifications_user_id" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "idx_promo_redemptions_user_id" ON "public"."promo_redemptions" USING "btree" ("user_id");



CREATE INDEX "idx_reviews_brand_id" ON "public"."reviews" USING "btree" ("brand_id");



CREATE INDEX "idx_scheduled_calls_brand_id" ON "public"."scheduled_calls" USING "btree" ("brand_id");



CREATE INDEX "idx_scheduled_calls_creator_id" ON "public"."scheduled_calls" USING "btree" ("creator_id");



CREATE INDEX "idx_subscriptions_brand_id" ON "public"."subscriptions" USING "btree" ("brand_id");



CREATE INDEX "idx_subscriptions_status" ON "public"."subscriptions" USING "btree" ("status");



CREATE OR REPLACE TRIGGER "applications_updated_at" BEFORE UPDATE ON "public"."applications" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "brand_profiles_updated_at" BEFORE UPDATE ON "public"."brand_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "campaigns_updated_at" BEFORE UPDATE ON "public"."campaigns" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "creator_profiles_updated_at" BEFORE UPDATE ON "public"."creator_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_applications_set_brand_id" BEFORE INSERT ON "public"."applications" FOR EACH ROW EXECUTE FUNCTION "public"."set_application_brand_id"();



CREATE OR REPLACE TRIGGER "trg_applications_validate_stage" BEFORE UPDATE OF "stage" ON "public"."applications" FOR EACH ROW EXECUTE FUNCTION "public"."validate_application_stage_transition"();



ALTER TABLE ONLY "public"."applications"
    ADD CONSTRAINT "applications_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."applications"
    ADD CONSTRAINT "applications_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."applications"
    ADD CONSTRAINT "applications_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."brand_profiles"
    ADD CONSTRAINT "brand_profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."campaigns"
    ADD CONSTRAINT "campaigns_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."content_uploads"
    ADD CONSTRAINT "content_uploads_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."content_uploads"
    ADD CONSTRAINT "content_uploads_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."content_uploads"
    ADD CONSTRAINT "content_uploads_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."creator_profiles"
    ADD CONSTRAINT "creator_profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."promo_redemptions"
    ADD CONSTRAINT "promo_redemptions_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."promo_redemptions"
    ADD CONSTRAINT "promo_redemptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."scheduled_calls"
    ADD CONSTRAINT "scheduled_calls_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."scheduled_calls"
    ADD CONSTRAINT "scheduled_calls_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."scheduled_calls"
    ADD CONSTRAINT "scheduled_calls_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



CREATE POLICY "Users can insert own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



ALTER TABLE "public"."applications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "applications_brand_read" ON "public"."applications" FOR SELECT USING (("auth"."uid"() = "brand_id"));



CREATE POLICY "applications_brand_update" ON "public"."applications" FOR UPDATE USING (("auth"."uid"() = "brand_id"));



CREATE POLICY "applications_creator_insert" ON "public"."applications" FOR INSERT WITH CHECK (("auth"."uid"() = "creator_id"));



CREATE POLICY "applications_creator_read" ON "public"."applications" FOR SELECT USING (("auth"."uid"() = "creator_id"));



CREATE POLICY "applications_creator_update_own" ON "public"."applications" FOR UPDATE USING (("auth"."uid"() = "creator_id"));



ALTER TABLE "public"."brand_profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "brand_profiles_read_all" ON "public"."brand_profiles" FOR SELECT USING (true);



CREATE POLICY "brand_profiles_write_own" ON "public"."brand_profiles" USING (("auth"."uid"() = "id"));



CREATE POLICY "calls_brand_insert" ON "public"."scheduled_calls" FOR INSERT WITH CHECK (("auth"."uid"() = "brand_id"));



CREATE POLICY "calls_read_own" ON "public"."scheduled_calls" FOR SELECT USING ((("auth"."uid"() = "brand_id") OR ("auth"."uid"() = "creator_id")));



CREATE POLICY "calls_update_own" ON "public"."scheduled_calls" FOR UPDATE USING ((("auth"."uid"() = "brand_id") OR ("auth"."uid"() = "creator_id")));



ALTER TABLE "public"."campaigns" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "campaigns_delete_own" ON "public"."campaigns" FOR DELETE USING (("auth"."uid"() = "brand_id"));



CREATE POLICY "campaigns_insert_own" ON "public"."campaigns" FOR INSERT WITH CHECK (("auth"."uid"() = "brand_id"));



CREATE POLICY "campaigns_read_all" ON "public"."campaigns" FOR SELECT USING (true);



CREATE POLICY "campaigns_update_own" ON "public"."campaigns" FOR UPDATE USING (("auth"."uid"() = "brand_id"));



ALTER TABLE "public"."content_uploads" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."creator_profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "creator_profiles_read_all" ON "public"."creator_profiles" FOR SELECT USING (true);



CREATE POLICY "creator_profiles_write_own" ON "public"."creator_profiles" USING (("auth"."uid"() = "id"));



ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "messages_insert_own" ON "public"."messages" FOR INSERT WITH CHECK (("auth"."uid"() = "sender_id"));



CREATE POLICY "messages_read_own" ON "public"."messages" FOR SELECT USING ((("auth"."uid"() = "sender_id") OR ("auth"."uid"() = "recipient_id")));



CREATE POLICY "messages_update_own" ON "public"."messages" FOR UPDATE USING (("auth"."uid"() = "recipient_id"));



ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notifications_read_own" ON "public"."notifications" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "notifications_update_own" ON "public"."notifications" FOR UPDATE USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "payments_insert_own" ON "public"."payments" FOR INSERT WITH CHECK (("auth"."uid"() = "brand_id"));



CREATE POLICY "payments_read_own" ON "public"."payments" FOR SELECT USING (("auth"."uid"() = "brand_id"));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_insert_own" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "profiles_read_own" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "profiles_update_own" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



ALTER TABLE "public"."promo_redemptions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "promo_redemptions_select_own" ON "public"."promo_redemptions" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."reviews" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "reviews_brand_update" ON "public"."reviews" FOR UPDATE USING (("auth"."uid"() = "brand_id"));



CREATE POLICY "reviews_creator_insert" ON "public"."reviews" FOR INSERT WITH CHECK (("auth"."uid"() = "creator_id"));



CREATE POLICY "reviews_read_all" ON "public"."reviews" FOR SELECT USING (true);



ALTER TABLE "public"."scheduled_calls" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscriptions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "subscriptions_select_own" ON "public"."subscriptions" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "brand_id"));



CREATE POLICY "uploads_brand_read" ON "public"."content_uploads" FOR SELECT USING (("auth"."uid"() IN ( SELECT "campaigns"."brand_id"
   FROM "public"."campaigns"
  WHERE ("campaigns"."id" = "content_uploads"."campaign_id"))));



CREATE POLICY "uploads_brand_update" ON "public"."content_uploads" FOR UPDATE USING (("auth"."uid"() IN ( SELECT "campaigns"."brand_id"
   FROM "public"."campaigns"
  WHERE ("campaigns"."id" = "content_uploads"."campaign_id"))));



CREATE POLICY "uploads_creator_insert" ON "public"."content_uploads" FOR INSERT WITH CHECK (("auth"."uid"() = "creator_id"));



CREATE POLICY "uploads_read_own" ON "public"."content_uploads" FOR SELECT USING (("auth"."uid"() = "creator_id"));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_application_brand_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_application_brand_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_application_brand_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_application_stage_transition"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_application_stage_transition"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_application_stage_transition"() TO "service_role";


















GRANT ALL ON TABLE "public"."applications" TO "anon";
GRANT ALL ON TABLE "public"."applications" TO "authenticated";
GRANT ALL ON TABLE "public"."applications" TO "service_role";



GRANT ALL ON TABLE "public"."brand_profiles" TO "anon";
GRANT ALL ON TABLE "public"."brand_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."brand_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."campaigns" TO "anon";
GRANT ALL ON TABLE "public"."campaigns" TO "authenticated";
GRANT ALL ON TABLE "public"."campaigns" TO "service_role";



GRANT ALL ON TABLE "public"."content_uploads" TO "anon";
GRANT ALL ON TABLE "public"."content_uploads" TO "authenticated";
GRANT ALL ON TABLE "public"."content_uploads" TO "service_role";



GRANT ALL ON TABLE "public"."creator_profiles" TO "anon";
GRANT ALL ON TABLE "public"."creator_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."creator_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."payments" TO "anon";
GRANT ALL ON TABLE "public"."payments" TO "authenticated";
GRANT ALL ON TABLE "public"."payments" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."profiles_public" TO "anon";
GRANT ALL ON TABLE "public"."profiles_public" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles_public" TO "service_role";



GRANT ALL ON TABLE "public"."promo_redemptions" TO "anon";
GRANT ALL ON TABLE "public"."promo_redemptions" TO "authenticated";
GRANT ALL ON TABLE "public"."promo_redemptions" TO "service_role";



GRANT ALL ON TABLE "public"."reviews" TO "anon";
GRANT ALL ON TABLE "public"."reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."reviews" TO "service_role";



GRANT ALL ON TABLE "public"."scheduled_calls" TO "anon";
GRANT ALL ON TABLE "public"."scheduled_calls" TO "authenticated";
GRANT ALL ON TABLE "public"."scheduled_calls" TO "service_role";



GRANT ALL ON TABLE "public"."subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."subscriptions" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































