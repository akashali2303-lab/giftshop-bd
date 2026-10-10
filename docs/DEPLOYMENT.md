# GiftShop BD - Production Deployment Guide

## 1. Architecture Rationale
- **Operating System:** Ubuntu 22.04 LTS (or Windows Server).
- **Process Manager:** PM2 (clusters, zero-downtime reloads, and automatic boot restarts).
- **Reverse Proxy:** Nginx with SSL (Let's Encrypt).
- **Database:** SQLite (for zero-cost startup) with regular automated snapshots, seamlessly upgradable to PostgreSQL via Prisma.

## 2. Production Environment (.env.production)
```env
NODE_ENV=production
PORT=5000
APP_URL=https://giftshop.com.bd
CLIENT_URL=https://giftshop.com.bd
DATABASE_URL="file:./dev.db"
SESSION_SECRET="64_CHAR_CRYPTOGRAPHICALLY_SECURE_RANDOM_STRING_HERE"
ADMIN_DEFAULT_EMAIL=admin@giftshop.com.bd
STORAGE_DRIVER=local
LOCAL_STORAGE_PATH=./storage/uploads
MAX_FILE_SIZE_BYTES=20971520
WHATSAPP_SUPPORT_NUMBER=8801700000000
```

## 3. Deployment Steps
1. Clone repository to server.
2. Install dependencies:
   ```bash
   npm install --production
   npm --prefix server install --production
   npm --prefix client install
   ```
3. Run migrations and client generation:
   ```bash
   npx prisma generate
   npx prisma db push
   ```
4. Build frontend and backend:
   ```bash
   npm --prefix server run build
   npm --prefix client run build
   ```
5. Start backend via PM2:
   ```bash
   pm2 start server/dist/index.js --name giftshop-api
   pm2 save
   pm2 startup
   ```
6. Serve frontend static files from `client/dist` via Nginx and proxy `/api` requests to `http://127.0.0.1:5000`.
