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
          // Clean the URL if it has those breadcrumb separators like ' > '
          const cleanUrl = url.split(' > ')[0].trim();
          const urlObj = new URL(cleanUrl.startsWith('http') ? cleanUrl : `http://${cleanUrl}`);
          return urlObj.hostname;
        } catch (e) {
          // If URL parsing fails, try a simple regex or string split for the domain
          const match = url.match(/^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n?]+)/im);
          if (match && match[1]) {
            return `www.${match[1].replace(/^www\./, '')}`;
          }
          return url.split(/[/?#]/)[0]; 
        }
      };

      // Ensure we always return www.domain.com format
      const formatDomain = (url: string) => {
        const domain = getDomain(url);
        if (!domain.startsWith('www.') && !domain.includes('docs.')) {
           return `www.${domain}`;
        }
        return domain;
      };

      // Create a new workbook with extracted links and domains
      const newWorkbook = XLSX.utils.book_new();
      
      let finalRows: string[][];
      if (deduplicate) {
        // User requested: All links in A (no link deduplication here), 
        // but duplicate removal logic applied to the PAIRS (filter based on domain uniqueness)
        const seenDomains = new Set<string>();
        finalRows = links.reduce((acc: string[][], link) => {
          const domain = formatDomain(link);
          if (!seenDomains.has(domain)) {
            seenDomains.add(domain);
            acc.push([link, domain]);
          }
          return acc;
        }, []);
      } else {
        // Standard mapping if no deduplication
        finalRows = links.map(link => [link, formatDomain(link)]);
      }

      const newWorksheet = XLSX.utils.aoa_to_sheet([["Full URL", "Domain"], ...finalRows]);
      
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

      res.status(200).json({ ...processedFile, linkCount: finalRows.length });
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
