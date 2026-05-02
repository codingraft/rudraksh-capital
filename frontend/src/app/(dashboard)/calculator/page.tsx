'use client';

import { useState } from 'react';
import { Card, Form, InputNumber, Select, Button, Table, Typography, Row, Col, Statistic, theme, Space } from 'antd';
import { CalculatorOutlined, DollarOutlined } from '@ant-design/icons';
import { api } from '@/lib/api';

const { Title, Text } = Typography;

export default function CalculatorPage() {
  const [form] = Form.useForm();
  const [schedule, setSchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  
  const { token } = theme.useToken();

  const handleCalculate = async (values: any) => {
    try {
      setLoading(true);
      const res = await api.get('/loans/tools/calculator', { params: values });
      if (res.data?.success) {
        setSchedule(res.data.data.schedule);
        setSummary({
          emi: res.data.data.emi,
          totalInterest: res.data.data.totalInterest,
          totalAmount: res.data.data.totalAmount,
        });
      }
    } catch (err: any) {
      console.error(err);
      // Let global error interceptor show notification
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { title: 'No.', dataIndex: 'installmentNo', key: 'installmentNo' },
    { title: 'Date', dataIndex: 'dueDate', key: 'dueDate', render: (val: string) => new Date(val).toLocaleDateString() },
    { title: 'Principal', dataIndex: 'principal', key: 'principal', render: (val: number) => `₹${val.toFixed(2)}` },
    { title: 'Interest', dataIndex: 'interest', key: 'interest', render: (val: number) => `₹${val.toFixed(2)}` },
    { title: 'EMI', dataIndex: 'amount', key: 'amount', render: (val: number) => <Text strong>₹${val.toFixed(2)}</Text> },
    { title: 'Balance', dataIndex: 'balance', key: 'balance', render: (val: number) => `₹${val.toFixed(2)}` },
  ];

  return (
    <div style={{ padding: '0px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
          <CalculatorOutlined style={{ color: token.colorPrimary }} />
          Loan Calculator
        </Title>
        <Text type="secondary">Simulate EMI and Amortization Schedules without generating a loan.</Text>
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} md={8}>
          <Card headStyle={{ borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
            <Form
              form={form}
              layout="vertical"
              onFinish={handleCalculate}
              initialValues={{ type: 'REDUCING', tenure: 12, rate: 15 }}
            >
              <Form.Item label="Principal Amount (₹)" name="amount" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} size="large" min={1000} />
              </Form.Item>
              
              <Form.Item label="Interest Rate (%)" name="rate" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} size="large" min={0.1} step={0.1} />
              </Form.Item>

              <Form.Item label="Tenure (Months)" name="tenure" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} size="large" min={1} max={120} />
              </Form.Item>

              <Form.Item label="Interest Type" name="type" rules={[{ required: true }]}>
                <Select size="large">
                  <Select.Option value="REDUCING">Reducing Balance</Select.Option>
                  <Select.Option value="FLAT">Flat Rate</Select.Option>
                </Select>
              </Form.Item>

              <Button type="primary" htmlType="submit" size="large" block loading={loading} icon={<CalculatorOutlined />}>
                Calculate EMI
              </Button>
            </Form>
          </Card>
        </Col>

        <Col xs={24} md={16}>
          {summary ? (
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              <Row gutter={[16, 16]}>
                <Col flex={1}>
                  <Card size="small" style={{ background: token.colorPrimaryBg }}>
                    <Statistic title="Monthly EMI" value={summary.emi} prefix="₹" precision={2} valueStyle={{ color: token.colorPrimary }} />
                  </Card>
                </Col>
                <Col flex={1}>
                  <Card size="small">
                    <Statistic title="Total Interest" value={summary.totalInterest} prefix="₹" precision={2} />
                  </Card>
                </Col>
                <Col flex={1}>
                  <Card size="small">
                    <Statistic title="Total Payment" value={summary.totalAmount} prefix="₹" precision={2} />
                  </Card>
                </Col>
              </Row>

              <Card title="Amortization Schedule" styles={{ body: { padding: 0 } }}>
                <Table
                  dataSource={schedule}
                  columns={columns}
                  rowKey="installmentNo"
                  pagination={false}
                  size="small"
                  scroll={{ y: 400 }}
                />
              </Card>
            </Space>
          ) : (
            <Card style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center', opacity: 0.5 }}>
                <DollarOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                <br />
                <Text>Enter loan details and click calculate to view schedule.</Text>
              </div>
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
}
