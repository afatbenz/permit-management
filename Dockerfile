# ---- Build stage ----
FROM node:20-alpine AS build

WORKDIR /app

# Install dependencies (reproducible via lockfile)
COPY permit-management/package*.json ./
RUN npm ci

# Compile the Vite production bundle into dist/
COPY permit-management/tsconfig*.json ./
COPY permit-management/vite.config.ts ./
COPY permit-management/index.html ./
COPY permit-management/src ./src
RUN npm run build

# ---- Web stage: nginx serves the built SPA + proxies /api to backend ----
FROM nginx:1.27-alpine AS web

# envsubst replaces ${BACKEND_HOST} in nginx.conf.template at container start.
COPY permit-management/nginx.conf.template /etc/nginx/templates/default.conf.template

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
