import { pgTable, serial, text, timestamp, jsonb, integer } from "drizzle-orm/pg-core";

export const pxpConfigTable = pgTable("pxp_config", {
  id: serial("id").primaryKey(),
  churchName: text("church_name").notNull().default("The Way World Outreach"),
  scriptTree: jsonb("script_tree").notNull().default({}),
  orgId: integer("org_id").notNull().default(1),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type PxpConfig = typeof pxpConfigTable.$inferSelect;
