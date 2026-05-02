'use client';

import React, { useState, useRef } from 'react';
import { Tabs, Tag, Button, Space, Dropdown } from 'antd';
import { EyeOutlined, PlusOutlined, PrinterOutlined, FileTextOutlined, SafetyOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import DataTable from '@/components/ui/DataTable';
import { useReactToPrint } from 'react-to-print';
import { SanctionLetter } from '@/components/print/SanctionLetter';
import { LoanAgreement } from '@/components/print/LoanAgreement';

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
  const [selectedLoan, setSelectedLoan] = useState<any>(null);
  const [printType, setPrintType] = useState<'sanction' | 'agreement'>('sanction');
  
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `${printType === 'sanction' ? 'Sanction' : 'Agreement'}-${selectedLoan?.loanNo || 'Loan'}`,
  });

  const triggerPrint = (record: any, type: 'sanction' | 'agreement') => {
    setSelectedLoan(record);
    setPrintType(type);
    setTimeout(() => { handlePrint(); }, 100);
  };

  const columns = [
    { title: 'Loan No', dataIndex: 'loanNo', width: 130 },
    { title: 'Customer', dataIndex: ['customer', 'name'] },
    { title: 'Product', dataIndex: ['loanProduct', 'name'], width: 140 },
    { title: 'Amount', dataIndex: 'amount', width: 120, render: (v: number) => `₹${Number(v).toLocaleString('en-IN')}` },
    { title: 'Tenure', dataIndex: 'tenure', width: 90, render: (v: number) => `${v} mo` },
    { title: 'Status', dataIndex: 'status', width: 100, render: (s: string) => <Tag color={STATUS_COLORS[s] || 'default'}>{s}</Tag> },
    { title: 'Action', key: 'a', width: 180, render: (_: any, r: any) => (
      <Space size="small">
        <Button type="primary" size="small" ghost icon={<EyeOutlined />} onClick={() => router.push(`/loans/${r.id}`)}>
          View
        </Button>
        <Dropdown menu={{
          items: [
            { key: '1', label: 'Sanction Letter', icon: <FileTextOutlined />, onClick: () => triggerPrint(r, 'sanction') },
            { key: '2', label: 'Loan Agreement', icon: <SafetyOutlined />, onClick: () => triggerPrint(r, 'agreement') },
          ]
        }}>
          <Button size="small" icon={<PrinterOutlined />} />
        </Dropdown>
      </Space>
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

      {/* Hidden Print Templates */}
      <div style={{ display: 'none' }}>
        <div ref={printRef}>
          {printType === 'sanction' ? (
            <SanctionLetter loan={selectedLoan} />
          ) : (
            <LoanAgreement loan={selectedLoan} />
          )}
        </div>
      </div>
    </div>
  );
}
