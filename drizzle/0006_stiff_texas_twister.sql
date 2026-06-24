ALTER TABLE `users` ADD `permCanViewBookings` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `permCanViewProfessionals` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `permCanViewRooms` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `permCanCheckIn` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `permCanManagePatients` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `passwordHash` varchar(255);