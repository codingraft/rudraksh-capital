import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import prisma from '../config/database';
import { Role } from '@prisma/client';
import { AppError } from './errorHandler';

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
        name: string;
        role: Role;
        branchId: string | null;
      };
    }
  }
}

// Verify JWT token
export const authenticate = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.token;

    if (!token) {
      throw new AppError('Access denied. No token provided.', 401);
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as { id: string };

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, username: true, name: true, role: true, branchId: true, isBlocked: true },
    });

    if (!user) {
      throw new AppError('User not found', 401);
    }

    if (user.isBlocked) {
      throw new AppError('Your account has been blocked. Contact admin.', 403);
    }

    req.user = {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      branchId: user.branchId,
    };

    next();
  } catch (error: any) {
    next(error);
  }
};

// Role-based authorization
export const authorize = (...roles: Role[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }

    next();
  };
};

// Branch-level data filter — auto-adds branchId to queries for non-admins
export const branchFilter = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new AppError('Authentication required', 401));
  }

  // Super admin sees everything
  if (req.user.role === 'SUPER_ADMIN') {
    (req as any).branchFilter = {};
  } else {
    // Everyone else sees only their branch
    (req as any).branchFilter = { branchId: req.user.branchId };
  }

  next();
};
