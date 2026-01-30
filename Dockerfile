# Node.js 20 base image
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies
RUN npm install

# Copy source code
COPY . .

# Build the application
# For this project structure, we need to ensure the server is bundled correctly
RUN npm run build

# Production image
FROM node:20-slim

WORKDIR /app

# Copy built files and production dependencies
# The build script typically puts things in dist/
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Install production dependencies only
RUN npm install --omit=dev

# Create uploads directory
RUN mkdir -p uploads

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Expose port
EXPOSE 5000

# Start command
# Adjusting based on common build outputs
CMD ["node", "dist/index.js"]
