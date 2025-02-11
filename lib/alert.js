const EventEmitter = require('events');
const logger = require('./logger');

class AlertSystem extends EventEmitter {
  constructor() {
    super();
    this.rules = new Map();
    this.thresholds = {
      error: {
        count: 10,      // 单位时间内错误数量
        frequency: 0.1, // 错误频率阈值（10%）
        duration: 300   // 监控时间窗口（秒）
      },
      performance: {
        cpu: 80,        // CPU 使用率阈值（%）
        memory: 85,     // 内存占用阈值（%）
        response: 1000, // 响应时间阈值（ms）
        storage: 90     // 存储空间占用阈值（%）
      }
    };
    this.errorStats = {
      count: 0,
      startTime: Date.now()
    };
    this.notifications = [];
  }

  // 添加告警规则
  addRule(name, condition, action) {
    this.rules.set(name, { condition, action });
    logger.info(`添加告警规则: ${name}`);
  }

  // 移除告警规则
  removeRule(name) {
    this.rules.delete(name);
    logger.info(`移除告警规则: ${name}`);
  }

  // 设置阈值
  setThreshold(category, key, value) {
    if (this.thresholds[category] && this.thresholds[category][key] !== undefined) {
      this.thresholds[category][key] = value;
      logger.info(`设置${category}类别的${key}阈值为: ${value}`);
    }
  }

  // 添加通知方式
  addNotification(type, handler) {
    this.notifications.push({ type, handler });
    logger.info(`添加${type}类型的通知处理器`);
  }

  // 触发告警
  triggerAlert(type, message, level = 'warn') {
    const alert = {
      type,
      message,
      level,
      timestamp: Date.now()
    };

    // 发送通知
    this.notifications.forEach(({ handler }) => {
      try {
        handler(alert);
      } catch (error) {
        logger.error(`通知发送失败: ${error.message}`);
      }
    });

    // 触发事件
    this.emit('alert', alert);
    logger.log(level, `告警: ${message}`);
  }

  // 检查错误阈值
  checkErrorThreshold(error) {
    const now = Date.now();
    const { count, frequency, duration } = this.thresholds.error;
    
    // 更新错误统计
    this.errorStats.count++;
    
    // 检查时间窗口
    if (now - this.errorStats.startTime > duration * 1000) {
      this.errorStats = {
        count: 1,
        startTime: now
      };
    }
    
    // 检查错误数量
    if (this.errorStats.count >= count) {
      this.triggerAlert('error_count', `错误数量超过阈值 (${count})`, 'error');
    }
    
    // 检查错误频率
    const currentFrequency = this.errorStats.count / (duration);
    if (currentFrequency >= frequency) {
      this.triggerAlert('error_frequency', `错误频率超过阈值 (${frequency * 100}%)`, 'error');
    }
  }

  // 检查性能阈值
  checkPerformanceThreshold(metrics) {
    const { cpu, memory, response, storage } = this.thresholds.performance;
    
    if (metrics.cpu > cpu) {
      this.triggerAlert('high_cpu', `CPU 使用率过高: ${metrics.cpu}%`);
    }
    
    if (metrics.memory > memory) {
      this.triggerAlert('high_memory', `内存占用过高: ${metrics.memory}%`);
    }
    
    if (metrics.response > response) {
      this.triggerAlert('high_latency', `响应时间过高: ${metrics.response}ms`);
    }
    
    if (metrics.storage > storage) {
      this.triggerAlert('low_storage', `存储空间不足: ${metrics.storage}%`);
    }
  }
}

module.exports = new AlertSystem();