# ── stage: deps ─────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install

# ── stage: build-and-test ────────────────────────────────────
FROM deps AS build-and-test
COPY . .
RUN npm run build
RUN npm test

# ── stage: production ────────────────────────────────────────
FROM node:22-alpine AS production
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install --omit=dev && npm cache clean --force

COPY --from=build-and-test /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/main"]
