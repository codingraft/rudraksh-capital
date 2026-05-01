import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../../config/database';
import { authenticate, authorize, branchFilter } from '../../middleware/auth';
import { auditLog } from '../../middleware/auditLog';
import { AppError } from '../../middleware/errorHandler';
import { generateId } from '../../utils/helpers';

const router = Router();
router.use(authenticate);
router.use(branchFilter);

// POST /api/vouchers - Create voucher
router.post('/', auditLog('Voucher'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = req.body;
    const voucherNo = await generateId('voucher');

    const voucher = await prisma.voucher.create({
      data: {
        voucherNo,
        type: data.type,
        amount: data.amount,
        accountHead: data.accountHead,
        narration: data.narration,
        referenceNo: data.referenceNo,
        advisorId: data.advisorId || undefined,
        date: data.date ? new Date(data.date) : new Date(),
        branchId: data.branchId || req.user!.branchId!,
        createdBy: req.user!.name,
        status: 'PENDING',
      } as any,
    });

    res.status(201).json({ success: true, data: voucher });
  } catch (error: any) { next(error); }
});

// GET /api/vouchers - List vouchers
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bf = (req as any).branchFilter;
    const where: any = { ...bf };
    if ((req.query.type as string)) where.type = (req.query.type as string);
    if ((req.query.status as string)) where.status = (req.query.status as string);
    if ((req.query.advisorId as string)) where.advisorId = (req.query.advisorId as string);
    if ((req.query.search as string)) {
      where.OR = [
        { voucherNo: { contains: (req.query.search as string), mode: 'insensitive' } },
        { accountHead: { contains: (req.query.search as string), mode: 'insensitive' } },
        { narration: { contains: (req.query.search as string), mode: 'insensitive' } },
      ];
    }
    if ((req.query.fromDate as string) || (req.query.toDate as string)) {
      where.date = {};
      if ((req.query.fromDate as string)) where.date.gte = new Date((req.query.fromDate as string));
      if ((req.query.toDate as string)) where.date.lte = new Date((req.query.toDate as string));
    }

    const vouchers = await prisma.voucher.findMany({
      where,
      include: {
        advisor: { select: { id: true, advisorId: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    res.json({ success: true, data: vouchers });
  } catch (error: any) { next(error); }
});

// GET /api/vouchers/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const voucher = await prisma.voucher.findUnique({
      where: { id: (req.params.id as string) },
      include: {
        advisor: { select: { id: true, advisorId: true, name: true, phone: true } },
      },
    });
    if (!voucher) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: voucher });
  } catch (error: any) { next(error); }
});

// PUT /api/vouchers/:id - Update voucher
router.put('/:id', auditLog('Voucher'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.voucher.findUnique({ where: { id: (req.params.id as string) } });
    if (!existing) throw new AppError('Voucher not found', 404);
    if (existing.status !== 'PENDING') throw new AppError('Can only edit pending vouchers', 400);

    const voucher = await prisma.voucher.update({
      where: { id: (req.params.id as string) },
      data: {
        type: req.body.type,
        amount: req.body.amount,
        accountHead: req.body.accountHead,
        narration: req.body.narration,
        referenceNo: req.body.referenceNo,
        advisorId: req.body.advisorId || undefined,
        date: req.body.date ? new Date(req.body.date) : undefined,
      },
    });
    res.json({ success: true, data: voucher });
  } catch (error: any) { next(error); }
});

// PATCH /api/vouchers/:id/approve - Approve voucher
router.patch('/:id/approve', authorize('SUPER_ADMIN', 'BRANCH_MANAGER'), auditLog('Voucher'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const voucher = await prisma.voucher.findUnique({ where: { id: (req.params.id as string) } });
      if (!voucher) throw new AppError('Voucher not found', 404);
      if (voucher.status !== 'PENDING') throw new AppError('Can only approve pending vouchers', 400);

      const updated = await prisma.voucher.update({
        where: { id: (req.params.id as string) },
        data: { status: 'APPROVED', approvedBy: req.user!.name, approvedAt: new Date() },
      });

      // Create account entry for approved voucher
      await prisma.accountEntry.create({
        data: {
          accountHead: voucher.accountHead,
          type: voucher.type === 'RECEIPT' ? 'CREDIT' : 'DEBIT',
          amount: voucher.amount,
          narration: voucher.narration || `Voucher ${voucher.voucherNo}`,
          voucherId: voucher.id,
          branchId: voucher.branchId,
          createdBy: req.user!.name,
        },
      });

      res.json({ success: true, data: updated, message: 'Voucher approved' });
    } catch (error: any) { next(error); }
  }
);

// PATCH /api/vouchers/:id/cancel - Cancel voucher
router.patch('/:id/cancel', authorize('SUPER_ADMIN', 'BRANCH_MANAGER'), auditLog('Voucher'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const voucher = await prisma.voucher.findUnique({ where: { id: (req.params.id as string) } });
      if (!voucher) throw new AppError('Voucher not found', 404);
      if (voucher.status === 'PAID') throw new AppError('Cannot cancel paid vouchers', 400);

      const updated = await prisma.voucher.update({
        where: { id: (req.params.id as string) },
        data: { status: 'CANCELLED' },
      });
      res.json({ success: true, data: updated, message: 'Voucher cancelled' });
    } catch (error: any) { next(error); }
  }
);

// POST /api/vouchers/:id/pay - Pay voucher (commission payout)
router.post('/:id/pay', authorize('SUPER_ADMIN', 'BRANCH_MANAGER', 'CASHIER'), auditLog('Voucher'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const voucher = await prisma.voucher.findUnique({ where: { id: (req.params.id as string) } });
      if (!voucher) throw new AppError('Voucher not found', 404);
      if (voucher.status !== 'APPROVED') throw new AppError('Can only pay approved vouchers', 400);

      const receiptNo = await generateId('receipt');

      await prisma.$transaction(async (tx: any) => {
        // Update voucher status
        await tx.voucher.update({
          where: { id: (req.params.id as string) },
          data: { status: 'PAID', paidBy: req.user!.name, paidAt: new Date() },
        });

        // Create payment record
        await tx.payment.create({
          data: {
            receiptNo,
            type: 'COMMISSION',
            method: req.body.method || 'CASH',
            amount: voucher.amount,
            narration: `Commission payment - Voucher ${voucher.voucherNo}`,
            collectedBy: req.user!.name,
            branchId: voucher.branchId,
            advisorId: voucher.advisorId,
            voucherId: voucher.id,
          },
        });
      });

      res.json({ success: true, message: `Voucher paid. Receipt: ${receiptNo}` });
    } catch (error: any) { next(error); }
  }
);

// GET /api/vouchers/reports/advisor-summary - Voucher summary by advisor
router.get('/reports/advisor-summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bf = (req as any).branchFilter;
    const where: any = { ...bf, advisorId: { not: null } };
    if ((req.query.fromDate as string)) where.date = { ...where.date, gte: new Date((req.query.fromDate as string)) };
    if ((req.query.toDate as string)) where.date = { ...where.date, lte: new Date((req.query.toDate as string)) };

    const vouchers = await prisma.voucher.findMany({
      where,
      include: {
        advisor: { select: { advisorId: true, name: true, phone: true } },
      },
      orderBy: { date: 'desc' },
    });

    // Group by advisor
    const advisorMap: Record<string, { advisor: any; total: number; paid: number; pending: number; count: number }> = {};
    vouchers.forEach(v => {
      if (!v.advisorId) return;
      if (!advisorMap[v.advisorId]) {
        advisorMap[v.advisorId] = { advisor: v.advisor, total: 0, paid: 0, pending: 0, count: 0 };
      }
      advisorMap[v.advisorId].total += Number(v.amount);
      advisorMap[v.advisorId].count++;
      if (v.status === 'PAID') advisorMap[v.advisorId].paid += Number(v.amount);
      else advisorMap[v.advisorId].pending += Number(v.amount);
    });

    res.json({ success: true, data: Object.values(advisorMap) });
  } catch (error: any) { next(error); }
});

// GET /api/vouchers/reports/status - Voucher status report
router.get('/reports/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bf = (req as any).branchFilter;
    const where: any = { ...bf };
    if ((req.query.status as string)) where.status = (req.query.status as string);
    if ((req.query.fromDate as string)) where.date = { ...where.date, gte: new Date((req.query.fromDate as string)) };
    if ((req.query.toDate as string)) where.date = { ...where.date, lte: new Date((req.query.toDate as string)) };

    const vouchers = await prisma.voucher.findMany({
      where,
      include: {
        advisor: { select: { advisorId: true, name: true } },
      },
      orderBy: { date: 'desc' },
    });

    const summary = await prisma.voucher.groupBy({
      by: ['status'],
      where: bf,
      _count: true,
      _sum: { amount: true },
    });

    res.json({ success: true, data: { vouchers, summary } });
  } catch (error: any) { next(error); }
});

export default router;
