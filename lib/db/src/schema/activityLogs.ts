import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const activityLogsTable = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  tool: text("tool").notNull(),        // 'dbanc' | 'pxp'
  action: text("action").notNull(),    // e.g. 'page_access'
  accessedAt: timestamp("accessed_at").notNull().defaultNow(),
});

export type ActivityLog = typeof activityLogsTable.$inferSelect;
