/**
 * 网络优化器
 * 负责处理网络状态监控和自适应优化
 */

const EventEmitter = require('events');

class NetworkOptimizer extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = {
      minBitrate: 100000,  // 最小码率 (100kbps)
      maxBitrate: 2000000, // 最大码率 (2Mbps)
      targetLatency: 200,  // 目标延迟 (ms)
      measureInterval: 1000, // 测量间隔 (ms)
      ...options
    };

    this.stats = {
      currentBitrate: this.options.maxBitrate,
      rtt: 0,
      packetLoss: 0,
      jitter: 0,
      lastUpdate: Date.now()
    };

    this.init();
  }

  init() {
    this._startMonitoring();
  }

  _startMonitoring() {
    setInterval(() => {
      this._measureNetworkStats();
      this._adjustParameters();
    }, this.options.measureInterval);
  }

  async _measureNetworkStats() {
    try {
      // 测量RTT
      const startTime = Date.now();
      const rtt = await this._measureRTT();
      
      // 更新网络状态
      this.stats = {
        ...this.stats,
        rtt,
        lastUpdate: startTime
      };

      this.emit('stats', this.stats);
    } catch (error) {
      this.emit('error', error);
    }
  }

  _adjustParameters() {
    const { rtt, currentBitrate, packetLoss, jitter } = this.stats;
    const { targetLatency, minBitrate, maxBitrate } = this.options;

    // 网络质量评分 (0-100)
    const networkScore = this._calculateNetworkScore();

    // 基于综合评分调整码率
    let newBitrate = currentBitrate;
    
    if (networkScore < 60) {
      // 网络状况差，大幅降低码率
      newBitrate = Math.max(currentBitrate * 0.6, minBitrate);
      this.emit('networkWarning', '网络状况不佳，已降低视频质量');
    } else if (networkScore < 80) {
      // 网络状况一般，适度降低码率
      newBitrate = Math.max(currentBitrate * 0.8, minBitrate);
    } else if (networkScore > 90) {
      // 网络状况优秀，提高码率
      newBitrate = Math.min(currentBitrate * 1.2, maxBitrate);
    }

    // 更新码率
    if (newBitrate !== currentBitrate) {
      this.stats.currentBitrate = newBitrate;
      this.emit('bitrateChange', newBitrate);
    }

    // 发送网络状态报告
    this.emit('networkReport', {
      score: networkScore,
      rtt,
      packetLoss,
      jitter,
      bitrate: newBitrate
    });
  }

  async _measureRTT() {
    return new Promise((resolve, reject) => {
      try {
        const startTime = Date.now();
        // 发送ping消息
        this.emit('ping');

        // 设置超时处理
        const timeoutId = setTimeout(() => {
          reject(new Error('RTT测量超时'));
        }, 5000);

        // 监听pong响应
        const onPong = () => {
          clearTimeout(timeoutId);
          const endTime = Date.now();
          const rtt = endTime - startTime;
          resolve(rtt);
        };

        this.once('pong', onPong);
      } catch (error) {
        reject(error);
      }
    });
  }

  // 外部接口
  getStats() {
    return { ...this.stats };
  }

  setTargetLatency(latency) {
    this.options.targetLatency = latency;
  }

  setBitrateRange(min, max) {
    this.options.minBitrate = min;
    this.options.maxBitrate = max;
  }
}

module.exports = NetworkOptimizer;