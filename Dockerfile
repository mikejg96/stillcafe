# Stage 1: Build the Vite + React application
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (leverages Docker cache)
COPY package*.json ./
RUN npm install

# Copy source code, build scripts, and assets
COPY . .

# Build the project (generates optimized media assets & Vite production bundle in /dist)
RUN npm run build

# Stage 2: Serve static bundle with lightweight Nginx
FROM nginx:alpine

# Copy custom Nginx configuration (supports port 3000 & 80, SPA fallback)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy production build from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 3000 (as required by your hosting guide) and port 80
EXPOSE 3000 80

# Start Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
