import { pgTable, serial, integer, boolean, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const loginConfigTable = pgTable("login_config", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().default(1),
  code: integer("code").array().notNull(),
  isAdmin: boolean("is_admin").notNull().default(false),
  label: text("label"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertLoginConfigSchema = createInsertSchema(loginConfigTable).omit({ id: true, updatedAt: true });
export type InsertLoginConfig = z.infer<typeof insertLoginConfigSchema>;
export type LoginConfig = typeof loginConfigTable.$inferSelect;
