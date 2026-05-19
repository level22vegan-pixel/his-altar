import { pgTable, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";

export const webauthnCredentialsTable = pgTable("webauthn_credentials", {
  id: text("id").primaryKey(),
  orgId: integer("org_id").notNull(),
  publicKey: text("public_key").notNull(),
  counter: integer("counter").notNull().default(0),
  deviceType: text("device_type"),
  backedUp: boolean("backed_up").default(false),
  transports: text("transports"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type WebauthnCredential = typeof webauthnCredentialsTable.$inferSelect;
