'use client';

import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Select, InputNumber, Divider, message, Row, Col, Typography, Space } from 'antd';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { PlusOutlined, DeleteOutlined, InfoCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

export default function LoanCreatePage() {
  const [form] = Form.useForm();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [advisors, setAdvisors] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [goldCategories, setGoldCategories] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      api.get('/customers?limit=1000'),
      api.get('/advisors?limit=1000'),
      api.get('/masters/loan-products'),
      api.get('/masters/gold-categories'),
    ]).then(([c, a, p, g]) => {
      setCustomers(c.data.data || []);
      setAdvisors(a.data.data || []);
      setProducts(p.data.data || []);
      setGoldCategories(g.data.data || []);
    }).catch(() => message.error('Failed to load form data'));
  }, []);

  const handleProductChange = (productId: string) => {
    const product = products.find(p => p.id === productId);
    setSelectedProduct(product);
    if (product) {
      form.setFieldsValue({
        interestRate: Number(product.interestRate),
        interestType: product.interestType,
        tenure: product.minTenure || 12,
      });
    }
  };

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      // Format complex data if needed
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

  const isGoldLoan = selectedProduct?.name?.toLowerCase()?.includes('gold');
  const isVehicleLoan = selectedProduct?.name?.toLowerCase()?.includes('rickshaw') || selectedProduct?.name?.toLowerCase()?.includes('vehicle');

  return (
    <div className="animate-in" style={{ maxWidth: 900, margin: '0 auto', paddingBottom: 40 }}>
      <div className="page-header"><h2>New Loan Application</h2></div>

      <Card variant="borderless" style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
        <Form form={form} layout="vertical" onFinish={onFinish} requiredMark="optional">
          {/* Applicant Section */}
          <Divider orientation="left" plain><Text strong style={{ color: '#6366F1' }}>APPLICANT INFORMATION</Text></Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="customerId" label="Customer" rules={[{ required: true }]}>
                <Select showSearch optionFilterProp="children" placeholder="Select customer"
                  options={customers.map(c => ({ label: `${c.name} (${c.customerId})`, value: c.id }))} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="advisorId" label="Advisor">
                <Select allowClear showSearch optionFilterProp="children" placeholder="Select advisor (optional)"
                  options={advisors.map(a => ({ label: `${a.name} (${a.advisorId})`, value: a.id }))} />
              </Form.Item>
            </Col>
          </Row>

          {/* Loan Basic Section */}
          <Divider orientation="left" plain><Text strong style={{ color: '#6366F1' }}>LOAN SPECIFICATIONS</Text></Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="loanProductId" label="Product" rules={[{ required: true }]}>
                <Select onChange={handleProductChange} placeholder="Select loan product"
                  options={products.map(p => ({ label: p.name, value: p.id }))} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="amount" label="Loan Amount" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} prefix="₹" placeholder="0.00" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="tenure" label="Tenure (Months)" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} placeholder="e.g. 12" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="interestRate" label="Interest % (p.a.)" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} suffix="%" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="interestType" label="Interest Type" rules={[{ required: true }]}>
                <Select options={[
                  { value: 'FLAT', label: 'Flat Rate' },
                  { value: 'REDUCING', label: 'Reducing Balance' },
                  { value: 'MONTHLY', label: 'Monthly' }
                ]} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="purpose" label="Purpose"><Input placeholder="e.g. Business, Education" /></Form.Item>
            </Col>
          </Row>

          {/* Dynamic Gold Details Section */}
          {isGoldLoan && (
            <>
              <Divider orientation="left" plain><Text strong style={{ color: '#F59E0B' }}>GOLD COLLATERAL DETAILS</Text></Divider>
              <div style={{ background: '#FFFBEB', padding: '16px', borderRadius: '12px', marginBottom: '16px' }}>
                <Form.List name="goldItems">
                  {(fields, { add, remove }) => (
                    <>
                      {fields.map(({ key, name, ...restField }) => (
                        <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                          <Form.Item {...restField} name={[name, 'itemName']} label={key === 0 ? "Item Name" : ""} rules={[{ required: true }]}>
                            <Input placeholder="e.g. Gold Ring" />
                          </Form.Item>
                          <Form.Item {...restField} name={[name, 'purity']} label={key === 0 ? "Purity" : ""}>
                            <Select style={{ width: 120 }} options={goldCategories.map(g => ({ label: g.name, value: g.name }))} placeholder="Purity" />
                          </Form.Item>
                          <Form.Item {...restField} name={[name, 'grossWeight']} label={key === 0 ? "Gross Wt (g)" : ""} rules={[{ required: true }]}>
                            <InputNumber placeholder="0.00" />
                          </Form.Item>
                          <Form.Item {...restField} name={[name, 'netWeight']} label={key === 0 ? "Net Wt (g)" : ""}>
                            <InputNumber placeholder="0.00" />
                          </Form.Item>
                          <DeleteOutlined onClick={() => remove(name)} style={{ color: '#EF4444', marginLeft: 8 }} />
                        </Space>
                      ))}
                      <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />} style={{ background: 'white' }}>
                        Add Gold Item
                      </Button>
                    </>
                  )}
                </Form.List>
              </div>
            </>
          )}

          {/* Dynamic E-Rickshaw Details Section */}
          {isVehicleLoan && (
            <>
              <Divider orientation="left" plain><Text strong style={{ color: '#06B6D4' }}>VEHICLE DETAILS</Text></Divider>
              <div style={{ background: '#ECFEFF', padding: '16px', borderRadius: '12px', marginBottom: '16px' }}>
                <Row gutter={12}>
                  <Col span={8}>
                    <Form.Item name="vehicleNo" label="Vehicle No"><Input placeholder="e.g. BR 01 AB 1234" /></Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="chassisNo" label="Chassis No"><Input placeholder="Enter chassis number" /></Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="motorNo" label="Motor No"><Input placeholder="Enter motor number" /></Form.Item>
                  </Col>
                </Row>
                <Row gutter={12}>
                  <Col span={12}>
                    <Form.Item name="batteryNo" label="Battery Details"><Input placeholder="e.g. Exide 12V 100Ah" /></Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="dealerName" label="Dealer Name"><Input placeholder="Enter dealer name" /></Form.Item>
                  </Col>
                </Row>
              </div>
            </>
          )}

          {/* Guarantor Section */}
          <Divider orientation="left" plain><Text strong style={{ color: '#6366F1' }}>GUARANTOR DETAILS</Text></Divider>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="guarantorName" label="Guarantor Name"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="guarantorPhone" label="Guarantor Phone"><Input /></Form.Item></Col>
          </Row>
          <Form.Item name="guarantorAddr" label="Guarantor Address"><Input.TextArea rows={2} /></Form.Item>
          
          <Form.Item name="remarks" label="Office Remarks"><Input.TextArea rows={2} placeholder="Internal notes..." /></Form.Item>

          <div style={{ textAlign: 'right', marginTop: 24 }}>
            <Button onClick={() => router.back()} style={{ marginRight: 12, height: 48, minWidth: 120 }}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={loading} 
              style={{ 
                background: 'linear-gradient(135deg, #6366F1, #4F46E5)', 
                border: 'none', 
                height: 48, 
                minWidth: 200,
                borderRadius: 10,
                fontSize: 16,
                fontWeight: 700,
                boxShadow: '0 4px 14px rgba(99,102,241,0.4)'
              }}>
              Submit Application
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
}
