FROM node:20-bookworm-slim

WORKDIR /app

# FFmpeg + ffprobe must exist in the runtime image (not only build).
RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg \
  && rm -rf /var/lib/apt/lists/* \
  && ffmpeg -version | head -n 1

COPY package.json package-lock.json ./
RUN npm ci --include=dev

COPY . .

# Build Next.js app (prisma generate runs inside npm run build).
ARG DATABASE_URL=postgresql://build:build@localhost:5432/build
ENV DATABASE_URL=$DATABASE_URL
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["npm", "run", "start"]
