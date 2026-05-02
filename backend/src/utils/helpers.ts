import prisma from '../config/database';

// Safely get string from Express query param
export function qs(val: any): string | undefined {
  if (typeof val === 'string') return val;
  if (Array.isArray(val)) return val[0] as string;
  return undefined;
}

// Generate auto-incrementing IDs like RC-0001, ADV-0001, LN-202504-0001
export async function generateId(counterName: string): Promise<string> {
  const counter = await prisma.counter.upsert({
    where: { name: counterName },
    update: { lastNo: { increment: 1 } },
    create: { name: counterName, prefix: getPrefix(counterName), lastNo: 1 },
  });

  const num = counter.lastNo.toString().padStart(4, '0');

  if (counterName === 'loan') {
    const now = new Date();
    const yymm = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    return `${counter.prefix}-${yymm}-${num}`;
  }

  return `${counter.prefix}-${num}`;
}

function getPrefix(name: string): string {
  const prefixes: Record<string, string> = {
    customer: 'RC',
    advisor: 'ADV',
    loan: 'LN',
    receipt: 'RCP',
    voucher: 'VCH',
    group: 'GRP',
  };
  return prefixes[name] || name.toUpperCase().slice(0, 3);
}

// Pagination helper
export function getPagination(query: any) {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

// Format pagination response
export function paginatedResponse(data: any[], total: number, page: number, limit: number) {
  return {
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  };
}

// EMI Calculator
export function calculateEMI(principal: number, annualRate: number, tenureMonths: number, type: string) {
  if (type === 'FLAT') {
    const totalInterest = (principal * annualRate * tenureMonths) / (12 * 100);
    const totalPayable = principal + totalInterest;
    const emiAmount = totalPayable / tenureMonths;
    return {
      emiAmount: Math.round(emiAmount * 100) / 100,
      totalInterest: Math.round(totalInterest * 100) / 100,
      totalPayable: Math.round(totalPayable * 100) / 100,
    };
  }

  if (type === 'REDUCING') {
    const monthlyRate = annualRate / (12 * 100);
    if (monthlyRate === 0) {
      return {
        emiAmount: Math.round((principal / tenureMonths) * 100) / 100,
        totalInterest: 0,
        totalPayable: principal,
      };
    }
    const emiAmount = (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
      (Math.pow(1 + monthlyRate, tenureMonths) - 1);
    const totalPayable = emiAmount * tenureMonths;
    const totalInterest = totalPayable - principal;
    return {
      emiAmount: Math.round(emiAmount * 100) / 100,
      totalInterest: Math.round(totalInterest * 100) / 100,
      totalPayable: Math.round(totalPayable * 100) / 100,
    };
  }

  if (type === 'MONTHLY') {
    const monthlyInterest = (principal * annualRate) / (12 * 100);
    const emiAmount = monthlyInterest; // Interest only monthly, principal at end
    const totalInterest = monthlyInterest * tenureMonths;
    return {
      emiAmount: Math.round(emiAmount * 100) / 100,
      totalInterest: Math.round(totalInterest * 100) / 100,
      totalPayable: Math.round((principal + totalInterest) * 100) / 100,
    };
  }

  throw new Error(`Unknown interest type: ${type}`);
}

// Generate EMI schedule
export function generateEMISchedule(
  principal: number,
  annualRate: number,
  tenureMonths: number,
  type: string,
  startDate: Date
) {
  const schedule = [];
  const monthlyRate = annualRate / (12 * 100);

  if (type === 'FLAT') {
    const { emiAmount, totalInterest } = calculateEMI(principal, annualRate, tenureMonths, type);
    const monthlyPrincipal = principal / tenureMonths;
    const monthlyInterest = totalInterest / tenureMonths;

    for (let i = 1; i <= tenureMonths; i++) {
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + i);
      schedule.push({
        installment: i,
        dueDate,
        amount: emiAmount,
        principal: Math.round(monthlyPrincipal * 100) / 100,
        interest: Math.round(monthlyInterest * 100) / 100,
      });
    }
  } else if (type === 'REDUCING') {
    let balance = principal;
    const { emiAmount } = calculateEMI(principal, annualRate, tenureMonths, type);

    for (let i = 1; i <= tenureMonths; i++) {
      const interest = balance * monthlyRate;
      const principalPart = emiAmount - interest;
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + i);

      schedule.push({
        installment: i,
        dueDate,
        amount: Math.round(emiAmount * 100) / 100,
        principal: Math.round(principalPart * 100) / 100,
        interest: Math.round(interest * 100) / 100,
      });

      balance -= principalPart;
    }
  } else if (type === 'MONTHLY') {
    const monthlyInterest = (principal * annualRate) / (12 * 100);

    for (let i = 1; i <= tenureMonths; i++) {
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + i);
      const isLast = i === tenureMonths;

      schedule.push({
        installment: i,
        dueDate,
        amount: isLast
          ? Math.round((principal + monthlyInterest) * 100) / 100
          : Math.round(monthlyInterest * 100) / 100,
        principal: isLast ? principal : 0,
        interest: Math.round(monthlyInterest * 100) / 100,
      });
    }
  }

  return schedule;
}
