import React, { forwardRef } from 'react';
import dayjs from 'dayjs';

interface SanctionLetterProps {
  loan: any;
  companyName?: string;
  address?: string;
}

export const SanctionLetter = forwardRef<HTMLDivElement, SanctionLetterProps>(
  ({ loan, companyName = 'Rudraksh Capital', address = '123 Finance Street, City, State 123456' }, ref) => {
    if (!loan) return <div ref={ref}>Loading...</div>;

    return (
      <div ref={ref} style={{ padding: '50px', fontFamily: 'serif', color: '#000', backgroundColor: '#fff', fontSize: '15px', lineHeight: '1.6' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ margin: '0 0 5px 0', fontSize: '28px', color: '#1a365d' }}>{companyName}</h1>
          <div style={{ fontSize: '13px', color: '#4a5568' }}>{address}</div>
          <div style={{ marginTop: '20px', fontWeight: 'bold', textDecoration: 'underline', fontSize: '18px' }}>LOAN SANCTION LETTER</div>
        </div>

        {/* Reference and Date */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
          <div><strong>Ref:</strong> RC/LOAN/{loan.loanNo}</div>
          <div><strong>Date:</strong> {dayjs(loan.approvedDate || new Date()).format('DD/MM/YYYY')}</div>
        </div>

        {/* Recipient */}
        <div style={{ marginBottom: '30px' }}>
          To,<br />
          <strong>{loan.customer?.name}</strong><br />
          {loan.customer?.address}<br />
          {loan.customer?.city}, {loan.customer?.state} - {loan.customer?.pincode}
        </div>

        <p style={{ fontWeight: 'bold', marginBottom: '20px' }}>
          Subject: Sanction of {loan.loanProduct?.name || 'Loan'} for ₹ {Number(loan.amount).toLocaleString('en-IN')}
        </p>

        <p>Dear {loan.customer?.name},</p>

        <p>
          With reference to your loan application dated {dayjs(loan.appliedDate).format('DD/MM/YYYY')}, 
          we are pleased to inform you that your loan has been sanctioned as per the following terms and conditions:
        </p>

        <table style={{ width: '100%', borderCollapse: 'collapse', margin: '20px 0' }}>
          <tbody>
            <tr>
              <td style={{ border: '1px solid #ddd', padding: '10px', width: '40%' }}><strong>Sanctioned Amount</strong></td>
              <td style={{ border: '1px solid #ddd', padding: '10px' }}>₹ {Number(loan.amount).toLocaleString('en-IN')}</td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #ddd', padding: '10px' }}><strong>Rate of Interest</strong></td>
              <td style={{ border: '1px solid #ddd', padding: '10px' }}>{Number(loan.interestRate)}% per annum ({loan.interestType})</td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #ddd', padding: '10px' }}><strong>Loan Tenure</strong></td>
              <td style={{ border: '1px solid #ddd', padding: '10px' }}>{loan.tenure} Months</td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #ddd', padding: '10px' }}><strong>Equated Monthly Installment (EMI)</strong></td>
              <td style={{ border: '1px solid #ddd', padding: '10px' }}>₹ {Number(loan.emiAmount || 0).toLocaleString('en-IN')}</td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #ddd', padding: '10px' }}><strong>Processing Fees</strong></td>
              <td style={{ border: '1px solid #ddd', padding: '10px' }}>₹ {Number(loan.processingFee || 0).toLocaleString('en-IN')}</td>
            </tr>
          </tbody>
        </table>

        <p style={{ marginTop: '20px' }}>
          Please note that the disbursement is subject to completion of documentation and verification of the originals. 
          You are requested to sign the duplicate copy of this letter as a token of your acceptance of the terms and conditions.
        </p>

        <p>We look forward to a long-lasting relationship with you.</p>

        <div style={{ marginTop: '50px' }}>
          Yours sincerely,<br /><br />
          <strong>For {companyName}</strong><br /><br /><br />
          Authorized Signatory
        </div>

        {/* Acceptance Box */}
        <div style={{ marginTop: '60px', border: '1px solid #000', padding: '15px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '10px', textDecoration: 'underline' }}>ACCEPTANCE</div>
          I / We accept the above terms and conditions and have signed the loan agreement.
          <br /><br /><br />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Date: ___________</span>
            <span>Signature of Borrower: ____________________</span>
          </div>
        </div>
      </div>
    );
  }
);

SanctionLetter.displayName = 'SanctionLetter';
