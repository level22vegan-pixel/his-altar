import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const serviceReportsTable = pgTable("service_reports", {
  id: serial("id").primaryKey(),
  campus: text("campus").notNull(),
  service: text("service").notNull(),
  serviceDate: text("service_date").notNull(),
  totalEntries: integer("total_entries").default(0).notNull(),
  servants: integer("servants").default(0).notNull(),
  salvations: integer("salvations").default(0).notNull(),
  prayers: integer("prayers").default(0).notNull(),
  family: integer("family").default(0).notNull(),
  notes: text("notes"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertServiceReportSchema = createInsertSchema(serviceReportsTable).omit({ id: true, updatedAt: true });
export type InsertServiceReport = z.infer<typeof insertServiceReportSchema>;
export type ServiceReport = typeof serviceReportsTable.$inferSelect;
