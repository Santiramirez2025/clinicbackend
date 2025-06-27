-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "phone" TEXT,
    "avatar_url" TEXT,
    "birth_date" DATETIME,
    "skin_type" TEXT,
    "beauty_points" INTEGER NOT NULL DEFAULT 0,
    "total_investment" REAL NOT NULL DEFAULT 0,
    "sessions_completed" INTEGER NOT NULL DEFAULT 0,
    "vip_status" BOOLEAN NOT NULL DEFAULT false,
    "preferred_notifications" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "clinics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "logo_url" TEXT,
    "brand_colors" TEXT,
    "subscription_plan" TEXT NOT NULL DEFAULT 'FREE',
    "subscription_expires_at" DATETIME,
    "settings" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "professionals" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clinic_id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "specialties" TEXT NOT NULL,
    "avatar_url" TEXT,
    "bio" TEXT,
    "rating" REAL DEFAULT 5.0,
    "available_hours" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "professionals_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "treatments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clinic_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "price" REAL NOT NULL,
    "category" TEXT NOT NULL,
    "icon_name" TEXT NOT NULL,
    "is_vip_exclusive" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "treatments_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "professional_id" TEXT NOT NULL,
    "treatment_id" TEXT NOT NULL,
    "scheduled_date" DATETIME NOT NULL,
    "scheduled_time" DATETIME NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "beauty_points_earned" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "appointments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "appointments_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "appointments_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professionals" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "appointments_treatment_id_fkey" FOREIGN KEY ("treatment_id") REFERENCES "treatments" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "vip_subscriptions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "plan_type" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "stripe_subscription_id" TEXT,
    "starts_at" DATETIME NOT NULL,
    "expires_at" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "vip_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "invitations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "inviter_id" TEXT NOT NULL,
    "invitee_email" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reward_points" INTEGER NOT NULL DEFAULT 50,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accepted_at" DATETIME,
    CONSTRAINT "invitations_inviter_id_fkey" FOREIGN KEY ("inviter_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "wellness_tips" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "icon_name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "clinics_email_key" ON "clinics"("email");
