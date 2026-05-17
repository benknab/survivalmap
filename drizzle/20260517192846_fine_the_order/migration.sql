CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`map_id` text NOT NULL,
	`nickname` text NOT NULL,
	`role` text NOT NULL,
	CONSTRAINT `fk_users_map_id_map_id_fk` FOREIGN KEY (`map_id`) REFERENCES `map`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_map_id_nickname_unique` ON `users` (`map_id`,`nickname`);