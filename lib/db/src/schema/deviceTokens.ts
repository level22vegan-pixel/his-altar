import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const deviceTokensTable = pgTable("device_tokens", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().default(1),
  token: text("token").notNull(),
  campus: text("campus").notNull().default(""),
  deviceName: text("device_name").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertDeviceTokenSchema = createInsertSchema(deviceTokensTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDeviceToken = z.infer<typeof insertDeviceTokenSchema>;
export type DeviceToken = typeof deviceTokensTable.$inferSelect;
