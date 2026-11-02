CREATE TABLE `studio` (
	`id` text PRIMARY KEY NOT NULL,
	`state` text NOT NULL,
	`revision` integer NOT NULL,
	`history` text NOT NULL,
	`overlay_token` text NOT NULL
);
