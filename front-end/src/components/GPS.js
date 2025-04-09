import React from 'react';
import { Button, Slider, InputNumber, Row, Col } from 'antd';
import { connect } from 'react-redux';
import { updateGPSConfig } from '../store/actions';
import './GPS.module.scss';

class GPS extends React.Component {
  state = {
    refreshRate: 1,
    accuracyThreshold: 10,
    trackingEnabled: false
  };

  handleRefreshChange = value => {
    this.setState({ refreshRate: value });
  };

  handleAccuracyChange = value => {
    this.setState({ accuracyThreshold: value });
  };

  toggleTracking = () => {
    this.setState(prevState => ({
      trackingEnabled: !prevState.trackingEnabled
    }), () => {
      this.props.updateGPSConfig({
        refreshRate: this.state.refreshRate,
        accuracyThreshold: this.state.accuracyThreshold,
        enabled: this.state.trackingEnabled
      });
    });
  };

  render() {
    return (
      <div className="gps-config">
        <h3>GPS配置</h3>
        <Row gutter={16}>
          <Col span={12}>
            <div className="config-item">
              <span>刷新频率(秒):</span>
              <Slider
                min={1}
                max={60}
                onChange={this.handleRefreshChange}
                value={this.state.refreshRate}
              />
              <InputNumber
                min={1}
                max={60}
                value={this.state.refreshRate}
                onChange={this.handleRefreshChange}
              />
            </div>
          </Col>
          <Col span={12}>
            <div className="config-item">
              <span>精度阈值(米):</span>
              <Slider
                min={1}
                max={100}
                onChange={this.handleAccuracyChange}
                value={this.state.accuracyThreshold}
              />
              <InputNumber
                min={1}
                max={100}
                value={this.state.accuracyThreshold}
                onChange={this.handleAccuracyChange}
              />
            </div>
          </Col>
        </Row>
        <Button 
          type={this.state.trackingEnabled ? 'danger' : 'primary'} 
          onClick={this.toggleTracking}
        >
          {this.state.trackingEnabled ? '停止追踪' : '开始追踪'}
        </Button>
      </div>
    );
  }
}

const mapDispatchToProps = {
  updateGPSConfig
};

export default connect(null, mapDispatchToProps)(GPS);