import React, { forwardRef } from 'react';
import dayjs from 'dayjs';

interface VoucherTemplateProps {
  voucher: any;
  companyName?: string;
  branchName?: string;
}

export const VoucherTemplate = forwardRef<HTMLDivElement, VoucherTemplateProps>(
  ({ voucher, companyName = 'Rudraksh Capital', branchName = 'Main Branch' }, ref) => {
    if (!voucher) return <div ref={ref}>Loading...</div>;

    return (
      <div ref={ref} style={{ padding: '40px', fontFamily: 'Arial, sans-serif', color: '#000', backgroundColor: '#fff', border: '1px solid #eee' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '20px', borderBottom: '2px solid #333', paddingBottom: '10px' }}>
          <h1 style={{ margin: '0', fontSize: '24px' }}>{companyName}</h1>
          <div style={{ fontSize: '14px' }}>{branchName}</div>
          <h2 style={{ margin: '10px 0 0 0', fontSize: '18px', background: '#f0f0f0', display: 'inline-block', padding: '5px 20px', borderRadius: '4px' }}>
            {voucher.type} VOUCHER
          </h2>
        </div>

        {/* Info Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
          <div>
            <div><strong>Voucher No:</strong> {voucher.voucherNo}</div>
            <div><strong>Date:</strong> {dayjs(voucher.date).format('DD/MM/YYYY')}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div><strong>Status:</strong> {voucher.status}</div>
            <div><strong>Ref No:</strong> {voucher.referenceNo || 'N/A'}</div>
          </div>
        </div>

        {/* Details Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f5f5f5', borderTop: '1px solid #000', borderBottom: '1px solid #000' }}>
              <th style={{ padding: '10px', textAlign: 'left' }}>Particulars</th>
              <th style={{ padding: '10px', textAlign: 'right' }}>Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: '20px 10px', borderBottom: '1px solid #eee', verticalAlign: 'top' }}>
                <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '5px' }}>{voucher.accountHead}</div>
                <div style={{ fontSize: '13px', color: '#555' }}>{voucher.narration}</div>
                {voucher.advisor && (
                  <div style={{ marginTop: '10px', fontSize: '13px' }}>
                    <strong>Advisor:</strong> {voucher.advisor.name} ({voucher.advisor.advisorId})
                  </div>
                )}
              </td>
              <td style={{ padding: '20px 10px', textAlign: 'right', borderBottom: '1px solid #eee', fontWeight: 'bold', fontSize: '16px' }}>
                {Number(voucher.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold' }}>Total:</td>
              <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold', fontSize: '18px' }}>
                ₹ {Number(voucher.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Amount in words (Placeholder logic) */}
        <div style={{ marginBottom: '50px', fontStyle: 'italic', fontSize: '13px' }}>
          <strong>Amount in words:</strong> Rupee {Number(voucher.amount).toLocaleString('en-IN')} Only
        </div>

        {/* Signatures */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '60px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ borderTop: '1px solid #000', paddingTop: '5px', width: '150px' }}>Prepared By</div>
            <div style={{ fontSize: '12px' }}>{voucher.createdBy}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ borderTop: '1px solid #000', paddingTop: '5px', width: '150px' }}>Authorized By</div>
            <div style={{ fontSize: '12px' }}>{voucher.approvedBy || '__________'}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ borderTop: '1px solid #000', paddingTop: '5px', width: '150px' }}>Receiver's Signature</div>
          </div>
        </div>
      </div>
    );
  }
);

VoucherTemplate.displayName = 'VoucherTemplate';
