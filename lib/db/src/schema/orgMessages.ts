import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const orgMessagesTable = pgTable("org_messages", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull(),
  fromAdmin: boolean("from_admin").notNull().default(true),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertOrgMessageSchema = createInsertSchema(orgMessagesTable).omit({
  id: true,
  createdAt: true,
});

export type InsertOrgMessage = z.infer<typeof insertOrgMessageSchema>;
export type OrgMessage = typeof orgMessagesTable.$inferSelect;
