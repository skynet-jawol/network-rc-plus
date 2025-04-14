/**
 * 异步任务队列管理器
 * 用于优化异步处理和内存管理
 */

class AsyncTaskQueue {
  constructor(options = {}) {
    this.maxConcurrent = options.maxConcurrent || 5;
    this.timeout = options.timeout || 30000;
    this.retryAttempts = options.retryAttempts || 3;
    this.queue = [];
    this.running = new Set();
    this.completed = new Set();
    this.failed = new Map();
    
    // 性能指标
    this.metrics = {
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      averageExecutionTime: 0,
      totalExecutionTime: 0
    };
  }

  /**
   * 添加任务到队列
   * @param {Function} task 异步任务函数
   * @param {Object} options 任务配置选项
   * @returns {Promise} 任务执行结果
   */
  async enqueue(task, options = {}) {
    const taskId = Symbol('task');
    const taskWrapper = {
      id: taskId,
      task,
      options: {
        ...options,
        timeout: options.timeout || this.timeout,
        retryAttempts: options.retryAttempts || this.retryAttempts
      },
      startTime: null,
      attempts: 0
    };

    this.queue.push(taskWrapper);
    this.metrics.totalTasks++;
    
    // 尝试执行队列
    this.processQueue();

    return new Promise((resolve, reject) => {
      taskWrapper.resolve = resolve;
      taskWrapper.reject = reject;
    });
  }

  /**
   * 处理队列中的任务
   */
  async processQueue() {
    if (this.running.size >= this.maxConcurrent) return;

    while (this.queue.length > 0 && this.running.size < this.maxConcurrent) {
      const taskWrapper = this.queue.shift();
      this.running.add(taskWrapper.id);
      
      this.executeTask(taskWrapper).finally(() => {
        this.running.delete(taskWrapper.id);
        this.processQueue();
      });
    }
  }

  /**
   * 执行单个任务
   * @param {Object} taskWrapper 任务包装器
   */
  async executeTask(taskWrapper) {
    taskWrapper.startTime = Date.now();
    taskWrapper.attempts++;

    try {
      // 创建带超时的Promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Task timeout after ${taskWrapper.options.timeout}ms`));
        }, taskWrapper.options.timeout);
      });

      // 执行任务
      const result = await Promise.race([
        taskWrapper.task(),
        timeoutPromise
      ]);

      // 更新指标
      const executionTime = Date.now() - taskWrapper.startTime;
      this.metrics.totalExecutionTime += executionTime;
      this.metrics.completedTasks++;
      this.metrics.averageExecutionTime = 
        this.metrics.totalExecutionTime / this.metrics.completedTasks;

      this.completed.add(taskWrapper.id);
      taskWrapper.resolve(result);
    } catch (error) {
      if (taskWrapper.attempts < taskWrapper.options.retryAttempts) {
        // 重试任务
        this.queue.unshift(taskWrapper);
        return;
      }

      // 任务最终失败
      this.metrics.failedTasks++;
      this.failed.set(taskWrapper.id, error);
      taskWrapper.reject(error);
    }
  }

  /**
   * 清理已完成的任务数据
   */
  cleanup() {
    const now = Date.now();
    const CLEANUP_THRESHOLD = 3600000; // 1小时

    // 清理已完成任务的记录
    for (const taskId of this.completed) {
      const task = Array.from(this.running).find(t => t.id === taskId);
      if (task && (now - task.startTime) > CLEANUP_THRESHOLD) {
        this.completed.delete(taskId);
      }
    }

    // 清理失败任务的记录
    for (const [taskId, error] of this.failed) {
      if ((now - error.timestamp) > CLEANUP_THRESHOLD) {
        this.failed.delete(taskId);
      }
    }
  }

  /**
   * 获取队列状态
   * @returns {Object} 队列状态信息
   */
  getStatus() {
    return {
      queueLength: this.queue.length,
      runningTasks: this.running.size,
      completedTasks: this.completed.size,
      failedTasks: this.failed.size,
      metrics: { ...this.metrics }
    };
  }

  /**
   * 重置队列
   */
  reset() {
    this.queue = [];
    this.running.clear();
    this.completed.clear();
    this.failed.clear();
    this.metrics = {
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      averageExecutionTime: 0,
      totalExecutionTime: 0
    };
  }
}

module.exports = AsyncTaskQueue;