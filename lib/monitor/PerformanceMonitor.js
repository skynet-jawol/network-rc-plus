/**
 * 系统性能监控模块
 */

const os = require('os');
const fs = require('fs');
const { EventEmitter } = require('events');
const { NetworkRCError } = require('../errors');

class PerformanceMonitor extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = {
      interval: options.interval || 5000, // 采集间隔，默认5秒
      thresholds: {
        cpu: options.cpuThreshold || 80, // CPU使用率阈值
        memory: options.memoryThreshold || 85, // 内存使用率阈值
        storage: options.storageThreshold || 90, // 存储使用率阈值
        responseTime: options.responseTimeThreshold || 1000 // 响应时间阈值
      }
    };

    this.metrics = {
      cpu: 0,
      memory: 0,
      uptime: 0,
      responseTime: 0,
      storage: 0
    };

    this.isRunning = false;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.monitor();
    this.interval = setInterval(() => this.monitor(), this.options.interval);
  }

  stop() {
    if (!this.isRunning) return;
    this.isRunning = false;
    clearInterval(this.interval);
  }

  async monitor() {
    try {
      // 采集CPU使用率
      const cpuUsage = await this.getCPUUsage();
      this.metrics.cpu = cpuUsage;

      // 采集内存使用率
      const memUsage = this.getMemoryUsage();
      this.metrics.memory = memUsage;

      // 采集磁盘使用率
      const storageUsage = await this.getStorageUsage();
      this.metrics.storage = storageUsage;

      // 获取系统运行时间
      this.metrics.uptime = os.uptime();

      // 发送性能指标事件
      this.emit('metrics', this.metrics);

      // 检查是否超过阈值
      this.checkThresholds();
    } catch (error) {
      this.emit('error', new NetworkRCError(5000, '性能指标采集失败', error));
    }
  }

  async getCPUUsage() {
    const cpus = os.cpus();
    const totalIdle = cpus.reduce((acc, cpu) => acc + cpu.times.idle, 0);
    const totalTick = cpus.reduce((acc, cpu) => 
      acc + Object.values(cpu.times).reduce((a, b) => a + b), 0
    );
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const cpusAfter = os.cpus();
    const totalIdleAfter = cpusAfter.reduce((acc, cpu) => acc + cpu.times.idle, 0);
    const totalTickAfter = cpusAfter.reduce((acc, cpu) => 
      acc + Object.values(cpu.times).reduce((a, b) => a + b), 0
    );
    
    const idleDiff = totalIdleAfter - totalIdle;
    const totalDiff = totalTickAfter - totalTick;
    
    return 100 - (100 * idleDiff / totalDiff);
  }

  getMemoryUsage() {
    const total = os.totalmem();
    const free = os.freemem();
    return ((total - free) / total) * 100;
  }

  checkThresholds() {
    const { cpu, memory, storage } = this.metrics;
    const { thresholds } = this.options;

    if (cpu > thresholds.cpu) {
      this.emit('threshold_exceeded', {
        metric: 'cpu',
        value: cpu,
        threshold: thresholds.cpu
      });
    }

    if (memory > thresholds.memory) {
      this.emit('threshold_exceeded', {
        metric: 'memory',
        value: memory,
        threshold: thresholds.memory
      });
    }

    if (storage > thresholds.storage) {
      this.emit('threshold_exceeded', {
        metric: 'storage',
        value: storage,
        threshold: thresholds.storage
      });
    }
  }

  getMetrics() {
    return this.metrics;
  }

  async getStorageUsage() {
    return new Promise((resolve, reject) => {
      fs.statvfs('/', (error, stats) => {
        if (error) {
          reject(error);
          return;
        }
        const total = stats.blocks * stats.bsize;
        const free = stats.bfree * stats.bsize;
        const used = total - free;
        const usagePercentage = (used / total) * 100;
        resolve(usagePercentage);
      });
    });
  }
}

module.exports = PerformanceMonitor;