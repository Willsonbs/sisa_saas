CREATE TYPE "public"."appointment_status" AS ENUM('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show');--> statement-breakpoint
CREATE TYPE "public"."booking_status" AS ENUM('draft', 'pending_payment', 'confirmed', 'canceled_with_credit', 'no_show', 'completed');--> statement-breakpoint
CREATE TYPE "public"."credit_type" AS ENUM('purchase', 'refund', 'debit', 'bonus');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('booking_confirmation', 'booking_cancellation', 'booking_reminder', 'booking_reminder_24h', 'booking_reminder_2h', 'payment_success', 'payment_failed', 'credit_added', 'system', 'professional_approved', 'professional_rejected', 'professional_blocked', 'general', 'booking_cancelled', 'booking_blocked_cancellation', 'noshow_registered');--> statement-breakpoint
CREATE TYPE "public"."patient_action" AS ENUM('view', 'edit', 'export');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('credit_card', 'pix', 'manual', 'credits');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'paid', 'refunded', 'chargeback');--> statement-breakpoint
CREATE TYPE "public"."professional_tenant_status" AS ENUM('pending', 'approved', 'rejected', 'blocked');--> statement-breakpoint
CREATE TYPE "public"."room_block_reason" AS ENUM('maintenance', 'manager_reserve', 'other');--> statement-breakpoint
CREATE TYPE "public"."room_type" AS ENUM('general', 'psychiatry', 'dentistry', 'physiotherapy', 'nursing', 'other');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'trialing', 'past_due', 'canceled', 'unpaid');--> statement-breakpoint
CREATE TYPE "public"."tenant_plan" AS ENUM('starter', 'pro', 'business', 'enterprise');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('super_admin', 'admin', 'professional', 'receptionist', 'financial');--> statement-breakpoint
CREATE TYPE "public"."waitlist_contact_type" AS ENUM('email', 'phone', 'whatsapp');--> statement-breakpoint
CREATE TYPE "public"."waitlist_status" AS ENUM('waiting', 'notified', 'converted', 'expired');--> statement-breakpoint
CREATE TABLE "apiKeys" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"tenantId" integer,
	"name" varchar(100) NOT NULL,
	"key" varchar(64) NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"canReadBookings" boolean DEFAULT true,
	"canCreateBookings" boolean DEFAULT true,
	"canCancelBookings" boolean DEFAULT false,
	"lastUsedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "apiKeys_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" serial PRIMARY KEY NOT NULL,
	"bookingId" integer NOT NULL,
	"tenantId" integer NOT NULL,
	"professionalId" integer NOT NULL,
	"startTime" timestamp NOT NULL,
	"endTime" timestamp NOT NULL,
	"patientName" varchar(200),
	"patientPhone" varchar(20),
	"status" "appointment_status" DEFAULT 'scheduled' NOT NULL,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auditLogs" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenantId" integer,
	"userId" integer,
	"userEmail" varchar(320),
	"action" varchar(100) NOT NULL,
	"entityType" varchar(50) NOT NULL,
	"entityId" integer,
	"before" text,
	"after" text,
	"ipAddress" varchar(45),
	"userAgent" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenantId" integer NOT NULL,
	"roomId" integer NOT NULL,
	"professionalId" integer NOT NULL,
	"patientName" varchar(200),
	"patientPhone" varchar(20),
	"startTime" timestamp NOT NULL,
	"endTime" timestamp NOT NULL,
	"bufferStartTime" timestamp,
	"bufferEndTime" timestamp,
	"totalPrice" integer NOT NULL,
	"status" "booking_status" DEFAULT 'draft' NOT NULL,
	"paymentId" integer,
	"receptionNotes" text,
	"privateNotes" text,
	"cancelledAt" timestamp,
	"cancelledBy" integer,
	"cancellationReason" text,
	"noShowRegisteredAt" timestamp,
	"noShowRegisteredBy" integer,
	"completedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cancellationRules" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenantId" integer,
	"hoursBeforeBooking" integer NOT NULL,
	"refundPercentage" integer NOT NULL,
	"description" text,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consentRecords" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenantId" integer,
	"subjectName" varchar(200) NOT NULL,
	"subjectContact" varchar(200) NOT NULL,
	"purpose" varchar(200) NOT NULL,
	"consentVersion" varchar(20) DEFAULT '1.0' NOT NULL,
	"consentText" text NOT NULL,
	"consentGiven" boolean DEFAULT true NOT NULL,
	"ipAddress" varchar(45),
	"userAgent" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credits" (
	"id" serial PRIMARY KEY NOT NULL,
	"professionalId" integer NOT NULL,
	"tenantId" integer NOT NULL,
	"amount" integer NOT NULL,
	"type" "credit_type" NOT NULL,
	"bookingId" integer,
	"paymentId" integer,
	"description" text,
	"balanceAfter" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"tenantId" integer,
	"type" "notification_type" NOT NULL,
	"title" varchar(200) NOT NULL,
	"message" text NOT NULL,
	"sentViaEmail" boolean DEFAULT false,
	"sentViaWhatsApp" boolean DEFAULT false,
	"sentViaApp" boolean DEFAULT true,
	"isRead" boolean DEFAULT false,
	"readAt" timestamp,
	"bookingId" integer,
	"paymentId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patientAccessLogs" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenantId" integer NOT NULL,
	"userId" integer NOT NULL,
	"userEmail" varchar(320),
	"bookingId" integer NOT NULL,
	"action" "patient_action" NOT NULL,
	"context" varchar(200),
	"ipAddress" varchar(45),
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"professionalId" integer NOT NULL,
	"tenantId" integer NOT NULL,
	"amount" integer NOT NULL,
	"method" "payment_method" NOT NULL,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"stripePaymentIntentId" varchar(255),
	"stripeChargeId" varchar(255),
	"pixQrCode" text,
	"pixQrCodeUrl" text,
	"pixExpiresAt" timestamp,
	"invoiceUrl" text,
	"invoiceNumber" varchar(50),
	"metadata" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"paidAt" timestamp,
	"refundedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"priceMonthly" integer NOT NULL,
	"priceYearly" integer,
	"maxRooms" integer DEFAULT 5 NOT NULL,
	"maxProfessionals" integer DEFAULT 10 NOT NULL,
	"features" text,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "professionalTenants" (
	"id" serial PRIMARY KEY NOT NULL,
	"professionalId" integer NOT NULL,
	"tenantId" integer NOT NULL,
	"status" "professional_tenant_status" DEFAULT 'pending' NOT NULL,
	"approvedBy" integer,
	"approvedAt" timestamp,
	"rejectionReason" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roomBlocks" (
	"id" serial PRIMARY KEY NOT NULL,
	"roomId" integer NOT NULL,
	"tenantId" integer NOT NULL,
	"startTime" timestamp NOT NULL,
	"endTime" timestamp NOT NULL,
	"reason" "room_block_reason" NOT NULL,
	"notes" text,
	"createdBy" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenantId" integer NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"capacity" integer DEFAULT 1 NOT NULL,
	"roomType" "room_type" DEFAULT 'general' NOT NULL,
	"equipment" text,
	"features" text,
	"photos" text,
	"pricePerHour" integer NOT NULL,
	"pricePerHalfDay" integer,
	"pricePerDay" integer,
	"bufferBefore" integer DEFAULT 0 NOT NULL,
	"bufferAfter" integer DEFAULT 0 NOT NULL,
	"minDurationMinutes" integer DEFAULT 60 NOT NULL,
	"maxDurationMinutes" integer,
	"minAdvanceHours" integer DEFAULT 0 NOT NULL,
	"availableMonday" boolean DEFAULT true,
	"availableTuesday" boolean DEFAULT true,
	"availableWednesday" boolean DEFAULT true,
	"availableThursday" boolean DEFAULT true,
	"availableFriday" boolean DEFAULT true,
	"availableSaturday" boolean DEFAULT false,
	"availableSunday" boolean DEFAULT false,
	"openTime" varchar(5) DEFAULT '08:00',
	"closeTime" varchar(5) DEFAULT '18:00',
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenantId" integer,
	"key" varchar(100) NOT NULL,
	"value" text NOT NULL,
	"description" text,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenantId" integer NOT NULL,
	"planId" integer NOT NULL,
	"status" "subscription_status" DEFAULT 'trialing' NOT NULL,
	"stripeCustomerId" varchar(255),
	"stripeSubscriptionId" varchar(255),
	"currentPeriodStart" timestamp,
	"currentPeriodEnd" timestamp,
	"canceledAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"legalName" varchar(200),
	"document" varchar(18),
	"email" varchar(320),
	"phone" varchar(20),
	"addressStreet" varchar(200),
	"addressNumber" varchar(20),
	"addressComplement" varchar(100),
	"addressNeighborhood" varchar(100),
	"addressCity" varchar(100),
	"addressState" varchar(2),
	"addressZip" varchar(10),
	"address" text,
	"plan" "tenant_plan" DEFAULT 'starter' NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"cancellationWindowHours" integer DEFAULT 12 NOT NULL,
	"cancellationWindowMinutes" integer DEFAULT 720 NOT NULL,
	"lateArrivalToleranceMinutes" integer DEFAULT 15 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tenants_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64),
	"name" text,
	"email" varchar(320) NOT NULL,
	"password" varchar(255),
	"loginMethod" varchar(64),
	"role" "user_role" DEFAULT 'professional' NOT NULL,
	"tenantId" integer,
	"professionalRegistry" varchar(50),
	"registryType" varchar(20),
	"phone" varchar(20),
	"specialty" varchar(100),
	"publicProfileSlug" varchar(100),
	"bio" text,
	"appointmentDurationMinutes" integer DEFAULT 60 NOT NULL,
	"cpf" varchar(14),
	"address" text,
	"permCanViewBookings" boolean DEFAULT true NOT NULL,
	"permCanViewProfessionals" boolean DEFAULT true NOT NULL,
	"permCanViewRooms" boolean DEFAULT true NOT NULL,
	"permCanCheckIn" boolean DEFAULT true NOT NULL,
	"permCanManagePatients" boolean DEFAULT false NOT NULL,
	"passwordHash" varchar(255),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId"),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_publicProfileSlug_unique" UNIQUE("publicProfileSlug")
);
--> statement-breakpoint
CREATE TABLE "waitlistEntries" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenantId" integer NOT NULL,
	"professionalId" integer NOT NULL,
	"roomId" integer,
	"patientName" varchar(200) NOT NULL,
	"patientContact" varchar(200) NOT NULL,
	"contactType" "waitlist_contact_type" DEFAULT 'email' NOT NULL,
	"preferredDays" text,
	"preferredTimeStart" varchar(5),
	"preferredTimeEnd" varchar(5),
	"notes" text,
	"status" "waitlist_status" DEFAULT 'waiting' NOT NULL,
	"consentId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
