import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const maps = sqliteTable("map", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
});

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  mapId: text("map_id").notNull().references(() => maps.id, { onDelete: "cascade" }),
  nickname: text("nickname").notNull(),
  role: text("role", { enum: ["owner", "member"] }).notNull(),
}, (table) => [
  uniqueIndex("users_map_id_nickname_unique").on(table.mapId, table.nickname),
]);

export type MapRecord = typeof maps.$inferSelect;
export type UserRecord = typeof users.$inferSelect;
