import type { Express, Request } from "express";
import type { Server } from "http";
import multer from "multer";
import XLSX from "xlsx";
import { storage } from "./storage";
import { api } from "@shared/routes";
import path from "path";
import fs from "fs";
import axios from "axios";
import * as cheerio from "cheerio";

const upload = multer({ dest: "uploads/" });

async function scrapeDescription(url: string): Promise<string> {
  try {
    const targetUrl = url.startsWith("http") ? url : `https://${url}`;
    const response = await axios.get(targetUrl, { 
      timeout: 5000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    const $ = cheerio.load(response.data);
    const description = $('meta[name="description"]').attr('content') || 
                       $('meta[property="og:description"]').attr('content') ||
                       "No description found";
    return description.trim();
  } catch (error) {
    return "Error fetching description";
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Ensure uploads directory exists
  if (!fs.existsSync("uploads")) {
    fs.mkdirSync("uploads");
  }

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.post("/api/files/:id/scrape", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const fileRecord = await storage.getProcessedFile(id);
      if (!fileRecord) return res.status(404).json({ message: "File not found" });

      const filePath = path.join("uploads", fileRecord.processedName);
      const workbook = XLSX.readFile(filePath);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const data: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      const headers = data[0] as string[];
      if (!headers.includes("Description")) {
        headers.push("Description");
      }
      const descIndex = headers.indexOf("Description");
      const domainIndex = headers.indexOf("Unique Domain");

      // Scrape for unique domains (limited to first 20 for performance in this turn)
      const scrapePromises = data.slice(1).map(async (row, i) => {
        const domain = row[domainIndex];
        if (domain && domain !== "Unique Domain") {
          row[descIndex] = await scrapeDescription(domain);
        }
        return row;
      });

      await Promise.all(scrapePromises);

      const newSheet = XLSX.utils.aoa_to_sheet(data);
      newSheet['!cols'] = [{ wch: 80 }, { wch: 40 }, { wch: 100 }];
      workbook.Sheets[workbook.SheetNames[0]] = newSheet;
      XLSX.writeFile(workbook, filePath);

      res.status(200).json({ message: "Scraping complete" });
    } catch (error) {
      console.error("Scrape error:", error);
      res.status(500).json({ message: "Failed to scrape descriptions" });
    }
  });

  app.post(api.files.upload.path, upload.single("file"), async (req: Request, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const deduplicate = req.body.deduplicate === "true";
      const filePath = req.file.path;
      
      // Read the Excel file
      const workbook = XLSX.readFile(filePath);
      let links: string[] = [];

      // Iterate through all sheets
      workbook.SheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        
        // Iterate through all cells
        Object.keys(worksheet).forEach(cellKey => {
          if (cellKey.startsWith('!')) return; // Skip metadata
          
          const cell = worksheet[cellKey];
          
          // Check for hyperlink property
          if (cell.l && cell.l.Target) {
            links.push(cell.l.Target);
          } 
          // Check if cell value looks like a URL
          else if (typeof cell.v === 'string' && (cell.v.startsWith('http://') || cell.v.startsWith('https://'))) {
            links.push(cell.v);
          }
        });
      });

      // User requested: All links in A, duplicate removal only for B (domains)
      // Helper to extract domain strictly
      const getDomain = (url: string) => {
        try {
          // 1. First, handle breadcrumbs like "onelogin.com › learn › ..."
          let cleanStr = url.split(/[›>]/)[0].trim();
          
          // 2. Remove any protocol if present for parsing
          cleanStr = cleanStr.replace(/^(https?:\/\/)/, "");
          
          // 3. Split by "/" to remove paths and take the hostname part
          let hostname = cleanStr.split('/')[0].trim();
          
          return hostname.toLowerCase();
        } catch (e) {
          return url.toLowerCase().split(/[/?#›>]/)[0].trim();
        }
      };

      // Ensure we return the domain as is (no forced www)
      const formatDomain = (url: string) => {
        let domain = getDomain(url);
        // Remove leading/trailing dots and spaces
        domain = domain.replace(/^\.+|\.+$/g, '').trim();
        return domain;
      };

      // Create a new workbook with extracted links and domains
      const newWorkbook = XLSX.utils.book_new();
      
      // User requested: Decoupled columns
      // Column A: All links (including duplicates)
      // Column B: Only unique formatted domains (compacted, no empty rows)
      const columnA = links;
      const columnB = deduplicate ? [...new Set(links.map(formatDomain))] : links.map(formatDomain);
      
      // Combine into rows by taking the longest list as the row count
      const rowCount = Math.max(columnA.length, columnB.length);
      const finalRows: (string | undefined)[][] = [];
      
      for (let i = 0; i < rowCount; i++) {
        // columnA[i] and columnB[i] will be undefined if the index is out of bounds
        // which naturally creates the decoupled/compacted effect
        finalRows.push([columnA[i], columnB[i]]);
      }

      const newWorksheet = XLSX.utils.aoa_to_sheet([["Full URL", "Unique Domain"], ...finalRows]);
      
      // Auto-width columns
      newWorksheet['!cols'] = [{ wch: 80 }, { wch: 40 }];
      
      XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, "Links");

      // Save processed file
      const processedFileName = `processed_${req.file.filename}.xlsx`;
      const processedFilePath = path.join("uploads", processedFileName);
      XLSX.writeFile(newWorkbook, processedFilePath);

      // Save record to DB
      const processedFile = await storage.createProcessedFile({
        originalName: req.file.originalname,
        processedName: processedFileName,
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        size: fs.statSync(processedFilePath).size
      });

      res.status(200).json({ ...processedFile, linkCount: columnB.length });
    } catch (error) {
      console.error("Processing error:", error);
      res.status(500).json({ message: "Failed to process Excel file" });
    }
  });

  app.get(api.files.download.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

      const fileRecord = await storage.getProcessedFile(id);
      if (!fileRecord) {
        return res.status(404).json({ message: "File not found" });
      }

      const filePath = path.join("uploads", fileRecord.processedName);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "File not found on server" });
      }

      res.download(filePath, `extracted_links_${fileRecord.originalName}`);
    } catch (error) {
      console.error("Download error:", error);
      res.status(500).json({ message: "Failed to download file" });
    }
  });

  return httpServer;
}
