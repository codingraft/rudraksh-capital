import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../../config/database';
import { authenticate, branchFilter } from '../../middleware/auth';
import { auditLog } from '../../middleware/auditLog';
import { AppError } from '../../middleware/errorHandler';
import { generateId, getPagination, paginatedResponse } from '../../utils/helpers';

const router = Router();
router.use(authenticate);
router.use(branchFilter);

const advisorSchema = z.object({
  name: z.string().min(1),
  fatherName: z.string().optional(),
  phone: z.string().min(10),
  altPhone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  aadhaarNo: z.string().optional(),
  panNo: z.string().optional(),
  rankId: z.string().optional(),
  commPlanId: z.string().optional(),
  uplineId: z.string().optional(),
  branchId: z.string().optional(),
});

// GET /api/advisors
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const bf = (req as any).branchFilter;
    const where: any = { ...bf };

    if ((req.query.search as string)) {
      const s = (req.query.search as string);
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { phone: { contains: s } },
        { advisorId: { contains: s, mode: 'insensitive' } },
      ];
    }
    if ((req.query.isActive as string) !== undefined) where.isActive = (req.query.isActive as string) === 'true';

    const [advisors, total] = await Promise.all([
      prisma.advisor.findMany({
        where,
        include: {
          branch: { select: { id: true, name: true, code: true } },
          rank: { select: { id: true, name: true } },
          commissionPlan: { select: { id: true, name: true, type: true, value: true } },
          upline: { select: { id: true, advisorId: true, name: true } },
          _count: { select: { downline: true, loans: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip, take: limit,
      }),
      prisma.advisor.count({ where }),
    ]);
    res.json(paginatedResponse(advisors, total, page, limit));
  } catch (error: any) { next(error); }
});

// GET /api/advisors/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const advisor = await prisma.advisor.findUnique({
      where: { id: (req.params.id as string) },
      include: {
        branch: { select: { id: true, name: true } },
        rank: true,
        commissionPlan: true,
        upline: { select: { id: true, advisorId: true, name: true } },
        downline: { select: { id: true, advisorId: true, name: true, phone: true, isActive: true } },
        loans: {
          select: { id: true, loanNo: true, amount: true, status: true, customer: { select: { name: true } } },
          orderBy: { createdAt: 'desc' }, take: 20,
        },
      },
    });
    if (!advisor) throw new AppError('Advisor not found', 404);
    res.json({ success: true, data: advisor });
  } catch (error: any) { next(error); }
});

// POST /api/advisors
router.post('/', auditLog('Advisor'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = advisorSchema.parse(req.body);
    const advisorId = await generateId('advisor');
    const advisor = await prisma.advisor.create({
      data: {
        advisorId,
        name: data.name,
        fatherName: data.fatherName,
        phone: data.phone,
        altPhone: data.altPhone,
        email: data.email || undefined,
        address: data.address,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
        aadhaarNo: data.aadhaarNo,
        panNo: data.panNo,
        branch: { connect: { id: data.branchId || req.user!.branchId! } },
        ...(data.rankId ? { rank: { connect: { id: data.rankId } } } : {}),
        ...(data.commPlanId ? { commissionPlan: { connect: { id: data.commPlanId } } } : {}),
        ...(data.uplineId ? { upline: { connect: { id: data.uplineId } } } : {}),
      } as any,
      include: { branch: { select: { id: true, name: true } }, rank: true },
    });
    res.status(201).json({ success: true, data: advisor });
  } catch (error: any) { next(error); }
});

// PUT /api/advisors/:id
router.put('/:id', auditLog('Advisor'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = advisorSchema.partial().parse(req.body);
    const advisor = await prisma.advisor.update({
      where: { id: (req.params.id as string) },
      data: data as any,
      include: { branch: { select: { id: true, name: true } }, rank: true },
    });
    res.json({ success: true, data: advisor });
  } catch (error: any) { next(error); }
});

// PATCH /api/advisors/:id/status
router.patch('/:id/status', auditLog('Advisor'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const advisor = await prisma.advisor.update({
      where: { id: (req.params.id as string) },
      data: { isActive: req.body.isActive },
      select: { id: true, advisorId: true, name: true, isActive: true },
    });
    res.json({ success: true, data: advisor });
  } catch (error: any) { next(error); }
});

// GET /api/advisors/:id/joining-report
router.get('/:id/joining-report', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const advisor = await prisma.advisor.findUnique({
      where: { id: (req.params.id as string) },
      include: {
        branch: true, rank: true, commissionPlan: true,
        upline: { select: { advisorId: true, name: true, phone: true } },
      },
    });
    if (!advisor) throw new AppError('Advisor not found', 404);
    res.json({ success: true, data: advisor });
  } catch (error: any) { next(error); }
});

export default router;
