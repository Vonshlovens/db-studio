CREATE TABLE `diagrams` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`schema_json` text NOT NULL,
	`layout_json` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `diagrams_owner_updated_idx` ON `diagrams` (`owner_id`,`updated_at`);