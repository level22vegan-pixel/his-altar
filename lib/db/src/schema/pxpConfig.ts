import { pgTable, serial, text, timestamp, jsonb } from "drizzle-orm/pg-core";

export const pxpConfigTable = pgTable("pxp_config", {
  id: serial("id").primaryKey(),
  churchName: text("church_name").notNull().default("The Way World Outreach"),
  scriptTree: jsonb("script_tree").notNull().default({}),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type PxpConfig = typeof pxpConfigTable.$inferSelect;
