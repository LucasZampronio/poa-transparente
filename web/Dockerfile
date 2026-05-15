# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Em produção, a URL da API deve vir de uma variável de ambiente durante o build
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# Production stage (servindo com Nginx)
FROM nginx:alpine

# Copia os arquivos estáticos do estágio de build
COPY --from=builder /app/dist /usr/share/nginx/html

# Copia script de entrada
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Copia uma configuração simples de Nginx
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html; \
        try_files $uri $uri/ /index.html; \
    } \
    location /api/ { \
        proxy_pass http://api:4000; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
ENTRYPOINT ["/entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
