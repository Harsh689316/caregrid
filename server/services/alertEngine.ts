import { pool } from '../../src/db/index';
import { realtimeHub } from '../realtime/hub';

export interface AlertCreationParams {
  facilityId: number;
  alertType: 'STAFFING_SHORTAGE' | 'SERVICE_UNAVAILABLE' | 'EXCESSIVE_ABSENTEEISM' | 'HIGH_WORKLOAD' | 'DEMAND_SPIKE' | 'SYNC_FAILURE';
  severity: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string;
  source?: string;
}

export async function evaluateAndTriggerAlert(params: AlertCreationParams) {
  // Check for duplicate active open alert
  const existing = await pool.query(`
    SELECT id FROM alerts
    WHERE facility_id = $1 AND alert_type = $2 AND status = 'OPEN'
    LIMIT 1;
  `, [params.facilityId, params.alertType]);

  if (existing.rows.length > 0) {
    return existing.rows[0];
  }

  const res = await pool.query(`
    INSERT INTO alerts (facility_id, alert_type, severity, title, description, source, status, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, 'OPEN', NOW())
    RETURNING *;
  `, [
    params.facilityId,
    params.alertType,
    params.severity,
    params.title,
    params.description,
    params.source || 'SYSTEM_RULE_ENGINE',
  ]);

  const alert = res.rows[0];

  // Broadcast realtime event
  realtimeHub.broadcast('alert.created', alert);

  // Dispatch In-App Notification
  await pool.query(`
    INSERT INTO notifications (facility_id, type, channel, title, message, status, sent_at, delivered_at)
    VALUES ($1, 'ALERT', 'IN_APP', $2, $3, 'DELIVERED', NOW(), NOW());
  `, [params.facilityId, `[${alert.severity}] ${alert.title}`, alert.description]);

  return alert;
}
