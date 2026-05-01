'use client';

import React, { useState } from 'react';
import { Tabs, Form, Input, InputNumber, Switch, Select, DatePicker } from 'antd';
import DataTable from '@/components/ui/DataTable';
import FormModal from '@/components/ui/FormModal';

// ──── Config-driven master data – zero duplication ────
const MASTERS = [
  {
    key: 'branches', title: 'Branch', endpoint: '/masters/branches',
    columns: [
      { title: 'Code', dataIndex: 'code', width: 100 },
      { title: 'Name', dataIndex: 'name' },
      { title: 'Phone', dataIndex: 'phone', width: 130 },
      { title: 'Email', dataIndex: 'email', width: 160 },
      { title: 'Active', dataIndex: 'isActive', width: 80, render: (v: boolean) => v ? '✓' : '✗' },
    ],
    fields: <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Form.Item name="code" label="Code" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="name" label="Name" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="phone" label="Phone"><Input /></Form.Item>
        <Form.Item name="email" label="Email"><Input /></Form.Item>
        <Form.Item name="isActive" label="Active" valuePropName="checked" initialValue={true}><Switch /></Form.Item>
      </div>
      <Form.Item name="address" label="Address"><Input.TextArea rows={2} /></Form.Item>
    </>,
  },
  {
    key: 'loan-products', title: 'Loan Product', endpoint: '/masters/loan-products',
    columns: [
      { title: 'Code', dataIndex: 'code', width: 100 },
      { title: 'Name', dataIndex: 'name' },
      { title: 'Rate %', dataIndex: 'interestRate', width: 80 },
      { title: 'Type', dataIndex: 'interestType', width: 90 },
      { title: 'Min Amt', dataIndex: 'minAmount', width: 100, render: (v: number) => `₹${Number(v).toLocaleString('en-IN')}` },
      { title: 'Max Amt', dataIndex: 'maxAmount', width: 100, render: (v: number) => `₹${Number(v).toLocaleString('en-IN')}` },
      { title: 'Active', dataIndex: 'isActive', width: 80, render: (v: boolean) => v ? '✓' : '✗' },
    ],
    fields: <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Form.Item name="code" label="Code" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="name" label="Name" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="interestRate" label="Interest %" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="interestType" label="Type" rules={[{ required: true }]}>
          <Select options={[{ value: 'FLAT', label: 'Flat' }, { value: 'REDUCING', label: 'Reducing' }, { value: 'MONTHLY', label: 'Monthly' }]} />
        </Form.Item>
        <Form.Item name="minAmount" label="Min Amount"><InputNumber style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="maxAmount" label="Max Amount"><InputNumber style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="minTenure" label="Min Tenure (months)"><InputNumber style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="maxTenure" label="Max Tenure (months)"><InputNumber style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="processingFee" label="Processing Fee"><InputNumber style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="isActive" label="Active" valuePropName="checked" initialValue={true}><Switch /></Form.Item>
      </div>
    </>,
  },
  {
    key: 'ranks', title: 'Rank', endpoint: '/masters/ranks',
    columns: [
      { title: 'Name', dataIndex: 'name' },
      { title: 'Level', dataIndex: 'level', width: 80 },
      { title: 'Active', dataIndex: 'isActive', width: 80, render: (v: boolean) => v ? '✓' : '✗' },
    ],
    fields: <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Form.Item name="name" label="Name" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="level" label="Level" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="isActive" label="Active" valuePropName="checked" initialValue={true}><Switch /></Form.Item>
      </div>
    </>,
  },
  {
    key: 'commission-plans', title: 'Commission Plan', endpoint: '/masters/commission-plans',
    columns: [
      { title: 'Name', dataIndex: 'name' },
      { title: 'Type', dataIndex: 'type', width: 110 },
      { title: 'Value', dataIndex: 'value', width: 80 },
      { title: 'Active', dataIndex: 'isActive', width: 80, render: (v: boolean) => v ? '✓' : '✗' },
    ],
    fields: <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Form.Item name="name" label="Name" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="type" label="Type" rules={[{ required: true }]}>
          <Select options={[{ value: 'PERCENTAGE', label: 'Percentage' }, { value: 'FLAT', label: 'Flat' }]} />
        </Form.Item>
        <Form.Item name="value" label="Value" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="isActive" label="Active" valuePropName="checked" initialValue={true}><Switch /></Form.Item>
      </div>
    </>,
  },
  {
    key: 'relations', title: 'Relation', endpoint: '/masters/relations',
    columns: [
      { title: 'Name', dataIndex: 'name' },
    ],
    fields: <>
      <Form.Item name="name" label="Relation Name" rules={[{ required: true }]}><Input /></Form.Item>
    </>,
  },
  {
    key: 'banks', title: 'Bank', endpoint: '/masters/banks',
    columns: [
      { title: 'Bank Name', dataIndex: 'name' },
      { title: 'Branch', dataIndex: 'branch', width: 140 },
      { title: 'IFSC', dataIndex: 'ifsc', width: 120 },
      { title: 'Account No', dataIndex: 'account', width: 150 },
      { title: 'Active', dataIndex: 'isActive', width: 80, render: (v: boolean) => v ? '✓' : '✗' },
    ],
    fields: <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Form.Item name="name" label="Bank Name" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="branch" label="Branch"><Input /></Form.Item>
        <Form.Item name="ifsc" label="IFSC Code"><Input /></Form.Item>
        <Form.Item name="account" label="Account Number"><Input /></Form.Item>
        <Form.Item name="isActive" label="Active" valuePropName="checked" initialValue={true}><Switch /></Form.Item>
      </div>
    </>,
  },
  {
    key: 'accounts', title: 'Account Head', endpoint: '/masters/accounts',
    columns: [
      { title: 'Name', dataIndex: 'name' },
      { title: 'Code', dataIndex: 'code', width: 120 },
      { title: 'Type', dataIndex: 'type', width: 120 },
      { title: 'Active', dataIndex: 'isActive', width: 80, render: (v: boolean) => v ? '✓' : '✗' },
    ],
    fields: <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Form.Item name="name" label="Account Name" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="code" label="Account Code"><Input /></Form.Item>
        <Form.Item name="type" label="Type" rules={[{ required: true }]}>
          <Select options={[
            { value: 'Asset', label: 'Asset' }, { value: 'Liability', label: 'Liability' },
            { value: 'Income', label: 'Income' }, { value: 'Expense', label: 'Expense' },
          ]} />
        </Form.Item>
        <Form.Item name="isActive" label="Active" valuePropName="checked" initialValue={true}><Switch /></Form.Item>
      </div>
    </>,
  },
  {
    key: 'interest', title: 'Interest', endpoint: '/masters/interest',
    columns: [
      { title: 'Name', dataIndex: 'name' },
      { title: 'Rate %', dataIndex: 'rate', width: 80 },
      { title: 'Type', dataIndex: 'type', width: 100 },
      { title: 'Active', dataIndex: 'isActive', width: 80, render: (v: boolean) => v ? '✓' : '✗' },
    ],
    fields: <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Form.Item name="name" label="Name" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="rate" label="Rate %" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="type" label="Type" rules={[{ required: true }]}>
          <Select options={[
            { value: 'yearly', label: 'Yearly' }, { value: 'monthly', label: 'Monthly' }, { value: 'daily', label: 'Daily' },
          ]} />
        </Form.Item>
        <Form.Item name="isActive" label="Active" valuePropName="checked" initialValue={true}><Switch /></Form.Item>
      </div>
    </>,
  },
  {
    key: 'financial-years', title: 'Financial Year', endpoint: '/masters/financial-years',
    columns: [
      { title: 'Name', dataIndex: 'name' },
      { title: 'Start Date', dataIndex: 'startDate', render: (v: string) => new Date(v).toLocaleDateString() },
      { title: 'End Date', dataIndex: 'endDate', render: (v: string) => new Date(v).toLocaleDateString() },
      { title: 'Current', dataIndex: 'isCurrent', width: 90, render: (v: boolean) => v ? '✅ Current' : '—' },
    ],
    fields: <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Form.Item name="name" label="Name (e.g. 2025-26)" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="isCurrent" label="Is Current" valuePropName="checked"><Switch /></Form.Item>
        <Form.Item name="startDate" label="Start Date" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="endDate" label="End Date" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item>
      </div>
    </>,
  },
  {
    key: 'gold-categories', title: 'Gold Category', endpoint: '/masters/gold-categories',
    columns: [
      { title: 'Name', dataIndex: 'name' },
      { title: 'Purity', dataIndex: 'purity', width: 100 },
      { title: 'Rate/gram (₹)', dataIndex: 'ratePerGram', width: 130, render: (v: number) => `₹${Number(v).toLocaleString('en-IN')}` },
      { title: 'Active', dataIndex: 'isActive', width: 80, render: (v: boolean) => v ? '✓' : '✗' },
    ],
    fields: <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Form.Item name="name" label="Name" rules={[{ required: true }]}><Input placeholder="e.g. 24K Gold" /></Form.Item>
        <Form.Item name="purity" label="Purity"><Input placeholder="e.g. 24K, 22K, 18K" /></Form.Item>
        <Form.Item name="ratePerGram" label="Rate per Gram (₹)" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="isActive" label="Active" valuePropName="checked" initialValue={true}><Switch /></Form.Item>
      </div>
    </>,
  },
  {
    key: 'config', title: 'Configuration', endpoint: '/masters/config',
    columns: [
      { title: 'Key', dataIndex: 'key', width: 180 },
      { title: 'Label', dataIndex: 'label' },
      { title: 'Value', dataIndex: 'value' },
    ],
    fields: <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Form.Item name="key" label="Key" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="label" label="Label"><Input /></Form.Item>
      </div>
      <Form.Item name="value" label="Value" rules={[{ required: true }]}><Input /></Form.Item>
    </>,
  },
  {
    key: 'voucher-types', title: 'Voucher Type', endpoint: '/masters/voucher-types',
    columns: [
      { title: 'Name', dataIndex: 'name' },
      { title: 'Prefix', dataIndex: 'prefix', width: 100 },
      { title: 'Last No', dataIndex: 'lastNo', width: 80 },
      { title: 'Active', dataIndex: 'isActive', width: 80, render: (v: boolean) => v ? '✓' : '✗' },
    ],
    fields: <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Form.Item name="name" label="Name" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="prefix" label="Prefix" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="isActive" label="Active" valuePropName="checked" initialValue={true}><Switch /></Form.Item>
      </div>
    </>,
  },
];

export default function MastersPage() {
  const [activeTab, setActiveTab] = useState(MASTERS[0].key);
  const [modalOpen, setModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const cfg = MASTERS.find(m => m.key === activeTab)!;

  const columns = [
    ...cfg.columns,
    { title: '', key: 'actions', width: 60, render: (_: any, r: any) => <a onClick={() => { setEditRecord(r); setModalOpen(true); }}>Edit</a> },
  ];

  return (
    <div className="animate-in">
      <div className="page-header"><h2>Master Data</h2></div>
      <Tabs activeKey={activeTab} onChange={(k) => { setActiveTab(k); setEditRecord(null); }} type="card"
        items={MASTERS.map(m => ({ label: m.title, key: m.key }))} style={{ marginBottom: 16 }} />
      <div key={`${activeTab}-${refreshKey}`}>
        <DataTable title={cfg.title} endpoint={cfg.endpoint} columns={columns}
          onAdd={() => { setEditRecord(null); setModalOpen(true); }} />
      </div>
      <FormModal title={cfg.title} open={modalOpen} onCancel={() => setModalOpen(false)}
        onSuccess={() => { setModalOpen(false); setRefreshKey(k => k + 1); }}
        endpoint={cfg.endpoint} initialValues={editRecord}>
        {cfg.fields}
      </FormModal>
    </div>
  );
}
