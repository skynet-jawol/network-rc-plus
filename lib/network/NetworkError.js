/**
 * 网络优化错误处理模块
 */

const { NetworkRCError } = require('../errors');

class NetworkError extends NetworkRCError {
  static ERROR_CODES = {
    OPTIMIZATION_FAILED: 3100,
    RTT_MEASUREMENT_FAILED: 3101,
    BITRATE_ADJUSTMENT_FAILED: 3102,
    NETWORK_UNSTABLE: 3103,
    CONNECTION_LOST: 3104,
    PACKET_LOSS_HIGH: 3105
  };

  constructor(code, details = null) {
    const message = NetworkError.getErrorMessage(code);
    super(code, message, details);
  }

  static getErrorMessage(code) {
    switch (code) {
      case this.ERROR_CODES.OPTIMIZATION_FAILED:
        return '网络优化失败';
      case this.ERROR_CODES.RTT_MEASUREMENT_FAILED:
        return 'RTT测量失败';
      case this.ERROR_CODES.BITRATE_ADJUSTMENT_FAILED:
        return '码率调整失败';
      case this.ERROR_CODES.NETWORK_UNSTABLE:
        return '网络不稳定';
      case this.ERROR_CODES.CONNECTION_LOST:
        return '网络连接丢失';
      case this.ERROR_CODES.PACKET_LOSS_HIGH:
        return '网络丢包率过高';
      default:
        return '未知网络错误';
    }
  }

  static optimizationFailed(details = null) {
    return new NetworkError(this.ERROR_CODES.OPTIMIZATION_FAILED, details);
  }

  static rttMeasurementFailed(details = null) {
    return new NetworkError(this.ERROR_CODES.RTT_MEASUREMENT_FAILED, details);
  }

  static bitrateAdjustmentFailed(details = null) {
    return new NetworkError(this.ERROR_CODES.BITRATE_ADJUSTMENT_FAILED, details);
  }

  static networkUnstable(details = null) {
    return new NetworkError(this.ERROR_CODES.NETWORK_UNSTABLE, details);
  }

  static connectionLost(details = null) {
    return new NetworkError(this.ERROR_CODES.CONNECTION_LOST, details);
  }

  static packetLossHigh(details = null) {
    return new NetworkError(this.ERROR_CODES.PACKET_LOSS_HIGH, details);
  }
}

module.exports = NetworkError;