# Imagem da API. O contexto de build é a raiz do repositório:
#   docker build -f apps/api/Dockerfile .
FROM node:22-slim AS builder
WORKDIR /app

COPY . .
# --ignore-scripts porque o `prisma generate` do postinstall roda logo abaixo,
# já com o schema no lugar.
RUN npm ci --ignore-scripts \
  && npm run generate -w @trendi/db \
  && npx tsc --build

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api ./apps/api

USER node
EXPOSE 8080
CMD ["node", "apps/api/dist/index.js"]
