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
import OpenAI from "openai";
import { batchProcess } from "./replit_integrations/batch";

const upload = multer({ dest: "uploads/" });

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

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
                       "";
    return description.trim();
  } catch (error) {
    return "";
  }
}

async function refineDescriptionWithAI(domain: string, rawDescription: string): Promise<string> {
  try {
    const prompt = `You are a niche business analyst. Given the domain "${domain}" and its raw metadata description: "${rawDescription || 'No description found'}", provide a concise (15-20 words) summary of what this company does and what products/services they offer. Focus on being professional and informative. If no description is provided, try to infer the niche from the domain name itself.`;
    
    const response = await openai.chat.completions.create({
      model: "gpt-5.1",
      messages: [{ role: "user", content: prompt }],
      max_completion_tokens: 100,
    });

    return response.choices[0]?.message?.content?.trim() || "Description unavailable";
  } catch (error) {
    console.error("AI Refinement error:", error);
    return rawDescription || "Description unavailable";
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

      // Email finding logic
      app.post("/api/files/:id/find-emails", async (req, res) => {
        try {
          const id = parseInt(req.params.id as string);
          const fileRecord = await storage.getProcessedFile(id);
          if (!fileRecord) return res.status(404).json({ message: "File not found" });

          const filePath = path.join("uploads", fileRecord.processedName);
          const workbook = XLSX.readFile(filePath);
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const data: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

          const headers = data[0] as string[];
          if (!headers.includes("Management Emails")) {
            headers.push("Management Emails");
          }
          const emailIndex = headers.indexOf("Management Emails");
          const domainIndex = headers.indexOf("Unique Domain");

          let totalEmailsFound = 0;
          const rowsToProcess = data.slice(1);
          
          await batchProcess(
            rowsToProcess,
            async (row) => {
              const domain = row[domainIndex];
              if (domain && domain !== "Unique Domain") {
                const prompt = `Find potential business emails for top-level management (CEO, VP, Marketing Head, etc.) for the company with domain "${domain}". Search the web and provide a comma-separated list of found emails. If none are found, respond with "None found". Only provide the emails.`;
                try {
                  const response = await openai.chat.completions.create({
                    model: "gpt-5.1",
                    messages: [{ role: "user", content: prompt }],
                    max_completion_tokens: 200,
                  });
                  const emails = response.choices[0]?.message?.content?.trim() || "";
                  if (emails && emails.toLowerCase() !== "none found") {
                    row[emailIndex] = emails;
                    totalEmailsFound += emails.split(",").length;
                  }
                } catch (err) {
                  console.error(`AI Error finding emails for ${domain}:`, err);
                  row[emailIndex] = "Error finding emails";
                }
              }
              return row;
            },
            { concurrency: 5, retries: 3 }
          );

          const newSheet = XLSX.utils.aoa_to_sheet(data);
          newSheet['!cols'] = (sheet['!cols'] || []).concat([{ wch: 60 }]);
          workbook.Sheets[workbook.SheetNames[0]] = newSheet;
          XLSX.writeFile(workbook, filePath);

          await storage.updateEmailCount(id, totalEmailsFound);
          res.status(200).json({ message: "Email finding complete", emailCount: totalEmailsFound });
        } catch (error) {
          console.error("Find emails error:", error);
          res.status(500).json({ message: "Failed to find emails" });
        }
      });

      // Scrape for unique domains using batch processing for efficiency
      const rowsToProcess = data.slice(1);
      await batchProcess(
        rowsToProcess,
        async (row) => {
          const domain = row[domainIndex];
          if (domain && domain !== "Unique Domain") {
            const rawDesc = await scrapeDescription(domain);
            row[descIndex] = await refineDescriptionWithAI(domain, rawDesc);
          }
          return row;
        },
        { concurrency: 5, retries: 3 }
      );

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
      const columnB = deduplicate ? Array.from(new Set(links.map(formatDomain))) : links.map(formatDomain);
      
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
      const id = parseInt(req.params.id as string);
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
