/**
 * 网络相关错误定义
 */

const { NetworkRCError } = require('./index');

class NetworkError extends NetworkRCError {
  constructor(code, message, details = null) {
    super(code, message, details);
  }
}

class RTTMeasurementError extends NetworkError {
  constructor(details = null) {
    super('ERR_RTT_MEASUREMENT', '网络延迟测量失败', details);
  }
}

class NetworkQualityError extends NetworkError {
  constructor(details = null) {
    super('ERR_NETWORK_QUALITY', '网络质量不佳', details);
  }
}

class ConnectionTimeoutError extends NetworkError {
  constructor(details = null) {
    super('ERR_CONNECTION_TIMEOUT', '连接超时', details);
  }
}

class PacketLossError extends NetworkError {
  constructor(details = null) {
    super('ERR_PACKET_LOSS', '数据包丢失率过高', details);
  }
}

module.exports = {
  NetworkError,
  RTTMeasurementError,
  NetworkQualityError,
  ConnectionTimeoutError,
  PacketLossError
};