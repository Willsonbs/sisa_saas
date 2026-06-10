-- Migration: add_multitenant_schema
-- This migration records the schema changes already applied directly to the DB.
-- The actual DDL was run via webdev_execute_sql to avoid interactive prompts.

-- New tables (already created)
CREATE TABLE IF NOT EXISTS `tenants` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `name` varchar(200) NOT NULL,
  `slug` varchar(100) NOT NULL UNIQUE,
  `email` varchar(320),
  `phone` varchar(20),
  `address` text,
  `plan` enum('starter','pro','business','enterprise') NOT NULL DEFAULT 'starter',
  `isActive` boolean NOT NULL DEFAULT true,
  `cancellationWindowHours` int NOT NULL DEFAULT 12,
  `lateArrivalToleranceMinutes` int NOT NULL DEFAULT 15,
  `createdAt` timestamp NOT NULL DEFAULT NOW(),
  `updatedAt` timestamp NOT NULL DEFAULT NOW() ON UPDATE NOW()
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `professionalTenants` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `professionalId` int NOT NULL,
  `tenantId` int NOT NULL,
  `status` enum('pending','approved','rejected','blocked') NOT NULL DEFAULT 'pending',
  `approvedBy` int,
  `approvedAt` timestamp NULL,
  `rejectionReason` text,
  `createdAt` timestamp NOT NULL DEFAULT NOW(),
  `updatedAt` timestamp NOT NULL DEFAULT NOW() ON UPDATE NOW()
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `roomBlocks` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `roomId` int NOT NULL,
  `tenantId` int NOT NULL,
  `startTime` timestamp NOT NULL,
  `endTime` timestamp NOT NULL,
  `reason` enum('maintenance','manager_reserve','other') NOT NULL,
  `notes` text,
  `createdBy` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT NOW(),
  `updatedAt` timestamp NOT NULL DEFAULT NOW() ON UPDATE NOW()
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `auditLogs` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `tenantId` int,
  `userId` int,
  `userEmail` varchar(320),
  `action` varchar(100) NOT NULL,
  `entityType` varchar(50) NOT NULL,
  `entityId` int,
  `before` text,
  `after` text,
  `ipAddress` varchar(45),
  `userAgent` text,
  `createdAt` timestamp NOT NULL DEFAULT NOW()
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `waitlistEntries` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `tenantId` int NOT NULL,
  `professionalId` int NOT NULL,
  `roomId` int,
  `patientName` varchar(200) NOT NULL,
  `patientContact` varchar(200) NOT NULL,
  `contactType` enum('email','phone','whatsapp') NOT NULL DEFAULT 'email',
  `preferredDays` text,
  `preferredTimeStart` varchar(5),
  `preferredTimeEnd` varchar(5),
  `notes` text,
  `status` enum('waiting','notified','converted','expired') NOT NULL DEFAULT 'waiting',
  `consentId` int,
  `createdAt` timestamp NOT NULL DEFAULT NOW(),
  `updatedAt` timestamp NOT NULL DEFAULT NOW() ON UPDATE NOW()
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `consentRecords` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `tenantId` int,
  `subjectName` varchar(200) NOT NULL,
  `subjectContact` varchar(200) NOT NULL,
  `purpose` varchar(200) NOT NULL,
  `consentVersion` varchar(20) NOT NULL DEFAULT '1.0',
  `consentText` text NOT NULL,
  `consentGiven` boolean NOT NULL DEFAULT true,
  `ipAddress` varchar(45),
  `userAgent` text,
  `createdAt` timestamp NOT NULL DEFAULT NOW()
);--> statement-breakpoint

-- Alter existing tables (already applied)
ALTER TABLE `users`
  ADD COLUMN IF NOT EXISTS `tenantId` int NULL,
  ADD COLUMN IF NOT EXISTS `specialty` varchar(100) NULL,
  ADD COLUMN IF NOT EXISTS `publicProfileSlug` varchar(100) NULL,
  ADD COLUMN IF NOT EXISTS `bio` text NULL;--> statement-breakpoint

ALTER TABLE `rooms`
  ADD COLUMN IF NOT EXISTS `tenantId` int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS `roomType` enum('general','psychiatry','dentistry','physiotherapy','nursing','other') NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS `bufferBefore` int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `bufferAfter` int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `minDurationMinutes` int NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS `maxDurationMinutes` int NULL,
  ADD COLUMN IF NOT EXISTS `minAdvanceHours` int NOT NULL DEFAULT 0;--> statement-breakpoint

ALTER TABLE `bookings`
  ADD COLUMN IF NOT EXISTS `tenantId` int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS `bufferStartTime` timestamp NULL,
  ADD COLUMN IF NOT EXISTS `bufferEndTime` timestamp NULL,
  ADD COLUMN IF NOT EXISTS `paymentId` int NULL,
  ADD COLUMN IF NOT EXISTS `noShowRegisteredAt` timestamp NULL,
  ADD COLUMN IF NOT EXISTS `noShowRegisteredBy` int NULL,
  ADD COLUMN IF NOT EXISTS `completedAt` timestamp NULL;--> statement-breakpoint

ALTER TABLE `credits`
  ADD COLUMN IF NOT EXISTS `tenantId` int NOT NULL DEFAULT 1;--> statement-breakpoint

ALTER TABLE `payments`
  ADD COLUMN IF NOT EXISTS `tenantId` int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS `paidAt` timestamp NULL,
  ADD COLUMN IF NOT EXISTS `refundedAt` timestamp NULL;--> statement-breakpoint

ALTER TABLE `notifications`
  ADD COLUMN IF NOT EXISTS `tenantId` int NULL,
  ADD COLUMN IF NOT EXISTS `sentViaWhatsApp` boolean DEFAULT false;--> statement-breakpoint

ALTER TABLE `cancellationRules`
  ADD COLUMN IF NOT EXISTS `tenantId` int NULL;--> statement-breakpoint

ALTER TABLE `settings`
  ADD COLUMN IF NOT EXISTS `tenantId` int NULL;--> statement-breakpoint

ALTER TABLE `apiKeys`
  ADD COLUMN IF NOT EXISTS `tenantId` int NULL;
