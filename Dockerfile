# ──────────────────────────────────────────────────────────
# Concourse AI — Backend Dockerfile (Cloud Run ready)
# ──────────────────────────────────────────────────────────

FROM node:22-slim AS builder

WORKDIR /app
COPY backend/package*.json ./
RUN npm ci

COPY backend/src/ ./src/
COPY backend/seed-data/ ./seed-data/
COPY backend/tsconfig.json ./
RUN npx tsc

# ── Production stage ──────────────────────────────────────
FROM node:22-slim

WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/seed-data ./seed-data

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

CMD ["node", "dist/index.js"]
