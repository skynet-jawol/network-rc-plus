import React, { useState, useEffect } from 'react';
import { Table, Form, Input, Select, DatePicker, Space, Button, Card } from 'antd';
import moment from 'moment';

const { RangePicker } = DatePicker;
const { Option } = Select;

const LogViewer = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0
  });
  const [filters, setFilters] = useState({
    timeRange: null,
    modules: [],
    levels: [],
    keyword: '',
    fields: ['message']
  });

  const columns = [
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (text) => moment(text).format('YYYY-MM-DD HH:mm:ss')
    },
    {
      title: '级别',
      dataIndex: 'level',
      key: 'level',
      width: 100,
      render: (text) => (
        <Tag color={getLevelColor(text)}>{text.toUpperCase()}</Tag>
      )
    },
    {
      title: '模块',
      dataIndex: 'module',
      key: 'module',
      width: 120
    },
    {
      title: '事件',
      dataIndex: 'event',
      key: 'event',
      width: 120
    },
    {
      title: '内容',
      dataIndex: 'message',
      key: 'message',
      render: (text, record) => (
        <div>
          <div>{text}</div>
          {record.data && (
            <div className="log-data">
              <pre>{JSON.stringify(record.data, null, 2)}</pre>
            </div>
          )}
        </div>
      )
    }
  ];

  const getLevelColor = (level) => {
    const colors = {
      fatal: '#cf1322',
      error: '#f5222d',
      warn: '#faad14',
      info: '#52c41a',
      debug: '#1890ff',
      trace: '#8c8c8c'
    };
    return colors[level] || '#8c8c8c';
  };

  const fetchLogs = async (params = {}) => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        limit: params.pageSize || pagination.pageSize,
        offset: ((params.current || pagination.current) - 1) * (params.pageSize || pagination.pageSize),
        ...filters
      });

      if (filters.timeRange) {
        queryParams.set('startTime', filters.timeRange[0].toISOString());
        queryParams.set('endTime', filters.timeRange[1].toISOString());
      }

      const response = await fetch(`/api/logs/query?${queryParams}`);
      const result = await response.json();

      if (result.success) {
        setLogs(result.data.logs);
        setPagination({
          ...pagination,
          total: result.data.total
        });
      } else {
        message.error(result.error || '获取日志失败');
      }
    } catch (error) {
      console.error('获取日志失败:', error);
      message.error('获取日志失败');
    } finally {
      setLoading(false);
    }
  };

  const handleTableChange = (pagination, filters, sorter) => {
    fetchLogs(pagination);
  };

  const handleSearch = () => {
    setPagination({ ...pagination, current: 1 });
    fetchLogs({ current: 1 });
  };

  const handleReset = () => {
    setFilters({
      timeRange: null,
      modules: [],
      levels: [],
      keyword: '',
      fields: ['message']
    });
    setPagination({ ...pagination, current: 1 });
    fetchLogs({ current: 1 });
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <Card title="系统日志" className="log-viewer">
      <Form layout="inline" className="log-filter">
        <Form.Item label="时间范围">
          <RangePicker
            showTime
            value={filters.timeRange}
            onChange={(dates) => setFilters({ ...filters, timeRange: dates })}
          />
        </Form.Item>

        <Form.Item label="模块">
          <Select
            mode="multiple"
            value={filters.modules}
            onChange={(values) => setFilters({ ...filters, modules: values })}
            style={{ width: 200 }}
          >
            {Object.keys(config.modules).map(key => (
              <Option key={key} value={key}>{config.modules[key].name}</Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item label="日志级别">
          <Select
            mode="multiple"
            value={filters.levels}
            onChange={(values) => setFilters({ ...filters, levels: values })}
            style={{ width: 200 }}
          >
            {Object.keys(config.levels).map(level => (
              <Option key={level} value={level}>{level.toUpperCase()}</Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item label="关键字">
          <Input
            value={filters.keyword}
            onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
            placeholder="搜索日志内容"
          />
        </Form.Item>

        <Form.Item>
          <Space>
            <Button type="primary" onClick={handleSearch}>搜索</Button>
            <Button onClick={handleReset}>重置</Button>
          </Space>
        </Form.Item>
      </Form>

      <Table
        columns={columns}
        dataSource={logs}
        rowKey="id"
        pagination={pagination}
        loading={loading}
        onChange={handleTableChange}
        className="log-table"
      />
    </Card>
  );
};

export default LogViewer;