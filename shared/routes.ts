import { z } from 'zod';
import { processedFiles } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  files: {
    upload: {
      method: 'POST' as const,
      path: '/api/upload',
      // Input validation for multipart/form-data is handled by middleware
      // but we describe the response structure here
      responses: {
        200: z.custom<typeof processedFiles.$inferSelect>(),
        400: errorSchemas.validation,
        500: errorSchemas.internal,
      },
    },
    download: {
      method: 'GET' as const,
      path: '/api/files/:id/download',
      responses: {
        404: errorSchemas.validation, // File not found
      }
    }
  }
};

// Required buildUrl helper
export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

// Type for processed file response with link count
export type ProcessedFile = typeof processedFiles.$inferSelect & { linkCount: number };
