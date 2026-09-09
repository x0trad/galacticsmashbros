CREATE TABLE `wallet_challenges` (
	`player_id` text PRIMARY KEY NOT NULL,
	`nonce` text NOT NULL,
	`address` text NOT NULL,
	`message` text NOT NULL,
	`expires_at` integer NOT NULL,
	`consumed` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `wallets` (
	`player_id` text PRIMARY KEY NOT NULL,
	`address` text NOT NULL,
	`chain_id` integer NOT NULL,
	`linked_at` integer NOT NULL,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `wallets_address_unique` ON `wallets` (`address`);