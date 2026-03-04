CREATE TABLE `invitation` (
	`id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`email` text,
	`used_at` text,
	`created_at` text NOT NULL,
	`expires_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `invitation_token_unique` ON `invitation` (`token`);