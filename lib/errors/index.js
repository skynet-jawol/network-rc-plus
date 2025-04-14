/**
 * Network RC 统一错误处理模块
 */

const ErrorMessages = require('./errorMessages');

class NetworkRCError extends Error {
  constructor(code, message = null, details = null) {
    super(message || ErrorMessages[code] || '未知错误');
    this.name = this.constructor.name;
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
    this.severity = this.getSeverityLevel(code);
    Error.captureStackTrace(this, this.constructor);
  }

  getSeverityLevel(code) {
    if (code >= 1000 && code < 2000) return 'CRITICAL';
    if (code >= 2000 && code < 3000) return 'ERROR';
    if (code >= 3000 && code < 4000) return 'WARNING';
    if (code >= 4000 && code < 5000) return 'INFO';
    if (code >= 5000 && code < 6000) return 'DEBUG';
    return 'UNKNOWN';
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp,
      severity: this.severity
    };
  }
}

// 系统级错误 (1000-1999)
class SystemError extends NetworkRCError {
  constructor(message, details = null) {
    super(1000, message, details);
  }
}

// 硬件错误 (2000-2999)
class HardwareError extends NetworkRCError {
  constructor(message, details = null) {
    super(2000, message, details);
  }
}

// 网络错误 (3000-3999)
class NetworkError extends NetworkRCError {
  constructor(message, details = null) {
    super(3000, message, details);
  }
}

// 认证错误 (4000-4999)
class AuthError extends NetworkRCError {
  constructor(message, details = null) {
    super(4000, message, details);
  }
}

// 配置错误 (5000-5999)
class ConfigError extends NetworkRCError {
  constructor(message, details = null) {
    super(5000, message, details);
  }
}

// 错误码定义
const ErrorCodes = {
  // 系统错误 (1000-1999)
  SYSTEM_ERROR: 1000,
  INITIALIZATION_FAILED: 1001,
  RESOURCE_NOT_FOUND: 1002,
  
  // 硬件错误 (2000-2999)
  HARDWARE_ERROR: 2000,
  GPIO_ERROR: 2001,
  CAMERA_ERROR: 2002,
  MICROPHONE_ERROR: 2003,
  GPS_ERROR: 2004,
  
  // 网络错误 (3000-3999)
  NETWORK_ERROR: 3000,
  CONNECTION_FAILED: 3001,
  WEBSOCKET_ERROR: 3002,
  TUNNEL_ERROR: 3003,
  
  // 认证错误 (4000-4999)
  AUTH_ERROR: 4000,
  INVALID_TOKEN: 4001,
  SESSION_EXPIRED: 4002,
  
  // 配置错误 (5000-5999)
  CONFIG_ERROR: 5000,
  INVALID_CONFIG: 5001,
  MISSING_CONFIG: 5002
};

module.exports = {
  NetworkRCError,
  SystemError,
  HardwareError,
  NetworkError,
  AuthError,
  ConfigError,
  ErrorCodes
};