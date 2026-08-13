# frontend/Dockerfile
# Multi-stage build for the Next.js 14 app.
#
# IMPORTANT: NEXT_PUBLIC_API_URL is a build-time value (Next.js inlines
# process.env.NEXT_PUBLIC_* into the client bundle at `next build`). Pass the
# correct value via --build-arg (or the `args:` key in docker-compose) for
# each environment — localhost for dev, your real API domain for prod.

# ---------- deps ----------
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# ---------- builder ----------
FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Ensure a public/ dir exists even if the repo doesn't have one, so the
# COPY in the runner stage below never fails.
RUN mkdir -p public

ARG NEXT_PUBLIC_API_URL=http://localhost:4000/api
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

RUN npm run build

# ---------- runner ----------
FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.js ./next.config.js

EXPOSE 3000
ENV PORT=3000

CMD ["npm", "start"]