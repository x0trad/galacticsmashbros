CREATE TABLE `sprite_image_limits` (
	`identity` text NOT NULL,
	`day` integer NOT NULL,
	`stage` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`identity`, `day`, `stage`)
);
