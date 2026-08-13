# backend/Dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy the rest of the backend source
COPY . .

# Make sure the data directory exists (db.json is generated here at runtime)
RUN mkdir -p data

EXPOSE 4000

ENV NODE_ENV=production
ENV PORT=4000

# Seed the JSON datastore only if it doesn't already exist (so a mounted
# volume with real data is never overwritten on restart), then start.
CMD ["sh", "-c", "if [ ! -f data/db.json ]; then node src/seed.js; fi; node src/server.js"]