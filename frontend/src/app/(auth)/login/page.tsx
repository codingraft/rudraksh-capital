'use client';

import React, { useState } from 'react';
import { Form, Input, Button, Card, message, theme } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import { SunOutlined, MoonOutlined } from '@ant-design/icons';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const { mode, toggle } = useThemeStore();
  const isDark = mode === 'dark';

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/login', values);
      if (res.data.success) {
        localStorage.setItem('token', res.data.data.token);
        setUser(res.data.data.user);
        message.success('Welcome back!');
        router.push('/');
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: isDark
        ? 'radial-gradient(ellipse at top, #1E293B 0%, #0F172A 100%)'
        : 'radial-gradient(ellipse at top, #EEF2FF 0%, #E0E7FF 50%, #C7D2FE 100%)',
      padding: 16,
      transition: 'background 0.3s ease',
    }}>
      {/* Theme toggle - top right */}
      <Button
        type="text"
        icon={isDark ? <SunOutlined style={{ color: '#FBBF24' }} /> : <MoonOutlined />}
        onClick={toggle}
        style={{
          position: 'fixed', top: 20, right: 20,
          width: 44, height: 44, borderRadius: '50%',
          background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
        }}
      />

      <div style={{ width: '100%', maxWidth: 420 }} className="animate-in">
        <Card
          variant="borderless"
          style={{
            borderRadius: 16,
            boxShadow: isDark
              ? '0 20px 60px -12px rgba(0,0,0,0.5)'
              : '0 20px 60px -12px rgba(99,102,241,0.15)',
            background: isDark ? '#1E293B' : '#FFFFFF',
          }}
          styles={{ body: { padding: '40px 32px' } }}
        >
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <div style={{
              width: 60, height: 60, borderRadius: 16,
              background: isDark
                ? 'linear-gradient(135deg, #818CF8, #6366F1)'
                : 'linear-gradient(135deg, #6366F1, #4F46E5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px', boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
            }}>
              <span style={{ color: '#FFF', fontSize: 24, fontFamily: 'Outfit', fontWeight: 800 }}>R</span>
            </div>
            <h1 style={{
              fontFamily: 'Outfit', fontWeight: 800, fontSize: 26,
              color: isDark ? '#F1F5F9' : '#0F172A', margin: 0,
              letterSpacing: '-0.03em',
            }}>
              RUDRAKSH CAPITAL
            </h1>
            <p style={{ color: isDark ? '#94A3B8' : '#64748B', marginTop: 6, fontSize: 14 }}>
              Sign in to your account
            </p>
          </div>

          <Form name="login" onFinish={onFinish} layout="vertical" size="large" requiredMark={false}>
            <Form.Item name="username" rules={[{ required: true, message: 'Username is required' }]}>
              <Input
                prefix={<UserOutlined style={{ color: '#94A3B8' }} />}
                placeholder="Username"
                style={{ height: 48, borderRadius: 10 }}
              />
            </Form.Item>
            <Form.Item name="password" rules={[{ required: true, message: 'Password is required' }]}>
              <Input.Password
                prefix={<LockOutlined style={{ color: '#94A3B8' }} />}
                placeholder="Password"
                style={{ height: 48, borderRadius: 10 }}
              />
            </Form.Item>
            <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
              <Button
                type="primary"
                htmlType="submit"
                block
                loading={loading}
                style={{
                  height: 48, borderRadius: 10, fontWeight: 600, fontSize: 15,
                  background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
                  border: 'none',
                }}
              >
                Sign In
              </Button>
            </Form.Item>
          </Form>
        </Card>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: isDark ? '#475569' : '#94A3B8' }}>
          © 2026 Rudraksh Capital. All rights reserved.
        </p>
      </div>
    </div>
  );
}
