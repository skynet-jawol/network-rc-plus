const EventEmitter = require('events');
const WebRTCOptimizer = require('./WebRTCOptimizer');

class WebRTCPerformanceService extends EventEmitter {
  constructor(options = {}) {
    super();
    this.performanceData = {
      timestamp: Date.now(),
      connectionQuality: 100,
      networkMetrics: {
        rtt: 0,
        jitter: 0,
        packetsLost: 0,
        framesDropped: 0
      },
      videoMetrics: {
        resolution: { width: 0, height: 0 },
        frameRate: 0,
        bitrate: 0,
        keyFramesSent: 0
      },
      connectionState: 'new',
      optimizationSettings: null
    };

    this.optimizer = new WebRTCOptimizer(options.optimizer);

    this.thresholds = {
      rtt: { warning: 200, critical: 500 },
      jitter: { warning: 50, critical: 100 },
      packetsLost: { warning: 5, critical: 10 },
      frameRate: { warning: 20, critical: 15 }
    };
  }

  updatePerformanceData(stats) {
    this.performanceData.timestamp = Date.now();
    Object.assign(this.performanceData.networkMetrics, {
      rtt: stats.rtt || 0,
      jitter: stats.jitter || 0,
      packetsLost: stats.packetsLost || 0
    });

    if (stats.resolution) {
      this.performanceData.videoMetrics.resolution = stats.resolution;
    }
    if (stats.frameRate) {
      this.performanceData.videoMetrics.frameRate = stats.frameRate;
    }
    if (stats.bitrate) {
      this.performanceData.videoMetrics.bitrate = stats.bitrate;
    }

    this.performanceData.connectionState = stats.connectionState || 'unknown';
    this.calculateConnectionQuality();
    this.emit('performance-update', this.performanceData);
  }

  calculateConnectionQuality() {
    let quality = 100;
    const { networkMetrics } = this.performanceData;
    const { thresholds } = this;

    // RTT影响
    if (networkMetrics.rtt > thresholds.rtt.critical) {
      quality -= 30;
    } else if (networkMetrics.rtt > thresholds.rtt.warning) {
      quality -= 15;
    }

    // 抖动影响
    if (networkMetrics.jitter > thresholds.jitter.critical) {
      quality -= 20;
    } else if (networkMetrics.jitter > thresholds.jitter.warning) {
      quality -= 10;
    }

    // 丢包影响
    if (networkMetrics.packetsLost > thresholds.packetsLost.critical) {
      quality -= 30;
    } else if (networkMetrics.packetsLost > thresholds.packetsLost.warning) {
      quality -= 15;
    }

    // 帧率影响
    if (this.performanceData.videoMetrics.frameRate < thresholds.frameRate.critical) {
      quality -= 20;
    } else if (this.performanceData.videoMetrics.frameRate < thresholds.frameRate.warning) {
      quality -= 10;
    }

    this.performanceData.connectionQuality = Math.max(0, Math.min(100, quality));
  }

  getOptimizationSuggestions() {
    const suggestions = [];
    const { networkMetrics, videoMetrics } = this.performanceData;

    // 获取优化器的建议
    const optimizerStatus = this.optimizer.getOptimizationStatus();
    this.performanceData.optimizationSettings = optimizerStatus.currentSettings;

    // 网络延迟优化建议
    if (networkMetrics.rtt > this.thresholds.rtt.warning) {
      const severity = networkMetrics.rtt > this.thresholds.rtt.critical ? 'critical' : 'warning';
      suggestions.push({
        type: 'network',
        severity,
        message: severity === 'critical' ? 
          '网络延迟严重，建议立即降低视频码率和分辨率' : 
          '网络延迟较高，建议适当降低视频码率',
        action: severity === 'critical' ? 'reduce_quality' : 'reduce_bitrate',
        metrics: {
          currentRTT: networkMetrics.rtt,
          warningThreshold: this.thresholds.rtt.warning,
          criticalThreshold: this.thresholds.rtt.critical,
          currentBitrate: optimizerStatus.currentSettings.bitrate
        }
      });
    }

    // 丢包率优化建议
    if (networkMetrics.packetsLost > this.thresholds.packetsLost.warning) {
      const severity = networkMetrics.packetsLost > this.thresholds.packetsLost.critical ? 'critical' : 'warning';
      suggestions.push({
        type: 'network',
        severity,
        message: severity === 'critical' ? 
          '网络丢包严重，建议降低视频质量并检查网络连接' : 
          '网络丢包率较高，建议降低分辨率',
        action: severity === 'critical' ? 'check_network' : 'reduce_resolution',
        metrics: {
          currentLoss: networkMetrics.packetsLost,
          warningThreshold: this.thresholds.packetsLost.warning,
          criticalThreshold: this.thresholds.packetsLost.critical
        }
      });
    }

    // 帧率优化建议
    if (videoMetrics.frameRate < this.thresholds.frameRate.warning) {
      const severity = videoMetrics.frameRate < this.thresholds.frameRate.critical ? 'critical' : 'warning';
      suggestions.push({
        type: 'video',
        severity,
        message: severity === 'critical' ? 
          '视频帧率严重过低，建议降低视频质量设置' : 
          '视频帧率较低，建议降低编码复杂度',
        action: severity === 'critical' ? 'reduce_quality' : 'reduce_complexity',
        metrics: {
          currentFrameRate: videoMetrics.frameRate,
          warningThreshold: this.thresholds.frameRate.warning,
          criticalThreshold: this.thresholds.frameRate.critical
        }
      });
    }

    // 综合性能评估
    if (suggestions.length > 1) {
      const criticalCount = suggestions.filter(s => s.severity === 'critical').length;
      if (criticalCount >= 2) {
        suggestions.push({
          type: 'system',
          severity: 'critical',
          message: '检测到多个严重性能问题，建议暂时降低整体视频质量并检查网络环境',
          action: 'optimize_system',
          metrics: {
            criticalIssues: criticalCount,
            totalIssues: suggestions.length
          }
        });
      }
    }

    return suggestions;
  }

  getPerformanceReport() {
    return {
      ...this.performanceData,
      suggestions: this.getOptimizationSuggestions()
    };
  }
}

module.exports = WebRTCPerformanceService;