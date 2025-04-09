const EventEmitter = require('events');
const config = require('./config');

class WebRTCOptimizer extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = {
      bitrateThresholds: config.videoEncodingParams.bitrate,
      resolutionScales: config.videoEncodingParams.resolution.scales,
      qualityThresholds: config.networkQualityThresholds,
      adaptiveStrategy: config.adaptiveStrategy,
      ...options
    };

    this.currentSettings = {
      bitrate: this.options.bitrateThresholds.default,
      resolutionScale: this.options.adaptiveStrategy.resolution?.defaultScale || 1.0,
      frameRate: config.videoEncodingParams.frameRate.default,
      jitterBufferDelay: config.adaptiveStrategy.jitterBuffer.initial
    };

    this.bandwidthEstimator = {
      samples: [],
      windowSize: config.adaptiveStrategy.congestionControl.bandwidthEstimation.windowSize,
      weightRecent: config.adaptiveStrategy.congestionControl.bandwidthEstimation.weightRecent
    };
  }

  optimizeParameters(stats) {
    this.updateBandwidthEstimation(stats);
    const adjustments = this.calculateAdjustments(stats);
    this.applyAdjustments(adjustments);
    return this.currentSettings;
  }

  updateBandwidthEstimation(stats) {
    const { bandwidth } = stats;
    this.bandwidthEstimator.samples.push(bandwidth);
    if (this.bandwidthEstimator.samples.length > this.bandwidthEstimator.windowSize) {
      this.bandwidthEstimator.samples.shift();
    }
  }

  calculateAdjustments(stats) {
    const adjustments = {
      bitrate: 0,
      resolutionScale: 0,
      frameRate: 0,
      jitterBufferDelay: 0
    };

    // 基于带宽预估的调整
    const estimatedBandwidth = this.calculateEstimatedBandwidth();
    const bandwidthUtilization = (stats.bitrate / estimatedBandwidth) * 100;

    // 拥塞检测和快速恢复
    if (stats.rtt > this.options.adaptiveStrategy.congestionControl.rttThreshold) {
      this.handleCongestion(adjustments, stats);
    } else if (stats.rtt < this.options.adaptiveStrategy.congestionControl.fastRecovery.threshold) {
      this.handleFastRecovery(adjustments, stats, bandwidthUtilization);
    }

    // 基于丢包率和带宽利用率的综合调整
    if (stats.packetsLost > this.options.qualityThresholds.fair.packetsLost || bandwidthUtilization > 90) {
      adjustments.bitrate = Math.min(adjustments.bitrate, this.options.adaptiveStrategy.bitrateAdjustment.decrease * 1.2);
      adjustments.resolutionScale = 1;
      adjustments.frameRate = this.options.adaptiveStrategy.frameRateAdjustment.decrease;
      
      // 触发带宽预警事件
      this.emit('bandwidth-warning', {
        packetsLost: stats.packetsLost,
        bandwidthUtilization,
        currentBitrate: stats.bitrate
      });
    }

    // 抖动缓冲调整
    this.adjustJitterBuffer(adjustments, stats);

    // 基于帧率的自适应调整
    if (stats.frameRate < this.options.videoEncodingParams.frameRate.min * 1.5) {
      adjustments.resolutionScale = Math.max(adjustments.resolutionScale, 1);
      adjustments.bitrate = Math.min(adjustments.bitrate, this.options.adaptiveStrategy.bitrateAdjustment.decrease);
    }

    return adjustments;
  }

  handleCongestion(adjustments, stats) {
    const congestionConfig = this.options.adaptiveStrategy.congestionControl;
    adjustments.bitrate = this.options.adaptiveStrategy.bitrateAdjustment.decrease * 1.5;
    adjustments.frameRate = this.options.adaptiveStrategy.frameRateAdjustment.decrease;
    adjustments.resolutionScale = 1;

    this.emit('congestion-detected', {
      rtt: stats.rtt,
      threshold: congestionConfig.rttThreshold
    });
  }

  handleFastRecovery(adjustments, stats, bandwidthUtilization) {
    const fastRecovery = this.options.adaptiveStrategy.congestionControl.fastRecovery;
    if (fastRecovery.enabled && bandwidthUtilization < 70) {
      adjustments.bitrate = fastRecovery.stepSize;
      adjustments.frameRate = this.options.adaptiveStrategy.frameRateAdjustment.increase;
      if (stats.rtt < this.options.qualityThresholds.good.rtt) {
        adjustments.resolutionScale = -1;
      }
    }
  }

  calculateEstimatedBandwidth() {
    if (this.bandwidthEstimator.samples.length === 0) {
      return this.currentSettings.bitrate;
    }

    // 使用指数加权移动平均计算带宽估计值
    const weightedSum = this.bandwidthEstimator.samples.reduce((sum, value, index) => {
      const weight = Math.pow(this.bandwidthEstimator.weightRecent, 
        this.bandwidthEstimator.samples.length - index - 1);
      return sum + value * weight;
    }, 0);

    const weightSum = this.bandwidthEstimator.samples.reduce((sum, _, index) => {
      return sum + Math.pow(this.bandwidthEstimator.weightRecent, 
        this.bandwidthEstimator.samples.length - index - 1);
    }, 0);

    const estimatedBandwidth = weightedSum / weightSum;
    return Math.max(estimatedBandwidth, this.options.bitrateThresholds.min);
  }

  adjustJitterBuffer(adjustments, stats) {
    const jitterConfig = this.options.adaptiveStrategy.jitterBuffer;
    const currentJitter = stats.jitter;

    // 根据当前抖动值动态调整缓冲区
    if (currentJitter > this.currentSettings.jitterBufferDelay * 1.5) {
      adjustments.jitterBufferDelay = Math.min(
        jitterConfig.adjustmentStep,
        jitterConfig.max - this.currentSettings.jitterBufferDelay
      );
    } else if (currentJitter < this.currentSettings.jitterBufferDelay * 0.5) {
      adjustments.jitterBufferDelay = Math.max(
        -jitterConfig.adjustmentStep,
        jitterConfig.min - this.currentSettings.jitterBufferDelay
      );
    }

    // 触发抖动缓冲区调整事件
    if (adjustments.jitterBufferDelay !== 0) {
      this.emit('jitter-buffer-adjusted', {
        currentJitter,
        newDelay: this.currentSettings.jitterBufferDelay + adjustments.jitterBufferDelay
      });
    }
  }

  calculateEstimatedBandwidth() {
    if (this.bandwidthEstimator.samples.length === 0) {
      return this.currentSettings.bitrate;
    }

    const weightedSum = this.bandwidthEstimator.samples.reduce((sum, value, index) => {
      const weight = Math.pow(this.bandwidthEstimator.weightRecent, 
        this.bandwidthEstimator.samples.length - index - 1);
      return sum + value * weight;
    }, 0);

    const weightSum = this.bandwidthEstimator.samples.reduce((sum, _, index) => {
      return sum + Math.pow(this.bandwidthEstimator.weightRecent, 
        this.bandwidthEstimator.samples.length - index - 1);
    }, 0);

    return weightedSum / weightSum;
  }

  applyAdjustments(adjustments) {
    // 调整码率
    const newBitrate = this.currentSettings.bitrate * (1 + adjustments.bitrate);
    this.currentSettings.bitrate = Math.min(
      Math.max(newBitrate, this.options.bitrateThresholds.min),
      this.options.bitrateThresholds.max
    );

    // 调整分辨率缩放
    const currentScaleIndex = this.options.resolutionScales.indexOf(this.currentSettings.resolutionScale);
    const newScaleIndex = Math.min(
      Math.max(currentScaleIndex + adjustments.resolutionScale, 0),
      this.options.resolutionScales.length - 1
    );
    this.currentSettings.resolutionScale = this.options.resolutionScales[newScaleIndex];

    // 调整帧率
    const newFrameRate = this.currentSettings.frameRate + adjustments.frameRate;
    this.currentSettings.frameRate = Math.min(
      Math.max(newFrameRate, config.videoEncodingParams.frameRate.min),
      config.videoEncodingParams.frameRate.max
    );

    // 调整抖动缓冲
    this.currentSettings.jitterBufferDelay += adjustments.jitterBufferDelay;
    this.currentSettings.jitterBufferDelay = Math.min(
      Math.max(
        this.currentSettings.jitterBufferDelay,
        config.adaptiveStrategy.jitterBuffer.min
      ),
      config.adaptiveStrategy.jitterBuffer.max
    );

    this.emit('settings-updated', this.currentSettings);
  }
}

module.exports = WebRTCOptimizer;