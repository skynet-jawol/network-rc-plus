const { EventEmitter } = require('events');

class WebRTCMonitor extends EventEmitter {
  constructor() {
    super();
    this.stats = {
      rtt: 0,
      packetsLost: 0,
      bitrate: 0,
      jitter: 0,
      frameRate: 0,
      resolution: { width: 0, height: 0 },
      connectionState: 'new',
      bandwidth: 0,
      availableOutgoingBitrate: 0,
      availableIncomingBitrate: 0,
      networkType: '',
      qualityScore: 100,
      // 新增性能指标
      framesDropped: 0,
      framesDecoded: 0,
      nackCount: 0,
      pliCount: 0,
      qpSum: 0
    };
    this.lastPacketCount = 0;
    this.lastByteCount = 0;
    this.lastTimestamp = 0;
    this.networkQualityThresholds = {
      excellent: { rtt: 100, packetsLost: 1, jitter: 30 },
      good: { rtt: 200, packetsLost: 3, jitter: 50 },
      fair: { rtt: 400, packetsLost: 7, jitter: 100 }
    };
  }

  async getStats(peerConnection) {
    try {
      const stats = await peerConnection.getStats();
      this.processStats(stats);
    } catch (error) {
      console.error('获取WebRTC统计数据失败:', error);
      this.emit('stats-error', error);
    }
  }

  processStats(stats) {
    stats.forEach(report => {
      switch (report.type) {
        case 'inbound-rtp':
          if (report.kind === 'video') {
            this.processVideoStats(report);
          } else if (report.kind === 'audio') {
            this.processAudioStats(report);
          }
          break;
        case 'candidate-pair':
          if (report.state === 'succeeded') {
            this.processConnectionStats(report);
          }
          break;
        case 'local-candidate':
          this.processLocalCandidate(report);
          break;
        case 'transport':
          this.processTransportStats(report);
          break;
        case 'track':
          if (report.kind === 'video') {
            this.processTrackStats(report);
          }
          break;
        case 'media-source':
          this.processMediaSourceStats(report);
          break;
      }
    });

    this.calculateQualityScore();
    this.generateOptimizationSuggestions();
    this.emit('stats-update', this.stats);
  }

  processAudioStats(report) {
    this.stats.audioStats = {
      packetsLost: report.packetsLost,
      jitter: report.jitter * 1000,
      bytesReceived: report.bytesReceived,
      packetsReceived: report.packetsReceived
    };
  }

  processMediaSourceStats(report) {
    if (report.kind === 'video') {
      this.stats.mediaSourceStats = {
        width: report.width,
        height: report.height,
        framesPerSecond: report.framesPerSecond,
        keyFramesEncoded: report.keyFramesEncoded
      };
    }
  }

  processVideoStats(report) {
    const now = Date.now();
    const timeDiff = now - this.lastTimestamp;

    if (timeDiff > 0 && this.lastTimestamp > 0) {
      const byteDiff = report.bytesReceived - this.lastByteCount;
      this.stats.bitrate = Math.floor((byteDiff * 8) / timeDiff * 1000);

      const packetDiff = report.packetsReceived - this.lastPacketCount;
      const packetsLost = report.packetsLost - this.stats.packetsLost;
      if (packetDiff > 0) {
        this.stats.packetsLost = (packetsLost / packetDiff) * 100;
      }

      if (this.stats.availableIncomingBitrate > 0) {
        this.stats.bandwidth = (this.stats.bitrate / this.stats.availableIncomingBitrate) * 100;
      }
    }

    this.lastByteCount = report.bytesReceived;
    this.lastPacketCount = report.packetsReceived;
    this.lastTimestamp = now;

    this.stats.frameRate = report.framesPerSecond;
    if (report.frameWidth && report.frameHeight) {
      this.stats.resolution = {
        width: report.frameWidth,
        height: report.frameHeight
      };
    }

    // 更新新增的性能指标
    this.stats.framesDropped = report.framesDropped;
    this.stats.framesDecoded = report.framesDecoded;
    this.stats.nackCount = report.nackCount;
    this.stats.pliCount = report.pliCount;
    this.stats.qpSum = report.qpSum;
    this.stats.jitter = report.jitter * 1000;
  }

  processConnectionStats(report) {
    this.stats.rtt = report.currentRoundTripTime * 1000;
    this.stats.availableOutgoingBitrate = report.availableOutgoingBitrate;
    this.stats.availableIncomingBitrate = report.availableIncomingBitrate;
    
    // 新增：计算带宽利用率
    const bandwidthUtilization = (this.stats.bitrate / this.stats.availableOutgoingBitrate) * 100;
    this.stats.bandwidthUtilization = Math.min(bandwidthUtilization, 100);

    // 新增：连接质量评估
    this.evaluateConnectionQuality();
  }

  evaluateConnectionQuality() {
    const { rtt, packetsLost, jitter, bandwidthUtilization } = this.stats;
    let qualityScore = 100;

    // RTT评分（占比30%）
    if (rtt > this.networkQualityThresholds.fair.rtt) {
      qualityScore -= 30;
    } else if (rtt > this.networkQualityThresholds.good.rtt) {
      qualityScore -= 15;
    }

    // 丢包率评分（占比30%）
    if (packetsLost > this.networkQualityThresholds.fair.packetsLost) {
      qualityScore -= 30;
    } else if (packetsLost > this.networkQualityThresholds.good.packetsLost) {
      qualityScore -= 15;
    }

    // 抖动评分（占比20%）
    if (jitter > this.networkQualityThresholds.fair.jitter) {
      qualityScore -= 20;
    } else if (jitter > this.networkQualityThresholds.good.jitter) {
      qualityScore -= 10;
    }

    // 带宽利用率评分（占比20%）
    if (bandwidthUtilization > 90) {
      qualityScore -= 20;
    } else if (bandwidthUtilization > 75) {
      qualityScore -= 10;
    }

    this.stats.qualityScore = Math.max(0, qualityScore);

    // 触发网络质量变化事件
    this.emit('quality-change', {
      score: this.stats.qualityScore,
      metrics: {
        rtt,
        packetsLost,
        jitter,
        bandwidthUtilization
      }
    });
  }

  processLocalCandidate(report) {
    if (report.candidateType === 'relay') {
      this.stats.networkType = 'TURN';
    } else if (report.candidateType === 'srflx') {
      this.stats.networkType = 'STUN';
    } else if (report.candidateType === 'host') {
      this.stats.networkType = 'P2P';
    }
  }

  processTrackStats(report) {
    if (report.kind === 'video') {
      this.stats.frameWidth = report.frameWidth;
      this.stats.frameHeight = report.frameHeight;
      this.stats.framesReceived = report.framesReceived;
      this.stats.framesDecoded = report.framesDecoded;
    }
  }

  processTransportStats(report) {
    if (report.dtlsState) {
      this.stats.dtlsState = report.dtlsState;
    }
  }

  calculateQualityScore() {
    let score = 100;
    const { rtt, packetsLost, jitter, framesDropped, frameRate } = this.stats;
    const { excellent, good, fair } = this.networkQualityThresholds;

    // RTT评分
    if (rtt > fair.rtt) score -= 30;
    else if (rtt > good.rtt) score -= 20;
    else if (rtt > excellent.rtt) score -= 10;

    // 丢包率评分
    if (packetsLost > fair.packetsLost) score -= 30;
    else if (packetsLost > good.packetsLost) score -= 20;
    else if (packetsLost > excellent.packetsLost) score -= 10;

    // 抖动评分
    if (jitter > fair.jitter) score -= 20;
    else if (jitter > good.jitter) score -= 15;
    else if (jitter > excellent.jitter) score -= 5;

    // 帧率评分
    if (frameRate < 15) score -= 20;
    else if (frameRate < 24) score -= 10;

    // 丢帧评分
    if (framesDropped > 0) {
      const dropRate = (framesDropped / this.stats.framesDecoded) * 100;
      if (dropRate > 5) score -= 20;
      else if (dropRate > 2) score -= 10;
    }

    this.stats.qualityScore = Math.max(0, score);
  }

  generateOptimizationSuggestions() {
    const suggestions = [];
    const { rtt, packetsLost, bitrate, frameRate, qualityScore, jitter, bandwidth, framesDropped, nackCount, pliCount } = this.stats;

    if (qualityScore < 60) {
      suggestions.push({
        type: 'critical',
        message: '网络质量较差，建议降低视频质量设置',
        metrics: { qualityScore, bitrate, frameRate },
        action: 'reduce_quality'
      });
    }

    if (rtt > 400) {
      suggestions.push({
        type: 'warning',
        message: '网络延迟较高，建议检查网络连接',
        metrics: { rtt, jitter },
        action: 'check_network'
      });
    }

    if (packetsLost > 5) {
      suggestions.push({
        type: 'warning',
        message: '丢包率较高，建议降低码率',
        metrics: { packetsLost, currentBitrate: bitrate, bandwidth },
        action: 'reduce_bitrate'
      });
    }

    if (frameRate < 15) {
      suggestions.push({
        type: 'warning',
        message: '帧率过低，建议降低分辨率',
        metrics: { frameRate, framesDropped },
        action: 'reduce_resolution'
      });
    }

    if (nackCount > 100 || pliCount > 50) {
      suggestions.push({
        type: 'warning',
        message: '视频解码错误率较高，建议检查网络稳定性',
        metrics: { nackCount, pliCount },
        action: 'check_stability'
      });
    }

    if (bandwidth > 90) {
      suggestions.push({
        type: 'warning',
        message: '带宽使用率较高，建议优化网络环境',
        metrics: { bandwidth, bitrate },
        action: 'optimize_bandwidth'
      });
    }

    if (suggestions.length > 0) {
      this.emit('optimization-suggestions', suggestions);
    }

    return suggestions;
  }

  updateConnectionState(state) {
    this.stats.connectionState = state;
    this.emit('connection-state', state);
  }

  getPerformanceReport() {
    return {
      timestamp: Date.now(),
      ...this.stats,
      suggestions: this.generateOptimizationSuggestions()
    };
  }
}

module.exports = WebRTCMonitor;