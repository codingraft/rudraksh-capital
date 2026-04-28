'use client';

import React, { useState } from 'react';
import { Tabs, Form, Input, InputNumber, Switch, Select } from 'antd';
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
      { title: 'Active', dataIndex: 'isActive', width: 80, render: (v: boolean) => v ? '✓' : '✗' },
    ],
    fields: <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Form.Item name="code" label="Code" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="name" label="Name" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="phone" label="Phone"><Input /></Form.Item>
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
        <Form.Item name="minTenure" label="Min Tenure"><InputNumber style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="maxTenure" label="Max Tenure"><InputNumber style={{ width: '100%' }} /></Form.Item>
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
      <Tabs activeKey={activeTab} onChange={setActiveTab} type="card"
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
