const { exec } = require('child_process');
const status = require('./status');

class GPS {
  constructor() {
    this.trackingProcess = null;
    this.currentLocation = {
      latitude: 0,
      longitude: 0,
      accuracy: 0,
      timestamp: Date.now()
    };
    this.config = {
      refreshRate: 5, // 默认5秒刷新一次
      accuracyThreshold: 10, // 默认精度阈值10米
      enabled: false
    };
  }

  async getCurrentLocation() {
    try {
      // 如果已经有位置信息且在刷新周期内，直接返回缓存的位置
      if (this.currentLocation.timestamp > Date.now() - this.config.refreshRate * 1000) {
        return this.currentLocation;
      }
      
      // 这里可以根据实际硬件实现GPS定位
      // 例如使用gpsd或其他GPS模块获取位置
      // 以下是模拟实现
      return new Promise((resolve) => {
        setTimeout(() => {
          this.currentLocation = {
            latitude: 39.9042 + (Math.random() - 0.5) * 0.01,
            longitude: 116.4074 + (Math.random() - 0.5) * 0.01,
            accuracy: Math.random() * this.config.accuracyThreshold,
            timestamp: Date.now()
          };
          status.update('gps', 'active');
          resolve(this.currentLocation);
        }, 500);
      });
    } catch (err) {
      console.error(`GPS获取位置失败: ${err.message}`);
      status.update('gps', 'error');
      return this.currentLocation; // 返回上次的位置
    }
  }

  startTracking() {
    if (this.trackingProcess || !this.config.enabled) {
      return;
    }
    
    try {
      // 定期更新位置
      this.trackingProcess = setInterval(async () => {
        await this.getCurrentLocation();
        console.log(`GPS位置更新: ${JSON.stringify(this.currentLocation)}`);
      }, this.config.refreshRate * 1000);
      
      status.update('gps', 'tracking');
      return true;
    } catch (err) {
      console.error(`GPS追踪启动失败: ${err.message}`);
      status.update('gps', 'error');
      return false;
    }
  }

  stopTracking() {
    if (this.trackingProcess) {
      clearInterval(this.trackingProcess);
      this.trackingProcess = null;
      status.update('gps', 'inactive');
    }
  }

  updateConfig(config) {
    this.config = { ...this.config, ...config };
    
    // 如果启用状态改变，相应启动或停止追踪
    if (config.enabled !== undefined) {
      if (config.enabled) {
        this.startTracking();
      } else {
        this.stopTracking();
      }
    }
    
    return this.config;
  }
}

module.exports = GPS;