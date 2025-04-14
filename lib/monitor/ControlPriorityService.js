const { EventEmitter } = require('events');
const config = require('./config');

class ControlPriorityService extends EventEmitter {
  constructor() {
    super();
    this.commandQueue = [];
    this.networkQuality = 'good';
    this.processingInterval = 50; // 默认处理间隔（毫秒）
    this.priorityLevels = {
      emergency: 0,  // 紧急指令（如紧急停止）
      critical: 1,   // 关键指令（如方向控制）
      normal: 2,     // 普通指令
      low: 3         // 低优先级指令
    };

    this.startProcessing();
  }

  addCommand(command) {
    const prioritizedCommand = this.assignPriority(command);
    this.commandQueue.push(prioritizedCommand);
    this.sortQueue();
    this.emit('command-added', prioritizedCommand);
  }

  assignPriority(command) {
    const { type, value } = command;
    let priority = this.priorityLevels.normal;

    // 根据指令类型分配优先级
    switch (type) {
      case 'emergency_stop':
        priority = this.priorityLevels.emergency;
        break;
      case 'direction':
      case 'speed':
        priority = this.priorityLevels.critical;
        break;
      case 'camera':
      case 'light':
        priority = this.priorityLevels.normal;
        break;
      default:
        priority = this.priorityLevels.low;
    }

    return {
      ...command,
      priority,
      timestamp: Date.now()
    };
  }

  sortQueue() {
    this.commandQueue.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return a.timestamp - b.timestamp;
    });
  }

  updateNetworkQuality(quality) {
    this.networkQuality = quality;
    this.adjustProcessingStrategy();
  }

  adjustProcessingStrategy() {
    // 根据网络质量调整处理策略
    switch (this.networkQuality) {
      case 'poor':
        this.processingInterval = 100; // 降低处理频率
        this.mergeCommands();          // 启用指令合并
        break;
      case 'fair':
        this.processingInterval = 75;
        this.mergeCommands();
        break;
      case 'good':
        this.processingInterval = 50;
        break;
      case 'excellent':
        this.processingInterval = 25; // 提高处理频率
        break;
    }

    this.emit('strategy-updated', {
      quality: this.networkQuality,
      interval: this.processingInterval
    });
  }

  mergeCommands() {
    // 合并相同类型的连续指令
    const merged = [];
    let lastCommand = null;
    const mergeWindow = 50; // 50ms内的相同类型指令可以合并

    for (const command of this.commandQueue) {
      if (!lastCommand || 
          lastCommand.type !== command.type || 
          (command.timestamp - lastCommand.timestamp) > mergeWindow) {
        merged.push(command);
        lastCommand = command;
      } else {
        // 更新最后一条指令的值
        lastCommand.value = command.value;
        lastCommand.timestamp = command.timestamp;
      }
    }

    // 更新队列并触发事件
    this.commandQueue = merged;
    this.emit('commands-merged', {
      count: this.commandQueue.length,
      quality: this.networkQuality
    });
  }

  startProcessing() {
    setInterval(() => {
      if (this.commandQueue.length > 0) {
        const command = this.commandQueue.shift();
        
        // 根据网络质量调整指令处理
        if (this.networkQuality === 'poor' && command.priority > this.priorityLevels.critical) {
          // 在网络质量差的情况下，丢弃低优先级指令
          this.emit('command-dropped', command);
          return;
        }

        this.emit('command-processed', command);
      }
    }, this.processingInterval);
  }
          lastCommand.type !== command.type || 
          command.priority <= this.priorityLevels.critical) {
        merged.push(command);
        lastCommand = command;
      } else {
        // 更新最后一个指令的值
        lastCommand.value = command.value;
        lastCommand.timestamp = command.timestamp;
      }
    }

    this.commandQueue = merged;
  }

  startProcessing() {
    setInterval(() => {
      if (this.commandQueue.length > 0) {
        const command = this.commandQueue.shift();
        this.processCommand(command);
      }
    }, this.processingInterval);
  }

  processCommand(command) {
    // 处理指令并发送
    this.emit('command-processed', {
      ...command,
      processedAt: Date.now()
    });
  }

  getQueueStatus() {
    return {
      queueLength: this.commandQueue.length,
      processingInterval: this.processingInterval,
      networkQuality: this.networkQuality,
      priorityDistribution: this.getPriorityDistribution()
    };
  }

  getPriorityDistribution() {
    const distribution = {
      emergency: 0,
      critical: 0,
      normal: 0,
      low: 0
    };

    this.commandQueue.forEach(command => {
      switch (command.priority) {
        case this.priorityLevels.emergency:
          distribution.emergency++;
          break;
        case this.priorityLevels.critical:
          distribution.critical++;
          break;
        case this.priorityLevels.normal:
          distribution.normal++;
          break;
        case this.priorityLevels.low:
          distribution.low++;
          break;
      }
    });

    return distribution;
  }
}

module.exports = ControlPriorityService;