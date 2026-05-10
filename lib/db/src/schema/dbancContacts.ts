import { pgTable, serial, text, timestamp, jsonb, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const dbancContactsTable = pgTable("dbanc_contacts", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone").notNull(),
  carrier: text("carrier").notNull().default(""),
  gender: text("gender").notNull().default(""),
  campus: text("campus").notNull().default(""),
  serviceTime: text("service_time").notNull().default(""),
  notes: text("notes").notNull().default(""),
  customData: jsonb("custom_data").notNull().default({}),
  prayerType: text("prayer_type").notNull().default(""),
  serviceDate: text("service_date").notNull().default(""),
  crisisFlag: boolean("crisis_flag").notNull().default(false),
  doNotContact: boolean("do_not_contact").notNull().default(false),
  assignedCallerId: integer("assigned_caller_id"),
  servicesNotes: text("services_notes").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertDbancContactSchema = createInsertSchema(dbancContactsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDbancContact = z.infer<typeof insertDbancContactSchema>;
export type DbancContact = typeof dbancContactsTable.$inferSelect;
