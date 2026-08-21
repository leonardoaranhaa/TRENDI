# Imagem do servidor de tempo real. Contexto de build é a raiz do repositório:
#   docker build -f apps/realtime/Dockerfile .
FROM node:22-slim AS builder
WORKDIR /app

COPY . .
RUN npm ci --ignore-scripts \
  && npm run generate -w @trendi/db \
  && npx tsc --build

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/realtime ./apps/realtime

USER node
EXPOSE 8080
CMD ["node", "apps/realtime/dist/index.js"]
