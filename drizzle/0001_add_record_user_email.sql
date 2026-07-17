ALTER TABLE `outfit_records` ADD `user_email` text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE INDEX `outfit_records_user_email_created_at_idx` ON `outfit_records` (`user_email`,`created_at`);