import React, { forwardRef } from 'react';
import dayjs from 'dayjs';

interface ReceiptTemplateProps {
  payment: any;
  companyName?: string;
  branchName?: string;
  address?: string;
}

export const ReceiptTemplate = forwardRef<HTMLDivElement, ReceiptTemplateProps>(
  ({ payment, companyName = 'Rudraksh Capital', branchName = 'Main Branch', address = '123 Finance Street, City, State 123456' }, ref) => {
    if (!payment) return <div ref={ref}>Loading...</div>;

    const isEmi = payment.type === 'EMI';
    
    return (
      <div ref={ref} style={{ padding: '40px', fontFamily: 'Arial, sans-serif', color: '#000', backgroundColor: '#fff' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #000', paddingBottom: '20px', marginBottom: '20px' }}>
          <div>
            <h1 style={{ margin: '0 0 5px 0', fontSize: '24px' }}>{companyName}</h1>
            <div style={{ fontSize: '14px', color: '#333' }}>{branchName}</div>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>{address}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <h2 style={{ margin: '0 0 5px 0', fontSize: '20px', color: '#444' }}>PAYMENT RECEIPT</h2>
            <div style={{ fontSize: '14px' }}><strong>Receipt No:</strong> {payment.receiptNo}</div>
            <div style={{ fontSize: '14px' }}><strong>Date:</strong> {dayjs(payment.createdAt).format('DD MMM YYYY, hh:mm A')}</div>
          </div>
        </div>

        {/* Customer Details */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ borderBottom: '1px solid #ccc', paddingBottom: '5px', marginBottom: '10px' }}>Received From</h3>
            <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
              <div><strong>Name:</strong> {payment.loan?.customer?.name || 'N/A'}</div>
              <div><strong>Phone:</strong> {payment.loan?.customer?.phone || 'N/A'}</div>
              {payment.loan && <div><strong>Loan A/C No:</strong> {payment.loan.loanNo}</div>}
            </div>
          </div>
          <div style={{ flex: 1, paddingLeft: '40px' }}>
             <h3 style={{ borderBottom: '1px solid #ccc', paddingBottom: '5px', marginBottom: '10px' }}>Payment Details</h3>
             <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
              <div><strong>Payment Type:</strong> {payment.type}</div>
              <div><strong>Payment Mode:</strong> {payment.method}</div>
              {payment.chequeNo && <div><strong>Ref/Cheque No:</strong> {payment.chequeNo}</div>}
            </div>
          </div>
        </div>

        {/* Amount Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f5f5f5', borderTop: '1px solid #000', borderBottom: '1px solid #000' }}>
              <th style={{ padding: '12px 10px', textAlign: 'left' }}>Description</th>
              <th style={{ padding: '12px 10px', textAlign: 'right' }}>Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: '15px 10px', borderBottom: '1px solid #eee' }}>
                {isEmi 
                  ? `EMI Installment Collection for Loan ${payment.loan?.loanNo || ''}` 
                  : `General Payment Collection`}
                {payment.narration && <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>Note: {payment.narration}</div>}
              </td>
              <td style={{ padding: '15px 10px', textAlign: 'right', borderBottom: '1px solid #eee', fontWeight: 'bold' }}>
                {Number(payment.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 'bold', fontSize: '16px' }}>Total Amount:</td>
              <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 'bold', fontSize: '18px', borderTop: '1px solid #000', borderBottom: '2px solid #000' }}>
                ₹ {Number(payment.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Footer Signatures */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '80px', paddingTop: '20px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ borderTop: '1px solid #000', paddingTop: '5px', width: '200px' }}>Customer Signature</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ borderTop: '1px solid #000', paddingTop: '5px', width: '200px' }}>Authorized Signatory</div>
            <div style={{ fontSize: '12px', marginTop: '5px' }}>{payment.collectedBy}</div>
          </div>
        </div>
        
        <div style={{ textAlign: 'center', marginTop: '40px', fontSize: '11px', color: '#888', borderTop: '1px dashed #ccc', paddingTop: '10px' }}>
          This is a computer-generated receipt and does not require a physical seal.
        </div>
      </div>
    );
  }
);

ReceiptTemplate.displayName = 'ReceiptTemplate';
