import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';

export interface AdminTokenPayload {
  adminId: string;
  email: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      admin?: { id: string; email: string; name: string; role: string };
    }
  }
}

export async function requireAdminAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    let token = req.cookies?.admin_token;
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) throw new UnauthorizedError('Authentication required. No session found.');

    const payload = jwt.verify(token, env.SESSION_SECRET) as AdminTokenPayload;
    const admin = await prisma.adminUser.findUnique({
      where: { id: payload.adminId },
      select: { id: true, email: true, name: true, role: true, isActive: true }
    });

    if (!admin || !admin.isActive) throw new UnauthorizedError('Admin account inactive or not found.');

    req.admin = admin;
    next();
  } catch (error) {
    next(error);
  }
}

export function requireAdminRole(allowedRoles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.admin) return next(new UnauthorizedError());
    if (!allowedRoles.includes(req.admin.role)) {
      return next(new ForbiddenError('You do not have permission to access this resource.'));
    }
    next();
  };
}
