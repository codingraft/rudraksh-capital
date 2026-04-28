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

const customerSchema = z.object({
  name: z.string().min(1),
  fatherName: z.string().optional(),
  motherName: z.string().optional(),
  spouseName: z.string().optional(),
  phone: z.string().min(10),
  altPhone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  dob: z.string().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  address: z.string().min(1),
  city: z.string().optional(),
  district: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  aadhaarNo: z.string().optional(),
  panNo: z.string().optional(),
  nominee: z.string().optional(),
  nomineeRel: z.string().optional(),
  nomineePhone: z.string().optional(),
  shareAmount: z.number().optional(),
  branchId: z.string().optional(),
});

// GET /api/customers
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
        { customerId: { contains: s, mode: 'insensitive' } },
        { aadhaarNo: { contains: s } },
      ];
    }
    if ((req.query.isActive as string) !== undefined) where.isActive = (req.query.isActive as string) === 'true';
    if ((req.query.branchId as string) && req.user!.role === 'SUPER_ADMIN') where.branchId = (req.query.branchId as string);

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: { branch: { select: { id: true, name: true, code: true } } },
        orderBy: { createdAt: 'desc' },
        skip, take: limit,
      }),
      prisma.customer.count({ where }),
    ]);

    res.json(paginatedResponse(customers, total, page, limit));
  } catch (error: any) { next(error); }
});

// GET /api/customers/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: (req.params.id as string) },
      include: {
        branch: { select: { id: true, name: true, code: true } },
        loans: {
          select: { id: true, loanNo: true, amount: true, status: true, loanProduct: { select: { name: true } }, appliedDate: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!customer) throw new AppError('Customer not found', 404);
    res.json({ success: true, data: customer });
  } catch (error: any) { next(error); }
});

// POST /api/customers
router.post('/', auditLog('Customer'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = customerSchema.parse(req.body);
    const customerId = await generateId('customer');
    const customer = await prisma.customer.create({
      data: {
        ...data, customerId,
        dob: data.dob ? new Date(data.dob) : undefined,
        branchId: data.branchId || req.user!.branchId!,
        shareAmount: data.shareAmount || 0,
      } as any,
      include: { branch: { select: { id: true, name: true } } },
    });
    res.status(201).json({ success: true, data: customer });
  } catch (error: any) { next(error); }
});

// PUT /api/customers/:id
router.put('/:id', auditLog('Customer'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = customerSchema.partial().parse(req.body);
    const customer = await prisma.customer.update({
      where: { id: (req.params.id as string) },
      data: { ...data, dob: data.dob ? new Date(data.dob) : undefined } as any,
      include: { branch: { select: { id: true, name: true } } },
    });
    res.json({ success: true, data: customer });
  } catch (error: any) { next(error); }
});

// PATCH /api/customers/:id/status
router.patch('/:id/status', auditLog('Customer'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customer = await prisma.customer.update({
      where: { id: (req.params.id as string) },
      data: { isActive: req.body.isActive },
      select: { id: true, customerId: true, name: true, isActive: true },
    });
    res.json({ success: true, data: customer });
  } catch (error: any) { next(error); }
});

// POST /api/customers/:id/kyc
router.post('/:id/kyc', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { photo, signature, kycDocs } = req.body;
    const updateData: any = {};
    if (photo) updateData.photo = photo;
    if (signature) updateData.signature = signature;
    if (kycDocs) updateData.kycDocs = kycDocs;

    const customer = await prisma.customer.update({
      where: { id: (req.params.id as string) },
      data: updateData,
      select: { id: true, customerId: true, name: true, photo: true, signature: true, kycDocs: true },
    });
    res.json({ success: true, data: customer });
  } catch (error: any) { next(error); }
});

export default router;
