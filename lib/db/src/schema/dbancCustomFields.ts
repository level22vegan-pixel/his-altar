import { pgTable, serial, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const dbancCustomFieldsTable = pgTable("dbanc_custom_fields", {
  id: serial("id").primaryKey(),
  label: text("label").notNull(),
  fieldType: text("field_type").notNull().default("text"),
  options: jsonb("options").notNull().default([]),
  sortOrder: integer("sort_order").notNull().default(0),
  orgId: integer("org_id").notNull().default(1),
  systemKey: text("system_key"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertDbancCustomFieldSchema = createInsertSchema(dbancCustomFieldsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertDbancCustomField = z.infer<typeof insertDbancCustomFieldSchema>;
export type DbancCustomField = typeof dbancCustomFieldsTable.$inferSelect;
