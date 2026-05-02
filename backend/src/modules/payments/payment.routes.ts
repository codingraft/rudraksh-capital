import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../../config/database';
import { authenticate, authorize, branchFilter } from '../../middleware/auth';
import { auditLog } from '../../middleware/auditLog';
import { AppError } from '../../middleware/errorHandler';
import { generateId, getPagination, paginatedResponse } from '../../utils/helpers';

const router = Router();
router.use(authenticate);
router.use(branchFilter);

const emiPaymentSchema = z.object({
  loanId: z.string().min(1),
  amount: z.number().positive(),
  method: z.enum(['CASH', 'BANK_TRANSFER', 'CHEQUE', 'UPI', 'OTHER']).default('CASH'),
  narration: z.string().optional(),
  chequeNo: z.string().optional(),
  chequeDate: z.string().optional(),
  bankName: z.string().optional(),
});

// POST /api/payments/emi — Collect EMI payment
router.post('/emi', auditLog('Payment'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = emiPaymentSchema.parse(req.body);
    const receiptNo = await generateId('receipt');

    const loan = await prisma.loan.findUnique({
      where: { id: data.loanId },
      include: { emiSchedules: { where: { status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] } }, orderBy: { installment: 'asc' } } },
    });

    if (!loan) throw new AppError('Loan not found', 404);
    if (!['DISBURSED', 'ACTIVE'].includes(loan.status)) {
      throw new AppError('Loan is not active for payment', 400);
    }

    let remainingAmount = data.amount;
    const updatedSchedules: string[] = [];

    // Apply payment to EMI schedules (oldest first)
    await prisma.$transaction(async (tx: any) => {
      for (const emi of loan.emiSchedules) {
        if (remainingAmount <= 0) break;

        const due = Number(emi.amount) + Number(emi.penalty) - Number(emi.paidAmount);
        if (due <= 0) continue;

        const paying = Math.min(remainingAmount, due);
        const newPaid = Number(emi.paidAmount) + paying;
        const totalDue = Number(emi.amount) + Number(emi.penalty);

        await tx.emiSchedule.update({
          where: { id: emi.id },
          data: {
            paidAmount: newPaid,
            paidDate: new Date(),
            status: newPaid >= totalDue ? 'PAID' : 'PARTIAL',
          },
        });

        updatedSchedules.push(emi.id);
        remainingAmount -= paying;
      }

      // Create payment record
      const payment = await tx.payment.create({
        data: {
          receiptNo,
          loanId: data.loanId,
          type: 'EMI',
          method: data.method,
          amount: data.amount,
          narration: data.narration || `EMI payment for ${loan.loanNo}`,
          chequeNo: data.chequeNo,
          chequeDate: data.chequeDate ? new Date(data.chequeDate) : undefined,
          bankName: data.bankName,
          collectedBy: req.user!.name,
          branchId: req.user!.branchId || loan.branchId,
        } as any,
      });

      // Auto-generate voucher for EMI collection
      const voucherNo = await generateId('voucher');
      await tx.voucher.create({
        data: {
          voucherNo,
          type: 'RECEIPT',
          amount: data.amount,
          accountHead: 'EMI Collection',
          narration: `EMI collection for ${loan.loanNo} - Receipt ${receiptNo}`,
          branchId: req.user!.branchId || loan.branchId,
          createdBy: req.user!.name,
          status: 'APPROVED',
          approvedBy: 'Auto',
          approvedAt: new Date(),
        },
      });

      // Create account entry
      await tx.accountEntry.create({
        data: {
          accountHead: 'EMI Collection',
          type: 'CREDIT',
          amount: data.amount,
          narration: `EMI payment - ${loan.loanNo} - ${receiptNo}`,
          branchId: req.user!.branchId || loan.branchId,
          createdBy: req.user!.name,
        },
      });

      // Update loan status to ACTIVE if first payment
      if (loan.status === 'DISBURSED') {
        await tx.loan.update({ where: { id: loan.id }, data: { status: 'ACTIVE' } });
      }

      // Check if all EMIs are paid — close loan
      const pendingEMIs = await tx.emiSchedule.count({
        where: { loanId: loan.id, status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] } },
      });
      if (pendingEMIs === 0) {
        await tx.loan.update({ where: { id: loan.id }, data: { status: 'CLOSED', closedDate: new Date() } });
      }

      return payment;
    });

    res.status(201).json({
      success: true,
      data: { receiptNo, amount: data.amount, updatedSchedules: updatedSchedules.length },
      message: `Payment of ₹${data.amount} collected. Receipt: ${receiptNo}`,
    });
  } catch (error: any) { next(error); }
});

// POST /api/payments/non-emi — Non-EMI payment (interest only, etc.)
router.post('/non-emi', auditLog('Payment'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { loanId, amount, method, narration } = req.body;
    if (!loanId || !amount) throw new AppError('Loan ID and amount required', 400);

    const loan = await prisma.loan.findUnique({ where: { id: loanId } });
    if (!loan) throw new AppError('Loan not found', 404);

    const receiptNo = await generateId('receipt');
    const payment = await prisma.payment.create({
      data: {
        receiptNo,
        loanId,
        type: 'NON_EMI',
        method: method || 'CASH',
        amount,
        narration: narration || `Non-EMI payment for ${loan.loanNo}`,
        collectedBy: req.user!.name,
        branchId: req.user!.branchId || loan.branchId,
      } as any,
    });

    res.status(201).json({ success: true, data: payment, message: `Non-EMI payment collected. Receipt: ${receiptNo}` });
  } catch (error: any) { next(error); }
});

// POST /api/payments/part-payment — Part payment against principal
router.post('/part-payment', auditLog('Payment'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { loanId, amount, method, narration } = req.body;
    if (!loanId || !amount) throw new AppError('Loan ID and amount required', 400);

    const loan = await prisma.loan.findUnique({ 
      where: { id: loanId },
      include: { emiSchedules: { orderBy: { installment: 'asc' } } }
    });
    if (!loan) throw new AppError('Loan not found', 404);
    if (!['DISBURSED', 'ACTIVE'].includes(loan.status)) {
      throw new AppError('Loan is not active for part payment', 400);
    }

    const pendingEmis = loan.emiSchedules.filter(e => e.status === 'PENDING');
    if (pendingEmis.length === 0) throw new AppError('No pending EMIs left to deduct from', 400);

    const remainingPrincipal = pendingEmis.reduce((sum, e) => sum + Number(e.principal), 0);
    if (amount >= remainingPrincipal) throw new AppError('Part payment exceeds or equals remaining principal. Use foreclosure instead.', 400);

    const receiptNo = await generateId('receipt');
    
    // We apply part payment by reducing principal starting from the last EMIs (Tenure Reduction Method)
    let leftToReduce = amount;
    const updates: any[] = [];
    
    for (let i = pendingEmis.length - 1; i >= 0; i--) {
      const emi = pendingEmis[i];
      const pAmt = Number(emi.principal);
      
      if (leftToReduce <= 0) break;
      
      if (leftToReduce >= pAmt) {
        // This EMI principal is fully paid off by part payment
        leftToReduce -= pAmt;
        updates.push(prisma.emiSchedule.update({
          where: { id: emi.id },
          data: { principal: 0, interest: 0, amount: 0, status: 'PAID', paidAmount: 0 } // Cancelled by advance
        }));
      } else {
        // Partially reduces this EMI
        const newPrincipal = pAmt - leftToReduce;
        // Keep interest same (simple flat logic) or proportional. Let's keep interest same for now, just reduce amount.
        const newAmount = newPrincipal + Number(emi.interest);
        updates.push(prisma.emiSchedule.update({
          where: { id: emi.id },
          data: { 
            principal: newPrincipal, 
            amount: newAmount
          }
        }));
        leftToReduce = 0;
      }
    }

    const payment = await prisma.payment.create({
      data: {
        receiptNo,
        loanId,
        type: 'PART_PAYMENT',
        method: method || 'CASH',
        amount,
        narration: narration || `Part payment against principal for ${loan.loanNo}`,
        collectedBy: req.user!.name,
        branchId: req.user!.branchId || loan.branchId,
      } as any,
    });
    
    // Process all EMI updates
    await prisma.$transaction(updates);

    res.status(201).json({ success: true, data: payment, message: `Part payment of ₹${amount} collected. Remaining tenure reduced. Receipt: ${receiptNo}` });
  } catch (error: any) { next(error); }
});

// POST /api/payments/commission — Commission payment to advisor
router.post('/commission', authorize('SUPER_ADMIN', 'BRANCH_MANAGER'), auditLog('Payment'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { advisorId, amount, method, narration, loanId } = req.body;
      if (!advisorId || !amount) throw new AppError('Advisor ID and amount required', 400);

      const advisor = await prisma.advisor.findUnique({ where: { id: advisorId } });
      if (!advisor) throw new AppError('Advisor not found', 404);

      const receiptNo = await generateId('receipt');
      const voucherNo = await generateId('voucher');

      await prisma.$transaction(async (tx: any) => {
        // Create payment
        await tx.payment.create({
          data: {
            receiptNo,
            loanId: loanId || null,
            type: 'COMMISSION',
            method: method || 'CASH',
            amount,
            narration: narration || `Commission payment to ${advisor.name}`,
            collectedBy: req.user!.name,
            branchId: req.user!.branchId!,
            advisorId,
          },
        });

        // Create voucher
        await tx.voucher.create({
          data: {
            voucherNo,
            type: 'PAYMENT',
            amount,
            accountHead: 'Commission Expense',
            narration: `Commission to ${advisor.name} (${advisor.advisorId})`,
            branchId: req.user!.branchId!,
            createdBy: req.user!.name,
            advisorId,
            status: 'PAID',
            approvedBy: req.user!.name,
            approvedAt: new Date(),
            paidBy: req.user!.name,
            paidAt: new Date(),
          },
        });
      });

      res.status(201).json({ success: true, message: `Commission ₹${amount} paid to ${advisor.name}. Receipt: ${receiptNo}` });
    } catch (error: any) { next(error); }
  }
);

// POST /api/payments/general — General payment
router.post('/general', auditLog('Payment'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { amount, type, method, narration, loanId } = req.body;
    if (!amount || amount <= 0) throw new AppError('Valid amount required', 400);

    const receiptNo = await generateId('receipt');
    const payment = await prisma.payment.create({
      data: {
        receiptNo,
        loanId: loanId || null,
        type: type || 'GENERAL',
        method: method || 'CASH',
        amount,
        narration: narration || 'General payment',
        collectedBy: req.user!.name,
        branchId: req.user!.branchId!,
      } as any,
    });

    res.status(201).json({ success: true, data: payment });
  } catch (error: any) { next(error); }
});

// PUT /api/payments/:id — Modify payment (admin only)
router.put('/:id', authorize('SUPER_ADMIN'), auditLog('Payment'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const existing = await prisma.payment.findUnique({ where: { id: (req.params.id as string) } });
      if (!existing) throw new AppError('Payment not found', 404);

      const updated = await prisma.payment.update({
        where: { id: (req.params.id as string) },
        data: {
          amount: req.body.amount || existing.amount,
          method: req.body.method || existing.method,
          narration: req.body.narration || existing.narration,
          isModified: true,
          modifiedBy: req.user!.name,
          modifiedAt: new Date(),
        },
      });

      res.json({ success: true, data: updated, message: 'Payment modified' });
    } catch (error: any) { next(error); }
  }
);

// GET /api/payments — List payments
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bf = (req as any).branchFilter;
    const where: any = { ...bf };

    if ((req.query.type as string)) where.type = (req.query.type as string);
    if ((req.query.loanId as string)) where.loanId = (req.query.loanId as string);
    if ((req.query.method as string)) where.method = (req.query.method as string);
    if ((req.query.search as string)) {
      where.OR = [
        { receiptNo: { contains: (req.query.search as string), mode: 'insensitive' } },
        { narration: { contains: (req.query.search as string), mode: 'insensitive' } },
        { collectedBy: { contains: (req.query.search as string), mode: 'insensitive' } },
      ];
    }
    if ((req.query.date as string)) {
      const d = new Date((req.query.date as string));
      const nextD = new Date(d); nextD.setDate(nextD.getDate() + 1);
      where.createdAt = { gte: d, lt: nextD };
    }
    if ((req.query.fromDate as string) || (req.query.toDate as string)) {
      where.createdAt = where.createdAt || {};
      if ((req.query.fromDate as string)) where.createdAt.gte = new Date((req.query.fromDate as string));
      if ((req.query.toDate as string)) where.createdAt.lte = new Date((req.query.toDate as string));
    }

    const payments = await prisma.payment.findMany({
      where,
      include: {
        loan: { select: { loanNo: true, customer: { select: { name: true, customerId: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const total = payments.reduce((s, p) => s + Number(p.amount), 0);

    res.json({ success: true, data: payments, summary: { total, count: payments.length } });
  } catch (error: any) { next(error); }
});

// GET /api/payments/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: (req.params.id as string) },
      include: {
        loan: { select: { loanNo: true, customer: { select: { name: true, customerId: true, phone: true, address: true } } } },
      },
    });
    if (!payment) throw new AppError('Payment not found', 404);
    res.json({ success: true, data: payment });
  } catch (error: any) { next(error); }
});

export default router;
