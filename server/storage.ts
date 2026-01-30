import { db } from "./db";
import { processedFiles, type InsertProcessedFile, type ProcessedFile } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IStorage {
  createProcessedFile(file: InsertProcessedFile): Promise<ProcessedFile>;
  getProcessedFile(id: number): Promise<ProcessedFile | undefined>;
}

export class DatabaseStorage implements IStorage {
  async createProcessedFile(file: InsertProcessedFile): Promise<ProcessedFile> {
    const [created] = await db.insert(processedFiles).values(file).returning();
    return created;
  }

  async getProcessedFile(id: number): Promise<ProcessedFile | undefined> {
    const [file] = await db.select().from(processedFiles).where(eq(processedFiles.id, id));
    return file;
  }
}

export const storage = new DatabaseStorage();
