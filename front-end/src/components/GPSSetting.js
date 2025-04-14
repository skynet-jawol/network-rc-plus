import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Switch, InputNumber, Card, Select, Space, Divider, Alert, Tooltip, Typography, message } from 'antd';
import { SaveOutlined, ReloadOutlined, QuestionCircleOutlined, CompassOutlined, EnvironmentOutlined } from '@ant-design/icons';

const { Text } = Typography;

const { Option } = Select;

/**
 * GPS设置组件
 * 用于配置GPS设备参数
 */
export default function GPSSetting({ serverConfig, saveServerConfig }) {
  const [form] = Form.useForm();
  const [enabled, setEnabled] = useState(false);

  // 常用串口设备路径选项
  const deviceOptions = [
    { label: 'Raspberry Pi GPIO (默认)', value: '/dev/ttyAMA0' },
    { label: 'Raspberry Pi GPIO (新版)', value: '/dev/serial0' },
    { label: 'USB转串口适配器', value: '/dev/ttyUSB0' },
    { label: 'USB转串口适配器2', value: '/dev/ttyUSB1' },
    { label: 'Arduino', value: '/dev/ttyACM0' },
    { label: 'BN-880 GPS (USB)', value: '/dev/ttyUSB2' },
    { label: 'NEO-6M GPS (USB)', value: '/dev/ttyUSB3' },
  ];

  // 常用波特率选项
  const baudRateOptions = [
    { label: '4800 (标准NMEA)', value: 4800 },
    { label: '9600 (常用)', value: 9600 },
    { label: '19200', value: 19200 },
    { label: '38400', value: 38400 },
    { label: '57600', value: 57600 },
    { label: '115200 (高速)', value: 115200 },
  ];
  
  // NMEA消息类型选项
  const nmeaTypeOptions = [
    { label: 'GGA (位置和高度)', value: 'GGA' },
    { label: 'RMC (位置、速度和时间)', value: 'RMC' },
    { label: 'VTG (地面速度和航向)', value: 'VTG' },
    { label: 'GSA (卫星状态)', value: 'GSA' },
    { label: 'GSV (可见卫星)', value: 'GSV' },
  ];

  // 初始化表单数据
  useEffect(() => {
    const gpsConfig = serverConfig.gps || {};
    setEnabled(gpsConfig.enabled || false);
    
    form.setFieldsValue({
      devicePath: gpsConfig.devicePath || '/dev/ttyAMA0',
      baudRate: gpsConfig.baudRate || 9600,
      updateFrequency: gpsConfig.updateFrequency || 1000,
      nmeaTypes: gpsConfig.nmeaTypes || ['GGA', 'RMC', 'VTG'],
      autoReconnect: gpsConfig.autoReconnect !== false,
      enabled: gpsConfig.enabled || false
    });
  }, [serverConfig, form]);

  // 保存GPS配置
  const handleSave = () => {
    const values = form.getFieldsValue();
    saveServerConfig({
      gps: {
        ...values,
        enabled
      }
    });
    
    // 显示保存成功消息
    message.success('GPS设置已保存，重启服务后生效');
  };

  // 重置为默认配置
  const handleReset = () => {
    const defaultConfig = {
      devicePath: '/dev/ttyAMA0',
      baudRate: 9600,
      updateFrequency: 1000,
      nmeaTypes: ['GGA', 'RMC', 'VTG'],
      autoReconnect: true,
      enabled: false
    };
    
    setEnabled(defaultConfig.enabled);
    form.setFieldsValue(defaultConfig);
    saveServerConfig({ gps: defaultConfig });
    
    // 显示重置成功消息
    message.info('GPS设置已重置为默认值');
  };
  
  // 获取GPS状态信息
  const [gpsStatus, setGpsStatus] = useState(null);
  
  useEffect(() => {
    // 这里可以添加获取GPS状态的逻辑
    // 例如通过WebSocket或API获取当前GPS状态
    if (serverConfig.statusInfo && serverConfig.statusInfo.gps) {
      setGpsStatus(serverConfig.statusInfo.gps);
    }
  }, [serverConfig]);

  return (
    <Card 
      title={
        <span>
          <EnvironmentOutlined /> GPS设置
          <Tooltip title="GPS模块用于获取车辆的位置、速度和航向信息">
            <QuestionCircleOutlined style={{ marginLeft: 8 }} />
          </Tooltip>
        </span>
      } 
      extra={<Switch checked={enabled} onChange={setEnabled} />}
    >
      {gpsStatus && (
        <Alert
          message={
            <div>
              <Text strong>GPS状态: </Text>
              {gpsStatus.fix ? (
                <Text type="success">已定位 ({gpsStatus.satellites}颗卫星)</Text>
              ) : (
                <Text type="warning">未定位</Text>
              )}
              {gpsStatus.fix && (
                <>
                  <Divider type="vertical" />
                  <Text>
                    <EnvironmentOutlined /> {gpsStatus.lat.toFixed(6)}, {gpsStatus.lng.toFixed(6)}
                  </Text>
                  <Divider type="vertical" />
                  <Text>
                    <CompassOutlined /> {gpsStatus.speed.toFixed(1)} km/h, {gpsStatus.course.toFixed(1)}°
                  </Text>
                </>
              )}
            </div>
          }
          type={gpsStatus.fix ? "success" : "warning"}
          style={{ marginBottom: 16 }}
        />
      )}

      <Form
        form={form}
        layout="vertical"
        disabled={!enabled}
      >
        <Form.Item
          name="devicePath"
          label="GPS设备路径"
          rules={[{ required: true, message: '请输入GPS设备路径' }]}
          tooltip="GPS接收器连接的串口设备路径"
        >
          <Select
            placeholder="选择或输入设备路径"
            allowClear
            showSearch
          >
            {deviceOptions.map(option => (
              <Option key={option.value} value={option.value}>
                {option.label} ({option.value})
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="baudRate"
          label="波特率"
          rules={[{ required: true, message: '请选择波特率' }]}
          tooltip="GPS接收器的通信速率，通常为4800或9600"
        >
          <Select placeholder="选择波特率">
            {baudRateOptions.map(option => (
              <Option key={option.value} value={option.value}>
                {option.label}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="updateFrequency"
          label="位置更新频率 (毫秒)"
          rules={[{ required: true, message: '请输入更新频率' }]}
          tooltip="向前端发送GPS位置更新的频率"
        >
          <InputNumber
            min={100}
            max={10000}
            step={100}
            style={{ width: '100%' }}
          />
        </Form.Item>

        <Form.Item
          name="nmeaTypes"
          label="NMEA消息类型"
          tooltip="选择需要解析的NMEA消息类型"
        >
          <Select
            mode="multiple"
            placeholder="选择NMEA消息类型"
            style={{ width: '100%' }}
          >
            {nmeaTypeOptions.map(option => (
              <Option key={option.value} value={option.value}>
                {option.label}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="autoReconnect"
          valuePropName="checked"
          tooltip="GPS设备断开连接后是否自动重连"
        >
          <Switch checkedChildren="自动重连" unCheckedChildren="手动重连" />
        </Form.Item>

        <Divider />

        <Form.Item>
          <Space>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSave}
              disabled={!enabled}
            >
              保存设置
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleReset}
              disabled={!enabled}
            >
              恢复默认
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );