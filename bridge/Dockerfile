FROM node:22-bookworm-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY index.js ./

EXPOSE 3300

CMD ["node", "index.js"]
