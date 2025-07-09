-- CreateTable
CREATE TABLE "offers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clinic_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "terms" TEXT,
    "discountType" TEXT NOT NULL DEFAULT 'PERCENTAGE',
    "discountValue" REAL NOT NULL,
    "original_price" REAL,
    "final_price" REAL,
    "valid_from" DATETIME NOT NULL,
    "valid_until" DATETIME NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "target_audience" TEXT NOT NULL DEFAULT 'ALL',
    "min_age" INTEGER,
    "max_age" INTEGER,
    "treatment_ids" TEXT NOT NULL DEFAULT '[]',
    "max_uses" INTEGER,
    "max_uses_per_user" INTEGER NOT NULL DEFAULT 1,
    "current_uses" INTEGER NOT NULL DEFAULT 0,
    "send_notification" BOOLEAN NOT NULL DEFAULT true,
    "notification_schedule" TEXT,
    "image_url" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "offers_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "offer_redemptions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "offer_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "appointment_id" TEXT,
    "redeemed_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "original_price" REAL NOT NULL,
    "discount_applied" REAL NOT NULL,
    "final_price" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "code" TEXT NOT NULL,
    "used_at" DATETIME,
    "expires_at" DATETIME NOT NULL,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "offer_redemptions_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offers" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "offer_redemptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "offer_redemptions_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "idx_clinic_active_offers" ON "offers"("clinic_id", "is_active");

-- CreateIndex
CREATE INDEX "idx_offer_validity" ON "offers"("valid_from", "valid_until");

-- CreateIndex
CREATE INDEX "idx_offer_targeting" ON "offers"("target_audience", "category");

-- CreateIndex
CREATE UNIQUE INDEX "offer_redemptions_code_key" ON "offer_redemptions"("code");

-- CreateIndex
CREATE INDEX "idx_user_offer_redemptions" ON "offer_redemptions"("user_id", "status");

-- CreateIndex
CREATE INDEX "idx_offer_usage" ON "offer_redemptions"("offer_id", "status");

-- CreateIndex
CREATE INDEX "idx_offer_expiry" ON "offer_redemptions"("expires_at");

-- CreateIndex
CREATE INDEX "idx_user_default_payment" ON "payment_methods"("user_id", "is_default");

-- CreateIndex
CREATE INDEX "idx_template_analytics" ON "reward_analytics"("template_id", "event_type");

-- CreateIndex
CREATE INDEX "idx_user_analytics" ON "reward_analytics"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_user_reward_redemptions" ON "reward_redemptions"("user_id", "status");

-- CreateIndex
CREATE INDEX "idx_template_redemptions" ON "reward_redemptions"("template_id");

-- CreateIndex
CREATE INDEX "idx_clinic_active_rewards" ON "reward_templates"("clinic_id", "is_active");
