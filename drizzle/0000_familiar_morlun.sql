CREATE TABLE `athletes` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`payload` text NOT NULL,
	FOREIGN KEY (`owner`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `athletes_owner` ON `athletes` (`owner`);--> statement-breakpoint
CREATE TABLE `audit_events` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`action` text NOT NULL,
	`entity_id` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `campaigns` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`version` integer NOT NULL,
	`payload` text NOT NULL,
	`created_at` text NOT NULL,
	`archived` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`owner`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `campaigns_owner` ON `campaigns` (`owner`);--> statement-breakpoint
CREATE TABLE `corrections` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`evidence_id` text NOT NULL,
	`note` text NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`evidence_id`) REFERENCES `evidence`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `decisions` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`run_id` text NOT NULL,
	`athlete_id` text NOT NULL,
	`decision` text NOT NULL,
	`note` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`run_id`) REFERENCES `research_runs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `decision_unique` ON `decisions` (`run_id`,`athlete_id`);--> statement-breakpoint
CREATE TABLE `evaluations` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`run_id` text NOT NULL,
	`payload` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`run_id`) REFERENCES `research_runs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `evidence` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`athlete_id` text NOT NULL,
	`status` text NOT NULL,
	`payload` text NOT NULL,
	FOREIGN KEY (`owner`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`athlete_id`) REFERENCES `athletes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `evidence_owner` ON `evidence` (`owner`,`athlete_id`);--> statement-breakpoint
CREATE TABLE `research_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`campaign_id` text NOT NULL,
	`version` integer NOT NULL,
	`idempotency_key` text NOT NULL,
	`input_hash` text NOT NULL,
	`snapshot` text NOT NULL,
	`result` text,
	`state` text NOT NULL,
	`lease` text,
	`lease_until` integer,
	`attempts` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`reviewed_at` text,
	`error` text,
	FOREIGN KEY (`owner`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `run_idempotency` ON `research_runs` (`owner`,`idempotency_key`);--> statement-breakpoint
CREATE INDEX `runs_campaign` ON `research_runs` (`owner`,`campaign_id`);--> statement-breakpoint
CREATE TABLE `campaign_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`owner` text NOT NULL,
	`version` integer NOT NULL,
	`payload` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `campaign_version_unique` ON `campaign_versions` (`campaign_id`,`version`);--> statement-breakpoint
CREATE TABLE `workspaces` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` text NOT NULL
);
