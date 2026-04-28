'use client';

import React, { useEffect, useState } from 'react';
import {
  Row, Col, Card, Table, Typography, message, Skeleton, Tag, theme, Progress, Divider,
} from 'antd';
import {
  TeamOutlined, UserOutlined, BankOutlined, DollarOutlined,
  WarningOutlined, ArrowUpOutlined, RiseOutlined, ClockCircleOutlined,
  CheckCircleOutlined, CloseCircleOutlined, ThunderboltOutlined,
  FileProtectOutlined, CreditCardOutlined, CalendarOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useThemeStore } from '@/store/themeStore';

const { Title, Text } = Typography;

// ─── TYPES ───────────────────────────────────────────────────────────
interface DashData {
  totalCustomers: number;
  activeCustomers: number;
  totalAdvisors: number;
  totalLoans: number;
  activeLoans: number;
  pendingLoans: number;
  overdueEMIs: number;
  todayCollections: { amount: number; count: number };
  monthlyCollections: { amount: number; count: number };
  totalDisbursed: number;
  loansByStatus: { status: string; _count: number; _sum: { amount: number } }[];
}

// ─── GRADIENT STAT CARD ──────────────────────────────────────────────
interface GradStatProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  gradient: string;
  iconBg: string;
  progress?: number;
  trend?: { value: string; up: boolean };
}

function GradStatCard({ title, value, subtitle, icon, gradient, iconBg, progress, trend }: GradStatProps) {
  return (
    <div
      className="stat-card-gradient"
      style={{
        background: gradient,
        borderRadius: 18,
        padding: '22px 24px',
        color: 'white',
        position: 'relative',
        overflow: 'hidden',
        height: '100%',
        cursor: 'default',
      }}
    >
      <div className="card-bg-pattern" />
      {/* Decorative circle */}
      <div style={{
        position: 'absolute', top: -24, right: -24,
        width: 120, height: 120, borderRadius: '50%',
        background: 'rgba(255,255,255,0.08)',
      }} />
      <div style={{
        position: 'absolute', bottom: -32, right: 16,
        width: 80, height: 80, borderRadius: '50%',
        background: 'rgba(255,255,255,0.05)',
      }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.8, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              {title}
            </div>
            <div className="animate-count" style={{ fontSize: 32, fontWeight: 800, fontFamily: 'Outfit, sans-serif', lineHeight: 1.1, marginTop: 8 }}>
              {value}
            </div>
            {subtitle && (
              <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>{subtitle}</div>
            )}
          </div>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: iconBg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, backdropFilter: 'blur(8px)',
          }}>
            {icon}
          </div>
        </div>

        {trend && (
          <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              background: 'rgba(255,255,255,0.2)',
              borderRadius: 99,
              padding: '2px 8px',
              fontSize: 11,
              fontWeight: 700,
            }}>
              {trend.up ? '↑' : '↓'} {trend.value}
            </span>
            <span style={{ fontSize: 11, opacity: 0.7 }}>vs last month</span>
          </div>
        )}

        {progress !== undefined && (
          <div className="mini-progress" style={{ marginTop: 14 }}>
            <div className="mini-progress-bar" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── PLAIN STAT CARD ─────────────────────────────────────────────────
interface PlainStatProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
  isDark: boolean;
}

function PlainStatCard({ title, value, subtitle, icon, color, isDark }: PlainStatProps) {
  return (
    <div
      className="stat-card"
      style={{
        background: isDark ? '#1E293B' : '#FFFFFF',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
        borderRadius: 18,
        padding: '20px 22px',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        cursor: 'default',
      }}
    >
      <div style={{
        width: 52, height: 52, borderRadius: 14, flexShrink: 0,
        background: `${color}18`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 22, color,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.5, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{title}</div>
        <div style={{ fontSize: 26, fontWeight: 800, fontFamily: 'Outfit, sans-serif', lineHeight: 1.1, color, marginTop: 2 }}>{value}</div>
        {subtitle && <div style={{ fontSize: 12, opacity: 0.5, marginTop: 2 }}>{subtitle}</div>}
      </div>
    </div>
  );
}

// ─── LOAN STATUS BADGE ───────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  APPLIED:  { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)',  label: 'Applied' },
  APPROVED: { color: '#6366F1', bg: 'rgba(99,102,241,0.12)',  label: 'Approved' },
  DISBURSED:{ color: '#06B6D4', bg: 'rgba(6,182,212,0.12)',   label: 'Disbursed' },
  ACTIVE:   { color: '#10B981', bg: 'rgba(16,185,129,0.12)',  label: 'Active' },
  CLOSED:   { color: '#64748B', bg: 'rgba(100,116,139,0.12)', label: 'Closed' },
  DEFAULTED:{ color: '#EF4444', bg: 'rgba(239,68,68,0.12)',   label: 'Defaulted' },
};

// ─── MAIN PAGE ───────────────────────────────────────────────────────
export default function DashboardPage() {
  const [data, setData] = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);
  const { mode } = useThemeStore();
  const router = useRouter();
  const { token: { colorBgContainer, colorBorder } } = theme.useToken();
  const isDark = mode === 'dark';

  const cardBg    = isDark ? '#1E293B' : '#FFFFFF';
  const cardBorder= isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const subtleBg  = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)';

  useEffect(() => {
    api.get('/reports/dashboard')
      .then(res => { if (res.data.success) setData(res.data.data); })
      .catch((err: any) => message.error(err.response?.data?.message || 'Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ padding: 4 }}>
      <Row gutter={[16, 16]}>
        {[...Array(4)].map((_, i) => (
          <Col key={i} xs={24} sm={12} lg={6}>
            <Skeleton.Button active block style={{ height: 130, borderRadius: 18 }} />
          </Col>
        ))}
      </Row>
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={16}>
          <Skeleton active paragraph={{ rows: 8 }} />
        </Col>
        <Col xs={24} lg={8}>
          <Skeleton active paragraph={{ rows: 8 }} />
        </Col>
      </Row>
    </div>
  );

  const totalActive = data?.activeLoans || 0;
  const totalAll    = data?.totalLoans || 1;
  const activeRatio = Math.round((totalActive / totalAll) * 100);

  const loanStatusColumns = [
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => {
        const cfg = STATUS_CONFIG[s] || { color: '#64748B', bg: 'rgba(100,116,139,0.12)', label: s };
        return (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 99, background: cfg.bg }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: cfg.color, letterSpacing: '0.04em' }}>{cfg.label}</span>
          </div>
        );
      },
    },
    {
      title: 'Count',
      dataIndex: '_count',
      key: 'count',
      render: (v: number) => <span style={{ fontWeight: 700, fontSize: 15, fontFamily: 'Outfit, sans-serif' }}>{v}</span>,
    },
    {
      title: 'Total Amount',
      dataIndex: ['_sum', 'amount'],
      key: 'amount',
      render: (v: string) => (
        <span style={{ fontWeight: 600 }}>
          ₹{Number(v || 0).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      title: 'Share',
      key: 'share',
      render: (_: any, r: any) => {
        const pct = totalAll > 0 ? Math.round((r._count / totalAll) * 100) : 0;
        const cfg = STATUS_CONFIG[r.status] || { color: '#64748B', bg: '', label: '' };
        return (
          <div style={{ minWidth: 80 }}>
            <Progress
              percent={pct}
              size="small"
              showInfo={false}
              strokeColor={cfg.color}
              trailColor={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}
            />
            <span style={{ fontSize: 10, opacity: 0.5 }}>{pct}%</span>
          </div>
        );
      },
    },
  ];

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good Morning' : now.getHours() < 17 ? 'Good Afternoon' : 'Good Evening';

  return (
    <div className="animate-in">
      {/* ─── Page Header ─── */}
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0, fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.03em' }}>
          {greeting}! 👋
        </Title>
        <Text type="secondary" style={{ fontSize: 14 }}>
          Here's what's happening with Rudraksh Capital today.
        </Text>
      </div>

      {/* ─── Row 1: Gradient Stat Cards ─── */}
      <Row gutter={[16, 16]} className="stagger-children">
        <Col xs={24} sm={12} lg={6}>
          <GradStatCard
            title="Total Customers"
            value={data?.totalCustomers?.toLocaleString('en-IN') || '0'}
            subtitle={`${data?.activeCustomers || 0} active`}
            icon={<TeamOutlined />}
            gradient="linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)"
            iconBg="rgba(255,255,255,0.2)"
            progress={data?.activeCustomers && data?.totalCustomers ? Math.round((data.activeCustomers / data.totalCustomers) * 100) : 0}
            trend={{ value: '12%', up: true }}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <GradStatCard
            title="Today's Collection"
            value={`₹${Number(data?.todayCollections?.amount || 0).toLocaleString('en-IN')}`}
            subtitle={`${data?.todayCollections?.count || 0} transactions`}
            icon={<DollarOutlined />}
            gradient="linear-gradient(135deg, #10B981 0%, #059669 100%)"
            iconBg="rgba(255,255,255,0.2)"
            trend={{ value: '8%', up: true }}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <GradStatCard
            title="Active Loans"
            value={data?.activeLoans || '0'}
            subtitle={`of ${data?.totalLoans || 0} total`}
            icon={<BankOutlined />}
            gradient="linear-gradient(135deg, #F59E0B 0%, #D97706 100%)"
            iconBg="rgba(255,255,255,0.2)"
            progress={activeRatio}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <GradStatCard
            title="Overdue EMIs"
            value={data?.overdueEMIs || '0'}
            subtitle="Need immediate attention"
            icon={<WarningOutlined />}
            gradient={data?.overdueEMIs
              ? 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)'
              : 'linear-gradient(135deg, #64748B 0%, #475569 100%)'}
            iconBg="rgba(255,255,255,0.2)"
          />
        </Col>
      </Row>

      {/* ─── Row 2: Secondary Stats ─── */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }} className="stagger-children">
        <Col xs={24} sm={12} lg={6}>
          <PlainStatCard
            title="Active Advisors"
            value={data?.totalAdvisors || 0}
            icon={<UserOutlined />}
            color="#6366F1"
            isDark={isDark}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <PlainStatCard
            title="Pending Loans"
            value={data?.pendingLoans || 0}
            subtitle="Awaiting approval"
            icon={<ClockCircleOutlined />}
            color="#F59E0B"
            isDark={isDark}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <PlainStatCard
            title="Monthly Collection"
            value={`₹${Number(data?.monthlyCollections?.amount || 0).toLocaleString('en-IN')}`}
            subtitle={`${data?.monthlyCollections?.count || 0} transactions`}
            icon={<RiseOutlined />}
            color="#10B981"
            isDark={isDark}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <PlainStatCard
            title="Total Disbursed"
            value={`₹${Number(data?.totalDisbursed || 0).toLocaleString('en-IN')}`}
            subtitle="All time"
            icon={<CreditCardOutlined />}
            color="#8B5CF6"
            isDark={isDark}
          />
        </Col>
      </Row>

      {/* ─── Row 3: Main Table + Quick Actions ─── */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        {/* Loan Portfolio Table */}
        <Col xs={24} lg={16}>
          <div style={{
            background: cardBg,
            border: `1px solid ${cardBorder}`,
            borderRadius: 18,
            overflow: 'hidden',
          }}>
            {/* Card header */}
            <div style={{
              padding: '18px 24px',
              borderBottom: `1px solid ${cardBorder}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div>
                <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 16, letterSpacing: '-0.02em' }}>
                  Loan Portfolio
                </div>
                <div style={{ fontSize: 12, opacity: 0.5, marginTop: 1 }}>
                  Breakdown by status
                </div>
              </div>
              <button
                onClick={() => router.push('/loans')}
                style={{
                  background: isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.08)',
                  border: 'none',
                  borderRadius: 8,
                  padding: '6px 14px',
                  color: '#6366F1',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  letterSpacing: '0.04em',
                }}
              >
                VIEW ALL →
              </button>
            </div>
            <div style={{ padding: '4px 0' }}>
              <Table
                dataSource={data?.loansByStatus || []}
                columns={loanStatusColumns}
                rowKey="status"
                pagination={false}
                size="middle"
                style={{ margin: 0 }}
                onRow={(r) => ({ onClick: () => router.push(`/loans?status=${r.status}`) })}
              />
            </div>
          </div>
        </Col>

        {/* Quick Actions + Alert Panel */}
        <Col xs={24} lg={8}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
            {/* Alert Card */}
            <div style={{
              background: data?.overdueEMIs
                ? 'linear-gradient(135deg, rgba(239,68,68,0.12) 0%, rgba(220,38,38,0.06) 100%)'
                : subtleBg,
              border: `1px solid ${data?.overdueEMIs ? 'rgba(239,68,68,0.25)' : cardBorder}`,
              borderRadius: 18,
              padding: 20,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12,
                  background: data?.overdueEMIs ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20,
                  color: data?.overdueEMIs ? '#EF4444' : '#10B981',
                }}>
                  {data?.overdueEMIs ? <WarningOutlined /> : <CheckCircleOutlined />}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, fontFamily: 'Outfit, sans-serif' }}>
                    {data?.overdueEMIs ? 'Action Required' : 'All Clear!'}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.6 }}>
                    {data?.overdueEMIs ? 'EMI collection pending' : 'No pending overdue EMIs'}
                  </div>
                </div>
              </div>
              {data?.overdueEMIs ? (
                <>
                  <div style={{ fontSize: 42, fontWeight: 900, fontFamily: 'Outfit, sans-serif', color: '#EF4444', lineHeight: 1 }}>
                    {data.overdueEMIs}
                  </div>
                  <div style={{ fontSize: 13, opacity: 0.6, marginTop: 4 }}>overdue EMIs need collection</div>
                  <button
                    onClick={() => router.push('/payments')}
                    style={{
                      marginTop: 14,
                      width: '100%',
                      background: 'linear-gradient(135deg, #EF4444, #DC2626)',
                      border: 'none',
                      borderRadius: 10,
                      padding: '10px 0',
                      color: 'white',
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: 'pointer',
                      letterSpacing: '0.04em',
                    }}
                  >
                    COLLECT NOW →
                  </button>
                </>
              ) : (
                <div style={{ fontSize: 13, opacity: 0.6 }}>Portfolio is healthy. Keep it up! 🎉</div>
              )}
            </div>

            {/* Quick Actions */}
            <div style={{
              background: cardBg,
              border: `1px solid ${cardBorder}`,
              borderRadius: 18,
              padding: 20,
              flex: 1,
            }}>
              <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 15, marginBottom: 14 }}>
                Quick Actions
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  { label: 'New Customer', icon: <TeamOutlined />, color: '#6366F1', href: '/customers' },
                  { label: 'New Loan', icon: <BankOutlined />, color: '#10B981', href: '/loans/create' },
                  { label: 'Collect EMI', icon: <DollarOutlined />, color: '#F59E0B', href: '/payments' },
                  { label: 'Add Voucher', icon: <FileProtectOutlined />, color: '#8B5CF6', href: '/vouchers' },
                ].map(a => (
                  <div
                    key={a.label}
                    className="quick-action"
                    onClick={() => router.push(a.href)}
                    style={{
                      borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                      background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
                      color: isDark ? '#F1F5F9' : '#0F172A',
                    }}
                  >
                    <div className="quick-action-icon" style={{ background: `${a.color}18`, color: a.color }}>
                      {a.icon}
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.02em' }}>{a.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Col>
      </Row>
    </div>
  );
}
