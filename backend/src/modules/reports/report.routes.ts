import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../../config/database';
import { authenticate, branchFilter } from '../../middleware/auth';

const router = Router();
router.use(authenticate);
router.use(branchFilter);

// GET /api/reports/dashboard — Dashboard stats
router.get('/dashboard', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bf = (req as any).branchFilter;
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const [
      totalCustomers, activeCustomers, totalAdvisors,
      totalLoans, activeLoans, pendingLoans,
      todayCollections, monthlyCollections, totalDisbursedAgg,
    ] = await Promise.all([
      prisma.customer.count({ where: bf }),
      prisma.customer.count({ where: { ...bf, isActive: true } }),
      prisma.advisor.count({ where: { ...bf, isActive: true } }),
      prisma.loan.count({ where: bf }),
      prisma.loan.count({ where: { ...bf, status: { in: ['DISBURSED', 'ACTIVE'] } } }),
      prisma.loan.count({ where: { ...bf, status: { in: ['APPLIED', 'APPROVED'] } } }),
      prisma.payment.aggregate({
        where: { ...bf, createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.payment.aggregate({
        where: { ...bf, createdAt: { gte: startOfMonth } },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.loan.aggregate({
        where: { ...bf, status: { in: ['DISBURSED', 'ACTIVE', 'CLOSED'] } },
        _sum: { amount: true },
      }),
    ]);

    const loansByStatus = await prisma.loan.groupBy({
      by: ['status'],
      where: bf,
      _count: true,
      _sum: { amount: true },
    });

    const overdueEMIs = await prisma.emiSchedule.count({
      where: {
        status: { in: ['PENDING', 'PARTIAL'] },
        dueDate: { lt: new Date() },
        loan: bf.branchId ? { branchId: bf.branchId } : undefined,
      },
    });

    res.json({
      success: true,
      data: {
        totalCustomers, activeCustomers, totalAdvisors,
        totalLoans, activeLoans, pendingLoans, overdueEMIs,
        todayCollections: {
          amount: todayCollections._sum.amount || 0,
          count: todayCollections._count,
        },
        monthlyCollections: {
          amount: monthlyCollections._sum.amount || 0,
          count: monthlyCollections._count,
        },
        totalDisbursed: totalDisbursedAgg._sum.amount || 0,
        loansByStatus,
      },
    });
  } catch (error: any) { next(error); }
});

// GET /api/reports/collection-sheet — Daily collection
router.get('/collection-sheet', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const date = (req.query.date as string) ? new Date((req.query.date as string)) : new Date();
    const startOfDay = new Date(date); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date); endOfDay.setHours(23, 59, 59, 999);
    const bf = (req as any).branchFilter;

    const payments = await prisma.payment.findMany({
      where: { ...bf, createdAt: { gte: startOfDay, lte: endOfDay } },
      include: {
        loan: {
          select: {
            loanNo: true,
            customer: { select: { customerId: true, name: true, phone: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const total = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const byType = payments.reduce((acc: any, p) => {
      acc[p.type] = (acc[p.type] || 0) + Number(p.amount);
      return acc;
    }, {});

    res.json({ success: true, data: { date: startOfDay, payments, total, count: payments.length, byType } });
  } catch (error: any) { next(error); }
});

// GET /api/reports/due-report — Overdue EMIs
router.get('/due-report', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bf = (req as any).branchFilter;
    const asOfDate = (req.query.date as string) ? new Date((req.query.date as string)) : new Date();

    const overdues = await prisma.emiSchedule.findMany({
      where: {
        status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] },
        dueDate: { lt: asOfDate },
        loan: bf.branchId ? { branchId: bf.branchId } : undefined,
      },
      include: {
        loan: {
          select: {
            loanNo: true, amount: true,
            customer: { select: { customerId: true, name: true, phone: true, address: true } },
            advisor: { select: { name: true, phone: true } },
            branch: { select: { name: true } },
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    const totalOverdue = overdues.reduce((sum, e) => sum + Number(e.amount) - Number(e.paidAmount), 0);

    res.json({ success: true, data: { asOfDate, overdues, totalOverdue, count: overdues.length } });
  } catch (error: any) { next(error); }
});

// GET /api/reports/customer-detail — Customer detail report
router.get('/customer-detail', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bf = (req as any).branchFilter;
    const where: any = { ...bf };
    if ((req.query.search as string)) {
      const s = (req.query.search as string);
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { phone: { contains: s } },
        { customerId: { contains: s, mode: 'insensitive' } },
      ];
    }
    if ((req.query.isActive as string)) where.isActive = (req.query.isActive as string) === 'true';

    const customers = await prisma.customer.findMany({
      where,
      include: {
        branch: { select: { name: true, code: true } },
        loans: {
          select: { loanNo: true, amount: true, status: true, totalPayable: true, appliedDate: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: customers });
  } catch (error: any) { next(error); }
});

// GET /api/reports/loan-requisition — Loan requisition report
router.get('/loan-requisition', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bf = (req as any).branchFilter;
    const where: any = { ...bf };
    if ((req.query.from as string)) where.appliedDate = { ...where.appliedDate, gte: new Date((req.query.from as string)) };
    if ((req.query.to as string)) where.appliedDate = { ...where.appliedDate, lte: new Date((req.query.to as string)) };
    if ((req.query.status as string)) where.status = (req.query.status as string);

    const loans = await prisma.loan.findMany({
      where,
      include: {
        customer: { select: { customerId: true, name: true, phone: true } },
        advisor: { select: { advisorId: true, name: true } },
        loanProduct: { select: { name: true, code: true } },
        branch: { select: { name: true } },
      },
      orderBy: { appliedDate: 'desc' },
    });

    const totalAmount = loans.reduce((s, l) => s + Number(l.amount), 0);
    res.json({ success: true, data: { loans, totalAmount, count: loans.length } });
  } catch (error: any) { next(error); }
});

// GET /api/reports/loan-approval — Approved loans report
router.get('/loan-approval', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bf = (req as any).branchFilter;
    const where: any = { ...bf, status: { in: ['APPROVED', 'DISBURSED', 'ACTIVE', 'CLOSED'] }, approvedDate: { not: null } };
    if ((req.query.from as string)) where.approvedDate = { ...where.approvedDate, gte: new Date((req.query.from as string)) };
    if ((req.query.to as string)) where.approvedDate = { ...where.approvedDate, lte: new Date((req.query.to as string)) };

    const loans = await prisma.loan.findMany({
      where,
      include: {
        customer: { select: { customerId: true, name: true } },
        loanProduct: { select: { name: true } },
        branch: { select: { name: true } },
      },
      orderBy: { approvedDate: 'desc' },
    });

    res.json({ success: true, data: { loans, count: loans.length } });
  } catch (error: any) { next(error); }
});

// GET /api/reports/loan-rejection — Rejected loans report
router.get('/loan-rejection', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bf = (req as any).branchFilter;
    const where: any = { ...bf, status: 'REJECTED' };
    if ((req.query.from as string)) where.rejectedDate = { ...where.rejectedDate, gte: new Date((req.query.from as string)) };
    if ((req.query.to as string)) where.rejectedDate = { ...where.rejectedDate, lte: new Date((req.query.to as string)) };

    const loans = await prisma.loan.findMany({
      where,
      include: {
        customer: { select: { customerId: true, name: true } },
        loanProduct: { select: { name: true } },
        branch: { select: { name: true } },
      },
      orderBy: { rejectedDate: 'desc' },
    });

    res.json({ success: true, data: { loans, count: loans.length } });
  } catch (error: any) { next(error); }
});

// GET /api/reports/disbursement — Loans disbursed in period
router.get('/disbursement', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bf = (req as any).branchFilter;
    const where: any = { ...bf, status: { in: ['DISBURSED', 'ACTIVE', 'CLOSED'] } };

    if ((req.query.from as string)) where.disbursedDate = { ...where.disbursedDate, gte: new Date((req.query.from as string)) };
    if ((req.query.to as string)) where.disbursedDate = { ...where.disbursedDate, lte: new Date((req.query.to as string)) };

    const loans = await prisma.loan.findMany({
      where,
      include: {
        customer: { select: { customerId: true, name: true } },
        loanProduct: { select: { name: true } },
        branch: { select: { name: true } },
      },
      orderBy: { disbursedDate: 'desc' },
    });

    const totalDisbursed = loans.reduce((sum, l) => sum + Number(l.amount), 0);

    res.json({ success: true, data: { loans, totalDisbursed, count: loans.length } });
  } catch (error: any) { next(error); }
});

// GET /api/reports/emi-collection
router.get('/emi-collection', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bf = (req as any).branchFilter;
    const where: any = { ...bf, type: 'EMI' };

    if ((req.query.from as string)) where.createdAt = { ...where.createdAt, gte: new Date((req.query.from as string)) };
    if ((req.query.to as string)) where.createdAt = { ...where.createdAt, lte: new Date((req.query.to as string)) };

    const payments = await prisma.payment.findMany({
      where,
      include: {
        loan: {
          select: {
            loanNo: true,
            customer: { select: { customerId: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const total = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    res.json({ success: true, data: { payments, total, count: payments.length } });
  } catch (error: any) { next(error); }
});

// GET /api/reports/non-emi-collection
router.get('/non-emi-collection', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bf = (req as any).branchFilter;
    const where: any = { ...bf, type: { in: ['NON_EMI', 'PART_PAYMENT'] } };

    if ((req.query.from as string)) where.createdAt = { ...where.createdAt, gte: new Date((req.query.from as string)) };
    if ((req.query.to as string)) where.createdAt = { ...where.createdAt, lte: new Date((req.query.to as string)) };

    const payments = await prisma.payment.findMany({
      where,
      include: {
        loan: {
          select: {
            loanNo: true,
            customer: { select: { customerId: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const total = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    res.json({ success: true, data: { payments, total, count: payments.length } });
  } catch (error: any) { next(error); }
});

// GET /api/reports/loan-outstanding
router.get('/loan-outstanding', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bf = (req as any).branchFilter;

    const loans = await prisma.loan.findMany({
      where: { ...bf, status: { in: ['DISBURSED', 'ACTIVE'] } },
      include: {
        customer: { select: { customerId: true, name: true, phone: true } },
        loanProduct: { select: { name: true } },
        branch: { select: { name: true } },
        payments: { select: { amount: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const result = loans.map(loan => {
      const totalPaid = loan.payments.reduce((sum, p) => sum + Number(p.amount), 0);
      const outstanding = Number(loan.totalPayable) - totalPaid;
      return {
        loanNo: loan.loanNo,
        customer: loan.customer,
        loanProduct: loan.loanProduct,
        branch: loan.branch,
        amount: loan.amount,
        totalPayable: loan.totalPayable,
        totalPaid,
        outstanding,
        disbursedDate: loan.disbursedDate,
      };
    });

    const totalOutstanding = result.reduce((sum, r) => sum + r.outstanding, 0);
    res.json({ success: true, data: { loans: result, totalOutstanding, count: result.length } });
  } catch (error: any) { next(error); }
});

// GET /api/reports/business-report — Business report all categories
router.get('/business-report', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bf = (req as any).branchFilter;
    const where: any = { ...bf };
    if ((req.query.from as string)) where.appliedDate = { ...where.appliedDate, gte: new Date((req.query.from as string)) };
    if ((req.query.to as string)) where.appliedDate = { ...where.appliedDate, lte: new Date((req.query.to as string)) };

    const byProduct = await prisma.loan.groupBy({
      by: ['loanProductId'],
      where,
      _count: true,
      _sum: { amount: true },
    });

    const products = await prisma.loanProduct.findMany();
    const productMap = products.reduce((m: any, p) => { m[p.id] = p; return m; }, {});

    const report = byProduct.map(bp => ({
      product: productMap[bp.loanProductId]?.name || 'Unknown',
      productCode: productMap[bp.loanProductId]?.code || '',
      count: bp._count,
      totalAmount: Number(bp._sum.amount || 0),
    }));

    const byBranch = await prisma.loan.groupBy({
      by: ['branchId'],
      where,
      _count: true,
      _sum: { amount: true },
    });

    const branches = await prisma.branch.findMany();
    const branchMap = branches.reduce((m: any, b) => { m[b.id] = b; return m; }, {});

    const branchReport = byBranch.map(bb => ({
      branch: branchMap[bb.branchId]?.name || 'Unknown',
      branchCode: branchMap[bb.branchId]?.code || '',
      count: bb._count,
      totalAmount: Number(bb._sum.amount || 0),
    }));

    res.json({ success: true, data: { byProduct: report, byBranch: branchReport } });
  } catch (error: any) { next(error); }
});

// GET /api/reports/business-summary — Business summary
router.get('/business-summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bf = (req as any).branchFilter;

    const [totalLoans, totalDisbursed, totalCollected, totalCustomers, totalAdvisors] = await Promise.all([
      prisma.loan.aggregate({ where: bf, _sum: { amount: true }, _count: true }),
      prisma.loan.aggregate({ where: { ...bf, status: { in: ['DISBURSED', 'ACTIVE', 'CLOSED'] } }, _sum: { amount: true }, _count: true }),
      prisma.payment.aggregate({ where: bf, _sum: { amount: true }, _count: true }),
      prisma.customer.count({ where: bf }),
      prisma.advisor.count({ where: bf }),
    ]);

    res.json({
      success: true,
      data: {
        totalLoansApplied: { count: totalLoans._count, amount: Number(totalLoans._sum.amount || 0) },
        totalDisbursed: { count: totalDisbursed._count, amount: Number(totalDisbursed._sum.amount || 0) },
        totalCollected: { count: totalCollected._count, amount: Number(totalCollected._sum.amount || 0) },
        totalCustomers,
        totalAdvisors,
      },
    });
  } catch (error: any) { next(error); }
});

// GET /api/reports/agent-collection — Agent collection report by branch
router.get('/agent-collection', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bf = (req as any).branchFilter;
    const where: any = { ...bf };
    if ((req.query.from as string)) where.createdAt = { ...where.createdAt, gte: new Date((req.query.from as string)) };
    if ((req.query.to as string)) where.createdAt = { ...where.createdAt, lte: new Date((req.query.to as string)) };

    const payments = await prisma.payment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    // Group by collectedBy (agent)
    const agentMap: Record<string, { name: string; totalAmount: number; count: number; byType: Record<string, number> }> = {};
    payments.forEach(p => {
      if (!agentMap[p.collectedBy]) {
        agentMap[p.collectedBy] = { name: p.collectedBy, totalAmount: 0, count: 0, byType: {} };
      }
      agentMap[p.collectedBy].totalAmount += Number(p.amount);
      agentMap[p.collectedBy].count++;
      agentMap[p.collectedBy].byType[p.type] = (agentMap[p.collectedBy].byType[p.type] || 0) + Number(p.amount);
    });

    res.json({ success: true, data: Object.values(agentMap) });
  } catch (error: any) { next(error); }
});

// GET /api/reports/member-report — All members/associates report
router.get('/member-report', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bf = (req as any).branchFilter;
    const where: any = { ...bf };
    if ((req.query.isActive as string)) where.isActive = (req.query.isActive as string) === 'true';

    const advisors = await prisma.advisor.findMany({
      where,
      include: {
        branch: { select: { name: true, code: true } },
        rank: { select: { name: true } },
        commissionPlan: { select: { name: true, value: true, type: true } },
        _count: { select: { loans: true, downline: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: advisors });
  } catch (error: any) { next(error); }
});

export default router;
