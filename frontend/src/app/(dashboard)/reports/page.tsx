'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Tabs, Table, Tag, Button, DatePicker, Space, Card, Row, Col,
  Statistic, Select, Input, message, Empty,
} from 'antd';
import {
  TeamOutlined, BankOutlined, DollarOutlined, WarningOutlined,
  FileTextOutlined, BarChartOutlined, PrinterOutlined, ReloadOutlined,
  CheckCircleOutlined, CloseCircleOutlined, SearchOutlined,
} from '@ant-design/icons';
import { api } from '@/lib/api';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

// ──── GENERIC REPORT COMPONENT ────
interface ReportConfig {
  title: string;
  endpoint: string;
  columns: any[];
  summaryFields?: { key: string; title: string; prefix?: string; color?: string }[];
  dateField?: 'from/to' | 'date';
  extraFilters?: React.ReactNode;
  dataPath?: string;
}

function ReportTab({ config }: { config: ReportConfig }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [dates, setDates] = useState<any>(null);

  const fetch = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (dates?.[0]) params.from = dates[0].format('YYYY-MM-DD');
      if (dates?.[1]) params.to = dates[1].format('YYYY-MM-DD');
      const res = await api.get(config.endpoint, { params });
      if (res.data.success) setData(res.data.data);
    } catch { message.error(`Failed to load ${config.title}`); }
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const tableData = config.dataPath
    ? (data?.[config.dataPath] || data?.loans || data?.payments || data?.overdues || [])
    : (data?.loans || data?.payments || data?.overdues || data || []);

  return (
    <div>
      <Space style={{ marginBottom: 16 }} wrap>
        <RangePicker onChange={(d) => setDates(d)} />
        <Button type="primary" icon={<SearchOutlined />} onClick={fetch}>Generate</Button>
        <Button icon={<ReloadOutlined />} onClick={fetch}>Refresh</Button>
      </Space>

      {data && config.summaryFields && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          {config.summaryFields.map(sf => (
            <Col key={sf.key} span={Math.floor(24 / config.summaryFields!.length)}>
              <Card size="small">
                <Statistic
                  title={sf.title}
                  value={data[sf.key] ?? data?.summary?.[sf.key] ?? data?.[sf.key] ?? 0}
                  prefix={sf.prefix || ''}
                  styles={{ content: sf.color ? { color: sf.color } : undefined }}
                />
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Table
        dataSource={Array.isArray(tableData) ? tableData : []}
        rowKey={(r: any) => r.id || r.loanNo || r.receiptNo || Math.random().toString()}
        loading={loading} size="middle"
        pagination={{ pageSize: 20, showTotal: (t) => `Total: ${t}` }}
        columns={config.columns}
        scroll={{ x: 'max-content' }}
      />
    </div>
  );
}

// ──── REPORT CONFIGURATIONS ────
const REPORTS: Record<string, ReportConfig> = {
  'collection-sheet': {
    title: 'Collection Sheet',
    endpoint: '/reports/collection-sheet',
    summaryFields: [
      { key: 'total', title: 'Total Collection', prefix: '₹', color: '#10B981' },
      { key: 'count', title: 'Transactions' },
    ],
    columns: [
      { title: 'Receipt No', dataIndex: 'receiptNo', width: 120 },
      { title: 'Customer', render: (_: any, r: any) => r.loan?.customer?.name || '—' },
      { title: 'Loan No', render: (_: any, r: any) => r.loan?.loanNo || '—' },
      { title: 'Type', dataIndex: 'type', width: 90, render: (v: string) => <Tag color="blue">{v}</Tag> },
      { title: 'Amount', dataIndex: 'amount', width: 120, render: (v: number) => `₹${Number(v).toLocaleString('en-IN')}` },
      { title: 'Method', dataIndex: 'method', width: 100 },
      { title: 'Collected By', dataIndex: 'collectedBy' },
    ],
  },
  'due-report': {
    title: 'Due Report',
    endpoint: '/reports/due-report',
    summaryFields: [
      { key: 'totalOverdue', title: 'Total Overdue', prefix: '₹', color: '#EF4444' },
      { key: 'count', title: 'Overdue EMIs' },
    ],
    columns: [
      { title: 'Loan No', render: (_: any, r: any) => r.loan?.loanNo },
      { title: 'Customer', render: (_: any, r: any) => r.loan?.customer?.name },
      { title: 'Phone', render: (_: any, r: any) => r.loan?.customer?.phone },
      { title: 'Due Date', dataIndex: 'dueDate', render: (v: string) => dayjs(v).format('DD/MM/YYYY') },
      { title: 'EMI Amount', dataIndex: 'amount', width: 110, render: (v: number) => `₹${Number(v).toLocaleString('en-IN')}` },
      { title: 'Paid', dataIndex: 'paidAmount', width: 100, render: (v: number) => `₹${Number(v).toLocaleString('en-IN')}` },
      { title: 'Pending', render: (_: any, r: any) => `₹${(Number(r.amount) - Number(r.paidAmount)).toLocaleString('en-IN')}` },
      { title: 'Status', dataIndex: 'status', width: 90, render: (v: string) => <Tag color={v === 'OVERDUE' ? 'red' : 'orange'}>{v}</Tag> },
    ],
  },
  'disbursement': {
    title: 'Disbursement Report',
    endpoint: '/reports/disbursement',
    summaryFields: [
      { key: 'totalDisbursed', title: 'Total Disbursed', prefix: '₹', color: '#6366F1' },
      { key: 'count', title: 'Loans Disbursed' },
    ],
    columns: [
      { title: 'Loan No', dataIndex: 'loanNo', width: 160 },
      { title: 'Customer', render: (_: any, r: any) => r.customer?.name },
      { title: 'Product', render: (_: any, r: any) => r.loanProduct?.name },
      { title: 'Branch', render: (_: any, r: any) => r.branch?.name },
      { title: 'Amount', dataIndex: 'amount', width: 120, render: (v: number) => `₹${Number(v).toLocaleString('en-IN')}` },
      { title: 'Disbursed', dataIndex: 'disbursedDate', render: (v: string) => v ? dayjs(v).format('DD/MM/YYYY') : '—' },
    ],
  },
  'emi-collection': {
    title: 'EMI Collection Report',
    endpoint: '/reports/emi-collection',
    summaryFields: [
      { key: 'total', title: 'Total EMI Collection', prefix: '₹', color: '#10B981' },
      { key: 'count', title: 'Payments' },
    ],
    columns: [
      { title: 'Receipt', dataIndex: 'receiptNo', width: 120 },
      { title: 'Loan No', render: (_: any, r: any) => r.loan?.loanNo },
      { title: 'Customer', render: (_: any, r: any) => r.loan?.customer?.name },
      { title: 'Amount', dataIndex: 'amount', width: 120, render: (v: number) => `₹${Number(v).toLocaleString('en-IN')}` },
      { title: 'Method', dataIndex: 'method', width: 100 },
      { title: 'Date', dataIndex: 'createdAt', render: (v: string) => dayjs(v).format('DD/MM/YYYY HH:mm') },
    ],
  },
  'non-emi-collection': {
    title: 'Non-EMI Collection',
    endpoint: '/reports/non-emi-collection',
    summaryFields: [
      { key: 'total', title: 'Total Non-EMI', prefix: '₹', color: '#F59E0B' },
      { key: 'count', title: 'Payments' },
    ],
    columns: [
      { title: 'Receipt', dataIndex: 'receiptNo', width: 120 },
      { title: 'Loan No', render: (_: any, r: any) => r.loan?.loanNo },
      { title: 'Customer', render: (_: any, r: any) => r.loan?.customer?.name },
      { title: 'Type', dataIndex: 'type', width: 100, render: (v: string) => <Tag>{v}</Tag> },
      { title: 'Amount', dataIndex: 'amount', width: 120, render: (v: number) => `₹${Number(v).toLocaleString('en-IN')}` },
      { title: 'Date', dataIndex: 'createdAt', render: (v: string) => dayjs(v).format('DD/MM/YYYY') },
    ],
  },
  'loan-outstanding': {
    title: 'Loan Outstanding',
    endpoint: '/reports/loan-outstanding',
    dataPath: 'loans',
    summaryFields: [
      { key: 'totalOutstanding', title: 'Total Outstanding', prefix: '₹', color: '#EF4444' },
      { key: 'count', title: 'Active Loans' },
    ],
    columns: [
      { title: 'Loan No', dataIndex: 'loanNo', width: 160 },
      { title: 'Customer', render: (_: any, r: any) => r.customer?.name },
      { title: 'Phone', render: (_: any, r: any) => r.customer?.phone, width: 120 },
      { title: 'Product', render: (_: any, r: any) => r.loanProduct?.name },
      { title: 'Loan Amt', dataIndex: 'amount', width: 110, render: (v: number) => `₹${Number(v).toLocaleString('en-IN')}` },
      { title: 'Total Payable', dataIndex: 'totalPayable', width: 120, render: (v: number) => `₹${Number(v).toLocaleString('en-IN')}` },
      { title: 'Paid', dataIndex: 'totalPaid', width: 100, render: (v: number) => `₹${v.toLocaleString('en-IN')}` },
      { title: 'Outstanding', dataIndex: 'outstanding', width: 120, render: (v: number) => <span style={{ color: '#EF4444', fontWeight: 700 }}>₹{v.toLocaleString('en-IN')}</span> },
    ],
  },
  'loan-requisition': {
    title: 'Loan Requisition',
    endpoint: '/reports/loan-requisition',
    dataPath: 'loans',
    summaryFields: [
      { key: 'totalAmount', title: 'Total Amount', prefix: '₹' },
      { key: 'count', title: 'Total Applications' },
    ],
    columns: [
      { title: 'Loan No', dataIndex: 'loanNo', width: 160 },
      { title: 'Customer', render: (_: any, r: any) => r.customer?.name },
      { title: 'Advisor', render: (_: any, r: any) => r.advisor?.name || '—' },
      { title: 'Product', render: (_: any, r: any) => r.loanProduct?.name },
      { title: 'Amount', dataIndex: 'amount', width: 120, render: (v: number) => `₹${Number(v).toLocaleString('en-IN')}` },
      { title: 'Status', dataIndex: 'status', width: 100, render: (v: string) => <Tag color={v === 'APPLIED' ? 'orange' : v === 'APPROVED' ? 'green' : 'red'}>{v}</Tag> },
      { title: 'Date', dataIndex: 'appliedDate', render: (v: string) => dayjs(v).format('DD/MM/YYYY') },
    ],
  },
  'loan-approval': {
    title: 'Loan Approval',
    endpoint: '/reports/loan-approval',
    dataPath: 'loans',
    summaryFields: [{ key: 'count', title: 'Approved Loans' }],
    columns: [
      { title: 'Loan No', dataIndex: 'loanNo', width: 160 },
      { title: 'Customer', render: (_: any, r: any) => r.customer?.name },
      { title: 'Product', render: (_: any, r: any) => r.loanProduct?.name },
      { title: 'Amount', dataIndex: 'amount', width: 120, render: (v: number) => `₹${Number(v).toLocaleString('en-IN')}` },
      { title: 'Approved By', dataIndex: 'approvedBy' },
      { title: 'Approved', dataIndex: 'approvedDate', render: (v: string) => v ? dayjs(v).format('DD/MM/YYYY') : '—' },
    ],
  },
  'loan-rejection': {
    title: 'Loan Rejection',
    endpoint: '/reports/loan-rejection',
    dataPath: 'loans',
    summaryFields: [{ key: 'count', title: 'Rejected Loans' }],
    columns: [
      { title: 'Loan No', dataIndex: 'loanNo', width: 160 },
      { title: 'Customer', render: (_: any, r: any) => r.customer?.name },
      { title: 'Product', render: (_: any, r: any) => r.loanProduct?.name },
      { title: 'Amount', dataIndex: 'amount', width: 120, render: (v: number) => `₹${Number(v).toLocaleString('en-IN')}` },
      { title: 'Reason', dataIndex: 'rejectionReason' },
      { title: 'Date', dataIndex: 'rejectedDate', render: (v: string) => v ? dayjs(v).format('DD/MM/YYYY') : '—' },
    ],
  },
  'business-summary': {
    title: 'Business Summary',
    endpoint: '/reports/business-summary',
    summaryFields: [
      { key: 'totalCustomers', title: 'Total Customers' },
      { key: 'totalAdvisors', title: 'Total Advisors' },
    ],
    columns: [],
  },
  'agent-collection': {
    title: 'Agent Collection',
    endpoint: '/reports/agent-collection',
    columns: [
      { title: 'Agent Name', dataIndex: 'name' },
      { title: 'Total Amount', dataIndex: 'totalAmount', width: 140, render: (v: number) => `₹${v.toLocaleString('en-IN')}` },
      { title: 'Count', dataIndex: 'count', width: 80 },
    ],
  },
};

// ──── BUSINESS REPORT ────
function BusinessReport() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await api.get('/reports/business-report');
      if (res.data.success) setData(res.data.data);
    } catch { message.error('Failed to load'); }
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  return (
    <div>
      <Button icon={<ReloadOutlined />} onClick={fetch} style={{ marginBottom: 16 }}>Refresh</Button>
      <h4 style={{ margin: '16px 0 8px' }}>By Loan Product</h4>
      <Table
        dataSource={data?.byProduct || []} rowKey="product" loading={loading} size="middle" pagination={false}
        columns={[
          { title: 'Product', dataIndex: 'product' },
          { title: 'Code', dataIndex: 'productCode', width: 80 },
          { title: 'Loan Count', dataIndex: 'count', width: 100 },
          { title: 'Total Amount', dataIndex: 'totalAmount', render: (v: number) => `₹${v.toLocaleString('en-IN')}` },
        ]}
      />
      <h4 style={{ margin: '16px 0 8px' }}>By Branch</h4>
      <Table
        dataSource={data?.byBranch || []} rowKey="branch" loading={loading} size="middle" pagination={false}
        columns={[
          { title: 'Branch', dataIndex: 'branch' },
          { title: 'Code', dataIndex: 'branchCode', width: 80 },
          { title: 'Loan Count', dataIndex: 'count', width: 100 },
          { title: 'Total Amount', dataIndex: 'totalAmount', render: (v: number) => `₹${v.toLocaleString('en-IN')}` },
        ]}
      />
    </div>
  );
}

// ──── MAIN REPORTS PAGE ────
export default function ReportsPage() {
  return (
    <div className="animate-in">
      <div className="page-header"><h2>Reports</h2></div>
      <Tabs
        type="card"
        tabPosition="left"
        style={{ minHeight: 500 }}
        items={[
          { key: 'collection-sheet', label: '📋 Collection Sheet', children: <ReportTab config={REPORTS['collection-sheet']} /> },
          { key: 'due-report', label: '⚠️ Due Report', children: <ReportTab config={REPORTS['due-report']} /> },
          { key: 'loan-outstanding', label: '📊 Outstanding', children: <ReportTab config={REPORTS['loan-outstanding']} /> },
          { key: 'disbursement', label: '💰 Disbursement', children: <ReportTab config={REPORTS['disbursement']} /> },
          { key: 'emi-collection', label: '💵 EMI Collection', children: <ReportTab config={REPORTS['emi-collection']} /> },
          { key: 'non-emi-collection', label: '📝 Non-EMI', children: <ReportTab config={REPORTS['non-emi-collection']} /> },
          { key: 'loan-requisition', label: '📄 Requisition', children: <ReportTab config={REPORTS['loan-requisition']} /> },
          { key: 'loan-approval', label: '✅ Approval', children: <ReportTab config={REPORTS['loan-approval']} /> },
          { key: 'loan-rejection', label: '❌ Rejection', children: <ReportTab config={REPORTS['loan-rejection']} /> },
          { key: 'business-report', label: '📈 Business', children: <BusinessReport /> },
          { key: 'agent-collection', label: '👤 Agent', children: <ReportTab config={REPORTS['agent-collection']} /> },
        ]}
      />
    </div>
  );
}
