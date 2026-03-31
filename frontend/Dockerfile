# Build Stage: Build React app
FROM node:18-alpine as build-stage

WORKDIR /app

# Install dependencies
COPY frontend/package*.json ./
RUN npm install

# Copy source and build
COPY frontend/ ./
# (Optional) Inject environment variables if needed
# ENV VITE_API_BASE_URL=/api
RUN npm run build

# Production Stage: Use Nginx to serve the build
FROM nginx:stable-alpine

# Copy built files
COPY --from=build-stage /app/dist /usr/share/nginx/html

# Copy custom nginx config
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port (Frontend on 80 in container, map to 5173 or 80 on host)
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
