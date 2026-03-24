FROM node:20-alpine

WORKDIR /app

# Install dependencies first (layer cached unless package.json changes)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy source
COPY . .

EXPOSE 8000

CMD ["node", "server.js"]
