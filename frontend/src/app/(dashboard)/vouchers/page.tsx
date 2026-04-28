'use client';

import React, { useState } from 'react';
import { Tag, Form, Input, Select, InputNumber } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import DataTable from '@/components/ui/DataTable';
import FormModal from '@/components/ui/FormModal';

const TYPE_COLORS: Record<string, string> = {
  RECEIPT: 'green', PAYMENT: 'red', JOURNAL: 'blue', CONTRA: 'purple',
};

export default function VouchersPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const columns = [
    { title: 'Voucher No', dataIndex: 'voucherNo', width: 130 },
    { title: 'Date', dataIndex: 'date', render: (v: string) => new Date(v).toLocaleDateString() },
    { title: 'Type', dataIndex: 'type', width: 100, render: (v: string) => <Tag color={TYPE_COLORS[v]}>{v}</Tag> },
    { title: 'Account', dataIndex: 'accountHead' },
    { title: 'Amount', dataIndex: 'amount', width: 120, render: (v: number) => `₹${Number(v).toLocaleString('en-IN')}` },
    { title: 'Status', dataIndex: 'status', width: 90, render: (v: string) => <Tag>{v}</Tag> },
  ];

  const formFields = (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Form.Item name="type" label="Type" rules={[{ required: true }]}>
          <Select options={[
            { value: 'RECEIPT', label: 'Receipt' }, { value: 'PAYMENT', label: 'Payment' },
            { value: 'JOURNAL', label: 'Journal' }, { value: 'CONTRA', label: 'Contra' },
          ]} />
        </Form.Item>
        <Form.Item name="amount" label="Amount" rules={[{ required: true }]}>
          <InputNumber style={{ width: '100%' }} prefix="₹" />
        </Form.Item>
      </div>
      <Form.Item name="accountHead" label="Account Head" rules={[{ required: true }]}>
        <Input placeholder="e.g., Office Rent, Salary" />
      </Form.Item>
      <Form.Item name="narration" label="Narration"><Input.TextArea rows={2} /></Form.Item>
      <Form.Item name="referenceNo" label="Reference No"><Input /></Form.Item>
    </>
  );

  return (
    <div className="animate-in">
      <div className="page-header"><h2>Vouchers</h2></div>
      <div key={refreshKey}>
        <DataTable title="Voucher" endpoint="/vouchers" columns={columns}
          onAdd={() => setModalOpen(true)} />
      </div>
      <FormModal title="Voucher" open={modalOpen} onCancel={() => setModalOpen(false)}
        onSuccess={() => { setModalOpen(false); setRefreshKey(k => k + 1); }}
        endpoint="/vouchers" width={560}>
        {formFields}
      </FormModal>
    </div>
  );
}
