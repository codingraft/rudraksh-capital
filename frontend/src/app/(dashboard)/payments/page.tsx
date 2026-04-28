'use client';

import React, { useRef, useState } from 'react';
import { Tag, Button, Space } from 'antd';
import { PrinterOutlined } from '@ant-design/icons';
import DataTable from '@/components/ui/DataTable';
import { useReactToPrint } from 'react-to-print';
import { ReceiptTemplate } from '@/components/print/ReceiptTemplate';

export default function PaymentsPage() {
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `Receipt-${selectedPayment?.receiptNo || 'Unknown'}`,
  });

  const triggerPrint = (record: any) => {
    setSelectedPayment(record);
    // Use setTimeout to ensure state updates before printing
    setTimeout(() => {
      handlePrint();
    }, 100);
  };

  const columns = [
    { title: 'Receipt No', dataIndex: 'receiptNo', width: 130 },
    { title: 'Date', dataIndex: 'createdAt', render: (v: string) => new Date(v).toLocaleString() },
    { title: 'Type', dataIndex: 'type', width: 90, render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: 'Amount', dataIndex: 'amount', width: 120, render: (v: number) => `₹${Number(v).toLocaleString('en-IN')}` },
    { title: 'Method', dataIndex: 'method', width: 110 },
    { title: 'Collected By', dataIndex: 'collectedBy' },
    { 
      title: 'Action', 
      key: 'action', 
      width: 90, 
      render: (_: any, record: any) => (
        <Space size="middle">
          <Button 
            type="text" 
            icon={<PrinterOutlined />} 
            onClick={() => triggerPrint(record)} 
            title="Print Receipt"
          />
        </Space>
      )
    },
  ];

  return (
    <div className="animate-in">
      <div className="page-header"><h2>Payments</h2></div>
      <DataTable title="Payment" endpoint="/payments" columns={columns} />
      
      {/* Hidden Print Template */}
      <div style={{ display: 'none' }}>
        <ReceiptTemplate ref={printRef} payment={selectedPayment} />
      </div>
    </div>
  );
}

