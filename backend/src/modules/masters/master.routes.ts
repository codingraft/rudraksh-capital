import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../../config/database';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();
router.use(authenticate);
router.use(authorize('SUPER_ADMIN', 'BRANCH_MANAGER'));

// Helper to create generic CRUD for simple master tables
function masterCRUD(modelName: string, model: any) {
  const r = Router();

  // GET all
  r.get('/', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await model.findMany({ orderBy: { id: 'asc' } });
      res.json({ success: true, data });
    } catch (e) { next(e); }
  });

  // POST create
  r.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const item = await model.create({ data: req.body });
      res.status(201).json({ success: true, data: item });
    } catch (e) { next(e); }
  });

  // PUT update
  r.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const item = await model.update({ where: { id: (req.params.id as string) }, data: req.body });
      res.json({ success: true, data: item });
    } catch (e) { next(e); }
  });

  // DELETE
  r.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      await model.delete({ where: { id: (req.params.id as string) } });
      res.json({ success: true, message: `${modelName} deleted` });
    } catch (e) { next(e); }
  });

  return r;
}

// Register all master routes
router.use('/branches', masterCRUD('Branch', prisma.branch));
router.use('/ranks', masterCRUD('Rank', prisma.rank));
router.use('/commission-plans', masterCRUD('CommissionPlan', prisma.commissionPlan));
router.use('/relations', masterCRUD('RelationMaster', prisma.relationMaster));
router.use('/banks', masterCRUD('BankMaster', prisma.bankMaster));
router.use('/accounts', masterCRUD('AccountMaster', prisma.accountMaster));
router.use('/loan-products', masterCRUD('LoanProduct', prisma.loanProduct));
router.use('/interest', masterCRUD('InterestMaster', prisma.interestMaster));
router.use('/financial-years', masterCRUD('FinancialYear', prisma.financialYear));
router.use('/config', masterCRUD('ConfigMaster', prisma.configMaster));
router.use('/voucher-types', masterCRUD('VoucherMaster', prisma.voucherMaster));

export default router;
