import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../../config/database';
import { authenticate, authorize, branchFilter } from '../../middleware/auth';
import { auditLog } from '../../middleware/auditLog';
import { AppError } from '../../middleware/errorHandler';
import { generateId, getPagination, paginatedResponse, calculateEMI, generateEMISchedule } from '../../utils/helpers';

const router = Router();
router.use(authenticate);
router.use(branchFilter);

const loanSchema = z.object({
  customerId: z.string().min(1),
  advisorId: z.string().optional(),
  loanProductId: z.string().min(1),
  amount: z.number().positive(),
  tenure: z.number().int().positive(),
  purpose: z.string().optional(),
  guarantorName: z.string().optional(),
  guarantorPhone: z.string().optional(),
  guarantorAddr: z.string().optional(),
  remarks: z.string().optional(),
  branchId: z.string().optional(),
  // E-Rickshaw specific fields
  vehicleNo: z.string().optional(),
  chassisNo: z.string().optional(),
  motorNo: z.string().optional(),
  batteryNo: z.string().optional(),
  dealerName: z.string().optional(),
  goldItems: z.any().optional(), // Array of { itemName, purity, grossWeight, netWeight }
});

// GET /api/loans
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const bf = (req as any).branchFilter;
    const where: any = { ...bf };

    if ((req.query.search as string)) {
      const s = (req.query.search as string);
      where.OR = [
        { loanNo: { contains: s, mode: 'insensitive' } },
        { customer: { name: { contains: s, mode: 'insensitive' } } },
        { customer: { phone: { contains: s } } },
      ];
    }
    if ((req.query.status as string)) where.status = (req.query.status as string);
    if ((req.query.customerId as string)) where.customerId = (req.query.customerId as string);
    if ((req.query.advisorId as string)) where.advisorId = (req.query.advisorId as string);
    if ((req.query.fromDate as string) || (req.query.toDate as string)) {
      where.appliedDate = {};
      if ((req.query.fromDate as string)) where.appliedDate.gte = new Date((req.query.fromDate as string));
      if ((req.query.toDate as string)) where.appliedDate.lte = new Date((req.query.toDate as string));
    }

    const [loans, total] = await Promise.all([
      prisma.loan.findMany({
        where,
        include: {
          customer: { select: { id: true, customerId: true, name: true, phone: true } },
          advisor: { select: { id: true, advisorId: true, name: true } },
          loanProduct: { select: { id: true, name: true } },
          branch: { select: { id: true, name: true, code: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip, take: limit,
      }),
      prisma.loan.count({ where }),
    ]);
    res.json(paginatedResponse(loans, total, page, limit));
  } catch (error: any) { next(error); }
});

// GET /api/loans/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const loan = await prisma.loan.findUnique({
      where: { id: (req.params.id as string) },
      include: {
        customer: true,
        advisor: { select: { id: true, advisorId: true, name: true, phone: true } },
        loanProduct: true,
        branch: true,
        emiSchedules: { orderBy: { installment: 'asc' } },
        payments: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!loan) throw new AppError('Loan not found', 404);
    res.json({ success: true, data: loan });
  } catch (error: any) { next(error); }
});

// POST /api/loans — New loan requisition
router.post('/', auditLog('Loan'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = loanSchema.parse(req.body);
    const loanNo = await generateId('loan');

    // Get loan product for interest rate and type
    const product = await prisma.loanProduct.findUnique({ where: { id: data.loanProductId } });
    if (!product) throw new AppError('Loan product not found', 404);
    if (!product.isActive) throw new AppError('Loan product is inactive', 400);

    // Validate amount and tenure
    if (data.amount < Number(product.minAmount) || data.amount > Number(product.maxAmount)) {
      throw new AppError(`Amount must be between ${product.minAmount} and ${product.maxAmount}`, 400);
    }
    if (data.tenure < product.minTenure || data.tenure > product.maxTenure) {
      throw new AppError(`Tenure must be between ${product.minTenure} and ${product.maxTenure} months`, 400);
    }

    const { emiAmount, totalInterest, totalPayable } = calculateEMI(
      data.amount, Number(product.interestRate), data.tenure, product.interestType
    );

    const loan = await prisma.loan.create({
      data: {
        loanNo,
        customerId: data.customerId,
        advisorId: data.advisorId,
        branchId: data.branchId || req.user!.branchId!,
        loanProductId: data.loanProductId,
        amount: data.amount,
        interestRate: product.interestRate,
        interestType: product.interestType,
        tenure: data.tenure,
        emiAmount,
        totalInterest,
        totalPayable,
        processingFee: product.processingFee,
        purpose: data.purpose,
        guarantorName: data.guarantorName,
        guarantorPhone: data.guarantorPhone,
        guarantorAddr: data.guarantorAddr,
        // E-Rickshaw fields
        vehicleNo: data.vehicleNo,
        chassisNo: data.chassisNo,
        motorNo: data.motorNo,
        batteryNo: data.batteryNo,
        dealerName: data.dealerName,
        goldItems: data.goldItems,
        remarks: data.remarks,
        status: 'APPLIED',
      } as any,
      include: {
        customer: { select: { customerId: true, name: true } },
        loanProduct: { select: { name: true } },
      },
    });

    res.status(201).json({ success: true, data: loan });
  } catch (error: any) { next(error); }
});

// PATCH /api/loans/:id/approve
router.patch('/:id/approve', authorize('SUPER_ADMIN', 'BRANCH_MANAGER'), auditLog('Loan'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const loan = await prisma.loan.findUnique({ where: { id: (req.params.id as string) } });
      if (!loan) throw new AppError('Loan not found', 404);
      if (loan.status !== 'APPLIED') throw new AppError(`Cannot approve loan with status: ${loan.status}`, 400);

      const updated = await prisma.loan.update({
        where: { id: (req.params.id as string) },
        data: { status: 'APPROVED', approvedDate: new Date(), approvedBy: req.user!.name },
      });
      res.json({ success: true, data: updated, message: 'Loan approved' });
    } catch (error: any) { next(error); }
  }
);

// PATCH /api/loans/:id/reject
router.patch('/:id/reject', authorize('SUPER_ADMIN', 'BRANCH_MANAGER'), auditLog('Loan'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const loan = await prisma.loan.findUnique({ where: { id: (req.params.id as string) } });
      if (!loan) throw new AppError('Loan not found', 404);
      if (loan.status !== 'APPLIED') throw new AppError(`Cannot reject loan with status: ${loan.status}`, 400);

      const updated = await prisma.loan.update({
        where: { id: (req.params.id as string) },
        data: {
          status: 'REJECTED', rejectedDate: new Date(),
          rejectionReason: req.body.reason || 'No reason provided',
        },
      });
      res.json({ success: true, data: updated, message: 'Loan rejected' });
    } catch (error: any) { next(error); }
  }
);

// PATCH /api/loans/:id/disburse
router.patch('/:id/disburse', authorize('SUPER_ADMIN', 'BRANCH_MANAGER'), auditLog('Loan'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const loan = await prisma.loan.findUnique({
        where: { id: (req.params.id as string) },
        include: { loanProduct: true },
      });
      if (!loan) throw new AppError('Loan not found', 404);
      if (loan.status !== 'APPROVED') throw new AppError(`Cannot disburse loan with status: ${loan.status}`, 400);

      const disbursedDate = req.body.disbursedDate ? new Date(req.body.disbursedDate) : new Date();

      // Generate EMI schedule
      const schedule = generateEMISchedule(
        Number(loan.amount), Number(loan.interestRate), loan.tenure, loan.interestType, disbursedDate
      );

      // Transaction: update loan + create EMI schedules
      const updated = await prisma.$transaction(async (tx: any) => {
        const updatedLoan = await tx.loan.update({
          where: { id: (req.params.id as string) },
          data: {
            status: 'DISBURSED',
            disbursedDate,
            disbursedBy: req.user!.name,
            disbursedBank: req.body.bankName,
            disbursedAccNo: req.body.accountNo,
          },
        });

        await tx.emiSchedule.createMany({
          data: schedule.map(s => ({
            loanId: loan.id,
            installment: s.installment,
            dueDate: s.dueDate,
            amount: s.amount,
            principal: s.principal,
            interest: s.interest,
          })),
        });

        return updatedLoan;
      });

      res.json({ success: true, data: updated, message: 'Loan disbursed. EMI schedule generated.' });
    } catch (error: any) { next(error); }
  }
);

// GET /api/loans/:id/schedule
router.get('/:id/schedule', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schedules = await prisma.emiSchedule.findMany({
      where: { loanId: (req.params.id as string) },
      orderBy: { installment: 'asc' },
    });
    res.json({ success: true, data: schedules });
  } catch (error: any) { next(error); }
});

// GET /api/loans/:id/ledger
router.get('/:id/ledger', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [loan, payments, schedules] = await Promise.all([
      prisma.loan.findUnique({
        where: { id: (req.params.id as string) },
        include: { customer: { select: { customerId: true, name: true } }, loanProduct: { select: { name: true } } },
      }),
      prisma.payment.findMany({ where: { loanId: (req.params.id as string) }, orderBy: { createdAt: 'asc' } }),
      prisma.emiSchedule.findMany({ where: { loanId: (req.params.id as string) }, orderBy: { installment: 'asc' } }),
    ]);
    if (!loan) throw new AppError('Loan not found', 404);

    const totalPaid = payments.reduce((sum: number, p: { amount: any; }) => sum + Number(p.amount), 0);
    const totalDue = Number(loan.totalPayable) - totalPaid;

    res.json({
      success: true,
      data: { loan, schedules, payments, summary: { totalPayable: loan.totalPayable, totalPaid, totalDue } },
    });
  } catch (error: any) { next(error); }
});

// GET /api/loans/calculator
router.get('/tools/calculator', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const amount = parseFloat((req.query.amount as string));
    const rate = parseFloat((req.query.rate as string));
    const tenure = parseInt((req.query.tenure as string));
    const type = ((req.query.type as string)) || 'REDUCING';

    if (!amount || !rate || !tenure) throw new AppError('amount, rate, and tenure are required', 400);

    const result = calculateEMI(amount, rate, tenure, type);
    res.json({ success: true, data: result });
  } catch (error: any) { next(error); }
});

// PATCH /api/loans/emi/:id — Modify EMI installment (Super Admin only)
router.patch('/emi/:id', authorize('SUPER_ADMIN'), auditLog('EMI'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { dueDate, amount } = req.body;
      const existing = await prisma.emiSchedule.findUnique({ where: { id: (req.params.id as string) } });
      if (!existing) throw new AppError('EMI not found', 404);
      if (existing.status === 'PAID') throw new AppError('Cannot modify a paid EMI', 400);

      const updated = await prisma.emiSchedule.update({
        where: { id: (req.params.id as string) },
        data: {
          dueDate: dueDate ? new Date(dueDate) : existing.dueDate,
          amount: amount !== undefined ? amount : existing.amount,
          isModified: true,
          modifiedBy: req.user!.name,
          modifiedAt: new Date(),
        } as any,
      });

      res.json({ success: true, data: updated, message: 'EMI installment updated' });
    } catch (error: any) { next(error); }
  }
);

export default router;
