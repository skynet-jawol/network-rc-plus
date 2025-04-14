/**
 * 性能优化服务
 * 集成异步任务队列和内存管理的优化功能
 */

const AsyncTaskQueue = require('../utils/AsyncTaskQueue');
const MemoryManager = require('../utils/MemoryManager');
const { EventEmitter } = require('events');

class PerformanceOptimizer extends EventEmitter {
  constructor(options = {}) {
    super();
    
    // 初始化异步任务队列
    this.taskQueue = new AsyncTaskQueue({
      maxConcurrent: options.maxConcurrent || 10,
      timeout: options.taskTimeout || 30000,
      retryAttempts: options.retryAttempts || 3
    });

    // 初始化内存管理器
    this.memoryManager = new MemoryManager({
      heapThreshold: options.heapThreshold || 0.85,
      gcInterval: options.gcInterval || 300000,
      memoryLimit: options.memoryLimit || 0,
      cleanupInterval: options.cleanupInterval || 60000
    });

    // 性能指标
    this.metrics = {
      taskQueueMetrics: null,
      memoryMetrics: null,
      systemLoad: {
        cpu: 0,
        memory: 0,
        timestamp: 0
      }
    };

    this.setupEventListeners();
    this.startMonitoring();
  }

  /**
   * 设置事件监听器
   */
  setupEventListeners() {
    // 监听内存警告
    this.memoryManager.on('memory-warning', (warning) => {
      this.emit('performance-warning', {
        type: 'memory',
        ...warning
      });
    });

    // 监听任务队列状态
    this.taskQueue.on('queue-full', () => {
      this.emit('performance-warning', {
        type: 'task-queue',
        message: '任务队列已满'
      });
    });
  }

  /**
   * 开始性能监控
   */
  startMonitoring() {
    setInterval(() => {
      this.updateMetrics();
    }, 5000);
  }

  /**
   * 更新性能指标
   */
  updateMetrics() {
    // 更新任务队列指标
    this.metrics.taskQueueMetrics = this.taskQueue.getStatus();

    // 更新内存指标
    this.metrics.memoryMetrics = this.memoryManager.getStats();

    // 更新系统负载
    this.updateSystemLoad();

    // 发送指标更新事件
    this.emit('metrics-update', this.metrics);
  }

  /**
   * 更新系统负载信息
   */
  updateSystemLoad() {
    const cpuUsage = process.cpuUsage();
    const memoryUsage = process.memoryUsage();

    this.metrics.systemLoad = {
      cpu: (cpuUsage.user + cpuUsage.system) / 1000000, // 转换为秒
      memory: memoryUsage.heapUsed / memoryUsage.heapTotal,
      timestamp: Date.now()
    };
  }

  /**
   * 添加异步任务
   * @param {Function} task 异步任务函数
   * @param {Object} options 任务配置选项
   * @returns {Promise} 任务执行结果
   */
  async addTask(task, options = {}) {
    return this.taskQueue.enqueue(task, options);
  }

  /**
   * 注册资源追踪
   * @param {string} resourceId 资源ID
   * @param {Object} resource 资源对象
   */
  trackResource(resourceId, resource) {
    this.memoryManager.trackResource(resourceId, resource);
  }

  /**
   * 释放资源
   * @param {string} resourceId 资源ID
   */
  releaseResource(resourceId) {
    this.memoryManager.releaseResource(resourceId);
  }

  /**
   * 获取当前性能状态
   * @returns {Object} 性能状态数据
   */
  getStatus() {
    return {
      ...this.metrics,
      timestamp: Date.now()
    };
  }

  /**
   * 手动触发资源清理
   */
  cleanup() {
    this.taskQueue.cleanup();
    this.memoryManager.cleanup();
  }
}

module.exports = PerformanceOptimizer;