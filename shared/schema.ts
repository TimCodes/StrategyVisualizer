import { pgTable, text, serial, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const packages = pgTable("packages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  version: text("version").notNull(),
  status: text("status").notNull().default("stopped"),
  port: integer("port"),
  description: text("description"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertPackageSchema = createInsertSchema(packages).pick({
  name: true,
  version: true,
  status: true,
  port: true,
  description: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertPackage = z.infer<typeof insertPackageSchema>;
export type Package = typeof packages.$inferSelect;
