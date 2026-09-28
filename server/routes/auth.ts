import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { pool } from '../../src/db/index';
import { generateToken, authenticate, AuthenticatedUser } from '../middleware/auth';
import { recordAudit } from '../services/audit';

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post('/login', async (req: Request, res: Response) => {
  const parse = loginSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid credentials format', details: parse.error.format() },
      requestId: req.requestId,
    });
  }

  const { email, password } = parse.data;

  try {
    const userQuery = await pool.query(`
      SELECT id, employee_id, name, email, password_hash, role, facility_id, status, preferred_language
      FROM users WHERE email = $1;
    `, [email]);

    if (userQuery.rows.length === 0) {
      await recordAudit({
        action: 'LOGIN_FAILED',
        entityType: 'AUTH',
        newValue: { email, reason: 'USER_NOT_FOUND' },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        requestId: req.requestId,
      });

      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' },
        requestId: req.requestId,
      });
    }

    const user = userQuery.rows[0];

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        error: { code: 'ACCOUNT_SUSPENDED', message: 'Account is suspended or deactivated.' },
        requestId: req.requestId,
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      await recordAudit({
        actorUserId: user.id,
        action: 'LOGIN_FAILED',
        entityType: 'AUTH',
        entityId: user.id,
        newValue: { email, reason: 'BAD_PASSWORD' },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        requestId: req.requestId,
      });

      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' },
        requestId: req.requestId,
      });
    }

    // Update last login
    await pool.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

    const authUser: AuthenticatedUser = {
      id: user.id,
      employeeId: user.employee_id,
      name: user.name,
      email: user.email,
      role: user.role,
      facilityId: user.facility_id,
      preferredLanguage: user.preferred_language,
    };

    const token = generateToken(authUser);

    await recordAudit({
      actorUserId: user.id,
      action: 'LOGIN_SUCCESS',
      entityType: 'AUTH',
      entityId: user.id,
      newValue: { email, role: user.role },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      requestId: req.requestId,
    });

    return res.status(200).json({
      success: true,
      data: {
        token,
        user: authUser,
      },
      requestId: req.requestId,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message },
      requestId: req.requestId,
    });
  }
});

authRouter.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    const userRes = await pool.query(`
      SELECT u.id, u.employee_id, u.name, u.email, u.phone, u.role, u.facility_id, u.status, u.preferred_language, u.specialization,
             f.name as facility_name
      FROM users u
      LEFT JOIN facilities f ON u.facility_id = f.id
      WHERE u.id = $1;
    `, [req.user!.id]);

    if (userRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User does not exist.' },
        requestId: req.requestId,
      });
    }

    return res.json({
      success: true,
      data: userRes.rows[0],
      requestId: req.requestId,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message },
      requestId: req.requestId,
    });
  }
});

authRouter.post('/logout', authenticate, async (req: Request, res: Response) => {
  await recordAudit({
    actorUserId: req.user!.id,
    action: 'LOGOUT',
    entityType: 'AUTH',
    entityId: req.user!.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
    requestId: req.requestId,
  });

  return res.json({
    success: true,
    data: { message: 'Logged out successfully.' },
    requestId: req.requestId,
  });
});
