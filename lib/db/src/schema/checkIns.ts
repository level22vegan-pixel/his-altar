import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { workersTable } from "./workers";

export const checkInsTable = pgTable("check_ins", {
  id: serial("id").primaryKey(),
  workerId: integer("worker_id").notNull().references(() => workersTable.id, { onDelete: "cascade" }),
  campus: text("campus").notNull(),
  service: text("service").notNull(),
  serviceDate: text("service_date").notNull(),
  orgId: integer("org_id").notNull().default(1),
  checkedInAt: timestamp("checked_in_at").defaultNow().notNull(),
});

export const insertCheckInSchema = createInsertSchema(checkInsTable).omit({ id: true, checkedInAt: true });
export type InsertCheckIn = z.infer<typeof insertCheckInSchema>;
export type CheckIn = typeof checkInsTable.$inferSelect;
