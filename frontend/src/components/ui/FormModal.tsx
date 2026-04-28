'use client';

import React, { useState, useEffect } from 'react';
import { Modal, Form, Button, message } from 'antd';
import { api } from '@/lib/api';

interface FormModalProps {
  title: string;
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  endpoint: string;
  initialValues?: any;
  children: React.ReactNode;
  width?: number;
}

export default function FormModal({
  title, open, onCancel, onSuccess,
  endpoint, initialValues, children, width = 560,
}: FormModalProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const isEdit = !!initialValues?.id;

  useEffect(() => {
    if (open) {
      initialValues ? form.setFieldsValue(initialValues) : form.resetFields();
    }
  }, [open, initialValues, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      const url = isEdit ? `${endpoint}/${initialValues.id}` : endpoint;
      const res = await api[isEdit ? 'put' : 'post'](url, values);
      if (res.data.success) {
        message.success(`${title} ${isEdit ? 'updated' : 'created'} successfully`);
        form.resetFields();
        onSuccess();
      }
    } catch (error: any) {
      if (error.response) message.error(error.response.data.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={`${isEdit ? 'Edit' : 'Add'} ${title}`}
      open={open}
      onCancel={onCancel}
      onOk={handleSubmit}
      confirmLoading={loading}
      width={width}
      destroyOnHidden
      styles={{ body: { paddingTop: 16 } }}
    >
      <Form form={form} layout="vertical" preserve={false} requiredMark="optional">
        {children}
      </Form>
    </Modal>
  );
}
