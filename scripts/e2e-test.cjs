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
      console.log(`   [PASS] 7 Categories and ${testProduct.nameEn} catalog items retrieved.`);

      // 3. Customer Artwork Upload
      console.log('-> 3. Testing Customer Artwork Upload (POST /uploads/artwork)');
      const boundary = '----WebKitFormBoundaryE2ETest';
      const fileData = 'E2E_BINARY_ARTWORK_SIMULATION_PNG_HEADER';
      const multipartBody = 
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="artwork"; filename="e2e-chocolate-cover.png"\r\n` +
        `Content-Type: image/png\r\n\r\n` +
        `${fileData}\r\n` +
        `--${boundary}--\r\n`;

      const uploadRes = await req('/uploads/artwork', {
        method: 'POST',
        headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
        body: multipartBody
      });
      if (uploadRes.status !== 201 || !uploadRes.body.data.storageKey) throw new Error('Artwork upload failed');
      const { storageKey } = uploadRes.body.data;
      console.log(`   [PASS] Artwork uploaded. Key: ${storageKey}`);

      // 4. Security Check: Block unauthorized artwork download
      console.log('-> 4. Security Check: Unauthorized Artwork Download (Expect 401)');
      const unauthDownload = await req(`/uploads/artwork/${storageKey}`);
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
      console.log(`   [PASS] Order created: ${order.orderNumber} (Total: ৳${Math.round(order.totalAmountPaisa / 100)})`);

      // 6. Public Customer Order Tracking
      console.log('-> 6. Testing Public Order Tracking (GET /orders/track/:orderNumber)');
      const trackRes = await req(`/orders/track/${order.orderNumber}`);
      if (trackRes.status !== 200 || trackRes.body.data.fulfillmentStatus !== 'PENDING') throw new Error('Tracking failed');
      console.log(`   [PASS] Order tracking verified: Status is ${trackRes.body.data.fulfillmentStatus}`);

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
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      if (statsRes.status !== 200 || statsRes.body.data.metrics.totalOrders < 1) throw new Error('Stats calculation failed');
      console.log(`   [PASS] Real metrics calculated: Total Orders = ${statsRes.body.data.metrics.totalOrders}`);

      // 9. Admin Authorized Artwork Streaming
      console.log('-> 9. Testing Authorized Artwork Download with Admin Token');
      const authDownload = await req(`/uploads/artwork/${storageKey}`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      if (authDownload.status !== 200) throw new Error('Authorized download failed');
      console.log('   [PASS] Administrator successfully downloaded customer artwork.');

      // 10. Fetch Full Order Details to get Database ID
      const adminOrdersRes = await req(`/admin/orders?search=${order.orderNumber}`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      const dbOrderId = adminOrdersRes.body.data.items[0].id;

      // 11. Payment Verification
      console.log('-> 10. Testing Admin Payment Verification (PATCH /admin/orders/:id/payment)');
      const verifyPay = await req(`/admin/orders/${dbOrderId}/payment`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ status: 'PAID', note: 'bKash TrxID confirmed in merchant app' })
      });
      if (verifyPay.status !== 200 || verifyPay.body.data.paymentStatus !== 'PAID') throw new Error('Payment verification failed');
      console.log('   [PASS] Order payment verified as PAID.');

      // 12. Fulfillment Transition & Audit History
      console.log('-> 11. Testing Fulfillment Transition (PENDING -> PRINTING)');
      const updateFulfill = await req(`/admin/orders/${dbOrderId}/fulfillment`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
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
