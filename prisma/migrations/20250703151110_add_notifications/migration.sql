-- AlterTable
ALTER TABLE "users" ADD COLUMN "device_info" TEXT;
ALTER TABLE "users" ADD COLUMN "device_platform" TEXT;
ALTER TABLE "users" ADD COLUMN "last_notification_sent" DATETIME;
ALTER TABLE "users" ADD COLUMN "push_settings" TEXT;
ALTER TABLE "users" ADD COLUMN "push_token" TEXT;

-- CreateTable
CREATE TABLE "notification_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "sent_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "delivered" BOOLEAN NOT NULL DEFAULT false,
    "opened" BOOLEAN NOT NULL DEFAULT false,
    "data" TEXT,
    "push_token" TEXT,
    "platform" TEXT,
    "error" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "notification_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "idx_user_notification_type" ON "notification_logs"("user_id", "type");

-- CreateIndex
CREATE INDEX "idx_notification_date" ON "notification_logs"("sent_at");

-- CreateIndex
CREATE INDEX "idx_notification_status" ON "notification_logs"("delivered", "opened");
