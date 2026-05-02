'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Tag, Button, Space, Tabs, Form, Input, InputNumber, Select, Modal, message, Table, DatePicker, Card, Row, Col, Statistic } from 'antd';
import { PrinterOutlined, PlusOutlined, ReloadOutlined, DollarOutlined, SearchOutlined } from '@ant-design/icons';
import DataTable from '@/components/ui/DataTable';
import { useReactToPrint } from 'react-to-print';
import { ReceiptTemplate } from '@/components/print/ReceiptTemplate';
import { api } from '@/lib/api';
import dayjs from 'dayjs';

// ──── EMI COLLECTION ────
function EmiCollection() {
  const [loans, setLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<any>(null);

  const searchLoans = async (search: string) => {
    if (!search || search.length < 2) return;
    setLoading(true);
    try {
      const res = await api.get('/loans', { params: { search, status: 'ACTIVE' } });
      if (res.data.success) setLoans(res.data.data);
    } catch { }
    setLoading(false);
  };

  const handleCollect = async () => {
    try {
      const values = await form.validateFields();
      const res = await api.post('/payments/emi', values);
      if (res.data.success) {
        message.success(res.data.message);
        form.resetFields();
        setModalOpen(false);
        setSelectedLoan(null);
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to collect EMI');
    }
  };

  return (
    <div>
      <Button type="primary" icon={<DollarOutlined />} onClick={() => setModalOpen(true)} style={{ marginBottom: 16 }}>
        Collect EMI
      </Button>
      <Modal title="Collect EMI Payment" open={modalOpen} onCancel={() => setModalOpen(false)} onOk={handleCollect} okText="Collect" width={560}>
        <Form form={form} layout="vertical">
          <Form.Item name="loanId" label="Select Loan" rules={[{ required: true }]}>
            <Select
              showSearch
              placeholder="Search by loan no, customer name, phone..."
              onSearch={searchLoans}
              filterOption={false}
              loading={loading}
              options={loans.map(l => ({
                value: l.id,
                label: `${l.loanNo} — ${l.customer?.name || ''} (₹${Number(l.amount).toLocaleString('en-IN')})`,
              }))}
              onChange={(v) => setSelectedLoan(loans.find(l => l.id === v))}
            />
          </Form.Item>
          {selectedLoan && (
            <Card size="small" style={{ marginBottom: 12 }}>
              <Row gutter={16}>
                <Col span={8}><Statistic title="Loan Amount" value={Number(selectedLoan.amount)} prefix="₹" /></Col>
                <Col span={8}><Statistic title="EMI" value={Number(selectedLoan.emiAmount || 0)} prefix="₹" /></Col>
                <Col span={8}><Statistic title="Status" value={selectedLoan.status} /></Col>
              </Row>
            </Card>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item name="amount" label="Amount" rules={[{ required: true }]}>
              <InputNumber style={{ width: '100%' }} prefix="₹" />
            </Form.Item>
            <Form.Item name="method" label="Method" initialValue="CASH">
              <Select options={[
                { value: 'CASH', label: 'Cash' }, { value: 'UPI', label: 'UPI' },
                { value: 'BANK_TRANSFER', label: 'Bank Transfer' }, { value: 'CHEQUE', label: 'Cheque' },
              ]} />
            </Form.Item>
          </div>
          <Form.Item name="narration" label="Narration"><Input /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

// ──── NON-EMI PAYMENT ────
function NonEmiPayment() {
  const [loans, setLoans] = useState<any[]>([]);
  const [form] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);

  const searchLoans = async (search: string) => {
    if (!search || search.length < 2) return;
    try {
      const res = await api.get('/loans', { params: { search } });
      if (res.data.success) setLoans(res.data.data);
    } catch { }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const res = await api.post('/payments/non-emi', values);
      if (res.data.success) {
        message.success(res.data.message);
        form.resetFields();
        setModalOpen(false);
      }
    } catch (err: any) { message.error(err.response?.data?.message || 'Failed'); }
  };

  return (
    <div>
      <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)} style={{ marginBottom: 16 }}>
        Non-EMI Payment
      </Button>
      <Modal title="Non-EMI Payment" open={modalOpen} onCancel={() => setModalOpen(false)} onOk={handleSubmit}>
        <Form form={form} layout="vertical">
          <Form.Item name="loanId" label="Loan" rules={[{ required: true }]}>
            <Select showSearch onSearch={searchLoans} filterOption={false}
              options={loans.map(l => ({ value: l.id, label: `${l.loanNo} — ${l.customer?.name}` }))} />
          </Form.Item>
          <Form.Item name="amount" label="Amount" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} prefix="₹" /></Form.Item>
          <Form.Item name="method" label="Method" initialValue="CASH">
            <Select options={[{ value: 'CASH', label: 'Cash' }, { value: 'UPI', label: 'UPI' }, { value: 'BANK_TRANSFER', label: 'Bank' }]} />
          </Form.Item>
          <Form.Item name="narration" label="Narration"><Input /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

// ──── COMMISSION PAYMENT ────
function CommissionPayment() {
  const [advisors, setAdvisors] = useState<any[]>([]);
  const [form] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);

  const searchAdvisors = async (search: string) => {
    if (!search || search.length < 2) return;
    try {
      const res = await api.get('/advisors', { params: { search } });
      if (res.data.success) setAdvisors(res.data.data);
    } catch { }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const res = await api.post('/payments/commission', values);
      if (res.data.success) {
        message.success(res.data.message);
        form.resetFields();
        setModalOpen(false);
      }
    } catch (err: any) { message.error(err.response?.data?.message || 'Failed'); }
  };

  return (
    <div>
      <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)} style={{ marginBottom: 16 }}>
        Pay Commission
      </Button>
      <Modal title="Commission Payment" open={modalOpen} onCancel={() => setModalOpen(false)} onOk={handleSubmit}>
        <Form form={form} layout="vertical">
          <Form.Item name="advisorId" label="Advisor" rules={[{ required: true }]}>
            <Select showSearch onSearch={searchAdvisors} filterOption={false}
              options={advisors.map(a => ({ value: a.id, label: `${a.advisorId} — ${a.name}` }))} />
          </Form.Item>
          <Form.Item name="amount" label="Amount" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} prefix="₹" /></Form.Item>
          <Form.Item name="method" label="Method" initialValue="CASH">
            <Select options={[{ value: 'CASH', label: 'Cash' }, { value: 'UPI', label: 'UPI' }, { value: 'BANK_TRANSFER', label: 'Bank' }]} />
          </Form.Item>
          <Form.Item name="narration" label="Narration"><Input /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

// ──── MAIN PAGE ────
export default function PaymentsPage() {
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `Receipt-${selectedPayment?.receiptNo || 'Unknown'}`,
  });

  const triggerPrint = (record: any) => {
    setSelectedPayment(record);
    setTimeout(() => { handlePrint(); }, 100);
  };

  const columns = [
    { title: 'Receipt No', dataIndex: 'receiptNo', width: 130 },
    { title: 'Date', dataIndex: 'createdAt', render: (v: string) => dayjs(v).format('DD/MM/YYYY HH:mm') },
    { title: 'Type', dataIndex: 'type', width: 100, render: (v: string) => {
      const colors: Record<string, string> = { EMI: 'blue', NON_EMI: 'purple', PART_PAYMENT: 'cyan', COMMISSION: 'orange', GENERAL: 'default', EXPENDITURE: 'red' };
      return <Tag color={colors[v] || 'default'}>{v.replace('_', ' ')}</Tag>;
    }},
    { title: 'Customer', render: (_: any, r: any) => r.loan?.customer?.name || '—' },
    { title: 'Loan No', render: (_: any, r: any) => r.loan?.loanNo || '—' },
    { title: 'Amount', dataIndex: 'amount', width: 120, render: (v: number) => `₹${Number(v).toLocaleString('en-IN')}` },
    { title: 'Method', dataIndex: 'method', width: 100 },
    { title: 'Collected By', dataIndex: 'collectedBy', width: 120 },
    {
      title: 'Action', key: 'action', width: 60,
      render: (_: any, record: any) => (
        <Button type="text" icon={<PrinterOutlined />} onClick={() => triggerPrint(record)} title="Print Receipt" />
      )
    },
  ];

  return (
    <div className="animate-in">
      <div className="page-header"><h2>Payments</h2></div>

      <Tabs
        type="card"
        items={[
          {
            key: 'all',
            label: '📋 All Payments',
            children: (
              <div key={refreshKey}>
                <DataTable title="Payment" endpoint="/payments" columns={columns} />
              </div>
            ),
          },
          { key: 'emi', label: '💵 Collect EMI', children: <EmiCollection /> },
          { key: 'non-emi', label: '📝 Non-EMI', children: <NonEmiPayment /> },
          { key: 'commission', label: '💰 Commission', children: <CommissionPayment /> },
        ]}
      />

      {/* Hidden Print Template */}
      <div style={{ display: 'none' }}>
        <ReceiptTemplate ref={printRef} payment={selectedPayment} />
      </div>
    </div>
  );
}
