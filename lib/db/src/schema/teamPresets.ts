import { pgTable, serial, text, integer } from "drizzle-orm/pg-core";

export const teamPresetsTable = pgTable("team_presets", {
  id: serial("id").primaryKey(),
  campus: text("campus").notNull(),
  service: text("service").notNull(),
  workerIds: integer("worker_ids").array().notNull().default([]),
});

export type TeamPreset = typeof teamPresetsTable.$inferSelect;
