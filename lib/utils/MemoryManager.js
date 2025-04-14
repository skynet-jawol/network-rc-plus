/**
 * 内存管理优化器
 * 用于监控和优化系统内存使用
 */

const { EventEmitter } = require('events');

class MemoryManager extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = {
      heapThreshold: options.heapThreshold || 0.85, // 堆内存使用阈值（85%）
      gcInterval: options.gcInterval || 300000,    // GC检查间隔（5分钟）
      memoryLimit: options.memoryLimit || 0,       // 内存限制（0表示使用系统默认）
      cleanupInterval: options.cleanupInterval || 60000 // 清理间隔（1分钟）
    };

    this.stats = {
      heapUsed: 0,
      heapTotal: 0,
      external: 0,
      gcCount: 0,
      lastGC: 0,
      memoryLeaks: new Map()
    };

    this.resourceTracking = new Map();
    this.startMonitoring();
  }

  /**
   * 开始内存监控
   */
  startMonitoring() {
    // 定期检查内存使用情况
    setInterval(() => {
      this.checkMemoryUsage();
    }, 10000);

    // 定期进行资源清理
    setInterval(() => {
      this.cleanup();
    }, this.options.cleanupInterval);

    // 定期检查是否需要GC
    setInterval(() => {
      this.checkGC();
    }, this.options.gcInterval);
  }

  /**
   * 检查内存使用情况
   */
  checkMemoryUsage() {
    const memoryUsage = process.memoryUsage();
    
    this.stats.heapUsed = memoryUsage.heapUsed;
    this.stats.heapTotal = memoryUsage.heapTotal;
    this.stats.external = memoryUsage.external;

    // 计算堆内存使用率
    const heapUsageRatio = memoryUsage.heapUsed / memoryUsage.heapTotal;

    // 如果超过阈值，触发警告事件
    if (heapUsageRatio > this.options.heapThreshold) {
      this.emit('memory-warning', {
        type: 'heap-threshold',
        usage: heapUsageRatio,
        threshold: this.options.heapThreshold
      });
    }

    // 检查内存泄漏
    this.detectMemoryLeaks();
  }

  /**
   * 注册资源追踪
   * @param {string} resourceId 资源ID
   * @param {Object} resource 资源对象
   */
  trackResource(resourceId, resource) {
    this.resourceTracking.set(resourceId, {
      resource,
      timestamp: Date.now(),
      size: this.estimateObjectSize(resource)
    });
  }

  /**
   * 释放资源
   * @param {string} resourceId 资源ID
   */
  releaseResource(resourceId) {
    const resource = this.resourceTracking.get(resourceId);
    if (resource) {
      // 执行资源清理
      if (typeof resource.resource.destroy === 'function') {
        resource.resource.destroy();
      } else if (typeof resource.resource.close === 'function') {
        resource.resource.close();
      }

      this.resourceTracking.delete(resourceId);
    }
  }

  /**
   * 检测内存泄漏
   */
  detectMemoryLeaks() {
    const now = Date.now();
    const LEAK_THRESHOLD = 3600000; // 1小时

    for (const [resourceId, data] of this.resourceTracking) {
      if (now - data.timestamp > LEAK_THRESHOLD) {
        // 记录可能的内存泄漏
        this.stats.memoryLeaks.set(resourceId, {
          size: data.size,
          age: now - data.timestamp
        });

        this.emit('memory-leak', {
          resourceId,
          size: data.size,
          age: now - data.timestamp
        });
      }
    }
  }

  /**
   * 估算对象大小
   * @param {Object} obj 要估算大小的对象
   * @returns {number} 估算的字节数
   */
  estimateObjectSize(obj) {
    const seen = new WeakSet();
    
    const sizeOf = (obj) => {
      if (obj === null || obj === undefined) return 0;
      if (typeof obj !== 'object') return 8;
      if (seen.has(obj)) return 0;

      seen.add(obj);
      let size = 0;

      for (let key in obj) {
        if (Object.hasOwnProperty.call(obj, key)) {
          size += sizeOf(obj[key]);
        }
      }

      return size;
    };

    return sizeOf(obj);
  }

  /**
   * 检查是否需要触发GC
   */
  checkGC() {
    const memoryUsage = process.memoryUsage();
    if (memoryUsage.heapUsed / memoryUsage.heapTotal > this.options.heapThreshold) {
      this.forceGC();
    }
  }

  /**
   * 强制执行垃圾回收
   */
  forceGC() {
    if (global.gc) {
      global.gc();
      this.stats.gcCount++;
      this.stats.lastGC = Date.now();
      this.emit('gc-completed', {
        count: this.stats.gcCount,
        timestamp: this.stats.lastGC
      });
    }
  }

  /**
   * 清理过期资源和记录
   */
  cleanup() {
    const now = Date.now();
    const CLEANUP_THRESHOLD = 3600000; // 1小时

    // 清理过期的内存泄漏记录
    for (const [resourceId, data] of this.stats.memoryLeaks) {
      if (now - data.timestamp > CLEANUP_THRESHOLD) {
        this.stats.memoryLeaks.delete(resourceId);
      }
    }

    // 触发清理完成事件
    this.emit('cleanup-completed', {
      timestamp: now
    });
  }

  /**
   * 获取内存使用统计
   * @returns {Object} 内存统计信息
   */
  getStats() {
    return {
      ...this.stats,
      memoryLeaks: Array.from(this.stats.memoryLeaks.entries()),
      trackedResources: this.resourceTracking.size
    };
  }
}

module.exports = MemoryManager;