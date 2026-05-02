"use client";

import React, { useEffect, useState } from "react";
import {
  Card,
  Result,
  Spin,
  Tag,
  Button,
  Modal,
  Select,
  message,
  Table,
} from "antd";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import dayjs from "dayjs";

export default function GroupDetailsPage() {
  const { id } = useParams() as { id: string };
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);

  const fetchGroup = async () => {
    try {
      const res = await api.get(`/groups/${id}`);
      if (res.data.success) setData(res.data.data);
    } catch {
      message.error("Failed to load group");
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await api.get("/customers?isActive=true&limit=100");
      // filter out ones already in a group
      const free = res.data.data.filter((c: any) => !c.groupId);
      setCustomers(free);
    } catch {
      message.error("Failed to load customers");
    }
  };

  useEffect(() => {
    fetchGroup();
    fetchCustomers();
  }, [id]);

  const handleAddMembers = async () => {
    if (!selectedCustomers.length) return;
    try {
      await api.post(`/groups/${id}/members`, {
        customerIds: selectedCustomers,
      });
      message.success("Members added");
      setAdding(false);
      setSelectedCustomers([]);
      fetchGroup();
      fetchCustomers();
    } catch {
      message.error("Failed to add members");
    }
  };

  const handleRemove = async (customerId: string) => {
    try {
      await api.delete(`/groups/${id}/members/${customerId}`);
      message.success("Member removed");
      fetchGroup();
      fetchCustomers();
    } catch {
      message.error("Failed to remove member");
    }
  };

  if (loading)
    return (
      <Spin
        size="large"
        style={{ display: "grid", placeItems: "center", height: "50vh" }}
      />
    );
  if (!data) return <Result status="404" title="Group Not Found" />;

  const columns = [
    { title: "ID", dataIndex: "customerId", width: 120 },
    { title: "Name", dataIndex: "name", width: 200 },
    { title: "Phone", dataIndex: "phone", width: 150 },
    {
      title: "Action",
      key: "action",
      width: 100,
      render: (_: any, r: any) => (
        <Button danger size="small" onClick={() => handleRemove(r.id)}>
          Remove
        </Button>
      ),
    },
  ];

  return (
    <div
      className="animate-in"
      style={{ display: "flex", flexDirection: "column", gap: 24 }}
    >
      <div className="page-header">
        <h2 style={{ margin: 0 }}>Group: {data.name}</h2>
        <Tag color={data.isActive ? "green" : "red"}>
          {data.isActive ? "Active" : "Inactive"}
        </Tag>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 24 }}>
        <Card title="Group Overview" size="small">
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
          >
            <div>
              <span style={{ color: "#666" }}>Group ID:</span>{" "}
              <b>{data.groupId}</b>
            </div>
            <div>
              <span style={{ color: "#666" }}>Branch:</span>{" "}
              <b>{data.branch?.name}</b>
            </div>
            <div>
              <span style={{ color: "#666" }}>Created On:</span>{" "}
              <b>{dayjs(data.createdAt).format("DD MMM YYYY")}</b>
            </div>
            <div>
              <span style={{ color: "#666" }}>Members Count:</span>{" "}
              <b>{data.members?.length || 0}</b>
            </div>
          </div>
        </Card>

        <Card
          title="Members"
          size="small"
          extra={
            <Button type="primary" onClick={() => setAdding(true)}>
              Add Members
            </Button>
          }
        >
          <Table
            dataSource={data.members}
            rowKey="id"
            columns={columns}
            pagination={false}
            size="small"
          />
        </Card>
      </div>

      <Modal
        title="Add Group Members"
        open={adding}
        onCancel={() => setAdding(false)}
        onOk={handleAddMembers}
        okButtonProps={{ disabled: !selectedCustomers.length }}
      >
        <div style={{ marginTop: 16, marginBottom: 32 }}>
          <label style={{ display: "block", marginBottom: 8 }}>
            Select Customers to Add (Branch matched ideally)
          </label>
          <Select
            mode="multiple"
            style={{ width: "100%" }}
            placeholder="Select customers"
            value={selectedCustomers}
            onChange={setSelectedCustomers}
            options={customers.map((c) => ({
              label: `${c.name} (${c.customerId}) - ${c.phone}`,
              value: c.id,
            }))}
            filterOption={(input, option) =>
              (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
            }
          />
        </div>
      </Modal>
    </div>
  );
}
