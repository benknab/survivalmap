import { integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const maps = sqliteTable("map", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
});

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  mapId: text("map_id").notNull().references(() => maps.id, { onDelete: "cascade" }),
  nickname: text("nickname").notNull(),
}, (table) => [
  uniqueIndex("users_map_id_nickname_unique").on(table.mapId, table.nickname),
]);

export const point = sqliteTable("point", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  mapId: text("map_id").notNull().references(() => maps.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  x: real("x").notNull(),
  y: real("y").notNull(),
  z: real("z").notNull(),
  addedByUserId: integer("added_by_user_id").notNull().references(() => users.id, {
    onDelete: "cascade",
  }),
});

export type MapRecord = typeof maps.$inferSelect;
export type UserRecord = typeof users.$inferSelect;
export type PointRecord = typeof point.$inferSelect;
