# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json tsconfig.json ./
RUN npm install

COPY src ./src
RUN npm run build

# Production stage
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
# Instala apenas dependências de produção
RUN npm install --omit=dev

# Instala curl e dos2unix
RUN apk add --no-cache curl dos2unix

# Copia os arquivos compilados do estágio de build
COPY --from=builder /app/dist ./dist

# Copia o script de entrypoint e corrige line endings
COPY entrypoint.sh /entrypoint.sh
RUN dos2unix /entrypoint.sh && chmod +x /entrypoint.sh

# A API não deve depender de um arquivo .env físico em produção.
ENV NODE_ENV=production
ENV PORT=4000

EXPOSE 4000
ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "dist/index.js"]
