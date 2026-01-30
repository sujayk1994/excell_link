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

  app.post(api.files.upload.path, upload.single("file"), async (req: Request, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const filePath = req.file.path;
      
      // Read the Excel file
      const workbook = XLSX.readFile(filePath);
      const links: string[] = [];

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

      // Create a new workbook with extracted links
      const newWorkbook = XLSX.utils.book_new();
      const linkData = links.map(link => [link]); // Array of arrays for sheet data
      const newWorksheet = XLSX.utils.aoa_to_sheet([["Extracted Links"], ...linkData]);
      
      // Auto-width the column
      newWorksheet['!cols'] = [{ wch: 100 }];
      
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

      // Cleanup original upload if desired, but keeping for now or tmp cleanup
      // fs.unlinkSync(filePath); 

      res.status(200).json(processedFile);
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
