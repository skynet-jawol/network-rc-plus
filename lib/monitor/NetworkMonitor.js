/**
 * 网络状态监控服务
 * 负责收集和分析WebRTC连接的网络状态数据
 */

const { networkQualityThresholds } = require('./config');

class NetworkMonitor {
  constructor() {
    this.stats = {
      rtt: 0,
      packetsLost: 0,
      jitter: 0,
      timestamp: 0,
      bytesReceived: 0,
      framesReceived: 0,
      framesDropped: 0
    };

    this.qualityHistory = [];
    this.MAX_HISTORY_LENGTH = 60; // 保存最近60秒的数据
  }

  /**
   * 更新网络状态数据
   * @param {RTCStatsReport} statsReport WebRTC统计数据
   */
  updateStats(statsReport) {
    statsReport.forEach(report => {
      if (report.type === 'inbound-rtp' && report.kind === 'video') {
        const prevStats = { ...this.stats };
        
        this.stats.timestamp = report.timestamp;
        this.stats.packetsLost = report.packetsLost;
        this.stats.jitter = report.jitter * 1000; // 转换为毫秒
        this.stats.bytesReceived = report.bytesReceived;
        this.stats.framesReceived = report.framesReceived;
        this.stats.framesDropped = report.framesDropped;

        // 计算丢包率
        if (prevStats.timestamp > 0) {
          const timeDiff = this.stats.timestamp - prevStats.timestamp;
          const packetLossRate = ((this.stats.packetsLost - prevStats.packetsLost) / 
            (report.packetsReceived - prevStats.packetsReceived)) * 100;
          this.stats.packetLossRate = Math.max(0, Math.min(100, packetLossRate));
        }
      } else if (report.type === 'candidate-pair' && report.state === 'succeeded') {
        this.stats.rtt = report.currentRoundTripTime * 1000; // 转换为毫秒
      }
    });

    this.updateQualityHistory();
  }

  /**
   * 更新网络质量历史记录
   */
  updateQualityHistory() {
    const quality = this.assessNetworkQuality();
    this.qualityHistory.push({
      timestamp: Date.now(),
      quality,
      stats: { ...this.stats }
    });

    // 保持历史记录长度
    if (this.qualityHistory.length > this.MAX_HISTORY_LENGTH) {
      this.qualityHistory.shift();
    }
  }

  /**
   * 评估当前网络质量
   * @returns {string} 网络质量等级 ('excellent'|'good'|'fair'|'poor')
   */
  assessNetworkQuality() {
    const { rtt, packetLossRate, jitter } = this.stats;

    if (rtt <= networkQualityThresholds.excellent.rtt &&
        packetLossRate <= networkQualityThresholds.excellent.packetsLost &&
        jitter <= networkQualityThresholds.excellent.jitter) {
      return 'excellent';
    }

    if (rtt <= networkQualityThresholds.good.rtt &&
        packetLossRate <= networkQualityThresholds.good.packetsLost &&
        jitter <= networkQualityThresholds.good.jitter) {
      return 'good';
    }

    if (rtt <= networkQualityThresholds.fair.rtt &&
        packetLossRate <= networkQualityThresholds.fair.packetsLost &&
        jitter <= networkQualityThresholds.fair.jitter) {
      return 'fair';
    }

    return 'poor';
  }

  /**
   * 获取当前网络状态
   * @returns {Object} 网络状态数据
   */
  getCurrentStats() {
    return {
      ...this.stats,
      quality: this.assessNetworkQuality()
    };
  }

  /**
   * 获取网络质量趋势数据
   * @param {number} seconds 获取最近几秒的数据
   * @returns {Array} 网络质量历史数据
   */
  getQualityTrend(seconds = 60) {
    const now = Date.now();
    return this.qualityHistory.filter(item => {
      return (now - item.timestamp) <= seconds * 1000;
    });
  }
}

module.exports = NetworkMonitor;