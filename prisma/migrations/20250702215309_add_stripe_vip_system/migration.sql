/*
  Warnings:

  - You are about to drop the column `expires_at` on the `vip_subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `starts_at` on the `vip_subscriptions` table. All the data in the column will be lost.
  - Added the required column `current_period_end` to the `vip_subscriptions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `current_period_start` to the `vip_subscriptions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `stripe_customer_id` to the `vip_subscriptions` table without a default value. This is not possible if the table is not empty.
  - Made the column `stripe_subscription_id` on table `vip_subscriptions` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateTable
CREATE TABLE "stripe_customers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "stripe_customer_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "deleted_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "stripe_customers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "payment_methods" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "deleted_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "payment_methods_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "stripe_invoice_id" TEXT,
    "stripe_subscription_id" TEXT,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "status" TEXT NOT NULL,
    "description" TEXT,
    "failure_reason" TEXT,
    "paid_at" DATETIME,
    "refunded_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "webhook_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stripe_event_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "error" TEXT,
    "data" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL,
    "processed_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_vip_subscriptions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "stripe_subscription_id" TEXT NOT NULL,
    "stripe_customer_id" TEXT NOT NULL,
    "plan_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "price" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "current_period_start" DATETIME NOT NULL,
    "current_period_end" DATETIME NOT NULL,
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "canceled_at" DATETIME,
    "trial_start" DATETIME,
    "trial_end" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "vip_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_vip_subscriptions" ("created_at", "id", "plan_type", "price", "status", "stripe_subscription_id", "updated_at", "user_id") SELECT "created_at", "id", "plan_type", "price", "status", "stripe_subscription_id", "updated_at", "user_id" FROM "vip_subscriptions";
DROP TABLE "vip_subscriptions";
ALTER TABLE "new_vip_subscriptions" RENAME TO "vip_subscriptions";
CREATE UNIQUE INDEX "vip_subscriptions_stripe_subscription_id_key" ON "vip_subscriptions"("stripe_subscription_id");
CREATE INDEX "idx_user_subscription_status" ON "vip_subscriptions"("user_id", "status");
CREATE INDEX "idx_subscription_expiry" ON "vip_subscriptions"("status", "current_period_end");
CREATE INDEX "idx_stripe_subscription" ON "vip_subscriptions"("stripe_subscription_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "stripe_customers_user_id_key" ON "stripe_customers"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "stripe_customers_stripe_customer_id_key" ON "stripe_customers"("stripe_customer_id");

-- CreateIndex
CREATE INDEX "idx_stripe_customer" ON "stripe_customers"("stripe_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_methods_stripe_method_id_key" ON "payment_methods"("stripe_method_id");

-- CreateIndex
CREATE INDEX "idx_user_payments" ON "payments"("user_id", "status");

-- CreateIndex
CREATE INDEX "idx_stripe_invoice" ON "payments"("stripe_invoice_id");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_events_stripe_event_id_key" ON "webhook_events"("stripe_event_id");

-- CreateIndex
CREATE INDEX "idx_stripe_event" ON "webhook_events"("stripe_event_id");

-- CreateIndex
CREATE INDEX "idx_webhook_processing" ON "webhook_events"("event_type", "processed");

-- CreateIndex
CREATE INDEX "idx_webhook_cleanup" ON "webhook_events"("created_at");
