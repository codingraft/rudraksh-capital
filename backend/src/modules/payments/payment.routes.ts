import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../../config/database';
import { authenticate, branchFilter } from '../../middleware/auth';
import { auditLog } from '../../middleware/auditLog';
import { AppError } from '../../middleware/errorHandler';
import { generateId } from '../../utils/helpers';

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

// GET /api/payments — List payments
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bf = (req as any).branchFilter;
    const where: any = { ...bf };

    if ((req.query.type as string)) where.type = (req.query.type as string);
    if ((req.query.loanId as string)) where.loanId = (req.query.loanId as string);
    if ((req.query.date as string)) {
      const d = new Date((req.query.date as string));
      const nextD = new Date(d); nextD.setDate(nextD.getDate() + 1);
      where.createdAt = { gte: d, lt: nextD };
    }

    const payments = await prisma.payment.findMany({
      where,
      include: {
        loan: { select: { loanNo: true, customer: { select: { name: true, customerId: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    res.json({ success: true, data: payments });
  } catch (error: any) { next(error); }
});

export default router;
