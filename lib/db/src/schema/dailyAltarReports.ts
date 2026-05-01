import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const dailyAltarReportsTable = pgTable("daily_altar_reports", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(),         // YYYY-MM-DD
  campus: text("campus").notNull(),
  service: text("service").notNull().default(""),  // e.g. "8am", "10am", "12pm", "7pm"
  salvations: integer("salvations").notNull().default(0),
  prayers: integer("prayers").notNull().default(0),
  altarMembers: integer("altar_members").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertDailyAltarReportSchema = createInsertSchema(dailyAltarReportsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDailyAltarReport = z.infer<typeof insertDailyAltarReportSchema>;
export type DailyAltarReport = typeof dailyAltarReportsTable.$inferSelect;
