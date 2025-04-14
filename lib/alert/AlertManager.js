/**
 * 告警管理模块
 */

const AlertError = require('./AlertError');
const EventEmitter = require('events');

class AlertManager extends EventEmitter {
  constructor() {
    super();
    this.rules = new Map();
    this.thresholds = {
      error: {
        count: 10,        // 单位时间内错误数量
        frequency: 0.1,   // 错误频率阈值（10%）
        timeWindow: 60000, // 监控时间窗口（毫秒）
        level: 'ERROR',   // 错误级别阈值
        duration: 300     // 持续时间（秒）
      },
      performance: {
        cpu: 80,         // CPU使用率阈值（%）
        memory: 85,      // 内存占用阈值（%）
        responseTime: 1000, // 响应时间阈值（ms）
        storage: 90,     // 存储空间阈值（%）
        network: {
          rtt: 500,     // 网络延迟阈值（ms）
          packetLoss: 10, // 丢包率阈值（%）
          bandwidth: 1000 // 最小带宽要求（Kbps）
        }
      },
      gps: {
        signalStrength: 30, // GPS信号强度阈值
        satellites: 4,      // 最小卫星数量
        accuracy: 10        // 定位精度阈值（米）
      }
    };
    this.errorCounts = new Map();
    this.lastCleanup = Date.now();
  }

  // 添加自定义告警规则
  addRule(name, condition, action) {
    this.rules.set(name, { condition, action });
  }

  // 删除告警规则
  removeRule(name) {
    this.rules.delete(name);
  }

  // 设置阈值
  setThreshold(category, key, value) {
    if (this.thresholds[category]) {
      this.thresholds[category][key] = value;
    }
  }

  // 检查错误阈值
  checkErrorThreshold(error) {
    const now = Date.now();
    const { count, timeWindow, duration, frequency } = this.thresholds.error;

    // 清理过期的错误计数
    if (now - this.lastCleanup > timeWindow) {
      this.errorCounts.clear();
      this.lastCleanup = now;
    }

    // 更新错误计数
    const errorKey = error.code.toString();
    const currentCount = (this.errorCounts.get(errorKey) || 0) + 1;
    this.errorCounts.set(errorKey, currentCount);

    // 计算错误频率
    const currentFrequency = currentCount / (timeWindow / 1000);

    // 检查是否超过阈值
    if (currentCount >= count || currentFrequency >= frequency) {
      const alertDetails = {
        errorCode: error.code,
        count: currentCount,
        frequency: currentFrequency,
        timeWindow,
        duration
      };

      // 如果已经触发过告警，检查持续时间
      const lastAlertTime = this.lastAlertTimes.get(errorKey) || 0;
      if (now - lastAlertTime >= duration * 1000) {
        this.emit('alert', AlertError.thresholdExceeded(alertDetails));
        this.lastAlertTimes.set(errorKey, now);
      }
    }
  }

  // 检查性能阈值
  checkPerformanceThreshold(metrics) {
    const { cpu, memory, responseTime, storage, network } = this.thresholds.performance;

    if (metrics.cpu > cpu) {
      this.emit('alert', AlertError.performanceDegraded({
        metric: 'CPU',
        value: metrics.cpu,
        threshold: cpu
      }));
    }

    if (metrics.memory > memory) {
      this.emit('alert', AlertError.performanceDegraded({
        metric: 'Memory',
        value: metrics.memory,
        threshold: memory
      }));
    }

    if (metrics.responseTime > responseTime) {
      this.emit('alert', AlertError.performanceDegraded({
        metric: 'Response Time',
        value: metrics.responseTime,
        threshold: responseTime
      }));
    }

    if (metrics.storage > storage) {
      this.emit('alert', AlertError.performanceDegraded({
        metric: 'Storage',
        value: metrics.storage,
        threshold: storage
      }));
    }

    // 检查网络性能
    if (metrics.network) {
      if (metrics.network.rtt > network.rtt) {
        this.emit('alert', AlertError.performanceDegraded({
          metric: 'Network RTT',
          value: metrics.network.rtt,
          threshold: network.rtt
        }));
      }

      if (metrics.network.packetLoss > network.packetLoss) {
        this.emit('alert', AlertError.performanceDegraded({
          metric: 'Packet Loss',
          value: metrics.network.packetLoss,
          threshold: network.packetLoss
        }));
      }

      if (metrics.network.bandwidth < network.bandwidth) {
        this.emit('alert', AlertError.performanceDegraded({
          metric: 'Network Bandwidth',
          value: metrics.network.bandwidth,
          threshold: network.bandwidth
        }));
      }
    }
  }

  // 检查GPS状态
  checkGPSStatus(gpsData) {
    const { signalStrength, satellites, accuracy } = this.thresholds.gps;

    if (gpsData.signalStrength < signalStrength) {
      this.emit('alert', AlertError.performanceDegraded({
        metric: 'GPS Signal Strength',
        value: gpsData.signalStrength,
        threshold: signalStrength
      }));
    }

    if (gpsData.satellites < satellites) {
      this.emit('alert', AlertError.performanceDegraded({
        metric: 'GPS Satellites',
        value: gpsData.satellites,
        threshold: satellites
      }));
    }

    if (gpsData.accuracy > accuracy) {
      this.emit('alert', AlertError.performanceDegraded({
        metric: 'GPS Accuracy',
        value: gpsData.accuracy,
        threshold: accuracy
      }));
    }
  }

  // 检查自定义规则
  checkCustomRules(context) {
    for (const [name, rule] of this.rules) {
      try {
        if (rule.condition(context)) {
          rule.action(context);
          this.emit('alert', AlertError.customRuleViolation({
            ruleName: name,
            context
          }));
        }
      } catch (error) {
        console.error(`Error executing custom rule ${name}:`, error);
      }
    }
  }

  // 发送告警通知
  async sendNotification(alert) {
    try {
      if (!this.notificationService) {
        const NotificationService = require('./NotificationService');
        this.notificationService = new NotificationService();
        
        // 监听通知错误
        this.notificationService.on('notification_error', (error) => {
          this.emit('alert', AlertError.notificationFailed(error));
        });
      }

      await this.notificationService.processAlert(alert);
    } catch (error) {
      throw AlertError.notificationFailed(error);
    }
  }
}

module.exports = AlertManager;