import { pool } from '../src/db/index';

async function verifyData() {
  console.log('--- CAREGRID DATA INTEGRITY VERIFICATION ---');
  let failures = 0;

  try {
    // 1. Check Tables count
    const tables = [
      'facilities', 'users', 'services', 'service_requirements', 'staff_schedules',
      'attendance', 'leave_requests', 'backup_assignments', 'service_availability',
      'alerts', 'notifications', 'audit_logs', 'sync_events', 'nearby_facilities',
      'workload_history', 'demand_predictions', 'operational_rules'
    ];

    for (const t of tables) {
      const res = await pool.query(`SELECT COUNT(*)::int as count FROM ${t}`);
      const count = res.rows[0].count;
      console.log(`[TABLE] ${t.padEnd(24)}: ${count} records`);
      if (count === 0 && t !== 'sync_events') {
        console.error(`[ERROR] Table ${t} is empty!`);
        failures++;
      }
    }

    // 2. Check Referential Integrity (Foreign keys & orphan records)
    const orphanUsers = await pool.query(`
      SELECT COUNT(*)::int as count FROM users
      WHERE facility_id IS NOT NULL AND facility_id NOT IN (SELECT id FROM facilities);
    `);
    if (orphanUsers.rows[0].count > 0) {
      console.error(`[ERROR] Found ${orphanUsers.rows[0].count} users with invalid facility_id!`);
      failures++;
    } else {
      console.log('[INTEGRITY] Users -> Facilities foreign relationship: VALID');
    }

    const orphanServices = await pool.query(`
      SELECT COUNT(*)::int as count FROM services
      WHERE facility_id NOT IN (SELECT id FROM facilities);
    `);
    if (orphanServices.rows[0].count > 0) {
      console.error(`[ERROR] Found ${orphanServices.rows[0].count} services with invalid facility_id!`);
      failures++;
    } else {
      console.log('[INTEGRITY] Services -> Facilities foreign relationship: VALID');
    }

    const orphanAttendance = await pool.query(`
      SELECT COUNT(*)::int as count FROM attendance
      WHERE staff_id NOT IN (SELECT id FROM users);
    `);
    if (orphanAttendance.rows[0].count > 0) {
      console.error(`[ERROR] Found orphan attendance records!`);
      failures++;
    } else {
      console.log('[INTEGRITY] Attendance -> Users relationship: VALID');
    }

    // 3. Attendance Uniqueness Check
    const dupAttendance = await pool.query(`
      SELECT staff_id, date, count(*) FROM attendance
      GROUP BY staff_id, date HAVING count(*) > 1;
    `);
    if (dupAttendance.rows.length > 0) {
      console.error(`[ERROR] Found duplicate attendance entries for same staff on same date!`);
      failures++;
    } else {
      console.log('[INTEGRITY] Attendance Unique (staff_id, date): VALID');
    }

    // 4. Check Audit logs exist
    const auditRes = await pool.query('SELECT COUNT(*)::int as count FROM audit_logs');
    if (auditRes.rows[0].count === 0) {
      console.error('[ERROR] Audit trail is empty!');
      failures++;
    } else {
      console.log(`[INTEGRITY] Audit Logs recorded: ${auditRes.rows[0].count} events`);
    }

    if (failures === 0) {
      console.log('\n[PASS] ALL DATA INTEGRITY VERIFICATIONS PASSED (0 FAILURES)');
      process.exit(0);
    } else {
      console.error(`\n[FAIL] VERIFICATION FAILED WITH ${failures} ERRORS`);
      process.exit(1);
    }
  } catch (err) {
    console.error('Data verification query failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

verifyData();
