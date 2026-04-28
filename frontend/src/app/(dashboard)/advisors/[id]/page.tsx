'use client';

import React, { useEffect, useState } from 'react';
import { Card, Descriptions, Tabs, Tag, Skeleton, message, Table, Row, Col, Statistic, theme } from 'antd';
import { UserOutlined, TeamOutlined, DollarOutlined, BankOutlined } from '@ant-design/icons';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';

export default function AdvisorDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [advisor, setAdvisor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!id) return;
    api.get(`/advisors/${id}`)
      .then(res => { if (res.data.success) setAdvisor(res.data.data); else setErrorMsg(JSON.stringify(res.data)); })
      .catch((err) => {
        message.error('Failed to load advisor');
        setErrorMsg(err.response?.data?.message || err.message);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Skeleton active paragraph={{ rows: 10 }} />;
  if (!advisor) return <div>Advisor not found for ID: {id}. Error: {errorMsg}</div>;

  const downlineColumns = [
    { title: 'ID', dataIndex: 'advisorId' },
    { title: 'Name', dataIndex: 'name' },
    { title: 'Phone', dataIndex: 'phone' },
    { title: 'Status', dataIndex: 'isActive', render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'Active' : 'Inactive'}</Tag> },
  ];

  const loanColumns = [
    { title: 'Loan No', dataIndex: 'loanNo' },
    { title: 'Customer', dataIndex: ['customer', 'name'] },
    { title: 'Amount', dataIndex: 'amount', render: (v: number) => `₹${Number(v).toLocaleString('en-IN')}` },
    { title: 'Status', dataIndex: 'status', render: (s: string) => <Tag color={s === 'ACTIVE' ? 'green' : 'blue'}>{s}</Tag> },
  ];

  return (
    <div className="animate-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{
          width: 56, height: 56, borderRadius: 14,
          background: 'linear-gradient(135deg, #10B981, #059669)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: 22, fontWeight: 700, fontFamily: 'Outfit',
        }}>
          {advisor.name?.charAt(0)}
        </div>
        <div>
          <h2 style={{ margin: 0 }}>{advisor.name} <Tag color={advisor.isActive ? 'green' : 'red'}>{advisor.isActive ? 'Active' : 'Inactive'}</Tag></h2>
          <span style={{ color: '#94A3B8', fontSize: 13 }}>{advisor.advisorId} • {advisor.branch?.name} • {advisor.rank?.name || 'No Rank'}</span>
        </div>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={8}>
          <Card variant="borderless" className="stat-card" style={{ borderRadius: 12 }}>
            <Statistic title="Downline" value={advisor.downline?.length || 0} prefix={<TeamOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card variant="borderless" className="stat-card" style={{ borderRadius: 12 }}>
            <Statistic title="Loans Originated" value={advisor.loans?.length || 0} prefix={<BankOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card variant="borderless" className="stat-card" style={{ borderRadius: 12 }}>
            <Statistic title="Commission Plan" value={advisor.commissionPlan?.name || 'N/A'} prefix={<DollarOutlined />} valueStyle={{ fontSize: 16 }} />
          </Card>
        </Col>
      </Row>

      <Tabs type="card" items={[
        { label: 'Profile', key: '1', icon: <UserOutlined />, children: (
          <Card variant="borderless" style={{ borderRadius: 12 }}>
            <Descriptions bordered column={{ lg: 2, sm: 1, xs: 1 }} size="small">
              <Descriptions.Item label="Phone">{advisor.phone}</Descriptions.Item>
              <Descriptions.Item label="Email">{advisor.email || '—'}</Descriptions.Item>
              <Descriptions.Item label="Aadhaar">{advisor.aadhaarNo || '—'}</Descriptions.Item>
              <Descriptions.Item label="PAN">{advisor.panNo || '—'}</Descriptions.Item>
              <Descriptions.Item label="Upline">{advisor.upline ? `${advisor.upline.name} (${advisor.upline.advisorId})` : 'Direct'}</Descriptions.Item>
              <Descriptions.Item label="Joined">{new Date(advisor.joiningDate).toLocaleDateString()}</Descriptions.Item>
            </Descriptions>
          </Card>
        )},
        { label: 'Downline', key: '2', icon: <TeamOutlined />, children: (
          <Card variant="borderless" style={{ borderRadius: 12 }}>
            <Table dataSource={advisor.downline || []} columns={downlineColumns} rowKey="id" pagination={false} size="small" />
          </Card>
        )},
        { label: 'Loans', key: '3', icon: <BankOutlined />, children: (
          <Card variant="borderless" style={{ borderRadius: 12 }}>
            <Table dataSource={advisor.loans || []} columns={loanColumns} rowKey="id" pagination={false} size="small" />
          </Card>
        )},
      ]} />
    </div>
  );
}
