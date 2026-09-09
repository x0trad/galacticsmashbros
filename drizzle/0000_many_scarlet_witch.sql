CREATE TABLE `ledger` (
	`id` text PRIMARY KEY NOT NULL,
	`player_id` text NOT NULL,
	`amount` integer NOT NULL,
	`reason` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ledger_player_time` ON `ledger` (`player_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `ownership` (
	`player_id` text NOT NULL,
	`kit` text NOT NULL,
	PRIMARY KEY(`player_id`, `kit`),
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `players` (
	`id` text PRIMARY KEY NOT NULL,
	`credits` integer DEFAULT 300 NOT NULL,
	`equipped` text DEFAULT 'standard' NOT NULL,
	`total_kills` integer DEFAULT 0 NOT NULL,
	`runs` integer DEFAULT 0 NOT NULL,
	`best` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	CONSTRAINT "credits_nonnegative" CHECK("players"."credits" >= 0)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`player_id` text NOT NULL,
	`started_at` integer NOT NULL,
	`finished_at` integer,
	`kills` integer,
	`wave` integer,
	`score` integer,
	`reward` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `sessions_player_start` ON `sessions` (`player_id`,`started_at`);