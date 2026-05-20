import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";

export const callerWebauthnCredentialsTable = pgTable("caller_webauthn_credentials", {
  id: text("id").primaryKey(),
  callerId: integer("caller_id").notNull(),
  orgId: integer("org_id").notNull(),
  publicKey: text("public_key").notNull(),
  counter: integer("counter").notNull().default(0),
  transports: text("transports"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type CallerWebauthnCredential = typeof callerWebauthnCredentialsTable.$inferSelect;
