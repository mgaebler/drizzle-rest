#!/bin/bash

# Drizzle REST Adapter Demo - Quick Start Script

echo "🚀 Starting Drizzle REST Adapter Demo..."
echo

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}📦 Installing dependencies...${NC}"
npm install

echo -e "${BLUE}️ Generating database schema...${NC}"
npm run db:generate

echo -e "${BLUE}🏗️  Building frontend...${NC}"
npm run build

echo -e "${GREEN}✅ Setup complete!${NC}"
echo
echo -e "${YELLOW}🌐 Starting the server...${NC}"
echo "The API will be available at: http://localhost:3000"
echo "Documentation: http://localhost:3000/api/v1/openapi.json"
echo "Health check: http://localhost:3000/health"
echo
echo "Press Ctrl+C to stop the server"
echo

npm run backend:dev
