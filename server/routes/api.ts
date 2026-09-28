import { sendNotification } from '../services/notificationService';
import twilio from 'twilio';
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../../src/db/index';
import { authenticate, authorize } from '../middleware/auth';
import { recordAudit } from '../services/audit';
import { realtimeHub } from '../realtime/hub';
import { evaluateAndTriggerAlert } from '../services/alertEngine';
import { computeBackupRecommendations } from '../services/backupEngine';
import { processSyncEvent } from '../services/syncPipeline';
import { computeWorkloadAnalytics } from '../services/analyticsEngine';

export const apiRouter = Router();

// ==========================================
// DASHBOARD METRICS — PostgreSQL authoritative
// ==========================================

apiRouter.get(
  '/dashboard',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const user = req.user!;

      // Facility-level users only see their assigned facility.
      const facilityScoped =
        ['FACILITY_ADMIN', 'STAFF', 'MEDICAL_OFFICER'].includes(user.role) &&
        user.facilityId;

      const facilityFilter = facilityScoped
        ? 'WHERE id = $1'
        : '';

      const facilityParams = facilityScoped
        ? [user.facilityId]
        : [];

      // ------------------------------------------------
      // Facilities
      // ------------------------------------------------
      const facilitiesResult = await pool.query(
        `
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (
            WHERE status = 'OPERATIONAL'
          )::int AS operational,
          COUNT(*) FILTER (
            WHERE status = 'LIMITED'
          )::int AS limited
        FROM facilities
        ${facilityFilter};
        `,
        facilityParams,
      );

      // ------------------------------------------------
      // Services
      // ------------------------------------------------
      const servicesResult = await pool.query(
        `
        SELECT
          COUNT(*)::int AS total_services,
          COUNT(*) FILTER (
            WHERE status = 'AVAILABLE'
          )::int AS available,
          COUNT(*) FILTER (
            WHERE status = 'LIMITED'
          )::int AS limited,
          COUNT(*) FILTER (
            WHERE status = 'UNAVAILABLE'
          )::int AS unavailable
        FROM services
        ${
          facilityScoped
            ? 'WHERE facility_id = $1'
            : ''
        };
        `,
        facilityParams,
      );

      // ------------------------------------------------
      // Alerts
      // ------------------------------------------------
      const alertsResult = await pool.query(
        `
        SELECT
          COUNT(*)::int AS total_alerts,
          COUNT(*) FILTER (
            WHERE severity = 'CRITICAL'
              AND status = 'OPEN'
          )::int AS critical_open,
          COUNT(*) FILTER (
            WHERE status = 'OPEN'
          )::int AS open_alerts
        FROM alerts
        ${
          facilityScoped
            ? 'WHERE facility_id = $1'
            : ''
        };
        `,
        facilityParams,
      );

      // ------------------------------------------------
      // Attendance
      //
      // Use the latest attendance date available in the
      // database rather than inventing today's data.
      // ------------------------------------------------
      const latestAttendanceResult = await pool.query(
        `
        SELECT MAX(date) AS latest_date
        FROM attendance
        ${
          facilityScoped
            ? 'WHERE facility_id = $1'
            : ''
        };
        `,
        facilityParams,
      );

      const targetDate =
        latestAttendanceResult.rows[0]?.latest_date ||
        new Date().toISOString().slice(0, 10);

      const attendanceParams = facilityScoped
        ? [targetDate, user.facilityId]
        : [targetDate];

      const attendanceResult = await pool.query(
        `
        SELECT
          COUNT(*)::int AS total_logged,
          COUNT(*) FILTER (
            WHERE status = 'PRESENT'
          )::int AS present,
          COUNT(*) FILTER (
            WHERE status = 'LATE'
          )::int AS late,
          COUNT(*) FILTER (
            WHERE status = 'ABSENT'
          )::int AS absent,
          COUNT(*) FILTER (
            WHERE status = 'LEAVE'
          )::int AS on_leave
        FROM attendance
        WHERE date = $1
        ${
          facilityScoped
            ? 'AND facility_id = $2'
            : ''
        };
        `,
        attendanceParams,
      );

      // ------------------------------------------------
      // Pending leave requests
      // ------------------------------------------------
      const leaveResult = await pool.query(
        `
        SELECT COUNT(*)::int AS pending_leaves
        FROM leave_requests
        WHERE status = 'PENDING'
        ${
          facilityScoped
            ? 'AND facility_id = $1'
            : ''
        };
        `,
        facilityParams,
      );

      // ------------------------------------------------
      // Recent audit activity
      // ------------------------------------------------
      const auditParams: any[] = [];

      let auditFacilityClause = '';

      if (facilityScoped) {
        auditFacilityClause = `
          AND (
            a.actor_user_id IN (
              SELECT id
              FROM users
              WHERE facility_id = $1
            )
          )
        `;
        auditParams.push(user.facilityId);
      }

      const auditResult = await pool.query(
        `
        SELECT
          a.*,
          u.name AS actor_name,
          u.role AS actor_role
        FROM audit_logs a
        LEFT JOIN users u
          ON a.actor_user_id = u.id
        WHERE 1 = 1
        ${auditFacilityClause}
        ORDER BY a.timestamp DESC
        LIMIT 8;
        `,
        auditParams,
      );

      // ------------------------------------------------
      // Top active alerts
      // ------------------------------------------------
      const alertParams = facilityScoped
        ? [user.facilityId]
        : [];

      const topAlertsResult = await pool.query(
        `
        SELECT
          a.*,
          f.name AS facility_name
        FROM alerts a
        JOIN facilities f
          ON a.facility_id = f.id
        WHERE a.status != 'RESOLVED'
        ${
          facilityScoped
            ? 'AND a.facility_id = $1'
            : ''
        }
        ORDER BY
          CASE a.severity
            WHEN 'CRITICAL' THEN 1
            WHEN 'HIGH' THEN 2
            WHEN 'MEDIUM' THEN 3
            WHEN 'LOW' THEN 4
            ELSE 5
          END,
          a.created_at DESC
        LIMIT 5;
        `,
        alertParams,
      );

      return res.json({
        success: true,
        data: {
          facilities: facilitiesResult.rows[0],
          services: servicesResult.rows[0],
          alerts: alertsResult.rows[0],
          attendance: {
            ...attendanceResult.rows[0],
            date: targetDate,
          },
          pendingLeaves:
            leaveResult.rows[0]?.pending_leaves || 0,
          recentActivity: auditResult.rows,
          topAlerts: topAlertsResult.rows,
        },
        requestId: req.requestId,
      });
    } catch (error: any) {
      console.error(
        'Dashboard query failed:',
        error,
      );

      return res.status(500).json({
        success: false,
        error: {
          code: 'DASHBOARD_FETCH_FAILED',
          message:
            'Unable to load authoritative dashboard metrics.',
        },
        requestId: req.requestId,
      });
    }
  },
);

// ==========================================
// TWILIO SMS DELIVERY STATUS WEBHOOK
// ==========================================

apiRouter.post(
  '/notifications/twilio/status',
  async (req: Request, res: Response) => {
    try {
      const authToken = process.env.TWILIO_AUTH_TOKEN;

      if (!authToken) {
        return res.status(503).json({
          success: false,
          error: {
            code: 'TWILIO_NOT_CONFIGURED',
            message: 'Twilio authentication is not configured.',
          },
          requestId: req.requestId,
        });
      }

      const signature = req.headers['x-twilio-signature'];

      if (typeof signature !== 'string') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'TWILIO_SIGNATURE_MISSING',
            message: 'Twilio signature is required.',
          },
          requestId: req.requestId,
        });
      }

      const webhookUrl = process.env.TWILIO_STATUS_CALLBACK_URL;

      if (!webhookUrl) {
        return res.status(503).json({
          success: false,
          error: {
            code: 'TWILIO_WEBHOOK_NOT_CONFIGURED',
            message:
              'TWILIO_STATUS_CALLBACK_URL is not configured.',
          },
          requestId: req.requestId,
        });
      }

      const isValid = twilio.validateRequest(
        authToken,
        signature,
        webhookUrl,
        req.body,
      );

      if (!isValid) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'TWILIO_SIGNATURE_INVALID',
            message: 'Invalid Twilio webhook signature.',
          },
          requestId: req.requestId,
        });
      }

      const messageSid = req.body?.MessageSid;
      const messageStatus = String(
        req.body?.MessageStatus || '',
      ).toLowerCase();

      if (!messageSid) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'TWILIO_MESSAGE_SID_MISSING',
            message: 'Twilio MessageSid is required.',
          },
          requestId: req.requestId,
        });
      }

      const deliveredStatuses = new Set([
        'delivered',
      ]);

      const failedStatuses = new Set([
        'failed',
        'undelivered',
      ]);

      let status:
        | 'DELIVERED'
        | 'FAILED'
        | null = null;

      if (deliveredStatuses.has(messageStatus)) {
        status = 'DELIVERED';
      } else if (failedStatuses.has(messageStatus)) {
        status = 'FAILED';
      }

      if (!status) {
        return res.status(200).json({
          success: true,
          data: {
            messageSid,
            messageStatus,
            ignored: true,
          },
          requestId: req.requestId,
        });
      }

      const errorMessage =
        status === 'FAILED'
          ? req.body?.ErrorMessage ||
            req.body?.ErrorCode ||
            `Twilio reported status: ${messageStatus}`
          : null;

      const updateResult = await pool.query(
        `
          UPDATE notifications
          SET
            status = $1,
            delivered_at = CASE
              WHEN $1 = 'DELIVERED' THEN NOW()
              ELSE delivered_at
            END,
            error_message = $2
          WHERE provider_message_id = $3
            AND channel = 'SMS'
          RETURNING *;
        `,
        [
          status,
          errorMessage,
          messageSid,
        ],
      );

      if (updateResult.rows.length > 0) {
        realtimeHub.broadcast(
          'notification.updated',
          updateResult.rows[0],
        );
      }

      return res.status(200).json({
        success: true,
        data: {
          messageSid,
          messageStatus,
          updated: updateResult.rows.length > 0,
        },
        requestId: req.requestId,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'TWILIO_WEBHOOK_PROCESSING_FAILED',
          message: error.message,
        },
        requestId: req.requestId,
      });
    }
  },
);

// ==========================================
// REAL EMAIL / SMS NOTIFICATION SENDER
// ==========================================

apiRouter.post(
  '/notifications/send',
  authenticate,
  authorize(['SUPER_ADMIN', 'DISTRICT_ADMIN', 'FACILITY_ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        userId: z.coerce.number().int().positive(),
        channel: z.enum(['EMAIL', 'SMS', 'IN_APP']),
        type: z.enum([
          'ALERT',
          'BACKUP_ASSIGNMENT',
          'LEAVE_STATUS',
          'SCHEDULE_UPDATE',
          'SYSTEM',
        ]),
        title: z.string().min(1).max(200),
        message: z.string().min(1).max(5000),
      });

      const parsed = schema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_NOTIFICATION_REQUEST',
            message: 'Invalid notification request.',
            details: parsed.error.flatten(),
          },
          requestId: req.requestId,
        });
      }

      const result = await sendNotification({
        userId: parsed.data.userId,
        channel: parsed.data.channel,
        type: parsed.data.type,
        title: parsed.data.title,
        message: parsed.data.message,
      });

      return res.status(
        result.status === 'FAILED' ? 502 : 201,
      ).json({
        success: result.status !== 'FAILED',
        data: result,
        requestId: req.requestId,
      });
    } catch (err: any) {
      console.error('Notification send error:', err);

      return res.status(500).json({
        success: false,
        error: {
          code: 'NOTIFICATION_SEND_FAILED',
          message: err.message || 'Failed to send notification.',
        },
        requestId: req.requestId,
      });
    }
  },
);

// ==========================================
// 2. FACILITIES (List, Detail, Update)
// ==========================================
apiRouter.get('/facilities', authenticate, async (req: Request, res: Response) => {
  try {
    const { district, status, search } = req.query;
    let query = `
      SELECT f.*, 
        (SELECT COUNT(*)::int FROM services WHERE facility_id = f.id) as total_services,
        (SELECT COUNT(*)::int FROM users WHERE facility_id = f.id) as total_staff
      FROM facilities f
      WHERE 1=1
    `;
    const params: any[] = [];

    if (district) {
      params.push(district);
      query += ` AND f.district ILIKE $${params.length}`;
    }
    if (status) {
      params.push(status);
      query += ` AND f.status = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (f.name ILIKE $${params.length} OR f.facility_code ILIKE $${params.length})`;
    }

    query += ' ORDER BY f.name ASC';

    const resDb = await pool.query(query, params);
    return res.json({ success: true, data: resDb.rows, requestId: req.requestId });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: err.message }, requestId: req.requestId });
  }
});

apiRouter.get('/facilities/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const facRes = await pool.query('SELECT * FROM facilities WHERE id = $1', [id]);
    if (facRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Facility not found' }, requestId: req.requestId });
    }

    const srvRes = await pool.query('SELECT * FROM services WHERE facility_id = $1 ORDER BY name ASC', [id]);
    const staffRes = await pool.query('SELECT id, employee_id, name, email, phone, role, specialization, status FROM users WHERE facility_id = $1', [id]);
    const nearbyRes = await pool.query(`
      SELECT n.*, f.name as nearby_facility_name, f.facility_type, f.contact_phone
      FROM nearby_facilities n
      JOIN facilities f ON n.nearby_facility_id = f.id
      WHERE n.facility_id = $1;
    `, [id]);

    return res.json({
      success: true,
      data: {
        facility: facRes.rows[0],
        services: srvRes.rows,
        staff: staffRes.rows,
        nearbyFacilities: nearbyRes.rows,
      },
      requestId: req.requestId,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: err.message }, requestId: req.requestId });
  }
});

apiRouter.put('/facilities/:id', authenticate, authorize(['SUPER_ADMIN', 'DISTRICT_ADMIN', 'FACILITY_ADMIN']), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, status, contactPhone, operatingHours, totalBeds } = req.body;

    const oldRes = await pool.query('SELECT * FROM facilities WHERE id = $1', [id]);
    if (oldRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Facility not found' }, requestId: req.requestId });
    }

    const updateRes = await pool.query(`
      UPDATE facilities
      SET name = COALESCE($1, name),
          status = COALESCE($2, status),
          contact_phone = COALESCE($3, contact_phone),
          operating_hours = COALESCE($4, operating_hours),
          total_beds = COALESCE($5, total_beds),
          updated_at = NOW()
      WHERE id = $6
      RETURNING *;
    `, [name, status, contactPhone, operatingHours, totalBeds, id]);

    await recordAudit({
      actorUserId: req.user!.id,
      action: 'FACILITY_UPDATED',
      entityType: 'FACILITY',
      entityId: id,
      previousValue: oldRes.rows[0],
      newValue: updateRes.rows[0],
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      requestId: req.requestId,
    });

    realtimeHub.broadcast('facility.updated', updateRes.rows[0]);
    return res.json({ success: true, data: updateRes.rows[0], requestId: req.requestId });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'UPDATE_ERROR', message: err.message }, requestId: req.requestId });
  }
});

// ==========================================
// 3. SERVICES & SERVICE AVAILABILITY (Core mutation workflow)
// ==========================================
apiRouter.get('/services', authenticate, async (req: Request, res: Response) => {
  try {
    const { facilityId } = req.query;
    const query = `
      SELECT s.*, f.name as facility_name, f.district
      FROM services s
      JOIN facilities f ON s.facility_id = f.id
      ${facilityId ? 'WHERE s.facility_id = $1' : ''}
      ORDER BY f.name, s.name;
    `;
    const resDb = await pool.query(query, facilityId ? [facilityId] : []);
    return res.json({ success: true, data: resDb.rows, requestId: req.requestId });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: err.message }, requestId: req.requestId });
  }
});

const serviceStatusSchema = z.object({
  status: z.enum(['AVAILABLE', 'LIMITED', 'UNAVAILABLE', 'EMERGENCY_ONLY']),
  reason: z.string().min(3),
  expectedRestoreAt: z.string().optional(),
});

apiRouter.patch('/services/:id/availability', authenticate, authorize(['SUPER_ADMIN', 'DISTRICT_ADMIN', 'FACILITY_ADMIN', 'MEDICAL_OFFICER']), async (req: Request, res: Response) => {
  const parse = serviceStatusSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', details: parse.error.format() }, requestId: req.requestId });
  }

  const serviceId = parseInt(req.params.id, 10);
  const { status, reason, expectedRestoreAt } = parse.data;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Fetch current state
    const srvQuery = await client.query('SELECT s.*, f.name as facility_name FROM services s JOIN facilities f ON s.facility_id = f.id WHERE s.id = $1', [serviceId]);
    if (srvQuery.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: { code: 'SERVICE_NOT_FOUND', message: 'Service not found' }, requestId: req.requestId });
    }
    const previousService = srvQuery.rows[0];

    // 2. Update service status
    const updateRes = await client.query(`
      UPDATE services
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *;
    `, [status, serviceId]);
    const updatedService = updateRes.rows[0];

    // 3. Record history in service_availability
    await client.query(`
      INSERT INTO service_availability (facility_id, service_id, status, reason, effective_from, expected_restore_at, updated_by, updated_at)
      VALUES ($1, $2, $3, $4, NOW(), $5, $6, NOW());
    `, [previousService.facility_id, serviceId, status, reason, expectedRestoreAt || null, req.user!.id]);

    // 4. Audit log
    await client.query(`
      INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, previous_value, new_value, ip_address, user_agent, request_id, timestamp)
      VALUES ($1, 'SERVICE_STATUS_CHANGED', 'SERVICE', $2, $3, $4, $5, $6, $7, NOW());
    `, [
      req.user!.id,
      String(serviceId),
      JSON.stringify({ status: previousService.status, name: previousService.name }),
      JSON.stringify({ status, reason, expectedRestoreAt }),
      req.ip,
      req.headers['user-agent'],
      req.requestId,
    ]);

    await client.query('COMMIT');

    // 5. Evaluate alert if service became limited or unavailable
    if (status === 'UNAVAILABLE' || status === 'LIMITED') {
      await evaluateAndTriggerAlert({
        facilityId: previousService.facility_id,
        alertType: 'SERVICE_UNAVAILABLE',
        severity: status === 'UNAVAILABLE' ? 'CRITICAL' : 'HIGH',
        title: `${previousService.name} is now ${status}`,
        description: `Operational status altered at ${previousService.facility_name}. Reason: ${reason}`,
      });
    }

    // 6. Realtime broadcast
    realtimeHub.broadcast('service.updated', {
      serviceId,
      facilityId: previousService.facility_id,
      status,
      reason,
      updatedBy: req.user!.name,
    });

    return res.json({
      success: true,
      data: updatedService,
      requestId: req.requestId,
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    return res.status(500).json({ success: false, error: { code: 'UPDATE_FAILED', message: err.message }, requestId: req.requestId });
  } finally {
    client.release();
  }
});

// ==========================================
// 4. STAFF & SCHEDULING
// ==========================================
apiRouter.get('/staff', authenticate, async (req: Request, res: Response) => {
  try {
    const { facilityId, role, search } = req.query;
    let query = `
      SELECT u.id, u.employee_id, u.name, u.email, u.phone, u.role, u.facility_id, u.status, u.specialization,
             f.name as facility_name
      FROM users u
      LEFT JOIN facilities f ON u.facility_id = f.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (facilityId) {
      params.push(facilityId);
      query += ` AND u.facility_id = $${params.length}`;
    }
    if (role) {
      params.push(role);
      query += ` AND u.role = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (u.name ILIKE $${params.length} OR u.employee_id ILIKE $${params.length} OR u.specialization ILIKE $${params.length})`;
    }

    query += ' ORDER BY u.name ASC';

    const resDb = await pool.query(query, params);
    return res.json({ success: true, data: resDb.rows, requestId: req.requestId });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: err.message }, requestId: req.requestId });
  }
});

apiRouter.get('/schedules', authenticate, async (req: Request, res: Response) => {
  try {
    const { facilityId, staffId, date } = req.query;
    let query = `
      SELECT sc.*, u.name as staff_name, u.role as staff_role, u.specialization, f.name as facility_name
      FROM staff_schedules sc
      JOIN users u ON sc.staff_id = u.id
      JOIN facilities f ON sc.facility_id = f.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (facilityId) {
      params.push(facilityId);
      query += ` AND sc.facility_id = $${params.length}`;
    }
    if (staffId) {
      params.push(staffId);
      query += ` AND sc.staff_id = $${params.length}`;
    }
    if (date) {
      params.push(date);
      query += ` AND sc.shift_date = $${params.length}`;
    }

    query += ' ORDER BY sc.shift_date DESC, sc.shift_start ASC LIMIT 100';

    const resDb = await pool.query(query, params);
    return res.json({ success: true, data: resDb.rows, requestId: req.requestId });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: err.message }, requestId: req.requestId });
  }
});

// ==========================================
// 5. ATTENDANCE (Punch, Manual, Queries)
// ==========================================
apiRouter.get('/attendance', authenticate, async (req: Request, res: Response) => {
  try {
    const { facilityId, date, status } = req.query;
    let query = `
      SELECT a.*, u.name as staff_name, u.employee_id, u.role as staff_role, u.specialization, f.name as facility_name
      FROM attendance a
      JOIN users u ON a.staff_id = u.id
      JOIN facilities f ON a.facility_id = f.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (facilityId) {
      params.push(facilityId);
      query += ` AND a.facility_id = $${params.length}`;
    }
    if (date) {
      params.push(date);
      query += ` AND a.date = $${params.length}`;
    }
    if (status) {
      params.push(status);
      query += ` AND a.status = $${params.length}`;
    }

    query += ' ORDER BY a.date DESC, a.check_in ASC LIMIT 150';

    const resDb = await pool.query(query, params);
    return res.json({ success: true, data: resDb.rows, requestId: req.requestId });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: err.message }, requestId: req.requestId });
  }
});

const punchSchema = z.object({
  staffId: z.number().int(),
  facilityId: z.number().int(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkIn: z.string().optional(),
  checkOut: z.string().optional(),
  status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'LEAVE', 'OFF_DUTY']),
  remarks: z.string().optional(),
});

apiRouter.post('/attendance', authenticate, authorize(['SUPER_ADMIN', 'DISTRICT_ADMIN', 'FACILITY_ADMIN', 'MEDICAL_OFFICER', 'STAFF']), async (req: Request, res: Response) => {
  const parse = punchSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', details: parse.error.format() }, requestId: req.requestId });
  }

  const { staffId, facilityId, date, checkIn, checkOut, status, remarks } = parse.data;

  // Staff can only log their own attendance unless supervisor
  if (req.user!.role === 'STAFF' && req.user!.id !== staffId) {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Staff can only log their own attendance.' }, requestId: req.requestId });
  }

  try {
    const resDb = await pool.query(`
      INSERT INTO attendance (staff_id, facility_id, date, check_in, check_out, status, source, remarks, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, 'WEB_CONSOLE', $7, NOW())
      ON CONFLICT (staff_id, date) DO UPDATE
      SET check_in = COALESCE(EXCLUDED.check_in, attendance.check_in),
          check_out = COALESCE(EXCLUDED.check_out, attendance.check_out),
          status = EXCLUDED.status,
          remarks = EXCLUDED.remarks,
          updated_at = NOW()
      RETURNING *;
    `, [staffId, facilityId, date, checkIn || null, checkOut || null, status, remarks || 'Logged via CAREGRID Web Console']);

    await recordAudit({
      actorUserId: req.user!.id,
      action: 'ATTENDANCE_UPDATED',
      entityType: 'ATTENDANCE',
      entityId: resDb.rows[0].id,
      newValue: resDb.rows[0],
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      requestId: req.requestId,
    });

    realtimeHub.broadcast('attendance.updated', resDb.rows[0]);
    return res.status(201).json({ success: true, data: resDb.rows[0], requestId: req.requestId });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'ATTENDANCE_ERROR', message: err.message }, requestId: req.requestId });
  }
});

// ==========================================
// 6. LEAVE MANAGEMENT & WORKFLOW
// ==========================================
apiRouter.get('/leave', authenticate, async (req: Request, res: Response) => {
  try {
    const { facilityId, status } = req.query;
    let query = `
      SELECT l.*, u.name as staff_name, u.employee_id, u.role as staff_role, u.specialization,
             f.name as facility_name,
             ap.name as approved_by_name
      FROM leave_requests l
      JOIN users u ON l.staff_id = u.id
      JOIN facilities f ON l.facility_id = f.id
      LEFT JOIN users ap ON l.approved_by = ap.id
      WHERE 1=1
    `;
    const params: any[] = [];

    // If role is STAFF, default to only their own leaves unless specified
    if (req.user!.role === 'STAFF') {
      params.push(req.user!.id);
      query += ` AND l.staff_id = $${params.length}`;
    } else if (facilityId) {
      params.push(facilityId);
      query += ` AND l.facility_id = $${params.length}`;
    }

    if (status) {
      params.push(status);
      query += ` AND l.status = $${params.length}`;
    }

    query += ' ORDER BY l.created_at DESC LIMIT 100';

    const resDb = await pool.query(query, params);
    return res.json({ success: true, data: resDb.rows, requestId: req.requestId });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: err.message }, requestId: req.requestId });
  }
});

const submitLeaveSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  leaveType: z.enum(['CASUAL', 'SICK', 'EMERGENCY', 'ANNUAL']),
  reason: z.string().min(5),
});

apiRouter.post('/leave', authenticate, async (req: Request, res: Response) => {
  const parse = submitLeaveSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', details: parse.error.format() }, requestId: req.requestId });
  }

  const { startDate, endDate, leaveType, reason } = parse.data;
  const staffId = req.user!.id;
  const facilityId = req.user!.facilityId;

  if (!facilityId) {
    return res.status(400).json({ success: false, error: { code: 'NO_FACILITY', message: 'User is not assigned to a facility' }, requestId: req.requestId });
  }

  try {
    const resDb = await pool.query(`
      INSERT INTO leave_requests (staff_id, facility_id, start_date, end_date, leave_type, reason, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', NOW(), NOW())
      RETURNING *;
    `, [staffId, facilityId, startDate, endDate, leaveType, reason]);

    await recordAudit({
      actorUserId: staffId,
      action: 'LEAVE_SUBMITTED',
      entityType: 'LEAVE_REQUEST',
      entityId: resDb.rows[0].id,
      newValue: resDb.rows[0],
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      requestId: req.requestId,
    });

    realtimeHub.broadcast('leave.updated', resDb.rows[0]);
    return res.status(201).json({ success: true, data: resDb.rows[0], requestId: req.requestId });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SUBMIT_ERROR', message: err.message }, requestId: req.requestId });
  }
});

apiRouter.patch('/leave/:id/review', authenticate, authorize(['SUPER_ADMIN', 'DISTRICT_ADMIN', 'FACILITY_ADMIN', 'MEDICAL_OFFICER']), async (req: Request, res: Response) => {
  const leaveId = parseInt(req.params.id, 10);
  const { action, rejectionReason } = req.body; // action: 'APPROVE' | 'REJECT'

  if (action !== 'APPROVE' && action !== 'REJECT') {
    return res.status(400).json({ success: false, error: { code: 'INVALID_ACTION', message: 'Action must be APPROVE or REJECT' }, requestId: req.requestId });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const lRes = await client.query('SELECT * FROM leave_requests WHERE id = $1 FOR UPDATE', [leaveId]);
    if (lRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Leave request not found' }, requestId: req.requestId });
    }
    const leave = lRes.rows[0];

    const nextStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';

    const updRes = await client.query(`
      UPDATE leave_requests
      SET status = $1, approved_by = $2, approved_at = NOW(), rejection_reason = $3, updated_at = NOW()
      WHERE id = $4
      RETURNING *;
    `, [nextStatus, req.user!.id, rejectionReason || null, leaveId]);

    // Record audit
    await client.query(`
      INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, previous_value, new_value, ip_address, user_agent, request_id, timestamp)
      VALUES ($1, $2, 'LEAVE_REQUEST', $3, $4, $5, $6, $7, $8, NOW());
    `, [
      req.user!.id,
      action === 'APPROVE' ? 'LEAVE_APPROVED' : 'LEAVE_REJECTED',
      String(leaveId),
      JSON.stringify(leave),
      JSON.stringify(updRes.rows[0]),
      req.ip,
      req.headers['user-agent'],
      req.requestId,
    ]);

    // Notify staff member
    await client.query(`
      INSERT INTO notifications (user_id, facility_id, type, channel, title, message, status, sent_at, delivered_at)
      VALUES ($1, $2, 'LEAVE_STATUS', 'IN_APP', $3, $4, 'DELIVERED', NOW(), NOW());
    `, [
      leave.staff_id,
      leave.facility_id,
      `Leave Request ${nextStatus}`,
      `Your ${leave.leave_type} leave from ${leave.start_date} to ${leave.end_date} has been ${nextStatus.toLowerCase()}.${rejectionReason ? ' Reason: ' + rejectionReason : ''}`,
    ]);

    await client.query('COMMIT');

    realtimeHub.broadcast('leave.updated', updRes.rows[0]);
    return res.json({ success: true, data: updRes.rows[0], requestId: req.requestId });
  } catch (err: any) {
    await client.query('ROLLBACK');
    return res.status(500).json({ success: false, error: { code: 'LEAVE_REVIEW_FAILED', message: err.message }, requestId: req.requestId });
  } finally {
    client.release();
  }
});

// ==========================================
// 7. BACKUP STAFFING RECOMMENDATION & ASSIGNMENT
// ==========================================
apiRouter.get('/backups/recommendations', authenticate, async (req: Request, res: Response) => {
  try {
    const facilityId = parseInt(req.query.facilityId as string, 10) || req.user?.facilityId || 1;
    const date = (req.query.date as string) || new Date().toISOString().slice(0, 10);
    const shiftStart = (req.query.shiftStart as string) || '08:00';
    const shiftEnd = (req.query.shiftEnd as string) || '16:00';
    const originalStaffId = req.query.originalStaffId ? parseInt(req.query.originalStaffId as string, 10) : undefined;
    const specialization = req.query.specialization as string | undefined;

    const recommendations = await computeBackupRecommendations({
      facilityId,
      date,
      shiftStart,
      shiftEnd,
      originalStaffId,
      requiredSpecialization: specialization,
    });

    return res.json({ success: true, data: recommendations, requestId: req.requestId });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'RECOMMENDATION_ERROR', message: err.message }, requestId: req.requestId });
  }
});

apiRouter.get('/backups', authenticate, async (req: Request, res: Response) => {
  try {
    const { facilityId } = req.query;
    const resDb = await pool.query(`
      SELECT b.*, 
             f.name as facility_name,
             orig.name as original_staff_name,
             bkp.name as backup_staff_name,
             s.name as service_name
      FROM backup_assignments b
      JOIN facilities f ON b.facility_id = f.id
      JOIN users orig ON b.original_staff_id = orig.id
      JOIN users bkp ON b.backup_staff_id = bkp.id
      JOIN services s ON b.service_id = s.id
      ${facilityId ? 'WHERE b.facility_id = $1' : ''}
      ORDER BY b.created_at DESC;
    `, facilityId ? [facilityId] : []);

    return res.json({ success: true, data: resDb.rows, requestId: req.requestId });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: err.message }, requestId: req.requestId });
  }
});

const createBackupSchema = z.object({
  facilityId: z.number().int(),
  originalStaffId: z.number().int(),
  backupStaffId: z.number().int(),
  serviceId: z.number().int(),
  assignmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  shiftStart: z.string().default('08:00'),
  shiftEnd: z.string().default('16:00'),
  reason: z.string().min(5),
  explanation: z.string().optional(),
});

apiRouter.post('/backups', authenticate, authorize(['SUPER_ADMIN', 'DISTRICT_ADMIN', 'FACILITY_ADMIN', 'MEDICAL_OFFICER']), async (req: Request, res: Response) => {
  const parse = createBackupSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', details: parse.error.format() }, requestId: req.requestId });
  }

  const { facilityId, originalStaffId, backupStaffId, serviceId, assignmentDate, shiftStart, shiftEnd, reason, explanation } = parse.data;

  try {
    const resDb = await pool.query(`
      INSERT INTO backup_assignments (facility_id, original_staff_id, backup_staff_id, service_id, assignment_date, shift_start, shift_end, status, reason, recommendation_explanation)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'CONFIRMED', $8, $9)
      RETURNING *;
    `, [facilityId, originalStaffId, backupStaffId, serviceId, assignmentDate, shiftStart, shiftEnd, reason, explanation || 'Assigned by administrator']);

    await recordAudit({
      actorUserId: req.user!.id,
      action: 'BACKUP_ASSIGNED',
      entityType: 'BACKUP_ASSIGNMENT',
      entityId: resDb.rows[0].id,
      newValue: resDb.rows[0],
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      requestId: req.requestId,
    });

    // Notify backup staff
    await pool.query(`
      INSERT INTO notifications (user_id, facility_id, type, channel, title, message, status, sent_at, delivered_at)
      VALUES ($1, $2, 'BACKUP_ASSIGNMENT', 'IN_APP', 'Backup Assignment Confirmed', $3, 'DELIVERED', NOW(), NOW());
    `, [backupStaffId, facilityId, `You have been deployed as backup staffing for ${assignmentDate} (${shiftStart} - ${shiftEnd}).`]);

    realtimeHub.broadcast('backup.created', resDb.rows[0]);
    return res.status(201).json({ success: true, data: resDb.rows[0], requestId: req.requestId });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'BACKUP_ASSIGN_FAILED', message: err.message }, requestId: req.requestId });
  }
});

// ==========================================
// 8. ALERTS LIFECYCLE
// ==========================================
apiRouter.get('/alerts', authenticate, async (req: Request, res: Response) => {
  try {
    const { facilityId, status, severity } = req.query;
    let query = `
      SELECT a.*, f.name as facility_name, f.district
      FROM alerts a
      JOIN facilities f ON a.facility_id = f.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (facilityId) {
      params.push(facilityId);
      query += ` AND a.facility_id = $${params.length}`;
    }
    if (status) {
      params.push(status);
      query += ` AND a.status = $${params.length}`;
    }
    if (severity) {
      params.push(severity);
      query += ` AND a.severity = $${params.length}`;
    }

    query += ' ORDER BY a.created_at DESC LIMIT 100';

    const resDb = await pool.query(query, params);
    return res.json({ success: true, data: resDb.rows, requestId: req.requestId });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: err.message }, requestId: req.requestId });
  }
});

apiRouter.patch('/alerts/:id/status', authenticate, authorize(['SUPER_ADMIN', 'DISTRICT_ADMIN', 'FACILITY_ADMIN', 'MEDICAL_OFFICER']), async (req: Request, res: Response) => {
  const alertId = parseInt(req.params.id, 10);
  const { status } = req.body; // 'ACKNOWLEDGED' | 'RESOLVED'

  if (status !== 'ACKNOWLEDGED' && status !== 'RESOLVED') {
    return res.status(400).json({ success: false, error: { code: 'INVALID_STATUS', message: 'Status must be ACKNOWLEDGED or RESOLVED' }, requestId: req.requestId });
  }

  try {
    const resDb = await pool.query(`
      UPDATE alerts
      SET status = $1,
          acknowledged_at = CASE WHEN $1 = 'ACKNOWLEDGED' THEN NOW() ELSE acknowledged_at END,
          resolved_at = CASE WHEN $1 = 'RESOLVED' THEN NOW() ELSE resolved_at END,
          assigned_to = COALESCE(assigned_to, $2)
      WHERE id = $3
      RETURNING *;
    `, [status, req.user!.id, alertId]);

    if (resDb.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Alert not found' }, requestId: req.requestId });
    }

    await recordAudit({
      actorUserId: req.user!.id,
      action: status === 'RESOLVED' ? 'ALERT_RESOLVED' : 'ALERT_ACKNOWLEDGED',
      entityType: 'ALERT',
      entityId: alertId,
      newValue: resDb.rows[0],
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      requestId: req.requestId,
    });

    realtimeHub.broadcast('alert.updated', resDb.rows[0]);
    return res.json({ success: true, data: resDb.rows[0], requestId: req.requestId });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'ALERT_UPDATE_FAILED', message: err.message }, requestId: req.requestId });
  }
});

// ==========================================
// 9. NOTIFICATIONS
// ==========================================
apiRouter.get('/notifications', authenticate, async (req: Request, res: Response) => {
  try {
    const resDb = await pool.query(`
      SELECT n.*, f.name as facility_name
      FROM notifications n
      LEFT JOIN facilities f ON n.facility_id = f.id
      WHERE (n.user_id = $1 OR n.user_id IS NULL)
      ORDER BY n.created_at DESC
      LIMIT 50;
    `, [req.user!.id]);

    return res.json({ success: true, data: resDb.rows, requestId: req.requestId });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: err.message }, requestId: req.requestId });
  }
});

apiRouter.patch('/notifications/:id/read', authenticate, async (req: Request, res: Response) => {
  try {
    const notifId = parseInt(req.params.id, 10);
    const resDb = await pool.query(`
      UPDATE notifications SET read_at = NOW() WHERE id = $1 RETURNING *;
    `, [notifId]);
    return res.json({ success: true, data: resDb.rows[0], requestId: req.requestId });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'UPDATE_ERROR', message: err.message }, requestId: req.requestId });
  }
});

// ==========================================
// 10. SYNC PIPELINE & INTEGRATIONS
// ==========================================
apiRouter.get('/sync', authenticate, authorize(['SUPER_ADMIN', 'DISTRICT_ADMIN', 'FACILITY_ADMIN']), async (req: Request, res: Response) => {
  try {
    const resDb = await pool.query(`
      SELECT * FROM sync_events ORDER BY received_at DESC LIMIT 50;
    `);
    return res.json({ success: true, data: resDb.rows, requestId: req.requestId });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: err.message }, requestId: req.requestId });
  }
});

apiRouter.post('/sync/ingest', authenticate, authorize(['SUPER_ADMIN', 'DISTRICT_ADMIN']), async (req: Request, res: Response) => {
  try {
    const { sourceSystem, eventType, externalId, data } = req.body;
    if (!sourceSystem || !eventType || !externalId || !data) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_PAYLOAD', message: 'sourceSystem, eventType, externalId, and data are required' }, requestId: req.requestId });
    }

    const result = await processSyncEvent({ sourceSystem, eventType, externalId, data });
    return res.json({ success: true, data: result, requestId: req.requestId });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SYNC_ERROR', message: err.message }, requestId: req.requestId });
  }
});

// ==========================================
// 11. ANALYTICS & DEMAND FORECASTING (100% DB)
// ==========================================
apiRouter.get('/analytics/workload', authenticate, async (req: Request, res: Response) => {
  try {
    const facId = req.query.facilityId ? parseInt(req.query.facilityId as string, 10) : undefined;
    const analytics = await computeWorkloadAnalytics(facId);
    return res.json({ success: true, data: analytics, requestId: req.requestId });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'ANALYTICS_ERROR', message: err.message }, requestId: req.requestId });
  }
});

apiRouter.get('/predictions', authenticate, async (req: Request, res: Response) => {
  try {
    const { facilityId } = req.query;
    const resDb = await pool.query(`
      SELECT dp.*, f.name as facility_name, s.name as service_name
      FROM demand_predictions dp
      JOIN facilities f ON dp.facility_id = f.id
      JOIN services s ON dp.service_id = s.id
      ${facilityId ? 'WHERE dp.facility_id = $1' : ''}
      ORDER BY dp.prediction_date ASC;
    `, facilityId ? [facilityId] : []);

    return res.json({ success: true, data: resDb.rows, requestId: req.requestId });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: err.message }, requestId: req.requestId });
  }
});

// ==========================================
// 12. AUDIT LOGS & REPORTS
// ==========================================
apiRouter.get('/audit-logs', authenticate, authorize(['SUPER_ADMIN', 'DISTRICT_ADMIN', 'FACILITY_ADMIN']), async (req: Request, res: Response) => {
  try {
    const { action, entityType, limit } = req.query;
    let query = `
      SELECT a.*, u.name as actor_name, u.email as actor_email, u.role as actor_role
      FROM audit_logs a
      LEFT JOIN users u ON a.actor_user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (action) {
      params.push(action);
      query += ` AND a.action = $${params.length}`;
    }
    if (entityType) {
      params.push(entityType);
      query += ` AND a.entity_type = $${params.length}`;
    }

    const lim = Math.min(parseInt(limit as string, 10) || 50, 100);
    params.push(lim);
    query += ` ORDER BY a.timestamp DESC LIMIT $${params.length}`;

    const resDb = await pool.query(query, params);
    return res.json({ success: true, data: resDb.rows, requestId: req.requestId });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: err.message }, requestId: req.requestId });
  }
});

// Operational Rules (Thresholds)
apiRouter.get('/operational-rules', authenticate, async (req: Request, res: Response) => {
  try {
    const resDb = await pool.query('SELECT * FROM operational_rules ORDER BY rule_name ASC');
    return res.json({ success: true, data: resDb.rows, requestId: req.requestId });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: err.message }, requestId: req.requestId });
  }
});

apiRouter.put('/operational-rules/:key', authenticate, authorize(['SUPER_ADMIN']), async (req: Request, res: Response) => {
  const { key } = req.params;
  const { thresholdValue, description } = req.body;

  try {
    const resDb = await pool.query(`
      UPDATE operational_rules
      SET threshold_value = $1,
          description = COALESCE($2, description),
          updated_at = NOW()
      WHERE rule_key = $3
      RETURNING *;
    `, [thresholdValue, description, key]);

    if (resDb.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Rule key not found' }, requestId: req.requestId });
    }

    await recordAudit({
      actorUserId: req.user!.id,
      action: 'OPERATIONAL_RULE_UPDATED',
      entityType: 'CONFIG',
      entityId: key,
      newValue: resDb.rows[0],
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      requestId: req.requestId,
    });

    return res.json({ success: true, data: resDb.rows[0], requestId: req.requestId });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'RULE_UPDATE_FAILED', message: err.message }, requestId: req.requestId });
  }
});
