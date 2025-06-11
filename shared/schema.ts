import { pgTable, text, serial, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Keep the existing users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

// Add a conversions table to optionally store conversion history
export const conversions = pgTable("conversions", {
  id: serial("id").primaryKey(),
  inputCode: text("input_code").notNull(),
  outputCode: text("output_code").notNull(),
  mode: text("mode").notNull(), // 'zod' or 'json'
  createdAt: text("created_at").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertConversionSchema = createInsertSchema(conversions).pick({
  inputCode: true,
  outputCode: true,
  mode: true,
  createdAt: true,
});

// Validation schemas for the API
export const convertRequestSchema = z.object({
  code: z.string().min(1, "Code is required"),
  mode: z.enum(["zod", "json"], { message: "Mode must be 'zod' or 'json'" }),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertConversion = z.infer<typeof insertConversionSchema>;
export type Conversion = typeof conversions.$inferSelect;
export type ConvertRequest = z.infer<typeof convertRequestSchema>;
