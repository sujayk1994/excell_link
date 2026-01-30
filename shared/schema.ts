import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const processedFiles = pgTable("processed_files", {
  id: serial("id").primaryKey(),
  originalName: text("original_name").notNull(),
  processedName: text("processed_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertProcessedFileSchema = createInsertSchema(processedFiles).omit({ 
  id: true, 
  createdAt: true 
});

export type ProcessedFile = typeof processedFiles.$inferSelect;
export type InsertProcessedFile = z.infer<typeof insertProcessedFileSchema>;
