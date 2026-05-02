import React, { forwardRef } from 'react';
import { Typography, Divider, Row, Col } from 'antd';

const { Title, Text } = Typography;

interface PrintProps {
  data: any; // expects a loan application object
}

const ApplicationReceipt = forwardRef<HTMLDivElement, PrintProps>(({ data }, ref) => {
  return (
    <div ref={ref} style={{ padding: '40px', background: '#fff', color: '#000', fontSize: '14px', fontFamily: 'serif' }}>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <Title level={2} style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>RUDRAKSH CAPITAL</Title>
        <Text>123 Financial District, Business Park, 400001</Text>
      </div>
      
      <Divider style={{ borderColor: '#000', borderWidth: 2 }} />
      
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <Title level={4} style={{ textDecoration: 'underline', margin: 0 }}>LOAN APPLICATION RECEIPT</Title>
      </div>

      <div style={{ marginBottom: 30, display: 'flex', justifyContent: 'space-between' }}>
        <Text strong>Application No: {data?.loanNo || '____________'}</Text>
        <Text strong>Date: {new Date(data?.createdAt || Date.now()).toLocaleDateString()}</Text>
      </div>

      <div style={{ padding: '15px', border: '1px solid #000', marginBottom: 30 }}>
        <Row gutter={[16, 16]}>
          <Col span={12}>
            <Text strong>Applicant Name:</Text> {data?.customer?.name || 'N/A'}
          </Col>
          <Col span={12}>
            <Text strong>Applicant ID:</Text> {data?.customer?.memberNo || 'N/A'}
          </Col>
          
          <Col span={12}>
            <Text strong>Requested Amount:</Text> ₹{data?.principalAmount?.toFixed(2) || '0.00'}
          </Col>
          <Col span={12}>
            <Text strong>Tenure:</Text> {data?.tenureMonths || 0} Months
          </Col>

          <Col span={12}>
            <Text strong>Interest Rate:</Text> {data?.interestRate || 0}%
          </Col>
          <Col span={12}>
            <Text strong>Scheme/Type:</Text> {data?.type || 'N/A'}
          </Col>
        </Row>
      </div>

      <div style={{ marginBottom: 30 }}>
        <Text strong>Status:</Text> <span style={{ textTransform: 'uppercase', padding: '2px 8px', border: '1px solid #000' }}>{data?.status || 'RECEIVED'}</span>
      </div>

      <p style={{ lineHeight: '1.6' }}>
        This is to acknowledge the receipt of your loan application. This receipt is not a commitment of loan approval. The disbursement of the loan is subject to profile verification, document checks, credit policies of the company, and CIBIL score checks. 
      </p>

      <div style={{ marginTop: '80px', display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ textAlign: 'center' }}>
          <Text>___________________________</Text>
          <br />
          <Text strong>Applicant Signature</Text>
        </div>
        <div style={{ textAlign: 'center' }}>
          <Text>___________________________</Text>
          <br />
          <Text strong>Receiving Officer Signature</Text>
        </div>
      </div>
    </div>
  );
});

ApplicationReceipt.displayName = 'ApplicationReceipt';

export default ApplicationReceipt;
