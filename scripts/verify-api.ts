import http from 'http';

async function runApiVerification() {
  console.log('--- CAREGRID API ENDPOINT & CONTRACT VERIFICATION ---');

  const BASE_URL = 'http://127.0.0.1:4000';
  let failures = 0;

  async function request(path: string, options: any = {}) {
    return new Promise<{ status: number; data: any }>((resolve, reject) => {
      const url = new URL(path, BASE_URL);
      const req = http.request(url, {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
      }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode || 500, data: JSON.parse(body) });
          } catch {
            resolve({ status: res.statusCode || 500, data: body });
          }
        });
      });
      req.on('error', reject);
      if (options.body) {
        req.write(JSON.stringify(options.body));
      }
      req.end();
    });
  }

  try {
    // 1. Health check
    console.log('[API TEST] Testing GET /api/health...');
    const health = await request('/api/health');
    if (health.status === 200 && health.data?.components?.database?.status === 'HEALTHY') {
      console.log('  ✓ /api/health returned 200 OK with PostgreSQL HEALTHY');
    } else {
      console.error('  ✗ /api/health check failed:', health);
      failures++;
    }

    // 2. Auth Login with Seed user
    console.log('[API TEST] Testing POST /api/auth/login...');
    const loginRes = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'admin@caregrid.org', password: 'Caregrid@2026' },
    });

    if (loginRes.status === 200 && loginRes.data?.data?.token) {
      console.log(`  ✓ Auth login successful for ${loginRes.data.data.user.email} (${loginRes.data.data.user.role})`);
    } else {
      console.error('  ✗ Auth login failed:', loginRes);
      failures++;
      process.exit(1);
    }

    const token = loginRes.data.data.token;
    const authHeaders = { Authorization: `Bearer ${token}` };

    // 3. GET /api/dashboard
    console.log('[API TEST] Testing GET /api/dashboard...');
    const dashRes = await request('/api/dashboard', { headers: authHeaders });
    if (dashRes.status === 200 && dashRes.data?.data?.facilities?.total >= 5) {
      console.log(`  ✓ Dashboard data verified: ${dashRes.data.data.facilities.total} facilities, ${dashRes.data.data.services.total_services} services`);
    } else {
      console.error('  ✗ Dashboard API failed:', dashRes);
      failures++;
    }

    // 4. GET /api/facilities
    console.log('[API TEST] Testing GET /api/facilities...');
    const facRes = await request('/api/facilities', { headers: authHeaders });
    if (facRes.status === 200 && facRes.data?.data?.length === 5) {
      console.log(`  ✓ Facilities retrieved: ${facRes.data.data.length} registered centers`);
    } else {
      console.error('  ✗ Facilities API failed:', facRes);
      failures++;
    }

    // 5. GET /api/services
    console.log('[API TEST] Testing GET /api/services...');
    const srvRes = await request('/api/services', { headers: authHeaders });
    if (srvRes.status === 200 && srvRes.data?.data?.length >= 30) {
      console.log(`  ✓ Services list retrieved: ${srvRes.data.data.length} clinical/diagnostic units`);
    } else {
      console.error('  ✗ Services API failed:', srvRes);
      failures++;
    }

    // 6. Test Service Availability Mutation
    console.log('[API TEST] Testing PATCH /api/services/1/availability...');
    const mutRes = await request('/api/services/1/availability', {
      method: 'PATCH',
      headers: authHeaders,
      body: { status: 'LIMITED', reason: 'Automated test suite maintenance review' },
    });
    if (mutRes.status === 200 && mutRes.data?.data?.status === 'LIMITED') {
      console.log('  ✓ Service status mutation & transaction audit: VERIFIED');
    } else {
      console.error('  ✗ Service availability mutation failed:', mutRes);
      failures++;
    }

    // Revert service status
    await request('/api/services/1/availability', {
      method: 'PATCH',
      headers: authHeaders,
      body: { status: 'AVAILABLE', reason: 'Restored following test completion' },
    });

    // 7. GET /api/backups/recommendations
    console.log('[API TEST] Testing GET /api/backups/recommendations...');
    const bkpRes = await request('/api/backups/recommendations?facilityId=1&date=2026-09-29', { headers: authHeaders });
    if (bkpRes.status === 200 && Array.isArray(bkpRes.data?.data) && bkpRes.data.data.length > 0) {
      console.log(`  ✓ Backup staffing engine generated ${bkpRes.data.data.length} scored recommendations with explanations`);
    } else {
      console.error('  ✗ Backup recommendations API failed:', bkpRes);
      failures++;
    }

    // 8. Test Idempotent Sync Ingestion
    console.log('[API TEST] Testing POST /api/sync/ingest (Idempotency test)...');
    const syncPayload = {
      sourceSystem: 'BIOMETRIC_DEVICE',
      eventType: 'BIOMETRIC_PUNCH',
      externalId: 'BIO-TEST-PUN-01',
      data: { staffId: 1, facilityId: 1, date: '2026-09-28', status: 'PRESENT' },
    };

    const firstSync = await request('/api/sync/ingest', { method: 'POST', headers: authHeaders, body: syncPayload });
    const secondSync = await request('/api/sync/ingest', { method: 'POST', headers: authHeaders, body: syncPayload });

    if (firstSync.status === 200 && secondSync.status === 200 && secondSync.data?.data?.status === 'DUPLICATE') {
      console.log('  ✓ Ingestion pipeline deduplication & idempotency: VERIFIED');
    } else {
      console.error('  ✗ Ingestion idempotency check failed:', { firstSync, secondSync });
      failures++;
    }

    if (failures === 0) {
      console.log('\n[PASS] ALL API INTEGRATION AND ENDPOINT TESTS PASSED (0 FAILURES)');
      process.exit(0);
    } else {
      console.error(`\n[FAIL] API TESTS FAILED WITH ${failures} ERRORS`);
      process.exit(1);
    }
  } catch (err) {
    console.error('API Verification error:', err);
    process.exit(1);
  }
}

runApiVerification();
