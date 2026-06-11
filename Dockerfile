FROM node:20-bookworm-slim

WORKDIR /app

# FFmpeg + ffprobe must exist in the runtime image (not only build).
RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg \
  && rm -rf /var/lib/apt/lists/* \
  && ffmpeg -version | head -n 1

# Prisma files must exist before postinstall / prisma generate.
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma

# Skip postinstall here; prisma generate runs in `npm run build`.
RUN npm ci --include=dev --ignore-scripts

COPY . .

ARG DATABASE_URL=postgresql://build:build@localhost:5432/build
ENV DATABASE_URL=$DATABASE_URL
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["npm", "run", "start"]
