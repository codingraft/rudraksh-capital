'use client';

import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, Typography, Dropdown, Avatar, theme, Badge, Tooltip } from 'antd';
import {
  DashboardOutlined, TeamOutlined, UserOutlined, BankOutlined,
  DollarOutlined, FileTextOutlined, SettingOutlined,
  LogoutOutlined, SunOutlined, MoonOutlined, BellOutlined,
  MenuFoldOutlined, MenuUnfoldOutlined, SearchOutlined,
  SafetyOutlined, BarChartOutlined, WalletOutlined,
  BookOutlined, AuditOutlined, FundOutlined,
} from '@ant-design/icons';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import GlobalSearch from '../ui/GlobalSearch';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const NAV_GROUPS = [
  {
    label: 'Main',
    items: [
      { key: '/', icon: <DashboardOutlined />, label: 'Dashboard' },
    ],
  },
  {
    label: 'Management',
    items: [
      { key: '/customers', icon: <TeamOutlined />, label: 'Customers' },
      { key: '/advisors', icon: <UserOutlined />, label: 'Advisors' },
      { key: '/loans', icon: <BankOutlined />, label: 'Loans' },
      { key: '/payments', icon: <DollarOutlined />, label: 'Payments' },
    ],
  },
  {
    label: 'Finance',
    items: [
      { key: '/vouchers', icon: <FileTextOutlined />, label: 'Vouchers' },
      { key: '/accounts', icon: <WalletOutlined />, label: 'Accounts' },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { key: '/reports', icon: <BarChartOutlined />, label: 'Reports' },
    ],
  },
  {
    label: 'System',
    items: [
      { key: '/masters', icon: <SettingOutlined />, label: 'Masters' },
    ],
  },
];

// Flat for Menu component
const ALL_ITEMS = NAV_GROUPS.flatMap(g => g.items);

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  const { user, logout, isAuthenticated } = useAuthStore();
  const { mode, toggle } = useThemeStore();
  const router = useRouter();
  const pathname = usePathname();
  const { token: { colorBgLayout, colorBorder, colorText } } = theme.useToken();

  const isDark = mode === 'dark';
  const selectedKey = pathname === '/' ? '/' : `/${pathname.split('/')[1]}`;

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => {
      const isMobile = window.innerWidth < 768;
      setMobile(isMobile);
      if (isMobile) setCollapsed(true);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (mounted && !isAuthenticated) router.push('/login');
  }, [isAuthenticated, mounted, router]);

  if (!mounted || !isAuthenticated) return null;

  const currentPage = ALL_ITEMS.find(i => i.key === selectedKey)?.label || 'Dashboard';

  const userMenuItems = [
    {
      key: 'info',
      label: (
        <div style={{ padding: '4px 0' }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{user?.name}</div>
          <div style={{ fontSize: 12, opacity: 0.6, marginTop: 2 }}>{user?.role?.replace('_', ' ')}</div>
        </div>
      ),
      disabled: true,
    },
    { type: 'divider' as const },
    {
      key: 'logout',
      label: 'Sign Out',
      icon: <LogoutOutlined />,
      danger: true,
      onClick: () => { logout(); router.push('/login'); },
    },
  ];

  // Sidebar bg
  const siderBg = isDark ? '#0B0F1A' : '#FFFFFF';
  const headerBg = isDark ? 'rgba(11,15,26,0.9)' : 'rgba(255,255,255,0.88)';

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* ─── SIDEBAR ─── */}
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        collapsedWidth={mobile ? 0 : 72}
        width={240}
        style={{
          background: siderBg,
          borderRight: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'}`,
          position: mobile ? 'fixed' : 'sticky',
          top: 0,
          height: '100vh',
          overflow: 'auto',
          zIndex: 200,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: isDark ? '2px 0 20px rgba(0,0,0,0.4)' : '2px 0 16px rgba(0,0,0,0.06)',
        }}
      >
        {/* Brand */}
        <div className="sidebar-brand">
          <div className="brand-logo">RC</div>
          {!collapsed && (
            <div className="brand-text">
              <div className="brand-name">RUDRAKSH</div>
              <div className="brand-sub" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>Capital</div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div style={{ padding: '4px 0', overflowX: 'hidden' }}>
          {NAV_GROUPS.map(group => (
            <div key={group.label}>
              {!collapsed && (
                <div
                  className="nav-group-label"
                  style={{ color: isDark ? '#94A3B8' : '#64748B' }}
                >
                  {group.label}
                </div>
              )}
              <Menu
                mode="inline"
                selectedKeys={[selectedKey]}
                items={group.items.map(item => ({
                  ...item,
                  label: collapsed ? (
                    <Tooltip title={item.label} placement="right">
                      <span>{item.label}</span>
                    </Tooltip>
                  ) : item.label,
                }))}
                onClick={({ key }) => { router.push(key); if (mobile) setCollapsed(true); }}
                style={{
                  border: 'none',
                  background: 'transparent',
                }}
                inlineIndent={12}
              />
            </div>
          ))}
        </div>

        {/* User Info at bottom */}
        {!collapsed && (
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '12px 16px',
            borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
            background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Avatar
                size={32}
                style={{
                  background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                  fontWeight: 700,
                  fontSize: 13,
                  flexShrink: 0,
                }}
              >
                {user?.name?.charAt(0)?.toUpperCase()}
              </Avatar>
              <div style={{ overflow: 'hidden', flex: 1, color: colorText, lineHeight: 'normal' }}>
                <div style={{
                  fontSize: 13,
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  marginBottom: 2
                }}>
                  {user?.name}
                </div>
                <div style={{ fontSize: 11, opacity: 0.6 }}>{user?.branch?.name || 'Admin'}</div>
              </div>
            </div>
          </div>
        )}
      </Sider>

      {/* Mobile overlay */}
      {mobile && !collapsed && (
        <div
          onClick={() => setCollapsed(true)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.55)',
            zIndex: 199,
            backdropFilter: 'blur(4px)',
          }}
        />
      )}

      {/* ─── MAIN AREA ─── */}
      <Layout style={{ background: colorBgLayout }}>
        <Header
          className="app-header"
          style={{
            padding: '0 24px',
            height: 64,
            background: headerBg,
            borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'sticky',
            top: 0,
            zIndex: 100,
          }}
        >
          {/* Left: Toggle + Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ fontSize: 18, width: 40, height: 40, borderRadius: 10 }}
            />
            {!mobile && (
              <div style={{ color: colorText, lineHeight: 'normal' }}>
                <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.02em', marginBottom: 2 }}>
                  {currentPage}
                </div>
                <div style={{ fontSize: 11, opacity: 0.6 }}>
                  Rudraksh Capital Management
                </div>
              </div>
            )}
          </div>
          
          {/* Middle: Global Search */}
          {!mobile && (
            <div style={{ flex: 1, maxWidth: 400, margin: '0 40px' }}>
              <GlobalSearch />
            </div>
          )}

          {/* Right: Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {/* Theme Toggle */}
            <Tooltip title={isDark ? 'Light Mode' : 'Dark Mode'}>
              <Button
                type="text"
                icon={isDark
                  ? <SunOutlined style={{ color: '#FBBF24', fontSize: 16 }} />
                  : <MoonOutlined style={{ fontSize: 16 }} />
                }
                onClick={toggle}
                style={{ width: 40, height: 40, borderRadius: 10 }}
              />
            </Tooltip>

            {/* Notifications */}
            <Badge dot offset={[-4, 4]} color="#EF4444">
              <Button
                type="text"
                icon={<BellOutlined style={{ fontSize: 16 }} />}
                style={{ width: 40, height: 40, borderRadius: 10 }}
              />
            </Badge>

            {/* User Menu */}
            <Dropdown menu={{ items: userMenuItems }} trigger={['click']} placement="bottomRight">
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '6px 10px',
                borderRadius: 12,
                cursor: 'pointer',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'}`,
                background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                transition: 'all 0.2s ease',
                marginLeft: 4,
              }}>
                <Avatar
                  size={30}
                  style={{
                    background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                    fontWeight: 700,
                    fontSize: 13,
                  }}
                >
                  {user?.name?.charAt(0)?.toUpperCase()}
                </Avatar>
                {!mobile && (
                  <div style={{ lineHeight: 'normal', color: colorText }}>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{user?.name}</div>
                    <div style={{ fontSize: 10, opacity: 0.6 }}>{user?.role?.replace('_', ' ')}</div>
                  </div>
                )}
              </div>
            </Dropdown>
          </div>
        </Header>

        <Content
          style={{
            margin: mobile ? '12px 10px' : '20px 24px',
            padding: 0,
            minHeight: 280,
          }}
        >
          <div className="animate-in">{children}</div>
        </Content>
      </Layout>
    </Layout>
  );
}
