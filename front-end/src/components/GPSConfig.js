import React, { useState, useEffect } from 'react';
import { Form, Input, Select, InputNumber, Button, message } from 'antd';
import { SaveOutlined } from '@ant-design/icons';

const { Option } = Select;

const GPSConfig = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // 加载当前GPS配置
    fetchGPSConfig();
  }, []);

  const fetchGPSConfig = async () => {
    try {
      const response = await fetch('/api/gps/config');
      const config = await response.json();
      form.setFieldsValue(config);
    } catch (error) {
      message.error('加载GPS配置失败');
    }
  };

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const response = await fetch('/api/gps/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      if (response.ok) {
        message.success('GPS配置已更新');
      } else {
        throw new Error('更新失败');
      }
    } catch (error) {
      message.error('保存GPS配置失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="gps-config">
      <h2>GPS配置</h2>
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{
          port: '/dev/ttyUSB0',
          baudRate: 9600,
          updateInterval: 1000,
          dataFormat: 'NMEA',
        }}
      >
        <Form.Item
          label="串口设备"
          name="port"
          rules={[{ required: true, message: '请输入串口设备路径' }]}
        >
          <Input placeholder="例如：/dev/ttyUSB0" />
        </Form.Item>

        <Form.Item
          label="波特率"
          name="baudRate"
          rules={[{ required: true, message: '请选择波特率' }]}
        >
          <Select>
            <Option value={4800}>4800</Option>
            <Option value={9600}>9600</Option>
            <Option value={19200}>19200</Option>
            <Option value={38400}>38400</Option>
            <Option value={57600}>57600</Option>
            <Option value={115200}>115200</Option>
          </Select>
        </Form.Item>

        <Form.Item
          label="数据格式"
          name="dataFormat"
          rules={[{ required: true, message: '请选择数据格式' }]}
        >
          <Select>
            <Option value="NMEA">NMEA</Option>
            <Option value="UBX">UBX</Option>
          </Select>
        </Form.Item>

        <Form.Item
          label="更新频率 (毫秒)"
          name="updateInterval"
          rules={[{ required: true, message: '请输入更新频率' }]}
        >
          <InputNumber min={100} max={10000} step={100} />
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={loading}
            htmlType="submit"
          >
            保存配置
          </Button>
        </Form.Item>
      </Form>

      <style jsx>{`
        .gps-config {
          padding: 20px;
          background: #fff;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        h2 {
          margin-bottom: 24px;
        }
      `}</style>
    </div>
  );
};

export default GPSConfig;