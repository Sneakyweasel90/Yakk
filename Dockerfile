FROM node:20-alpine
WORKDIR /app
COPY . .
RUN cd client && npm install && node scripts/copy-worklet.mjs && npm run build
RUN cd server && npm install
EXPOSE 4000
CMD ["node", "server/src/server.js"]