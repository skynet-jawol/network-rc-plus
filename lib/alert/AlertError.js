/**
 * 告警机制错误处理模块
 */

const { NetworkRCError } = require('../errors');

class AlertError extends NetworkRCError {
  static ERROR_CODES = {
    THRESHOLD_EXCEEDED: 4100,
    PERFORMANCE_DEGRADED: 4101,
    CUSTOM_RULE_VIOLATION: 4102,
    NOTIFICATION_FAILED: 4103
  };

  constructor(code, details = null) {
    const message = AlertError.getErrorMessage(code);
    super(code, message, details);
  }

  static getErrorMessage(code) {
    switch (code) {
      case this.ERROR_CODES.THRESHOLD_EXCEEDED:
        return '错误阈值超限';
      case this.ERROR_CODES.PERFORMANCE_DEGRADED:
        return '性能指标异常';
      case this.ERROR_CODES.CUSTOM_RULE_VIOLATION:
        return '自定义规则违反';
      case this.ERROR_CODES.NOTIFICATION_FAILED:
        return '告警通知失败';
      default:
        return '未知告警错误';
    }
  }

  static thresholdExceeded(details = null) {
    return new AlertError(this.ERROR_CODES.THRESHOLD_EXCEEDED, details);
  }

  static performanceDegraded(details = null) {
    return new AlertError(this.ERROR_CODES.PERFORMANCE_DEGRADED, details);
  }

  static customRuleViolation(details = null) {
    return new AlertError(this.ERROR_CODES.CUSTOM_RULE_VIOLATION, details);
  }

  static notificationFailed(details = null) {
    return new AlertError(this.ERROR_CODES.NOTIFICATION_FAILED, details);
  }
}

module.exports = AlertError;