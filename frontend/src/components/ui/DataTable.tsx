'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Table, Input, Button, Space, message, Empty } from 'antd';
import { PlusOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { api } from '@/lib/api';

const { Search } = Input;

interface DataTableProps {
  title: string;
  endpoint: string;
  columns: any[];
  rowKey?: string;
  onAdd?: () => void;
  extraActions?: React.ReactNode;
  pageSize?: number;
}

export default function DataTable({
  title, endpoint, columns, rowKey = 'id',
  onAdd, extraActions, pageSize = 10,
}: DataTableProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(pageSize);
  const [search, setSearch] = useState('');
  const debounceRef = useRef<NodeJS.Timeout>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit };
      if (search) params.search = search;
      const res = await api.get(endpoint, { params });
      if (res.data.success) {
        setData(res.data.data || []);
        setTotal(res.data.pagination?.total ?? res.data.data?.length ?? 0);
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || `Failed to load ${title}`);
    } finally {
      setLoading(false);
    }
  }, [endpoint, page, limit, search, title]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const onSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(e.target.value);
      setPage(1);
    }, 400);
  };

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <Space wrap>
          <Search
            placeholder={`Search ${title.toLowerCase()}...`}
            allowClear
            onSearch={onSearch}
            onChange={onSearchChange}
            style={{ width: 260 }}
            prefix={<SearchOutlined style={{ color: '#94A3B8' }} />}
          />
          <Button icon={<ReloadOutlined />} onClick={fetchData} title="Refresh" />
        </Space>
        <Space wrap>
          {extraActions}
          {onAdd && (
            <Button type="primary" icon={<PlusOutlined />} onClick={onAdd}>
              Add {title}
            </Button>
          )}
        </Space>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        rowKey={rowKey}
        dataSource={data}
        loading={loading}
        pagination={{
          current: page,
          pageSize: limit,
          total,
          showSizeChanger: true,
          showTotal: (t, range) => `${range[0]}–${range[1]} of ${t}`,
          pageSizeOptions: ['10', '25', '50', '100'],
          size: 'default' as any,
        }}
        onChange={(p) => { setPage(p.current || 1); setLimit(p.pageSize || 10); }}
        scroll={{ x: 'max-content' }}
        size="middle"
        locale={{ emptyText: <Empty description={`No ${title.toLowerCase()} found`} /> }}
      />
    </div>
  );
}
