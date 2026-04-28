'use client';

import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Select, InputNumber, Divider, message } from 'antd';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function LoanCreatePage() {
  const [form] = Form.useForm();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [advisors, setAdvisors] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      api.get('/customers?limit=1000'),
      api.get('/advisors?limit=1000'),
      api.get('/masters/loan-products'),
    ]).then(([c, a, p]) => {
      setCustomers(c.data.data || []);
      setAdvisors(a.data.data || []);
      setProducts(p.data.data || []);
    }).catch(() => message.error('Failed to load form data'));
  }, []);

  const handleProductChange = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      form.setFieldsValue({
        interestRate: Number(product.interestRate),
        interestType: product.interestType,
        tenure: product.minTenure,
      });
    }
  };

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const res = await api.post('/loans', values);
      if (res.data.success) {
        message.success('Loan application submitted');
        router.push(`/loans/${res.data.data.id}`);
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to submit');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-in" style={{ maxWidth: 800, margin: '0 auto' }}>
      <div className="page-header"><h2>New Loan Application</h2></div>

      <Card variant="borderless" style={{ borderRadius: 12 }}>
        <Form form={form} layout="vertical" onFinish={onFinish} requiredMark="optional">
          <Divider orientation={"left" as any} plain>Applicant</Divider>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item name="customerId" label="Customer" rules={[{ required: true }]}>
              <Select showSearch optionFilterProp="children"
                options={customers.map(c => ({ label: `${c.name} (${c.customerId})`, value: c.id }))} />
            </Form.Item>
            <Form.Item name="advisorId" label="Advisor">
              <Select allowClear showSearch optionFilterProp="children"
                options={advisors.map(a => ({ label: `${a.name} (${a.advisorId})`, value: a.id }))} />
            </Form.Item>
          </div>

          <Divider orientation={"left" as any} plain>Loan Details</Divider>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item name="loanProductId" label="Product" rules={[{ required: true }]}>
              <Select onChange={handleProductChange}
                options={products.map(p => ({ label: p.name, value: p.id }))} />
            </Form.Item>
            <Form.Item name="amount" label="Amount" rules={[{ required: true }]}>
              <InputNumber style={{ width: '100%' }} prefix="₹" />
            </Form.Item>
            <Form.Item name="interestRate" label="Interest %" rules={[{ required: true }]}>
              <InputNumber style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="interestType" label="Interest Type" rules={[{ required: true }]}>
              <Select options={[{ value: 'FLAT', label: 'Flat' }, { value: 'REDUCING', label: 'Reducing' }, { value: 'MONTHLY', label: 'Monthly' }]} />
            </Form.Item>
            <Form.Item name="tenure" label="Tenure (Months)" rules={[{ required: true }]}>
              <InputNumber style={{ width: '100%' }} />
            </Form.Item>
          </div>
          <Form.Item name="purpose" label="Purpose"><Input.TextArea rows={2} /></Form.Item>

          <Divider orientation={"left" as any} plain>Guarantor</Divider>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item name="guarantorName" label="Name"><Input /></Form.Item>
            <Form.Item name="guarantorPhone" label="Phone"><Input /></Form.Item>
          </div>
          <Form.Item name="guarantorAddr" label="Address"><Input.TextArea rows={2} /></Form.Item>

          <div style={{ textAlign: 'right', marginTop: 16 }}>
            <Button onClick={() => router.back()} style={{ marginRight: 8 }}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={loading} size="large"
              style={{ background: 'linear-gradient(135deg, #6366F1, #4F46E5)', border: 'none', minWidth: 160 }}>
              Submit Application
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
}
