# Cloud Run image for the Next.js app + server-side Remotion rendering.
# Dev dependencies and source stay in the image on purpose: /api/render bundles
# src/remotion with webpack + Tailwind at request time (see src/lib/video/render.ts).
FROM node:22-bookworm-slim

# Shared libraries required by Remotion's headless Chrome.
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates fonts-liberation \
    libasound2 libatk-bridge2.0-0 libatk1.0-0 libcairo2 libcups2 libdbus-1-3 \
    libdrm2 libgbm1 libnss3 libpango-1.0-0 libx11-6 libxcb1 libxcomposite1 \
    libxdamage1 libxext6 libxfixes3 libxkbcommon0 libxrandr2 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
RUN npm ci --include=dev

# Download Remotion's headless Chrome shell at build time, not on first request.
RUN npx remotion browser ensure

COPY . .
ENV NODE_ENV=production
RUN npm run build

# Runtime writes: rendered videos (out/) and generated audio (public/audio).
# Cloud Run's filesystem is ephemeral, so these do not survive instance restarts.
RUN mkdir -p out public/audio && chown -R node:node /app
USER node

ENV PORT=8080
EXPOSE 8080
CMD ["node_modules/.bin/next", "start"]
