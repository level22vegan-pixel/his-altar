import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const altarReportsTable = pgTable("altar_reports", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  campus: text("campus").notNull(),
  service: text("service").notNull(),
  responseType: text("response_type").notNull(),
  phone: text("phone"),
  email: text("email"),
  notes: text("notes"),
  orgId: integer("org_id").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAltarReportSchema = createInsertSchema(altarReportsTable).omit({ id: true, createdAt: true });
export type InsertAltarReport = z.infer<typeof insertAltarReportSchema>;
export type AltarReport = typeof altarReportsTable.$inferSelect;
