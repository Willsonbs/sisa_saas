CREATE TABLE `appointments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bookingId` int NOT NULL,
	`tenantId` int NOT NULL,
	`professionalId` int NOT NULL,
	`startTime` timestamp NOT NULL,
	`endTime` timestamp NOT NULL,
	`patientName` varchar(200),
	`patientPhone` varchar(20),
	`status` enum('scheduled','confirmed','completed','cancelled','no_show') NOT NULL DEFAULT 'scheduled',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `appointments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `auditLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
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
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `consentRecords` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int,
	`subjectName` varchar(200) NOT NULL,
	`subjectContact` varchar(200) NOT NULL,
	`purpose` varchar(200) NOT NULL,
	`consentVersion` varchar(20) NOT NULL DEFAULT '1.0',
	`consentText` text NOT NULL,
	`consentGiven` boolean NOT NULL DEFAULT true,
	`ipAddress` varchar(45),
	`userAgent` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `consentRecords_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `patientAccessLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`userId` int NOT NULL,
	`userEmail` varchar(320),
	`bookingId` int NOT NULL,
	`action` enum('view','edit','export') NOT NULL,
	`context` varchar(200),
	`ipAddress` varchar(45),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `patientAccessLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `professionalTenants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`professionalId` int NOT NULL,
	`tenantId` int NOT NULL,
	`status` enum('pending','approved','rejected','blocked') NOT NULL DEFAULT 'pending',
	`approvedBy` int,
	`approvedAt` timestamp,
	`rejectionReason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `professionalTenants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `roomBlocks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`roomId` int NOT NULL,
	`tenantId` int NOT NULL,
	`startTime` timestamp NOT NULL,
	`endTime` timestamp NOT NULL,
	`reason` enum('maintenance','manager_reserve','other') NOT NULL,
	`notes` text,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `roomBlocks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tenants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`email` varchar(320),
	`phone` varchar(20),
	`address` text,
	`plan` enum('starter','pro','business','enterprise') NOT NULL DEFAULT 'starter',
	`isActive` boolean NOT NULL DEFAULT true,
	`cancellationWindowHours` int NOT NULL DEFAULT 12,
	`cancellationWindowMinutes` int NOT NULL DEFAULT 720,
	`lateArrivalToleranceMinutes` int NOT NULL DEFAULT 15,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tenants_id` PRIMARY KEY(`id`),
	CONSTRAINT `tenants_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `waitlistEntries` (
	`id` int AUTO_INCREMENT NOT NULL,
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
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `waitlistEntries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `settings` DROP INDEX `settings_key_unique`;--> statement-breakpoint
ALTER TABLE `bookings` MODIFY COLUMN `patientName` varchar(200);--> statement-breakpoint
ALTER TABLE `bookings` MODIFY COLUMN `status` enum('draft','pending_payment','confirmed','canceled_with_credit','no_show','completed') NOT NULL DEFAULT 'draft';--> statement-breakpoint
ALTER TABLE `notifications` MODIFY COLUMN `type` enum('booking_confirmation','booking_reminder','booking_reminder_24h','booking_reminder_2h','booking_cancelled','booking_blocked_cancellation','payment_success','payment_failed','credit_added','noshow_registered','professional_approved','professional_blocked','general') NOT NULL;--> statement-breakpoint
ALTER TABLE `payments` MODIFY COLUMN `method` enum('credit_card','pix','manual','credits') NOT NULL;--> statement-breakpoint
ALTER TABLE `payments` MODIFY COLUMN `status` enum('pending','paid','refunded','chargeback') NOT NULL DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `apiKeys` ADD `tenantId` int;--> statement-breakpoint
ALTER TABLE `bookings` ADD `tenantId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `bookings` ADD `bufferStartTime` timestamp;--> statement-breakpoint
ALTER TABLE `bookings` ADD `bufferEndTime` timestamp;--> statement-breakpoint
ALTER TABLE `bookings` ADD `paymentId` int;--> statement-breakpoint
ALTER TABLE `bookings` ADD `noShowRegisteredAt` timestamp;--> statement-breakpoint
ALTER TABLE `bookings` ADD `noShowRegisteredBy` int;--> statement-breakpoint
ALTER TABLE `bookings` ADD `completedAt` timestamp;--> statement-breakpoint
ALTER TABLE `cancellationRules` ADD `tenantId` int;--> statement-breakpoint
ALTER TABLE `credits` ADD `tenantId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `notifications` ADD `tenantId` int;--> statement-breakpoint
ALTER TABLE `notifications` ADD `sentViaWhatsApp` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `payments` ADD `tenantId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `payments` ADD `paidAt` timestamp;--> statement-breakpoint
ALTER TABLE `payments` ADD `refundedAt` timestamp;--> statement-breakpoint
ALTER TABLE `rooms` ADD `tenantId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `rooms` ADD `roomType` enum('general','psychiatry','dentistry','physiotherapy','nursing','other') DEFAULT 'general' NOT NULL;--> statement-breakpoint
ALTER TABLE `rooms` ADD `bufferBefore` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `rooms` ADD `bufferAfter` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `rooms` ADD `minDurationMinutes` int DEFAULT 60 NOT NULL;--> statement-breakpoint
ALTER TABLE `rooms` ADD `maxDurationMinutes` int;--> statement-breakpoint
ALTER TABLE `rooms` ADD `minAdvanceHours` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `settings` ADD `tenantId` int;--> statement-breakpoint
ALTER TABLE `users` ADD `tenantId` int;--> statement-breakpoint
ALTER TABLE `users` ADD `specialty` varchar(100);--> statement-breakpoint
ALTER TABLE `users` ADD `publicProfileSlug` varchar(100);--> statement-breakpoint
ALTER TABLE `users` ADD `bio` text;--> statement-breakpoint
ALTER TABLE `users` ADD `appointmentDurationMinutes` int DEFAULT 60 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_publicProfileSlug_unique` UNIQUE(`publicProfileSlug`);--> statement-breakpoint
ALTER TABLE `payments` DROP COLUMN `completedAt`;