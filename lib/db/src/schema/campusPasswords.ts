import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const campusPasswordsTable = pgTable("campus_passwords", {
  id: serial("id").primaryKey(),
  campus: text("campus").notNull(),
  role: text("role").notNull(), // 'lead' | 'deputy_lead'
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type CampusPassword = typeof campusPasswordsTable.$inferSelect;
