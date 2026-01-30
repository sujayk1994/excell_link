import type { Express, Request } from "express";
import type { Server } from "http";
import multer from "multer";
import XLSX from "xlsx";
import { storage } from "./storage";
import { api } from "@shared/routes";
import path from "path";
import fs from "fs";

const upload = multer({ dest: "uploads/" });

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
