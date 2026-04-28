'use client';

import React, { useEffect, useState } from 'react';
import { Card, Descriptions, Tag, Skeleton, message, Table, Button, Space, Popconfirm, Row, Col, Statistic, theme } from 'antd';
import { BankOutlined, CheckCircleOutlined, PlayCircleOutlined, DollarOutlined } from '@ant-design/icons';
import { api } from '@/lib/api';
import CollectEmiModal from '@/components/ui/CollectEmiModal';
import { useAuthStore } from '@/store/authStore';

import { useParams } from 'next/navigation';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'orange', PAID: 'green', PARTIAL: 'blue', OVERDUE: 'red',
};

export default function LoanLedgerPage() {
  const params = useParams();
  const id = params.id as string;
  const [loan, setLoan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [emiModalOpen, setEmiModalOpen] = useState(false);
  const [selectedEmi, setSelectedEmi] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const user = useAuthStore((s) => s.user);

  const fetchLoan = () => {
    if (!id) return;
    api.get(`/loans/${id}`)
      .then(res => { if (res.data.success) setLoan(res.data.data); else setErrorMsg(JSON.stringify(res.data)); })
      .catch((err) => {
        message.error('Failed to load loan');
        setErrorMsg(err.response?.data?.message || err.message);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchLoan(); }, [id]);

  const handleAction = async (action: string) => {
    try {
      const res = await api.patch(`/loans/${id}/${action}`);
      if (res.data.success) {
        message.success(res.data.message || `Loan ${action}d`);
        fetchLoan();
      }
    } catch (err: any) { message.error(err.response?.data?.message || 'Action failed'); }
  };

  if (loading) return <Skeleton active paragraph={{ rows: 12 }} />;
  if (!loan) return <div>Loan not found for ID: {id}. Error: {errorMsg}</div>;

  const canApprove = loan.status === 'APPLIED' && ['SUPER_ADMIN', 'BRANCH_MANAGER'].includes(user?.role || '');
  const canDisburse = loan.status === 'APPROVED' && ['SUPER_ADMIN', 'BRANCH_MANAGER'].includes(user?.role || '');

  const emiColumns = [
    { title: '#', dataIndex: 'installment', width: 50 },
    { title: 'Due Date', dataIndex: 'dueDate', render: (v: string) => new Date(v).toLocaleDateString() },
    { title: 'EMI', dataIndex: 'amount', render: (v: number) => `₹${Number(v).toLocaleString('en-IN')}` },
    { title: 'Principal', dataIndex: 'principal', render: (v: number) => `₹${Number(v).toLocaleString('en-IN')}` },
    { title: 'Interest', dataIndex: 'interest', render: (v: number) => `₹${Number(v).toLocaleString('en-IN')}` },
    { title: 'Paid', dataIndex: 'paidAmount', render: (v: number) => `₹${Number(v).toLocaleString('en-IN')}` },
    { title: 'Status', dataIndex: 'status', width: 90, render: (s: string) => <Tag color={STATUS_COLORS[s]}>{s}</Tag> },
    {
      title: '', key: 'a', width: 80, render: (_: any, r: any) => (
        ['DISBURSED', 'ACTIVE'].includes(loan.status) && r.status !== 'PAID' ? (
          <Button size="small" type="primary" onClick={() => { setSelectedEmi(r); setEmiModalOpen(true); }}>Collect</Button>
        ) : null
      ),
    },
  ];

  return (
    <div className="animate-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 12,
            background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 20,
          }}>
            <BankOutlined />
          </div>
          <div>
            <h2 style={{ margin: 0 }}>{loan.loanNo} <Tag color="blue">{loan.status}</Tag></h2>
            <span style={{ color: '#94A3B8', fontSize: 13 }}>{loan.customer?.name} ({loan.customer?.customerId})</span>
          </div>
        </div>
        <Space wrap>
          {canApprove && (
            <Popconfirm title="Approve this loan?" onConfirm={() => handleAction('approve')}>
              <Button type="primary" icon={<CheckCircleOutlined />}>Approve</Button>
            </Popconfirm>
          )}
          {canDisburse && (
            <Popconfirm title="Disburse and generate EMI schedule?" onConfirm={() => handleAction('disburse')}>
              <Button type="primary" style={{ background: '#10B981', border: 'none' }} icon={<PlayCircleOutlined />}>Disburse</Button>
            </Popconfirm>
          )}
        </Space>
      </div>

      {/* Summary */}
      <Card variant="borderless" style={{ borderRadius: 12, marginBottom: 20 }}>
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={6}><Statistic title="Principal" value={Number(loan.amount)} prefix="₹" /></Col>
          <Col xs={12} sm={6}><Statistic title="Interest" value={`${loan.interestRate}% ${loan.interestType}`} /></Col>
          <Col xs={12} sm={6}><Statistic title="EMI Amount" value={loan.emiAmount ? `₹${Number(loan.emiAmount).toLocaleString('en-IN')}` : 'TBD'} /></Col>
          <Col xs={12} sm={6}><Statistic title="Tenure" value={`${loan.tenure} months`} /></Col>
        </Row>
      </Card>

      {/* EMI Schedule */}
      <Card title="EMI Schedule" variant="borderless" style={{ borderRadius: 12 }}>
        <Table
          dataSource={loan.emiSchedules || []}
          columns={emiColumns}
          rowKey="id"
          pagination={loan.emiSchedules?.length > 24 ? { pageSize: 24, showTotal: (t: number) => `${t} installments` } : false}
          size="small"
          scroll={{ x: 'max-content' }}
        />
      </Card>

      <CollectEmiModal
        open={emiModalOpen}
        onCancel={() => setEmiModalOpen(false)}
        onSuccess={() => { setEmiModalOpen(false); fetchLoan(); }}
        loanId={loan.id}
        emiRecord={selectedEmi}
      />
    </div>
  );
}
