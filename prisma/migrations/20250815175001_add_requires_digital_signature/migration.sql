/*
  Warnings:

  - You are about to drop the column `aftercare_info` on the `treatments` table. All the data in the column will be lost.
  - You are about to drop the column `age_restriction` on the `treatments` table. All the data in the column will be lost.
  - You are about to drop the column `requirements` on the `treatments` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "TreatmentRiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "ConsentType" AS ENUM ('SIMPLE', 'INFORMED', 'MEDICAL');

-- CreateEnum
CREATE TYPE "AppointmentType" AS ENUM ('DIRECT', 'CONSULTATION_ONLY', 'CONSULTATION_TREATMENT', 'CONSULTATION_SEPARATE');

-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "appointment_type" "AppointmentType" NOT NULL DEFAULT 'DIRECT',
ADD COLUMN     "clearance_date" TIMESTAMP(3),
ADD COLUMN     "clearance_notes" TEXT,
ADD COLUMN     "clearance_provided_by" TEXT,
ADD COLUMN     "consent_form_id" TEXT,
ADD COLUMN     "consent_status" TEXT,
ADD COLUMN     "consultation_required" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_consultation_only" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "medical_clearance" BOOLEAN;

-- AlterTable
ALTER TABLE "clinics" ADD COLUMN     "allows_direct_booking_high_risk" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "autonomous_community" TEXT,
ADD COLUMN     "consultation_minimum_time" INTEGER,
ADD COLUMN     "default_consent_policy" TEXT,
ADD COLUMN     "health_registration" TEXT,
ADD COLUMN     "legal_compliance" TEXT,
ADD COLUMN     "medical_license" TEXT,
ADD COLUMN     "requires_digital_signature" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "treatments" DROP COLUMN "aftercare_info",
DROP COLUMN "age_restriction",
DROP COLUMN "requirements",
ADD COLUMN     "allow_same_day_consultation" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "appointment_type" "AppointmentType" NOT NULL DEFAULT 'DIRECT',
ADD COLUMN     "authorized_professional_types" TEXT,
ADD COLUMN     "consent_form_required" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "consent_form_template_id" TEXT,
ADD COLUMN     "consent_type" "ConsentType" NOT NULL DEFAULT 'SIMPLE',
ADD COLUMN     "consultation_duration" INTEGER,
ADD COLUMN     "digital_signature_required" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "follow_up_required" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "minimum_age" INTEGER,
ADD COLUMN     "recovery_time" TEXT,
ADD COLUMN     "regional_requirements" TEXT,
ADD COLUMN     "regulatory_category" TEXT,
ADD COLUMN     "requires_medical_staff" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requires_specialization" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "risk_level" "TreatmentRiskLevel" NOT NULL DEFAULT 'LOW',
ADD COLUMN     "side_effects" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "allergy_details" TEXT,
ADD COLUMN     "data_processing_consent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "general_consent_date" TIMESTAMP(3),
ADD COLUMN     "has_allergies" BOOLEAN,
ADD COLUMN     "has_medical_conditions" BOOLEAN,
ADD COLUMN     "marketing_consent_date" TIMESTAMP(3),
ADD COLUMN     "medical_details" TEXT,
ADD COLUMN     "medication_details" TEXT,
ADD COLUMN     "taking_medications" BOOLEAN;

-- CreateTable
CREATE TABLE "consent_form_templates" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "language" TEXT NOT NULL DEFAULT 'es',
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "fields" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_mandatory" BOOLEAN NOT NULL DEFAULT false,
    "consent_type" "ConsentType" NOT NULL,
    "valid_from" TIMESTAMP(3) NOT NULL,
    "valid_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consent_form_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_consents" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "treatment_id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "is_consented" BOOLEAN NOT NULL DEFAULT false,
    "consented_at" TIMESTAMP(3),
    "digital_signature" TEXT,
    "formData" TEXT,
    "allergies" TEXT,
    "medications" TEXT,
    "medical_history" TEXT,
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "medical_approval" BOOLEAN,
    "approval_notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_consents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_consent_template_clinic" ON "consent_form_templates"("clinic_id", "is_active");

-- CreateIndex
CREATE INDEX "idx_consent_template_type" ON "consent_form_templates"("consent_type");

-- CreateIndex
CREATE INDEX "idx_patient_consent_user_treatment" ON "patient_consents"("user_id", "treatment_id");

-- CreateIndex
CREATE INDEX "idx_patient_consent_validity" ON "patient_consents"("status", "expires_at");

-- CreateIndex
CREATE INDEX "idx_appointment_legal" ON "appointments"("appointment_type", "consultation_required");

-- CreateIndex
CREATE INDEX "idx_treatment_legal" ON "treatments"("risk_level", "requires_consultation");

-- AddForeignKey
ALTER TABLE "consent_form_templates" ADD CONSTRAINT "consent_form_templates_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_consents" ADD CONSTRAINT "patient_consents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_consents" ADD CONSTRAINT "patient_consents_treatment_id_fkey" FOREIGN KEY ("treatment_id") REFERENCES "treatments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_consents" ADD CONSTRAINT "patient_consents_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "consent_form_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatments" ADD CONSTRAINT "treatments_consent_form_template_id_fkey" FOREIGN KEY ("consent_form_template_id") REFERENCES "consent_form_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
