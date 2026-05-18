import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const saAuditLogTable = pgTable("sa_audit_log", {
  id: serial("id").primaryKey(),
  action: text("action").notNull(),
  orgId: integer("org_id"),
  details: text("details"),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type SaAuditLog = typeof saAuditLogTable.$inferSelect;
