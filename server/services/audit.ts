import { pool } from '../../src/db/index';

export interface AuditParams {
  actorUserId?: number | null;
  action: string;
  entityType: string;
  entityId?: string | number | null;
  previousValue?: any;
  newValue?: any;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

export async function recordAudit(params: AuditParams) {
  try {
    const prev = params.previousValue ? (typeof params.previousValue === 'string' ? params.previousValue : JSON.stringify(params.previousValue)) : null;
    const next = params.newValue ? (typeof params.newValue === 'string' ? params.newValue : JSON.stringify(params.newValue)) : null;

    await pool.query(`
      INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, previous_value, new_value, ip_address, user_agent, request_id, timestamp)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW());
    `, [
      params.actorUserId || null,
      params.action,
      params.entityType,
      params.entityId ? String(params.entityId) : null,
      prev,
      next,
      params.ipAddress || null,
      params.userAgent || null,
      params.requestId || null,
    ]);
  } catch (err) {
    console.error('[CAREGRID Audit Trail Error] Failed to write audit log:', err);
  }
}
