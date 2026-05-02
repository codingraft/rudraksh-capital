import React, { forwardRef } from 'react';
import { Typography, Divider } from 'antd';

const { Title, Text } = Typography;

const TermsAndConditions = forwardRef<HTMLDivElement, any>((props, ref) => {
  return (
    <div ref={ref} style={{ padding: '40px', background: '#fff', color: '#000', fontSize: '13px', fontFamily: 'serif' }}>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <Title level={2} style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>RUDRAKSH CAPITAL</Title>
      </div>
      
      <Divider style={{ borderColor: '#000', borderWidth: 2 }} />
      
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <Title level={4} style={{ textDecoration: 'underline', margin: 0 }}>GENERAL TERMS AND CONDITIONS</Title>
      </div>

      <div style={{ lineHeight: '1.8' }}>
        <ol style={{ paddingLeft: '20px' }}>
          <li>
            <strong>Disbursement:</strong> The loan amount will be disbursed via bank transfer, NEFT, RTGS or Cheque. The Applicant authorizes Rudraksh Capital to deduct applicable processing fees upfront.
          </li>
          <li>
            <strong>Repayment & EMI:</strong> The borrower agrees to repay the loan sum along with interest in Equated Monthly Installments (EMIs) on or before the due dates. Delay in repayment will attract a penal interest as scheduled in the loan agreement.
          </li>
          <li>
            <strong>Pre-payment / Part-payment:</strong> Pre-payment or part-payment of the loan is allowed only after the successful payment of the first three EMIs. A foreclosure charge of X% may be applicable on the outstanding principal balance.
          </li>
          <li>
            <strong>Late Fees:</strong> Any default in EMI schedule will result in a daily penalty charge of ₹___ or __% per annum on the overdue amount.
          </li>
          <li>
            <strong>CIBIL Reporting:</strong> Rudraksh Capital holds the right to report borrower defaults and good repayment behavior to credit bureaus such as CIBIL, Equifax, Experian, etc.
          </li>
          <li>
            <strong>Collection:</strong> In case of default, the company may initiate legal action and use third-party collection agencies. The borrower agrees to pay the recovery or legal costs incurred by the company.
          </li>
          <li>
            <strong>Address & Contact Changes:</strong> The borrower undertakes to notify the company within 7 days in writing regarding any change of residential address or contact details.
          </li>
          <li>
            <strong>Jurisdiction:</strong> All disputes arising out of or related to this financial agreement will be subject to the exclusive jurisdiction of the courts of local administration.
          </li>
        </ol>
      </div>

      <div style={{ marginTop: '50px' }}>
        <p>
          I have read and understood the Terms and Conditions associated with my financial application. I strictly bind myself to them.
        </p>
      </div>

      <div style={{ marginTop: '60px', display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ textAlign: 'center' }}>
          <Text>___________________________</Text>
          <br />
          <Text strong>Borrower Signature</Text>
        </div>
      </div>
    </div>
  );
});

TermsAndConditions.displayName = 'TermsAndConditions';

export default TermsAndConditions;
