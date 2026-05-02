"use client";

import React, { useState } from "react";
import { Tag, Button, Space, Form, Input } from "antd";
import { EditOutlined, TeamOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import DataTable from "@/components/ui/DataTable";
import FormModal from "@/components/ui/FormModal";

export default function GroupsPage() {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleEdit = (record: any) => {
    setEditRecord({ ...record });
    setModalOpen(true);
  };

  const columns = [
    { title: "ID", dataIndex: "groupId", width: 120 },
    { title: "Name", dataIndex: "name", sorter: true },
    { title: "Branch", dataIndex: ["branch", "name"], width: 130 },
    { title: "Members Count", dataIndex: ["_count", "members"], width: 130 },
    { title: "Leader", dataIndex: "leaderName", width: 130 },
    {
      title: "Status",
      dataIndex: "isActive",
      width: 90,
      render: (v: boolean) => (
        <Tag color={v ? "green" : "red"}>{v ? "Active" : "Inactive"}</Tag>
      ),
    },
    {
      title: "",
      key: "actions",
      width: 80,
      render: (_: any, r: any) => (
        <Space size="small">
          <Button
            type="text"
            size="small"
            icon={<TeamOutlined />}
            onClick={() => router.push(`/groups/${r.id}`)}
          />
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(r)}
          />
        </Space>
      ),
    },
  ];

  const formFields = (
    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
      <Form.Item name="name" label="Group Name" rules={[{ required: true }]}>
        <Input />
      </Form.Item>
      {/* leader Id can be managed individually from group members page later */}
    </div>
  );

  return (
    <div className="animate-in">
      <div className="page-header">
        <h2>Customer Groups (JLG)</h2>
      </div>
      <div key={refreshKey}>
        <DataTable
          title="Customer Group"
          endpoint="/groups"
          columns={columns}
          onAdd={() => {
            setEditRecord(null);
            setModalOpen(true);
          }}
        />
      </div>
      <FormModal
        title="Customer Group"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onSuccess={() => {
          setModalOpen(false);
          setRefreshKey((k) => k + 1);
        }}
        endpoint="/groups"
        initialValues={editRecord}
        width={500}
      >
        {formFields}
      </FormModal>
    </div>
  );
}
