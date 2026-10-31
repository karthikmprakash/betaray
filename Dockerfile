# syntax=docker/dockerfile:1.6
FROM node:22-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN apk add --no-cache openssl

FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup -S app && adduser -S app -G app
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/scripts ./scripts
RUN chown -R app:app /app
USER app
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# Run migrations then start
CMD ["sh", "-c", "node --env-file=.env scripts/migrate.mjs 2>/dev/null || npx prisma migrate deploy; node_modules/.bin/next start --hostname 0.0.0.0 --port ${PORT:-3000}"]
