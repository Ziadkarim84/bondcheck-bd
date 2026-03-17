FROM node:20-slim

# Install Chromium (for Puppeteer) and Tesseract OCR with Bengali support
RUN apt-get update && apt-get install -y \
    chromium \
    tesseract-ocr \
    tesseract-ocr-ben \
    tesseract-ocr-eng \
    libtesseract-dev \
    fonts-noto \
    fonts-noto-cjk \
    wget \
    ca-certificates \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Tell Tesseract.js and Puppeteer where binaries are
ENV TESSERACT_PATH=/usr/bin/tesseract
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY prisma ./prisma
RUN npx prisma generate

COPY dist ./dist

EXPOSE 3000
CMD ["node", "dist/server.js"]
