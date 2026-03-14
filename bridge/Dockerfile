FROM node:22-bookworm

WORKDIR /app

# Install dependencies for better-sqlite3
RUN apt-get update && apt-get install -y \
    python3 \
    python3-distutils \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install --omit=dev

COPY *.js ./

EXPOSE 3300

CMD ["node", "index.js"]
