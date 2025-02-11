import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Progress, Alert, Typography, Statistic } from 'antd';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ClockCircleOutlined, DashboardOutlined } from '@ant-design/icons';

const { Title } = Typography;

const Performance = () => {
  const [metrics, setMetrics] = useState({
    cpu: 0,
    memory: 0,
    storage: 0,
    uptime: 0,
    responseTime: 0
  });

  const [alerts, setAlerts] = useState([]);
  const [historicalData, setHistoricalData] = useState([]);
  const [ws, setWs] = useState(null);

  useEffect(() => {
    // 初始化WebSocket连接
    const websocket = new WebSocket(`ws://${window.location.host}/api/performance/ws`);

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'metrics') {
        setMetrics(data.data);
        
        // 更新历史数据
        setHistoricalData(prev => {
          const newData = [...prev, { ...data.data, time: new Date().toLocaleTimeString() }];
          return newData.slice(-20); // 保留最近20个数据点
        });

        // 检查告警条件
        checkAlerts(data.data);
      }
    };

    websocket.onerror = (error) => {
      console.error('WebSocket连接错误:', error);
      setAlerts(prev => [...prev, {
        type: 'error',
        message: 'WebSocket连接失败',
        time: new Date().toLocaleTimeString()
      }]);
    };

    setWs(websocket);

    return () => {
      websocket.close();
    };
  }, []);

  const [thresholds, setThresholds] = useState({
    cpu: 80,
    memory: 85,
    storage: 90,
    responseTime: 1000
  });

  const [showConfig, setShowConfig] = useState(false);

  useEffect(() => {
    // 获取当前配置
    fetch('/api/performance/config')
      .then(res => res.json())
      .then(data => {
        setThresholds(data.thresholds);
      })
      .catch(error => {
        console.error('获取性能监控配置失败:', error);
      });
  }, []);

  const updateConfig = (newThresholds) => {
    fetch('/api/performance/config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ thresholds: newThresholds })
    })
      .then(res => res.json())
      .then(data => {
        setThresholds(newThresholds);
        setAlerts(prev => [{
          type: 'success',
          message: '性能监控配置更新成功',
          time: new Date().toLocaleTimeString()
        }, ...prev]);
      })
      .catch(error => {
        console.error('更新性能监控配置失败:', error);
        setAlerts(prev => [{
          type: 'error',
          message: '更新性能监控配置失败',
          time: new Date().toLocaleTimeString()
        }, ...prev]);
      });
  };

  const checkAlerts = (data) => {
    const newAlerts = [];
    if (data.cpu > thresholds.cpu) {
      newAlerts.push({
        type: 'warning',
        message: `CPU使用率过高: ${data.cpu.toFixed(1)}% (阈值: ${thresholds.cpu}%)`,
        time: new Date().toLocaleTimeString()
      });
    }
    if (data.memory > thresholds.memory) {
      newAlerts.push({
        type: 'warning',
        message: `内存使用率过高: ${data.memory.toFixed(1)}% (阈值: ${thresholds.memory}%)`,
        time: new Date().toLocaleTimeString()
      });
    }
    if (data.storage > thresholds.storage) {
      newAlerts.push({
        type: 'warning',
        message: `存储空间使用率过高: ${data.storage.toFixed(1)}% (阈值: ${thresholds.storage}%)`,
        time: new Date().toLocaleTimeString()
      });
    }
    if (data.responseTime > thresholds.responseTime) {
      newAlerts.push({
        type: 'warning',
        message: `系统响应时间过长: ${data.responseTime}ms (阈值: ${thresholds.responseTime}ms)`,
        time: new Date().toLocaleTimeString()
      });
    }

    if (newAlerts.length > 0) {
      setAlerts(prev => [...newAlerts, ...prev].slice(0, 10)); // 保留最近10条告警
    }
  };

  const formatUptime = (seconds) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}天 ${hours}小时 ${minutes}分钟`;
  };

  return (
    <div style={{ padding: '20px' }}>
      <Title level={3}>系统性能监控</Title>
      
      <Row gutter={[16, 16]}>
        <Col span={6}>
          <Card>
            <Statistic
              title="系统运行时间"
              value={formatUptime(metrics.uptime)}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="系统响应时间"
              value={metrics.responseTime}
              suffix="ms"
              prefix={<DashboardOutlined />}
              valueStyle={{ color: metrics.responseTime > 1000 ? '#cf1322' : '#3f8600' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: '20px' }}>
        <Col span={8}>
          <Card title="CPU使用率">
            <Progress
              type="dashboard"
              percent={parseFloat(metrics.cpu.toFixed(1))}
              status={metrics.cpu > 80 ? 'exception' : 'normal'}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card title="内存使用率">
            <Progress
              type="dashboard"
              percent={parseFloat(metrics.memory.toFixed(1))}
              status={metrics.memory > 85 ? 'exception' : 'normal'}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card title="存储空间使用率">
            <Progress
              type="dashboard"
              percent={parseFloat(metrics.storage.toFixed(1))}
              status={metrics.storage > 90 ? 'exception' : 'normal'}
            />
          </Card>
        </Col>
      </Row>

      <Row style={{ marginTop: '20px' }}>
        <Col span={24}>
          <Card title="性能趋势">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={historicalData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="cpu" stroke="#ff4d4f" name="CPU使用率" />
                <Line type="monotone" dataKey="memory" stroke="#1890ff" name="内存使用率" />
                <Line type="monotone" dataKey="storage" stroke="#52c41a" name="存储使用率" />
                <Line type="monotone" dataKey="responseTime" stroke="#722ed1" name="响应时间" />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {alerts.length > 0 && (
        <Row style={{ marginTop: '20px' }}>
          <Col span={24}>
            <Card title="系统告警">
              {alerts.map((alert, index) => (
                <Alert
                  key={index}
                  message={`${alert.time} - ${alert.message}`}
                  type={alert.type}
                  showIcon
                  style={{ marginBottom: '10px' }}
                />
              ))}
            </Card>
          </Col>
        </Row>
      )}
    </div>
  );
};

export default Performance;