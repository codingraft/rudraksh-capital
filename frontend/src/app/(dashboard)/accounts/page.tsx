'use client';

import React, { useState, useEffect } from 'react';
import {
  Tabs, Table, Tag, Button, DatePicker, Space, Form, Input, InputNumber,
  Select, Card, Row, Col, Statistic, Modal, message, Empty,
} from 'antd';
import {
  BookOutlined, BankOutlined, DollarOutlined, FileTextOutlined,
  CheckCircleOutlined, CloseCircleOutlined, ReloadOutlined,
  PlusOutlined, WalletOutlined, BarChartOutlined,
} from '@ant-design/icons';
import { api } from '@/lib/api';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

// ──── CASH BOOK ────
function CashBook() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [dates, setDates] = useState<any>(null);

  const fetch = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (dates?.[0]) params.fromDate = dates[0].format('YYYY-MM-DD');
      if (dates?.[1]) params.toDate = dates[1].format('YYYY-MM-DD');
      const res = await api.get('/accounts/cash-book', { params });
      if (res.data.success) setData(res.data.data);
    } catch (err: any) { message.error('Failed to load cash book'); }
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  return (
    <div>
      <Space style={{ marginBottom: 16 }} wrap>
        <RangePicker onChange={(d) => setDates(d)} />
        <Button icon={<ReloadOutlined />} onClick={fetch}>Load</Button>
      </Space>
      {data?.summary && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={8}><Card size="small"><Statistic title="Cash In" value={data.summary.totalCashIn} prefix="₹" precision={2} styles={{ content: { color: '#10B981' } }} /></Card></Col>
          <Col span={8}><Card size="small"><Statistic title="Cash Out" value={data.summary.totalCashOut} prefix="₹" precision={2} styles={{ content: { color: '#EF4444' } }} /></Card></Col>
          <Col span={8}><Card size="small"><Statistic title="Balance" value={data.summary.balance} prefix="₹" precision={2} styles={{ content: { color: '#6366F1' } }} /></Card></Col>
        </Row>
      )}
      <Table
        dataSource={data?.cashPayments || []} rowKey="id" loading={loading} size="middle"
        pagination={{ pageSize: 15 }}
        columns={[
          { title: 'Receipt No', dataIndex: 'receiptNo', width: 130 },
          { title: 'Date', dataIndex: 'createdAt', render: (v: string) => dayjs(v).format('DD/MM/YYYY HH:mm') },
          { title: 'Customer', render: (_: any, r: any) => r.loan?.customer?.name || '—' },
          { title: 'Loan No', render: (_: any, r: any) => r.loan?.loanNo || '—' },
          { title: 'Type', dataIndex: 'type', width: 90, render: (v: string) => <Tag color="blue">{v}</Tag> },
          { title: 'Amount', dataIndex: 'amount', width: 120, render: (v: number) => `₹${Number(v).toLocaleString('en-IN')}` },
          { title: 'Collected By', dataIndex: 'collectedBy' },
        ]}
      />
    </div>
  );
}

// ──── BANK BOOK ────
function BankBook() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [txnType, setTxnType] = useState<'deposit' | 'withdrawal'>('deposit');
  const [form] = Form.useForm();
  const [banks, setBanks] = useState<any[]>([]);

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await api.get('/accounts/bank-book');
      if (res.data.success) setData(res.data.data);
      const bankRes = await api.get('/masters/banks');
      if (bankRes.data.success) setBanks(bankRes.data.data);
    } catch { message.error('Failed to load bank book'); }
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const bank = banks.find(b => b.id === values.bankId);
      const endpoint = txnType === 'deposit' ? '/accounts/bank-deposit' : '/accounts/bank-withdrawal';
      await api.post(endpoint, { ...values, bankName: bank?.name || '' });
      message.success(`Bank ${txnType} recorded`);
      setModalOpen(false);
      form.resetFields();
      fetch();
    } catch (err: any) { message.error(err.response?.data?.message || 'Failed'); }
  };

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setTxnType('deposit'); setModalOpen(true); }}>Deposit</Button>
        <Button icon={<PlusOutlined />} onClick={() => { setTxnType('withdrawal'); setModalOpen(true); }}>Withdrawal</Button>
        <Button icon={<ReloadOutlined />} onClick={fetch}>Refresh</Button>
      </Space>
      {data?.summary && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={8}><Card size="small"><Statistic title="Total Deposits" value={data.summary.totalDeposits} prefix="₹" precision={2} styles={{ content: { color: '#10B981' } }} /></Card></Col>
          <Col span={8}><Card size="small"><Statistic title="Total Withdrawals" value={data.summary.totalWithdrawals} prefix="₹" precision={2} styles={{ content: { color: '#EF4444' } }} /></Card></Col>
          <Col span={8}><Card size="small"><Statistic title="Bank Balance" value={data.summary.balance} prefix="₹" precision={2} styles={{ content: { color: '#6366F1' } }} /></Card></Col>
        </Row>
      )}
      <Table
        dataSource={data?.transactions || []} rowKey="id" loading={loading} size="middle"
        pagination={{ pageSize: 15 }}
        columns={[
          { title: 'Date', dataIndex: 'date', render: (v: string) => dayjs(v).format('DD/MM/YYYY') },
          { title: 'Bank', dataIndex: 'bankName' },
          { title: 'Type', dataIndex: 'type', width: 100, render: (v: string) => <Tag color={v === 'DEPOSIT' ? 'green' : 'red'}>{v}</Tag> },
          { title: 'Amount', dataIndex: 'amount', width: 130, render: (v: number) => `₹${Number(v).toLocaleString('en-IN')}` },
          { title: 'Narration', dataIndex: 'narration' },
          { title: 'Reference', dataIndex: 'referenceNo', width: 120 },
        ]}
      />
      <Modal title={`Bank ${txnType === 'deposit' ? 'Deposit' : 'Withdrawal'}`} open={modalOpen}
        onCancel={() => setModalOpen(false)} onOk={handleSubmit} okText="Submit">
        <Form form={form} layout="vertical">
          <Form.Item name="bankId" label="Bank" rules={[{ required: true }]}>
            <Select options={banks.map(b => ({ value: b.id, label: `${b.name} - ${b.account || ''}` }))} showSearch optionFilterProp="label" />
          </Form.Item>
          <Form.Item name="amount" label="Amount" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} prefix="₹" /></Form.Item>
          <Form.Item name="narration" label="Narration"><Input /></Form.Item>
          <Form.Item name="referenceNo" label="Reference No"><Input /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

// ──── EXPENDITURE ────
function Expenditures() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await api.get('/accounts/expenditure');
      if (res.data.success) setData(res.data.data);
    } catch { message.error('Failed to load expenditures'); }
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      await api.post('/accounts/expenditure', values);
      message.success('Expenditure requisition created');
      setModalOpen(false);
      form.resetFields();
      fetch();
    } catch (err: any) { message.error(err.response?.data?.message || 'Failed'); }
  };

  const handleAction = async (id: string, action: string) => {
    try {
      if (action === 'approve') await api.patch(`/accounts/expenditure/${id}/approve`);
      else if (action === 'reject') await api.patch(`/accounts/expenditure/${id}/reject`);
      else if (action === 'pay') await api.post(`/accounts/expenditure/${id}/pay`, { method: 'CASH' });
      message.success(`Expenditure ${action}d`);
      fetch();
    } catch (err: any) { message.error(err.response?.data?.message || 'Failed'); }
  };

  const STATUS_COLORS: Record<string, string> = { REQUISITION: 'orange', APPROVED: 'blue', REJECTED: 'red', PAID: 'green' };

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>New Requisition</Button>
        <Button icon={<ReloadOutlined />} onClick={fetch}>Refresh</Button>
      </Space>
      <Table
        dataSource={data} rowKey="id" loading={loading} size="middle"
        pagination={{ pageSize: 15 }}
        columns={[
          { title: 'Date', dataIndex: 'date', render: (v: string) => dayjs(v).format('DD/MM/YYYY') },
          { title: 'Account Head', dataIndex: 'accountHead' },
          { title: 'Amount', dataIndex: 'amount', width: 120, render: (v: number) => `₹${Number(v).toLocaleString('en-IN')}` },
          { title: 'Narration', dataIndex: 'narration' },
          { title: 'Requested By', dataIndex: 'requestedBy', width: 120 },
          { title: 'Status', dataIndex: 'status', width: 110, render: (v: string) => <Tag color={STATUS_COLORS[v]}>{v}</Tag> },
          { title: 'Voucher No', dataIndex: 'voucherNo', width: 120 },
          {
            title: 'Action', key: 'action', width: 200,
            render: (_: any, r: any) => (
              <Space size="small">
                {r.status === 'REQUISITION' && <>
                  <Button size="small" type="primary" icon={<CheckCircleOutlined />} onClick={() => handleAction(r.id, 'approve')}>Approve</Button>
                  <Button size="small" danger icon={<CloseCircleOutlined />} onClick={() => handleAction(r.id, 'reject')}>Reject</Button>
                </>}
                {r.status === 'APPROVED' && (
                  <Button size="small" type="primary" icon={<DollarOutlined />} onClick={() => handleAction(r.id, 'pay')}>Pay</Button>
                )}
              </Space>
            ),
          },
        ]}
      />
      <Modal title="New Expenditure Requisition" open={modalOpen} onCancel={() => setModalOpen(false)} onOk={handleCreate}>
        <Form form={form} layout="vertical">
          <Form.Item name="accountHead" label="Account Head" rules={[{ required: true }]}><Input placeholder="e.g. Office Rent, Salary, Travel" /></Form.Item>
          <Form.Item name="amount" label="Amount" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} prefix="₹" /></Form.Item>
          <Form.Item name="narration" label="Narration"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

// ──── DAY BOOK ────
function DayBook() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState<any>(dayjs());

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await api.get('/accounts/day-book', { params: { date: date?.format('YYYY-MM-DD') } });
      if (res.data.success) setData(res.data.data);
    } catch { message.error('Failed to load day book'); }
    setLoading(false);
  };

  useEffect(() => { fetch(); }, [date]);

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <DatePicker value={date} onChange={setDate} />
        <Button icon={<ReloadOutlined />} onClick={fetch}>Refresh</Button>
      </Space>
      {data?.summary && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}><Card size="small"><Statistic title="Total Debit" value={data.summary.totalDebit} prefix="₹" precision={2} /></Card></Col>
          <Col span={6}><Card size="small"><Statistic title="Total Credit" value={data.summary.totalCredit} prefix="₹" precision={2} /></Card></Col>
          <Col span={6}><Card size="small"><Statistic title="Total Payments" value={data.summary.totalPayments} prefix="₹" precision={2} /></Card></Col>
          <Col span={6}><Card size="small"><Statistic title="Transactions" value={data.summary.transactionCount} /></Card></Col>
        </Row>
      )}
      <h4 style={{ marginTop: 16, marginBottom: 8 }}>Account Entries</h4>
      <Table
        dataSource={data?.accountEntries || []} rowKey="id" loading={loading} size="small"
        pagination={false}
        columns={[
          { title: 'Account', dataIndex: 'accountHead' },
          { title: 'Type', dataIndex: 'type', width: 80, render: (v: string) => <Tag color={v === 'CREDIT' ? 'green' : 'red'}>{v}</Tag> },
          { title: 'Amount', dataIndex: 'amount', width: 120, render: (v: number) => `₹${Number(v).toLocaleString('en-IN')}` },
          { title: 'Narration', dataIndex: 'narration' },
        ]}
      />
      <h4 style={{ marginTop: 16, marginBottom: 8 }}>Payments</h4>
      <Table
        dataSource={data?.payments || []} rowKey="id" loading={loading} size="small"
        pagination={false}
        columns={[
          { title: 'Receipt', dataIndex: 'receiptNo', width: 120 },
          { title: 'Type', dataIndex: 'type', width: 90, render: (v: string) => <Tag color="blue">{v}</Tag> },
          { title: 'Amount', dataIndex: 'amount', width: 120, render: (v: number) => `₹${Number(v).toLocaleString('en-IN')}` },
          { title: 'Method', dataIndex: 'method', width: 100 },
          { title: 'Collected By', dataIndex: 'collectedBy' },
        ]}
      />
    </div>
  );
}

// ──── TRIAL BALANCE ────
function TrialBalance() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await api.get('/accounts/trial-balance');
      if (res.data.success) setData(res.data.data);
    } catch { message.error('Failed to load trial balance'); }
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  return (
    <div>
      <Button icon={<ReloadOutlined />} onClick={fetch} style={{ marginBottom: 16 }}>Refresh</Button>
      {data?.summary && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={8}><Card size="small"><Statistic title="Total Debit" value={data.summary.totalDebit} prefix="₹" precision={2} /></Card></Col>
          <Col span={8}><Card size="small"><Statistic title="Total Credit" value={data.summary.totalCredit} prefix="₹" precision={2} /></Card></Col>
          <Col span={8}><Card size="small"><Statistic title="Difference" value={Math.abs(data.summary.totalCredit - data.summary.totalDebit)} prefix="₹" precision={2} /></Card></Col>
        </Row>
      )}
      <Table
        dataSource={data?.entries || []} rowKey="accountHead" loading={loading} size="middle"
        pagination={false}
        columns={[
          { title: 'Account Head', dataIndex: 'accountHead' },
          { title: 'Debit (₹)', dataIndex: 'debit', width: 140, render: (v: number) => v > 0 ? `₹${v.toLocaleString('en-IN')}` : '—' },
          { title: 'Credit (₹)', dataIndex: 'credit', width: 140, render: (v: number) => v > 0 ? `₹${v.toLocaleString('en-IN')}` : '—' },
          { title: 'Balance (₹)', dataIndex: 'balance', width: 140, render: (v: number) => <span style={{ color: v >= 0 ? '#10B981' : '#EF4444', fontWeight: 700 }}>₹{Math.abs(v).toLocaleString('en-IN')}</span> },
        ]}
      />
    </div>
  );
}

// ──── CASH SHEET ────
function CashSheet() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState<any>(dayjs());

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await api.get('/accounts/cash-sheet', { params: { date: date?.format('YYYY-MM-DD') } });
      if (res.data.success) setData(res.data.data);
    } catch { message.error('Failed to load cash sheet'); }
    setLoading(false);
  };

  useEffect(() => { fetch(); }, [date]);

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <DatePicker value={date} onChange={setDate} />
        <Button icon={<ReloadOutlined />} onClick={fetch}>Refresh</Button>
      </Space>
      {data?.summary && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}><Card size="small"><Statistic title="Cash In" value={data.summary.totalCashIn} prefix="₹" precision={2} styles={{ content: { color: '#10B981' } }} /></Card></Col>
          <Col span={6}><Card size="small"><Statistic title="Cash Out" value={data.summary.totalCashOut} prefix="₹" precision={2} styles={{ content: { color: '#EF4444' } }} /></Card></Col>
          <Col span={6}><Card size="small"><Statistic title="Bank Deposit" value={data.summary.totalBankDeposit} prefix="₹" precision={2} /></Card></Col>
          <Col span={6}><Card size="small"><Statistic title="Cash In Hand" value={data.summary.cashInHand} prefix="₹" precision={2} styles={{ content: { color: '#6366F1', fontWeight: 700 } }} /></Card></Col>
        </Row>
      )}
      <h4>Cash Receipts ({data?.cashReceipts?.length || 0})</h4>
      <Table
        dataSource={data?.cashReceipts || []} rowKey="id" loading={loading} size="small" pagination={false}
        columns={[
          { title: 'Receipt', dataIndex: 'receiptNo', width: 120 },
          { title: 'Customer', render: (_: any, r: any) => r.loan?.customer?.name || '—' },
          { title: 'Loan', render: (_: any, r: any) => r.loan?.loanNo || '—' },
          { title: 'Amount', dataIndex: 'amount', width: 120, render: (v: number) => `₹${Number(v).toLocaleString('en-IN')}` },
        ]}
      />
    </div>
  );
}

// ──── MAIN PAGE ────
export default function AccountsPage() {
  return (
    <div className="animate-in">
      <div className="page-header"><h2>Accounts</h2></div>
      <Tabs
        type="card"
        items={[
          { key: 'cash-book', label: '💵 Cash Book', children: <CashBook />, icon: <WalletOutlined /> },
          { key: 'bank-book', label: '🏦 Bank Book', children: <BankBook />, icon: <BankOutlined /> },
          { key: 'day-book', label: '📅 Day Book', children: <DayBook />, icon: <BookOutlined /> },
          { key: 'expenditure', label: '📋 Expenditure', children: <Expenditures />, icon: <FileTextOutlined /> },
          { key: 'trial-balance', label: '⚖️ Trial Balance', children: <TrialBalance />, icon: <BarChartOutlined /> },
          { key: 'cash-sheet', label: '🧾 Cash Sheet', children: <CashSheet />, icon: <DollarOutlined /> },
        ]}
      />
    </div>
  );
}
