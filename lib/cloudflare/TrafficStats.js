const EventEmitter = require('events');
const logger = require('../logger');

class TrafficStats extends EventEmitter {
  constructor() {
    super();
    this.stats = {
      bytesIn: 0,
      bytesOut: 0,
      requestCount: 0,
      lastUpdate: Date.now(),
      history: []
    };
    this.config = {
      historyLength: 24 * 60, // 保存24小时的分钟级数据
      warningThreshold: 1024 * 1024 * 1024, // 1GB警告阈值
      criticalThreshold: 5 * 1024 * 1024 * 1024 // 5GB临界阈值
    };
  }

  updateStats(data) {
    const { bytesIn, bytesOut, requestCount } = data;
    this.stats.bytesIn += bytesIn || 0;
    this.stats.bytesOut += bytesOut || 0;
    this.stats.requestCount += requestCount || 0;
    this.stats.lastUpdate = Date.now();

    this._checkThresholds();
    this._updateHistory();
    this.emit('stats-update', this.getStats());
  }

  getStats() {
    return {
      ...this.stats,
      totalBytes: this.stats.bytesIn + this.stats.bytesOut,
      avgBytesPerRequest: this._calculateAvgBytesPerRequest()
    };
  }

  _calculateAvgBytesPerRequest() {
    if (this.stats.requestCount === 0) return 0;
    return Math.floor((this.stats.bytesIn + this.stats.bytesOut) / this.stats.requestCount);
  }

  _checkThresholds() {
    const totalBytes = this.stats.bytesIn + this.stats.bytesOut;
    
    if (totalBytes >= this.config.criticalThreshold) {
      logger.error('流量使用达到临界值！', { totalBytes });
      this.emit('traffic-critical', { totalBytes });
    } else if (totalBytes >= this.config.warningThreshold) {
      logger.warn('流量使用达到警告值', { totalBytes });
      this.emit('traffic-warning', { totalBytes });
    }
  }

  _updateHistory() {
    const currentStats = {
      timestamp: Date.now(),
      bytesIn: this.stats.bytesIn,
      bytesOut: this.stats.bytesOut,
      requestCount: this.stats.requestCount
    };

    this.stats.history.push(currentStats);
    if (this.stats.history.length > this.config.historyLength) {
      this.stats.history.shift();
    }
  }

  getHistory(duration = 3600000) { // 默认返回1小时的数据
    const now = Date.now();
    return this.stats.history.filter(stat => (now - stat.timestamp) <= duration);
  }

  resetStats() {
    this.stats.bytesIn = 0;
    this.stats.bytesOut = 0;
    this.stats.requestCount = 0;
    this.stats.lastUpdate = Date.now();
    this.stats.history = [];
    logger.info('流量统计已重置');
    this.emit('stats-reset');
  }
}

module.exports = TrafficStats;