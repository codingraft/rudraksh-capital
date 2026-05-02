import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../../config/database';
import { authenticate, authorize, branchFilter } from '../../middleware/auth';
import { auditLog } from '../../middleware/auditLog';
import { AppError } from '../../middleware/errorHandler';
import { generateId } from '../../utils/helpers';

const router = Router();
router.use(authenticate);
router.use(branchFilter);

// GET /api/accounts/ledger - Get ledger for an account
router.get('/ledger', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { accountHead, fromDate, toDate } = req.query;
    const bf = (req as any).branchFilter;

    if (!accountHead) {
      return res.status(400).json({ success: false, message: 'Account Head is required' });
    }

    const where: any = { ...bf, accountHead: String(accountHead) };
    if (fromDate) where.date = { ...where.date, gte: new Date(String(fromDate)) };
    if (toDate) where.date = { ...where.date, lte: new Date(String(toDate)) };

    const entries = await prisma.accountEntry.findMany({
      where,
      orderBy: { date: 'asc' },
    });

    const totalDebit = entries.filter(e => e.type === 'DEBIT').reduce((sum, e) => sum + Number(e.amount), 0);
    const totalCredit = entries.filter(e => e.type === 'CREDIT').reduce((sum, e) => sum + Number(e.amount), 0);
    const balance = totalCredit - totalDebit;

    res.json({
      success: true,
      data: {
        accountHead,
        entries,
        summary: { totalDebit, totalCredit, balance }
      }
    });
  } catch (error: any) { next(error); }
});

// GET /api/accounts/day-book - Get all transactions for a day
router.get('/day-book', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dateStr = (req.query.date as string);
    const date = dateStr ? new Date(dateStr) : new Date();
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    const bf = (req as any).branchFilter;

    const [entries, payments, vouchers] = await Promise.all([
      prisma.accountEntry.findMany({
        where: { ...bf, date: { gte: startOfDay, lte: endOfDay } },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.payment.findMany({
        where: { ...bf, createdAt: { gte: startOfDay, lte: endOfDay } },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.voucher.findMany({
        where: { ...bf, date: { gte: startOfDay, lte: endOfDay } },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const totalDebit = entries.filter(e => e.type === 'DEBIT').reduce((s, e) => s + Number(e.amount), 0);
    const totalCredit = entries.filter(e => e.type === 'CREDIT').reduce((s, e) => s + Number(e.amount), 0);
    const totalPayments = payments.reduce((s, p) => s + Number(p.amount), 0);

    res.json({
      success: true,
      data: {
        date: startOfDay,
        accountEntries: entries,
        payments,
        vouchers,
        summary: { totalDebit, totalCredit, totalPayments, transactionCount: entries.length + payments.length }
      }
    });
  } catch (error: any) { next(error); }
});

// GET /api/accounts/cash-book - Cash transactions
router.get('/cash-book', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bf = (req as any).branchFilter;
    const fromDate = (req.query.fromDate as string);
    const toDate = (req.query.toDate as string);

    const where: any = { ...bf };
    if (fromDate || toDate) {
      where.date = {};
      if (fromDate) where.date.gte = new Date(fromDate);
      if (toDate) where.date.lte = new Date(toDate);
    }

    // Cash entries from payments (CASH method)
    const cashPayments = await prisma.payment.findMany({
      where: {
        ...bf,
        method: 'CASH',
        ...(fromDate || toDate ? {
          createdAt: {
            ...(fromDate ? { gte: new Date(fromDate) } : {}),
            ...(toDate ? { lte: new Date(toDate) } : {}),
          }
        } : {}),
      },
      include: {
        loan: { select: { loanNo: true, customer: { select: { name: true, customerId: true } } } },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Cash entries from account entries
    const accountEntries = await prisma.accountEntry.findMany({
      where,
      orderBy: { date: 'asc' },
    });

    const totalCashIn = cashPayments.reduce((s, p) => s + Number(p.amount), 0);
    const totalCashOut = accountEntries.filter(e => e.type === 'DEBIT').reduce((s, e) => s + Number(e.amount), 0);

    res.json({
      success: true,
      data: {
        cashPayments,
        accountEntries,
        summary: { totalCashIn, totalCashOut, balance: totalCashIn - totalCashOut }
      }
    });
  } catch (error: any) { next(error); }
});

// GET /api/accounts/bank-book - Bank transactions
router.get('/bank-book', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bf = (req as any).branchFilter;
    const where: any = { ...bf };
    if ((req.query.fromDate as string)) where.date = { ...where.date, gte: new Date((req.query.fromDate as string)) };
    if ((req.query.toDate as string)) where.date = { ...where.date, lte: new Date((req.query.toDate as string)) };
    if ((req.query.bankId as string)) where.bankId = (req.query.bankId as string);

    const transactions = await prisma.bankTransaction.findMany({
      where,
      orderBy: { date: 'desc' },
    });

    const totalDeposits = transactions.filter(t => t.type === 'DEPOSIT').reduce((s, t) => s + Number(t.amount), 0);
    const totalWithdrawals = transactions.filter(t => t.type === 'WITHDRAWAL').reduce((s, t) => s + Number(t.amount), 0);

    res.json({
      success: true,
      data: {
        transactions,
        summary: { totalDeposits, totalWithdrawals, balance: totalDeposits - totalWithdrawals }
      }
    });
  } catch (error: any) { next(error); }
});

// POST /api/accounts/bank-deposit - Bank deposit entry
router.post('/bank-deposit', auditLog('BankTransaction'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { bankId, bankName, amount, narration, referenceNo, date } = req.body;
    if (!bankId || !amount) throw new AppError('Bank and amount are required', 400);

    const txn = await prisma.bankTransaction.create({
      data: {
        bankId,
        bankName: bankName || '',
        type: 'DEPOSIT',
        amount,
        narration,
        referenceNo,
        date: date ? new Date(date) : new Date(),
        branchId: req.body.branchId || req.user!.branchId!,
        createdBy: req.user!.name,
      },
    });

    // Also create account entry
    await prisma.accountEntry.create({
      data: {
        accountHead: `Bank - ${bankName || bankId}`,
        type: 'DEBIT',
        amount,
        narration: narration || 'Bank deposit',
        referenceNo,
        date: date ? new Date(date) : new Date(),
        branchId: req.body.branchId || req.user!.branchId!,
        createdBy: req.user!.name,
      },
    });

    res.status(201).json({ success: true, data: txn });
  } catch (error: any) { next(error); }
});

// POST /api/accounts/bank-withdrawal - Bank withdrawal entry
router.post('/bank-withdrawal', auditLog('BankTransaction'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { bankId, bankName, amount, narration, referenceNo, date } = req.body;
    if (!bankId || !amount) throw new AppError('Bank and amount are required', 400);

    const txn = await prisma.bankTransaction.create({
      data: {
        bankId,
        bankName: bankName || '',
        type: 'WITHDRAWAL',
        amount,
        narration,
        referenceNo,
        date: date ? new Date(date) : new Date(),
        branchId: req.body.branchId || req.user!.branchId!,
        createdBy: req.user!.name,
      },
    });

    await prisma.accountEntry.create({
      data: {
        accountHead: `Bank - ${bankName || bankId}`,
        type: 'CREDIT',
        amount,
        narration: narration || 'Bank withdrawal',
        referenceNo,
        date: date ? new Date(date) : new Date(),
        branchId: req.body.branchId || req.user!.branchId!,
        createdBy: req.user!.name,
      },
    });

    res.status(201).json({ success: true, data: txn });
  } catch (error: any) { next(error); }
});

// GET /api/accounts/trial-balance - Get Trial Balance
router.get('/trial-balance', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bf = (req as any).branchFilter;
    const { asOfDate } = req.query;

    const where: any = { ...bf };
    if (asOfDate) where.date = { lte: new Date(String(asOfDate)) };

    const summary = await prisma.accountEntry.groupBy({
      by: ['accountHead', 'type'],
      where,
      _sum: { amount: true },
    });

    const tb: Record<string, { debit: number; credit: number; balance: number }> = {};

    summary.forEach(s => {
      if (!tb[s.accountHead]) tb[s.accountHead] = { debit: 0, credit: 0, balance: 0 };
      if (s.type === 'DEBIT') tb[s.accountHead].debit += Number(s._sum.amount || 0);
      if (s.type === 'CREDIT') tb[s.accountHead].credit += Number(s._sum.amount || 0);
      tb[s.accountHead].balance = tb[s.accountHead].credit - tb[s.accountHead].debit;
    });

    const trialBalanceList = Object.keys(tb).map(head => ({
      accountHead: head,
      ...tb[head]
    }));

    const totalDebit = trialBalanceList.reduce((s, r) => s + r.debit, 0);
    const totalCredit = trialBalanceList.reduce((s, r) => s + r.credit, 0);

    res.json({ success: true, data: { entries: trialBalanceList, summary: { totalDebit, totalCredit } } });
  } catch (error: any) { next(error); }
});

// ==================== EXPENDITURE FLOW ====================

// POST /api/accounts/expenditure - Create expenditure requisition
router.post('/expenditure', auditLog('Expenditure'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { accountHead, amount, narration, date } = req.body;
    if (!accountHead || !amount) throw new AppError('Account head and amount are required', 400);

    const exp = await prisma.expenditure.create({
      data: {
        accountHead,
        amount,
        narration,
        date: date ? new Date(date) : new Date(),
        status: 'REQUISITION',
        requestedBy: req.user!.name,
        branchId: req.body.branchId || req.user!.branchId!,
      },
    });

    res.status(201).json({ success: true, data: exp, message: 'Expenditure requisition created' });
  } catch (error: any) { next(error); }
});

// GET /api/accounts/expenditure - List expenditures
router.get('/expenditure', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bf = (req as any).branchFilter;
    const where: any = { ...bf };
    if ((req.query.status as string)) where.status = (req.query.status as string);
    if ((req.query.fromDate as string)) where.date = { ...where.date, gte: new Date((req.query.fromDate as string)) };
    if ((req.query.toDate as string)) where.date = { ...where.date, lte: new Date((req.query.toDate as string)) };

    const expenditures = await prisma.expenditure.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    res.json({ success: true, data: expenditures });
  } catch (error: any) { next(error); }
});

// PATCH /api/accounts/expenditure/:id/approve
router.patch('/expenditure/:id/approve', authorize('SUPER_ADMIN', 'BRANCH_MANAGER'), auditLog('Expenditure'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const exp = await prisma.expenditure.findUnique({ where: { id: (req.params.id as string) } });
      if (!exp) throw new AppError('Expenditure not found', 404);
      if (exp.status !== 'REQUISITION') throw new AppError('Can only approve requisitions', 400);

      const updated = await prisma.expenditure.update({
        where: { id: (req.params.id as string) },
        data: { status: 'APPROVED', approvedBy: req.user!.name, approvedAt: new Date() },
      });

      res.json({ success: true, data: updated, message: 'Expenditure approved' });
    } catch (error: any) { next(error); }
  }
);

// PATCH /api/accounts/expenditure/:id/reject
router.patch('/expenditure/:id/reject', authorize('SUPER_ADMIN', 'BRANCH_MANAGER'), auditLog('Expenditure'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const exp = await prisma.expenditure.findUnique({ where: { id: (req.params.id as string) } });
      if (!exp) throw new AppError('Expenditure not found', 404);
      if (exp.status !== 'REQUISITION') throw new AppError('Can only reject requisitions', 400);

      const updated = await prisma.expenditure.update({
        where: { id: (req.params.id as string) },
        data: { status: 'REJECTED', approvedBy: req.user!.name, approvedAt: new Date() },
      });

      res.json({ success: true, data: updated, message: 'Expenditure rejected' });
    } catch (error: any) { next(error); }
  }
);

// POST /api/accounts/expenditure/:id/pay
router.post('/expenditure/:id/pay', authorize('SUPER_ADMIN', 'BRANCH_MANAGER', 'CASHIER'), auditLog('Expenditure'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const exp = await prisma.expenditure.findUnique({ where: { id: (req.params.id as string) } });
      if (!exp) throw new AppError('Expenditure not found', 404);
      if (exp.status !== 'APPROVED') throw new AppError('Can only pay approved expenditures', 400);

      const voucherNo = await generateId('voucher');

      const updated = await prisma.$transaction(async (tx: any) => {
        // Update expenditure
        const upd = await tx.expenditure.update({
          where: { id: (req.params.id as string) },
          data: {
            status: 'PAID',
            paidBy: req.user!.name,
            paidAt: new Date(),
            paidMethod: req.body.method || 'CASH',
            voucherNo,
          },
        });

        // Create voucher
        await tx.voucher.create({
          data: {
            voucherNo,
            type: 'PAYMENT',
            amount: exp.amount,
            accountHead: exp.accountHead,
            narration: exp.narration || `Expenditure payment - ${exp.accountHead}`,
            branchId: exp.branchId,
            createdBy: req.user!.name,
            status: 'APPROVED',
            approvedBy: req.user!.name,
            approvedAt: new Date(),
          },
        });

        // Create account entry
        await tx.accountEntry.create({
          data: {
            accountHead: exp.accountHead,
            type: 'DEBIT',
            amount: exp.amount,
            narration: exp.narration || `Expenditure - ${exp.accountHead}`,
            voucherId: voucherNo,
            branchId: exp.branchId,
            createdBy: req.user!.name,
          },
        });

        return upd;
      });

      res.json({ success: true, data: updated, message: `Expenditure paid. Voucher: ${voucherNo}` });
    } catch (error: any) { next(error); }
  }
);

// ==================== INCOME ENTRY ====================

// POST /api/accounts/income
router.post('/income', auditLog('IncomeEntry'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { accountHead, amount, narration, method, referenceNo, date } = req.body;
    if (!accountHead || !amount) throw new AppError('Account head and amount are required', 400);

    const income = await prisma.incomeEntry.create({
      data: {
        accountHead,
        amount,
        narration,
        method: method || 'CASH',
        referenceNo,
        date: date ? new Date(date) : new Date(),
        branchId: req.body.branchId || req.user!.branchId!,
        createdBy: req.user!.name,
      },
    });

    // Create account entry
    await prisma.accountEntry.create({
      data: {
        accountHead,
        type: 'CREDIT',
        amount,
        narration: narration || `Income - ${accountHead}`,
        date: date ? new Date(date) : new Date(),
        branchId: req.body.branchId || req.user!.branchId!,
        createdBy: req.user!.name,
      },
    });

    res.status(201).json({ success: true, data: income });
  } catch (error: any) { next(error); }
});

// GET /api/accounts/income
router.get('/income', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bf = (req as any).branchFilter;
    const where: any = { ...bf };
    if ((req.query.fromDate as string)) where.date = { ...where.date, gte: new Date((req.query.fromDate as string)) };
    if ((req.query.toDate as string)) where.date = { ...where.date, lte: new Date((req.query.toDate as string)) };

    const entries = await prisma.incomeEntry.findMany({ where, orderBy: { date: 'desc' }, take: 200 });
    const total = entries.reduce((s, e) => s + Number(e.amount), 0);

    res.json({ success: true, data: { entries, total } });
  } catch (error: any) { next(error); }
});

// GET /api/accounts/cash-sheet - Auto cash sheet summary
router.get('/cash-sheet', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bf = (req as any).branchFilter;
    const dateStr = (req.query.date as string);
    const date = dateStr ? new Date(dateStr) : new Date();
    const startOfDay = new Date(date); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date); endOfDay.setHours(23, 59, 59, 999);

    const [cashReceipts, cashPayments, bankDeposits, expenditures] = await Promise.all([
      prisma.payment.findMany({
        where: { ...bf, method: 'CASH', createdAt: { gte: startOfDay, lte: endOfDay } },
        include: { loan: { select: { loanNo: true, customer: { select: { name: true } } } } },
      }),
      prisma.payment.findMany({
        where: { ...bf, type: 'EXPENDITURE', createdAt: { gte: startOfDay, lte: endOfDay } },
      }),
      prisma.bankTransaction.findMany({
        where: { ...bf, type: 'DEPOSIT', date: { gte: startOfDay, lte: endOfDay } },
      }),
      prisma.expenditure.findMany({
        where: { ...bf, status: 'PAID', paidAt: { gte: startOfDay, lte: endOfDay } },
      }),
    ]);

    const totalCashIn = cashReceipts.reduce((s, p) => s + Number(p.amount), 0);
    const totalCashOut = expenditures.reduce((s, e) => s + Number(e.amount), 0);
    const totalBankDeposit = bankDeposits.reduce((s, d) => s + Number(d.amount), 0);
    const cashInHand = totalCashIn - totalCashOut - totalBankDeposit;

    res.json({
      success: true,
      data: {
        date: startOfDay,
        cashReceipts,
        expenditures,
        bankDeposits,
        summary: { totalCashIn, totalCashOut, totalBankDeposit, cashInHand }
      }
    });
  } catch (error: any) { next(error); }
});

// GET /api/accounts/balance-sheet
router.get('/balance-sheet', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bf = (req as any).branchFilter;
    const asOfDate = (req.query.asOfDate as string);
    const where: any = { ...bf };
    if (asOfDate) where.date = { lte: new Date(asOfDate) };

    // Get all account entries grouped
    const entries = await prisma.accountEntry.groupBy({
      by: ['accountHead', 'type'],
      where,
      _sum: { amount: true },
    });

    // Get total loan portfolio
    const loanPortfolio = await prisma.loan.aggregate({
      where: { ...bf, status: { in: ['DISBURSED', 'ACTIVE'] } },
      _sum: { amount: true, totalPayable: true },
    });

    // Get total payments received
    const totalCollections = await prisma.payment.aggregate({
      where: { ...bf, type: { in: ['EMI', 'NON_EMI', 'PART_PAYMENT'] } },
      _sum: { amount: true },
    });

    // Build balance sheet
    const assets: any[] = [];
    const liabilities: any[] = [];

    // Loan portfolio as asset
    const loanOutstanding = Number(loanPortfolio._sum.totalPayable || 0) - Number(totalCollections._sum.amount || 0);
    assets.push({ name: 'Loan Outstanding', amount: loanOutstanding });

    // Group account entries
    entries.forEach(e => {
      const netAmount = Number(e._sum.amount || 0);
      if (e.type === 'DEBIT') {
        assets.push({ name: e.accountHead, amount: netAmount });
      } else {
        liabilities.push({ name: e.accountHead, amount: netAmount });
      }
    });

    const totalAssets = assets.reduce((s, a) => s + a.amount, 0);
    const totalLiabilities = liabilities.reduce((s, l) => s + l.amount, 0);

    res.json({
      success: true,
      data: {
        assets,
        liabilities,
        summary: { totalAssets, totalLiabilities, netWorth: totalAssets - totalLiabilities }
      }
    });
  } catch (error: any) { next(error); }
});

// GET /api/accounts/pl-account - Profit & Loss
router.get('/pl-account', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bf = (req as any).branchFilter;
    const where: any = { ...bf };
    if ((req.query.fromDate as string)) where.date = { ...where.date, gte: new Date((req.query.fromDate as string)) };
    if ((req.query.toDate as string)) where.date = { ...where.date, lte: new Date((req.query.toDate as string)) };

    // Income: Interest earned from EMI payments
    const interestIncome = await prisma.payment.aggregate({
      where: { ...bf, type: 'EMI' },
      _sum: { amount: true },
    });

    // Other income
    const otherIncome = await prisma.incomeEntry.aggregate({
      where: { ...bf },
      _sum: { amount: true },
    });

    // Expenses
    const expenses = await prisma.expenditure.aggregate({
      where: { ...bf, status: 'PAID' },
      _sum: { amount: true },
    });

    // Commission paid
    const commissions = await prisma.payment.aggregate({
      where: { ...bf, type: 'COMMISSION' },
      _sum: { amount: true },
    });

    const totalIncome = Number(interestIncome._sum.amount || 0) + Number(otherIncome._sum.amount || 0);
    const totalExpenses = Number(expenses._sum.amount || 0) + Number(commissions._sum.amount || 0);
    const netProfit = totalIncome - totalExpenses;

    res.json({
      success: true,
      data: {
        income: [
          { name: 'Interest Income (EMI)', amount: Number(interestIncome._sum.amount || 0) },
          { name: 'Other Income', amount: Number(otherIncome._sum.amount || 0) },
        ],
        expenses: [
          { name: 'Operating Expenses', amount: Number(expenses._sum.amount || 0) },
          { name: 'Commissions Paid', amount: Number(commissions._sum.amount || 0) },
        ],
        summary: { totalIncome, totalExpenses, netProfit }
      }
    });
  } catch (error: any) { next(error); }
});

export default router;
