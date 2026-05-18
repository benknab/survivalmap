CREATE TABLE `point` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`map_id` text NOT NULL,
	`name` text NOT NULL,
	`x` real NOT NULL,
	`y` real NOT NULL,
	`z` real NOT NULL,
	`added_by_user_id` integer NOT NULL,
	CONSTRAINT `fk_point_map_id_map_id_fk` FOREIGN KEY (`map_id`) REFERENCES `map`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_point_added_by_user_id_users_id_fk` FOREIGN KEY (`added_by_user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
