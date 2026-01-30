# Excel Link Extractor

## Overview

A web application that extracts URLs and hyperlinks from Excel files (.xlsx, .xls). Users upload a spreadsheet through a drag-and-drop interface, the server parses the file to find all embedded links, and returns a downloadable file with the extracted URLs.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens (CSS variables for theming)
- **Animations**: Framer Motion for drag-and-drop and transitions
- **Build Tool**: Vite with path aliases (`@/` for client/src, `@shared/` for shared)

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript (ES modules)
- **File Handling**: Multer for multipart form uploads
- **Excel Parsing**: XLSX library for reading spreadsheet files and extracting hyperlinks
- **API Design**: RESTful endpoints defined in shared/routes.ts with Zod validation schemas

### Data Storage
- **Database**: PostgreSQL via Drizzle ORM
- **Schema Location**: shared/schema.ts contains table definitions
- **Migrations**: Drizzle Kit for schema migrations (output to ./migrations)
- **Storage Pattern**: Repository pattern implemented in server/storage.ts

### Request Flow
1. User drops Excel file on Dropzone component
2. Frontend sends multipart POST to `/api/upload`
3. Multer saves file to `uploads/` directory
4. Server parses Excel file, extracts all hyperlinks and URL-like cell values
5. Processed file metadata stored in PostgreSQL
6. Response includes file info with link count
7. User can download processed results via `/api/files/:id/download`

### Project Structure
```
client/           # React frontend
  src/
    components/   # UI components (Dropzone, ProcessingState, SuccessState)
    hooks/        # Custom React hooks (use-files, use-toast)
    pages/        # Page components (Home, not-found)
    lib/          # Utilities (queryClient, utils)
server/           # Express backend
  index.ts        # Server entry point
  routes.ts       # API route handlers
  storage.ts      # Database operations
  db.ts           # Database connection
shared/           # Shared between client/server
  schema.ts       # Drizzle database schema
  routes.ts       # API route definitions with Zod schemas
```

## External Dependencies

### Database
- **PostgreSQL**: Primary database, connection via `DATABASE_URL` environment variable
- **Drizzle ORM**: Type-safe database queries and schema management

### File Processing
- **XLSX**: Library for parsing Excel files and extracting hyperlink metadata
- **Multer**: Express middleware for handling file uploads

### UI Libraries
- **Radix UI**: Accessible, unstyled component primitives
- **shadcn/ui**: Pre-built component collection using Radix + Tailwind
- **Lucide React**: Icon library
- **Framer Motion**: Animation library

### Build & Development
- **Vite**: Frontend build tool with HMR
- **esbuild**: Server bundling for production
- **TSX**: TypeScript execution for development