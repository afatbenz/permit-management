# ─── permit-management frontend Dockerfile ──────────────────────────────
# Multi-stage: build static Vite bundle → serve with nginx.
# nginx also reverse-proxies /api → backend service (see nginx.conf).
# ─────────────────────────────────────────────────────────────────────────

# ---- Stage 1: build ----
FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- Stage 2: serve ----
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
