import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error(
      'JWT_SECRET must be configured and contain at least 32 characters.',
    );
  }

  return secret;
}

export interface AuthenticatedUser {
  id: number;
  employeeId: string;
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'DISTRICT_ADMIN' | 'FACILITY_ADMIN' | 'MEDICAL_OFFICER' | 'STAFF' | 'VIEWER';
  facilityId: number | null;
  preferredLanguage: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      requestId?: string;
    }
  }
}

export function generateToken(user: AuthenticatedUser): string {
  return jwt.sign(user, getJwtSecret(), { expiresIn: '12h' });
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required. Missing Bearer token.',
      },
      requestId: req.requestId,
    });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, getJwtSecret());

    if (typeof decoded !== 'object' || decoded === null) {
      throw new Error('Invalid token payload.');
    }

    req.user = decoded as unknown as AuthenticatedUser;
    next();
  } catch {
    return res.status(401).json({
      success: false,
      error: {
        code: 'TOKEN_INVALID_OR_EXPIRED',
        message: 'Session expired or token invalid. Please log in again.',
      },
      requestId: req.requestId,
    });
  }
}

export function authorize(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required.',
        },
        requestId: req.requestId,
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Access denied. Role ${req.user.role} does not have required permissions: [${roles.join(', ')}]`,
        },
        requestId: req.requestId,
      });
    }

    next();
  };
}
