# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
RUN apk add --no-cache openssl
WORKDIR /app
# prisma.config.ts exige DATABASE_URL ao carregar; valor só para build (docker-compose sobrescreve em runtime)
ENV DATABASE_URL=postgresql://postgres:postgres@localhost:5432/cartwave_payments?schema=public

# --- Development: dependências completas (inclui nodemon) + hot reload via volume ---
FROM base AS development
ENV NODE_ENV=development
COPY package.json package-lock.json ./
# postinstall corre prisma generate — schema e config têm de existir antes de npm ci
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm ci
COPY . .
RUN npx prisma generate
EXPOSE 3000
CMD ["npm", "run", "dev"]

# --- Production: apenas dependências de produção após gerar o client Prisma ---
FROM base AS production
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build
RUN npm prune --omit=dev && npm cache clean --force
RUN addgroup -g 1001 -S app && adduser -S app -u 1001 -G app \
  && chown -R app:app /app
USER app
EXPOSE 3000
CMD ["node", "dist/index.js"]
