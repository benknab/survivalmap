import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const maps = sqliteTable("map", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
});

export type MapRecord = typeof maps.$inferSelect;
