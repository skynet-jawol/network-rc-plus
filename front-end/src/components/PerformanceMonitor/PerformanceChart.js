import React, { useEffect, useRef } from 'react';
import { Line } from '@ant-design/plots';
import { Card, Row, Col, Statistic } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';

const PerformanceChart = ({ data, type = 'rtt' }) => {
  const chartRef = useRef(null);

  const config = {
    data: data[type] || [],
    xField: 'date',
    yField: 'value',
    smooth: true,
    animation: false,
    point: {
      size: 3,
      shape: 'circle',
      style: {
        fill: '#5B8FF9',
        stroke: '#fff',
        lineWidth: 2,
      },
    },
    tooltip: {
      showMarkers: false,
    },
    state: {
      active: {
        style: {
          shadowBlur: 4,
          stroke: '#000',
          fill: 'red',
        },
      },
    },
    theme: {
      geometries: {
        point: {
          circle: {
            active: {
              style: {
                r: 4,
                fillOpacity: 1,
                stroke: '#000',
                lineWidth: 1,
              },
            },
          },
        },
      },
    },
  };

  const getStatistics = () => {
    if (!data[type] || data[type].length === 0) return { current: 0, previous: 0 };
    const current = data[type][data[type].length - 1].value;
    const previous = data[type][data[type].length - 2]?.value || 0;
    return { current, previous };
  };

  const { current, previous } = getStatistics();
  const percentageChange = previous ? ((current - previous) / previous) * 100 : 0;

  const getMetricTitle = () => {
    switch (type) {
      case 'rtt':
        return '网络延迟';
      case 'bitrate':
        return '比特率';
      case 'packetsLost':
        return '丢包率';
      case 'qualityScore':
        return '质量评分';
      default:
        return type;
    }
  };

  const getMetricUnit = () => {
    switch (type) {
      case 'rtt':
        return 'ms';
      case 'bitrate':
        return 'kbps';
      case 'packetsLost':
        return '%';
      case 'qualityScore':
        return '';
      default:
        return '';
    }
  };

  return (
    <Card title={getMetricTitle()} bordered={false}>
      <Row gutter={16}>
        <Col span={12}>
          <Statistic
            title="当前值"
            value={current}
            precision={2}
            suffix={getMetricUnit()}
            valueStyle={{
              color: percentageChange > 0 ? '#cf1322' : '#3f8600',
            }}
            prefix={
              percentageChange > 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />
            }
          />
        </Col>
        <Col span={12}>
          <Statistic
            title="变化率"
            value={Math.abs(percentageChange)}
            precision={2}
            suffix="%"
            valueStyle={{
              color: percentageChange > 0 ? '#cf1322' : '#3f8600',
            }}
          />
        </Col>
      </Row>
      <div style={{ height: 300 }}>
        <Line {...config} />
      </div>
    </Card>
  );
};

export default PerformanceChart;