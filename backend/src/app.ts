import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { env } from './config/env';
import { notFoundHandler, errorHandler } from './middleware/errorHandler';

// Route imports
import authRoutes from './modules/auth/auth.routes';
import masterRoutes from './modules/masters/master.routes';
import customerRoutes from './modules/customers/customer.routes';
import groupRoutes from './modules/customers/group.routes';
import advisorRoutes from './modules/advisors/advisor.routes';
import loanRoutes from './modules/loans/loan.routes';
import paymentRoutes from './modules/payments/payment.routes';
import voucherRoutes from './modules/vouchers/voucher.routes';
import reportRoutes from './modules/reports/report.routes';
import accountRoutes from './modules/accounts/account.routes';
import { startCronJobs } from './jobs/penaltyCron';

const app = express();

// ==================== MIDDLEWARE ====================

// Security
app.use(helmet());
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api/auth/login', limiter);

// Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(compression());

// Logging
if (env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Static files (uploads)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ==================== ROUTES ====================

app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'Rudraksh Capital API is running', timestamp: new Date() });
});

app.use('/api/auth', authRoutes);
app.use('/api/masters', masterRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/advisors', advisorRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/vouchers', voucherRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/accounts', accountRoutes);

// ==================== ERROR HANDLING ====================

app.use(notFoundHandler);
app.use(errorHandler);

// ==================== START SERVER ====================

// Start Cron Jobs
startCronJobs();

app.listen(env.PORT, () => {
  console.log(`\n🏦 Rudraksh Capital API Server`);
  console.log(`   Environment: ${env.NODE_ENV}`);
  console.log(`   Port: ${env.PORT}`);
  console.log(`   Health: http://localhost:${env.PORT}/api/health\n`);
});

export default app;
