import bcrypt from 'bcryptjs';
import { db, pool } from './index';
import * as schema from './schema';
import { sql } from 'drizzle-orm';

export async function seedDatabase() {
  console.log('[CAREGRID Seed] Initializing deterministic production seed...');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Seed Operational Rules (Thresholds)
    console.log('[CAREGRID Seed] Seeding operational rules...');
    const defaultRules = [
      { ruleKey: 'MIN_STAFF_PER_FACILITY', ruleName: 'Minimum Staff Required per Facility', thresholdValue: '4.00', unit: 'staff members', description: 'Threshold below which a facility triggers a critical understaffing alert' },
      { ruleKey: 'ABSENTEEISM_CRITICAL_THRESHOLD', ruleName: 'Critical Absenteeism Rate', thresholdValue: '25.00', unit: 'percent', description: 'Daily absenteeism percentage triggering immediate district escalation' },
      { ruleKey: 'WORKLOAD_HIGH_THRESHOLD', ruleName: 'High Workload Utilization', thresholdValue: '85.00', unit: 'percent', description: 'Bed or patient capacity utilization triggering staff reallocation' },
      { ruleKey: 'UNRESOLVED_ALERT_ESCALATION_HOURS', ruleName: 'Alert Escalation Window', thresholdValue: '4.00', unit: 'hours', description: 'Time before an unacknowledged critical alert auto-escalates to District Admin' },
      { ruleKey: 'DEMAND_SURGE_THRESHOLD', ruleName: 'Surge Anomaly Factor', thresholdValue: '35.00', unit: 'percent', description: 'Volume increase over 30-day baseline flagged as operational surge' },
    ];

    for (const rule of defaultRules) {
      await client.query(`
        INSERT INTO operational_rules (rule_key, rule_name, threshold_value, unit, description, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        ON CONFLICT (rule_key) DO UPDATE
        SET rule_name = EXCLUDED.rule_name,
            threshold_value = EXCLUDED.threshold_value,
            unit = EXCLUDED.unit,
            description = EXCLUDED.description,
            updated_at = NOW();
      `, [rule.ruleKey, rule.ruleName, rule.thresholdValue, rule.unit, rule.description]);
    }

    // 2. Seed 5 Primary & Community Health Facilities
    console.log('[CAREGRID Seed] Seeding facilities...');
    const facilityData = [
      { code: 'FAC-MH-PUN-001', name: 'Aundh District Hospital', type: 'DISTRICT_HOSPITAL', district: 'Pune', address: 'Sangvi-Aundh Road, Pune', lat: '18.572800', lon: '73.805200', phone: '+91 20 2728 0100', status: 'OPERATIONAL', hours: '24/7', beds: 150 },
      { code: 'FAC-MH-PUN-002', name: 'Shirur Community Health Center', type: 'CHC', district: 'Pune', address: 'Nagar Road, Shirur Rural', lat: '18.825600', lon: '74.375200', phone: '+91 2137 222100', status: 'OPERATIONAL', hours: '24/7', beds: 50 },
      { code: 'FAC-MH-PUN-003', name: 'Baramati Rural Health Center', type: 'CHC', district: 'Pune', address: 'MIDC Road, Baramati Sub-district', lat: '18.151700', lon: '74.577100', phone: '+91 2112 243400', status: 'OPERATIONAL', hours: '24/7', beds: 60 },
      { code: 'FAC-MH-PUN-004', name: 'Bhor Primary Health Center', type: 'PHC', district: 'Pune', address: 'Mahad Road, Bhor Tehsil', lat: '18.159400', lon: '73.847500', phone: '+91 2113 222200', status: 'OPERATIONAL', hours: '08:00 - 20:00', beds: 20 },
      { code: 'FAC-MH-PUN-005', name: 'Junnar Primary Health Center', type: 'PHC', district: 'Pune', address: 'Fort Road, Junnar Tribal Belt', lat: '19.208100', lon: '73.876400', phone: '+91 2132 242100', status: 'LIMITED', hours: '08:00 - 20:00', beds: 25 },
    ];

    const facilityIds: Record<string, number> = {};
    for (const f of facilityData) {
      const res = await client.query(`
        INSERT INTO facilities (facility_code, name, facility_type, district, state, address, latitude, longitude, contact_phone, status, operating_hours, total_beds, updated_at)
        VALUES ($1, $2, $3, $4, 'Maharashtra', $5, $6, $7, $8, $9, $10, $11, NOW())
        ON CONFLICT (facility_code) DO UPDATE
        SET name = EXCLUDED.name,
            facility_type = EXCLUDED.facility_type,
            district = EXCLUDED.district,
            address = EXCLUDED.address,
            latitude = EXCLUDED.latitude,
            longitude = EXCLUDED.longitude,
            contact_phone = EXCLUDED.contact_phone,
            status = EXCLUDED.status,
            operating_hours = EXCLUDED.operating_hours,
            total_beds = EXCLUDED.total_beds,
            updated_at = NOW()
        RETURNING id;
      `, [f.code, f.name, f.type, f.district, f.address, f.lat, f.lon, f.phone, f.status, f.hours, f.beds]);
      facilityIds[f.code] = res.rows[0].id;
    }

    // Nearby facilities distances
    const distData = [
      [facilityIds['FAC-MH-PUN-001'], facilityIds['FAC-MH-PUN-004'], 48.5, 65],
      [facilityIds['FAC-MH-PUN-001'], facilityIds['FAC-MH-PUN-002'], 62.0, 80],
      [facilityIds['FAC-MH-PUN-002'], facilityIds['FAC-MH-PUN-005'], 78.4, 95],
      [facilityIds['FAC-MH-PUN-004'], facilityIds['FAC-MH-PUN-003'], 82.1, 105],
    ];
    for (const [f1, f2, km, min] of distData) {
      if (f1 && f2) {
        await client.query(`
          INSERT INTO nearby_facilities (facility_id, nearby_facility_id, distance_km, travel_time_minutes)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT DO NOTHING;
        `, [f1, f2, km, min]);
      }
    }

    // 3. Seed Users (27 real staff with deterministic passwords)
    console.log('[CAREGRID Seed] Seeding users with hashed credentials...');
    const defaultPasswordHash = await bcrypt.hash('Caregrid@2026', 10);

    const usersData = [
      // Super Admin
      { empId: 'CG-ADMIN-001', name: 'Dr. Harshvardhan Patil', email: 'admin@caregrid.org', phone: '+91 98220 11001', role: 'SUPER_ADMIN', facId: null, spec: 'Health Administration & Epidemiology', lang: 'en' },
      // District Admin
      { empId: 'CG-DIST-001', name: 'Sanjay Deshmukh', email: 'district.pune@caregrid.org', phone: '+91 98220 11002', role: 'DISTRICT_ADMIN', facId: facilityIds['FAC-MH-PUN-001'], spec: 'Public Health Management', lang: 'mr' },
      // Facility Admins
      { empId: 'CG-FADM-001', name: 'Dr. Ananya Joshi', email: 'aundh.admin@caregrid.org', phone: '+91 98220 11003', role: 'FACILITY_ADMIN', facId: facilityIds['FAC-MH-PUN-001'], spec: 'Hospital Administration', lang: 'en' },
      { empId: 'CG-FADM-002', name: 'Dr. Rajesh Kadam', email: 'shirur.admin@caregrid.org', phone: '+91 98220 11004', role: 'FACILITY_ADMIN', facId: facilityIds['FAC-MH-PUN-002'], spec: 'General Medicine', lang: 'mr' },
      { empId: 'CG-FADM-003', name: 'Dr. Smita Shinde', email: 'baramati.admin@caregrid.org', phone: '+91 98220 11005', role: 'FACILITY_ADMIN', facId: facilityIds['FAC-MH-PUN-003'], spec: 'Pediatrics', lang: 'hi' },
      // Medical Officers
      { empId: 'CG-MO-001', name: 'Dr. Vikram Gaikwad', email: 'mo.aundh1@caregrid.org', phone: '+91 98220 11006', role: 'MEDICAL_OFFICER', facId: facilityIds['FAC-MH-PUN-001'], spec: 'Emergency Medicine', lang: 'en' },
      { empId: 'CG-MO-002', name: 'Dr. Snehal More', email: 'mo.aundh2@caregrid.org', phone: '+91 98220 11007', role: 'MEDICAL_OFFICER', facId: facilityIds['FAC-MH-PUN-001'], spec: 'Obstetrics & Gynecology', lang: 'mr' },
      { empId: 'CG-MO-003', name: 'Dr. Nitin Thorat', email: 'mo.shirur@caregrid.org', phone: '+91 98220 11008', role: 'MEDICAL_OFFICER', facId: facilityIds['FAC-MH-PUN-002'], spec: 'General Surgery', lang: 'mr' },
      { empId: 'CG-MO-004', name: 'Dr. Kavita Pawar', email: 'mo.bhor@caregrid.org', phone: '+91 98220 11009', role: 'MEDICAL_OFFICER', facId: facilityIds['FAC-MH-PUN-004'], spec: 'General Medicine', lang: 'hi' },
      { empId: 'CG-MO-005', name: 'Dr. Pravin Jagtap', email: 'mo.junnar@caregrid.org', phone: '+91 98220 11010', role: 'MEDICAL_OFFICER', facId: facilityIds['FAC-MH-PUN-005'], spec: 'Community Medicine', lang: 'mr' },
      // Staff Nurses & Technicians
      { empId: 'CG-STF-001', name: 'Pooja Kale (Staff Nurse)', email: 'nurse.pooja@caregrid.org', phone: '+91 98220 11011', role: 'STAFF', facId: facilityIds['FAC-MH-PUN-001'], spec: 'ICU & Emergency Nursing', lang: 'mr' },
      { empId: 'CG-STF-002', name: 'Aarti Sawant (Staff Nurse)', email: 'nurse.aarti@caregrid.org', phone: '+91 98220 11012', role: 'STAFF', facId: facilityIds['FAC-MH-PUN-001'], spec: 'Maternity Care', lang: 'mr' },
      { empId: 'CG-STF-003', name: 'Mahesh Jadhav (Pharmacist)', email: 'pharm.mahesh@caregrid.org', phone: '+91 98220 11013', role: 'STAFF', facId: facilityIds['FAC-MH-PUN-001'], spec: 'Clinical Pharmacy', lang: 'en' },
      { empId: 'CG-STF-004', name: 'Sunil Bhosale (Lab Tech)', email: 'lab.sunil@caregrid.org', phone: '+91 98220 11014', role: 'STAFF', facId: facilityIds['FAC-MH-PUN-001'], spec: 'Pathology & Biochemistry', lang: 'en' },
      { empId: 'CG-STF-005', name: 'Manisha Gholap (Nurse)', email: 'nurse.manisha@caregrid.org', phone: '+91 98220 11015', role: 'STAFF', facId: facilityIds['FAC-MH-PUN-002'], spec: 'General Nursing', lang: 'mr' },
      { empId: 'CG-STF-006', name: 'Kishor Waghmare (Lab Tech)', email: 'lab.kishor@caregrid.org', phone: '+91 98220 11016', role: 'STAFF', facId: facilityIds['FAC-MH-PUN-002'], spec: 'Diagnostic Laboratory', lang: 'mr' },
      { empId: 'CG-STF-007', name: 'Rani Kute (ANM Nurse)', email: 'anm.rani@caregrid.org', phone: '+91 98220 11017', role: 'STAFF', facId: facilityIds['FAC-MH-PUN-002'], spec: 'Immunization & Maternal Health', lang: 'mr' },
      { empId: 'CG-STF-008', name: 'Suresh Salunkhe (Pharmacist)', email: 'pharm.suresh@caregrid.org', phone: '+91 98220 11018', role: 'STAFF', facId: facilityIds['FAC-MH-PUN-003'], spec: 'Pharmacy', lang: 'hi' },
      { empId: 'CG-STF-009', name: 'Archana Mane (Staff Nurse)', email: 'nurse.archana@caregrid.org', phone: '+91 98220 11019', role: 'STAFF', facId: facilityIds['FAC-MH-PUN-003'], spec: 'Critical Care', lang: 'mr' },
      { empId: 'CG-STF-010', name: 'Ganesh Shinde (Lab Tech)', email: 'lab.ganesh@caregrid.org', phone: '+91 98220 11020', role: 'STAFF', facId: facilityIds['FAC-MH-PUN-003'], spec: 'Laboratory Tests', lang: 'mr' },
      { empId: 'CG-STF-011', name: 'Swati Chavan (ANM Nurse)', email: 'anm.swati@caregrid.org', phone: '+91 98220 11021', role: 'STAFF', facId: facilityIds['FAC-MH-PUN-004'], spec: 'Community Nursing', lang: 'mr' },
      { empId: 'CG-STF-012', name: 'Santosh Kamble (Pharmacist)', email: 'pharm.santosh@caregrid.org', phone: '+91 98220 11022', role: 'STAFF', facId: facilityIds['FAC-MH-PUN-004'], spec: 'Dispensing & Cold Chain', lang: 'hi' },
      { empId: 'CG-STF-013', name: 'Usha Nalawade (Staff Nurse)', email: 'nurse.usha@caregrid.org', phone: '+91 98220 11023', role: 'STAFF', facId: facilityIds['FAC-MH-PUN-004'], spec: 'General Nursing', lang: 'mr' },
      { empId: 'CG-STF-014', name: 'Deepak Shelke (Lab Assistant)', email: 'lab.deepak@caregrid.org', phone: '+91 98220 11024', role: 'STAFF', facId: facilityIds['FAC-MH-PUN-005'], spec: 'Basic Diagnostics', lang: 'mr' },
      { empId: 'CG-STF-015', name: 'Sarita Bhagat (ANM Nurse)', email: 'anm.sarita@caregrid.org', phone: '+91 98220 11025', role: 'STAFF', facId: facilityIds['FAC-MH-PUN-005'], spec: 'Tribal Health & Vaccination', lang: 'mr' },
      // Viewer
      { empId: 'CG-VIEW-001', name: 'Rohit Verma (Health Inspector)', email: 'viewer@caregrid.org', phone: '+91 98220 11026', role: 'VIEWER', facId: null, spec: 'State Oversight Auditor', lang: 'en' },
    ];

    const userIds: Record<string, number> = {};
    for (const u of usersData) {
      const res = await client.query(`
        INSERT INTO users (employee_id, name, email, phone, password_hash, role, facility_id, status, preferred_language, timezone, specialization, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'ACTIVE', $8, 'Asia/Kolkata', $9, NOW())
        ON CONFLICT (email) DO UPDATE
        SET name = EXCLUDED.name,
            phone = EXCLUDED.phone,
            password_hash = EXCLUDED.password_hash,
            role = EXCLUDED.role,
            facility_id = EXCLUDED.facility_id,
            status = 'ACTIVE',
            preferred_language = EXCLUDED.preferred_language,
            specialization = EXCLUDED.specialization,
            updated_at = NOW()
        RETURNING id;
      `, [u.empId, u.name, u.email, u.phone, defaultPasswordHash, u.role, u.facId, u.lang, u.spec]);
      userIds[u.empId] = res.rows[0].id;
    }

    // 4. Seed Services & Staffing Requirements across all 5 facilities
    console.log('[CAREGRID Seed] Seeding services & requirements...');
    const serviceTemplates = [
      { name: 'Emergency & Trauma Care', category: 'CLINICAL', status: 'AVAILABLE', cap: 80, load: 45, hours: '24/7', reqStaff: 3, minStaff: 2, spec: 'Emergency Medicine', prio: 'CRITICAL' },
      { name: 'Outpatient Department (OPD)', category: 'CLINICAL', status: 'AVAILABLE', cap: 150, load: 110, hours: '08:00 - 16:00', reqStaff: 4, minStaff: 2, spec: 'General Medicine', prio: 'HIGH' },
      { name: 'Maternal & Child Health', category: 'CLINICAL', status: 'AVAILABLE', cap: 50, load: 38, hours: '24/7', reqStaff: 3, minStaff: 2, spec: 'Obstetrics & Gynecology', prio: 'HIGH' },
      { name: 'Diagnostic Laboratory', category: 'DIAGNOSTIC', status: 'AVAILABLE', cap: 100, load: 72, hours: '08:00 - 20:00', reqStaff: 2, minStaff: 1, spec: 'Pathology & Biochemistry', prio: 'MEDIUM' },
      { name: 'Pharmacy & Cold Chain', category: 'SUPPORT', status: 'AVAILABLE', cap: 200, load: 140, hours: '24/7', reqStaff: 2, minStaff: 1, spec: 'Clinical Pharmacy', prio: 'HIGH' },
      { name: 'Universal Immunization', category: 'PREVENTIVE', status: 'AVAILABLE', cap: 60, load: 25, hours: '09:00 - 15:00', reqStaff: 2, minStaff: 1, spec: 'Immunization & Maternal Health', prio: 'MEDIUM' },
    ];

    const serviceIds: number[] = [];
    for (const [facCode, fId] of Object.entries(facilityIds)) {
      for (let sIdx = 0; sIdx < serviceTemplates.length; sIdx++) {
        const s = serviceTemplates[sIdx];
        // For facility 5 (Junnar), set Diagnostic Laboratory to LIMITED to reflect realistic scenario
        const serviceStatus = (facCode === 'FAC-MH-PUN-005' && s.name === 'Diagnostic Laboratory') ? 'LIMITED' : s.status;
        const currentLoad = (facCode === 'FAC-MH-PUN-001') ? s.load + 15 : s.load;

        const res = await client.query(`
          INSERT INTO services (facility_id, name, category, status, capacity, current_load, operating_hours, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
          RETURNING id;
        `, [fId, s.name, s.category, serviceStatus, s.cap, currentLoad, s.hours]);
        
        const serviceId = res.rows[0].id;
        serviceIds.push(serviceId);

        // Service Requirement
        await client.query(`
          INSERT INTO service_requirements (service_id, required_staff, minimum_staff, maximum_capacity, required_specialization, priority, effective_from)
          VALUES ($1, $2, $3, $4, $5, $6, NOW());
        `, [serviceId, s.reqStaff, s.minStaff, s.cap, s.spec, s.prio]);

        // Service Availability History
        await client.query(`
          INSERT INTO service_availability (facility_id, service_id, status, reason, effective_from, updated_at)
          VALUES ($1, $2, $3, $4, NOW(), NOW());
        `, [fId, serviceId, serviceStatus, serviceStatus === 'LIMITED' ? 'Staff shortage during night shift' : 'Normal Operations']);
      }
    }

    // 5. Seed Staff Schedules (Deterministic dates for current month)
    console.log('[CAREGRID Seed] Seeding staff schedules...');
    const staffUserIds = Object.entries(userIds)
      .filter(([empId]) => empId.startsWith('CG-STF') || empId.startsWith('CG-MO'))
      .map(([_, id]) => id);

    const shiftTypes = ['MORNING', 'EVENING', 'NIGHT', 'ROTATING'];
    const shiftTimes: Record<string, [string, string]> = {
      MORNING: ['08:00', '16:00'],
      EVENING: ['16:00', '23:00'],
      NIGHT: ['23:00', '08:00'],
      ROTATING: ['09:00', '17:00'],
    };

    // Current date window: 2026-09-20 to 2026-09-30
    const dates = [
      '2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25',
      '2026-09-26', '2026-09-27', '2026-09-28', '2026-09-29', '2026-09-30'
    ];

    let scheduleCount = 0;
    for (const sId of staffUserIds) {
      // Find facility of staff
      const userRes = await client.query('SELECT facility_id FROM users WHERE id = $1', [sId]);
      const facId = userRes.rows[0]?.facility_id || facilityIds['FAC-MH-PUN-001'];

      for (let dIdx = 0; dIdx < dates.length; dIdx++) {
        const d = dates[dIdx];
        const sType = shiftTypes[(sId + dIdx) % shiftTypes.length];
        const [sStart, sEnd] = shiftTimes[sType];

        await client.query(`
          INSERT INTO staff_schedules (staff_id, facility_id, shift_date, shift_start, shift_end, shift_type, status, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, 'SCHEDULED', NOW());
        `, [sId, facId, d, sStart, sEnd, sType]);
        scheduleCount++;
      }
    }
    console.log(`[CAREGRID Seed] Created ${scheduleCount} staff schedule records.`);

    // 6. Seed Attendance Records (Past dates)
    console.log('[CAREGRID Seed] Seeding attendance records...');
    const attendanceDates = ['2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25', '2026-09-26', '2026-09-27', '2026-09-28'];
    let attendanceCount = 0;

    for (const sId of staffUserIds) {
      const userRes = await client.query('SELECT facility_id FROM users WHERE id = $1', [sId]);
      const facId = userRes.rows[0]?.facility_id || facilityIds['FAC-MH-PUN-001'];

      for (let i = 0; i < attendanceDates.length; i++) {
        const dateStr = attendanceDates[i];
        let status = 'PRESENT';
        let checkIn = '08:05:00';
        let checkOut = '16:02:00';
        let remarks = 'Biometric punch verified';

        // Deterministic variation
        if ((sId + i) % 11 === 0) {
          status = 'LATE';
          checkIn = '08:42:00';
          remarks = 'Transit delay due to rural road repair';
        } else if ((sId + i) % 17 === 0) {
          status = 'ABSENT';
          checkIn = null as any;
          checkOut = null as any;
          remarks = 'Unexcused absence flagged by attendance audit';
        } else if ((sId + i) % 13 === 0) {
          status = 'LEAVE';
          checkIn = null as any;
          checkOut = null as any;
          remarks = 'Casual leave approved by Medical Officer';
        }

        await client.query(`
          INSERT INTO attendance (staff_id, facility_id, date, check_in, check_out, status, source, remarks, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, 'BIOMETRIC', $7, NOW())
          ON CONFLICT (staff_id, date) DO UPDATE
          SET status = EXCLUDED.status,
              check_in = EXCLUDED.check_in,
              check_out = EXCLUDED.check_out,
              remarks = EXCLUDED.remarks,
              updated_at = NOW();
        `, [sId, facId, dateStr, checkIn, checkOut, status, remarks]);
        attendanceCount++;
      }
    }
    console.log(`[CAREGRID Seed] Upserted ${attendanceCount} attendance records.`);

    // 7. Seed Leave Requests & Backup Assignments
    console.log('[CAREGRID Seed] Seeding leave requests & backup assignments...');
    const leaveData = [
      { staffEmp: 'CG-STF-001', facCode: 'FAC-MH-PUN-001', start: '2026-09-29', end: '2026-09-30', type: 'CASUAL', reason: 'Family medical emergency in hometown', status: 'APPROVED', approverEmp: 'CG-FADM-001' },
      { staffEmp: 'CG-STF-002', facCode: 'FAC-MH-PUN-001', start: '2026-10-01', end: '2026-10-03', type: 'ANNUAL', reason: 'Annual scheduled leave block', status: 'PENDING', approverEmp: null },
      { staffEmp: 'CG-STF-004', facCode: 'FAC-MH-PUN-001', start: '2026-09-28', end: '2026-09-29', type: 'SICK', reason: 'Viral respiratory infection', status: 'APPROVED', approverEmp: 'CG-FADM-001' },
      { staffEmp: 'CG-STF-006', facCode: 'FAC-MH-PUN-002', start: '2026-09-29', end: '2026-09-30', type: 'CASUAL', reason: 'Personal domestic requirement', status: 'PENDING', approverEmp: null },
      { staffEmp: 'CG-STF-014', facCode: 'FAC-MH-PUN-005', start: '2026-09-27', end: '2026-09-29', type: 'EMERGENCY', reason: 'Family distress requiring rural travel', status: 'APPROVED', approverEmp: 'CG-MO-005' },
    ];

    for (const l of leaveData) {
      const sId = userIds[l.staffEmp];
      const fId = facilityIds[l.facCode];
      const aId = l.approverEmp ? userIds[l.approverEmp] : null;

      const res = await client.query(`
        INSERT INTO leave_requests (staff_id, facility_id, start_date, end_date, leave_type, reason, status, approved_by, approved_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, ${aId ? 'NOW()' : 'NULL'}, NOW())
        RETURNING id;
      `, [sId, fId, l.start, l.end, l.type, l.reason, l.status, aId]);

      // If approved, create deterministic backup assignment
      if (l.status === 'APPROVED') {
        const backupEmp = l.staffEmp === 'CG-STF-001' ? 'CG-STF-002' : 'CG-STF-006';
        const backupId = userIds[backupEmp] || staffUserIds[0];
        const sRes = await client.query('SELECT id FROM services WHERE facility_id = $1 LIMIT 1', [fId]);
        const srvId = sRes.rows[0]?.id || serviceIds[0];

        await client.query(`
          INSERT INTO backup_assignments (facility_id, original_staff_id, backup_staff_id, service_id, assignment_date, shift_start, shift_end, status, reason, recommendation_explanation)
          VALUES ($1, $2, $3, $4, $5, '08:00', '16:00', 'CONFIRMED', $6, $7);
        `, [
          fId, sId, backupId, srvId, l.start,
          `Coverage for approved ${l.type} leave`,
          'Recommended because: ✓ available during shift ✓ no schedule conflict ✓ no approved leave ✓ required specialization ✓ facility compatible ✓ workload within threshold'
        ]);
      }
    }

    // 8. Seed Real Operational Alerts
    console.log('[CAREGRID Seed] Seeding operational alerts...');
    const alertData = [
      { facCode: 'FAC-MH-PUN-005', type: 'STAFFING_SHORTAGE', sev: 'CRITICAL', title: 'Lab Technician Absent - Junnar PHC', desc: 'Diagnostic Laboratory staffing is below statutory threshold (0 present / 1 minimum). Immediate backup required.', status: 'OPEN' },
      { facCode: 'FAC-MH-PUN-005', type: 'SERVICE_UNAVAILABLE', sev: 'HIGH', title: 'Diagnostic Lab Operating in Limited Mode', desc: 'Blood and biochemistry testing restricted to urgent maternal emergencies.', status: 'OPEN' },
      { facCode: 'FAC-MH-PUN-001', type: 'HIGH_WORKLOAD', sev: 'MEDIUM', title: 'Emergency Ward Bed Utilization Exceeds 85%', desc: 'Current bed occupancy at Aundh District Hospital reached 88.5%.', status: 'ACKNOWLEDGED' },
      { facCode: 'FAC-MH-PUN-002', type: 'EXCESSIVE_ABSENTEEISM', sev: 'HIGH', title: 'Shift Absenteeism Spike - Shirur CHC', desc: 'Morning shift absenteeism hit 22% due to local transit disruptions.', status: 'OPEN' },
      { facCode: 'FAC-MH-PUN-004', type: 'DEMAND_SPIKE', sev: 'LOW', title: 'Antenatal OPD Volume Surge', desc: 'Predicted antenatal patient volume is 32% above 30-day baseline for Wednesday.', status: 'OPEN' },
    ];

    for (const a of alertData) {
      const fId = facilityIds[a.facCode];
      await client.query(`
        INSERT INTO alerts (facility_id, alert_type, severity, title, description, source, status, created_at)
        VALUES ($1, $2, $3, $4, $5, 'SYSTEM_RULE_ENGINE', $6, NOW());
      `, [fId, a.type, a.sev, a.title, a.desc, a.status]);
    }

    // 9. Seed In-App & Multi-Channel Notifications
    console.log('[CAREGRID Seed] Seeding notifications...');
    const notifData = [
      { userEmp: 'CG-ADMIN-001', title: 'Critical Alert: Understaffing in Junnar', msg: 'Primary Health Center Junnar has 0 Lab Techs present. Please assign backup personnel.', type: 'ALERT', ch: 'IN_APP', st: 'DELIVERED' },
      { userEmp: 'CG-ADMIN-001', title: 'System Heartbeat Report', msg: 'All 5 health facilities reporting synchronized biometric attendance feeds.', type: 'SYSTEM', ch: 'IN_APP', st: 'DELIVERED' },
      { userEmp: 'CG-FADM-001', title: 'Leave Application Approved', msg: 'Leave request for Pooja Kale (Staff Nurse) from Sep 29 to Sep 30 was approved.', type: 'LEAVE_STATUS', ch: 'IN_APP', st: 'DELIVERED' },
      { userEmp: 'CG-FADM-001', title: 'Backup Assigned: ICU Coverage', msg: 'Aarti Sawant confirmed as backup coverage for Sep 29 morning shift.', type: 'BACKUP_ASSIGNMENT', ch: 'IN_APP', st: 'DELIVERED' },
      { userEmp: 'CG-DIST-001', title: 'District Absenteeism Report Ready', msg: 'Daily attendance reconciliation across 5 health centers is 91.4% complete.', type: 'SCHEDULE_UPDATE', ch: 'IN_APP', st: 'DELIVERED' },
    ];

    for (const n of notifData) {
      const uId = userIds[n.userEmp];
      await client.query(`
        INSERT INTO notifications (user_id, type, channel, title, message, status, sent_at, delivered_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW());
      `, [uId, n.type, n.ch, n.title, n.msg, n.st]);
    }

    // 10. Seed Workload History & Demand Predictions (Statistical ground truth)
    console.log('[CAREGRID Seed] Seeding operational workload history & demand predictions...');
    const workloadDates = [
      '2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04', '2026-09-05',
      '2026-09-06', '2026-09-07', '2026-09-08', '2026-09-09', '2026-09-10',
      '2026-09-11', '2026-09-12', '2026-09-13', '2026-09-14', '2026-09-15',
      '2026-09-16', '2026-09-17', '2026-09-18', '2026-09-19', '2026-09-20',
      '2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25',
      '2026-09-26', '2026-09-27'
    ];

    let workloadCount = 0;
    for (const [facCode, fId] of Object.entries(facilityIds)) {
      const baseVol = facCode === 'FAC-MH-PUN-001' ? 140 : 60;
      for (let wIdx = 0; wIdx < workloadDates.length; wIdx++) {
        const wDate = workloadDates[wIdx];
        const dayOfWeek = (wIdx % 7);
        // Weekend slight drop, Monday surge
        const factor = dayOfWeek === 1 ? 1.25 : (dayOfWeek === 0 || dayOfWeek === 6 ? 0.75 : 1.0);
        const pVol = Math.round(baseVol * factor + ((wIdx * 3) % 15));
        const sLoad = Math.round(pVol * 0.85);
        const stLevel = facCode === 'FAC-MH-PUN-001' ? 18 : 6;
        const utilRate = ((sLoad / (stLevel * 8)) * 10).toFixed(2);
        const waitTime = Math.round(15 + (Number(utilRate) * 0.4));
        const wScore = (Number(utilRate) * 0.8 + waitTime * 0.2).toFixed(2);

        await client.query(`
          INSERT INTO workload_history (facility_id, record_date, patient_volume, service_load, staffing_level, utilization_rate, waiting_time_minutes, workload_score)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
        `, [fId, wDate, pVol, sLoad, stLevel, utilRate, waitTime, wScore]);
        workloadCount++;
      }

      // Generate forward Demand Predictions (2026-09-28 to 2026-10-04)
      const forecastDates = ['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04'];
      const facServiceRes = await client.query('SELECT id FROM services WHERE facility_id = $1 LIMIT 2', [fId]);
      
      for (const sRow of facServiceRes.rows) {
        for (let fIdx = 0; fIdx < forecastDates.length; fIdx++) {
          const fDate = forecastDates[fIdx];
          const predicted = Math.round((baseVol * 0.9) + (fIdx * 4) + (fIdx % 2 === 0 ? 8 : -5));
          const confidence = (88.50 - (fIdx * 1.5)).toFixed(2);

          await client.query(`
            INSERT INTO demand_predictions (facility_id, service_id, prediction_date, predicted_demand, confidence, model_version, method, input_window)
            VALUES ($1, $2, $3, $4, $5, 'v1.4-wma', 'Weighted Moving Average + Day-of-Week Trend', '27 days operational workload history');
          `, [fId, sRow.id, fDate, predicted, confidence]);
        }
      }
    }
    console.log(`[CAREGRID Seed] Upserted ${workloadCount} workload history records and forward demand predictions.`);

    // 11. Seed Audit Logs for Initial Bootstrapping
    console.log('[CAREGRID Seed] Seeding initial audit trail...');
    await client.query(`
      INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, previous_value, new_value, ip_address, user_agent, request_id)
      VALUES 
      ($1, 'SYSTEM_INIT', 'DATABASE', 'SCHEMA_V1', NULL, 'Initialized CAREGRID schema and production seed dataset', '127.0.0.1', 'CAREGRID-DB-BOOTSTRAP', 'req_init_001'),
      ($1, 'OPERATIONAL_RULES_CONFIGURED', 'RULES', 'ALL', NULL, 'Configured 5 operational thresholds for staffing and alerts', '127.0.0.1', 'CAREGRID-DB-BOOTSTRAP', 'req_init_002'),
      ($1, 'FACILITIES_BOOTSTRAPPED', 'FACILITIES', '5_UNITS', NULL, 'Provisioned Pune district network health facilities', '127.0.0.1', 'CAREGRID-DB-BOOTSTRAP', 'req_init_003');
    `, [userIds['CG-ADMIN-001']]);

    // 12. Seed Ingested Sync Events (Biometric & State Health Portal)
    console.log('[CAREGRID Seed] Seeding sync events for idempotency check...');
    await client.query(`
      INSERT INTO sync_events (source_system, event_type, external_id, payload_hash, payload, status, attempts, received_at, processed_at)
      VALUES
      ('BIOMETRIC_DEVICE', 'PUNCH_IN', 'BIO-PUN-0928-001', 'a1f87c2b3e4d567890abcdef1234567890abcdef1234567890abcdef12345678', '{"empId": "CG-STF-001", "time": "2026-09-28T08:05:00Z", "device": "BIO-AUNDH-GATE-1"}', 'PROCESSED', 1, NOW() - INTERVAL '4 hours', NOW() - INTERVAL '4 hours'),
      ('STATE_HEALTH_PORTAL', 'FACILITY_STATUS_SYNC', 'ST-HLTH-20260928', 'b2e98d3c4f5e678901bcdef2345678901bcdef2345678901bcdef2345678901', '{"state": "Maharashtra", "district": "Pune", "facilitiesActive": 5}', 'PROCESSED', 1, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours')
      ON CONFLICT (payload_hash) DO NOTHING;
    `);

    await client.query('COMMIT');
    console.log('[CAREGRID Seed] Production seed completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[CAREGRID Seed] Error seeding database:', err);
    throw err;
  } finally {
    client.release();
  }
}

// Run immediately if executed via CLI
seedDatabase()
  .then(() => {
    console.log('Seed process finished without errors.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal seed failure:', err);
    process.exit(1);
  });
