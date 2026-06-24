ALTER TABLE `tenants` ADD `legalName` varchar(200);--> statement-breakpoint
ALTER TABLE `tenants` ADD `document` varchar(18);--> statement-breakpoint
ALTER TABLE `tenants` ADD `addressStreet` varchar(200);--> statement-breakpoint
ALTER TABLE `tenants` ADD `addressNumber` varchar(20);--> statement-breakpoint
ALTER TABLE `tenants` ADD `addressComplement` varchar(100);--> statement-breakpoint
ALTER TABLE `tenants` ADD `addressNeighborhood` varchar(100);--> statement-breakpoint
ALTER TABLE `tenants` ADD `addressCity` varchar(100);--> statement-breakpoint
ALTER TABLE `tenants` ADD `addressState` varchar(2);--> statement-breakpoint
ALTER TABLE `tenants` ADD `addressZip` varchar(10);