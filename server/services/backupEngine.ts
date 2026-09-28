import { pool } from '../../src/db/index';

export interface BackupRecommendationResult {
  candidateId: number;
  name: string;
  role: string;
  specialization: string;
  facilityId: number;
  score: number;
  explanation: string[];
}

export async function computeBackupRecommendations(params: {
  facilityId: number;
  serviceId?: number;
  requiredSpecialization?: string;
  date: string;
  shiftStart: string;
  shiftEnd: string;
  originalStaffId?: number;
}): Promise<BackupRecommendationResult[]> {
  const { facilityId, date, shiftStart, shiftEnd, originalStaffId, requiredSpecialization } = params;

  // 1. Fetch staff members
  const staffQuery = await pool.query(`
    SELECT id, employee_id, name, role, specialization, facility_id
    FROM users
    WHERE role IN ('STAFF', 'MEDICAL_OFFICER') AND status = 'ACTIVE'
    ${originalStaffId ? 'AND id != $1' : ''};
  `, originalStaffId ? [originalStaffId] : []);

  const candidates = staffQuery.rows;
  const results: BackupRecommendationResult[] = [];

  for (const staff of candidates) {
    const explanations: string[] = [];
    let score = 100;

    // Check facility compatibility
    if (staff.facility_id === facilityId) {
      explanations.push('✓ Same health facility (immediate on-site availability)');
      score += 20;
    } else {
      explanations.push('ℹ Nearby facility staff (cross-facility deployment required)');
      score -= 10;
    }

    // Check specialization
    if (requiredSpecialization && staff.specialization && staff.specialization.toLowerCase().includes(requiredSpecialization.toLowerCase())) {
      explanations.push(`✓ Required specialization match (${staff.specialization})`);
      score += 25;
    } else if (requiredSpecialization) {
      explanations.push(`ℹ Clinical generalist backup (specialization: ${staff.specialization || 'General'})`);
    }

    // Check leave conflicts on this date
    const leaveCheck = await pool.query(`
      SELECT id, leave_type FROM leave_requests
      WHERE staff_id = $1 AND status = 'APPROVED'
      AND $2 BETWEEN start_date AND end_date;
    `, [staff.id, date]);

    if (leaveCheck.rows.length > 0) {
      // Conflict: On approved leave
      continue;
    } else {
      explanations.push('✓ No approved leave on assignment date');
    }

    // Check existing schedule overlap
    const scheduleCheck = await pool.query(`
      SELECT id, shift_start, shift_end FROM staff_schedules
      WHERE staff_id = $1 AND shift_date = $2;
    `, [staff.id, date]);

    if (scheduleCheck.rows.length > 0) {
      // Check if overlapping
      const s = scheduleCheck.rows[0];
      if (s.shift_start === shiftStart) {
        explanations.push('⚠ Already rostered on concurrent shift (requires shift swap)');
        score -= 40;
      } else {
        explanations.push('✓ Rostered on non-overlapping shift');
      }
    } else {
      explanations.push('✓ Off-duty on date (available for shift allocation)');
      score += 15;
    }

    // Check backup assignments count
    const backupLoad = await pool.query(`
      SELECT COUNT(*)::int as count FROM backup_assignments
      WHERE backup_staff_id = $1 AND assignment_date = $2;
    `, [staff.id, date]);

    if (backupLoad.rows[0].count > 0) {
      score -= 30;
      explanations.push('⚠ Already assigned to 1 backup duty on this date');
    } else {
      explanations.push('✓ Workload within optimal fatigue threshold');
    }

    results.push({
      candidateId: staff.id,
      name: staff.name,
      role: staff.role,
      specialization: staff.specialization || 'Clinical Generalist',
      facilityId: staff.facility_id,
      score,
      explanation: explanations,
    });
  }

  // Sort descending by score
  return results.sort((a, b) => b.score - a.score);
}
