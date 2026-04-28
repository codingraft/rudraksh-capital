import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../../config/database';
import { authenticate, branchFilter } from '../../middleware/auth';
import { auditLog } from '../../middleware/auditLog';
import { generateId } from '../../utils/helpers';

const router = Router();
router.use(authenticate);
router.use(branchFilter);

// POST /api/vouchers
router.post('/', auditLog('Voucher'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = req.body;
    const voucherNo = await generateId('voucher');

    const voucher = await prisma.voucher.create({
      data: {
        ...data, voucherNo,
        date: data.date ? new Date(data.date) : new Date(),
        branchId: data.branchId || req.user!.branchId!,
        createdBy: req.user!.name,
      } as any,
    });

    res.status(201).json({ success: true, data: voucher });
  } catch (error: any) { next(error); }
});

// GET /api/vouchers
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bf = (req as any).branchFilter;
    const where: any = { ...bf };
    if ((req.query.type as string)) where.type = (req.query.type as string);
    if ((req.query.status as string)) where.status = (req.query.status as string);
    if ((req.query.fromDate as string) || (req.query.toDate as string)) {
      where.date = {};
      if ((req.query.fromDate as string)) where.date.gte = new Date((req.query.fromDate as string));
      if ((req.query.toDate as string)) where.date.lte = new Date((req.query.toDate as string));
    }

    const vouchers = await prisma.voucher.findMany({ where, orderBy: { createdAt: 'desc' }, take: 100 });
    res.json({ success: true, data: vouchers });
  } catch (error: any) { next(error); }
});

// GET /api/vouchers/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const voucher = await prisma.voucher.findUnique({ where: { id: (req.params.id as string) } });
    if (!voucher) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: voucher });
  } catch (error: any) { next(error); }
});

export default router;
