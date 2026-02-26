#!/bin/bash
set -e

# Build the React frontend
cd /app/client
npm install
npm run build

# Start the server
cd /app/server
npm install
node src/server.js