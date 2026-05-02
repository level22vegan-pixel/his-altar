import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const serviceNotesTable = pgTable("service_notes", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(),
  service: text("service").notNull(),
  notes: text("notes").notNull().default(""),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
