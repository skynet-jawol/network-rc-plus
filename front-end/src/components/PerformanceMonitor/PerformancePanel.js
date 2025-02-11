import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Alert } from 'antd';
import PerformanceChart from './PerformanceChart';

const PerformancePanel = ({ performanceData, suggestions }) => {
  const [alertMessage, setAlertMessage] = useState(null);

  useEffect(() => {
    if (suggestions && suggestions.length > 0) {
      const criticalSuggestion = suggestions.find(s => s.type === 'critical');
      if (criticalSuggestion) {
        setAlertMessage({
          type: 'error',
          message: criticalSuggestion.message
        });
      } else {
        const warningSuggestion = suggestions.find(s => s.type === 'warning');
        if (warningSuggestion) {
          setAlertMessage({
            type: 'warning',
            message: warningSuggestion.message
          });
        } else {
          setAlertMessage(null);
        }
      }
    } else {
      setAlertMessage(null);
    }
  }, [suggestions]);

  return (
    <div className="performance-panel">
      {alertMessage && (
        <Alert
          message={alertMessage.message}
          type={alertMessage.type}
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}
      <Row gutter={[16, 16]}>
        <Col span={12}>
          <PerformanceChart
            data={performanceData}
            type="rtt"
          />
        </Col>
        <Col span={12}>
          <PerformanceChart
            data={performanceData}
            type="bitrate"
          />
        </Col>
        <Col span={12}>
          <PerformanceChart
            data={performanceData}
            type="packetsLost"
          />
        </Col>
        <Col span={12}>
          <PerformanceChart
            data={performanceData}
            type="qualityScore"
          />
        </Col>
      </Row>
      {suggestions && suggestions.length > 0 && (
        <Card title="优化建议" style={{ marginTop: 16 }}>
          {suggestions.map((suggestion, index) => (
            <Alert
              key={index}
              message={suggestion.message}
              type={suggestion.type === 'critical' ? 'error' : 'warning'}
              showIcon
              style={{ marginBottom: 8 }}
              description={
                suggestion.metrics && (
                  <div>
                    {Object.entries(suggestion.metrics).map(([key, value]) => (
                      <div key={key}>
                        {key}: {typeof value === 'number' ? value.toFixed(2) : value}
                      </div>
                    ))}
                  </div>
                )
              }
            />
          ))}
        </Card>
      )}
    </div>
  );
};

export default PerformancePanel;