import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import prisma from '../../config/database';
import { env } from '../../config/env';
import { authenticate, authorize } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';

const router = Router();

// Validation schemas
const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

const createUserSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6),
  name: z.string().min(1),
  role: z.enum(['SUPER_ADMIN', 'BRANCH_MANAGER', 'CASHIER', 'ADVISOR']),
  branchId: z.string().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { username },
      include: { branch: { select: { id: true, name: true, code: true } } },
    });

    if (!user) {
      throw new AppError('Invalid username or password', 401);
    }

    if (user.isBlocked) {
      throw new AppError('Your account has been blocked. Contact admin.', 403);
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new AppError('Invalid username or password', 401);
    }

    const token = jwt.sign({ id: user.id }, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as any,
    });

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
          branch: user.branch,
        },
      },
    });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true, username: true, name: true, role: true,
        branch: { select: { id: true, name: true, code: true } },
        createdAt: true,
      },
    });

    res.json({ success: true, data: user });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/auth/change-password
router.post('/change-password', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) throw new AppError('User not found', 404);

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) throw new AppError('Current password is incorrect', 400);

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { password: hashedPassword },
    });

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error: any) {
    next(error);
  }
});

// ==================== USER MANAGEMENT (Admin Only) ====================

// GET /api/auth/users
router.get('/users', authenticate, authorize('SUPER_ADMIN', 'BRANCH_MANAGER'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const where: any = {};

    // Branch managers can only see users in their branch
    if (req.user!.role === 'BRANCH_MANAGER') {
      where.branchId = req.user!.branchId;
    }

    if ((req.query.role as string)) where.role = (req.query.role as string);
    if ((req.query.branchId as string)) where.branchId = (req.query.branchId as string);
    if ((req.query.search as string)) {
      where.OR = [
        { name: { contains: (req.query.search as string), mode: 'insensitive' } },
        { username: { contains: (req.query.search as string), mode: 'insensitive' } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true, username: true, name: true, role: true, isBlocked: true,
        branch: { select: { id: true, name: true, code: true } },
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: users });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/auth/users — Create user
router.post('/users', authenticate, authorize('SUPER_ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createUserSchema.parse(req.body);
    const hashedPassword = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: { 
        username: data.username,
        name: data.name,
        role: data.role,
        password: hashedPassword,
        ...(data.branchId ? { branch: { connect: { id: data.branchId } } } : {})
      } as any,
      select: {
        id: true, username: true, name: true, role: true,
        branch: { select: { id: true, name: true } },
        createdAt: true,
      },
    });

    res.status(201).json({ success: true, data: user });
  } catch (error: any) {
    next(error);
  }
});

// PATCH /api/auth/users/:id/block — Block/Unblock user
router.patch('/users/:id/block', authenticate, authorize('SUPER_ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.update({
      where: { id: (req.params.id as string) },
      data: { isBlocked: req.body.isBlocked },
      select: { id: true, username: true, name: true, isBlocked: true },
    });

    res.json({ success: true, data: user });
  } catch (error: any) {
    next(error);
  }
});

// PUT /api/auth/users/:id — Update user
router.put('/users/:id', authenticate, authorize('SUPER_ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, role, branchId, password } = req.body;
    const updateData: any = {};

    if (name) updateData.name = name;
    if (role) updateData.role = role;
    if (branchId !== undefined) updateData.branchId = branchId;
    if (password) updateData.password = await bcrypt.hash(password, 12);

    const user = await prisma.user.update({
      where: { id: (req.params.id as string) },
      data: updateData,
      select: {
        id: true, username: true, name: true, role: true, isBlocked: true,
        branch: { select: { id: true, name: true } },
      },
    });

    res.json({ success: true, data: user });
  } catch (error: any) {
    next(error);
  }
});

// DELETE /api/auth/users/:id
router.delete('/users/:id', authenticate, authorize('SUPER_ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Prevent self-deletion
    if ((req.params.id as string) === req.user!.id) {
      throw new AppError('Cannot delete your own account', 400);
    }

    await prisma.user.delete({ where: { id: (req.params.id as string) } });
    res.json({ success: true, message: 'User deleted' });
  } catch (error: any) {
    next(error);
  }
});

export default router;
