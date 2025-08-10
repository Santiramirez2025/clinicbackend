-- CreateTable
CREATE TABLE "clinics" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'ES',
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Madrid',
    "logo_url" TEXT,
    "website_url" TEXT,
    "brand_colors" TEXT,
    "business_hours" TEXT NOT NULL,
    "subscription_plan" TEXT NOT NULL DEFAULT 'FREE',
    "subscription_expires_at" TIMESTAMP(3),
    "max_professionals" INTEGER NOT NULL DEFAULT 2,
    "max_patients" INTEGER NOT NULL DEFAULT 100,
    "enable_vip_program" BOOLEAN NOT NULL DEFAULT true,
    "enable_notifications" BOOLEAN NOT NULL DEFAULT true,
    "enable_online_booking" BOOLEAN NOT NULL DEFAULT true,
    "enable_payments" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "onboarding_completed" BOOLEAN NOT NULL DEFAULT false,
    "settings" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "phone" TEXT,
    "avatar_url" TEXT,
    "birth_date" TIMESTAMP(3),
    "gender" TEXT,
    "primary_clinic_id" TEXT NOT NULL,
    "skin_type" TEXT,
    "allergies" TEXT,
    "medical_conditions" TEXT,
    "treatment_preferences" TEXT,
    "beauty_points" INTEGER NOT NULL DEFAULT 0,
    "total_investment" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sessions_completed" INTEGER NOT NULL DEFAULT 0,
    "loyalty_tier" TEXT NOT NULL DEFAULT 'BRONZE',
    "vip_status" BOOLEAN NOT NULL DEFAULT false,
    "push_token" TEXT,
    "device_platform" TEXT,
    "device_info" TEXT,
    "push_settings" TEXT,
    "email_notifications" BOOLEAN NOT NULL DEFAULT true,
    "sms_notifications" BOOLEAN NOT NULL DEFAULT false,
    "marketing_notifications" BOOLEAN NOT NULL DEFAULT true,
    "last_notification_sent" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_blocked" BOOLEAN NOT NULL DEFAULT false,
    "last_login_at" TIMESTAMP(3),
    "referral_code" TEXT,
    "referred_by" TEXT,
    "onboarding_completed" BOOLEAN NOT NULL DEFAULT false,
    "privacy_accepted" BOOLEAN NOT NULL DEFAULT false,
    "terms_accepted" BOOLEAN NOT NULL DEFAULT false,
    "marketing_accepted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professionals" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'PROFESSIONAL',
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "phone" TEXT,
    "avatar_url" TEXT,
    "license_number" TEXT,
    "specialties" TEXT NOT NULL,
    "certifications" TEXT,
    "experience" INTEGER,
    "bio" TEXT,
    "languages" TEXT,
    "employment_type" TEXT NOT NULL DEFAULT 'FULL_TIME',
    "hourly_rate" DOUBLE PRECISION,
    "commission_rate" DOUBLE PRECISION,
    "available_hours" TEXT,
    "working_days" TEXT,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "total_appointments" INTEGER NOT NULL DEFAULT 0,
    "total_revenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "patient_satisfaction" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "permissions" TEXT NOT NULL DEFAULT '[]',
    "can_manage_schedule" BOOLEAN NOT NULL DEFAULT true,
    "can_view_reports" BOOLEAN NOT NULL DEFAULT false,
    "can_manage_patients" BOOLEAN NOT NULL DEFAULT false,
    "can_manage_treatments" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "onboarding_completed" BOOLEAN NOT NULL DEFAULT false,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "professionals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professional_password_resets" (
    "id" TEXT NOT NULL,
    "professional_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "professional_password_resets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treatments" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "short_description" TEXT,
    "category" TEXT NOT NULL,
    "subcategory" TEXT,
    "duration_minutes" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "vip_price" DOUBLE PRECISION,
    "preparation_time" INTEGER NOT NULL DEFAULT 0,
    "icon_name" TEXT NOT NULL,
    "color" TEXT,
    "image_url" TEXT,
    "gallery" TEXT,
    "age_restriction" TEXT,
    "contraindications" TEXT,
    "requirements" TEXT,
    "aftercare_info" TEXT,
    "is_vip_exclusive" BOOLEAN NOT NULL DEFAULT false,
    "requires_consultation" BOOLEAN NOT NULL DEFAULT false,
    "max_sessions_per_month" INTEGER,
    "beauty_points_earned" INTEGER NOT NULL DEFAULT 10,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "is_popular" BOOLEAN NOT NULL DEFAULT false,
    "is_new" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT,
    "seo_title" TEXT,
    "seo_description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "treatments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "professional_id" TEXT NOT NULL,
    "treatment_id" TEXT NOT NULL,
    "scheduled_date" TIMESTAMP(3) NOT NULL,
    "scheduled_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Madrid',
    "duration_minutes" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "notes" TEXT,
    "professional_notes" TEXT,
    "cancel_reason" TEXT,
    "reschedule_reason" TEXT,
    "original_price" DOUBLE PRECISION NOT NULL,
    "final_price" DOUBLE PRECISION NOT NULL,
    "discount_applied" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "beauty_points_earned" INTEGER NOT NULL DEFAULT 0,
    "beauty_points_used" INTEGER NOT NULL DEFAULT 0,
    "reminder_sent" BOOLEAN NOT NULL DEFAULT false,
    "confirmation_sent" BOOLEAN NOT NULL DEFAULT false,
    "follow_up_sent" BOOLEAN NOT NULL DEFAULT false,
    "bookingSource" TEXT NOT NULL DEFAULT 'APP',
    "is_first_visit" BOOLEAN NOT NULL DEFAULT false,
    "confirmed_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vip_subscriptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "stripe_subscription_id" TEXT NOT NULL,
    "stripe_customer_id" TEXT NOT NULL,
    "stripe_price_id" TEXT NOT NULL,
    "plan_type" TEXT NOT NULL,
    "plan_name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "price" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "current_period_start" TIMESTAMP(3) NOT NULL,
    "current_period_end" TIMESTAMP(3) NOT NULL,
    "trial_start" TIMESTAMP(3),
    "trial_end" TIMESTAMP(3),
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "canceled_at" TIMESTAMP(3),
    "cancel_reason" TEXT,
    "monthly_treatments" INTEGER NOT NULL DEFAULT 2,
    "used_treatments" INTEGER NOT NULL DEFAULT 0,
    "discount_percentage" INTEGER NOT NULL DEFAULT 20,
    "priority_booking" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vip_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offers" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "short_description" TEXT,
    "terms" TEXT,
    "discountType" TEXT NOT NULL DEFAULT 'PERCENTAGE',
    "discountValue" DOUBLE PRECISION NOT NULL,
    "original_price" DOUBLE PRECISION,
    "final_price" DOUBLE PRECISION,
    "min_purchase" DOUBLE PRECISION,
    "valid_from" TIMESTAMP(3) NOT NULL,
    "valid_until" TIMESTAMP(3) NOT NULL,
    "target_audience" TEXT NOT NULL DEFAULT 'ALL',
    "min_age" INTEGER,
    "max_age" INTEGER,
    "gender_target" TEXT,
    "loyalty_tier_target" TEXT,
    "treatment_ids" TEXT NOT NULL DEFAULT '[]',
    "category_ids" TEXT NOT NULL DEFAULT '[]',
    "max_uses" INTEGER,
    "max_uses_per_user" INTEGER NOT NULL DEFAULT 1,
    "current_uses" INTEGER NOT NULL DEFAULT 0,
    "image_url" TEXT,
    "background_color" TEXT,
    "text_color" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "send_notification" BOOLEAN NOT NULL DEFAULT true,
    "notification_schedule" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "auto_apply" BOOLEAN NOT NULL DEFAULT false,
    "code" TEXT,
    "tags" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offer_redemptions" (
    "id" TEXT NOT NULL,
    "offer_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "appointment_id" TEXT,
    "redeemed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "original_price" DOUBLE PRECISION NOT NULL,
    "discount_applied" DOUBLE PRECISION NOT NULL,
    "final_price" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "code" TEXT NOT NULL,
    "used_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "usage_location" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offer_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "clinic_id" TEXT,
    "type" TEXT NOT NULL,
    "category" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "delivered" BOOLEAN NOT NULL DEFAULT false,
    "opened" BOOLEAN NOT NULL DEFAULT false,
    "clicked" BOOLEAN NOT NULL DEFAULT false,
    "channel" TEXT NOT NULL DEFAULT 'PUSH',
    "data" TEXT,
    "push_token" TEXT,
    "platform" TEXT,
    "error" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "campaign_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitations" (
    "id" TEXT NOT NULL,
    "inviter_id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "invitee_email" TEXT NOT NULL,
    "invitee_name" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reward_points" INTEGER NOT NULL DEFAULT 50,
    "bonus_points" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "message" TEXT,
    "invite_code" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wellness_tips" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "excerpt" TEXT,
    "category" TEXT NOT NULL,
    "target_age" TEXT,
    "target_gender" TEXT,
    "seasonality" TEXT,
    "icon_name" TEXT NOT NULL,
    "image_url" TEXT,
    "color" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "views" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "tags" TEXT,
    "author_name" TEXT,
    "source_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wellness_tips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stripe_customers" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "stripe_customer_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "tax_id" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "metadata" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stripe_customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_methods" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "stripe_method_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "last4" TEXT,
    "brand" TEXT,
    "expiry_month" INTEGER,
    "expiry_year" INTEGER,
    "funding" TEXT,
    "country" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "nickname" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "fingerprint" TEXT,
    "metadata" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "clinic_id" TEXT,
    "stripe_invoice_id" TEXT,
    "stripe_payment_intent_id" TEXT,
    "stripe_subscription_id" TEXT,
    "stripe_charge_id" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "status" TEXT NOT NULL,
    "description" TEXT,
    "paymentType" TEXT NOT NULL DEFAULT 'SUBSCRIPTION',
    "related_id" TEXT,
    "customer_name" TEXT,
    "customer_email" TEXT,
    "invoice_number" TEXT,
    "tax_amount" DOUBLE PRECISION,
    "failure_reason" TEXT,
    "refund_amount" DOUBLE PRECISION,
    "refund_reason" TEXT,
    "paid_at" TIMESTAMP(3),
    "refunded_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "metadata" TEXT,
    "receipt_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_events" (
    "id" TEXT NOT NULL,
    "stripe_event_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "error" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "data" TEXT NOT NULL,
    "livemode" BOOLEAN NOT NULL DEFAULT false,
    "api_version" TEXT,
    "event_created_at" TIMESTAMP(3) NOT NULL,
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reward_templates" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "short_description" TEXT,
    "type" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "value_type" TEXT NOT NULL DEFAULT 'PERCENTAGE',
    "points_cost" INTEGER NOT NULL,
    "margin_cost" DOUBLE PRECISION NOT NULL,
    "conditions" TEXT,
    "validity_days" INTEGER NOT NULL DEFAULT 30,
    "max_uses_per_month" INTEGER NOT NULL DEFAULT 10,
    "max_uses_per_user" INTEGER NOT NULL DEFAULT 1,
    "min_loyalty_score" INTEGER NOT NULL DEFAULT 0,
    "target_user_type" TEXT,
    "applicable_treatments" TEXT,
    "excluded_treatments" TEXT,
    "icon_name" TEXT NOT NULL,
    "color" TEXT,
    "image_url" TEXT,
    "badge" TEXT,
    "popularity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "conversion_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "seasonality" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "is_limited" BOOLEAN NOT NULL DEFAULT false,
    "auto_assign" BOOLEAN NOT NULL DEFAULT false,
    "stackable" BOOLEAN NOT NULL DEFAULT false,
    "transferable" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reward_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reward_redemptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "appointment_id" TEXT,
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "points_used" INTEGER NOT NULL,
    "discount_amount" DOUBLE PRECISION,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "transferred_to" TEXT,
    "transferred_at" TIMESTAMP(3),
    "transfer_code" TEXT,
    "notes" TEXT,
    "usage_location" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reward_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reward_analytics" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "metadata" TEXT,
    "user_loyalty_score" INTEGER NOT NULL,
    "user_tier" TEXT NOT NULL,
    "user_total_points" INTEGER NOT NULL,
    "user_vip_status" BOOLEAN NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "hour_of_day" INTEGER NOT NULL,
    "is_weekend" BOOLEAN NOT NULL,
    "conversion_value" DOUBLE PRECISION,
    "session_duration" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reward_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "professional_id" TEXT,
    "session_type" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "refresh_token" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "device_id" TEXT,
    "device_type" TEXT,
    "device_name" TEXT,
    "platform" TEXT,
    "app_version" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "location" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_revoked" BOOLEAN NOT NULL DEFAULT false,
    "last_activity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),
    "revoked_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "professional_id" TEXT,
    "clinic_id" TEXT,
    "actor_type" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resource_id" TEXT,
    "description" TEXT,
    "changes" TEXT,
    "old_values" TEXT,
    "new_values" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "platform" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'INFO',
    "category" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clinics_slug_key" ON "clinics"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "clinics_email_key" ON "clinics"("email");

-- CreateIndex
CREATE INDEX "idx_clinic_slug" ON "clinics"("slug");

-- CreateIndex
CREATE INDEX "idx_clinic_location" ON "clinics"("city", "is_active");

-- CreateIndex
CREATE INDEX "idx_clinic_subscription" ON "clinics"("subscription_plan", "subscription_expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_referral_code_key" ON "users"("referral_code");

-- CreateIndex
CREATE INDEX "idx_user_clinic" ON "users"("primary_clinic_id", "is_active");

-- CreateIndex
CREATE INDEX "idx_user_email" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_user_loyalty" ON "users"("loyalty_tier", "vip_status");

-- CreateIndex
CREATE INDEX "idx_user_referral" ON "users"("referral_code");

-- CreateIndex
CREATE UNIQUE INDEX "professionals_email_key" ON "professionals"("email");

-- CreateIndex
CREATE INDEX "idx_professional_clinic" ON "professionals"("clinic_id", "is_active");

-- CreateIndex
CREATE INDEX "idx_professional_email" ON "professionals"("email");

-- CreateIndex
CREATE INDEX "idx_professional_role" ON "professionals"("role", "clinic_id");

-- CreateIndex
CREATE UNIQUE INDEX "professional_password_resets_token_key" ON "professional_password_resets"("token");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_key" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "idx_treatment_clinic" ON "treatments"("clinic_id", "is_active");

-- CreateIndex
CREATE INDEX "idx_treatment_category" ON "treatments"("category", "is_active");

-- CreateIndex
CREATE INDEX "idx_treatment_special" ON "treatments"("is_vip_exclusive", "is_featured");

-- CreateIndex
CREATE INDEX "idx_appointment_user" ON "appointments"("user_id", "status");

-- CreateIndex
CREATE INDEX "idx_appointment_clinic_date" ON "appointments"("clinic_id", "scheduled_date");

-- CreateIndex
CREATE INDEX "idx_appointment_professional" ON "appointments"("professional_id", "scheduled_date");

-- CreateIndex
CREATE INDEX "idx_appointment_status" ON "appointments"("status", "scheduled_date");

-- CreateIndex
CREATE UNIQUE INDEX "vip_subscriptions_stripe_subscription_id_key" ON "vip_subscriptions"("stripe_subscription_id");

-- CreateIndex
CREATE INDEX "idx_user_subscription_status" ON "vip_subscriptions"("user_id", "status");

-- CreateIndex
CREATE INDEX "idx_subscription_expiry" ON "vip_subscriptions"("status", "current_period_end");

-- CreateIndex
CREATE INDEX "idx_stripe_subscription" ON "vip_subscriptions"("stripe_subscription_id");

-- CreateIndex
CREATE INDEX "idx_clinic_subscriptions" ON "vip_subscriptions"("clinic_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "offers_code_key" ON "offers"("code");

-- CreateIndex
CREATE INDEX "idx_clinic_active_offers" ON "offers"("clinic_id", "is_active");

-- CreateIndex
CREATE INDEX "idx_offer_validity" ON "offers"("valid_from", "valid_until");

-- CreateIndex
CREATE INDEX "idx_offer_targeting" ON "offers"("target_audience", "category");

-- CreateIndex
CREATE INDEX "idx_offer_code" ON "offers"("code");

-- CreateIndex
CREATE UNIQUE INDEX "offer_redemptions_code_key" ON "offer_redemptions"("code");

-- CreateIndex
CREATE INDEX "idx_user_offer_redemptions" ON "offer_redemptions"("user_id", "status");

-- CreateIndex
CREATE INDEX "idx_offer_usage" ON "offer_redemptions"("offer_id", "status");

-- CreateIndex
CREATE INDEX "idx_offer_expiry" ON "offer_redemptions"("expires_at");

-- CreateIndex
CREATE INDEX "idx_user_notification_type" ON "notification_logs"("user_id", "type");

-- CreateIndex
CREATE INDEX "idx_notification_date" ON "notification_logs"("sent_at");

-- CreateIndex
CREATE INDEX "idx_notification_status" ON "notification_logs"("delivered", "opened");

-- CreateIndex
CREATE INDEX "idx_clinic_notifications" ON "notification_logs"("clinic_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "invitations_invite_code_key" ON "invitations"("invite_code");

-- CreateIndex
CREATE INDEX "idx_inviter_status" ON "invitations"("inviter_id", "status");

-- CreateIndex
CREATE INDEX "idx_invite_code" ON "invitations"("invite_code");

-- CreateIndex
CREATE INDEX "idx_invitation_expiry" ON "invitations"("expires_at");

-- CreateIndex
CREATE INDEX "idx_wellness_clinic" ON "wellness_tips"("clinic_id", "is_active");

-- CreateIndex
CREATE INDEX "idx_wellness_category" ON "wellness_tips"("category", "is_active");

-- CreateIndex
CREATE INDEX "idx_wellness_featured" ON "wellness_tips"("is_featured", "priority");

-- CreateIndex
CREATE UNIQUE INDEX "stripe_customers_user_id_key" ON "stripe_customers"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "stripe_customers_stripe_customer_id_key" ON "stripe_customers"("stripe_customer_id");

-- CreateIndex
CREATE INDEX "idx_stripe_customer" ON "stripe_customers"("stripe_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_methods_stripe_method_id_key" ON "payment_methods"("stripe_method_id");

-- CreateIndex
CREATE INDEX "idx_user_default_payment" ON "payment_methods"("user_id", "is_default");

-- CreateIndex
CREATE INDEX "idx_user_active_payments" ON "payment_methods"("user_id", "is_active");

-- CreateIndex
CREATE INDEX "idx_user_payments" ON "payments"("user_id", "status");

-- CreateIndex
CREATE INDEX "idx_stripe_invoice" ON "payments"("stripe_invoice_id");

-- CreateIndex
CREATE INDEX "idx_clinic_payments" ON "payments"("clinic_id", "paymentType");

-- CreateIndex
CREATE INDEX "idx_payment_status" ON "payments"("status", "paid_at");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_events_stripe_event_id_key" ON "webhook_events"("stripe_event_id");

-- CreateIndex
CREATE INDEX "idx_stripe_event" ON "webhook_events"("stripe_event_id");

-- CreateIndex
CREATE INDEX "idx_webhook_processing" ON "webhook_events"("event_type", "processed");

-- CreateIndex
CREATE INDEX "idx_webhook_cleanup" ON "webhook_events"("created_at");

-- CreateIndex
CREATE INDEX "idx_clinic_active_rewards" ON "reward_templates"("clinic_id", "is_active");

-- CreateIndex
CREATE INDEX "idx_reward_cost" ON "reward_templates"("points_cost", "is_active");

-- CreateIndex
CREATE INDEX "idx_reward_featured" ON "reward_templates"("is_featured", "popularity");

-- CreateIndex
CREATE UNIQUE INDEX "reward_redemptions_code_key" ON "reward_redemptions"("code");

-- CreateIndex
CREATE INDEX "idx_user_reward_redemptions" ON "reward_redemptions"("user_id", "status");

-- CreateIndex
CREATE INDEX "idx_template_redemptions" ON "reward_redemptions"("template_id");

-- CreateIndex
CREATE INDEX "idx_reward_expiry" ON "reward_redemptions"("expires_at");

-- CreateIndex
CREATE INDEX "idx_reward_code" ON "reward_redemptions"("code");

-- CreateIndex
CREATE INDEX "idx_template_analytics" ON "reward_analytics"("template_id", "event_type");

-- CreateIndex
CREATE INDEX "idx_user_analytics" ON "reward_analytics"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_clinic_analytics" ON "reward_analytics"("clinic_id", "event_type");

-- CreateIndex
CREATE INDEX "idx_analytics_date" ON "reward_analytics"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_token_key" ON "user_sessions"("token");

-- CreateIndex
CREATE INDEX "idx_session_token" ON "user_sessions"("token");

-- CreateIndex
CREATE INDEX "idx_user_sessions" ON "user_sessions"("user_id", "is_active");

-- CreateIndex
CREATE INDEX "idx_professional_sessions" ON "user_sessions"("professional_id", "is_active");

-- CreateIndex
CREATE INDEX "idx_session_expiry" ON "user_sessions"("expires_at");

-- CreateIndex
CREATE INDEX "idx_audit_user_action" ON "audit_logs"("user_id", "action");

-- CreateIndex
CREATE INDEX "idx_audit_professional_action" ON "audit_logs"("professional_id", "action");

-- CreateIndex
CREATE INDEX "idx_audit_clinic_action" ON "audit_logs"("clinic_id", "action");

-- CreateIndex
CREATE INDEX "idx_audit_resource" ON "audit_logs"("resource", "resource_id");

-- CreateIndex
CREATE INDEX "idx_audit_date" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "idx_audit_severity" ON "audit_logs"("severity", "category");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_primary_clinic_id_fkey" FOREIGN KEY ("primary_clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professionals" ADD CONSTRAINT "professionals_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_password_resets" ADD CONSTRAINT "professional_password_resets_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professionals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatments" ADD CONSTRAINT "treatments_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professionals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_treatment_id_fkey" FOREIGN KEY ("treatment_id") REFERENCES "treatments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vip_subscriptions" ADD CONSTRAINT "vip_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_redemptions" ADD CONSTRAINT "offer_redemptions_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_redemptions" ADD CONSTRAINT "offer_redemptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_redemptions" ADD CONSTRAINT "offer_redemptions_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_inviter_id_fkey" FOREIGN KEY ("inviter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stripe_customers" ADD CONSTRAINT "stripe_customers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_templates" ADD CONSTRAINT "reward_templates_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_redemptions" ADD CONSTRAINT "reward_redemptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_redemptions" ADD CONSTRAINT "reward_redemptions_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "reward_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_redemptions" ADD CONSTRAINT "reward_redemptions_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professionals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
