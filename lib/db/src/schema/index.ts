// Export your models here. Add one export per file
// export * from "./posts";
//
// Each model/table should ideally be split into different files.
// Each model/table should define a Drizzle table, insert schema, and types:
//
//   import { pgTable, text, serial } from "drizzle-orm/pg-core";
//   import { createInsertSchema } from "drizzle-zod";
//   import { z } from "zod/v4";
//
//   export const postsTable = pgTable("posts", {
//     id: serial("id").primaryKey(),
//     title: text("title").notNull(),
//   });
//
//   export const insertPostSchema = createInsertSchema(postsTable).omit({ id: true });
//   export type InsertPost = z.infer<typeof insertPostSchema>;
//   export type Post = typeof postsTable.$inferSelect;

export * from "./loginConfig";
export * from "./altarReports";
export * from "./workers";
export * from "./checkIns";
export * from "./serviceReports";
export * from "./dailyAltarReports";
export * from "./serviceNotes";
export * from "./campusPasswords";
export * from "./passwordHistory";
export * from "./teamPresets";
export * from "./activityLogs";
export * from "./dbancContacts";
export * from "./dbancCustomFields";
export * from "./pxpConfig";
export * from "./pxpCallLogs";
export * from "./pxpCallers";
export * from "./organizations";
export * from "./orgMessages";
export * from "./systemConfig";
export * from "./couponCodes";
export * from "./saAuditLog";
export * from "./webauthnCredentials";
export * from "./callerWebauthnCredentials";