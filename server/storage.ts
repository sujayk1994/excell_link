import { db } from "./db";
import { processedFiles, type InsertProcessedFile, type ProcessedFile } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IStorage {
  createProcessedFile(file: InsertProcessedFile): Promise<ProcessedFile>;
  getProcessedFile(id: number): Promise<ProcessedFile | undefined>;
}

export class DatabaseStorage implements IStorage {
  async createProcessedFile(file: InsertProcessedFile): Promise<ProcessedFile> {
    if (!db) throw new Error("Database not initialized");
    const [created] = await db.insert(processedFiles).values(file).returning();
    return created;
  }

  async getProcessedFile(id: number): Promise<ProcessedFile | undefined> {
    if (!db) throw new Error("Database not initialized");
    const [file] = await db.select().from(processedFiles).where(eq(processedFiles.id, id));
    return file;
  }
}

export class MemStorage implements IStorage {
  private files: Map<number, ProcessedFile>;
  private nextId: number;

  constructor() {
    this.files = new Map();
    this.nextId = 1;
  }

  async createProcessedFile(insertFile: InsertProcessedFile): Promise<ProcessedFile> {
    const id = this.nextId++;
    const file: ProcessedFile = { ...insertFile, id, createdAt: new Date() };
    this.files.set(id, file);
    return file;
  }

  async getProcessedFile(id: number): Promise<ProcessedFile | undefined> {
    return this.files.get(id);
  }
}

// In production, try to use DatabaseStorage if DATABASE_URL is present, otherwise fallback to MemStorage
export const storage = process.env.DATABASE_URL ? new DatabaseStorage() : new MemStorage();
