CREATE TABLE `apiKeys` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`key` varchar(64) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`canReadBookings` boolean DEFAULT true,
	`canCreateBookings` boolean DEFAULT true,
	`canCancelBookings` boolean DEFAULT false,
	`lastUsedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `apiKeys_id` PRIMARY KEY(`id`),
	CONSTRAINT `apiKeys_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `bookings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`roomId` int NOT NULL,
	`professionalId` int NOT NULL,
	`patientName` varchar(200) NOT NULL,
	`patientPhone` varchar(20),
	`startTime` timestamp NOT NULL,
	`endTime` timestamp NOT NULL,
	`totalPrice` int NOT NULL,
	`status` enum('pending','confirmed','cancelled','completed') NOT NULL DEFAULT 'pending',
	`receptionNotes` text,
	`privateNotes` text,
	`cancelledAt` timestamp,
	`cancelledBy` int,
	`cancellationReason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bookings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cancellationRules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`hoursBeforeBooking` int NOT NULL,
	`refundPercentage` int NOT NULL,
	`description` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cancellationRules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `credits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`professionalId` int NOT NULL,
	`amount` int NOT NULL,
	`type` enum('purchase','refund','debit','bonus') NOT NULL,
	`bookingId` int,
	`paymentId` int,
	`description` text,
	`balanceAfter` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `credits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('booking_confirmation','booking_reminder','booking_cancelled','payment_success','payment_failed','credit_added','general') NOT NULL,
	`title` varchar(200) NOT NULL,
	`message` text NOT NULL,
	`sentViaEmail` boolean DEFAULT false,
	`sentViaApp` boolean DEFAULT true,
	`isRead` boolean DEFAULT false,
	`readAt` timestamp,
	`bookingId` int,
	`paymentId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`professionalId` int NOT NULL,
	`amount` int NOT NULL,
	`method` enum('credit_card','pix','manual') NOT NULL,
	`status` enum('pending','processing','completed','failed','refunded') NOT NULL DEFAULT 'pending',
	`stripePaymentIntentId` varchar(255),
	`stripeChargeId` varchar(255),
	`pixQrCode` text,
	`pixQrCodeUrl` text,
	`pixExpiresAt` timestamp,
	`invoiceUrl` text,
	`invoiceNumber` varchar(50),
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`completedAt` timestamp,
	CONSTRAINT `payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rooms` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`capacity` int NOT NULL DEFAULT 1,
	`equipment` text,
	`features` text,
	`photos` text,
	`pricePerHour` int NOT NULL,
	`pricePerHalfDay` int,
	`pricePerDay` int,
	`availableMonday` boolean DEFAULT true,
	`availableTuesday` boolean DEFAULT true,
	`availableWednesday` boolean DEFAULT true,
	`availableThursday` boolean DEFAULT true,
	`availableFriday` boolean DEFAULT true,
	`availableSaturday` boolean DEFAULT false,
	`availableSunday` boolean DEFAULT false,
	`openTime` varchar(5) DEFAULT '08:00',
	`closeTime` varchar(5) DEFAULT '18:00',
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rooms_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(100) NOT NULL,
	`value` text NOT NULL,
	`description` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `settings_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('admin','professional','receptionist','financial') NOT NULL DEFAULT 'professional';--> statement-breakpoint
ALTER TABLE `users` ADD `professionalRegistry` varchar(50);--> statement-breakpoint
ALTER TABLE `users` ADD `registryType` varchar(20);--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(20);--> statement-breakpoint
ALTER TABLE `users` ADD `cpf` varchar(14);--> statement-breakpoint
ALTER TABLE `users` ADD `address` text;