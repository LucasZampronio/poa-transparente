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

# Copia os arquivos compilados do estágio de build
COPY --from=builder /app/dist ./dist

# A API não deve depender de um arquivo .env físico em produção.
# As variáveis devem ser injetadas pelo Docker Compose ou pela plataforma de Cloud (OCI/AWS).
ENV NODE_ENV=production
ENV PORT=4000

EXPOSE 4000
CMD ["node", "dist/index.js"]
