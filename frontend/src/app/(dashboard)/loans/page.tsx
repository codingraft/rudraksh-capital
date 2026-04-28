'use client';

import React, { useState } from 'react';
import { Tabs, Tag, Button } from 'antd';
import { EyeOutlined, PlusOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import DataTable from '@/components/ui/DataTable';

const STATUS_COLORS: Record<string, string> = {
  APPLIED: 'orange', APPROVED: 'blue', DISBURSED: 'cyan',
  ACTIVE: 'green', CLOSED: 'default', DEFAULTED: 'red',
};

const TABS = [
  { label: 'All', key: 'ALL' },
  { label: 'Pending', key: 'APPLIED' },
  { label: 'Approved', key: 'APPROVED' },
  { label: 'Active', key: 'ACTIVE' },
  { label: 'Closed', key: 'CLOSED' },
  { label: 'Defaulted', key: 'DEFAULTED' },
];

export default function LoansPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('ALL');

  const columns = [
    { title: 'Loan No', dataIndex: 'loanNo', width: 130 },
    { title: 'Customer', dataIndex: ['customer', 'name'] },
    { title: 'Product', dataIndex: ['loanProduct', 'name'], width: 140 },
    { title: 'Amount', dataIndex: 'amount', width: 120, render: (v: number) => `₹${Number(v).toLocaleString('en-IN')}` },
    { title: 'Tenure', dataIndex: 'tenure', width: 90, render: (v: number) => `${v} mo` },
    { title: 'Status', dataIndex: 'status', width: 100, render: (s: string) => <Tag color={STATUS_COLORS[s] || 'default'}>{s}</Tag> },
    { title: '', key: 'a', width: 100, render: (_: any, r: any) => (
      <Button type="primary" size="small" ghost icon={<EyeOutlined />} onClick={() => router.push(`/loans/${r.id}`)}>
        Ledger
      </Button>
    )},
  ];

  return (
    <div className="animate-in">
      <div className="page-header">
        <h2>Loans</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => router.push('/loans/create')}>
          New Application
        </Button>
      </div>
      <Tabs activeKey={activeTab} onChange={setActiveTab} type="card" items={TABS} style={{ marginBottom: 16 }} />
      <DataTable
        key={activeTab}
        title="Loan"
        endpoint={`/loans${activeTab !== 'ALL' ? `?status=${activeTab}` : ''}`}
        columns={columns}
      />
    </div>
  );
}
