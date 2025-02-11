import store from "store";
import React, { useEffect } from "react";
import {
  Form,
  Button,
  Input,
  Switch,
  Space,
  Select,
  Row,
  InputNumber,
  Divider,
  Card,
  Collapse,
  Slider,
  Radio,
} from "antd";
import {
  MinusCircleOutlined,
  PlusOutlined,
  PlusCircleOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { uuid } from "uuidv4";

const { Option } = Select;
const { Panel } = Collapse;

const pins = [];
for (let index = 0; index < 27; index++) {
  pins.push(index + 1);
}

const types = [
  { label: "PWM", value: "pwm" },
  { label: "电平", value: "switch" },
];

const gamePadInputList = [];
for (let index = 0; index < 8; index++) {
  gamePadInputList.push({ value: `axis-${index}`, name: `AXIS ${index}` });
}
for (let index = 0; index < 28; index++) {
  gamePadInputList.push({ value: `button-${index}`, name: `B${index}` });
}

export default function ChannelSetting({
  saveServerConfig,
  serverConfig,
  resetChannel,
}) {
  const [form] = Form.useForm();

  useEffect(() => {
    form.resetFields();
  }, [serverConfig, form]);

  const ui = (index, fields, { add, remove }) => {
    return (
      <Space align="baseline" split={<Divider type="vertical" />} wrap>
        {fields.map((field) => {
          const uiId = form.getFieldValue([
            "channelList",
            index,
            "ui",
            field.name,
            "id",
          ]);
          const uiComponent = serverConfig.uiComponentList.find(
            (i) => i.id === uiId
          );
          return (
            <Space key={field.key} align="baseline">
              <Form.Item
                label="UI"
                {...field}
                name={[field.name, "id"]}
                fieldKey={[field.fieldKey, "id"]}
                rules={[{ required: true, message: "客官！选一个！" }]}
              >
                <Select style={{ width: 80 }}>
                  {serverConfig.uiComponentList.map(({ id, name }) => (
                    <Option value={id}> {name} </Option>
                  ))}
                </Select>
              </Form.Item>
              {uiComponent && uiComponent.type === "joystick" && (
                <Form.Item
                  label="轴"
                  {...field}
                  name={[field.name, "axis"]}
                  fieldKey={[field.fieldKey, "axis"]}
                  rules={[{ required: true, message: "客官！选一个！" }]}
                >
                  <Select style={{ width: 80 }}>
                    <Option value="x">x</Option>
                    <Option value="y">y</Option>
                  </Select>
                </Form.Item>
              )}
              <Form.Item
                label="控制方向"
                {...field}
                name={[field.name, "positive"]}
                fieldKey={[field.fieldKey, "positive"]}
                valuePropName="checked"
              >
                <Switch checkedChildren="正向" unCheckedChildren="反向" />
              </Form.Item>
              <Form.Item
                label="控制方式"
                {...field}
                name={[field.name, "method"]}
                fieldKey={[field.fieldKey, "method"]}
              >
                <Select style={{ width: 80 }}>
                  <Option value="default">默认</Option>
                  <Option value="step">步进</Option>
                </Select>
              </Form.Item>
              <Form.Item
                label="步进速度"
                {...field}
                name={[field.name, "speed"]}
                fieldKey={[field.fieldKey, "speed"]}
                initialValue={0.5}
              >
                <InputNumber
                  step={0.1}
                  min={0}
                  disabled={
                    "step" !==
                    form.getFieldValue([
                      "channelList",
                      index,
                      "ui",
                      field.name,
                      "method",
                    ])
                  }
                />
              </Form.Item>
              <MinusCircleOutlined onClick={() => remove(field.name)} />
            </Space>
          );
        })}
        <PlusCircleOutlined
          onClick={() =>
            add({
              positive: true,
              method: "default",
            })
          }
        />
      </Space>
    );
  };

  const keyboard = (index, fields, { add, remove }) => {
    const type = form.getFieldValue(["channelList", index, "type"]);
    return (
      <Space align="baseline" direction="vertical">
        {fields.map((field) => {
          const method = form.getFieldValue([
            "channelList",
            index,
            "keyboard",
            field.name,
            "method",
          ]);

          return (
            <Space key={field.key} align="baseline">
              <Form.Item
                {...field}
                name={[field.name, "name"]}
                fieldKey={[field.fieldKey, "name"]}
                rules={[{ required: true, message: "客官！选一个按键！" }]}
                extra="键盘按键"
              >
                <Input style={{ width: 80 }} />
              </Form.Item>

              {type === "pwm" && (
                <Form.Item
                  {...field}
                  name={[field.name, "method"]}
                  fieldKey={[field.fieldKey, "method"]}
                  defaultValue="default"
                  extra="控制方式"
                >
                  <Radio.Group size="middle">
                    <Radio.Button value="default">默认</Radio.Button>
                    <Radio.Button value="step">步进</Radio.Button>
                  </Radio.Group>
                </Form.Item>
              )}

              {type === "pwm" && (
                <Form.Item
                  {...field}
                  name={[field.name, "speed"]}
                  fieldKey={[field.fieldKey, "speed"]}
                  extra={
                    method === "default"
                      ? "-1 ~ 1， 0 为归位"
                      : "每秒步进速度系数"
                  }
                >
                  <InputNumber max={1} min={-1} step={0.1} />
                </Form.Item>
              )}

              {/* {type === "switch" && (
                <Form.Item
                  {...field}
                  name={[field.name, "speed"]}
                  fieldKey={[field.fieldKey, "speed"]}
                  extra="高低电平"
                >
                  <Radio.Group size="middle">
                    <Radio.Button value={1}>高</Radio.Button>
                    <Radio.Button value={-1}>低</Radio.Button>
                  </Radio.Group>
                </Form.Item>
              )} */}

              {(method === "default" || type === "switch") && (
                <Form.Item
                  {...field}
                  name={[field.name, "autoReset"]}
                  fieldKey={[field.fieldKey, "autoReset"]}
                  extra="释放键盘是否复位"
                  valuePropName="checked"
                  defaultValue={true}
                >
                  <Switch />
                </Form.Item>
              )}

              <MinusCircleOutlined onClick={() => remove(field.name)} />
            </Space>
          );
        })}
        <PlusCircleOutlined
          onClick={() =>
            add({
              speed: 1,
              autoReset: true,
              method: "default",
            })
          }
        />
      </Space>
    );
  };

  const gamepad = (index, fields, { add, remove }) => {
    const type = form.getFieldValue(["channelList", index, "type"]);

    return (
      <Space align="baseline" split={<Divider type="vertical" />} wrap>
        {fields.map((field) => {
          // const method = form.getFieldValue([
          //   "channelList",
          //   index,
          //   "gamepad",
          //   field.name,
          //   "method",
          // ]);
          return (
            <Space key={field.key} align="baseline">
              <Form.Item
                {...field}
                name={[field.name, "name"]}
                fieldKey={[field.fieldKey, "name"]}
                rules={[{ required: true, message: "客官！选一个！" }]}
                extra="摇杆轴或按键"
              >
                <Select style={{ width: 100 }}>
                  {gamePadInputList.map(({ value, name }) => (
                    <Option value={value}> {name} </Option>
                  ))}
                </Select>
              </Form.Item>

              {type === "pwm" && (
                <Form.Item
                  {...field}
                  name={[field.name, "method"]}
                  fieldKey={[field.fieldKey, "method"]}
                  defaultValue="default"
                  extra="控制方式"
                >
                  <Radio.Group size="middle">
                    <Radio.Button value="default">默认</Radio.Button>
                    <Radio.Button value="step">步进</Radio.Button>
                  </Radio.Group>
                </Form.Item>
              )}

              {type === "pwm" && (
                <Form.Item
                  {...field}
                  name={[field.name, "speed"]}
                  fieldKey={[field.fieldKey, "speed"]}
                  extra="控制系数，-1 ~ 1"
                >
                  <InputNumber min={-1} max={1} step={0.1} />
                </Form.Item>
              )}

              {/* {method === "default" && (
                <Form.Item
                  {...field}
                  name={[field.name, "autoReset"]}
                  fieldKey={[field.fieldKey, "autoReset"]}
                  extra="释放按钮是否复位"
                  valuePropName="checked"
                  defaultValue={true}
                >
                  <Switch />
                </Form.Item>
              )} */}

              {/* {type === "switch" && (
                <Form.Item
                  {...field}
                  name={[field.name, "speed"]}
                  fieldKey={[field.fieldKey, "speed"]}
                  extra="高低电平"
                >
                  <Radio.Group size="middle">
                    <Radio.Button value={1}>高</Radio.Button>
                    <Radio.Button value={-1}>低</Radio.Button>
                  </Radio.Group>
                </Form.Item>
              )} */}

              <MinusCircleOutlined onClick={() => remove(field.name)} />
            </Space>
          );
        })}
        <PlusCircleOutlined
          onClick={() =>
            add({
              speed: 1,
              autoReset: true,
              method: "default",
            })
          }
        />
      </Space>
    );
  };

  return (
    <Form form={form} onFinish={saveServerConfig} initialValues={serverConfig}>
      <Form.List name="channelList">
        {(fields, { add, remove }) => (
          <Space
            key={fields.key}
            direction="vertical"
            style={{ width: "100%" }}
          >
            {fields.map((field) => (
              <Card
                key={field.key}
                title={
                  <Space key={field.key} align="baseline" wrap>
                    <Form.Item
                      {...field}
                      name={[field.name, "enabled"]}
                      fieldKey={[field.fieldKey, "enabled"]}
                      valuePropName="checked"
                    >
                      <Switch checkedChildren="开启" unCheckedChildren="禁用" />
                    </Form.Item>
                    <Form.Item
                      {...field}
                      label="名称"
                      name={[field.name, "name"]}
                      fieldKey={[field.fieldKey, "name"]}
                    >
                      <Input style={{ width: 80 }} />
                    </Form.Item>
                    <Button danger onClick={() => remove(field.name)}>
                      <DeleteOutlined />
                    </Button>
                  </Space>
                }
              >
                <Row>
                  <Space key={field.key} align="baseline" wrap>
                    <Form.Item
                      {...field}
                      label="GPIO"
                      name={[field.name, "pin"]}
                      fieldKey={[field.fieldKey, "pin"]}
                      rules={[{ required: true, message: "仔细想想" }]}
                    >
                      <Select style={{ width: 60 }}>
                        {pins.map((pin) => (
                          <Option key={pin} value={pin}>
                            {pin}
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                    <Form.Item
                      {...field}
                      label="类型"
                      name={[field.name, "type"]}
                      fieldKey={[field.fieldKey, "type"]}
                      rules={[{ required: true, message: "你不能没有我！" }]}
                    >
                      <Select style={{ width: 80 }}>
                        {types.map(({ value, label }) => (
                          <Option key={value} value={value}>
                            {label}
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                    {form.getFieldValue([
                      "channelList",
                      field.fieldKey,
                      "type",
                    ]) === "pwm" && (
                      <>
                        <Form.Item
                          {...field}
                          label="最大值"
                          name={[field.name, "valuePostive"]}
                          fieldKey={[field.fieldKey, "valuePostive"]}
                        >
                          <InputNumber
                            step={0.1}
                            max={2}
                            min={form.getFieldValue([
                              "channelList",
                              field.fieldKey,
                              "valueReset",
                            ])}
                          />
                        </Form.Item>
                        <Form.Item
                          {...field}
                          label="复位值"
                          name={[field.name, "valueReset"]}
                          fieldKey={[field.fieldKey, "valueReset"]}
                          shouldUpdate
                        >
                          <InputNumber
                            step={0.1}
                            min={form.getFieldValue([
                              "channelList",
                              field.fieldKey,
                              "valueNegative",
                            ])}
                            max={form.getFieldValue([
                              "channelList",
                              field.fieldKey,
                              "valuePostive",
                            ])}
                          />
                        </Form.Item>
                        <Form.Item
                          {...field}
                          label="最小值"
                          name={[field.name, "valueNegative"]}
                          fieldKey={[field.fieldKey, "valueNegative"]}
                        >
                          <InputNumber
                            step={0.1}
                            min={-2}
                            max={form.getFieldValue([
                              "channelList",
                              field.fieldKey,
                              "valueReset",
                            ])}
                          />
                        </Form.Item>
                      </>
                    )}
                  </Space>
                </Row>

                <Collapse align="start">
                  <Panel header="UI 控件" size="small">
                    <Form.List name={[field.name, "ui"]}>
                      {(...props) => ui(field.fieldKey, ...props)}
                    </Form.List>
                  </Panel>
                  <Panel header="键盘" size="small">
                    <Form.List name={[field.name, "keyboard"]}>
                      {(...props) => keyboard(field.fieldKey, ...props)}
                    </Form.List>
                  </Panel>
                  <Panel header="手柄" size="small">
                    <Form.List name={[field.name, "gamepad"]}>
                      {(...props) => gamepad(field.fieldKey, ...props)}
                    </Form.List>
                  </Panel>
                  <Panel header="手机重力感应" size="small">
                    <Form.Item
                      {...field}
                      label="方向"
                      name={[field.name, "orientation", "axis"]}
                      fieldKey={[field.fieldKey, "orientation", "axis"]}
                    >
                      <Select style={{ width: 80 }} allowClear>
                        {[
                          { name: "水平", value: "x" },
                          { name: "垂直", value: "y" },
                        ].map((i) => (
                          <Option key={i.value} value={i.value}>
                            {i.name}
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                    <Form.Item
                      {...field}
                      label="系数"
                      name={[field.name, "orientation", "coefficient"]}
                      fieldKey={[field.fieldKey, "orientation", "coefficient"]}
                    >
                      <Slider defaultValue={1} max={2} min={-2} step={0.01} />
                    </Form.Item>
                  </Panel>
                </Collapse>
              </Card>
            ))}

            <Form.Item>
              <Button
                onClick={() =>
                  add({
                    id: uuid(),
                    enabled: true,
                    valuePostive: 1,
                    valueNegative: -1,
                    valueReset: 0,
                  })
                }
                block
                icon={<PlusOutlined />}
              >
                添加通道
              </Button>
            </Form.Item>
          </Space>
        )}
      </Form.List>

      <Form.Item>
        <Space>
          <Button type="primary" htmlType="submit">
            保存
          </Button>
          <Button
            type="danger"
            onClick={() => {
              resetChannel();
              store.remove("ui-position");
            }}
          >
            恢复默认通道设置
          </Button>
        </Space>
      </Form.Item>
    </Form>
  );
}
