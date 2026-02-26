FROM node:20-alpine

WORKDIR /app

# Copy everything first
COPY . .

# Build client
RUN cd client && npm install && npm run build

# Install server deps
RUN cd server && npm install

EXPOSE 4000

CMD ["node", "server/src/server.js"]