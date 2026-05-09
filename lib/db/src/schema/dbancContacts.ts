import { pgTable, serial, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const dbancContactsTable = pgTable("dbanc_contacts", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone").notNull(),
  carrier: text("carrier").notNull().default(""),
  gender: text("gender").notNull().default(""),
  campus: text("campus").notNull().default(""),
  notes: text("notes").notNull().default(""),
  customData: jsonb("custom_data").notNull().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertDbancContactSchema = createInsertSchema(dbancContactsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDbancContact = z.infer<typeof insertDbancContactSchema>;
export type DbancContact = typeof dbancContactsTable.$inferSelect;
