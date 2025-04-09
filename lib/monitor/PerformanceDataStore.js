const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');

class PerformanceDataStore extends EventEmitter {
  constructor(options = {}) {
    super();
    this.dataDir = options.dataDir || path.join(process.cwd(), 'data', 'performance');
    this.maxHistoryDays = options.maxHistoryDays || 7;
    this.initialized = false;
    this.currentDayData = [];
    this.dailyStats = new Map();

    this.init();
  }

  async init() {
    try {
      await fs.promises.mkdir(this.dataDir, { recursive: true });
      this.initialized = true;
      await this.loadHistoricalData();
      this.startPeriodicCleanup();
    } catch (error) {
      console.error('性能数据存储初始化失败:', error);
    }
  }

  async loadHistoricalData() {
    try {
      const files = await fs.promises.readdir(this.dataDir);
      const dataFiles = files.filter(file => file.endsWith('.json'));

      for (const file of dataFiles) {
        const date = file.replace('.json', '');
        const content = await fs.promises.readFile(
          path.join(this.dataDir, file),
          'utf8'
        );
        this.dailyStats.set(date, JSON.parse(content));
      }
    } catch (error) {
      console.error('加载历史数据失败:', error);
    }
  }

  async storePerformanceData(data) {
    if (!this.initialized) return;

    const now = new Date();
    const today = now.toISOString().split('T')[0];

    this.currentDayData.push({
      timestamp: now.getTime(),
      ...data
    });

    // 每100条数据进行一次汇总
    if (this.currentDayData.length >= 100) {
      await this.summarizeDailyData(today);
    }
  }

  async summarizeDailyData(date) {
    if (this.currentDayData.length === 0) return;

    const summary = {
      date,
      samples: this.currentDayData.length,
      averages: {
        rtt: this.calculateAverage(this.currentDayData, 'rtt'),
        bitrate: this.calculateAverage(this.currentDayData, 'bitrate'),
        packetsLost: this.calculateAverage(this.currentDayData, 'packetsLost'),
        frameRate: this.calculateAverage(this.currentDayData, 'frameRate'),
        qualityScore: this.calculateAverage(this.currentDayData, 'qualityScore')
      },
      peaks: {
        rtt: this.findPeak(this.currentDayData, 'rtt'),
        bitrate: this.findPeak(this.currentDayData, 'bitrate'),
        packetsLost: this.findPeak(this.currentDayData, 'packetsLost')
      },
      timeRanges: {
        start: this.currentDayData[0].timestamp,
        end: this.currentDayData[this.currentDayData.length - 1].timestamp
      }
    };

    this.dailyStats.set(date, summary);
    await this.saveDailySummary(date, summary);
    this.currentDayData = [];
  }

  calculateAverage(data, field) {
    const sum = data.reduce((acc, item) => acc + (item[field] || 0), 0);
    return sum / data.length;
  }

  findPeak(data, field) {
    return Math.max(...data.map(item => item[field] || 0));
  }

  async saveDailySummary(date, summary) {
    try {
      await fs.promises.writeFile(
        path.join(this.dataDir, `${date}.json`),
        JSON.stringify(summary, null, 2)
      );
    } catch (error) {
      console.error(`保存${date}性能数据摘要失败:`, error);
    }
  }

  async getPerformanceReport(days = 7) {
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - days);

    const report = {
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      dailyStats: [],
      trends: {
        rtt: [],
        bitrate: [],
        packetsLost: [],
        qualityScore: []
      }
    };

    for (const [date, summary] of this.dailyStats) {
      if (new Date(date) >= startDate && new Date(date) <= endDate) {
        report.dailyStats.push(summary);
        report.trends.rtt.push({
          date,
          value: summary.averages.rtt
        });
        report.trends.bitrate.push({
          date,
          value: summary.averages.bitrate
        });
        report.trends.packetsLost.push({
          date,
          value: summary.averages.packetsLost
        });
        report.trends.qualityScore.push({
          date,
          value: summary.averages.qualityScore
        });
      }
    }

    return report;
  }

  startPeriodicCleanup() {
    setInterval(async () => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.maxHistoryDays);

      const files = await fs.promises.readdir(this.dataDir);
      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        const date = file.replace('.json', '');
        if (new Date(date) < cutoffDate) {
          try {
            await fs.promises.unlink(path.join(this.dataDir, file));
            this.dailyStats.delete(date);
          } catch (error) {
            console.error(`清理过期数据文件${file}失败:`, error);
          }
        }
      }
    }, 24 * 60 * 60 * 1000); // 每24小时执行一次清理
  }
}

module.exports = PerformanceDataStore;