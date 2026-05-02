'use client';

import React, { useEffect, useState } from 'react';
import { Card, Descriptions, Tabs, Tag, Skeleton, message, Table, theme, Row, Col, Statistic, Upload, Button } from 'antd';
import { UserOutlined, BankOutlined, DollarOutlined, UploadOutlined, FileImageOutlined } from '@ant-design/icons';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';

export default function CustomerDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { token: { colorBgContainer, colorBorder } } = theme.useToken();

  const [errorMsg, setErrorMsg] = useState('');

  const handleThumbUpload = async (file: File) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        try {
          const res = await api.patch(`/customers/${id}`, { thumbImpression: reader.result as string });
          if (res.data.success) {
            message.success('Thumb impression updated successfully!');
            setCustomer({ ...customer, thumbImpression: reader.result });
            resolve(true);
          }
        } catch (err: any) {
          message.error(err.response?.data?.message || 'Failed to upload thumb impression');
          reject(err);
        }
      };
      reader.onerror = (error) => reject(error);
    });
  };

  useEffect(() => {
    if (!id) return;
    api.get(`/customers/${id}`)
      .then(res => { if (res.data.success) setCustomer(res.data.data); else setErrorMsg(JSON.stringify(res.data)); })
      .catch((err) => {
        message.error('Failed to load customer');
        setErrorMsg(err.response?.data?.message || err.message);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Skeleton active paragraph={{ rows: 10 }} />;
  if (!customer) return <div>Customer not found for ID: {id}. Error: {errorMsg}</div>;

  const loanColumns = [
    { title: 'Loan No', dataIndex: 'loanNo' },
    { title: 'Product', dataIndex: ['loanProduct', 'name'] },
    { title: 'Amount', dataIndex: 'amount', render: (v: number) => `₹${Number(v).toLocaleString('en-IN')}` },
    { title: 'Status', dataIndex: 'status', render: (s: string) => {
      const colors: any = { ACTIVE: 'green', APPLIED: 'orange', APPROVED: 'blue', CLOSED: 'default', DEFAULTED: 'red' };
      return <Tag color={colors[s] || 'default'}>{s}</Tag>;
    }},
  ];

  return (
    <div className="animate-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{
          width: 56, height: 56, borderRadius: 14,
          background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: 22, fontWeight: 700, fontFamily: 'Outfit',
        }}>
          {customer.name?.charAt(0)}
        </div>
        <div>
          <h2 style={{ margin: 0 }}>
            {customer.name} <Tag color={customer.isActive ? 'green' : 'red'}>{customer.isActive ? 'Active' : 'Inactive'}</Tag>
          </h2>
          <span style={{ color: '#94A3B8', fontSize: 13 }}>{customer.customerId} • {customer.branch?.name}</span>
        </div>
      </div>

      <Tabs type="card" items={[
        {
          label: 'Profile & KYC', key: '1', icon: <UserOutlined />,
          children: (
            <Card variant="borderless" style={{ borderRadius: 12 }}>
              <Descriptions bordered column={{ xxl: 3, xl: 3, lg: 2, md: 2, sm: 1, xs: 1 }} size="small">
                <Descriptions.Item label="Phone">{customer.phone}</Descriptions.Item>
                <Descriptions.Item label="Father's Name">{customer.fatherName || '—'}</Descriptions.Item>
                <Descriptions.Item label="Gender">{customer.gender || '—'}</Descriptions.Item>
                <Descriptions.Item label="DOB">{customer.dob ? new Date(customer.dob).toLocaleDateString() : '—'}</Descriptions.Item>
                <Descriptions.Item label="Aadhaar">{customer.aadhaarNo || '—'}</Descriptions.Item>
                <Descriptions.Item label="PAN">{customer.panNo || '—'}</Descriptions.Item>
                <Descriptions.Item label="Address" span={3}>{[customer.address, customer.city, customer.state, customer.pincode].filter(Boolean).join(', ')}</Descriptions.Item>
                <Descriptions.Item label="Nominee">{customer.nominee || '—'}</Descriptions.Item>
                <Descriptions.Item label="Nominee Relation">{customer.nomineeRel || '—'}</Descriptions.Item>
                <Descriptions.Item label="Nominee Phone">{customer.nomineePhone || '—'}</Descriptions.Item>
              </Descriptions>
            </Card>
          ),
        },
        {
          label: 'Loans', key: '2', icon: <BankOutlined />,
          children: (
            <Card variant="borderless" style={{ borderRadius: 12 }}>
              <Table dataSource={customer.loans || []} columns={loanColumns} rowKey="id" pagination={false} size="small" />
            </Card>
          ),
        },
        {
          label: 'Financial', key: '3', icon: <DollarOutlined />,
          children: (
            <Card variant="borderless" style={{ borderRadius: 12 }}>
              <Row gutter={16}>
                <Col span={12}><Statistic title="Share Amount" value={customer.shareAmount || 0} prefix="₹" /></Col>
                <Col span={12}><Statistic title="Member Since" value={new Date(customer.createdAt).toLocaleDateString()} /></Col>
              </Row>
            </Card>
          ),
        },
        {
          label: 'KYC Documents', key: '4', icon: <FileImageOutlined />,
          children: (
            <Card variant="borderless" style={{ borderRadius: 12 }}>
              <Row gutter={[24, 24]}>
                <Col xs={24} md={12}>
                  <h4>Thumb Impression</h4>
                  <div style={{ padding: 16, border: '1px dashed #d9d9d9', borderRadius: 8, textAlign: 'center' }}>
                    {customer.thumbImpression ? (
                      <div style={{ marginBottom: 16 }}>
                        <img src={customer.thumbImpression} alt="Thumb Print" style={{ maxHeight: 120, maxWidth: '100%', objectFit: 'contain' }} />
                      </div>
                    ) : (
                      <div style={{ color: '#999', marginBottom: 16 }}>No thumb impression uploaded</div>
                    )}
                    <Upload 
                      accept="image/*" 
                      showUploadList={false} 
                      beforeUpload={(file) => { handleThumbUpload(file); return false; }}
                    >
                      <Button icon={<UploadOutlined />}>Upload Thumb Print</Button>
                    </Upload>
                  </div>
                </Col>
              </Row>
            </Card>
          ),
        },
      ]} />
    </div>
  );
}
