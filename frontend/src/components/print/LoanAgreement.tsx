import React, { forwardRef } from 'react';
import dayjs from 'dayjs';

interface LoanAgreementProps {
  loan: any;
  companyName?: string;
  address?: string;
}

export const LoanAgreement = forwardRef<HTMLDivElement, LoanAgreementProps>(
  ({ loan, companyName = 'Rudraksh Capital', address = '123 Finance Street, City, State 123456' }, ref) => {
    if (!loan) return <div ref={ref}>Loading...</div>;

    return (
      <div ref={ref} style={{ padding: '40px', fontFamily: 'Times New Roman, serif', color: '#000', backgroundColor: '#fff', fontSize: '14px', lineHeight: '1.6' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ margin: '0 0 10px 0', fontSize: '26px', textTransform: 'uppercase' }}>{companyName}</h1>
          <div style={{ fontSize: '14px' }}>{address}</div>
          <h2 style={{ borderTop: '2px solid #000', borderBottom: '2px solid #000', padding: '10px 0', marginTop: '20px', fontSize: '18px', textTransform: 'uppercase' }}>
            LOAN AGREEMENT & TERMS OF CONDITIONS
          </h2>
        </div>

        {/* Info Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
          <div>
            <div><strong>Agreement Date:</strong> {dayjs(loan.approvedDate || loan.createdAt).format('DD MMMM YYYY')}</div>
            <div><strong>Loan A/C No:</strong> {loan.loanNo}</div>
            <div><strong>Branch:</strong> {loan.branch?.name}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div><strong>Customer ID:</strong> {loan.customer?.customerId}</div>
            <div><strong>Advisor:</strong> {loan.advisor?.name || 'Direct'}</div>
          </div>
        </div>

        <p>
          This Loan Agreement is made on <strong>{dayjs(loan.approvedDate || loan.createdAt).format('DD MMMM YYYY')}</strong> between 
          <strong> {companyName}</strong> (hereinafter referred to as the "Lender") and 
          <strong> {loan.customer?.name}</strong>, Son/Daughter of {loan.customer?.fatherName || '___________'}, 
          residing at {loan.customer?.address || '___________'} (hereinafter referred to as the "Borrower").
        </p>

        <h3 style={{ marginTop: '20px', textDecoration: 'underline' }}>1. Loan Details</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
          <tbody>
            <tr>
              <td style={{ border: '1px solid #000', padding: '8px' }}><strong>Principal Amount:</strong></td>
              <td style={{ border: '1px solid #000', padding: '8px' }}>₹ {Number(loan.amount).toLocaleString('en-IN')}</td>
              <td style={{ border: '1px solid #000', padding: '8px' }}><strong>Interest Rate:</strong></td>
              <td style={{ border: '1px solid #000', padding: '8px' }}>{Number(loan.interestRate)}% {loan.interestType}</td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #000', padding: '8px' }}><strong>Tenure:</strong></td>
              <td style={{ border: '1px solid #000', padding: '8px' }}>{loan.tenure} Months</td>
              <td style={{ border: '1px solid #000', padding: '8px' }}><strong>EMI Amount:</strong></td>
              <td style={{ border: '1px solid #000', padding: '8px' }}>₹ {Number(loan.emiAmount || 0).toLocaleString('en-IN')}</td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #000', padding: '8px' }}><strong>Total Payable:</strong></td>
              <td style={{ border: '1px solid #000', padding: '8px' }}>₹ {Number(loan.totalPayable || 0).toLocaleString('en-IN')}</td>
              <td style={{ border: '1px solid #000', padding: '8px' }}><strong>Processing Fee:</strong></td>
              <td style={{ border: '1px solid #000', padding: '8px' }}>₹ {Number(loan.processingFee || 0).toLocaleString('en-IN')}</td>
            </tr>
          </tbody>
        </table>

        {loan.guarantorName && (
          <>
            <h3 style={{ marginTop: '20px', textDecoration: 'underline' }}>2. Guarantor Details</h3>
            <p>
              The borrower provides the following individual as a guarantor for this loan, who accepts joint liability for the repayment of the total outstanding amount:
              <br/>
              <strong>Name:</strong> {loan.guarantorName} <br/>
              <strong>Phone:</strong> {loan.guarantorPhone} <br/>
              <strong>Address:</strong> {loan.guarantorAddr}
            </p>
          </>
        )}

        <h3 style={{ marginTop: '20px', textDecoration: 'underline' }}>3. Terms and Conditions</h3>
        <ol style={{ paddingLeft: '20px', textAlign: 'justify' }}>
          <li style={{ marginBottom: '8px' }}>The Borrower agrees to repay the Principal Amount along with the accrued interest as per the EMI schedule provided.</li>
          <li style={{ marginBottom: '8px' }}>In the event of a default or delay in payment of the EMI, a penalty of 2% per month will be charged on the overdue amount.</li>
          <li style={{ marginBottom: '8px' }}>The Lender reserves the right to initiate legal proceedings against the Borrower and the Guarantor under the applicable laws if the loan remains unpaid for more than 90 days.</li>
          <li style={{ marginBottom: '8px' }}>Any processing fees or documentation charges paid at the time of loan application are non-refundable.</li>
          <li style={{ marginBottom: '8px' }}>The Borrower confirms that all documents and information provided for KYC verification are true and accurate to the best of their knowledge.</li>
        </ol>

        {/* Signatures */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '100px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ borderTop: '1px solid #000', paddingTop: '5px', width: '200px' }}>Signature of Borrower</div>
          </div>
          {loan.guarantorName && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ borderTop: '1px solid #000', paddingTop: '5px', width: '200px' }}>Signature of Guarantor</div>
            </div>
          )}
          <div style={{ textAlign: 'center' }}>
            <div style={{ borderTop: '1px solid #000', paddingTop: '5px', width: '200px' }}>Authorized Signatory</div>
            <div style={{ fontSize: '12px', marginTop: '5px' }}>For {companyName}</div>
          </div>
        </div>
      </div>
    );
  }
);

LoanAgreement.displayName = 'LoanAgreement';
