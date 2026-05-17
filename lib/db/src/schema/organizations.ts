import { pgTable, serial, text, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const organizationsTable = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  contactName: text("contact_name"),
  token: text("token").notNull().unique(),
  pin: text("pin"),
  campuses: jsonb("campuses").$type<string[]>().notNull().default(["HALLMARK","ARROWHEAD","RIVERSIDE","POMONA","LA","ARIZONA"]),
  serviceTimes: jsonb("service_times").$type<Record<string,string[]>>().notNull().default({}),
  plan: text("plan").notNull().default("free"),
  billingStatus: text("billing_status").notNull().default("active"),
  billingNotes: text("billing_notes"),
  suspended: boolean("suspended").notNull().default(false),
  trialEndsAt: timestamp("trial_ends_at"),
  stripeCustomerId: text("stripe_customer_id"),
  resetToken: text("reset_token"),
  resetTokenExpiresAt: timestamp("reset_token_expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastActiveAt: timestamp("last_active_at"),
});

export const insertOrganizationSchema = createInsertSchema(organizationsTable).omit({
  id: true,
  createdAt: true,
  lastActiveAt: true,
});

export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type Organization = typeof organizationsTable.$inferSelect;
