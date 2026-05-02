import { pgTable, serial, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const workersTable = pgTable("workers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role"),
  category: text("category").notNull(), // 'master' | 'alt'
  campus: text("campus").notNull().default(""),
  photoUrl: text("photo_url"),
  onHold: boolean("on_hold").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertWorkerSchema = createInsertSchema(workersTable).omit({ id: true, createdAt: true });
export type InsertWorker = z.infer<typeof insertWorkerSchema>;
export type Worker = typeof workersTable.$inferSelect;
