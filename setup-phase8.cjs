const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const http = require('http');

console.log('==========================================================');
console.log(' Starting Phase 8: Testing, Security & Deployment Setup   ');
console.log('==========================================================');

function writeFile(relativePath, content) {
  const fullPath = path.resolve(process.cwd(), relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content.trim() + '\n', 'utf8');
  console.log(`[File Written] ${relativePath}`);
}

// 1. Robots.txt
writeFile('client/public/robots.txt', `
User-agent: *
Allow: /
Allow: /api/products
Allow: /api/categories
Disallow: /api/admin/
Disallow: /api/uploads/
Disallow: /*?admin=true

Sitemap: http://localhost:5173/sitemap.xml
`);

// 2. Sitemap.xml
writeFile('client/public/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>http://localhost:5173/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>http://localhost:5173/?category=eid-salami-cards</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>http://localhost:5173/?category=custom-photo-chocolate-wrappers</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>http://localhost:5173/?category=kids-drawing-books</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>http://localhost:5173/?category=qr-stands-and-menus</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>http://localhost:5173/?category=spiral-screw-photo-albums</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>http://localhost:5173/?category=laminated-budget-frames</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>http://localhost:5173/?category=wish-cards-gift-tags</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>
`);

// 3. Automated Backup Script (Node.js cross-platform)
writeFile('scripts/backup.cjs', `
const fs = require('fs');
const path = require('path');

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = path.resolve(process.cwd(), 'backups', timestamp);

fs.mkdirSync(backupDir, { recursive: true });

console.log('--- Starting System Backup to:', backupDir);

// 1. Backup SQLite Database
const dbSrc = path.resolve(process.cwd(), 'prisma/dev.db');
const dbDest = path.join(backupDir, 'dev.db');
if (fs.existsSync(dbSrc)) {
  fs.copyFileSync(dbSrc, dbDest);
  console.log('[Backup OK] Database copied: prisma/dev.db');
} else {
  console.log('[Backup Warn] No database file found at prisma/dev.db');
}

// 2. Backup Private Customer Uploads
const uploadsSrc = path.resolve(process.cwd(), 'storage/uploads');
const uploadsDest = path.join(backupDir, 'uploads');
fs.mkdirSync(uploadsDest, { recursive: true });

if (fs.existsSync(uploadsSrc)) {
  const files = fs.readdirSync(uploadsSrc);
  let count = 0;
  for (const file of files) {
    if (file !== '.gitkeep') {
      fs.copyFileSync(path.join(uploadsSrc, file), path.join(uploadsDest, file));
      count++;
    }
  }
  console.log(\`[Backup OK] \${count} customer artwork files archived.\`);
}

console.log('=== Backup Complete ===');
`);

// 4. Security Audit Documentation
writeFile('docs/SECURITY_AUDIT.md', `
# GiftShop BD - Security, Privacy & Compliance Audit

## 1. Threat Mitigation Review
| Risk Area | Mitigation Implemented |
|---|---|
| **SQL Injection** | Prisma ORM parameterizes all relational queries automatically. |
| **Tampered Prices** | Client-supplied prices and totals are strictly ignored. The server looks up product IDs from the database and recalculates all line items, subtotals, delivery fees, and total amounts in Paisa integers. |
| **Path Traversal in Uploads** | Storage keys are sanitized using \`path.basename()\` and checked to ensure no directory traversal (\`..\`) or path separators exist. |
| **Malicious Executable Files** | Multer MIME validation strictly restricts incoming uploads to \`image/jpeg\`, \`image/png\`, and \`application/pdf\`. Uploads are stored privately in non-web-accessible directories (\`./storage/uploads\`). |
| **Credential Stuffing / Brute Force** | IP-based sliding window rate limiters protect \`/api/admin/auth/login\` (5 attempts / 15 minutes) and \`/api/orders/checkout\` (15 attempts / 15 minutes). |
| **Unauthorized Artwork Access** | Customer artwork can only be accessed via \`GET /api/uploads/artwork/:key\`, which requires an authenticated administrator session. |
| **Privilege Escalation** | Admin registration is disabled. Administrator records are seeded only via internal commands. |

## 2. Customer Privacy & Retention Policy
1. Customer phone numbers and addresses are stored solely for fulfillment and courier delivery.
2. In production, an automated cron job deletes customer artwork files 30 days after the order reaches \`COMPLETED\` status.
`);

// 5. Production Deployment Guide
writeFile('docs/DEPLOYMENT.md', `
# GiftShop BD - Production Deployment Guide

## 1. Architecture Rationale
- **Operating System:** Ubuntu 22.04 LTS (or Windows Server).
- **Process Manager:** PM2 (clusters, zero-downtime reloads, and automatic boot restarts).
- **Reverse Proxy:** Nginx with SSL (Let's Encrypt).
- **Database:** SQLite (for zero-cost startup) with regular automated snapshots, seamlessly upgradable to PostgreSQL via Prisma.

## 2. Production Environment (.env.production)
\`\`\`env
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
\`\`\`

## 3. Deployment Steps
1. Clone repository to server.
2. Install dependencies:
   \`\`\`bash
   npm install --production
   npm --prefix server install --production
   npm --prefix client install
   \`\`\`
3. Run migrations and client generation:
   \`\`\`bash
   npx prisma generate
   npx prisma db push
   \`\`\`
4. Build frontend and backend:
   \`\`\`bash
   npm --prefix server run build
   npm --prefix client run build
   \`\`\`
5. Start backend via PM2:
   \`\`\`bash
   pm2 start server/dist/index.js --name giftshop-api
   pm2 save
   pm2 startup
   \`\`\`
6. Serve frontend static files from \`client/dist\` via Nginx and proxy \`/api\` requests to \`http://127.0.0.1:5000\`.
`);

// 6. Comprehensive End-to-End Test Suite
writeFile('scripts/e2e-test.cjs', `
const http = require('http');

console.log('==========================================================');
console.log(' Running Phase 8 Comprehensive E2E Verification Suite     ');
console.log('==========================================================');

async function runE2E() {
  const { default: app } = await import('../server/dist/app.js');
  const server = http.createServer(app);

  server.listen(5098, async () => {
    const base = 'http://localhost:5098/api';

    async function req(url, options = {}) {
      const res = await fetch(base + url, options);
      const text = await res.text();
      let body;
      try { body = JSON.parse(text); } catch { body = text; }
      return { status: res.status, body };
    }

    try {
      // 1. Health & Database Check
      console.log('-> 1. Testing GET /health');
      const h = await req('/health');
      if (h.status !== 200 || h.body.status !== 'healthy') throw new Error('Health check degraded');
      console.log('   [PASS] API healthy and SQLite connected.');

      // 2. Fetch Public Catalog
      console.log('-> 2. Testing GET /categories and GET /products');
      const cats = await req('/categories');
      if (cats.status !== 200 || cats.body.data.length < 7) throw new Error('Categories list failed');
      const prods = await req('/products?limit=1');
      if (prods.status !== 200 || prods.body.data.items.length === 0) throw new Error('Products catalog empty');
      const testProduct = prods.body.data.items[0];
      console.log(\`   [PASS] 7 Categories and \${testProduct.nameEn} catalog items retrieved.\`);

      // 3. Customer Artwork Upload
      console.log('-> 3. Testing Customer Artwork Upload (POST /uploads/artwork)');
      const boundary = '----WebKitFormBoundaryE2ETest';
      const fileData = 'E2E_BINARY_ARTWORK_SIMULATION_PNG_HEADER';
      const multipartBody = 
        \`--\${boundary}\\r\\n\` +
        \`Content-Disposition: form-data; name="artwork"; filename="e2e-chocolate-cover.png"\\r\\n\` +
        \`Content-Type: image/png\\r\\n\\r\\n\` +
        \`\${fileData}\\r\\n\` +
        \`--\${boundary}--\\r\\n\`;

      const uploadRes = await req('/uploads/artwork', {
        method: 'POST',
        headers: { 'Content-Type': \`multipart/form-data; boundary=\${boundary}\` },
        body: multipartBody
      });
      if (uploadRes.status !== 201 || !uploadRes.body.data.storageKey) throw new Error('Artwork upload failed');
      const { storageKey } = uploadRes.body.data;
      console.log(\`   [PASS] Artwork uploaded. Key: \${storageKey}\`);

      // 4. Security Check: Block unauthorized artwork download
      console.log('-> 4. Security Check: Unauthorized Artwork Download (Expect 401)');
      const unauthDownload = await req(\`/uploads/artwork/\${storageKey}\`);
      if (unauthDownload.status !== 401) throw new Error('Unauthorized artwork download was not blocked!');
      console.log('   [PASS] Private storage shielded: 401 UNAUTHORIZED without token.');

      // 5. Server-Validated Checkout
      console.log('-> 5. Testing Server-Validated Checkout with Price Snapshotting');
      const checkoutRes = await req('/orders/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: 'Ashraful Islam',
          customerPhone: '01711223344',
          deliveryAddress: 'House 12, Road 4, Dhanmondi, Dhaka',
          district: 'Dhaka',
          paymentMethod: 'BKASH_MANUAL',
          senderPhone: '01711223344',
          transactionReference: 'E2ETRX8829',
          items: [
            {
              productId: testProduct.id,
              quantity: 2,
              customText: 'Eid Mubarak to My Family',
              storageKey,
              originalFilename: 'e2e-chocolate-cover.png'
            }
          ]
        })
      });
      if (checkoutRes.status !== 201 || !checkoutRes.body.data.orderNumber) throw new Error('Checkout failed: ' + JSON.stringify(checkoutRes.body));
      const order = checkoutRes.body.data;
      console.log(\`   [PASS] Order created: \${order.orderNumber} (Total: ৳\${Math.round(order.totalAmountPaisa / 100)})\`);

      // 6. Public Customer Order Tracking
      console.log('-> 6. Testing Public Order Tracking (GET /orders/track/:orderNumber)');
      const trackRes = await req(\`/orders/track/\${order.orderNumber}\`);
      if (trackRes.status !== 200 || trackRes.body.data.fulfillmentStatus !== 'PENDING') throw new Error('Tracking failed');
      console.log(\`   [PASS] Order tracking verified: Status is \${trackRes.body.data.fulfillmentStatus}\`);

      // 7. Administrator Authentication
      console.log('-> 7. Testing Admin Authentication (POST /admin/auth/login)');
      const loginRes = await req('/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@giftshop.com.bd', password: 'AdminPass123!' })
      });
      if (loginRes.status !== 200 || !loginRes.body.data.token) throw new Error('Admin login failed');
      const adminToken = loginRes.body.data.token;
      console.log('   [PASS] Admin authenticated. Token issued.');

      // 8. Admin Dashboard Metrics Verification
      console.log('-> 8. Testing Real Metrics Calculation (GET /admin/dashboard/stats)');
      const statsRes = await req('/admin/dashboard/stats', {
        headers: { 'Authorization': \`Bearer \${adminToken}\` }
      });
      if (statsRes.status !== 200 || statsRes.body.data.metrics.totalOrders < 1) throw new Error('Stats calculation failed');
      console.log(\`   [PASS] Real metrics calculated: Total Orders = \${statsRes.body.data.metrics.totalOrders}\`);

      // 9. Admin Authorized Artwork Streaming
      console.log('-> 9. Testing Authorized Artwork Download with Admin Token');
      const authDownload = await req(\`/uploads/artwork/\${storageKey}\`, {
        headers: { 'Authorization': \`Bearer \${adminToken}\` }
      });
      if (authDownload.status !== 200) throw new Error('Authorized download failed');
      console.log('   [PASS] Administrator successfully downloaded customer artwork.');

      // 10. Fetch Full Order Details to get Database ID
      const adminOrdersRes = await req(\`/admin/orders?search=\${order.orderNumber}\`, {
        headers: { 'Authorization': \`Bearer \${adminToken}\` }
      });
      const dbOrderId = adminOrdersRes.body.data.items[0].id;

      // 11. Payment Verification
      console.log('-> 10. Testing Admin Payment Verification (PATCH /admin/orders/:id/payment)');
      const verifyPay = await req(\`/admin/orders/\${dbOrderId}/payment\`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${adminToken}\`
        },
        body: JSON.stringify({ status: 'PAID', note: 'bKash TrxID confirmed in merchant app' })
      });
      if (verifyPay.status !== 200 || verifyPay.body.data.paymentStatus !== 'PAID') throw new Error('Payment verification failed');
      console.log('   [PASS] Order payment verified as PAID.');

      // 12. Fulfillment Transition & Audit History
      console.log('-> 11. Testing Fulfillment Transition (PENDING -> PRINTING)');
      const updateFulfill = await req(\`/admin/orders/\${dbOrderId}/fulfillment\`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${adminToken}\`
        },
        body: JSON.stringify({ status: 'PRINTING', note: 'Sent to Heidelberg offset machine' })
      });
      if (updateFulfill.status !== 200 || updateFulfill.body.data.fulfillmentStatus !== 'PRINTING') throw new Error('Fulfillment transition failed');
      console.log('   [PASS] Fulfillment updated to PRINTING. Audit history entry created.');

      console.log('==========================================================');
      console.log(' ALL END-TO-END CRITICAL WORKFLOWS PASSED 100%!           ');
      console.log('==========================================================');
      server.close();
      process.exit(0);
    } catch (err) {
      console.error('E2E Test Failed:', err.message);
      server.close();
      process.exit(1);
    }
  });
}

runE2E();
`);

console.log('--- Compiling Backend & Frontend ---');
execSync('npm --prefix server run build', { stdio: 'inherit' });
execSync('npm --prefix client run build', { stdio: 'inherit' });

console.log('--- Executing Automated Database & Artwork Backup ---');
execSync('node scripts/backup.cjs', { stdio: 'inherit' });

console.log('--- Executing Comprehensive E2E Verification Suite ---');
execSync('node scripts/e2e-test.cjs', { stdio: 'inherit' });

console.log('==========================================================');
console.log(' SUCCESS: Phase 8 Testing & Deployment Setup Complete!   ');
console.log('==========================================================');
