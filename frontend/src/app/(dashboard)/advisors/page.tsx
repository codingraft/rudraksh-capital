'use client';

import React, { useState, useEffect } from 'react';
import { Tag, Button, Space, Form, Input, Select } from 'antd';
import { EditOutlined, EyeOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import DataTable from '@/components/ui/DataTable';
import FormModal from '@/components/ui/FormModal';
import { api } from '@/lib/api';

export default function AdvisorsPage() {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [ranks, setRanks] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([api.get('/masters/ranks'), api.get('/masters/commission-plans')])
      .then(([r, p]) => { setRanks(r.data.data || []); setPlans(p.data.data || []); });
  }, []);

  const columns = [
    { title: 'ID', dataIndex: 'advisorId', width: 120 },
    { title: 'Name', dataIndex: 'name', sorter: true },
    { title: 'Phone', dataIndex: 'phone', width: 130 },
    { title: 'Branch', dataIndex: ['branch', 'name'], width: 130 },
    { title: 'Rank', dataIndex: ['rank', 'name'], width: 110 },
    { title: 'Status', dataIndex: 'isActive', width: 90, render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'Active' : 'Inactive'}</Tag> },
    {
      title: '', key: 'actions', width: 80, render: (_: any, r: any) => (
        <Space size="small">
          <Button type="text" size="small" icon={<EyeOutlined />} onClick={() => router.push(`/advisors/${r.id}`)} />
          <Button type="text" size="small" icon={<EditOutlined />} onClick={() => { setEditRecord(r); setModalOpen(true); }} />
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
        <Form.Item name="email" label="Email"><Input type="email" /></Form.Item>
        <Form.Item name="aadhaarNo" label="Aadhaar"><Input /></Form.Item>
        <Form.Item name="panNo" label="PAN"><Input /></Form.Item>
        <Form.Item name="rankId" label="Rank">
          <Select allowClear options={ranks.map(r => ({ label: r.name, value: r.id }))} />
        </Form.Item>
        <Form.Item name="commPlanId" label="Commission Plan">
          <Select allowClear options={plans.map(p => ({ label: `${p.name} (${p.type})`, value: p.id }))} />
        </Form.Item>
      </div>
      <Form.Item name="address" label="Address"><Input.TextArea rows={2} /></Form.Item>
    </>
  );

  return (
    <div className="animate-in">
      <div className="page-header"><h2>Advisors</h2></div>
      <div key={refreshKey}>
        <DataTable title="Advisor" endpoint="/advisors" columns={columns}
          onAdd={() => { setEditRecord(null); setModalOpen(true); }} />
      </div>
      <FormModal title="Advisor" open={modalOpen} onCancel={() => setModalOpen(false)}
        onSuccess={() => { setModalOpen(false); setRefreshKey(k => k + 1); }}
        endpoint="/advisors" initialValues={editRecord} width={700}>
        {formFields}
      </FormModal>
    </div>
  );
}
