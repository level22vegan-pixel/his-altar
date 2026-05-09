import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const pxpCallersTable = pgTable("pxp_callers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  campus: text("campus").notNull(),
  phone: text("phone").notNull().default(""),
  password: text("password").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPxpCallerSchema = createInsertSchema(pxpCallersTable).omit({
  id: true,
  createdAt: true,
});

export type InsertPxpCaller = z.infer<typeof insertPxpCallerSchema>;
export type PxpCaller = typeof pxpCallersTable.$inferSelect;
