import crypto from 'crypto';
import { pool } from '../../src/db/index';
import { realtimeHub } from '../realtime/hub';

export interface IngestSyncPayload {
  sourceSystem: string;
  eventType: string;
  externalId: string;
  data: Record<string, any>;
}

export async function processSyncEvent(payload: IngestSyncPayload) {
  const serialized = JSON.stringify(payload.data);
  const hash = crypto.createHash('sha256').update(`${payload.sourceSystem}-${payload.externalId}-${serialized}`).digest('hex');

  // Check duplicate idempotency
  const existing = await pool.query('SELECT * FROM sync_events WHERE payload_hash = $1', [hash]);
  if (existing.rows.length > 0) {
    const row = existing.rows[0];
    await pool.query('UPDATE sync_events SET attempts = attempts + 1 WHERE id = $1', [row.id]);
    return {
      status: 'DUPLICATE',
      message: 'Event previously received and processed. Idempotent deduplication applied.',
      syncEventId: row.id,
    };
  }

  // Insert received event
  const insertRes = await pool.query(`
    INSERT INTO sync_events (source_system, event_type, external_id, payload_hash, payload, status, attempts, received_at)
    VALUES ($1, $2, $3, $4, $5, 'PROCESSING', 1, NOW())
    RETURNING id;
  `, [payload.sourceSystem, payload.eventType, payload.externalId, hash, serialized]);

  const syncId = insertRes.rows[0].id;

  try {
    // Process based on event type
    if (payload.eventType === 'BIOMETRIC_PUNCH') {
      const { staffId, facilityId, date, checkIn, checkOut, status } = payload.data;
      if (staffId && facilityId && date) {
        await pool.query(`
          INSERT INTO attendance (staff_id, facility_id, date, check_in, check_out, status, source, remarks, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, 'BIOMETRIC', 'Synced via Biometric Gateway', NOW())
          ON CONFLICT (staff_id, date) DO UPDATE
          SET check_in = COALESCE(EXCLUDED.check_in, attendance.check_in),
              check_out = COALESCE(EXCLUDED.check_out, attendance.check_out),
              status = EXCLUDED.status,
              updated_at = NOW();
        `, [staffId, facilityId, date, checkIn || null, checkOut || null, status || 'PRESENT']);
      }
    } else if (payload.eventType === 'WORKLOAD_TELEMETRY') {
      const { facilityId, recordDate, patientVolume, serviceLoad, staffingLevel } = payload.data;
      if (facilityId && recordDate) {
        const util = (patientVolume / ((staffingLevel || 5) * 8) * 10).toFixed(2);
        await pool.query(`
          INSERT INTO workload_history (facility_id, record_date, patient_volume, service_load, staffing_level, utilization_rate, workload_score)
          VALUES ($1, $2, $3, $4, $5, $6, $6);
        `, [facilityId, recordDate, patientVolume || 0, serviceLoad || 0, staffingLevel || 5, util]);
      }
    }

    // Mark as processed
    await pool.query(`
      UPDATE sync_events
      SET status = 'PROCESSED', processed_at = NOW()
      WHERE id = $1;
    `, [syncId]);

    realtimeHub.broadcast('sync.updated', { syncId, eventType: payload.eventType, status: 'PROCESSED' });

    return {
      status: 'PROCESSED',
      message: 'Event processed successfully through ingestion pipeline.',
      syncEventId: syncId,
    };
  } catch (err: any) {
    await pool.query(`
      UPDATE sync_events
      SET status = 'FAILED', error_message = $1
      WHERE id = $2;
    `, [err.message, syncId]);

    return {
      status: 'FAILED',
      error: err.message,
      syncEventId: syncId,
    };
  }
}
