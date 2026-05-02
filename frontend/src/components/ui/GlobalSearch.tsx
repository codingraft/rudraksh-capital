'use client';

import React, { useState, useEffect } from 'react';
import { Input, Modal, List, Tag, Typography, Empty, Spin } from 'antd';
import { SearchOutlined, UserOutlined, TeamOutlined, BankOutlined, DollarOutlined } from '@ant-design/icons';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';

const { Text } = Typography;

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Shortcut key (Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSearch = async (val: string) => {
    setQuery(val);
    if (val.length < 3) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      // Search across multiple endpoints (simplified for now)
      const [cus, adv, lon] = await Promise.all([
        api.get('/customers', { params: { search: val, limit: 5 } }),
        api.get('/advisors', { params: { search: val, limit: 5 } }),
        api.get('/loans', { params: { search: val, limit: 5 } }),
      ]);

      const formattedResults = [
        ...(cus.data.data || []).map((i: any) => ({ ...i, type: 'Customer', icon: <TeamOutlined />, link: `/customers/${i.id}` })),
        ...(adv.data.data || []).map((i: any) => ({ ...i, type: 'Advisor', icon: <UserOutlined />, link: `/advisors/${i.id}` })),
        ...(lon.data.data || []).map((i: any) => ({ ...i, type: 'Loan', icon: <BankOutlined />, link: `/loans/${i.id}` })),
      ];

      setResults(formattedResults);
    } catch { }
    setLoading(false);
  };

  const onSelect = (item: any) => {
    setOpen(false);
    setQuery('');
    setResults([]);
    router.push(item.link);
  };

  return (
    <>
      <div className="search-trigger" onClick={() => setOpen(true)}>
        <SearchOutlined />
        <span>Search anything... (Ctrl + K)</span>
      </div>

      <Modal
        title={null}
        footer={null}
        open={open}
        onCancel={() => setOpen(false)}
        width={600}
        styles={{ body: { padding: 0 } }}
        closable={false}
      >
        <div style={{ padding: '20px', borderBottom: '1px solid #f0f0f0' }}>
          <Input
            autoFocus
            prefix={<SearchOutlined style={{ color: '#999' }} />}
            placeholder="Type at least 3 characters to search..."
            variant="borderless"
            style={{ fontSize: '18px' }}
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        <div style={{ maxHeight: '400px', overflowY: 'auto', padding: '10px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}><Spin size="large" /></div>
          ) : results.length > 0 ? (
            <List
              dataSource={results}
              renderItem={(item) => (
                <List.Item
                  className="search-item"
                  onClick={() => onSelect(item)}
                  style={{ cursor: 'pointer', padding: '12px', borderRadius: '8px', border: 'none' }}
                >
                  <List.Item.Meta
                    avatar={<div style={{ width: '40px', height: '40px', background: '#f5f5f5', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', color: '#6366F1' }}>{item.icon}</div>}
                    title={<div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text strong>{item.name || item.loanNo}</Text>
                      <Tag color={item.type === 'Customer' ? 'blue' : item.type === 'Advisor' ? 'orange' : 'green'}>{item.type}</Tag>
                    </div>}
                    description={item.phone || item.customerId || item.customer?.name}
                  />
                </List.Item>
              )}
            />
          ) : query.length >= 3 ? (
            <Empty description="No results found" />
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
              Search for Customers, Advisors, or Loans
            </div>
          )}
        </div>
        <div style={{ padding: '12px', background: '#fafafa', borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px', fontSize: '12px', color: '#999', textAlign: 'right' }}>
          Press <Tag size="small">Esc</Tag> to close
        </div>
      </Modal>

      <style jsx global>{`
        .search-trigger {
          display: flex;
          align-items: center;
          gap: 10px;
          background: var(--bg-secondary);
          padding: 8px 16px;
          border-radius: 8px;
          cursor: pointer;
          color: var(--text-secondary);
          transition: all 0.2s;
          border: 1px solid var(--border-color);
          min-width: 250px;
        }
        .search-trigger:hover {
          border-color: #6366F1;
          color: #6366F1;
        }
        .search-item:hover {
          background: #f5f7ff !important;
        }
      `}</style>
    </>
  );
}
