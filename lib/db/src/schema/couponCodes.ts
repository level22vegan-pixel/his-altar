import { pgTable, serial, text, boolean, integer, numeric, timestamp } from "drizzle-orm/pg-core";

export const couponCodesTable = pgTable("coupon_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  description: text("description"),
  discountType: text("discount_type").notNull().default("percent"),
  discountValue: numeric("discount_value", { precision: 10, scale: 2 }).notNull().default("0"),
  plan: text("plan"),
  maxUses: integer("max_uses"),
  usesCount: integer("uses_count").notNull().default(0),
  expiresAt: timestamp("expires_at"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type CouponCode = typeof couponCodesTable.$inferSelect;
