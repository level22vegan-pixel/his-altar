import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const passwordHistoryTable = pgTable("password_history", {
  id: serial("id").primaryKey(),
  campus: text("campus").notNull(),
  role: text("role").notNull(),
  changedAt: timestamp("changed_at").defaultNow().notNull(),
});

export type PasswordHistory = typeof passwordHistoryTable.$inferSelect;
