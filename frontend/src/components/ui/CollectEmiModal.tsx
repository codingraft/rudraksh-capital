import React, { useState } from 'react';
import { Modal, Form, InputNumber, Select, message, Descriptions, Typography, theme } from 'antd';
import { api } from '@/lib/api';

const { Text } = Typography;

interface CollectEmiModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  loanId: string;
  emiRecord: any; // Contains installment no, due amount, etc.
}

export default function CollectEmiModal({ open, onCancel, onSuccess, loanId, emiRecord }: CollectEmiModalProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { token } = theme.useToken();

  // Set default amount to due amount when modal opens
  React.useEffect(() => {
    if (open && emiRecord) {
      const dueAmount = Number(emiRecord.amount) + Number(emiRecord.penalty) - Number(emiRecord.paidAmount);
      form.setFieldsValue({
        amount: dueAmount > 0 ? dueAmount : 0,
        method: 'CASH',
      });
    }
  }, [open, emiRecord, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      
      const payload = {
        loanId,
        type: 'EMI',
        amount: values.amount,
        method: values.method,
        narration: `EMI Collection - Installment ${emiRecord.installment}`,
      };

      const res = await api.post('/payments/emi', payload);
      
      if (res.data.success) {
        message.success('EMI Collected successfully');
        form.resetFields();
        onSuccess();
      }
    } catch (error: any) {
      if (error.response) {
         message.error(error.response.data.message || 'Failed to collect EMI');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!emiRecord) return null;

  const dueAmount = Number(emiRecord.amount) + Number(emiRecord.penalty) - Number(emiRecord.paidAmount);

  return (
    <Modal
      title={`Collect EMI - Installment #${emiRecord.installment}`}
      open={open}
      onCancel={onCancel}
      onOk={handleSubmit}
      confirmLoading={loading}
      destroyOnHidden
    >
      <div style={{ marginBottom: 24, padding: 16, background: token.colorFillSecondary || 'rgba(128,128,128,0.1)', borderRadius: 8 }}>
        <Descriptions column={2} size="small">
          <Descriptions.Item label="Due Date"><Text strong>{new Date(emiRecord.dueDate).toLocaleDateString()}</Text></Descriptions.Item>
          <Descriptions.Item label="EMI Amount">₹{emiRecord.amount}</Descriptions.Item>
          <Descriptions.Item label="Penalty">₹{emiRecord.penalty}</Descriptions.Item>
          <Descriptions.Item label="Paid Already">₹{emiRecord.paidAmount}</Descriptions.Item>
          <Descriptions.Item label="Total Due"><Text type="danger" strong>₹{dueAmount}</Text></Descriptions.Item>
        </Descriptions>
      </div>

      <Form form={form} layout="vertical" preserve={false}>
        <Form.Item name="amount" label="Collection Amount" rules={[{ required: true, type: 'number', min: 1 }]}>
          <InputNumber style={{ width: '100%' }} prefix="₹" />
        </Form.Item>
        <Form.Item name="method" label="Payment Method" rules={[{ required: true }]}>
          <Select options={[
            { value: 'CASH', label: 'Cash' },
            { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
            { value: 'UPI', label: 'UPI' },
            { value: 'CHEQUE', label: 'Cheque' },
          ]} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
