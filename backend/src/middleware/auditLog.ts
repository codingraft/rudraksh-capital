import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';

// Audit log middleware — logs all data modifications
export const auditLog = (entity: string) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    // Store original json method to intercept response
    const originalJson = _res.json.bind(_res);

    _res.json = (body: any) => {
      // Only log successful mutations
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && _res.statusCode < 400) {
        const action = req.method === 'POST' ? 'CREATE'
          : req.method === 'DELETE' ? 'DELETE'
          : 'UPDATE';

        prisma.auditLog.create({
          data: {
            userId: req.user?.id || 'system',
            userName: req.user?.name || 'system',
            action,
            entity,
            entityId: req.params.id || body?.data?.id || 'unknown',
            newData: req.method !== 'DELETE' ? req.body : undefined,
            ipAddress: req.ip || req.socket.remoteAddress,
          },
        }).catch((err: any) => console.error('Audit log failed:', err));
      }

      return originalJson(body);
    };

    next();
  };
};
