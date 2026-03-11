FROM node:22-bookworm-slim

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY *.js ./

EXPOSE 3300

CMD ["node", "index.js"]
