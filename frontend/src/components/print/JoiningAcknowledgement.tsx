import React, { forwardRef } from 'react';
import { Typography, Row, Col, Divider, Descriptions, Table } from 'antd';

const { Title, Text } = Typography;

interface PrintProps {
  data: any;
}

const JoiningAcknowledgement = forwardRef<HTMLDivElement, PrintProps>(({ data }, ref) => {
  return (
    <div ref={ref} style={{ padding: '40px', background: '#fff', color: '#000', fontSize: '14px', fontFamily: 'serif' }}>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <Title level={2} style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>RUDRAKSH CAPITAL</Title>
        <Text>123 Financial District, Business Park, 400001</Text>
        <br />
        <Text>Email: info@rudrakshcapital.com | Phone: +91-XXXXXXXXXX</Text>
      </div>
      
      <Divider style={{ borderColor: '#000', borderWidth: 2 }} />
      
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <Title level={4} style={{ textDecoration: 'underline', margin: 0 }}>CUSTOMER JOINING ACKNOWLEDGEMENT</Title>
      </div>

      <Row gutter={[24, 24]}>
        <Col span={12}>
          <div style={{ border: '1px solid #000', padding: '10px', height: '100%' }}>
            <Text strong>Customer Detail:</Text><br />
            <table style={{ width: '100%', marginTop: '10px' }}>
              <tbody>
                <tr>
                  <td width="40%"><strong>ID Number:</strong></td>
                  <td>{data?.memberNo || 'N/A'}</td>
                </tr>
                <tr>
                  <td><strong>Name:</strong></td>
                  <td>{data?.name || 'N/A'}</td>
                </tr>
                <tr>
                  <td><strong>Date of Birth:</strong></td>
                  <td>{new Date(data?.dob).toLocaleDateString() || 'N/A'}</td>
                </tr>
                <tr>
                  <td><strong>Gender:</strong></td>
                  <td>{data?.gender || 'N/A'}</td>
                </tr>
                <tr>
                  <td><strong>Mobile:</strong></td>
                  <td>{data?.phone || 'N/A'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Col>
        
        <Col span={12}>
          <div style={{ border: '1px solid #000', padding: '10px', height: '100%' }}>
            <Text strong>Address Detail:</Text><br />
            <Text style={{ display: 'block', marginTop: '10px' }}>
              {data?.address || 'N/A'}
            </Text>
          </div>
        </Col>
      </Row>

      <Row style={{ marginTop: '20px' }} gutter={[24, 24]}>
        <Col span={24}>
           <div style={{ border: '1px solid #000', padding: '10px' }}>
            <Text strong>KYC Details:</Text><br />
            <table style={{ width: '100%', marginTop: '10px' }}>
              <tbody>
                <tr>
                  <td width="20%"><strong>Aadhar No:</strong></td>
                  <td width="30%">{data?.aadharNo || 'N/A'}</td>
                  <td width="20%"><strong>PAN No:</strong></td>
                  <td width="30%">{data?.panNo || 'N/A'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Col>
      </Row>

      <div style={{ marginTop: '40px' }}>
        <Text strong>Declaration:</Text>
        <p style={{ marginTop: '10px', lineHeight: '1.6' }}>
          I hereby declare that the details furnished above are true and correct to the best of my knowledge and belief and I undertake to inform you of any changes therein, immediately. In case any of the above information is found to be false or untrue or misleading or misrepresenting, I am aware that I may be held liable for it.
        </p>
      </div>

      <div style={{ marginTop: '80px', display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ textAlign: 'center' }}>
          <Text>___________________________</Text>
          <br />
          <Text strong>Customer Signature</Text>
        </div>
        <div style={{ textAlign: 'center' }}>
          <Text>___________________________</Text>
          <br />
          <Text strong>Authorized Signatory</Text>
        </div>
      </div>
    </div>
  );
});

JoiningAcknowledgement.displayName = 'JoiningAcknowledgement';

export default JoiningAcknowledgement;
