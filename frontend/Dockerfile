# syntax=docker/dockerfile:1

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* /app/

# Install dependencies
RUN npm ci --silent || npm install --silent

# Copy source code
COPY . /app

# Build for production
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY <<EOF /etc/nginx/conf.d/default.conf
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location /api {
        proxy_pass http://backend:8002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

# Development stage (uncomment for development)
# FROM node:20-alpine AS development
# WORKDIR /app
# COPY package.json package-lock.json* /app/
# RUN npm ci || npm install
# COPY . /app
# EXPOSE 5173
# CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
