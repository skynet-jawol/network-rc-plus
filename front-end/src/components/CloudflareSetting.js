import React, { useState, useEffect } from "react";
import { Form, Input, Button, Switch, Space, Typography, Card, Alert, Upload } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { layout, tailLayout } from "../unit";

const { Title, Paragraph, Text } = Typography;

/**
 * Cloudflare Zero Trust Tunnels配置组件
 * 允许用户配置Cloudflare隧道设置
 */
export default function CloudflareSetting({ saveServerConfig, serverConfig }) {
  const [configFileUploaded, setConfigFileUploaded] = useState(false);
  const [form] = Form.useForm();
  
  // 当serverConfig变化时更新表单
  useEffect(() => {
    form.setFieldsValue({
      tunnelName: serverConfig.tunnelName,
      useCloudflare: serverConfig.useCloudflare,
      cloudflareConfigPath: serverConfig.cloudflareConfigPath,
      useCustomConfig: serverConfig.useCustomConfig
    });
  }, [serverConfig, form]);

  // 处理表单提交
  const onFinish = (values) => {
    saveServerConfig(values);
  };

  // 处理配置文件上传
  const handleUpload = (info) => {
    if (info.file.status === 'done') {
      setConfigFileUploaded(true);
      form.setFieldsValue({
        cloudflareConfigPath: info.file.response.path
      });
    }
  };

  return (
    <div className="cloudflare-setting">
      <Typography>
        <Title level={4}>Cloudflare Zero Trust Tunnels 配置</Title>
        <Paragraph>
          Cloudflare Zero Trust Tunnels 可以帮助您安全地将设备暴露在互联网上，无需公网IP或端口转发。
        </Paragraph>
      </Typography>

      <Card style={{ marginBottom: 16 }}>
        <Alert
          message="使用说明"
          description={
            <>
              <p>1. 启用Cloudflare隧道后，系统将自动创建一个临时隧道，无需Cloudflare账户</p>
              <p>2. 如需使用自定义配置文件，请先在Cloudflare控制台创建隧道并下载配置文件</p>
              <p>3. 配置更改后需要重启服务才能生效</p>
            </>
          }
          type="info"
          showIcon
        />
      </Card>

      <Form
        {...layout}
        form={form}
        name="cloudflare-setting"
        onFinish={onFinish}
        initialValues={{
          useCloudflare: serverConfig.useCloudflare || false,
          tunnelName: serverConfig.tunnelName || '',
          useCustomConfig: serverConfig.useCustomConfig || false,
          cloudflareConfigPath: serverConfig.cloudflareConfigPath || ''
        }}
      >
        <Form.Item
          name="useCloudflare"
          label="启用Cloudflare隧道"
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>

        <Form.Item
          noStyle
          shouldUpdate={(prevValues, currentValues) => prevValues.useCloudflare !== currentValues.useCloudflare}
        >
          {({ getFieldValue }) => {
            const useCloudflare = getFieldValue('useCloudflare');
            
            return useCloudflare ? (
              <>
                <Form.Item
                  name="tunnelName"
                  label="隧道名称"
                  tooltip="自定义隧道名称，留空则使用随机名称"
                >
                  <Input placeholder="输入隧道名称或留空使用随机名称" />
                </Form.Item>

                <Form.Item
                  name="useCustomConfig"
                  label="使用自定义配置"
                  valuePropName="checked"
                  tooltip="使用Cloudflare控制台创建的隧道配置文件"
                >
                  <Switch />
                </Form.Item>

                <Form.Item
                  noStyle
                  shouldUpdate={(prevValues, currentValues) => 
                    prevValues.useCustomConfig !== currentValues.useCustomConfig
                  }
                >
                  {({ getFieldValue }) => {
                    const useCustomConfig = getFieldValue('useCustomConfig');
                    
                    return useCustomConfig ? (
                      <Form.Item
                        name="cloudflareConfigPath"
                        label="配置文件路径"
                        tooltip="Cloudflare隧道配置文件的完整路径"
                        rules={[{ required: true, message: '请输入配置文件路径!' }]}
                      >
                        <Input placeholder="/home/pi/cloudflared-config.yml" />
                      </Form.Item>
                    ) : null;
                  }}
                </Form.Item>
              </>
            ) : null;
          }}
        </Form.Item>

        <Form.Item {...tailLayout}>
          <Button type="primary" htmlType="submit">
            保存配置
          </Button>
        </Form.Item>
      </Form>

      <Card title="当前状态" style={{ marginTop: 16 }}>
        <div>
          <Text strong>隧道状态: </Text>
          <Text type={serverConfig.cloudflareUrl ? "success" : "secondary"}>
            {serverConfig.cloudflareUrl ? "已连接" : "未连接"}
          </Text>
        </div>
        {serverConfig.cloudflareUrl && (
          <div style={{ marginTop: 8 }}>
            <Text strong>访问地址: </Text>
            <a href={serverConfig.cloudflareUrl} target="_blank" rel="noopener noreferrer">
              {serverConfig.cloudflareUrl}
            </a>
          </div>
        )}
      </Card>
    </div>
  );
}