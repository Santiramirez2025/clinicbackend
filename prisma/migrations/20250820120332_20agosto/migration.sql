/*
  Warnings:

  - You are about to drop the column `bookingSource` on the `appointments` table. All the data in the column will be lost.
  - You are about to alter the column `timezone` on the `appointments` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - The `status` column on the `appointments` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to alter the column `priority` on the `appointments` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(10)`.
  - You are about to alter the column `original_price` on the `appointments` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(8,2)`.
  - You are about to alter the column `final_price` on the `appointments` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(8,2)`.
  - You are about to alter the column `discount_applied` on the `appointments` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(8,2)`.
  - You are about to alter the column `consent_status` on the `appointments` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `actor_type` on the `audit_logs` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `action` on the `audit_logs` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `resource` on the `audit_logs` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `resource_id` on the `audit_logs` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `ip_address` on the `audit_logs` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(45)`.
  - You are about to alter the column `platform` on the `audit_logs` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `severity` on the `audit_logs` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(10)`.
  - You are about to alter the column `category` on the `audit_logs` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(30)`.
  - You are about to alter the column `name` on the `clinics` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `slug` on the `clinics` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `email` on the `clinics` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `password_hash` on the `clinics` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `phone` on the `clinics` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `city` on the `clinics` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `country` on the `clinics` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(2)`.
  - You are about to alter the column `timezone` on the `clinics` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `subscription_plan` on the `clinics` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `autonomous_community` on the `clinics` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `health_registration` on the `clinics` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `medical_license` on the `clinics` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `name` on the `consent_form_templates` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `version` on the `consent_form_templates` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(10)`.
  - You are about to alter the column `language` on the `consent_form_templates` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(5)`.
  - You are about to alter the column `title` on the `consent_form_templates` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(200)`.
  - You are about to alter the column `invitee_email` on the `invitations` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `invitee_name` on the `invitations` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `status` on the `invitations` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `invite_code` on the `invitations` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `category` on the `notification_logs` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(30)`.
  - You are about to alter the column `title` on the `notification_logs` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(200)`.
  - You are about to alter the column `channel` on the `notification_logs` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(10)`.
  - You are about to alter the column `platform` on the `notification_logs` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(10)`.
  - You are about to alter the column `campaign_id` on the `notification_logs` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `original_price` on the `offer_redemptions` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(8,2)`.
  - You are about to alter the column `discount_applied` on the `offer_redemptions` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(8,2)`.
  - You are about to alter the column `final_price` on the `offer_redemptions` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(8,2)`.
  - You are about to alter the column `status` on the `offer_redemptions` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `code` on the `offer_redemptions` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `usage_location` on the `offer_redemptions` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `title` on the `offers` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `short_description` on the `offers` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(200)`.
  - You are about to alter the column `discountType` on the `offers` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `discountValue` on the `offers` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(8,2)`.
  - You are about to alter the column `original_price` on the `offers` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(8,2)`.
  - You are about to alter the column `final_price` on the `offers` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(8,2)`.
  - You are about to alter the column `min_purchase` on the `offers` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(8,2)`.
  - You are about to alter the column `target_audience` on the `offers` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(30)`.
  - You are about to alter the column `gender_target` on the `offers` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `loyalty_tier_target` on the `offers` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `background_color` on the `offers` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(7)`.
  - You are about to alter the column `text_color` on the `offers` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(7)`.
  - You are about to alter the column `category` on the `offers` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `code` on the `offers` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `token` on the `password_reset_tokens` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `status` on the `patient_consents` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `stripe_method_id` on the `payment_methods` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `type` on the `payment_methods` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `last4` on the `payment_methods` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(4)`.
  - You are about to alter the column `brand` on the `payment_methods` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `funding` on the `payment_methods` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `country` on the `payment_methods` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(2)`.
  - You are about to alter the column `nickname` on the `payment_methods` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `fingerprint` on the `payment_methods` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `stripe_invoice_id` on the `payments` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `stripe_payment_intent_id` on the `payments` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `stripe_subscription_id` on the `payments` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `stripe_charge_id` on the `payments` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `amount` on the `payments` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to alter the column `currency` on the `payments` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(3)`.
  - You are about to alter the column `paymentType` on the `payments` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `customer_name` on the `payments` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `customer_email` on the `payments` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `invoice_number` on the `payments` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `tax_amount` on the `payments` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(8,2)`.
  - You are about to alter the column `refund_amount` on the `payments` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to alter the column `token` on the `professional_password_resets` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `email` on the `professionals` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `password_hash` on the `professionals` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - The `role` column on the `professionals` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to alter the column `first_name` on the `professionals` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `last_name` on the `professionals` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `phone` on the `professionals` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `license_number` on the `professionals` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `employment_type` on the `professionals` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `hourly_rate` on the `professionals` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(8,2)`.
  - You are about to alter the column `commission_rate` on the `professionals` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(5,2)`.
  - You are about to alter the column `rating` on the `professionals` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(3,2)`.
  - You are about to alter the column `total_revenue` on the `professionals` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to alter the column `patient_satisfaction` on the `professionals` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(3,2)`.
  - You are about to alter the column `code` on the `reward_redemptions` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `status` on the `reward_redemptions` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `discount_amount` on the `reward_redemptions` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(8,2)`.
  - You are about to alter the column `transfer_code` on the `reward_redemptions` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `usage_location` on the `reward_redemptions` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `name` on the `reward_templates` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `short_description` on the `reward_templates` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(200)`.
  - You are about to alter the column `type` on the `reward_templates` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(30)`.
  - You are about to alter the column `value` on the `reward_templates` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(8,2)`.
  - You are about to alter the column `value_type` on the `reward_templates` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `margin_cost` on the `reward_templates` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(8,2)`.
  - You are about to alter the column `target_user_type` on the `reward_templates` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `icon_name` on the `reward_templates` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `color` on the `reward_templates` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(7)`.
  - You are about to alter the column `badge` on the `reward_templates` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `popularity` on the `reward_templates` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(5,4)`.
  - You are about to alter the column `conversion_rate` on the `reward_templates` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(5,4)`.
  - You are about to alter the column `stripe_customer_id` on the `stripe_customers` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `email` on the `stripe_customers` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `name` on the `stripe_customers` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `phone` on the `stripe_customers` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `tax_id` on the `stripe_customers` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to drop the column `regional_requirements` on the `treatments` table. All the data in the column will be lost.
  - You are about to alter the column `name` on the `treatments` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `short_description` on the `treatments` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(200)`.
  - You are about to alter the column `category` on the `treatments` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `subcategory` on the `treatments` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `price` on the `treatments` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(8,2)`.
  - You are about to alter the column `vip_price` on the `treatments` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(8,2)`.
  - You are about to alter the column `icon_name` on the `treatments` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `color` on the `treatments` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(7)`.
  - You are about to alter the column `seo_title` on the `treatments` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(200)`.
  - You are about to alter the column `recovery_time` on the `treatments` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `regulatory_category` on the `treatments` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `session_type` on the `user_sessions` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `token` on the `user_sessions` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `refresh_token` on the `user_sessions` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `device_id` on the `user_sessions` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `device_type` on the `user_sessions` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `device_name` on the `user_sessions` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `platform` on the `user_sessions` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `app_version` on the `user_sessions` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `ip_address` on the `user_sessions` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(45)`.
  - You are about to drop the column `allergies` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `medical_conditions` on the `users` table. All the data in the column will be lost.
  - You are about to alter the column `email` on the `users` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `password_hash` on the `users` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `first_name` on the `users` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `last_name` on the `users` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `phone` on the `users` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `gender` on the `users` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `skin_type` on the `users` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `total_investment` on the `users` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to alter the column `loyalty_tier` on the `users` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `device_platform` on the `users` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `referral_code` on the `users` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `referred_by` on the `users` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `stripe_subscription_id` on the `vip_subscriptions` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `stripe_customer_id` on the `vip_subscriptions` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `stripe_price_id` on the `vip_subscriptions` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `plan_type` on the `vip_subscriptions` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `plan_name` on the `vip_subscriptions` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `status` on the `vip_subscriptions` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `price` on the `vip_subscriptions` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(8,2)`.
  - You are about to alter the column `currency` on the `vip_subscriptions` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(3)`.
  - You are about to alter the column `discount` on the `vip_subscriptions` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(8,2)`.
  - You are about to alter the column `stripe_event_id` on the `webhook_events` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `event_type` on the `webhook_events` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `api_version` on the `webhook_events` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `title` on the `wellness_tips` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `excerpt` on the `wellness_tips` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(200)`.
  - You are about to alter the column `category` on the `wellness_tips` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(30)`.
  - You are about to alter the column `target_age` on the `wellness_tips` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `target_gender` on the `wellness_tips` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `icon_name` on the `wellness_tips` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `color` on the `wellness_tips` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(7)`.
  - You are about to alter the column `author_name` on the `wellness_tips` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to drop the `reward_analytics` table. If the table is not empty, all the data it contains will be lost.
  - Changed the type of `type` on the `notification_logs` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `status` on the `payments` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "public"."AppointmentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'RESCHEDULED');

-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('CLIENT', 'VIP_CLIENT', 'PROFESSIONAL', 'MANAGER', 'ADMIN');

-- CreateEnum
CREATE TYPE "public"."PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED');

-- CreateEnum
CREATE TYPE "public"."NotificationType" AS ENUM ('APPOINTMENT_REMINDER', 'APPOINTMENT_CONFIRMED', 'PROMOTION', 'WELLNESS_TIP', 'SYSTEM', 'BIRTHDAY', 'VIP_OFFER');

-- AlterEnum
ALTER TYPE "public"."TreatmentRiskLevel" ADD VALUE 'MEDICAL';

-- DropForeignKey
ALTER TABLE "public"."patient_consents" DROP CONSTRAINT "patient_consents_treatment_id_fkey";

-- DropIndex
DROP INDEX "public"."idx_patient_consent_user_treatment";

-- AlterTable
ALTER TABLE "public"."appointments" DROP COLUMN "bookingSource",
ADD COLUMN     "allergies_verified" BOOLEAN,
ADD COLUMN     "arrival_time" TIMESTAMP(3),
ADD COLUMN     "booking_source" VARCHAR(20) NOT NULL DEFAULT 'APP',
ADD COLUMN     "checkin_time" TIMESTAMP(3),
ADD COLUMN     "cleanup_time" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "contraindications_checked" BOOLEAN,
ADD COLUMN     "follow_up_date" TIMESTAMP(3),
ADD COLUMN     "follow_up_required" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "follow_up_scheduled" TIMESTAMP(3),
ADD COLUMN     "internal_notes" TEXT,
ADD COLUMN     "is_rescheduled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "loyalty_discount_applied" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "medications_reviewed" BOOLEAN,
ADD COLUMN     "next_appointment_suggested" TIMESTAMP(3),
ADD COLUMN     "no_show_at" TIMESTAMP(3),
ADD COLUMN     "offers_applied" TEXT,
ADD COLUMN     "patient_condition" TEXT,
ADD COLUMN     "payment_id" TEXT,
ADD COLUMN     "payment_method" VARCHAR(20),
ADD COLUMN     "payment_status" "public"."PaymentStatus",
ADD COLUMN     "post_treatment_care" TEXT,
ADD COLUMN     "preparation_time" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "procedure_details" TEXT,
ADD COLUMN     "promo_code" VARCHAR(20),
ADD COLUMN     "quality_control_passed" BOOLEAN,
ADD COLUMN     "quality_notes" TEXT,
ADD COLUMN     "recovery_period_days" INTEGER,
ADD COLUMN     "refund_amount" DECIMAL(8,2),
ADD COLUMN     "refund_reason" TEXT,
ADD COLUMN     "reminder_scheduled" TIMESTAMP(3),
ADD COLUMN     "reschedule_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "rescheduled_at" TIMESTAMP(3),
ADD COLUMN     "review_requested" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "risk_assessment_completed" BOOLEAN,
ADD COLUMN     "satisfaction_score" INTEGER,
ADD COLUMN     "special_instructions" TEXT,
ADD COLUMN     "tax_amount" DECIMAL(8,2) NOT NULL DEFAULT 0,
ADD COLUMN     "treatment_notes" TEXT,
ADD COLUMN     "vip_discount_applied" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "scheduled_date" SET DATA TYPE DATE,
ALTER COLUMN "timezone" SET DATA TYPE VARCHAR(50),
DROP COLUMN "status",
ADD COLUMN     "status" "public"."AppointmentStatus" NOT NULL DEFAULT 'PENDING',
ALTER COLUMN "priority" SET DATA TYPE VARCHAR(10),
ALTER COLUMN "original_price" SET DATA TYPE DECIMAL(8,2),
ALTER COLUMN "final_price" SET DATA TYPE DECIMAL(8,2),
ALTER COLUMN "discount_applied" SET DATA TYPE DECIMAL(8,2),
ALTER COLUMN "consent_status" SET DATA TYPE VARCHAR(20);

-- AlterTable
ALTER TABLE "public"."audit_logs" ADD COLUMN     "actor_email" VARCHAR(100),
ADD COLUMN     "gdpr_relevant" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requires_review" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "retention_policy" VARCHAR(20),
ADD COLUMN     "reviewed_at" TIMESTAMP(3),
ADD COLUMN     "reviewed_by" TEXT,
ADD COLUMN     "risk_level" VARCHAR(10),
ADD COLUMN     "session_id" VARCHAR(50),
ADD COLUMN     "tags" TEXT,
ALTER COLUMN "actor_type" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "action" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "resource" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "resource_id" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "ip_address" SET DATA TYPE VARCHAR(45),
ALTER COLUMN "platform" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "severity" SET DATA TYPE VARCHAR(10),
ALTER COLUMN "category" SET DATA TYPE VARCHAR(30);

-- AlterTable
ALTER TABLE "public"."clinics" ADD COLUMN     "email_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "enable_loyalty_program" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "last_login_at" TIMESTAMP(3),
ADD COLUMN     "max_advance_booking_days" INTEGER NOT NULL DEFAULT 90,
ADD COLUMN     "metadata" TEXT,
ADD COLUMN     "postal_code" VARCHAR(10),
ADD COLUMN     "tax_id" VARCHAR(20),
ALTER COLUMN "name" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "slug" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "email" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "password_hash" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "phone" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "city" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "country" SET DATA TYPE VARCHAR(2),
ALTER COLUMN "timezone" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "subscription_plan" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "autonomous_community" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "health_registration" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "medical_license" SET DATA TYPE VARCHAR(50);

-- AlterTable
ALTER TABLE "public"."consent_form_templates" ADD COLUMN     "allows_data_processing" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "data_retention_period" INTEGER,
ADD COLUMN     "minimum_age" INTEGER,
ADD COLUMN     "requires_parent_consent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requires_witness" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "name" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "version" SET DATA TYPE VARCHAR(10),
ALTER COLUMN "language" SET DATA TYPE VARCHAR(5),
ALTER COLUMN "title" SET DATA TYPE VARCHAR(200);

-- AlterTable
ALTER TABLE "public"."invitations" ADD COLUMN     "accepted_by" TEXT,
ADD COLUMN     "clicked_at" TIMESTAMP(3),
ADD COLUMN     "conversion_value" DECIMAL(8,2),
ADD COLUMN     "lifetime_value" DECIMAL(10,2),
ADD COLUMN     "sent_at" TIMESTAMP(3),
ADD COLUMN     "share_channel" VARCHAR(20),
ADD COLUMN     "viewed_at" TIMESTAMP(3),
ALTER COLUMN "invitee_email" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "invitee_name" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "status" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "invite_code" SET DATA TYPE VARCHAR(20);

-- AlterTable
ALTER TABLE "public"."notification_logs" ADD COLUMN     "batch_id" VARCHAR(50),
ADD COLUMN     "clicked_at" TIMESTAMP(3),
ADD COLUMN     "deep_link" TEXT,
ADD COLUMN     "delivered_at" TIMESTAMP(3),
ADD COLUMN     "image_url" TEXT,
ADD COLUMN     "is_personalized" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "last_retry_at" TIMESTAMP(3),
ADD COLUMN     "opened_at" TIMESTAMP(3),
ADD COLUMN     "user_segment" VARCHAR(50),
DROP COLUMN "type",
ADD COLUMN     "type" "public"."NotificationType" NOT NULL,
ALTER COLUMN "category" SET DATA TYPE VARCHAR(30),
ALTER COLUMN "title" SET DATA TYPE VARCHAR(200),
ALTER COLUMN "channel" SET DATA TYPE VARCHAR(10),
ALTER COLUMN "platform" SET DATA TYPE VARCHAR(10),
ALTER COLUMN "campaign_id" SET DATA TYPE VARCHAR(50);

-- AlterTable
ALTER TABLE "public"."offer_redemptions" ADD COLUMN     "device_info" TEXT,
ADD COLUMN     "ip_address" VARCHAR(45),
ALTER COLUMN "original_price" SET DATA TYPE DECIMAL(8,2),
ALTER COLUMN "discount_applied" SET DATA TYPE DECIMAL(8,2),
ALTER COLUMN "final_price" SET DATA TYPE DECIMAL(8,2),
ALTER COLUMN "status" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "code" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "usage_location" SET DATA TYPE VARCHAR(20);

-- AlterTable
ALTER TABLE "public"."offers" ADD COLUMN     "conversion_rate" DECIMAL(5,4) NOT NULL DEFAULT 0,
ADD COLUMN     "new_clients_only" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "redemption_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "total_revenue" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "view_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "vip_only" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "title" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "short_description" SET DATA TYPE VARCHAR(200),
ALTER COLUMN "discountType" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "discountValue" SET DATA TYPE DECIMAL(8,2),
ALTER COLUMN "original_price" SET DATA TYPE DECIMAL(8,2),
ALTER COLUMN "final_price" SET DATA TYPE DECIMAL(8,2),
ALTER COLUMN "min_purchase" SET DATA TYPE DECIMAL(8,2),
ALTER COLUMN "target_audience" SET DATA TYPE VARCHAR(30),
ALTER COLUMN "gender_target" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "loyalty_tier_target" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "background_color" SET DATA TYPE VARCHAR(7),
ALTER COLUMN "text_color" SET DATA TYPE VARCHAR(7),
ALTER COLUMN "category" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "code" SET DATA TYPE VARCHAR(20);

-- AlterTable
ALTER TABLE "public"."password_reset_tokens" ADD COLUMN     "ip_address" VARCHAR(45),
ADD COLUMN     "used_at" TIMESTAMP(3),
ADD COLUMN     "user_agent" TEXT,
ALTER COLUMN "token" SET DATA TYPE VARCHAR(255);

-- AlterTable
ALTER TABLE "public"."patient_consents" ADD COLUMN     "ip_address" VARCHAR(45),
ADD COLUMN     "parent_id" VARCHAR(20),
ADD COLUMN     "parent_name" VARCHAR(100),
ADD COLUMN     "parent_relation" VARCHAR(50),
ADD COLUMN     "parent_signature" TEXT,
ADD COLUMN     "previous_treatments" TEXT,
ADD COLUMN     "user_agent" TEXT,
ADD COLUMN     "witness_id" TEXT,
ADD COLUMN     "witness_name" VARCHAR(100),
ADD COLUMN     "witness_signature" TEXT,
ALTER COLUMN "treatment_id" DROP NOT NULL,
ALTER COLUMN "status" SET DATA TYPE VARCHAR(20);

-- AlterTable
ALTER TABLE "public"."payment_methods" ADD COLUMN     "failed_attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "last_used_at" TIMESTAMP(3),
ADD COLUMN     "three_d_secure_usage" VARCHAR(20),
ALTER COLUMN "stripe_method_id" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "type" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "last4" SET DATA TYPE VARCHAR(4),
ALTER COLUMN "brand" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "funding" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "country" SET DATA TYPE VARCHAR(2),
ALTER COLUMN "nickname" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "fingerprint" SET DATA TYPE VARCHAR(100);

-- AlterTable
ALTER TABLE "public"."payments" ADD COLUMN     "application_fee" DECIMAL(8,2),
ADD COLUMN     "is_recurring" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_refundable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "last4_digits" VARCHAR(4),
ADD COLUMN     "net_amount" DECIMAL(10,2),
ADD COLUMN     "payment_method_id" TEXT,
ADD COLUMN     "payment_method_type" VARCHAR(20),
ADD COLUMN     "stripe_fee" DECIMAL(8,2),
ADD COLUMN     "tax_rate" DECIMAL(5,4),
ALTER COLUMN "stripe_invoice_id" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "stripe_payment_intent_id" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "stripe_subscription_id" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "stripe_charge_id" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "amount" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "currency" SET DATA TYPE VARCHAR(3),
DROP COLUMN "status",
ADD COLUMN     "status" "public"."PaymentStatus" NOT NULL,
ALTER COLUMN "paymentType" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "customer_name" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "customer_email" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "invoice_number" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "tax_amount" SET DATA TYPE DECIMAL(8,2),
ALTER COLUMN "refund_amount" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "public"."professional_password_resets" ADD COLUMN     "ip_address" VARCHAR(45),
ADD COLUMN     "used_at" TIMESTAMP(3),
ADD COLUMN     "user_agent" TEXT,
ALTER COLUMN "token" SET DATA TYPE VARCHAR(255);

-- AlterTable
ALTER TABLE "public"."professionals" ADD COLUMN     "birth_date" DATE,
ADD COLUMN     "can_process_payments" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "cancellation_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN     "education" TEXT,
ADD COLUMN     "email_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notification_settings" TEXT,
ADD COLUMN     "on_time_percentage" DECIMAL(5,2) NOT NULL DEFAULT 100,
ADD COLUMN     "work_preferences" TEXT,
ALTER COLUMN "email" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "password_hash" SET DATA TYPE VARCHAR(255),
DROP COLUMN "role",
ADD COLUMN     "role" "public"."UserRole" NOT NULL DEFAULT 'PROFESSIONAL',
ALTER COLUMN "first_name" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "last_name" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "phone" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "license_number" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "employment_type" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "hourly_rate" SET DATA TYPE DECIMAL(8,2),
ALTER COLUMN "commission_rate" SET DATA TYPE DECIMAL(5,2),
ALTER COLUMN "rating" SET DATA TYPE DECIMAL(3,2),
ALTER COLUMN "total_revenue" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "patient_satisfaction" SET DATA TYPE DECIMAL(3,2);

-- AlterTable
ALTER TABLE "public"."reward_redemptions" ADD COLUMN     "ip_address" VARCHAR(45),
ALTER COLUMN "code" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "status" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "discount_amount" SET DATA TYPE DECIMAL(8,2),
ALTER COLUMN "transfer_code" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "usage_location" SET DATA TYPE VARCHAR(20);

-- AlterTable
ALTER TABLE "public"."reward_templates" ADD COLUMN     "stock_limit" INTEGER,
ADD COLUMN     "stock_remaining" INTEGER,
ALTER COLUMN "name" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "short_description" SET DATA TYPE VARCHAR(200),
ALTER COLUMN "type" SET DATA TYPE VARCHAR(30),
ALTER COLUMN "value" SET DATA TYPE DECIMAL(8,2),
ALTER COLUMN "value_type" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "margin_cost" SET DATA TYPE DECIMAL(8,2),
ALTER COLUMN "target_user_type" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "icon_name" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "color" SET DATA TYPE VARCHAR(7),
ALTER COLUMN "badge" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "popularity" SET DATA TYPE DECIMAL(5,4),
ALTER COLUMN "conversion_rate" SET DATA TYPE DECIMAL(5,4);

-- AlterTable
ALTER TABLE "public"."stripe_customers" ADD COLUMN     "account_balance" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "credit_balance" DECIMAL(10,2) NOT NULL DEFAULT 0,
ALTER COLUMN "stripe_customer_id" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "email" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "name" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "phone" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "tax_id" SET DATA TYPE VARCHAR(20);

-- AlterTable
ALTER TABLE "public"."treatments" DROP COLUMN "regional_requirements",
ADD COLUMN     "avg_rating" DECIMAL(3,2),
ADD COLUMN     "cleanup_time" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "commission_rate" DECIMAL(5,2),
ADD COLUMN     "follow_up_days" INTEGER,
ADD COLUMN     "is_archived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "maximum_age" INTEGER,
ADD COLUMN     "required_certifications" TEXT,
ADD COLUMN     "total_bookings" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "view_count" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "name" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "short_description" SET DATA TYPE VARCHAR(200),
ALTER COLUMN "category" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "subcategory" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "price" SET DATA TYPE DECIMAL(8,2),
ALTER COLUMN "vip_price" SET DATA TYPE DECIMAL(8,2),
ALTER COLUMN "icon_name" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "color" SET DATA TYPE VARCHAR(7),
ALTER COLUMN "seo_title" SET DATA TYPE VARCHAR(200),
ALTER COLUMN "recovery_time" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "regulatory_category" SET DATA TYPE VARCHAR(50);

-- AlterTable
ALTER TABLE "public"."user_sessions" ADD COLUMN     "city" VARCHAR(50),
ADD COLUMN     "country" VARCHAR(2),
ADD COLUMN     "login_method" VARCHAR(20) NOT NULL DEFAULT 'PASSWORD',
ADD COLUMN     "suspicious_activity" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "session_type" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "token" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "refresh_token" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "device_id" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "device_type" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "device_name" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "platform" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "app_version" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "ip_address" SET DATA TYPE VARCHAR(45);

-- AlterTable
ALTER TABLE "public"."users" DROP COLUMN "allergies",
DROP COLUMN "medical_conditions",
ADD COLUMN     "average_rating" DECIMAL(3,2),
ADD COLUMN     "beauty_goals" TEXT,
ADD COLUMN     "block_reason" TEXT,
ADD COLUMN     "cancelled_appointments" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "emergency_contact" TEXT,
ADD COLUMN     "gdpr_accepted_at" TIMESTAMP(3),
ADD COLUMN     "locked_until" TIMESTAMP(3),
ADD COLUMN     "login_attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "no_show_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "permissions" TEXT NOT NULL DEFAULT '[]',
ADD COLUMN     "preferred_currency" VARCHAR(3) NOT NULL DEFAULT 'EUR',
ADD COLUMN     "preferred_language" VARCHAR(5) NOT NULL DEFAULT 'es',
ADD COLUMN     "reminder_preference" VARCHAR(10) NOT NULL DEFAULT '24h',
ADD COLUMN     "role" "public"."UserRole" NOT NULL DEFAULT 'CLIENT',
ADD COLUMN     "timezone" VARCHAR(50) NOT NULL DEFAULT 'Europe/Madrid',
ADD COLUMN     "total_appointments" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "vip_since" TIMESTAMP(3),
ALTER COLUMN "email" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "password_hash" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "first_name" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "last_name" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "phone" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "birth_date" SET DATA TYPE DATE,
ALTER COLUMN "gender" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "skin_type" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "total_investment" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "loyalty_tier" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "device_platform" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "referral_code" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "referred_by" SET DATA TYPE VARCHAR(20);

-- AlterTable
ALTER TABLE "public"."vip_subscriptions" ADD COLUMN     "auto_renew" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "beauty_points_multiplier" DECIMAL(3,2) NOT NULL DEFAULT 1.5,
ADD COLUMN     "cancel_feedback" TEXT,
ADD COLUMN     "dedicated_support" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "early_access_treatments" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "exclusive_offers" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "free_consultations" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lifetime_value" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "personalized_recommendations" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "renewal_reminded" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "renewal_reminder_at" TIMESTAMP(3),
ADD COLUMN     "total_investment" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "total_savings" DECIMAL(8,2) NOT NULL DEFAULT 0,
ADD COLUMN     "treatments_used" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "stripe_subscription_id" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "stripe_customer_id" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "stripe_price_id" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "plan_type" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "plan_name" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "status" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "price" SET DATA TYPE DECIMAL(8,2),
ALTER COLUMN "currency" SET DATA TYPE VARCHAR(3),
ALTER COLUMN "discount" SET DATA TYPE DECIMAL(8,2);

-- AlterTable
ALTER TABLE "public"."webhook_events" ADD COLUMN     "last_retry_at" TIMESTAMP(3),
ADD COLUMN     "processing_completed_at" TIMESTAMP(3),
ADD COLUMN     "processing_started_at" TIMESTAMP(3),
ADD COLUMN     "processing_time_ms" INTEGER,
ALTER COLUMN "stripe_event_id" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "event_type" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "api_version" SET DATA TYPE VARCHAR(20);

-- AlterTable
ALTER TABLE "public"."wellness_tips" ADD COLUMN     "bookmarks" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "difficulty" VARCHAR(20) NOT NULL DEFAULT 'EASY',
ADD COLUMN     "loyalty_tier" VARCHAR(20),
ADD COLUMN     "published_at" TIMESTAMP(3),
ADD COLUMN     "rating" DECIMAL(3,2),
ADD COLUMN     "read_time" INTEGER,
ADD COLUMN     "seo_description" TEXT,
ADD COLUMN     "seo_title" VARCHAR(200),
ADD COLUMN     "target_skin_type" VARCHAR(20),
ADD COLUMN     "video_url" TEXT,
ALTER COLUMN "title" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "excerpt" SET DATA TYPE VARCHAR(200),
ALTER COLUMN "category" SET DATA TYPE VARCHAR(30),
ALTER COLUMN "target_age" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "target_gender" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "icon_name" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "color" SET DATA TYPE VARCHAR(7),
ALTER COLUMN "author_name" SET DATA TYPE VARCHAR(100);

-- DropTable
DROP TABLE "public"."reward_analytics";

-- CreateTable
CREATE TABLE "public"."regional_configs" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "autonomous_community" VARCHAR(50) NOT NULL,
    "requires_medical_license" BOOLEAN NOT NULL DEFAULT false,
    "high_risk_requires_doctor" BOOLEAN NOT NULL DEFAULT true,
    "mandatory_consent_types" TEXT NOT NULL DEFAULT '[]',
    "minimum_consultation_time" INTEGER,
    "allowed_treatment_types" TEXT NOT NULL DEFAULT '[]',
    "restricted_treatment_types" TEXT NOT NULL DEFAULT '[]',
    "required_documentation" TEXT NOT NULL DEFAULT '[]',
    "special_requirements" TEXT,
    "restricted_hours" TEXT,
    "mandatory_breaks" TEXT,
    "max_treatment_duration" INTEGER,
    "mandatory_waiting_time" INTEGER,
    "requires_parental_consent" BOOLEAN NOT NULL DEFAULT false,
    "minimum_age_for_treatments" INTEGER,
    "data_retention_period" INTEGER,
    "mandatory_reporting_period" INTEGER,
    "requires_health_inspection" BOOLEAN NOT NULL DEFAULT false,
    "inspection_frequency" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "regional_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."consent_history" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "consent_type" VARCHAR(50) NOT NULL,
    "version" VARCHAR(10) NOT NULL DEFAULT '1.0',
    "is_consented" BOOLEAN NOT NULL,
    "consented_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "method" VARCHAR(20) NOT NULL DEFAULT 'DIGITAL',
    "digital_signature" TEXT,
    "witness_id" TEXT,
    "notes" TEXT,
    "legal_basis" VARCHAR(100),
    "processing_purpose" TEXT,
    "data_categories" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consent_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."appointment_reviews" (
    "id" TEXT NOT NULL,
    "appointment_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "professional_id" TEXT NOT NULL,
    "treatment_id" TEXT NOT NULL,
    "overall_rating" INTEGER NOT NULL,
    "professional_rating" INTEGER NOT NULL,
    "treatment_rating" INTEGER NOT NULL,
    "facility_rating" INTEGER NOT NULL,
    "value_rating" INTEGER NOT NULL,
    "title" VARCHAR(100),
    "comment" TEXT,
    "pros" TEXT,
    "cons" TEXT,
    "would_recommend" BOOLEAN NOT NULL,
    "would_return" BOOLEAN NOT NULL,
    "is_approved" BOOLEAN NOT NULL DEFAULT false,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "moderated_by" TEXT,
    "moderated_at" TIMESTAMP(3),
    "is_anonymous" BOOLEAN NOT NULL DEFAULT false,
    "helpful_votes" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointment_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."analytics_events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "clinic_id" TEXT,
    "session_id" VARCHAR(50),
    "event_name" VARCHAR(50) NOT NULL,
    "event_type" VARCHAR(30) NOT NULL,
    "category" VARCHAR(30),
    "properties" TEXT,
    "value" DECIMAL(10,2),
    "user_type" VARCHAR(20),
    "loyalty_tier" VARCHAR(20),
    "is_vip" BOOLEAN,
    "user_segment" VARCHAR(30),
    "platform" VARCHAR(20),
    "device_type" VARCHAR(20),
    "app_version" VARCHAR(20),
    "screen_name" VARCHAR(50),
    "day_of_week" INTEGER,
    "hour_of_day" INTEGER,
    "is_weekend" BOOLEAN,
    "time_zone" VARCHAR(50),
    "country" VARCHAR(2),
    "city" VARCHAR(50),
    "ip_address" VARCHAR(45),
    "funnel" VARCHAR(30),
    "touchpoint" VARCHAR(30),
    "campaign" VARCHAR(50),
    "source" VARCHAR(30),
    "medium" VARCHAR(30),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."business_metrics" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "metric_date" DATE NOT NULL,
    "metric_period" VARCHAR(10) NOT NULL,
    "total_appointments" INTEGER NOT NULL DEFAULT 0,
    "completed_appointments" INTEGER NOT NULL DEFAULT 0,
    "cancelled_appointments" INTEGER NOT NULL DEFAULT 0,
    "no_show_appointments" INTEGER NOT NULL DEFAULT 0,
    "total_revenue" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "vip_revenue" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "avg_revenue_per_user" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "avg_order_value" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "new_users" INTEGER NOT NULL DEFAULT 0,
    "active_users" INTEGER NOT NULL DEFAULT 0,
    "returning_users" INTEGER NOT NULL DEFAULT 0,
    "churned_users" INTEGER NOT NULL DEFAULT 0,
    "signup_conversion" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "booking_conversion" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "vip_conversion" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "retention_rate" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "avg_rating" DECIMAL(3,2),
    "nps_score" DECIMAL(5,2),
    "review_count" INTEGER NOT NULL DEFAULT 0,
    "satisfaction_score" DECIMAL(3,2),
    "utilization_rate" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "punctuality_rate" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "professional_efficiency" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "acquisition_cost" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "marketing_roi" DECIMAL(8,4) NOT NULL DEFAULT 0,
    "referral_rate" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."system_configs" (
    "id" TEXT NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "value" TEXT NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "description" TEXT,
    "category" VARCHAR(30),
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "is_editable" BOOLEAN NOT NULL DEFAULT true,
    "validation_rules" TEXT,
    "default_value" TEXT,
    "allowed_values" TEXT,
    "environment" VARCHAR(20) NOT NULL DEFAULT 'production',
    "requires_restart" BOOLEAN NOT NULL DEFAULT false,
    "last_modified_by" TEXT,
    "change_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."feature_flags" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "is_enabled" BOOLEAN NOT NULL DEFAULT false,
    "environment" VARCHAR(20) NOT NULL DEFAULT 'production',
    "target_users" TEXT,
    "target_clinics" TEXT,
    "target_percent" INTEGER,
    "target_segments" TEXT,
    "config" TEXT,
    "constraints" TEXT,
    "rollout_strategy" VARCHAR(20),
    "valid_from" TIMESTAMP(3),
    "valid_until" TIMESTAMP(3),
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "last_used_at" TIMESTAMP(3),
    "conversion_rate" DECIMAL(5,4),
    "owner" VARCHAR(100),
    "team" VARCHAR(50),
    "tags" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "regional_configs_clinic_id_key" ON "public"."regional_configs"("clinic_id");

-- CreateIndex
CREATE INDEX "idx_regional_config_community" ON "public"."regional_configs"("autonomous_community");

-- CreateIndex
CREATE INDEX "idx_regional_config_clinic" ON "public"."regional_configs"("clinic_id");

-- CreateIndex
CREATE INDEX "idx_consent_history_user" ON "public"."consent_history"("user_id", "consent_type");

-- CreateIndex
CREATE INDEX "idx_consent_history_date" ON "public"."consent_history"("consented_at");

-- CreateIndex
CREATE INDEX "idx_consent_history_legal" ON "public"."consent_history"("legal_basis");

-- CreateIndex
CREATE UNIQUE INDEX "appointment_reviews_appointment_id_key" ON "public"."appointment_reviews"("appointment_id");

-- CreateIndex
CREATE INDEX "idx_review_user" ON "public"."appointment_reviews"("user_id");

-- CreateIndex
CREATE INDEX "idx_review_professional" ON "public"."appointment_reviews"("professional_id", "is_approved");

-- CreateIndex
CREATE INDEX "idx_review_treatment" ON "public"."appointment_reviews"("treatment_id", "is_approved");

-- CreateIndex
CREATE INDEX "idx_review_rating" ON "public"."appointment_reviews"("overall_rating", "is_approved");

-- CreateIndex
CREATE INDEX "idx_analytics_user_event" ON "public"."analytics_events"("user_id", "event_name");

-- CreateIndex
CREATE INDEX "idx_analytics_clinic_event" ON "public"."analytics_events"("clinic_id", "event_name");

-- CreateIndex
CREATE INDEX "idx_analytics_event_time" ON "public"."analytics_events"("event_name", "created_at");

-- CreateIndex
CREATE INDEX "idx_analytics_date" ON "public"."analytics_events"("created_at");

-- CreateIndex
CREATE INDEX "idx_analytics_segment" ON "public"."analytics_events"("user_segment", "event_type");

-- CreateIndex
CREATE INDEX "idx_analytics_funnel" ON "public"."analytics_events"("funnel", "touchpoint");

-- CreateIndex
CREATE INDEX "idx_clinic_metrics" ON "public"."business_metrics"("clinic_id", "metric_period");

-- CreateIndex
CREATE INDEX "idx_metric_date" ON "public"."business_metrics"("metric_date");

-- CreateIndex
CREATE INDEX "idx_metric_period_date" ON "public"."business_metrics"("metric_period", "metric_date");

-- CreateIndex
CREATE UNIQUE INDEX "unique_clinic_metric_period" ON "public"."business_metrics"("clinic_id", "metric_date", "metric_period");

-- CreateIndex
CREATE UNIQUE INDEX "system_configs_key_key" ON "public"."system_configs"("key");

-- CreateIndex
CREATE INDEX "idx_config_category" ON "public"."system_configs"("category");

-- CreateIndex
CREATE INDEX "idx_config_public" ON "public"."system_configs"("is_public");

-- CreateIndex
CREATE INDEX "idx_config_environment" ON "public"."system_configs"("environment");

-- CreateIndex
CREATE UNIQUE INDEX "feature_flags_name_key" ON "public"."feature_flags"("name");

-- CreateIndex
CREATE INDEX "idx_feature_flag_enabled" ON "public"."feature_flags"("is_enabled", "environment");

-- CreateIndex
CREATE INDEX "idx_feature_flag_validity" ON "public"."feature_flags"("valid_from", "valid_until");

-- CreateIndex
CREATE INDEX "idx_feature_flag_ownership" ON "public"."feature_flags"("owner", "team");

-- CreateIndex
CREATE INDEX "idx_appointment_user_status" ON "public"."appointments"("user_id", "status");

-- CreateIndex
CREATE INDEX "idx_appointment_status_date" ON "public"."appointments"("status", "scheduled_date");

-- CreateIndex
CREATE INDEX "idx_appointment_payment" ON "public"."appointments"("payment_status");

-- CreateIndex
CREATE INDEX "idx_appointment_analytics" ON "public"."appointments"("booking_source", "created_at");

-- CreateIndex
CREATE INDEX "idx_appointment_first_visit" ON "public"."appointments"("is_first_visit", "user_id");

-- CreateIndex
CREATE INDEX "idx_appointment_medical_clearance" ON "public"."appointments"("medical_clearance", "clearance_provided_by");

-- CreateIndex
CREATE INDEX "idx_appointment_follow_up" ON "public"."appointments"("follow_up_required", "follow_up_date");

-- CreateIndex
CREATE INDEX "idx_audit_gdpr" ON "public"."audit_logs"("gdpr_relevant");

-- CreateIndex
CREATE INDEX "idx_audit_security" ON "public"."audit_logs"("risk_level", "requires_review");

-- CreateIndex
CREATE INDEX "idx_clinic_status" ON "public"."clinics"("is_active", "is_verified");

-- CreateIndex
CREATE INDEX "idx_clinic_autonomous_community" ON "public"."clinics"("autonomous_community");

-- CreateIndex
CREATE INDEX "idx_consent_template_validity" ON "public"."consent_form_templates"("valid_from", "valid_until");

-- CreateIndex
CREATE INDEX "idx_consent_template_version" ON "public"."consent_form_templates"("version");

-- CreateIndex
CREATE INDEX "idx_invitation_email" ON "public"."invitations"("invitee_email");

-- CreateIndex
CREATE INDEX "idx_invitation_clinic" ON "public"."invitations"("clinic_id", "status");

-- CreateIndex
CREATE INDEX "idx_notification_user_type" ON "public"."notification_logs"("user_id", "type");

-- CreateIndex
CREATE INDEX "idx_notification_clinic" ON "public"."notification_logs"("clinic_id", "type");

-- CreateIndex
CREATE INDEX "idx_notification_campaign" ON "public"."notification_logs"("campaign_id");

-- CreateIndex
CREATE INDEX "idx_offer_redemption_code" ON "public"."offer_redemptions"("code");

-- CreateIndex
CREATE INDEX "idx_offer_featured" ON "public"."offers"("is_featured", "priority");

-- CreateIndex
CREATE INDEX "idx_reset_token" ON "public"."password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "idx_reset_expiry" ON "public"."password_reset_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "idx_patient_consent_user" ON "public"."patient_consents"("user_id", "status");

-- CreateIndex
CREATE INDEX "idx_patient_consent_treatment" ON "public"."patient_consents"("treatment_id");

-- CreateIndex
CREATE INDEX "idx_patient_consent_reviewer" ON "public"."patient_consents"("reviewed_by");

-- CreateIndex
CREATE INDEX "idx_payment_method_stripe" ON "public"."payment_methods"("stripe_method_id");

-- CreateIndex
CREATE INDEX "idx_payment_user_status" ON "public"."payments"("user_id", "status");

-- CreateIndex
CREATE INDEX "idx_payment_status_date" ON "public"."payments"("status", "paid_at");

-- CreateIndex
CREATE INDEX "idx_payment_type_status" ON "public"."payments"("paymentType", "status");

-- CreateIndex
CREATE INDEX "idx_prof_reset_token" ON "public"."professional_password_resets"("token");

-- CreateIndex
CREATE INDEX "idx_prof_reset_expiry" ON "public"."professional_password_resets"("expires_at");

-- CreateIndex
CREATE INDEX "idx_professional_role" ON "public"."professionals"("role", "clinic_id");

-- CreateIndex
CREATE INDEX "idx_professional_performance" ON "public"."professionals"("rating", "total_appointments");

-- CreateIndex
CREATE INDEX "idx_reward_template_type" ON "public"."reward_templates"("type", "is_active");

-- CreateIndex
CREATE INDEX "idx_stripe_customer_user" ON "public"."stripe_customers"("user_id");

-- CreateIndex
CREATE INDEX "idx_treatment_price" ON "public"."treatments"("price", "is_active");

-- CreateIndex
CREATE INDEX "idx_treatment_appointment_type" ON "public"."treatments"("appointment_type");

-- CreateIndex
CREATE INDEX "idx_session_ip" ON "public"."user_sessions"("ip_address");

-- CreateIndex
CREATE INDEX "idx_user_role" ON "public"."users"("role", "is_active");

-- CreateIndex
CREATE INDEX "idx_user_points" ON "public"."users"("beauty_points");

-- CreateIndex
CREATE INDEX "idx_vip_subscription_plan" ON "public"."vip_subscriptions"("plan_type", "status");

-- CreateIndex
CREATE INDEX "idx_webhook_retry" ON "public"."webhook_events"("processed", "retry_count");

-- CreateIndex
CREATE INDEX "idx_wellness_tip_published" ON "public"."wellness_tips"("published_at");

-- CreateIndex
CREATE INDEX "idx_wellness_tip_targeting" ON "public"."wellness_tips"("target_age", "target_gender");

-- AddForeignKey
ALTER TABLE "public"."regional_configs" ADD CONSTRAINT "regional_configs_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."patient_consents" ADD CONSTRAINT "patient_consents_treatment_id_fkey" FOREIGN KEY ("treatment_id") REFERENCES "public"."treatments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."consent_history" ADD CONSTRAINT "consent_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."wellness_tips" ADD CONSTRAINT "wellness_tips_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."appointment_reviews" ADD CONSTRAINT "appointment_reviews_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."appointment_reviews" ADD CONSTRAINT "appointment_reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."appointment_reviews" ADD CONSTRAINT "appointment_reviews_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."appointment_reviews" ADD CONSTRAINT "appointment_reviews_treatment_id_fkey" FOREIGN KEY ("treatment_id") REFERENCES "public"."treatments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "public"."idx_appointment_legal" RENAME TO "idx_appointment_legal_flow";

-- RenameIndex
ALTER INDEX "public"."idx_appointment_professional" RENAME TO "idx_appointment_professional_schedule";

-- RenameIndex
ALTER INDEX "public"."idx_appointment_status" RENAME TO "idx_appointment_status_date";

-- RenameIndex
ALTER INDEX "public"."idx_appointment_user" RENAME TO "idx_appointment_user_status";

-- RenameIndex
ALTER INDEX "public"."idx_invite_code" RENAME TO "idx_invitation_code";

-- RenameIndex
ALTER INDEX "public"."idx_inviter_status" RENAME TO "idx_invitation_inviter";

-- RenameIndex
ALTER INDEX "public"."idx_clinic_notifications" RENAME TO "idx_notification_clinic";

-- RenameIndex
ALTER INDEX "public"."idx_notification_status" RENAME TO "idx_notification_engagement";

-- RenameIndex
ALTER INDEX "public"."idx_user_notification_type" RENAME TO "idx_notification_user_type";

-- RenameIndex
ALTER INDEX "public"."idx_offer_expiry" RENAME TO "idx_offer_redemption_expiry";

-- RenameIndex
ALTER INDEX "public"."idx_offer_usage" RENAME TO "idx_offer_redemption_offer";

-- RenameIndex
ALTER INDEX "public"."idx_user_offer_redemptions" RENAME TO "idx_offer_redemption_user";

-- RenameIndex
ALTER INDEX "public"."idx_clinic_active_offers" RENAME TO "idx_offer_clinic_active";

-- RenameIndex
ALTER INDEX "public"."idx_user_active_payments" RENAME TO "idx_payment_method_user_active";

-- RenameIndex
ALTER INDEX "public"."idx_user_default_payment" RENAME TO "idx_payment_method_user_default";

-- RenameIndex
ALTER INDEX "public"."idx_clinic_payments" RENAME TO "idx_payment_clinic_type";

-- RenameIndex
ALTER INDEX "public"."idx_payment_status" RENAME TO "idx_payment_status_date";

-- RenameIndex
ALTER INDEX "public"."idx_stripe_invoice" RENAME TO "idx_payment_stripe_invoice";

-- RenameIndex
ALTER INDEX "public"."idx_user_payments" RENAME TO "idx_payment_user_status";

-- RenameIndex
ALTER INDEX "public"."idx_reward_code" RENAME TO "idx_reward_redemption_code";

-- RenameIndex
ALTER INDEX "public"."idx_reward_expiry" RENAME TO "idx_reward_redemption_expiry";

-- RenameIndex
ALTER INDEX "public"."idx_template_redemptions" RENAME TO "idx_reward_redemption_template";

-- RenameIndex
ALTER INDEX "public"."idx_user_reward_redemptions" RENAME TO "idx_reward_redemption_user";

-- RenameIndex
ALTER INDEX "public"."idx_clinic_active_rewards" RENAME TO "idx_reward_template_clinic";

-- RenameIndex
ALTER INDEX "public"."idx_reward_cost" RENAME TO "idx_reward_template_cost";

-- RenameIndex
ALTER INDEX "public"."idx_reward_featured" RENAME TO "idx_reward_template_featured";

-- RenameIndex
ALTER INDEX "public"."idx_stripe_customer" RENAME TO "idx_stripe_customer_id";

-- RenameIndex
ALTER INDEX "public"."idx_clinic_subscriptions" RENAME TO "idx_vip_subscription_clinic";

-- RenameIndex
ALTER INDEX "public"."idx_stripe_subscription" RENAME TO "idx_vip_subscription_stripe";

-- RenameIndex
ALTER INDEX "public"."idx_subscription_expiry" RENAME TO "idx_vip_subscription_expiry";

-- RenameIndex
ALTER INDEX "public"."idx_user_subscription_status" RENAME TO "idx_vip_subscription_user_status";

-- RenameIndex
ALTER INDEX "public"."idx_stripe_event" RENAME TO "idx_webhook_stripe_event";

-- RenameIndex
ALTER INDEX "public"."idx_wellness_category" RENAME TO "idx_wellness_tip_category";

-- RenameIndex
ALTER INDEX "public"."idx_wellness_clinic" RENAME TO "idx_wellness_tip_clinic";

-- RenameIndex
ALTER INDEX "public"."idx_wellness_featured" RENAME TO "idx_wellness_tip_featured";
