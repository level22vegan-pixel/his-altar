import { pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const campusPasswordsTable = pgTable("campus_passwords", {
  id: serial("id").primaryKey(),
  campus: text("campus").notNull(),
  role: text("role").notNull(), // 'lead' | 'deputy_lead'
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("campus_passwords_campus_role_idx").on(t.campus, t.role),
]);

export type CampusPassword = typeof campusPasswordsTable.$inferSelect;
