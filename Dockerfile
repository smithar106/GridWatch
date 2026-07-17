FROM node:18-alpine

WORKDIR /app

COPY backend/package*.json ./backend/
RUN cd backend && npm ci --omit=dev

COPY backend/ ./backend/
COPY app/ ./app/

EXPOSE ${PORT:-8787}

ENV NODE_ENV=production

CMD ["node", "backend/src/server.js"]
