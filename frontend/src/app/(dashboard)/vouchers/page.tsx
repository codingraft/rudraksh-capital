'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Tag, Form, Input, Select, InputNumber, Button, Space, DatePicker, Tabs, Table, message, Modal } from 'antd';
import { EyeOutlined, CheckCircleOutlined, CloseCircleOutlined, DollarOutlined, PrinterOutlined, ReloadOutlined, PlusOutlined } from '@ant-design/icons';
import DataTable from '@/components/ui/DataTable';
import FormModal from '@/components/ui/FormModal';
import { api } from '@/lib/api';
import dayjs from 'dayjs';
import { useReactToPrint } from 'react-to-print';
import { VoucherTemplate } from '@/components/print/VoucherTemplate';

const TYPE_COLORS: Record<string, string> = {
  RECEIPT: 'green', PAYMENT: 'red', JOURNAL: 'blue', CONTRA: 'purple',
};
const STATUS_COLORS: Record<string, string> = {
  PENDING: 'orange', APPROVED: 'blue', PAID: 'green', CANCELLED: 'default',
};

export default function VouchersPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedVoucher, setSelectedVoucher] = useState<any>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `Voucher-${selectedVoucher?.voucherNo || 'Unknown'}`,
  });

  const triggerPrint = (record: any) => {
    setSelectedVoucher(record);
    setTimeout(() => { handlePrint(); }, 100);
  };

  const handleAction = async (id: string, action: string) => {
    try {
      if (action === 'approve') await api.patch(`/vouchers/${id}/approve`);
      else if (action === 'cancel') await api.patch(`/vouchers/${id}/cancel`);
      else if (action === 'pay') await api.post(`/vouchers/${id}/pay`, { method: 'CASH' });
      message.success(`Voucher ${action}d successfully`);
      setRefreshKey(k => k + 1);
    } catch (err: any) {
      message.error(err.response?.data?.message || `Failed to ${action} voucher`);
    }
  };

  const columns = [
    { title: 'Voucher No', dataIndex: 'voucherNo', width: 130 },
    { title: 'Date', dataIndex: 'date', render: (v: string) => dayjs(v).format('DD/MM/YYYY') },
    { title: 'Type', dataIndex: 'type', width: 100, render: (v: string) => <Tag color={TYPE_COLORS[v]}>{v}</Tag> },
    { title: 'Account', dataIndex: 'accountHead' },
    { title: 'Amount', dataIndex: 'amount', width: 120, render: (v: number) => `₹${Number(v).toLocaleString('en-IN')}` },
    { title: 'Status', dataIndex: 'status', width: 100, render: (v: string) => <Tag color={STATUS_COLORS[v]}>{v}</Tag> },
    {
      title: 'Action', key: 'action', width: 220,
      render: (_: any, r: any) => (
        <Space size="small">
          <Button size="small" type="text" icon={<PrinterOutlined />} onClick={() => triggerPrint(r)} />
          {r.status === 'PENDING' && <>
            <Button size="small" type="primary" icon={<CheckCircleOutlined />} onClick={() => handleAction(r.id, 'approve')}>Approve</Button>
            <Button size="small" danger icon={<CloseCircleOutlined />} onClick={() => handleAction(r.id, 'cancel')}>Cancel</Button>
          </>}
          {r.status === 'APPROVED' && (
            <Button size="small" type="primary" icon={<DollarOutlined />} onClick={() => handleAction(r.id, 'pay')}>Pay</Button>
          )}
        </Space>
      ),
    },
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
        <Input placeholder="e.g., Office Rent, Salary, Commission" />
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

      {/* Hidden Print Template */}
      <div style={{ display: 'none' }}>
        <VoucherTemplate ref={printRef} voucher={selectedVoucher} />
      </div>
    </div>
  );
}
