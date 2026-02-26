FROM node:20-alpine

WORKDIR /app

# Build client
COPY client/package*.json ./client/
RUN cd client && npm install

COPY client/ ./client/
RUN cd client && npm run build

# Install server deps
COPY server/package*.json ./server/
RUN cd server && npm install

# Copy server source
COPY server/ ./server/

EXPOSE 4000

CMD ["node", "server/src/server.js"]