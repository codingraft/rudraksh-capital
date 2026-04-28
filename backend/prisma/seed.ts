import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...\n');

  // 1. Create default branch
  const branch = await prisma.branch.upsert({
    where: { code: 'HQ' },
    update: {},
    create: { name: 'Head Office', code: 'HQ', address: 'Main Office', phone: '9999999999' },
  });
  console.log('✅ Branch:', branch.name);

  // 2. Create super admin
  const hashedPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: hashedPassword,
      name: 'Super Admin',
      role: 'SUPER_ADMIN',
      branchId: branch.id,
    },
  });
  console.log('✅ Admin user: admin / admin123');

  // 3. Create a branch manager
  const manager = await prisma.user.upsert({
    where: { username: 'manager' },
    update: {},
    create: {
      username: 'manager',
      password: await bcrypt.hash('manager123', 12),
      name: 'Branch Manager',
      role: 'BRANCH_MANAGER',
      branchId: branch.id,
    },
  });
  console.log('✅ Manager user: manager / manager123');

  // 4. Create a cashier
  await prisma.user.upsert({
    where: { username: 'cashier' },
    update: {},
    create: {
      username: 'cashier',
      password: await bcrypt.hash('cashier123', 12),
      name: 'Cashier User',
      role: 'CASHIER',
      branchId: branch.id,
    },
  });
  console.log('✅ Cashier user: cashier / cashier123');

  // 5. Ranks
  const ranks = ['Advisor', 'Senior Advisor', 'Team Leader', 'Branch Head', 'Regional Head'];
  for (let i = 0; i < ranks.length; i++) {
    await prisma.rank.upsert({
      where: { name: ranks[i] },
      update: {},
      create: { name: ranks[i], level: i + 1 },
    });
  }
  console.log('✅ Ranks created:', ranks.length);

  // 6. Commission plans
  await prisma.commissionPlan.createMany({
    skipDuplicates: true,
    data: [
      { name: 'Standard 2%', type: 'PERCENTAGE', value: 2.0 },
      { name: 'Premium 3%', type: 'PERCENTAGE', value: 3.0 },
      { name: 'Flat ₹500', type: 'FLAT', value: 500 },
      { name: 'Flat ₹1000', type: 'FLAT', value: 1000 },
    ],
  });
  console.log('✅ Commission plans created');

  // 7. Relation masters
  const relations = ['Father', 'Mother', 'Spouse', 'Son', 'Daughter', 'Brother', 'Sister', 'Friend', 'Other'];
  for (const rel of relations) {
    await prisma.relationMaster.upsert({
      where: { name: rel },
      update: {},
      create: { name: rel },
    });
  }
  console.log('✅ Relations created:', relations.length);

  // 8. Loan products
  await prisma.loanProduct.createMany({
    skipDuplicates: true,
    data: [
      { name: 'Personal Loan', code: 'PL', interestRate: 18, interestType: 'REDUCING', minAmount: 10000, maxAmount: 500000, minTenure: 3, maxTenure: 36, processingFee: 500 },
      { name: 'Business Loan', code: 'BL', interestRate: 15, interestType: 'REDUCING', minAmount: 50000, maxAmount: 2000000, minTenure: 6, maxTenure: 60, processingFee: 1000 },
      { name: 'Gold Loan', code: 'GL', interestRate: 12, interestType: 'FLAT', minAmount: 5000, maxAmount: 1000000, minTenure: 1, maxTenure: 12, processingFee: 0 },
      { name: 'E-Rickshaw Loan', code: 'ERL', interestRate: 14, interestType: 'FLAT', minAmount: 50000, maxAmount: 200000, minTenure: 12, maxTenure: 36, processingFee: 500 },
      { name: 'Daily Collection Loan', code: 'DCL', interestRate: 24, interestType: 'FLAT', minAmount: 5000, maxAmount: 50000, minTenure: 1, maxTenure: 6, processingFee: 0 },
    ],
  });
  console.log('✅ Loan products created');

  // 9. Financial year
  await prisma.financialYear.upsert({
    where: { name: '2025-26' },
    update: {},
    create: { name: '2025-26', startDate: new Date('2025-04-01'), endDate: new Date('2026-03-31'), isCurrent: true },
  });
  console.log('✅ Financial year: 2025-26');

  // 10. Counters
  const counters = [
    { name: 'customer', prefix: 'RC' },
    { name: 'advisor', prefix: 'ADV' },
    { name: 'loan', prefix: 'LN' },
    { name: 'receipt', prefix: 'RCP' },
    { name: 'voucher', prefix: 'VCH' },
  ];
  for (const c of counters) {
    await prisma.counter.upsert({
      where: { name: c.name },
      update: {},
      create: { name: c.name, prefix: c.prefix, lastNo: 0 },
    });
  }
  console.log('✅ Counters initialized');

  // 11. Default config
  await prisma.configMaster.createMany({
    skipDuplicates: true,
    data: [
      { key: 'company_name', value: 'Rudraksh Capital', label: 'Company Name' },
      { key: 'company_address', value: 'Main Office Address', label: 'Company Address' },
      { key: 'company_phone', value: '9999999999', label: 'Company Phone' },
      { key: 'penalty_rate', value: '2', label: 'Penalty Rate (% per month)' },
      { key: 'late_days', value: '7', label: 'Grace Period (days)' },
    ],
  });
  console.log('✅ Default config set');

  console.log('\n🎉 Seed complete!\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
