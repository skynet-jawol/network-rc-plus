const { EventEmitter } = require('events');
const config = require('./config');

class NetworkQualityService extends EventEmitter {
  constructor() {
    super();
    this.qualityMetrics = {
      rtt: 0,
      packetsLost: 0,
      jitter: 0,
      bandwidth: 0,
      lastQualityScore: 100
    };

    this.thresholds = config.networkQualityThresholds;
    this.adaptiveConfig = config.adaptiveStrategy;
  }

  updateMetrics(stats) {
    this.qualityMetrics = {
      ...this.qualityMetrics,
      rtt: stats.rtt,
      packetsLost: stats.packetsLost,
      jitter: stats.jitter,
      bandwidth: stats.bandwidth
    };

    const qualityScore = this.calculateQualityScore();
    const optimizationSuggestions = this.generateOptimizationSuggestions();

    this.emit('quality-update', {
      score: qualityScore,
      metrics: this.qualityMetrics,
      suggestions: optimizationSuggestions
    });

    return {
      qualityScore,
      suggestions: optimizationSuggestions
    };
  }

  calculateQualityScore() {
    let score = 100;

    // RTT评分（占比40%）
    if (this.qualityMetrics.rtt > this.thresholds.fair.rtt) {
      score -= 40;
    } else if (this.qualityMetrics.rtt > this.thresholds.good.rtt) {
      score -= 20;
    } else if (this.qualityMetrics.rtt > this.thresholds.excellent.rtt) {
      score -= 10;
    }

    // 丢包率评分（占比30%）
    if (this.qualityMetrics.packetsLost > this.thresholds.fair.packetsLost) {
      score -= 30;
    } else if (this.qualityMetrics.packetsLost > this.thresholds.good.packetsLost) {
      score -= 15;
    } else if (this.qualityMetrics.packetsLost > this.thresholds.excellent.packetsLost) {
      score -= 7.5;
    }

    // 抖动评分（占比30%）
    if (this.qualityMetrics.jitter > this.thresholds.fair.jitter) {
      score -= 30;
    } else if (this.qualityMetrics.jitter > this.thresholds.good.jitter) {
      score -= 15;
    } else if (this.qualityMetrics.jitter > this.thresholds.excellent.jitter) {
      score -= 7.5;
    }

    this.qualityMetrics.lastQualityScore = Math.max(0, Math.min(100, score));
    return this.qualityMetrics.lastQualityScore;
  }

  generateOptimizationSuggestions() {
    const suggestions = [];
    const { rtt, packetsLost, jitter, bandwidth } = this.qualityMetrics;

    // RTT优化建议
    if (rtt > this.thresholds.fair.rtt) {
      suggestions.push({
        type: 'critical',
        parameter: 'rtt',
        action: 'reduce_quality',
        value: this.adaptiveConfig.bitrateAdjustment.decrease * 1.5
      });
      // 触发控制优先级调整
      this.emit('latency-warning', {
        rtt,
        suggestion: 'increase_priority'
      });
    }

    // 丢包优化建议
    if (packetsLost > this.thresholds.fair.packetsLost) {
      suggestions.push({
        type: 'critical',
        parameter: 'bitrate',
        action: 'reduce_bitrate',
        value: this.adaptiveConfig.bitrateAdjustment.decrease
      });
      // 触发丢包警告
      this.emit('packet-loss-warning', {
        packetsLost,
        suggestion: 'merge_commands'
      });
    }

    // 抖动优化建议
    if (jitter > this.thresholds.fair.jitter) {
      suggestions.push({
        type: 'warning',
        parameter: 'resolution',
        action: 'reduce_resolution',
        value: 1
      });
    }

    // 带宽优化建议
    if (bandwidth < 70 && rtt < this.thresholds.good.rtt) {
      suggestions.push({
        type: 'improvement',
        parameter: 'bitrate',
        action: 'increase_bitrate',
        value: this.adaptiveConfig.bitrateAdjustment.increase
      });
    }

    return suggestions;
  }

  getQualityLevel() {
    const score = this.qualityMetrics.lastQualityScore;
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 60) return 'fair';
    return 'poor';
  }
}

module.exports = NetworkQualityService;