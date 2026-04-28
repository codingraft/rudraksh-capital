import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../../config/database';
import { authenticate, branchFilter } from '../../middleware/auth';

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
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));
    const bf = (req as any).branchFilter;

    const entries = await prisma.accountEntry.findMany({
      where: { ...bf, date: { gte: startOfDay, lte: endOfDay } },
      orderBy: { createdAt: 'asc' },
    });

    const payments = await prisma.payment.findMany({
      where: { ...bf, createdAt: { gte: startOfDay, lte: endOfDay } },
      orderBy: { createdAt: 'asc' },
    });

    res.json({
      success: true,
      data: { date: startOfDay, accountEntries: entries, payments }
    });
  } catch (error: any) { next(error); }
});

// GET /api/accounts/trial-balance - Get Trial Balance
router.get('/trial-balance', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bf = (req as any).branchFilter;
    const { asOfDate } = req.query;

    const where: any = { ...bf };
    if (asOfDate) where.date = { lte: new Date(String(asOfDate)) };

    // Group by account head to get balances
    const summary = await prisma.accountEntry.groupBy({
      by: ['accountHead', 'type'],
      where,
      _sum: { amount: true },
    });

    // Re-format to group by account head
    const tb: Record<string, { debit: number; credit: number; balance: number }> = {};
    
    summary.forEach(s => {
      if (!tb[s.accountHead]) tb[s.accountHead] = { debit: 0, credit: 0, balance: 0 };
      if (s.type === 'DEBIT') tb[s.accountHead].debit += Number(s._sum.amount || 0);
      if (s.type === 'CREDIT') tb[s.accountHead].credit += Number(s._sum.amount || 0);
      
      // Assume normal balance is credit minus debit (can be changed based on account type if mapped to AccountMaster)
      tb[s.accountHead].balance = tb[s.accountHead].credit - tb[s.accountHead].debit;
    });

    const trialBalanceList = Object.keys(tb).map(head => ({
      accountHead: head,
      ...tb[head]
    }));

    res.json({ success: true, data: trialBalanceList });
  } catch (error: any) { next(error); }
});

export default router;
