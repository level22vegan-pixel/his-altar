import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const pxpCallLogsTable = pgTable("pxp_call_logs", {
  id: serial("id").primaryKey(),
  contactId: integer("contact_id").notNull(),
  callerName: text("caller_name").notNull(),
  campus: text("campus").notNull(),
  outcome: text("outcome").notNull().default(""),
  notes: text("notes").notNull().default(""),
  servicesOffered: text("services_offered").notNull().default(""),
  feedback: text("feedback").notNull().default(""),
  orgId: integer("org_id").notNull().default(1),
  calledAt: timestamp("called_at").notNull().defaultNow(),
});

export const insertPxpCallLogSchema = createInsertSchema(pxpCallLogsTable).omit({
  id: true,
  calledAt: true,
});

export type InsertPxpCallLog = z.infer<typeof insertPxpCallLogSchema>;
export type PxpCallLog = typeof pxpCallLogsTable.$inferSelect;
