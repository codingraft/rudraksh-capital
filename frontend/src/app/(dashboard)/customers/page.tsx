'use client';

import React, { useState } from 'react';
import { Tag, Button, Space, Form, Input, DatePicker, Select, InputNumber } from 'antd';
import { EditOutlined, EyeOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import DataTable from '@/components/ui/DataTable';
import FormModal from '@/components/ui/FormModal';
import dayjs from 'dayjs';

const GENDER_OPTS = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER', label: 'Other' },
];

export default function CustomersPage() {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleEdit = (record: any) => {
    setEditRecord({ ...record, dob: record.dob ? dayjs(record.dob) : null });
    setModalOpen(true);
  };

  const columns = [
    { title: 'ID', dataIndex: 'customerId', width: 120 },
    { title: 'Name', dataIndex: 'name', sorter: true },
    { title: 'Phone', dataIndex: 'phone', width: 130 },
    { title: 'Branch', dataIndex: ['branch', 'name'], width: 130 },
    { title: 'Status', dataIndex: 'isActive', width: 90, render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'Active' : 'Inactive'}</Tag> },
    {
      title: '', key: 'actions', width: 80, render: (_: any, r: any) => (
        <Space size="small">
          <Button type="text" size="small" icon={<EyeOutlined />} onClick={() => router.push(`/customers/${r.id}`)} />
          <Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleEdit(r)} />
        </Space>
      ),
    },
  ];

  const formFields = (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Form.Item name="name" label="Full Name" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="phone" label="Phone" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="fatherName" label="Father's Name"><Input /></Form.Item>
        <Form.Item name="dob" label="Date of Birth"><DatePicker style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="gender" label="Gender"><Select options={GENDER_OPTS} /></Form.Item>
        <Form.Item name="aadhaarNo" label="Aadhaar No."><Input /></Form.Item>
        <Form.Item name="panNo" label="PAN No."><Input /></Form.Item>
        <Form.Item name="city" label="City"><Input /></Form.Item>
        <Form.Item name="state" label="State"><Input /></Form.Item>
        <Form.Item name="pincode" label="Pincode"><Input /></Form.Item>
      </div>
      <Form.Item name="address" label="Address" rules={[{ required: true }]}><Input.TextArea rows={2} /></Form.Item>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <Form.Item name="nominee" label="Nominee"><Input /></Form.Item>
        <Form.Item name="nomineeRel" label="Relation"><Input /></Form.Item>
        <Form.Item name="nomineePhone" label="Nominee Phone"><Input /></Form.Item>
      </div>
    </>
  );

  return (
    <div className="animate-in">
      <div className="page-header">
        <h2>Customers</h2>
      </div>
      <div key={refreshKey}>
        <DataTable
          title="Customer"
          endpoint="/customers"
          columns={columns}
          onAdd={() => { setEditRecord(null); setModalOpen(true); }}
        />
      </div>
      <FormModal
        title="Customer"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onSuccess={() => { setModalOpen(false); setRefreshKey(k => k + 1); }}
        endpoint="/customers"
        initialValues={editRecord}
        width={700}
      >
        {formFields}
      </FormModal>
    </div>
  );
}
