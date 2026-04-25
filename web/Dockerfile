FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

# Copia todos os arquivos da raiz (incluindo configs do tailwind)
COPY . .

EXPOSE 5173
CMD ["npm", "run", "dev"]
